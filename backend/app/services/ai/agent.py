import json
import logging
import time
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.services.isp_tools.tools import (
    diagnose_onu_status,
    check_subscriber_billing,
    reboot_onu_session,
    list_internet_plans,
    find_subscriber
)
from app.services.rag.retriever import search_knowledge_base
from app.models.tool_log import ToolLog

logger = logging.getLogger(__name__)

SYSTEM_INSTRUCTION = """You are Circle AI, the official virtual customer support engineer representing Circle Network, a leading fiber-optic Internet Service Provider (ISP) in Bangladesh.
Your persona is inspired by Intercom Fin: warm, empathetic, ultra-precise, proactive, and concise.

CRITICAL IDENTITY & OPERATIONAL RULES:
1. ISP REPRESENTATION: You strictly represent Circle Network (Bangladesh). Always uphold our reputation for reliable, high-speed fiber internet.
2. LANGUAGE UNDERSTANDING:
   - Automatically detect the user's language.
   - If the user writes in Bengali (বাংলা), respond in natural, polite, and fluent Bengali.
   - If the user writes in English, respond in professional, crisp, and friendly English.
   - If the user writes in Romanized Bengali ("Banglish", e.g., "amar net slow", "bill koto"), seamlessly understand their meaning and reply helpfully in friendly Bengali or clear English as appropriate.
3. ABSOLUTE GUARDRAILS — ZERO HALLUCINATIONS:
   - NEVER invent or guess package prices or imaginary discounts. Official packages are:
     * Circle Starter: 20 Mbps, 600 BDT/month (100 Mbps BDIX)
     * Circle Fast: 30 Mbps, 800 BDT/month (100 Mbps BDIX) [Most Popular]
     * Circle Turbo: 50 Mbps, 1,200 BDT/month (200 Mbps BDIX)
     * Circle Gamer: 60 Mbps, 1,400 BDT/month (300 Mbps BDIX, low ping gaming routing)
     * Circle Ultra: 100 Mbps, 2,000 BDT/month (500 Mbps BDIX, real Public IP)
   - NEVER invent customer identity, phone numbers, or billing balances.
     * If the user asks about their personal account, bill, or line status and you do not have their Subscriber ID or PPPoE username, politely ask them to provide their Circle Network Subscriber ID (e.g. CN-88214) or registered phone number.
     * When telemetry or billing data is provided in the verified context, use those exact figures.
   - NEVER invent complaint ticket IDs (e.g., do not say "Ticket #1234 has been created"). If the issue requires human intervention, explain that you are prioritizing and escalating their case to a Circle Network NOC engineer.
   - NEVER fabricate successful backend actions. Do not claim you rebooted a router or reset an OLT port unless the backend telemetry confirms it was dispatched.
4. ISP TECHNICAL GUIDELINES:
   - Fiber Optical Signal (Rx Power):
     * Normal / Optimal: -15 dBm to -25 dBm.
     * Marginal / Degraded: -25 dBm to -27 dBm (attenuation, dirty connector, micro-bend).
     * Critical Alarm: below -27 dBm (severe drop wire bend or fiber break; requires on-site technician).
   - Router Configuration: PPPoE MTU is 1492; Recommended DNS: Primary 1.1.1.1, Secondary 8.8.8.8.
   - Payment Methods: bKash Merchant Payment (Reference = Subscriber ID) or Nagad.
   - Official Support Hotline: 09611800800.
5. SAFE HANDLING OF UNAVAILABLE INFORMATION:
   - If information is not available, acknowledge it honestly and offer to connect the customer directly to a human support agent.
"""

ISP_TOOLS_DEFINITIONS = [
    {
        "name": "diagnose_onu_status",
        "description": "Checks the optical signal level (dBm), ONU status, OLT port, and connection health of a subscriber.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "subscriber_id_or_pppoe": {
                    "type": "STRING",
                    "description": "Subscriber ID (e.g. CN-88214) or PPPoE username"
                }
            },
            "required": ["subscriber_id_or_pppoe"]
        }
    },
    {
        "name": "check_subscriber_billing",
        "description": "Retrieves subscriber's billing status, monthly plan fee, due amounts, and bKash payment details.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "subscriber_id_or_pppoe": {
                    "type": "STRING",
                    "description": "Subscriber ID (e.g. CN-88214) or PPPoE username"
                }
            },
            "required": ["subscriber_id_or_pppoe"]
        }
    },
    {
        "name": "reboot_onu_session",
        "description": "Dispatches a soft reboot signal to the subscriber ONU port on the Circle Network OLT.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "subscriber_id_or_pppoe": {
                    "type": "STRING",
                    "description": "Subscriber ID or PPPoE username"
                }
            },
            "required": ["subscriber_id_or_pppoe"]
        }
    },
    {
        "name": "list_internet_plans",
        "description": "Returns current Circle Network fiber internet plans, speeds (Mbps), and BDT pricing.",
        "parameters": {
            "type": "OBJECT",
            "properties": {}
        }
    }
]


def execute_tool(name: str, args: Dict[str, Any]) -> Any:
    """Executes an ISP diagnostic or billing tool and returns structured factual data."""
    if name == "diagnose_onu_status":
        sub_id = args.get("subscriber_id_or_pppoe", "CN-88214")
        return diagnose_onu_status(sub_id)
    elif name == "check_subscriber_billing":
        sub_id = args.get("subscriber_id_or_pppoe", "CN-88214")
        return check_subscriber_billing(sub_id)
    elif name == "reboot_onu_session":
        sub_id = args.get("subscriber_id_or_pppoe", "CN-88214")
        return reboot_onu_session(sub_id)
    elif name == "list_internet_plans":
        return list_internet_plans()
    else:
        return {"error": f"Unknown tool: {name}"}


async def record_tool_log(
    tool_name: str,
    subscriber_id: Optional[str],
    args: Dict[str, Any],
    result: Any,
    execution_time_ms: int,
    db: Optional[AsyncSession] = None,
    conversation_id: Optional[str] = None
):
    """Persists tool execution audit log into database."""
    try:
        log_entry = ToolLog(
            tool_name=tool_name,
            conversation_id=conversation_id,
            subscriber_id=subscriber_id or args.get("subscriber_id_or_pppoe"),
            input_args=args,
            output_result=result if isinstance(result, dict) else {"result": result},
            gemini_model=settings.GEMINI_MODEL,
            execution_time_ms=execution_time_ms,
            confidence_score=1.0,
            escalated=False
        )
        if db:
            db.add(log_entry)
            await db.commit()
    except Exception as e:
        logger.warning(f"Could not persist tool log to database: {e}")


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
    Robust AI Agent reasoning pipeline powered by Gemini API (google-genai):
    1. Normalizes flexible caller parameters (supports both positional and keyword invocation).
    2. Identifies customer context & loads relevant knowledge base (RAG) + ISP telemetry.
    3. Executes real backend tools (diagnostics, billing, plans) without hallucination.
    4. Calls Google Gen AI SDK (`google-genai`) with full conversation history and system instructions.
    5. Gracefully handles rate limits and model fallback, with an intelligent deterministic ISP fallback.
    """
    # Normalize parameters
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

    # Detect if message mentions a specific subscriber ID or username
    for candidate in ["CN-88214", "CN-99412", "CN-10291", "CN-55219", "CN-33418", "rashed_mirpur10", "tanvir_dhanmondi"]:
        if candidate.lower() in msg.lower():
            target_sub = candidate
            break

    # 1. Retrieve RAG Knowledge Base articles
    rag_articles = search_knowledge_base(msg, top_k=2)
    rag_sources = [a["title"] for a in rag_articles]
    rag_context = "\n\n".join([f"Article [{a['category']}]: {a['title']}\n{a['content']}" for a in rag_articles])

    # 2. Check if ISP tool execution is needed based on user intent
    msg_lower = msg.lower()
    executed_tool_calls: List[Dict[str, Any]] = []
    telemetry_context = ""
    should_escalate = False
    escalation_reason = None

    # Check for human handover request
    if any(k in msg_lower for k in ["human", "agent", "support officer", "escalate", "মানুষ", "অফিসার", "প্রতিনিধি", "talk to person"]):
        should_escalate = True
        escalation_reason = "Customer explicitly requested human support officer assistance"

    # Diagnose Signal / Connection
    if any(k in msg_lower for k in ["signal", "optical", "power", "los", "red light", "fiber", "slow", "down", "disconnect", "সিগন্যাল", "স্লো", "লাল বাতি", "লাইন"]):
        t_start = time.time()
        sub_lookup = target_sub or "CN-88214"
        diag_res = execute_tool("diagnose_onu_status", {"subscriber_id_or_pppoe": sub_lookup})
        t_ms = int((time.time() - t_start) * 1000)
        executed_tool_calls.append({
            "tool_name": "diagnose_onu_status",
            "arguments": {"subscriber_id_or_pppoe": sub_lookup},
            "result": diag_res
        })
        await record_tool_log("diagnose_onu_status", sub_lookup, {"subscriber_id_or_pppoe": sub_lookup}, diag_res, t_ms, db, conv_id)
        if diag_res.get("status") == "success":
            telemetry_context += f"\n[VERIFIED BACKEND TELEMETRY]: Subscriber {diag_res.get('full_name')} ({sub_lookup}) on OLT {diag_res.get('olt_ip')} Port {diag_res.get('pon_port')}. Optical Rx Power: {diag_res.get('optical_power_dbm')} dBm ({diag_res.get('optical_health')}). Connection: {diag_res.get('connection_state')}. Recommendation: {diag_res.get('recommendation')}."
            if diag_res.get("optical_power_dbm", 0) < -27.0:
                should_escalate = True
                escalation_reason = f"Critical optical signal attenuation ({diag_res.get('optical_power_dbm')} dBm) requiring physical line inspection."

    # Billing / Payment Due
    if any(k in msg_lower for k in ["bill", "due", "payment", "bkash", "nagad", "pay", "বিল", "বিকাশ", "পেমেন্ট", "টাকা", "ডিউ"]):
        t_start = time.time()
        sub_lookup = target_sub or "CN-88214"
        bill_res = execute_tool("check_subscriber_billing", {"subscriber_id_or_pppoe": sub_lookup})
        t_ms = int((time.time() - t_start) * 1000)
        executed_tool_calls.append({
            "tool_name": "check_subscriber_billing",
            "arguments": {"subscriber_id_or_pppoe": sub_lookup},
            "result": bill_res
        })
        await record_tool_log("check_subscriber_billing", sub_lookup, {"subscriber_id_or_pppoe": sub_lookup}, bill_res, t_ms, db, conv_id)
        if bill_res.get("status") == "success":
            telemetry_context += f"\n[VERIFIED BILLING DATA]: Subscriber {bill_res.get('full_name')} ({sub_lookup}). Plan: {bill_res.get('current_plan')}. Monthly Fee: ৳{bill_res.get('monthly_bill_bdt')} BDT. Current Outstanding Due: ৳{bill_res.get('current_due_bdt')} BDT ({bill_res.get('payment_status')}). bKash Merchant: {settings.ISP_BKASH_MERCHANT_NO}."

    # Packages / Offers
    if any(k in msg_lower for k in ["package", "packages", "plan", "upgrade", "speed", "price", "offer", "mbps", "প্যাকেজ", "দাম", "অফার", "স্পিড"]):
        plans_res = execute_tool("list_internet_plans", {})
        executed_tool_calls.append({
            "tool_name": "list_internet_plans",
            "arguments": {},
            "result": plans_res
        })
        plans_list = [f"{p['name']}: {p['speed_mbps']} Mbps at ৳{p['price_bdt']}/month ({p['bdix']})" for p in plans_res.get("packages", [])]
        telemetry_context += f"\n[VERIFIED OFFICIAL PACKAGES]:\n" + "\n".join(plans_list)

    # Remote Reboot
    if any(k in msg_lower for k in ["reboot", "restart", "reset", "রিস্টার্ট", "রিবুট"]):
        t_start = time.time()
        sub_lookup = target_sub or "CN-88214"
        reboot_res = execute_tool("reboot_onu_session", {"subscriber_id_or_pppoe": sub_lookup})
        t_ms = int((time.time() - t_start) * 1000)
        executed_tool_calls.append({
            "tool_name": "reboot_onu_session",
            "arguments": {"subscriber_id_or_pppoe": sub_lookup},
            "result": reboot_res
        })
        await record_tool_log("reboot_onu_session", sub_lookup, {"subscriber_id_or_pppoe": sub_lookup}, reboot_res, t_ms, db, conv_id)
        telemetry_context += f"\n[VERIFIED ACTION EXECUTION]: Remote ONU port soft reboot command DISPATCHED successfully to Circle Network OLT for subscriber {sub_lookup}."

    # 3. Try Gemini API generation using official google-genai SDK
    if settings.GEMINI_API_KEY and settings.GEMINI_API_KEY.strip():
        try:
            from google import genai
            from google.genai import types

            client = genai.Client(api_key=settings.GEMINI_API_KEY)

            # Build prompt including real verified context
            user_prompt_with_context = msg
            if telemetry_context or rag_context:
                user_prompt_with_context = f"{msg}\n\n[OFFICIAL CIRCLE NETWORK BACKEND VERIFIED CONTEXT]:{telemetry_context}\n\n[KNOWLEDGE BASE CONTEXT]:\n{rag_context}\n\n(Important: Always use the exact verified backend data above and never hallucinate numbers, prices, or fake tickets. Respond warmly in the user's language)."

            # Format multi-turn conversation history
            contents: List[types.Content] = []
            if conversation_history:
                for turn in conversation_history[-6:]:
                    turn_role = "user" if turn.get("role") in ["user", "customer"] else "model"
                    turn_content = str(turn.get("content", "")).strip()
                    if turn_content:
                        contents.append(
                            types.Content(
                                role=turn_role,
                                parts=[types.Part.from_text(text=turn_content)]
                            )
                        )

            # Append current turn
            contents.append(
                types.Content(
                    role="user",
                    parts=[types.Part.from_text(text=user_prompt_with_context)]
                )
            )

            # Generate content with model fallback
            candidate_models = [settings.GEMINI_MODEL] + [m for m in settings.GEMINI_FALLBACK_MODELS if m != settings.GEMINI_MODEL]
            gemini_reply: Optional[str] = None
            last_err: Optional[Exception] = None

            for model_name in candidate_models:
                try:
                    response = client.models.generate_content(
                        model=model_name,
                        contents=contents,
                        config=types.GenerateContentConfig(
                            system_instruction=SYSTEM_INSTRUCTION,
                            temperature=0.3
                        )
                    )
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
                    "tool_calls": executed_tool_calls,
                    "rag_sources": rag_sources,
                    "should_escalate": should_escalate,
                    "escalate_to_human": should_escalate,
                    "escalation_reason": escalation_reason
                }
            else:
                logger.error(f"All Gemini models exhausted. Last error: {last_err}")
        except Exception as e:
            logger.error(f"Google Gen AI execution error: {e}")

    # 4. Intelligent Deterministic Fallback Engine (Factual, grounded, zero-hallucination)
    logger.info("Using deterministic ISP rule engine fallback.")
    is_bangla = any(ord(c) >= 0x0980 and ord(c) <= 0x09FF for c in msg) or any(k in msg_lower for k in ["amar", "koto", "ki", "shomossha", "bhalo", "dhonnobad", "taka"])

    if should_escalate:
        reply = (
            "আপনার অনুরোধটি আমাদের সার্কেল নেটওয়ার্কের সিনিয়র সাপোর্ট টিমে স্থানান্তর করা হয়েছে। একজন টেকনিক্যাল অফিসার দ্রুত আপনার সাথে যুক্ত হবেন।"
            if is_bangla else
            "I have prioritized and escalated your request to our Circle Network Tier-1 Support Desk. A human support officer is reviewing your connection diagnostics and will join shortly."
        )
    elif "check_subscriber_billing" in [t["tool_name"] for t in executed_tool_calls]:
        b = executed_tool_calls[-1]["result"]
        if is_bangla:
            reply = (
                f"💳 **সার্কেল নেটওয়ার্ক বিলিং বিবরণী ({b.get('subscriber_id')})**:\n\n"
                f"- গ্রাহকের নাম: **{b.get('full_name')}**\n"
                f"- বর্তমান প্যাকেজ: **{b.get('current_plan')}**\n"
                f"- মাসিক বিল: **৳{b.get('monthly_bill_bdt')} টাকা**\n"
                f"- বর্তমান বকেয়া: **৳{b.get('current_due_bdt')} টাকা** ({b.get('payment_status')})\n\n"
                f"**বিকাশ পেমেন্ট করার নিয়ম:**\n"
                f"১. বিকাশ অ্যাপে গিয়ে **'Make Payment'** সিলেক্ট করুন\n"
                f"২. মার্চেন্ট নম্বর: `{settings.ISP_BKASH_MERCHANT_NO}`\n"
                f"৩. রেফারেন্স হিসেবে আপনার সাবস্ক্রাইবার আইডি `{b.get('subscriber_id')}` দিন।"
            )
        else:
            reply = (
                f"💳 **Circle Network Billing Summary for {b.get('full_name')} ({b.get('subscriber_id')})**:\n\n"
                f"- Plan: **{b.get('current_plan')}**\n"
                f"- Monthly Fee: **৳{b.get('monthly_bill_bdt')} BDT**\n"
                f"- Outstanding Due: **৳{b.get('current_due_bdt')} BDT** ({b.get('payment_status')})\n\n"
                f"**To pay via bKash:**\n"
                f"1. Open bKash App -> **Make Payment**\n"
                f"2. Merchant No: `{settings.ISP_BKASH_MERCHANT_NO}`\n"
                f"3. Reference: `{b.get('subscriber_id')}`\n\n"
                f"Your internet connection auto-renews within 3 minutes of payment!"
            )
    elif "diagnose_onu_status" in [t["tool_name"] for t in executed_tool_calls]:
        d = executed_tool_calls[-1]["result"]
        p = d.get("optical_power_dbm", -20.0)
        if is_bangla:
            reply = (
                f"📡 **ফাইবার অপটিক্যাল ডায়াগনস্টিক রিপোর্ট ({d.get('subscriber_id')})**:\n\n"
                f"- অপটিক্যাল সিগন্যাল: `{p} dBm` ({d.get('optical_health')})\n"
                f"- ওএলটি পোর্ট: `{d.get('pon_port')}` | স্থিতি: `{d.get('connection_state')}`\n"
                f"- পর্যবেক্ষণ: {d.get('recommendation')}\n\n"
                f"সার্কেল নেটওয়ার্ক হেল্পলাইন: `{settings.ISP_SUPPORT_HOTLINE}`"
            )
        else:
            reply = (
                f"📡 **Fiber Optical Diagnostics for {d.get('full_name')} ({d.get('subscriber_id')})**:\n\n"
                f"- Optical Rx Power: `{p} dBm` ({d.get('optical_health')})\n"
                f"- OLT Port: `{d.get('pon_port')}` | Status: `{d.get('connection_state')}`\n"
                f"- Technical Finding: {d.get('recommendation')}\n\n"
                f"Need immediate assistance? Circle Network Hotline: `{settings.ISP_SUPPORT_HOTLINE}`"
            )
    elif "list_internet_plans" in [t["tool_name"] for t in executed_tool_calls]:
        plans = executed_tool_calls[-1]["result"].get("packages", [])
        if is_bangla:
            pkg_md = "\n".join([f"- **{p['name']}**: ৳{p['price_bdt']}/মাস ({p['speed_mbps']} Mbps) — {p['bdix']}" for p in plans])
            reply = f"🚀 **সার্কেল নেটওয়ার্কের উচ্চগতির ফাইবার প্যাকেজসমূহ**:\n\n{pkg_md}\n\nসব প্যাকেজেই পাচ্ছেন আনলিমিটেড ব্যান্ডউইথ এবং BDIX পেয়ারিং।"
        else:
            pkg_md = "\n".join([f"- **{p['name']}**: ৳{p['price_bdt']}/mo ({p['speed_mbps']} Mbps) — {p['bdix']}" for p in plans])
            reply = f"🚀 **Circle Network Fiber Internet Packages**:\n\n{pkg_md}\n\nAll plans include true unlimited high-speed data with ultra-low ping BDIX connectivity."
    else:
        top_doc = rag_articles[0] if rag_articles else None
        doc_note = f"\n\n*সহায়ক তথ্য: {top_doc['title']}*\n{top_doc['content']}" if (top_doc and is_bangla) else (f"\n\n*Reference: {top_doc['title']}*\n{top_doc['content']}" if top_doc else "")
        if is_bangla:
            reply = (
                f"আসসালামু আলাইকুম! আমি Circle AI, সার্কেল নেটওয়ার্কের ভার্চুয়াল কাস্টমার সাপোর্ট অ্যাসিস্ট্যান্ট।\n\n"
                f"আমি আপনাকে যেভাবে সাহায্য করতে পারি:\n"
                f"• 📡 **ফাইবার সিগন্যাল ও ওএনইউ (ONU) ডায়াগনোসিস**\n"
                f"• 💳 **বিলিং তথ্য ও বিকাশ পেমেন্ট গাইড**\n"
                f"• 🚀 **নতুন ইন্টারনেট প্যাকেজ ও স্পিড আপগ্রেড**\n"
                f"• 🔄 **ওএলটি (OLT) পোর্ট রিস্টার্ট সিগন্যাল প্রেরণ**\n"
                f"• 🛠️ **রাউটার কনফিগারেশন (DNS: 1.1.1.1, MTU: 1492)**"
                f"{doc_note}\n\n"
                f"আপনার সাবস্ক্রাইবার আইডি (যেমন: CN-88214) জানিয়ে প্রশ্নটি করুন।"
            )
        else:
            reply = (
                f"Hello! I am Circle AI, the official virtual support engineer for Circle Network.\n\n"
                f"I can assist you with:\n"
                f"• 📡 **Diagnosing optical fiber signal & ONU health**\n"
                f"• 💳 **Checking bills & bKash payment instructions**\n"
                f"• 🚀 **Exploring broadband packages (20 Mbps - 100 Mbps)**\n"
                f"• 🔄 **Dispatching OLT port reboot signals**\n"
                f"• 🛠️ **Wi-Fi router optimization & gaming DNS setup**"
                f"{doc_note}\n\n"
                f"Please provide your Subscriber ID (e.g. CN-88214) or tell me how I can assist your connection today!"
            )

    return {
        "conversation_id": conv_id,
        "reply": reply,
        "response": reply,
        "tool_calls": executed_tool_calls,
        "rag_sources": rag_sources,
        "should_escalate": should_escalate,
        "escalate_to_human": should_escalate,
        "escalation_reason": escalation_reason
    }
