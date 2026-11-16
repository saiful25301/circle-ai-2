import json
import logging
from datetime import datetime, timezone
import uuid
from typing import Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, status
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.core.security import decode_access_token
from app.core.websocket_manager import ws_manager
from app.models.conversation import Conversation, Message
from app.models.user import User
from app.services.ai.agent import process_chat

logger = logging.getLogger(__name__)
router = APIRouter()


@router.websocket("/ws/chat/{conversation_id}")
async def websocket_chat_endpoint(
    websocket: WebSocket,
    conversation_id: str,
    client_type: Optional[str] = Query(default="customer"),
    token: Optional[str] = Query(default=None)
):
    """
    Bidirectional WebSocket connection for live customer & agent messaging.
    Supports real-time messages, typing indicators, and private internal notes.
    Enforces JWT authentication for human agent connections.
    """
    normalized_client = (client_type or "customer").lower()
    if normalized_client == "agent":
        if not token:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Token required for agent connection")
            return
        payload = decode_access_token(token)
        user_id = payload.get("sub") if payload else None
        if not payload or not user_id:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Unauthorized agent credentials")
            return

        async with AsyncSessionLocal() as auth_db:
            u_res = await auth_db.execute(select(User).where(User.id == user_id))
            auth_user = u_res.scalar_one_or_none()
            if not auth_user or not auth_user.is_active or auth_user.role not in ["admin", "supervisor", "agent", "noc_engineer"]:
                await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Unauthorized agent role")
                return

    await ws_manager.connect(websocket, conversation_id, client_type=normalized_client)
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
                    and str(conv.status).lower() in ["ai_handling", "ai_active", "open"]
                    and conv.is_ai_handled is not False
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
                        logger.error(f"WebSocket AI agent error: {ai_err}", exc_info=True)
                        # Turn off typing on error
                        await ws_manager.broadcast_to_conversation(
                            conversation_id,
                            {"type": "typing", "sender_type": "ai_agent", "is_typing": False}
                        )
                        # Persist and broadcast fallback message
                        fallback_text = (
                            "দুঃখিত, এই মুহূর্তে সার্ভারে সাময়িক বিলম্ব হচ্ছে। আপনি সার্কেল নেটওয়ার্কের 24/7 হেল্পলাইন 16207-এ কল করতে পারেন অথবা কিছুক্ষণ পর আবার চেষ্টা করুন।"
                            if any(ord(c) >= 0x0980 and ord(c) <= 0x09FF for c in content) else
                            "We encountered a temporary processing delay. Please reach out to our 24/7 helpline at 16207 or retry in a moment."
                        )
                        fallback_msg = Message(
                            id=f"msg-{str(uuid.uuid4())[:8]}",
                            conversation_id=conversation_id,
                            sender_type="ai_agent",
                            sender_name="Circle AI",
                            content=fallback_text,
                            created_at=datetime.now(timezone.utc),
                            updated_at=datetime.now(timezone.utc),
                        )
                        db.add(fallback_msg)
                        await db.commit()

                        fb_dict = {
                            "id": fallback_msg.id,
                            "conversation_id": conversation_id,
                            "sender_type": fallback_msg.sender_type,
                            "sender_name": fallback_msg.sender_name,
                            "content": fallback_msg.content,
                            "tool_calls": None,
                            "created_at": fallback_msg.created_at.isoformat(),
                        }
                        await ws_manager.broadcast_to_conversation(conversation_id, {
                            "type": "new_message",
                            "message": fb_dict,
                            "event": "new_message",
                            "data": fb_dict
                        })

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
