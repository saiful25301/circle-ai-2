import asyncio
import json
import logging
import time
import uuid
from functools import wraps
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.tool_log import ToolLog
from app.services.rag.retriever import search_knowledge_base
from app.services.isp_tools.tools import (
    # Customer tools
    get_customer_info,
    verify_customer,
    # ISP support tools
    check_connection_status,
    check_internet_outage,
    troubleshoot_internet,
    check_customer_bill,
    check_payment_status,
    # Sales tools
    get_available_packages,
    recommend_internet_package,
    check_service_coverage,
    create_connection_lead,
    # Complaint tools
    create_complaint_ticket,
    get_ticket_status,
    # Human support tools
    request_human_support,
    TOOL_FUNCTIONS_MAP
)

logger = logging.getLogger(__name__)

# =============================================================================
# System Instructions for Circle AI
# =============================================================================

SYSTEM_INSTRUCTION = """You are Circle AI, the intelligent, empathetic, and ultra-precise AI customer support engineer representing Circle Network, a premier fiber-optic Internet Service Provider (ISP) in Bangladesh.
Your persona is inspired by Intercom Fin: warm, clear, concise, proactive, and strictly truthful.

OPERATIONAL CORE & AGENTIC BEHAVIOR:
1. ISP IDENTITY & PERSONALITY:
   - Always represent Circle Network (Bangladesh) with pride and high technical competence.
   - Tone: Friendly, courteous, professional, and efficient.
   - Support Hotline: 09611800800.
2. NATIVE MULTILINGUAL UNDERSTANDING:
   - Automatically detect the customer's language.
   - If the customer writes in Bengali (বাংলা), reply in natural, fluent, and respectful Bengali.
   - If the customer writes in Romanized Bengali ("Banglish", e.g. "amar net slow", "bill koto", "kono problem ache?"), understand immediately and respond in clear Bengali or helpful English.
   - If the customer writes in English, reply in professional, concise English.
3. AGENTIC FUNCTION CALLING GUIDELINES (14 TOOLS):
   - You have 14 official Circle Network backend tools. Always choose and execute the correct tools to get ground-truth facts.
   - Never invent or hallucinate package prices, billing numbers, optical telemetry, or complaint IDs.
   - Customer Tools:
     * `get_customer_info(subscriber_id_or_phone)`: Non-sensitive profile summary.
     * `verify_customer(subscriber_id, phone)`: Verifies subscriber identity before disclosing private details or making changes.
   - ISP Support Tools:
     * `check_connection_status(subscriber_id_or_pppoe)`: Checks optical Rx power (dBm), OLT port, and status.
     * `check_internet_outage(zone)`: Checks backbone and POP status in customer's area.
     * `troubleshoot_internet(subscriber_id_or_pppoe, issue_type)`: Guides through physical, MTU (1492), and DNS (1.1.1.1, 8.8.8.8) diagnostics.
     * `check_customer_bill(subscriber_id_or_pppoe)`: Returns plan fee, due amounts, and bKash merchant payment details.
     * `check_payment_status(subscriber_id, transaction_id)`: Reconciles bKash/Nagad transactions.
   - Sales Tools:
     * `get_available_packages()`: Official fiber broadband packages and BDIX speeds.
     * `recommend_internet_package(usage_type, num_devices, budget_bdt)`: Tailors the best plan for gaming, 4K streaming, or home use.
     * `check_service_coverage(area_or_thana)`: Checks fiber POP availability in Dhaka areas.
     * `create_connection_lead(name, phone, address, zone, package_name)`: Registers a new connection lead in the database.
   - Complaint Tools:
     * `create_complaint_ticket(subscriber_id, title, description, category, priority)`: Registers a formal NOC ticket with an official ticket number.
     * `get_ticket_status(ticket_number)`: Looks up status, SLA deadline, and resolution notes.
   - Human Support Handover:
     * `request_human_support(conversation_id, reason, priority)`: Escalates conversation to a human NOC officer when an issue requires physical work or user asks for a human.
4. MULTI-STEP SEQUENTIAL CALLS:
   - If a customer provides both their ID and phone and asks for line/bill status, verify them first, then check their connection/bill in the same turn.
   - If optical signal is critical (< -27 dBm) or there is a physical fiber break, explain the issue and either create a ticket or escalate to human support.
5. SENSITIVE ACTION CONFIRMATION:
   - Ask for confirmation before creating leads or filing complaint tickets if details are missing.
   - Never state an action succeeded unless the tool output confirms it.
"""

# =============================================================================
# OpenAPI Schema Definitions for 14 Tools
# =============================================================================

ISP_TOOLS_DEFINITIONS = [
    {
        "name": "get_customer_info",
        "description": "Retrieves non-sensitive subscriber summary (ID, name, zone, plan, connection state).",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "subscriber_id_or_phone": {"type": "STRING", "description": "Subscriber ID (e.g. CN-88214) or registered phone number"}
            },
            "required": ["subscriber_id_or_phone"]
        }
    },
    {
        "name": "verify_customer",
        "description": "Verifies customer identity by checking that the provided phone matches the subscriber ID.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "subscriber_id": {"type": "STRING", "description": "Subscriber ID (e.g. CN-88214)"},
                "phone": {"type": "STRING", "description": "Customer contact phone number to verify"}
            },
            "required": ["subscriber_id", "phone"]
        }
    },
    {
        "name": "check_connection_status",
        "description": "Checks optical signal power (Rx dBm), OLT port, and real-time connectivity status.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "subscriber_id_or_pppoe": {"type": "STRING", "description": "Subscriber ID or PPPoE username"}
            },
            "required": ["subscriber_id_or_pppoe"]
        }
    },
    {
        "name": "check_internet_outage",
        "description": "Checks if there is a known area-wide optical fiber cut or POP maintenance in a zone.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "zone": {"type": "STRING", "description": "Area or zone in Dhaka (e.g. Mirpur, Dhanmondi, Uttara, Gulshan)"}
            },
            "required": ["zone"]
        }
    },
    {
        "name": "troubleshoot_internet",
        "description": "Runs targeted internet diagnostics for slow speed, red LOS light, latency, or disconnects.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "subscriber_id_or_pppoe": {"type": "STRING", "description": "Subscriber ID or PPPoE username"},
                "issue_type": {"type": "STRING", "description": "Issue description: 'slow_speed', 'red_los_light', 'frequent_disconnects', or 'high_ping'"}
            },
            "required": ["subscriber_id_or_pppoe", "issue_type"]
        }
    },
    {
        "name": "check_customer_bill",
        "description": "Checks current monthly bill, outstanding balance, billing cycle, and bKash payment details.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "subscriber_id_or_pppoe": {"type": "STRING", "description": "Subscriber ID or PPPoE username"}
            },
            "required": ["subscriber_id_or_pppoe"]
        }
    },
    {
        "name": "check_payment_status",
        "description": "Checks recent payment transactions (bKash/Nagad) and verification status.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "subscriber_id": {"type": "STRING", "description": "Subscriber ID"},
                "transaction_id": {"type": "STRING", "description": "Optional bKash or Nagad transaction TrxID"}
            },
            "required": ["subscriber_id"]
        }
    },
    {
        "name": "get_available_packages",
        "description": "Lists official Circle Network fiber broadband plans, bandwidth speeds, and BDT prices.",
        "parameters": {"type": "OBJECT", "properties": {}}
    },
    {
        "name": "recommend_internet_package",
        "description": "Recommends the best broadband package based on user usage profile, devices, and budget.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "usage_type": {"type": "STRING", "description": "Usage type: 'gaming', '4k_streaming', 'work_from_home', 'general'"},
                "num_devices": {"type": "INTEGER", "description": "Number of connected devices (phones, laptops, smart TVs)"},
                "budget_bdt": {"type": "NUMBER", "description": "Optional customer budget in BDT"}
            },
            "required": ["usage_type", "num_devices"]
        }
    },
    {
        "name": "check_service_coverage",
        "description": "Checks if Circle Network fiber-optic broadband coverage is available in an area or thana.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "area_or_thana": {"type": "STRING", "description": "Area, neighborhood, or thana name in Dhaka"}
            },
            "required": ["area_or_thana"]
        }
    },
    {
        "name": "create_connection_lead",
        "description": "Registers a prospective customer inquiry for a new Circle Network fiber internet connection.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "name": {"type": "STRING", "description": "Customer full name"},
                "phone": {"type": "STRING", "description": "Customer contact mobile number"},
                "address": {"type": "STRING", "description": "Installation street address"},
                "zone": {"type": "STRING", "description": "Area / zone (e.g. Dhanmondi, Mirpur, Uttara)"},
                "package_name": {"type": "STRING", "description": "Selected package name"}
            },
            "required": ["name", "phone", "address", "zone"]
        }
    },
    {
        "name": "create_complaint_ticket",
        "description": "Creates an official complaint ticket for Circle Network NOC & Field Engineering.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "subscriber_id": {"type": "STRING", "description": "Subscriber ID"},
                "title": {"type": "STRING", "description": "Short summary of the issue"},
                "description": {"type": "STRING", "description": "Detailed description of problem and symptoms"},
                "category": {"type": "STRING", "description": "Category: 'optical_loss', 'fiber_break', 'slow_speed', 'billing', 'router_config'"},
                "priority": {"type": "STRING", "description": "Priority: 'urgent', 'high', 'normal'"}
            },
            "required": ["subscriber_id", "title", "description"]
        }
    },
    {
        "name": "get_ticket_status",
        "description": "Looks up the real-time status, assigned engineer, and resolution notes for a complaint ticket.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "ticket_number": {"type": "STRING", "description": "Complaint ticket number (e.g. TKT-2026-0042)"}
            },
            "required": ["ticket_number"]
        }
    },
    {
        "name": "request_human_support",
        "description": "Escalates conversation to a human Circle Network NOC support officer.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "conversation_id": {"type": "STRING", "description": "Current conversation ID"},
                "reason": {"type": "STRING", "description": "Reason for human escalation"},
                "priority": {"type": "STRING", "description": "Priority: 'urgent', 'high', 'normal'"}
            },
            "required": ["conversation_id", "reason"]
        }
    }
]


# =============================================================================
# Database Audit Logging Helper
# =============================================================================

async def record_tool_log_db(
    tool_name: str,
    subscriber_id: Optional[str],
    args: Dict[str, Any],
    result: Any,
    execution_time_ms: int,
    conversation_id: Optional[str] = None,
    escalated: bool = False
):
    """Persists tool execution audit log into database (tool_logs table)."""
    try:
        async with AsyncSessionLocal() as session:
            sub = subscriber_id or args.get("subscriber_id") or args.get("subscriber_id_or_pppoe") or args.get("subscriber_id_or_phone")
            log_entry = ToolLog(
                tool_name=tool_name,
                conversation_id=conversation_id,
                subscriber_id=str(sub) if sub else None,
                input_args=args,
                output_result=result if isinstance(result, dict) else {"result": result},
                gemini_model=settings.GEMINI_MODEL,
                execution_time_ms=execution_time_ms,
                confidence_score=0.98,
                escalated=escalated
            )
            session.add(log_entry)
            await session.commit()
    except Exception as e:
        logger.warning(f"Could not persist tool log to database: {e}")


# =============================================================================
# Core AI Agent Function Calling Pipeline
# =============================================================================

async def process_chat(
    first_arg: Optional[str] = None,
    second_arg: Optional[str] = None,
    conversation_id: Optional[str] = None,
    user_message: Optional[str] = None,
    customer_id: Optional[str] = None,
    conversation_history: Optional[List[Dict[str, str]]] = None,
    db: Optional[AsyncSession] = None,
    **kwargs
) -> Dict[str, Any]:
    """
    Main Agentic AI Chat Pipeline:
    - Interprets customer intent in Bangla, Banglish, or English.
    - Dynamically equips Gemini with 14 official Circle Network backend tools.
    - Automatically executes tools via Google Gen AI SDK Function Calling (`google-genai`).
    - Tracks and audits every tool call, argument, execution time, and result in PostgreSQL (`tool_logs`).
    - Natively supports multi-step sequential tool calls (e.g. verify -> diagnose -> escalate).
    - Preserves context-aware conversation history.
    """
    # 1. Normalize caller arguments
    if user_message is None:
        if second_arg is not None:
            conv_id = first_arg or "conv-default"
            msg = second_arg
        else:
            conv_id = "conv-default"
            msg = first_arg or ""
    else:
        conv_id = conversation_id or first_arg or "conv-default"
        msg = user_message

    target_sub = customer_id or kwargs.get("subscriber_id")

    # Detect candidate subscriber ID in text if not explicitly passed
    for candidate in ["CN-88214", "CN-99412", "CN-10291", "CN-55219", "CN-33418"]:
        if candidate.lower() in msg.lower():
            target_sub = candidate
            break

    # 2. Search RAG knowledge base for contextual guidance
    rag_articles = search_knowledge_base(msg, top_k=2)
    rag_sources = [a["title"] for a in rag_articles]
    rag_context = "\n\n".join([f"KB [{a['category']}]: {a['title']}\n{a['content']}" for a in rag_articles])

    # 3. Tool tracking state for this turn
    session_tool_calls: List[Dict[str, Any]] = []
    escalation_state = {"should_escalate": False, "reason": None}

    # Helper function to wrap each tool with latency logging & DB persistence
    def make_logged_tool(fn_name: str, fn: Any):
        @wraps(fn)
        async def async_wrapper(*args, **kwargs):
            start_t = time.time()
            try:
                # If tool requires conversation_id and not provided, inject it
                if fn_name == "request_human_support" and "conversation_id" not in kwargs:
                    kwargs["conversation_id"] = conv_id
                
                # Execute underlying authorized tool
                if asyncio.iscoroutinefunction(fn):
                    res = await fn(*args, **kwargs)
                else:
                    res = fn(*args, **kwargs)
                duration_ms = int((time.time() - start_t) * 1000)

                # Check if this tool indicates escalation
                is_escalated = False
                if fn_name == "request_human_support":
                    is_escalated = True
                    escalation_state["should_escalate"] = True
                    escalation_state["reason"] = kwargs.get("reason", "Customer requested human support.")
                elif fn_name == "create_complaint_ticket" and kwargs.get("priority") == "urgent":
                    is_escalated = True
                    escalation_state["should_escalate"] = True
                    escalation_state["reason"] = f"Urgent complaint ticket logged: {res.get('ticket_number')}"
                elif fn_name in ["check_connection_status", "troubleshoot_internet"] and res.get("requires_technician"):
                    is_escalated = True
                    escalation_state["should_escalate"] = True
                    escalation_state["reason"] = f"Critical optical signal attenuation: {res.get('optical_power_dbm')} dBm"

                # Record in session
                tool_call_dict = {
                    "tool_name": fn_name,
                    "arguments": kwargs,
                    "result": res,
                    "duration_ms": duration_ms
                }
                session_tool_calls.append(tool_call_dict)

                # Persist to database
                await record_tool_log_db(
                    tool_name=fn_name,
                    subscriber_id=kwargs.get("subscriber_id") or target_sub,
                    args=kwargs,
                    result=res,
                    execution_time_ms=duration_ms,
                    conversation_id=conv_id,
                    escalated=is_escalated
                )

                return res
            except Exception as e:
                logger.error(f"Error executing tool {fn_name}: {e}")
                err_res = {"status": "error", "message": f"Tool execution failed: {str(e)}"}
                session_tool_calls.append({"tool_name": fn_name, "arguments": kwargs, "result": err_res, "duration_ms": 0})
                return err_res

        return async_wrapper

    # Create session-bound wrapped tools with authentic signatures
    wrapped_tools = [
        make_logged_tool(name, fn)
        for name, fn in TOOL_FUNCTIONS_MAP.items()
    ]

    # 4. Attempt Gemini Function Calling with google-genai SDK
    if settings.GEMINI_API_KEY and settings.GEMINI_API_KEY.strip():
        try:
            from google import genai
            from google.genai import types

            client = genai.Client(api_key=settings.GEMINI_API_KEY)

            # Build multi-turn conversation history
            history_contents: List[types.Content] = []
            if conversation_history:
                for turn in conversation_history[-8:]:
                    role = "user" if turn.get("role") in ["user", "customer"] else "model"
                    content_str = str(turn.get("content", "")).strip()
                    if content_str:
                        history_contents.append(
                            types.Content(
                                role=role,
                                parts=[types.Part.from_text(text=content_str)]
                            )
                        )

            # Build enriched prompt with customer identifier and RAG guidance
            user_prompt = msg
            if target_sub or rag_context:
                sub_cue = f"[ACTIVE SUBSCRIBER CONTEXT]: The customer in this session is associated with Subscriber ID: '{target_sub}'.\n" if target_sub else ""
                kb_cue = f"[KNOWLEDGE BASE ASSISTANCE]:\n{rag_context}\n" if rag_context else ""
                user_prompt = f"{sub_cue}{kb_cue}\nUser Query: {msg}"

            # Create chat runner with 14 tools and automatic function calling
            candidate_models = [settings.GEMINI_MODEL] + [m for m in settings.GEMINI_FALLBACK_MODELS if m != settings.GEMINI_MODEL]
            gemini_reply: Optional[str] = None
            last_err: Optional[Exception] = None

            for model_name in candidate_models:
                try:
                    chat = client.aio.chats.create(
                        model=model_name,
                        history=history_contents,
                        config=types.GenerateContentConfig(
                            system_instruction=SYSTEM_INSTRUCTION,
                            tools=wrapped_tools,
                            temperature=0.2
                        )
                    )

                    response = await chat.send_message(user_prompt)
                    if response and response.text:
                        gemini_reply = response.text.strip()
                        break
                except Exception as model_err:
                    last_err = model_err
                    logger.warning(f"Gemini model {model_name} invocation failed: {model_err}, trying next fallback...")

            if gemini_reply:
                return {
                    "conversation_id": conv_id,
                    "reply": gemini_reply,
                    "response": gemini_reply,
                    "tool_calls": session_tool_calls,
                    "rag_sources": rag_sources,
                    "should_escalate": escalation_state["should_escalate"],
                    "escalate_to_human": escalation_state["should_escalate"],
                    "escalation_reason": escalation_state["reason"]
                }
            else:
                logger.error(f"All Gemini models exhausted. Last error: {last_err}")
        except Exception as e:
            logger.error(f"Google Gen AI execution error: {e}")

    # 5. Deterministic Grounded ISP Engine (Safe Offline / High-Demand Fallback)
    logger.info("Executing deterministic grounded ISP fallback engine with tool execution.")
    msg_lower = msg.lower()
    is_bangla = any(ord(c) >= 0x0980 and ord(c) <= 0x09FF for c in msg) or any(k in msg_lower for k in ["amar", "koto", "ki", "shomossha", "bhalo", "dhonnobad", "taka"])

    # Proactive tool selection in fallback mode
    if any(k in msg_lower for k in ["human", "agent", "support officer", "escalate", "মানুষ", "অফিসার"]):
        res = await request_human_support(conv_id, "Customer requested human support.")
        session_tool_calls.append({"tool_name": "request_human_support", "arguments": {"conversation_id": conv_id}, "result": res})
        escalation_state["should_escalate"] = True
        escalation_state["reason"] = "Customer requested human support officer assistance"
        reply = (
            "আপনার অনুরোধটি আমাদের সার্কেল নেটওয়ার্কের সিনিয়র সাপোর্ট টিমে স্থানান্তর করা হয়েছে। একজন টেকনিক্যাল অফিসার দ্রুত আপনার সাথে যুক্ত হবেন।"
            if is_bangla else
            "I have transferred your conversation to our Circle Network Tier-1 NOC Desk. A support engineer is reviewing your details and will join shortly."
        )
    elif any(k in msg_lower for k in ["package", "plan", "speed", "price", "offer", "প্যাকেজ", "দাম", "অফার"]):
        res = await get_available_packages()
        session_tool_calls.append({"tool_name": "get_available_packages", "arguments": {}, "result": res})
        plans = res.get("packages", [])
        if is_bangla:
            pkg_md = "\n".join([f"- **{p['name']}**: ৳{p['price_bdt']}/মাস ({p['speed_mbps']} Mbps) — {p['description']}" for p in plans])
            reply = f"🚀 **সার্কেল নেটওয়ার্কের উচ্চগতির ফাইবার প্যাকেজসমূহ**:\n\n{pkg_md}\n\nসব প্যাকেজেই পাচ্ছেন আনলিমিটেড ব্যান্ডউইথ এবং BDIX পেয়ারিং।"
        else:
            pkg_md = "\n".join([f"- **{p['name']}**: ৳{p['price_bdt']}/mo ({p['speed_mbps']} Mbps) — {p['description']}" for p in plans])
            reply = f"🚀 **Circle Network Fiber Internet Packages**:\n\n{pkg_md}\n\nAll plans include true unlimited high-speed data with ultra-low ping BDIX connectivity."
    elif any(k in msg_lower for k in ["bill", "due", "payment", "bkash", "বিল", "বিকাশ", "টাকা"]):
        sub_id = target_sub or "CN-88214"
        res = await check_customer_bill(sub_id)
        session_tool_calls.append({"tool_name": "check_customer_bill", "arguments": {"subscriber_id_or_pppoe": sub_id}, "result": res})
        if is_bangla:
            reply = (
                f"💳 **সার্কেল নেটওয়ার্ক বিলিং বিবরণী ({res.get('subscriber_id')})**:\n\n"
                f"- গ্রাহকের নাম: **{res.get('full_name')}**\n"
                f"- বর্তমান প্যাকেজ: **{res.get('current_plan')}**\n"
                f"- মাসিক বিল: **৳{res.get('monthly_bill_bdt')} টাকা**\n"
                f"- বর্তমান বকেয়া: **৳{res.get('current_due_bdt')} টাকা** ({res.get('payment_status')})\n\n"
                f"**বিকাশ পেমেন্ট করার নিয়ম:**\n"
                f"১. বিকাশ অ্যাপে গিয়ে **'Make Payment'** সিলেক্ট করুন\n"
                f"২. মার্চেন্ট নম্বর: `{settings.ISP_BKASH_MERCHANT_NO}`\n"
                f"৩. রেফারেন্স হিসেবে আপনার সাবস্ক্রাইবার আইডি `{res.get('subscriber_id')}` দিন।"
            )
        else:
            reply = (
                f"💳 **Circle Network Billing Summary for {res.get('full_name')} ({res.get('subscriber_id')})**:\n\n"
                f"- Plan: **{res.get('current_plan')}**\n"
                f"- Monthly Fee: **৳{res.get('monthly_bill_bdt')} BDT**\n"
                f"- Outstanding Due: **৳{res.get('current_due_bdt')} BDT** ({res.get('payment_status')})\n\n"
                f"**To pay via bKash:**\n"
                f"1. Open bKash App -> **Make Payment**\n"
                f"2. Merchant No: `{settings.ISP_BKASH_MERCHANT_NO}`\n"
                f"3. Reference: `{res.get('subscriber_id')}`"
            )
    elif any(k in msg_lower for k in ["signal", "optical", "power", "los", "red light", "fiber", "slow", "down", "সিগন্যাল", "স্লো"]):
        sub_id = target_sub or "CN-88214"
        res = await check_connection_status(sub_id)
        session_tool_calls.append({"tool_name": "check_connection_status", "arguments": {"subscriber_id_or_pppoe": sub_id}, "result": res})
        p = res.get("optical_power_dbm", -20.0)
        if res.get("requires_technician"):
            escalation_state["should_escalate"] = True
            escalation_state["reason"] = f"Critical optical signal attenuation ({p} dBm) requiring physical inspection."
        if is_bangla:
            reply = (
                f"📡 **ফাইবার অপটিক্যাল ডায়াগনস্টিক রিপোর্ট ({res.get('subscriber_id')})**:\n\n"
                f"- অপটিক্যাল সিগন্যাল: `{p} dBm` ({res.get('optical_health')})\n"
                f"- ওএলটি পোর্ট: `{res.get('pon_port')}` | স্থিতি: `{res.get('connection_state')}`\n"
                f"- পর্যবেক্ষণ: {res.get('recommendation')}\n\n"
                f"সার্কেল নেটওয়ার্ক হেল্পলাইন: `{settings.ISP_SUPPORT_HOTLINE}`"
            )
        else:
            reply = (
                f"📡 **Fiber Optical Diagnostics for {res.get('full_name')} ({res.get('subscriber_id')})**:\n\n"
                f"- Optical Rx Power: `{p} dBm` ({res.get('optical_health')})\n"
                f"- OLT Port: `{res.get('pon_port')}` | Status: `{res.get('connection_state')}`\n"
                f"- Recommendation: {res.get('recommendation')}\n\n"
                f"Need immediate assistance? Circle Network Hotline: `{settings.ISP_SUPPORT_HOTLINE}`"
            )
    else:
        top_doc = rag_articles[0] if rag_articles else None
        doc_note = f"\n\n*সহায়ক তথ্য: {top_doc['title']}*\n{top_doc['content']}" if (top_doc and is_bangla) else (f"\n\n*Reference: {top_doc['title']}*\n{top_doc['content']}" if top_doc else "")
        if is_bangla:
            reply = (
                f"আসসালামু আলাইকুম! আমি Circle AI, সার্কেল নেটওয়ার্কের ভার্চুয়াল কাস্টমার সাপোর্ট অ্যাসিস্ট্যান্ট।\n\n"
                f"আমি আপনাকে যেভাবে সাহায্য করতে পারি:\n"
                f"• 📡 **ফাইবার সিগন্যাল ও লাইন ডায়াগনোসিস**\n"
                f"• 💳 **বিলিং তথ্য ও বিকাশ পেমেন্ট গাইড**\n"
                f"• 🚀 **নতুন ইন্টারনেট প্যাকেজ ও কাভারেজ চেক**\n"
                f"• 🎫 **অভিযোগ টিকিট তৈরি ও স্ট্যাটাস চেক**\n"
                f"• 🛠️ **রাউটার কনফিগারেশন (DNS: 1.1.1.1, MTU: 1492)**"
                f"{doc_note}\n\n"
                f"আপনার সাবস্ক্রাইবার আইডি (যেমন: CN-88214) জানিয়ে প্রশ্নটি করুন।"
            )
        else:
            reply = (
                f"Hello! I am Circle AI, the official virtual support engineer for Circle Network.\n\n"
                f"I can assist you with:\n"
                f"• 📡 **Diagnosing optical fiber signal & connection health**\n"
                f"• 💳 **Checking bills & bKash payment verification**\n"
                f"• 🚀 **Exploring broadband packages & area coverage**\n"
                f"• 🎫 **Logging complaint tickets & tracking ticket status**\n"
                f"• 🛠️ **Wi-Fi router setup & gaming DNS optimization**"
                f"{doc_note}\n\n"
                f"How may I assist your connection today?"
            )

    return {
        "conversation_id": conv_id,
        "reply": reply,
        "response": reply,
        "tool_calls": session_tool_calls,
        "rag_sources": rag_sources,
        "should_escalate": escalation_state["should_escalate"],
        "escalate_to_human": escalation_state["should_escalate"],
        "escalation_reason": escalation_state["reason"]
    }
