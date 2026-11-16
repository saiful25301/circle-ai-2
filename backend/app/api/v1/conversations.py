from datetime import datetime, timezone
from typing import List, Optional
import uuid
import logging
from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.models.conversation import Conversation, Message
from app.models.customer import Customer
from app.schemas.conversation import (
    ConversationResponse,
    ConversationCreate,
    MessageCreate,
    MessageResponse,
    ConversationStatusUpdate,
)
from app.services.ai.agent import process_chat
from app.core.websocket_manager import ws_manager

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("", response_model=List[ConversationResponse])
async def list_conversations(
    status_filter: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """List conversations persisted in database with their message streams."""
    query = select(Conversation).options(selectinload(Conversation.messages)).order_by(Conversation.updated_at.desc())
    if status_filter and status_filter != "all":
        query = query.where(Conversation.status == status_filter)

    result = await db.execute(query)
    conversations = result.scalars().all()
    
    out = []
    for c in conversations:
        msgs = [
            MessageResponse(
                id=m.id,
                conversation_id=m.conversation_id,
                sender_type=m.sender_type,
                sender_name=m.sender_name,
                content=m.content,
                tool_calls=m.tool_calls,
                created_at=m.created_at,
            )
            for m in c.messages
        ]
        out.append(
            ConversationResponse(
                id=c.id,
                customer_id=c.subscriber_id or c.customer_id,
                channel=c.channel,
                status=c.status,
                priority=c.priority,
                assigned_agent_id=c.assigned_agent_id,
                metadata_info=c.metadata_info or {},
                created_at=c.created_at,
                updated_at=c.updated_at,
                messages=msgs
            )
        )
    return out


@router.get("/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(conversation_id: str, db: AsyncSession = Depends(get_db)):
    """Fetch single conversation by ID with all persisted messages."""
    result = await db.execute(
        select(Conversation)
        .options(selectinload(Conversation.messages))
        .where(Conversation.id == conversation_id)
    )
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    msgs = [
        MessageResponse(
            id=m.id,
            conversation_id=m.conversation_id,
            sender_type=m.sender_type,
            sender_name=m.sender_name,
            content=m.content,
            tool_calls=m.tool_calls,
            created_at=m.created_at,
        )
        for m in c.messages
    ]
    return ConversationResponse(
        id=c.id,
        customer_id=c.subscriber_id or c.customer_id,
        channel=c.channel,
        status=c.status,
        priority=c.priority,
        assigned_agent_id=c.assigned_agent_id,
        metadata_info=c.metadata_info or {},
        created_at=c.created_at,
        updated_at=c.updated_at,
        messages=msgs
    )


@router.post("", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
async def create_conversation(payload: ConversationCreate, db: AsyncSession = Depends(get_db)):
    """Create a new customer chat conversation in database."""
    cid = f"conv-{str(uuid.uuid4())[:8]}"
    now = datetime.now(timezone.utc)

    # Check if subscriber exists
    sub_name = "Subscriber"
    sub_phone = None
    if payload.customer_id:
        sub_res = await db.execute(select(Customer).where(Customer.subscriber_id == payload.customer_id))
        sub = sub_res.scalar_one_or_none()
        if sub:
            sub_name = sub.full_name
            sub_phone = sub.phone

    conv = Conversation(
        id=cid,
        customer_id=payload.customer_id,
        subscriber_id=payload.customer_id or "CN-88214",
        customer_name=sub_name,
        customer_phone=sub_phone,
        channel=payload.channel or "webchat",
        status="ai_handling",
        priority="normal",
        is_ai_handled=True,
        metadata_info={"created_channel": payload.channel or "webchat"},
        created_at=now,
        updated_at=now,
    )
    db.add(conv)
    await db.flush()

    # Create welcome message
    welcome = Message(
        id=f"msg-{str(uuid.uuid4())[:8]}",
        conversation_id=cid,
        sender_type="ai_agent",
        sender_name="Circle AI",
        content="Hi there! 👋 Welcome to Circle Network. I'm Circle AI, your virtual ISP support engineer. How can I assist you with your internet connection, router, or bill today?",
        tool_calls=None,
        created_at=now,
        updated_at=now,
    )
    db.add(welcome)

    if payload.initial_message:
        user_msg = Message(
            id=f"msg-{str(uuid.uuid4())[:8]}",
            conversation_id=cid,
            sender_type="customer",
            sender_name=sub_name,
            content=payload.initial_message,
            created_at=now,
            updated_at=now,
        )
        db.add(user_msg)

    await db.commit()
    await db.refresh(conv)

    # Reload with messages
    return await get_conversation(cid, db)


@router.post("/{conversation_id}/messages", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def post_message(
    conversation_id: str,
    payload: MessageCreate,
    db: AsyncSession = Depends(get_db)
):
    """Post message into conversation and trigger AI processing if sender is customer."""
    conv_res = await db.execute(select(Conversation).where(Conversation.id == conversation_id))
    conv = conv_res.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    now = datetime.now(timezone.utc)
    msg_id = f"msg-{str(uuid.uuid4())[:8]}"
    
    new_msg = Message(
        id=msg_id,
        conversation_id=conversation_id,
        sender_type=payload.sender_type,
        sender_name=payload.sender_name or ("Subscriber" if payload.sender_type == "customer" else "Support Officer"),
        content=payload.content,
        created_at=now,
        updated_at=now,
    )
    db.add(new_msg)
    conv.updated_at = now
    await db.commit()
    await db.refresh(new_msg)

    # Broadcast customer message via websocket
    await ws_manager.broadcast_to_conversation(conversation_id, {
        "event": "new_message",
        "data": {
            "id": new_msg.id,
            "conversation_id": conversation_id,
            "sender_type": new_msg.sender_type,
            "sender_name": new_msg.sender_name,
            "content": new_msg.content,
            "created_at": new_msg.created_at.isoformat(),
        }
    })

    # If message is from customer and status is ai_handling, trigger AI agent
    if payload.sender_type == "customer" and conv.status in ["ai_handling", "open"]:
        try:
            # Fetch recent message history
            history_res = await db.execute(
                select(Message)
                .where(Message.conversation_id == conversation_id)
                .order_by(Message.created_at.desc())
                .limit(6)
            )
            recent_msgs = list(reversed(history_res.scalars().all()))
            chat_history = [
                {"role": "user" if m.sender_type == "customer" else "assistant", "content": m.content}
                for m in recent_msgs
            ]

            ai_result = await process_chat(
                user_message=payload.content,
                customer_id=conv.subscriber_id,
                conversation_history=chat_history
            )

            ai_msg_id = f"msg-{str(uuid.uuid4())[:8]}"
            ai_msg = Message(
                id=ai_msg_id,
                conversation_id=conversation_id,
                sender_type="ai_agent",
                sender_name="Circle AI",
                content=ai_result.get("response", "Thank you for reaching out to Circle Network. Our team is here to assist you."),
                tool_calls=ai_result.get("tool_calls"),
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc),
            )
            db.add(ai_msg)

            if ai_result.get("escalate_to_human"):
                conv.status = "agent_handling"
                conv.priority = "urgent"

            await db.commit()

            # Broadcast AI response via websocket
            await ws_manager.broadcast_to_conversation(conversation_id, {
                "event": "new_message",
                "data": {
                    "id": ai_msg.id,
                    "conversation_id": conversation_id,
                    "sender_type": ai_msg.sender_type,
                    "sender_name": ai_msg.sender_name,
                    "content": ai_msg.content,
                    "tool_calls": ai_msg.tool_calls,
                    "created_at": ai_msg.created_at.isoformat(),
                }
            })
        except Exception as e:
            logger.error(f"AI response processing error: {e}")

    return MessageResponse(
        id=new_msg.id,
        conversation_id=new_msg.conversation_id,
        sender_type=new_msg.sender_type,
        sender_name=new_msg.sender_name,
        content=new_msg.content,
        tool_calls=new_msg.tool_calls,
        created_at=new_msg.created_at,
    )


@router.patch("/{conversation_id}/status", response_model=ConversationResponse)
async def update_conversation_status(
    conversation_id: str,
    payload: ConversationStatusUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update conversation triage status or assign to support officer."""
    result = await db.execute(select(Conversation).where(Conversation.id == conversation_id))
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    if payload.status:
        conv.status = payload.status
        if payload.status == "agent_handling":
            conv.is_ai_handled = False
    if payload.priority:
        conv.priority = payload.priority
    if payload.assigned_agent_id:
        conv.assigned_agent_id = payload.assigned_agent_id

    conv.updated_at = datetime.now(timezone.utc)
    await db.commit()
    return await get_conversation(conversation_id, db)
