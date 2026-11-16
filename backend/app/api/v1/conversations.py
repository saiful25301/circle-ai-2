from datetime import datetime, timezone
from typing import List
import uuid
from fastapi import APIRouter, HTTPException, Depends
from app.schemas.conversation import (
    ConversationResponse,
    ConversationCreate,
    MessageCreate,
    MessageResponse,
    ConversationStatusUpdate,
)
from app.services.ai.agent import process_chat
from app.core.websocket_manager import ws_manager

router = APIRouter()

# In-memory storage for instant development response
STORED_CONVERSATIONS = {}
STORED_MESSAGES = {}


def _init_demo_conversation():
    cid = "conv-demo-mirpur"
    if cid not in STORED_CONVERSATIONS:
        STORED_CONVERSATIONS[cid] = {
            "id": cid,
            "customer_id": "CN-88214",
            "channel": "webchat",
            "status": "ai_handling",
            "priority": "normal",
            "assigned_agent_id": None,
            "metadata_info": {"plan": "Circle Fast 30 Mbps", "zone": "Mirpur-10"},
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
        STORED_MESSAGES[cid] = [
            {
                "id": "msg-1",
                "conversation_id": cid,
                "sender_type": "ai_agent",
                "sender_name": "Circle AI",
                "content": "Hi there! 👋 Welcome to Circle Network. I'm Circle AI, your virtual ISP support engineer. How can I assist you with your internet connection or billing today?",
                "tool_calls": None,
                "created_at": datetime.now(timezone.utc),
            }
        ]


_init_demo_conversation()


@router.get("", response_model=List[ConversationResponse])
async def list_conversations():
    out = []
    for cid, c in STORED_CONVERSATIONS.items():
        msgs = STORED_MESSAGES.get(cid, [])
        out.append(ConversationResponse(**c, messages=[MessageResponse(**m) for m in msgs]))
    return sorted(out, key=lambda x: x.updated_at, reverse=True)


@router.post("", response_model=ConversationResponse)
async def create_conversation(payload: ConversationCreate):
    cid = f"conv-{str(uuid.uuid4())[:8]}"
    now = datetime.now(timezone.utc)
    conv_data = {
        "id": cid,
        "customer_id": payload.customer_id or "CN-88214",
        "channel": payload.channel,
        "status": "ai_handling",
        "priority": "normal",
        "assigned_agent_id": None,
        "metadata_info": {},
        "created_at": now,
        "updated_at": now,
    }
    STORED_CONVERSATIONS[cid] = conv_data
    STORED_MESSAGES[cid] = []

    # Send initial welcome message
    welcome_msg = {
        "id": f"msg-{str(uuid.uuid4())[:8]}",
        "conversation_id": cid,
        "sender_type": "ai_agent",
        "sender_name": "Circle AI",
        "content": "Hello! I am Circle AI, the virtual support assistant for Circle Network. How can I help with your fiber line or billing today?",
        "tool_calls": None,
        "created_at": now,
    }
    STORED_MESSAGES[cid].append(welcome_msg)

    if payload.initial_message:
        user_msg = {
            "id": f"msg-{str(uuid.uuid4())[:8]}",
            "conversation_id": cid,
            "sender_type": "customer",
            "sender_name": "Subscriber",
            "content": payload.initial_message,
            "tool_calls": None,
            "created_at": now,
        }
        STORED_MESSAGES[cid].append(user_msg)

        ai_res = await process_chat(cid, payload.initial_message, payload.customer_id)
        ai_msg = {
            "id": f"msg-{str(uuid.uuid4())[:8]}",
            "conversation_id": cid,
            "sender_type": "ai_agent",
            "sender_name": "Circle AI",
            "content": ai_res["reply"],
            "tool_calls": ai_res["tool_calls"],
            "created_at": datetime.now(timezone.utc),
        }
        STORED_MESSAGES[cid].append(ai_msg)
        if ai_res.get("should_escalate"):
            STORED_CONVERSATIONS[cid]["status"] = "agent_handling"
            STORED_CONVERSATIONS[cid]["priority"] = "high"

    msgs = STORED_MESSAGES.get(cid, [])
    return ConversationResponse(**conv_data, messages=[MessageResponse(**m) for m in msgs])


@router.get("/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(conversation_id: str):
    conv = STORED_CONVERSATIONS.get(conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    msgs = STORED_MESSAGES.get(conversation_id, [])
    return ConversationResponse(**conv, messages=[MessageResponse(**m) for m in msgs])


@router.post("/{conversation_id}/messages", response_model=MessageResponse)
async def post_message(conversation_id: str, payload: MessageCreate):
    conv = STORED_CONVERSATIONS.get(conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    now = datetime.now(timezone.utc)
    conv["updated_at"] = now

    msg_id = f"msg-{str(uuid.uuid4())[:8]}"
    msg_data = {
        "id": msg_id,
        "conversation_id": conversation_id,
        "sender_type": payload.sender_type,
        "sender_name": payload.sender_name or ("Subscriber" if payload.sender_type == "customer" else "Support Agent"),
        "content": payload.content,
        "tool_calls": None,
        "created_at": now,
    }
    STORED_MESSAGES[conversation_id].append(msg_data)

    # Broadcast user/agent message via WebSocket
    await ws_manager.broadcast_to_conversation(conversation_id, {"type": "new_message", "message": msg_data})

    # If message is from customer and status is ai_handling, trigger AI response
    if payload.sender_type == "customer" and conv["status"] == "ai_handling":
        ai_res = await process_chat(conversation_id, payload.content, conv.get("customer_id"))
        ai_msg = {
            "id": f"msg-{str(uuid.uuid4())[:8]}",
            "conversation_id": conversation_id,
            "sender_type": "ai_agent",
            "sender_name": "Circle AI",
            "content": ai_res["reply"],
            "tool_calls": ai_res["tool_calls"],
            "created_at": datetime.now(timezone.utc),
        }
        STORED_MESSAGES[conversation_id].append(ai_msg)
        if ai_res.get("should_escalate"):
            conv["status"] = "agent_handling"
            conv["priority"] = "high"

        await ws_manager.broadcast_to_conversation(conversation_id, {"type": "new_message", "message": ai_msg})

    return MessageResponse(**msg_data)


@router.patch("/{conversation_id}/status")
async def update_status(conversation_id: str, payload: ConversationStatusUpdate):
    conv = STORED_CONVERSATIONS.get(conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    conv["status"] = payload.status
    if payload.priority:
        conv["priority"] = payload.priority
    if payload.assigned_agent_id:
        conv["assigned_agent_id"] = payload.assigned_agent_id
    conv["updated_at"] = datetime.now(timezone.utc)
    return conv
