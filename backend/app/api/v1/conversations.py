from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
import uuid
import logging
from fastapi import APIRouter, HTTPException, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.models.conversation import Conversation, Message
from app.models.customer import Customer
from app.models.agent import Agent
from app.models.ai_feedback import AIFeedback
from app.schemas.conversation import (
    ConversationResponse,
    ConversationCreate,
    MessageCreate,
    MessageResponse,
    ConversationStatusUpdate,
    ConversationAssignRequest,
    ConversationTransferRequest,
    ConversationFeedbackCreate,
)
from app.services.ai.agent import process_chat
from app.core.websocket_manager import ws_manager

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("", response_model=List[ConversationResponse])
async def list_conversations(
    status_filter: Optional[str] = None,
    is_customer: bool = False,
    db: AsyncSession = Depends(get_db)
):
    """
    List conversations with their message streams.
    Supports Pending, Active, Resolved, and AI filters.
    Internal notes are stripped if requested by customer.
    """
    query = select(Conversation).options(selectinload(Conversation.messages)).order_by(Conversation.updated_at.desc())

    if status_filter and status_filter != "all":
        filt = status_filter.lower()
        if filt in ["pending", "waiting_for_agent"]:
            query = query.where(Conversation.status.in_(["waiting_for_agent", "open"]))
        elif filt in ["active", "human_takeover", "agent_handling"]:
            query = query.where(Conversation.status.in_(["agent_handling", "human_takeover"]))
        elif filt in ["resolved", "closed"]:
            query = query.where(Conversation.status.in_(["resolved", "closed"]))
        elif filt in ["ai_active", "ai_handling"]:
            query = query.where(Conversation.status.in_(["ai_handling", "AI_ACTIVE"]))
        else:
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
            if not (is_customer and m.sender_type == "internal_note")
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


@router.get("/counts", response_model=Dict[str, int])
async def get_conversation_counts(db: AsyncSession = Depends(get_db)):
    """Returns folder counts for Pending, Active, Resolved, and AI Active conversations."""
    result = await db.execute(select(Conversation))
    all_convs = result.scalars().all()

    pending = sum(1 for c in all_convs if c.status in ["waiting_for_agent", "open"])
    active = sum(1 for c in all_convs if c.status in ["agent_handling", "human_takeover"])
    resolved = sum(1 for c in all_convs if c.status in ["resolved", "closed"])
    ai_active = sum(1 for c in all_convs if c.status in ["ai_handling", "AI_ACTIVE"])

    return {
        "pending": pending,
        "active": active,
        "resolved": resolved,
        "ai_active": ai_active,
        "total": len(all_convs)
    }


@router.get("/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(
    conversation_id: str,
    is_customer: bool = False,
    db: AsyncSession = Depends(get_db)
):
    """Fetch single conversation with message stream (hiding internal notes for customer view)."""
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
        if not (is_customer and m.sender_type == "internal_note")
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
        await db.flush()

        try:
            ai_result = await process_chat(
                conversation_id=cid,
                user_message=payload.initial_message,
                customer_id=conv.subscriber_id,
                conversation_history=[{"role": "user", "content": payload.initial_message}],
                db=db
            )
            ai_content = ai_result.get("reply") or ai_result.get("response") or "Thank you for reaching out to Circle Network."
            ai_msg = Message(
                id=f"msg-{str(uuid.uuid4())[:8]}",
                conversation_id=cid,
                sender_type="ai_agent",
                sender_name="Circle AI",
                content=ai_content,
                tool_calls=ai_result.get("tool_calls"),
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc),
            )
            db.add(ai_msg)

            should_escalate = ai_result.get("should_escalate") or ai_result.get("escalate_to_human")
            if should_escalate:
                conv.status = "waiting_for_agent"
                conv.priority = "urgent"
                conv.is_ai_handled = False
                meta = dict(conv.metadata_info or {})
                meta["escalation_context"] = {
                    "reason": ai_result.get("escalation_reason", "Customer requested human escalation"),
                    "attempted_tools": [tc.get("tool_name") for tc in ai_result.get("tool_calls", [])],
                    "subscriber_id": conv.subscriber_id,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
                conv.metadata_info = meta
        except Exception as e:
            logger.error(f"Error generating initial AI response in create_conversation: {e}", exc_info=True)
            fallback_text = (
                "আসসালামু আলাইকুম! সার্কেল এআই সাপোর্ট সেন্টারে স্বাগতম। আপনার বার্তাটি পেয়েছি, কীভাবে সাহায্য করতে পারি? (হেল্পলাইন: ১৬২০৭)"
                if any(ord(c) >= 0x0980 and ord(c) <= 0x09FF for c in payload.initial_message) else
                "Hi there! 👋 Welcome to Circle Network. I'm Circle AI, your virtual ISP assistant. How can I assist you with your internet connection or billing today?"
            )
            fallback_msg = Message(
                id=f"msg-{str(uuid.uuid4())[:8]}",
                conversation_id=cid,
                sender_type="ai_agent",
                sender_name="Circle AI",
                content=fallback_text,
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc),
            )
            db.add(fallback_msg)

    await db.commit()
    await db.refresh(conv)

    return await get_conversation(cid, is_customer=False, db=db)


@router.post("/{conversation_id}/messages", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def post_message(
    conversation_id: str,
    payload: MessageCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Post a new message or private internal note.
    - If sender is internal_note: saved & visible only to agents, AI is not triggered.
    - If sender is human_agent: updates conversation to agent_handling, pauses AI.
    - If sender is customer: AI replies ONLY if conversation is in AI mode.
    """
    conv_res = await db.execute(select(Conversation).where(Conversation.id == conversation_id))
    conv = conv_res.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    now = datetime.now(timezone.utc)
    msg_id = f"msg-{str(uuid.uuid4())[:8]}"
    is_internal_note = (payload.sender_type == "internal_note")

    sender_name = payload.sender_name
    if not sender_name:
        if is_internal_note:
            sender_name = "🔒 Internal NOC Note"
        elif payload.sender_type == "customer":
            sender_name = conv.customer_name or "Subscriber"
        else:
            sender_name = "Support Officer"

    new_msg = Message(
        id=msg_id,
        conversation_id=conversation_id,
        sender_type="internal_note" if is_internal_note else payload.sender_type,
        sender_name=sender_name,
        content=payload.content,
        created_at=now,
        updated_at=now,
    )
    db.add(new_msg)

    # Human agent reply automatically marks conversation as human-handled
    if payload.sender_type in ["human_agent", "support_officer", "agent"]:
        conv.status = "agent_handling"
        conv.is_ai_handled = False

    conv.updated_at = now
    await db.commit()
    await db.refresh(new_msg)

    # Broadcast via websocket
    user_msg_dict = {
        "id": new_msg.id,
        "conversation_id": conversation_id,
        "sender_type": new_msg.sender_type,
        "sender_name": new_msg.sender_name,
        "content": new_msg.content,
        "is_internal": is_internal_note,
        "created_at": new_msg.created_at.isoformat(),
    }
    await ws_manager.broadcast_to_conversation(
        conversation_id,
        {
            "type": "new_message",
            "message": user_msg_dict,
            "event": "new_message",
            "data": user_msg_dict
        },
        is_internal=is_internal_note
    )

    # If message is internal note, do NOT trigger AI
    if is_internal_note:
        return MessageResponse(
            id=new_msg.id,
            conversation_id=new_msg.conversation_id,
            sender_type=new_msg.sender_type,
            sender_name=new_msg.sender_name,
            content=new_msg.content,
            tool_calls=None,
            created_at=new_msg.created_at,
        )

    # AI triggers ONLY when customer speaks AND conversation is in AI mode
    can_ai_reply = (
        payload.sender_type == "customer"
        and str(conv.status).lower() in ["ai_handling", "ai_active", "open"]
        and conv.is_ai_handled is not False
    )

    if can_ai_reply:
        try:
            # Send AI typing indicator
            await ws_manager.broadcast_to_conversation(
                conversation_id,
                {"type": "typing", "sender_type": "ai_agent", "sender_name": "Circle AI", "is_typing": True}
            )

            # Fetch recent message history from database (excluding internal notes)
            history_res = await db.execute(
                select(Message)
                .where(Message.conversation_id == conversation_id)
                .order_by(Message.created_at.asc())
            )
            all_msgs = history_res.scalars().all()
            chat_history = [
                {
                    "role": "user" if m.sender_type == "customer" else "model",
                    "content": m.content
                }
                for m in all_msgs if m.id != new_msg.id and m.sender_type != "internal_note"
            ]

            ai_result = await process_chat(
                conversation_id=conversation_id,
                user_message=payload.content,
                customer_id=conv.subscriber_id,
                conversation_history=chat_history,
                db=db
            )

            ai_msg_id = f"msg-{str(uuid.uuid4())[:8]}"
            ai_content = ai_result.get("reply") or ai_result.get("response") or "Thank you for reaching out to Circle Network. Our team is here to assist you."
            ai_msg = Message(
                id=ai_msg_id,
                conversation_id=conversation_id,
                sender_type="ai_agent",
                sender_name="Circle AI",
                content=ai_content,
                tool_calls=ai_result.get("tool_calls"),
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc),
            )
            db.add(ai_msg)

            # Check for AI-to-Human escalation
            should_escalate = ai_result.get("should_escalate") or ai_result.get("escalate_to_human")
            if should_escalate:
                conv.status = "waiting_for_agent"
                conv.priority = "urgent"
                conv.is_ai_handled = False
                meta = dict(conv.metadata_info or {})
                meta["escalation_context"] = {
                    "reason": ai_result.get("escalation_reason", "AI detected critical network issue / customer request"),
                    "attempted_tools": [tc.get("tool_name") for tc in ai_result.get("tool_calls", [])],
                    "subscriber_id": conv.subscriber_id,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
                conv.metadata_info = meta

            await db.commit()

            # Turn off typing
            await ws_manager.broadcast_to_conversation(
                conversation_id,
                {"type": "typing", "sender_type": "ai_agent", "sender_name": "Circle AI", "is_typing": False}
            )

            ai_msg_dict = {
                "id": ai_msg.id,
                "conversation_id": conversation_id,
                "sender_type": ai_msg.sender_type,
                "sender_name": ai_msg.sender_name,
                "content": ai_msg.content,
                "tool_calls": ai_msg.tool_calls,
                "created_at": ai_msg.created_at.isoformat(),
            }
            await ws_manager.broadcast_to_conversation(conversation_id, {
                "type": "new_message",
                "message": ai_msg_dict,
                "event": "new_message",
                "data": ai_msg_dict
            })

            if should_escalate:
                await ws_manager.broadcast_global({
                    "type": "conversation_escalated",
                    "conversation_id": conversation_id,
                    "subscriber_id": conv.subscriber_id,
                    "reason": ai_result.get("escalation_reason")
                })

        except Exception as e:
            logger.error(f"AI response processing error: {e}", exc_info=True)
            await ws_manager.broadcast_to_conversation(
                conversation_id,
                {"type": "typing", "sender_type": "ai_agent", "is_typing": False}
            )
            # Persist and broadcast fallback message so customer chat never silently hangs
            fallback_text = (
                "দুঃখিত, এই মুহূর্তে সার্ভারে সাময়িক বিলম্ব হচ্ছে। আপনি সার্কেল নেটওয়ার্কের 24/7 হেল্পলাইন 16207-এ কল করতে পারেন অথবা কিছুক্ষণ পর আবার চেষ্টা করুন।"
                if any(ord(c) >= 0x0980 and ord(c) <= 0x09FF for c in payload.content) else
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

    return MessageResponse(
        id=new_msg.id,
        conversation_id=new_msg.conversation_id,
        sender_type=new_msg.sender_type,
        sender_name=new_msg.sender_name,
        content=new_msg.content,
        tool_calls=new_msg.tool_calls,
        created_at=new_msg.created_at,
    )


# =============================================================================
# Handoff, Assignment & Transfer Endpoints
# =============================================================================

@router.post("/{conversation_id}/assign", response_model=ConversationResponse)
async def assign_conversation(
    conversation_id: str,
    payload: ConversationAssignRequest,
    db: AsyncSession = Depends(get_db)
):
    """Assign conversation to support agent, transition to agent_handling mode, and pause AI."""
    result = await db.execute(select(Conversation).where(Conversation.id == conversation_id))
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    # Fetch agent name
    agent_res = await db.execute(select(Agent).where(Agent.id == payload.agent_id))
    agent = agent_res.scalar_one_or_none()
    agent_name = agent.name if agent else payload.agent_id

    now = datetime.now(timezone.utc)
    conv.assigned_agent_id = payload.agent_id
    conv.status = "agent_handling"
    conv.is_ai_handled = False
    conv.updated_at = now

    # Record in metadata assignment history
    meta = dict(conv.metadata_info or {})
    assignments = list(meta.get("assignment_history", []))
    assignments.append({
        "agent_id": payload.agent_id,
        "agent_name": agent_name,
        "assigned_at": now.isoformat()
    })
    meta["assignment_history"] = assignments
    conv.metadata_info = meta

    # Add internal note
    note = Message(
        id=f"msg-{str(uuid.uuid4())[:8]}",
        conversation_id=conversation_id,
        sender_type="internal_note",
        sender_name="System",
        content=f"👨‍💼 Conversation assigned to {agent_name}. AI auto-replies paused.",
        created_at=now,
        updated_at=now,
    )
    db.add(note)
    await db.commit()

    await ws_manager.broadcast_to_conversation(
        conversation_id,
        {
            "type": "conversation_assigned",
            "conversation_id": conversation_id,
            "agent_id": payload.agent_id,
            "agent_name": agent_name,
            "status": "agent_handling"
        }
    )

    return await get_conversation(conversation_id, is_customer=False, db=db)


@router.post("/{conversation_id}/transfer", response_model=ConversationResponse)
async def transfer_conversation(
    conversation_id: str,
    payload: ConversationTransferRequest,
    db: AsyncSession = Depends(get_db)
):
    """Transfer conversation between agents with transfer reason logging."""
    result = await db.execute(select(Conversation).where(Conversation.id == conversation_id))
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    # Fetch destination agent name
    agent_res = await db.execute(select(Agent).where(Agent.id == payload.to_agent_id))
    dest_agent = agent_res.scalar_one_or_none()
    dest_agent_name = dest_agent.name if dest_agent else payload.to_agent_id

    old_agent_id = conv.assigned_agent_id
    now = datetime.now(timezone.utc)
    conv.assigned_agent_id = payload.to_agent_id
    conv.status = "agent_handling"
    conv.is_ai_handled = False
    conv.updated_at = now

    # Record transfer in history
    meta = dict(conv.metadata_info or {})
    transfers = list(meta.get("transfer_history", []))
    transfers.append({
        "from_agent_id": old_agent_id,
        "to_agent_id": payload.to_agent_id,
        "to_agent_name": dest_agent_name,
        "reason": payload.reason,
        "transferred_at": now.isoformat()
    })
    meta["transfer_history"] = transfers
    conv.metadata_info = meta

    # Add internal transfer note
    note = Message(
        id=f"msg-{str(uuid.uuid4())[:8]}",
        conversation_id=conversation_id,
        sender_type="internal_note",
        sender_name="System",
        content=f"🔄 Conversation transferred to {dest_agent_name}. Reason: {payload.reason}",
        created_at=now,
        updated_at=now,
    )
    db.add(note)
    await db.commit()

    await ws_manager.broadcast_to_conversation(
        conversation_id,
        {
            "type": "conversation_transferred",
            "conversation_id": conversation_id,
            "to_agent_id": payload.to_agent_id,
            "to_agent_name": dest_agent_name,
            "reason": payload.reason
        }
    )

    return await get_conversation(conversation_id, is_customer=False, db=db)


@router.post("/{conversation_id}/handback", response_model=ConversationResponse)
async def handback_to_ai(conversation_id: str, db: AsyncSession = Depends(get_db)):
    """Human-to-AI handoff: Return conversation control back to Circle AI."""
    result = await db.execute(select(Conversation).where(Conversation.id == conversation_id))
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    now = datetime.now(timezone.utc)
    conv.status = "ai_handling"
    conv.is_ai_handled = True
    conv.assigned_agent_id = None
    conv.updated_at = now

    note = Message(
        id=f"msg-{str(uuid.uuid4())[:8]}",
        conversation_id=conversation_id,
        sender_type="internal_note",
        sender_name="System",
        content="🤖 Conversation handed back to Circle AI. Automated responses resumed.",
        created_at=now,
        updated_at=now,
    )
    db.add(note)
    await db.commit()

    await ws_manager.broadcast_to_conversation(
        conversation_id,
        {
            "type": "conversation_handed_back",
            "conversation_id": conversation_id,
            "status": "ai_handling"
        }
    )

    return await get_conversation(conversation_id, is_customer=False, db=db)


@router.patch("/{conversation_id}/status", response_model=ConversationResponse)
async def update_conversation_status(
    conversation_id: str,
    payload: ConversationStatusUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update conversation triage status (e.g. resolve, close, escalate)."""
    result = await db.execute(select(Conversation).where(Conversation.id == conversation_id))
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    now = datetime.now(timezone.utc)
    if payload.status:
        conv.status = payload.status
        if payload.status in ["agent_handling", "human_takeover"]:
            conv.is_ai_handled = False
        elif payload.status in ["ai_handling", "AI_ACTIVE"]:
            conv.is_ai_handled = True

    if payload.priority:
        conv.priority = payload.priority
    if payload.assigned_agent_id:
        conv.assigned_agent_id = payload.assigned_agent_id

    conv.updated_at = now
    await db.commit()

    await ws_manager.broadcast_to_conversation(
        conversation_id,
        {
            "type": "status_changed",
            "conversation_id": conversation_id,
            "status": conv.status,
            "priority": conv.priority
        }
    )

    return await get_conversation(conversation_id, is_customer=False, db=db)


@router.post("/{conversation_id}/feedback")
async def submit_conversation_feedback(
    conversation_id: str,
    payload: ConversationFeedbackCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Save subscriber CSAT rating (1-5 stars) and feedback on resolved conversation in PostgreSQL.
    """
    result = await db.execute(select(Conversation).where(Conversation.id == conversation_id))
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    # Clamping rating 1 to 5
    rating_val = max(1, min(5, payload.rating))
    now = datetime.now(timezone.utc)

    # Determine sentiment if not provided
    sentiment = payload.customer_sentiment
    if not sentiment:
        if rating_val >= 4:
            sentiment = "positive"
        elif rating_val == 3:
            sentiment = "neutral"
        else:
            sentiment = "negative"

    fb = AIFeedback(
        id=f"fb-{str(uuid.uuid4())[:8]}",
        conversation_id=conversation_id,
        rating=rating_val,
        is_resolved=True,
        feedback_text=payload.feedback_text.strip() if payload.feedback_text else None,
        customer_sentiment=sentiment,
        created_at=now,
        updated_at=now,
    )
    db.add(fb)

    # Update conversation metadata
    meta = dict(conv.metadata_info or {})
    meta["csat_rating"] = rating_val
    meta["csat_feedback"] = payload.feedback_text
    meta["csat_submitted_at"] = now.isoformat()
    conv.metadata_info = meta
    conv.updated_at = now

    await db.commit()

    # Broadcast WebSocket update
    await ws_manager.broadcast_to_conversation(
        conversation_id,
        {
            "type": "feedback_submitted",
            "conversation_id": conversation_id,
            "rating": rating_val,
            "sentiment": sentiment,
        }
    )

    return {
        "status": "success",
        "message": "Customer feedback recorded successfully.",
        "id": fb.id,
        "conversation_id": conversation_id,
        "rating": rating_val,
        "sentiment": sentiment,
    }
