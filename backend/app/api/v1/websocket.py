import json
import logging
from datetime import datetime, timezone
import uuid
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.core.websocket_manager import ws_manager
from app.services.ai.agent import process_chat
from app.api.v1.conversations import STORED_CONVERSATIONS, STORED_MESSAGES

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
            user_msg = {
                "id": msg_id,
                "conversation_id": conversation_id,
                "sender_type": sender_type,
                "sender_name": sender_name,
                "content": content,
                "tool_calls": None,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }

            if conversation_id in STORED_MESSAGES:
                STORED_MESSAGES[conversation_id].append(user_msg)

            # Broadcast incoming message to all listeners (customer widget & support agent)
            await ws_manager.broadcast_to_conversation(conversation_id, {
                "type": "new_message",
                "message": user_msg
            })

            conv = STORED_CONVERSATIONS.get(conversation_id)
            if conv and conv.get("status") == "ai_handling" and sender_type == "customer":
                ai_result = await process_chat(conversation_id, content, conv.get("customer_id"))
                ai_msg = {
                    "id": f"msg-{str(uuid.uuid4())[:8]}",
                    "conversation_id": conversation_id,
                    "sender_type": "ai_agent",
                    "sender_name": "Circle AI",
                    "content": ai_result["reply"],
                    "tool_calls": ai_result["tool_calls"],
                    "created_at": datetime.now(timezone.utc).isoformat(),
                }
                if conversation_id in STORED_MESSAGES:
                    STORED_MESSAGES[conversation_id].append(ai_msg)

                if ai_result.get("should_escalate"):
                    conv["status"] = "agent_handling"
                    conv["priority"] = "high"
                    await ws_manager.broadcast_to_conversation(conversation_id, {
                        "type": "status_changed",
                        "status": "agent_handling",
                        "priority": "high",
                        "reason": ai_result.get("escalation_reason")
                    })

                await ws_manager.broadcast_to_conversation(conversation_id, {
                    "type": "new_message",
                    "message": ai_msg
                })

    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, conversation_id)
    except Exception as e:
        logger.error(f"WebSocket error in {conversation_id}: {e}")
        ws_manager.disconnect(websocket, conversation_id)
