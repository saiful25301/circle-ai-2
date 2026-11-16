import json
import logging
from datetime import datetime, timezone
import uuid
from typing import Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.core.websocket_manager import ws_manager
from app.models.conversation import Conversation, Message
from app.services.ai.agent import process_chat

logger = logging.getLogger(__name__)
router = APIRouter()


@router.websocket("/ws/chat/{conversation_id}")
async def websocket_chat_endpoint(
    websocket: WebSocket,
    conversation_id: str,
    client_type: Optional[str] = Query(default="customer")
):
    """
    Bidirectional WebSocket connection for live customer & agent messaging.
    Supports real-time messages, typing indicators, and private internal notes.
    """
    await ws_manager.connect(websocket, conversation_id, client_type=client_type or "customer")
    try:
        while True:
            raw_text = await websocket.receive_text()
            try:
                data = json.loads(raw_text)
            except Exception:
                data = {"content": raw_text, "sender_type": "customer"}

            event_type = data.get("type", "message")
            sender_type = data.get("sender_type", "customer")
            sender_name = data.get("sender_name", "Subscriber" if sender_type == "customer" else "Support Officer")

            # -----------------------------------------------------------------
            # 1. Typing Indicator Event
            # -----------------------------------------------------------------
            if event_type == "typing":
                is_typing = data.get("is_typing", True)
                await ws_manager.broadcast_to_conversation(
                    conversation_id,
                    {
                        "type": "typing",
                        "sender_type": sender_type,
                        "sender_name": sender_name,
                        "is_typing": is_typing,
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    }
                )
                continue

            # -----------------------------------------------------------------
            # 2. Incoming Chat Message or Internal Note
            # -----------------------------------------------------------------
            content = data.get("content", "").strip()
            if not content:
                continue

            msg_id = f"msg-{str(uuid.uuid4())[:8]}"
            now = datetime.now(timezone.utc)
            is_internal_note = (sender_type == "internal_note" or data.get("is_internal") is True)

            # Persist incoming message to database
            async with AsyncSessionLocal() as db:
                db_msg = Message(
                    id=msg_id,
                    conversation_id=conversation_id,
                    sender_type="internal_note" if is_internal_note else sender_type,
                    sender_name=sender_name if not is_internal_note else f"🔒 {sender_name} (Internal Note)",
                    content=content,
                    created_at=now,
                    updated_at=now,
                )
                db.add(db_msg)

                conv_res = await db.execute(select(Conversation).where(Conversation.id == conversation_id))
                conv = conv_res.scalar_one_or_none()
                if conv:
                    conv.updated_at = now
                    # If human agent replied, mark as taken over by human
                    if sender_type in ["human_agent", "support_officer", "agent"]:
                        conv.status = "agent_handling"
                        conv.is_ai_handled = False
                await db.commit()

            msg_payload = {
                "id": msg_id,
                "conversation_id": conversation_id,
                "sender_type": "internal_note" if is_internal_note else sender_type,
                "sender_name": sender_name if not is_internal_note else f"🔒 {sender_name} (Internal Note)",
                "content": content,
                "is_internal": is_internal_note,
                "tool_calls": None,
                "created_at": now.isoformat(),
            }

            # Broadcast incoming message (internal notes never sent to customers)
            await ws_manager.broadcast_to_conversation(
                conversation_id,
                {
                    "type": "new_message",
                    "message": msg_payload,
                    "event": "new_message",
                    "data": msg_payload
                },
                is_internal=is_internal_note
            )

            # Internal notes never trigger AI
            if is_internal_note:
                continue

            # -----------------------------------------------------------------
            # 3. Check if AI should answer
            # AI replies ONLY if conversation is in AI mode and is_ai_handled is True.
            # When human takes over or conversation is escalated, AI stays silent.
            # -----------------------------------------------------------------
            async with AsyncSessionLocal() as db:
                conv_res = await db.execute(select(Conversation).where(Conversation.id == conversation_id))
                conv = conv_res.scalar_one_or_none()

                can_ai_reply = (
                    conv is not None
                    and conv.status in ["ai_handling", "AI_ACTIVE", "open"]
                    and conv.is_ai_handled is True
                    and sender_type == "customer"
                )

                if can_ai_reply:
                    try:
                        # Send AI typing indicator
                        await ws_manager.broadcast_to_conversation(
                            conversation_id,
                            {
                                "type": "typing",
                                "sender_type": "ai_agent",
                                "sender_name": "Circle AI",
                                "is_typing": True,
                            }
                        )

                        # Load prior history
                        hist_res = await db.execute(
                            select(Message)
                            .where(Message.conversation_id == conversation_id)
                            .order_by(Message.created_at.asc())
                        )
                        prior_msgs = hist_res.scalars().all()
                        chat_history = [
                            {"role": "user" if m.sender_type == "customer" else "model", "content": m.content}
                            for m in prior_msgs if m.id != msg_id and m.sender_type != "internal_note"
                        ]

                        ai_res = await process_chat(
                            conversation_id=conversation_id,
                            user_message=content,
                            customer_id=conv.subscriber_id,
                            conversation_history=chat_history,
                            db=db
                        )

                        ai_msg_id = f"msg-{str(uuid.uuid4())[:8]}"
                        ai_now = datetime.now(timezone.utc)
                        ai_content = ai_res.get("reply") or ai_res.get("response") or "Thank you for reaching out to Circle Network."
                        ai_db_msg = Message(
                            id=ai_msg_id,
                            conversation_id=conversation_id,
                            sender_type="ai_agent",
                            sender_name="Circle AI",
                            content=ai_content,
                            tool_calls=ai_res.get("tool_calls"),
                            created_at=ai_now,
                            updated_at=ai_now,
                        )
                        db.add(ai_db_msg)

                        # Check for AI-to-Human escalation
                        should_escalate = ai_res.get("should_escalate") or ai_res.get("escalate_to_human")
                        if should_escalate:
                            conv.status = "waiting_for_agent"
                            conv.priority = "urgent"
                            conv.is_ai_handled = False
                            meta = dict(conv.metadata_info or {})
                            meta["escalation_context"] = {
                                "reason": ai_res.get("escalation_reason", "Customer requested human escalation"),
                                "attempted_tools": [tc.get("tool_name") for tc in ai_res.get("tool_calls", [])],
                                "subscriber_id": conv.subscriber_id,
                                "timestamp": ai_now.isoformat()
                            }
                            conv.metadata_info = meta

                        await db.commit()

                        # Turn off AI typing indicator
                        await ws_manager.broadcast_to_conversation(
                            conversation_id,
                            {
                                "type": "typing",
                                "sender_type": "ai_agent",
                                "sender_name": "Circle AI",
                                "is_typing": False,
                            }
                        )

                        ai_msg_dict = {
                            "id": ai_msg_id,
                            "conversation_id": conversation_id,
                            "sender_type": "ai_agent",
                            "sender_name": "Circle AI",
                            "content": ai_content,
                            "tool_calls": ai_res.get("tool_calls"),
                            "created_at": ai_now.isoformat(),
                        }
                        await ws_manager.broadcast_to_conversation(conversation_id, {
                            "type": "new_message",
                            "message": ai_msg_dict,
                            "event": "new_message",
                            "data": ai_msg_dict
                        })

                        # If escalated, alert global agent inbox
                        if should_escalate:
                            await ws_manager.broadcast_global({
                                "type": "conversation_escalated",
                                "conversation_id": conversation_id,
                                "subscriber_id": conv.subscriber_id,
                                "reason": ai_res.get("escalation_reason")
                            })

                    except Exception as ai_err:
                        logger.error(f"WebSocket AI agent error: {ai_err}")
                        # Turn off typing on error
                        await ws_manager.broadcast_to_conversation(
                            conversation_id,
                            {"type": "typing", "sender_type": "ai_agent", "is_typing": False}
                        )

    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, conversation_id)
    except Exception as e:
        logger.error(f"WebSocket error in {conversation_id}: {e}")
        ws_manager.disconnect(websocket, conversation_id)


@router.websocket("/ws/inbox")
async def websocket_inbox_endpoint(websocket: WebSocket):
    """Real-time stream for agent dashboard inbox notifications."""
    await ws_manager.connect_dashboard(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect_dashboard(websocket)
    except Exception:
        ws_manager.disconnect_dashboard(websocket)
