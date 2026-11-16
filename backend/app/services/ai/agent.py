import json
import logging
from typing import Dict, Any, List, Optional
from app.core.config import settings
from app.services.isp_tools.tools import (
    diagnose_onu_status,
    check_subscriber_billing,
    reboot_onu_session,
    list_internet_plans,
    find_subscriber
)
from app.services.rag.retriever import search_knowledge_base

logger = logging.getLogger(__name__)

SYSTEM_INSTRUCTION = """
You are Circle AI, the intelligent, warm, and highly capable virtual support engineer for Circle Network, a leading fiber-optic ISP in Bangladesh.
Your persona is inspired by Intercom Fin: empathetic, ultra-precise, concise, and proactive.

Key Guidelines:
1. Always be polite, friendly, and speak clear English (or Bengali if the user speaks in Bangla/Banglish).
2. For network issues (slow speed, loss of signal, red LOS light on ONU, disconnects), proactively use the `diagnose_onu_status` tool with the subscriber's ID or username.
3. For billing or invoice questions, use `check_subscriber_billing` tool to check dues and provide bKash payment instructions.
4. For router setup or DNS queries, cite knowledge base guidance (MTU 1492, Primary DNS 1.1.1.1, Secondary DNS 8.8.8.8).
5. If optical power is critical (< -27 dBm) or there is a physical fiber cut, recommend immediate human agent dispatch or technician visit.
6. When answering, reference Circle Network hotline (09611800800) when appropriate.
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
    """Executes a declared ISP tool and returns structured result."""
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


async def process_chat(
    conversation_id: str,
    user_message: str,
    customer_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Core AI Agent reasoning pipeline:
    1. Retrieve relevant RAG context from ISP knowledge base.
    2. Check if Gemini API key is available. If yes, query Gemini with function calling.
    3. If no API key or in offline dev mode, use intelligent ISP reasoning engine with tool calls.
    """
    rag_articles = search_knowledge_base(user_message, top_k=2)
    rag_sources = [a["title"] for a in rag_articles]
    rag_context = "\n\n".join([f"KB Article: {a['title']}\n{a['content']}" for a in rag_articles])

    executed_tool_calls: List[Dict[str, Any]] = []
    should_escalate = False
    escalation_reason = None

    # Identify if a customer is bound or mentioned in message
    subscriber_ident = customer_id or "CN-88214"
    for candidate in ["CN-88214", "CN-99412", "rashed_mirpur10", "tanvir_dhanmondi"]:
        if candidate.lower() in user_message.lower():
            subscriber_ident = candidate
            break

    # 1. Try Gemini API if key is configured
    if settings.GEMINI_API_KEY and settings.GEMINI_API_KEY.strip() != "":
        try:
            from google import genai
            from google.genai import types

            client = genai.Client(api_key=settings.GEMINI_API_KEY)
            
            # Formulate prompt with RAG context
            combined_prompt = f"Knowledge Base Context:\n{rag_context}\n\nUser Question: {user_message}"
            
            response = client.models.generate_content(
                model=settings.GEMINI_MODEL,
                contents=combined_prompt,
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_INSTRUCTION,
                    temperature=0.3
                )
            )

            reply_text = response.text or "I have processed your request."
            return {
                "conversation_id": conversation_id,
                "reply": reply_text,
                "tool_calls": executed_tool_calls,
                "rag_sources": rag_sources,
                "should_escalate": should_escalate,
                "escalation_reason": escalation_reason
            }
        except Exception as e:
            logger.warning(f"Gemini API call failed, falling back to ISP rule engine: {e}")

    # 2. Intelligent ISP Reasoning & Tool Calling Engine (Zero-dependency & fallback)
    msg = user_message.lower()

    if any(k in msg for k in ["signal", "optical", "power", "los", "red light", "fiber", "diagnos", "status", "slow", "down"]):
        tool_result = execute_tool("diagnose_onu_status", {"subscriber_id_or_pppoe": subscriber_ident})
        executed_tool_calls.append({
            "tool_name": "diagnose_onu_status",
            "arguments": {"subscriber_id_or_pppoe": subscriber_ident},
            "result": tool_result
        })

        if tool_result.get("status") == "success":
            power = tool_result.get("optical_power_dbm")
            health = tool_result.get("optical_health")
            if power and power < -27.0:
                should_escalate = True
                escalation_reason = f"Critical optical power ({power} dBm) detected on port {tool_result.get('pon_port')}"
                reply = (
                    f"⚠️ **Optical Signal Alert for {tool_result.get('full_name')} ({subscriber_ident})**:\n\n"
                    f"- **ONU Optical Power:** `{power} dBm` ({health})\n"
                    f"- **OLT Port:** `{tool_result.get('pon_port')}` | **Status:** `{tool_result.get('connection_state')}`\n"
                    f"- **Analysis:** Your fiber optical reception is below the operational threshold (-27 dBm). "
                    f"This usually points to a bend in the yellow fiber patch cord or a street drop wire break.\n\n"
                    f"I have automatically marked this conversation for priority escalation to our NOC team for physical inspection."
                )
            else:
                reply = (
                    f"✅ **Circle Network Fiber Diagnostics for {tool_result.get('full_name')} ({subscriber_ident})**:\n\n"
                    f"- **Optical Signal:** `{power} dBm` ({health})\n"
                    f"- **OLT IP:** `{tool_result.get('olt_ip')}` | **Port:** `{tool_result.get('pon_port')}`\n"
                    f"- **Connection State:** `{tool_result.get('connection_state')}`\n\n"
                    f"{tool_result.get('recommendation')}\n\n"
                    f"Would you like me to dispatch a soft reboot signal to your ONU port to refresh the PPPoE session?"
                )
        else:
            reply = f"I could not locate an active subscriber with ID '{subscriber_ident}'. Could you please provide your Circle Network Subscriber ID (e.g. CN-88214) or registered phone number?"

    elif any(k in msg for k in ["bill", "due", "payment", "bkash", "nagad", "pay", "charge", "invoice"]):
        tool_result = execute_tool("check_subscriber_billing", {"subscriber_id_or_pppoe": subscriber_ident})
        executed_tool_calls.append({
            "tool_name": "check_subscriber_billing",
            "arguments": {"subscriber_id_or_pppoe": subscriber_ident},
            "result": tool_result
        })

        if tool_result.get("status") == "success":
            due = tool_result.get("current_due_bdt")
            reply = (
                f"💳 **Billing Details for {tool_result.get('full_name')} ({subscriber_ident})**:\n\n"
                f"- **Plan:** {tool_result.get('current_plan')}\n"
                f"- **Monthly Fee:** ৳{tool_result.get('monthly_bill_bdt'):.2f} BDT\n"
                f"- **Current Outstanding Due:** **৳{due:.2f} BDT** ({tool_result.get('payment_status')})\n\n"
                f"**How to pay via bKash:**\n"
                f"1. Open bKash App -> **Make Payment**\n"
                f"2. Merchant Number: `{settings.ISP_BKASH_MERCHANT_NO}`\n"
                f"3. Reference: `{subscriber_ident}`\n\n"
                f"Your connection renews automatically within 3 minutes of payment!"
            )
        else:
            reply = "Could you please provide your Circle Network Subscriber ID or PPPoE username to look up your billing statement?"

    elif any(k in msg for k in ["reboot", "restart", "reset"]):
        tool_result = execute_tool("reboot_onu_session", {"subscriber_id_or_pppoe": subscriber_ident})
        executed_tool_calls.append({
            "tool_name": "reboot_onu_session",
            "arguments": {"subscriber_id_or_pppoe": subscriber_ident},
            "result": tool_result
        })
        reply = (
            f"🔄 **Port Refresh Dispatched**\n\n"
            f"I have sent an OLT re-registration command for subscriber `{subscriber_ident}`. "
            f"Your optical terminal will re-sync in approximately 45 seconds. Please keep your ONU powered on."
        )

    elif any(k in msg for k in ["package", "plan", "upgrade", "speed", "price", "offer", "mbps"]):
        tool_result = execute_tool("list_internet_plans", {})
        executed_tool_calls.append({
            "tool_name": "list_internet_plans",
            "arguments": {},
            "result": tool_result
        })
        packages_md = "\n".join([
            f"- **{p['name']}**: ৳{p['price_bdt']}/mo ({p['speed_mbps']} Mbps) — *{p['bdix']}*" + (" 🔥 *Most Popular*" if p.get("popular") else "")
            for p in tool_result.get("packages", [])
        ])
        reply = (
            f"🚀 **Circle Network Fiber Internet Packages**:\n\n"
            f"{packages_md}\n\n"
            f"All packages include 100% unlimited data with zero FUP speed throttling and BDIX peering. "
            f"Would you like to upgrade your existing plan?"
        )

    elif any(k in msg for k in ["human", "agent", "support officer", "escalate", "talk to human", "representative"]):
        should_escalate = True
        escalation_reason = "Customer requested human support officer assistance"
        reply = (
            "I am transferring this conversation to our dedicated Circle Network Tier-1 Support Desk right away. "
            "A human support engineer is reviewing your diagnostic details and will join this conversation shortly."
        )

    else:
        # Fallback incorporating RAG Knowledge articles
        top_article = rag_articles[0] if rag_articles else None
        kb_text = f"\n\n*Reference: {top_article['title']}*\n{top_article['content']}" if top_article else ""
        reply = (
            f"Hello! I am Circle AI, your virtual assistant for Circle Network.\n\n"
            f"I can help you with:\n"
            f"• 📡 **Diagnosing fiber optical signal & ONU status**\n"
            f"• 💳 **Checking bills & bKash payment instructions**\n"
            f"• 🔄 **Rebooting your connection port from our OLT**\n"
            f"• 🚀 **Exploring package upgrades (20 Mbps - 100 Mbps)**\n"
            f"• 🛠️ **Wi-Fi router configuration & gaming DNS optimization**"
            f"{kb_text}\n\n"
            f"How can I assist your connection today?"
        )

    return {
        "conversation_id": conversation_id,
        "reply": reply,
        "tool_calls": executed_tool_calls,
        "rag_sources": rag_sources,
        "should_escalate": should_escalate,
        "escalation_reason": escalation_reason
    }
