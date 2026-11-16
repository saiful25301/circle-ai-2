import json
import logging
from datetime import datetime, timezone
import uuid
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.core.websocket_manager import ws_manager
from app.models.conversation import Conversation, Message
from app.services.ai.agent import process_chat

logger = logging.getLogger(__name__)
router = APIRouter()


@router.websocket("/ws/chat/{conversation_id}")
async def websocket_chat_endpoint(websocket: WebSocket, conversation_id: str):
    await ws_manager.connect(websocket, conversation_id)
    try:
        while True:
            raw_text = await websocket.receive_text()
            try:
                data = json.loads(raw_text)
            except Exception:
                data = {"content": raw_text, "sender_type": "customer"}

            content = data.get("content", "").strip()
            sender_type = data.get("sender_type", "customer")
            sender_name = data.get("sender_name", "Subscriber" if sender_type == "customer" else "Support Officer")

            if not content:
                continue

            msg_id = f"msg-{str(uuid.uuid4())[:8]}"
            now = datetime.now(timezone.utc)

            # Persist incoming message to database
            async with AsyncSessionLocal() as db:
                db_msg = Message(
                    id=msg_id,
                    conversation_id=conversation_id,
                    sender_type=sender_type,
                    sender_name=sender_name,
                    content=content,
                    created_at=now,
                    updated_at=now,
                )
                db.add(db_msg)

                conv_res = await db.execute(select(Conversation).where(Conversation.id == conversation_id))
                conv = conv_res.scalar_one_or_none()
                if conv:
                    conv.updated_at = now
                await db.commit()

            user_msg = {
                "id": msg_id,
                "conversation_id": conversation_id,
                "sender_type": sender_type,
                "sender_name": sender_name,
                "content": content,
                "tool_calls": None,
                "created_at": now.isoformat(),
            }

            # Broadcast incoming message to listeners
            await ws_manager.broadcast_to_conversation(conversation_id, {
                "type": "new_message",
                "message": user_msg
            })

            # Check if AI should answer
            async with AsyncSessionLocal() as db:
                conv_res = await db.execute(select(Conversation).where(Conversation.id == conversation_id))
                conv = conv_res.scalar_one_or_none()
                if conv and conv.status in ["ai_handling", "open"] and sender_type == "customer":
                    try:
                        ai_res = await process_chat(
                            user_message=content,
                            customer_id=conv.subscriber_id,
                            conversation_history=[{"role": "user", "content": content}]
                        )

                        ai_msg_id = f"msg-{str(uuid.uuid4())[:8]}"
                        ai_now = datetime.now(timezone.utc)
                        ai_db_msg = Message(
                            id=ai_msg_id,
                            conversation_id=conversation_id,
                            sender_type="ai_agent",
                            sender_name="Circle AI",
                            content=ai_res.get("response", "Thank you for reaching out to Circle Network."),
                            tool_calls=ai_res.get("tool_calls"),
                            created_at=ai_now,
                            updated_at=ai_now,
                        )
                        db.add(ai_db_msg)
                        if ai_res.get("escalate_to_human"):
                            conv.status = "agent_handling"
                            conv.priority = "urgent"
                        await db.commit()

                        ai_msg = {
                            "id": ai_msg_id,
                            "conversation_id": conversation_id,
                            "sender_type": "ai_agent",
                            "sender_name": "Circle AI",
                            "content": ai_res.get("response"),
                            "tool_calls": ai_res.get("tool_calls"),
                            "created_at": ai_now.isoformat(),
                        }
                        await ws_manager.broadcast_to_conversation(conversation_id, {
                            "type": "new_message",
                            "message": ai_msg
                        })
                    except Exception as ai_err:
                        logger.error(f"WebSocket AI agent error: {ai_err}")

    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, conversation_id)
    except Exception as e:
        logger.error(f"WebSocket error in {conversation_id}: {e}")
        ws_manager.disconnect(websocket, conversation_id)
