import uuid
import time
import re
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone, timedelta
from app.core.config import settings

# -----------------------------------------------------------------------------
# Official Circle Network Grounded Data (Dhaka, Bangladesh)
# -----------------------------------------------------------------------------

OFFICIAL_PACKAGES = [
    {
        "name": "Circle Starter 20 Mbps",
        "speed_mbps": 20,
        "price_bdt": 600,
        "bdix_speed_mbps": 100,
        "description": "Ideal for 1-3 devices, light browsing, and HD streaming.",
        "popular": False
    },
    {
        "name": "Circle Fast 30 Mbps",
        "speed_mbps": 30,
        "price_bdt": 800,
        "bdix_speed_mbps": 100,
        "description": "Most popular home plan. Perfect for 4-6 devices, video calls, and buffer-free YouTube/Netflix.",
        "popular": True
    },
    {
        "name": "Circle Turbo 50 Mbps",
        "speed_mbps": 50,
        "price_bdt": 1200,
        "bdix_speed_mbps": 200,
        "description": "High-bandwidth connection for heavy remote work, multi-screen 4K streaming, and fast downloads.",
        "popular": False
    },
    {
        "name": "Circle Gamer 60 Mbps",
        "speed_mbps": 60,
        "price_bdt": 1400,
        "bdix_speed_mbps": 300,
        "description": "Low-ping gaming routes (Valorant, CS:GO, PUBG), optimized DNS, and 300 Mbps BDIX cache peering.",
        "popular": True
    },
    {
        "name": "Circle Ultra 100 Mbps",
        "speed_mbps": 100,
        "price_bdt": 2000,
        "bdix_speed_mbps": 500,
        "description": "Ultra gigabit fiber experience with Free Dedicated Real Public IP, ideal for creators and homelabs.",
        "popular": False
    }
]

COVERED_ZONES = {
    "mirpur": {"status": "active", "hub": "POP-Mirpur-Core-1", "eta_hours": 24},
    "dhanmondi": {"status": "active", "hub": "POP-Dhanmondi-Core-2", "eta_hours": 24},
    "gulshan": {"status": "active", "hub": "POP-Gulshan-Central", "eta_hours": 24},
    "banani": {"status": "active", "hub": "POP-Banani-North", "eta_hours": 24},
    "uttara": {"status": "active", "hub": "POP-Uttara-Sector3", "eta_hours": 24},
    "mohammadpur": {"status": "active", "hub": "POP-Mohammadpur-RingRoad", "eta_hours": 24},
    "bashundhara": {"status": "active", "hub": "POP-Bashundhara-BlockC", "eta_hours": 24},
    "badda": {"status": "active", "hub": "POP-Badda-LinkRoad", "eta_hours": 24},
    "baridhara": {"status": "active", "hub": "POP-Baridhara-DOHS", "eta_hours": 24},
    "mohakhali": {"status": "active", "hub": "POP-Mohakhali-Wireless", "eta_hours": 24},
    "farmgate": {"status": "active", "hub": "POP-Farmgate-Tejgaon", "eta_hours": 24},
    "tejgaon": {"status": "active", "hub": "POP-Farmgate-Tejgaon", "eta_hours": 24},
    "shahbagh": {"status": "active", "hub": "POP-Shahbagh-Central", "eta_hours": 24},
    "motijheel": {"status": "active", "hub": "POP-Motijheel-Commercial", "eta_hours": 24},
    "lalmatia": {"status": "active", "hub": "POP-Mohammadpur-RingRoad", "eta_hours": 24},
    "khilgaon": {"status": "active", "hub": "POP-Khilgaon-Taltola", "eta_hours": 24},
    "malibagh": {"status": "active", "hub": "POP-Malibagh-ChowdhuryPara", "eta_hours": 24},
    "rampura": {"status": "active", "hub": "POP-Badda-LinkRoad", "eta_hours": 24},
}

EXPANSION_ZONES = ["savar", "gazipur", "narayanganj", "keraniganj", "tongi"]

# Ground truth subscribers (mirrors database seeded subscribers for instant verified access)
SUBSCRIBER_REGISTRY = {
    "CN-88214": {
        "subscriber_id": "CN-88214",
        "pppoe_username": "rashed_mirpur10",
        "full_name": "Rashedul Hasan",
        "phone": "+8801711223344",
        "email": "rashedul@gmail.com",
        "address": "House 14, Road 5, Block C, Mirpur-10, Dhaka",
        "zone": "Mirpur-10, Dhaka",
        "plan_name": "Circle Fast 30 Mbps",
        "bandwidth_mbps": 30,
        "monthly_bill_bdt": 800.0,
        "current_due_bdt": 0.0,
        "olt_ip": "10.200.14.2",
        "pon_port": "EPON0/2:4",
        "onu_mac": "E0:67:B3:91:AA:12",
        "optical_power_dbm": -19.4,
        "connection_status": "online",
        "last_seen": "Just now",
    },
    "CN-99412": {
        "subscriber_id": "CN-99412",
        "pppoe_username": "tanvir_dhanmondi",
        "full_name": "Tanvir Ahmed",
        "phone": "+8801819887766",
        "email": "tanvir.ahmed@yahoo.com",
        "address": "Flat 4B, House 28, Road 27, Dhanmondi, Dhaka",
        "zone": "Dhanmondi, Dhaka",
        "plan_name": "Circle Gamer 60 Mbps",
        "bandwidth_mbps": 60,
        "monthly_bill_bdt": 1400.0,
        "current_due_bdt": 1400.0,
        "olt_ip": "10.200.22.8",
        "pon_port": "GPON0/1:7",
        "onu_mac": "F4:8E:38:12:90:BB",
        "optical_power_dbm": -28.9,  # Critical optical loss!
        "connection_status": "degraded",
        "last_seen": "12 mins ago",
    },
    "CN-10291": {
        "subscriber_id": "CN-10291",
        "pppoe_username": "farhan_gulshan",
        "full_name": "Farhan Kabir",
        "phone": "+8801912345678",
        "email": "farhan.k@techcorp.bd",
        "address": "Apt 7A, Road 45, Gulshan-2, Dhaka",
        "zone": "Gulshan-2, Dhaka",
        "plan_name": "Circle Ultra 100 Mbps",
        "bandwidth_mbps": 100,
        "monthly_bill_bdt": 2000.0,
        "current_due_bdt": 0.0,
        "olt_ip": "10.200.8.1",
        "pon_port": "GPON0/4:2",
        "onu_mac": "A4:2B:B0:81:CD:45",
        "optical_power_dbm": -18.2,
        "connection_status": "online",
        "last_seen": "Just now",
    },
    "CN-55219": {
        "subscriber_id": "CN-55219",
        "pppoe_username": "arif_mohammadpur",
        "full_name": "Arif Hossain",
        "phone": "+8801671122334",
        "email": "arif.hossain@gmail.com",
        "address": "Block F, Japan Garden City, Mohammadpur, Dhaka",
        "zone": "Mohammadpur, Dhaka",
        "plan_name": "Circle Turbo 50 Mbps",
        "bandwidth_mbps": 50,
        "monthly_bill_bdt": 1200.0,
        "current_due_bdt": 0.0,
        "olt_ip": "10.200.16.4",
        "pon_port": "EPON0/4:1",
        "onu_mac": "D4:6E:0E:3B:77:2C",
        "optical_power_dbm": -21.3,
        "connection_status": "online",
        "last_seen": "Just now",
    },
    "CN-33418": {
        "subscriber_id": "CN-33418",
        "pppoe_username": "nusrat_uttara",
        "full_name": "Nusrat Jahan",
        "phone": "+8801552233445",
        "email": "nusrat.j@gmail.com",
        "address": "Sector 7, Road 11, Uttara, Dhaka",
        "zone": "Uttara, Dhaka",
        "plan_name": "Circle Fast 30 Mbps",
        "bandwidth_mbps": 30,
        "monthly_bill_bdt": 800.0,
        "current_due_bdt": 800.0,
        "olt_ip": "10.200.30.5",
        "pon_port": "GPON0/2:3",
        "onu_mac": "C8:3A:35:1F:EE:90",
        "optical_power_dbm": -26.1,  # Marginal
        "connection_status": "online",
        "last_seen": "5 mins ago",
    }
}

# Registered sample tickets & leads
TICKETS_REGISTRY: Dict[str, Dict[str, Any]] = {
    "TKT-2026-0042": {
        "ticket_number": "TKT-2026-0042",
        "subscriber_id": "CN-99412",
        "title": "Severe Optical Loss & Red LOS on Dhanmondi Drop Cable",
        "category": "optical_loss",
        "priority": "urgent",
        "status": "in_progress",
        "assigned_agent": "NOC Field Engineer Kamrul",
        "sla_deadline": (datetime.now(timezone.utc) + timedelta(hours=2)).strftime("%Y-%m-%d %H:%M UTC"),
        "resolution_notes": "Technician dispatched with fusion splicer to repair bent drop cable."
    }
}

LEADS_REGISTRY: Dict[str, Dict[str, Any]] = {}


def _lookup_sub(identifier: str) -> Optional[Dict[str, Any]]:
    """Helper to find subscriber by ID, username, phone or partial name."""
    clean = identifier.strip().lower()
    for sub in SUBSCRIBER_REGISTRY.values():
        if (
            sub["subscriber_id"].lower() == clean
            or sub["pppoe_username"].lower() == clean
            or sub["phone"].replace("+", "").replace("-", "") in clean.replace("+", "").replace("-", "")
            or clean in sub["phone"].replace("+", "").replace("-", "")
            or clean in sub["full_name"].lower()
        ):
            return sub
    return None


# =============================================================================
# 1. CUSTOMER TOOLS
# =============================================================================

def get_customer_info(subscriber_id_or_phone: str) -> Dict[str, Any]:
    """
    Look up basic subscriber profile.
    For privacy/security, returns public profile only (masks phone and address).
    Full access requires customer identity verification.
    """
    sub = _lookup_sub(subscriber_id_or_phone)
    if not sub:
        return {
            "status": "not_found",
            "message": f"No subscriber record found for '{subscriber_id_or_phone}'. Please check your Subscriber ID (e.g. CN-88214) or registered phone number."
        }

    phone = sub["phone"]
    masked_phone = f"{phone[:6]}****{phone[-4:]}" if len(phone) >= 10 else "****"

    return {
        "status": "success",
        "subscriber_id": sub["subscriber_id"],
        "full_name": sub["full_name"],
        "zone": sub["zone"],
        "plan_name": sub["plan_name"],
        "bandwidth_mbps": sub["bandwidth_mbps"],
        "connection_status": sub["connection_status"],
        "masked_phone": masked_phone,
        "is_verified": False,
        "note": "Sensitive billing details and exact street address require calling verify_customer."
    }


def verify_customer(subscriber_id: str, phone: str) -> Dict[str, Any]:
    """
    Verifies subscriber identity by matching Subscriber ID and registered contact phone number.
    Required before disclosing private account credentials, tickets, or making account changes.
    """
    sub = _lookup_sub(subscriber_id)
    if not sub:
        return {
            "verified": False,
            "status": "not_found",
            "message": f"Subscriber ID '{subscriber_id}' not found in Circle Network registry."
        }

    clean_input_phone = re.sub(r"[^\d]", "", phone)
    clean_sub_phone = re.sub(r"[^\d]", "", sub["phone"])

    # Match last 4-6 digits or full phone
    is_match = (
        clean_input_phone == clean_sub_phone
        or clean_input_phone.endswith(clean_sub_phone[-6:])
        or clean_sub_phone.endswith(clean_input_phone[-6:])
    )

    if is_match:
        return {
            "verified": True,
            "status": "verified",
            "subscriber_id": sub["subscriber_id"],
            "full_name": sub["full_name"],
            "phone": sub["phone"],
            "address": sub["address"],
            "zone": sub["zone"],
            "plan_name": sub["plan_name"],
            "message": f"Identity successfully verified for {sub['full_name']} ({sub['subscriber_id']})."
        }
    else:
        return {
            "verified": False,
            "status": "verification_failed",
            "message": f"The phone number provided does not match our records for subscriber {subscriber_id}. Please provide your registered mobile number."
        }


# =============================================================================
# 2. ISP SUPPORT TOOLS
# =============================================================================

def check_connection_status(subscriber_id_or_pppoe: str) -> Dict[str, Any]:
    """
    Checks real-time fiber optical connection health, OLT port, and ONU power levels.
    """
    sub = _lookup_sub(subscriber_id_or_pppoe)
    if not sub:
        return {
            "status": "not_found",
            "message": f"Subscriber '{subscriber_id_or_pppoe}' not found. Please provide your Subscriber ID (e.g. CN-88214)."
        }

    power = sub["optical_power_dbm"]
    if power > -15.0:
        health = "High Signal (Attenuator needed)"
        recommendation = "Optical signal power is unusually intense. An optical attenuator should be installed."
    elif -25.0 <= power <= -15.0:
        health = "Optimal (Healthy green fiber signal)"
        recommendation = "Optical link is completely healthy with zero loss. PPPoE line is fully operational."
    elif -27.0 <= power < -25.0:
        health = "Marginal (Signal Attenuation Detected)"
        recommendation = "Signal is borderline. Check yellow fiber patch cord for tight bends or dust on optical connector."
    else:
        health = "Critical (Severe Optical Loss / Fiber Break)"
        recommendation = "Signal is below -27 dBm. Drop wire physical damage or street distribution box issue detected. Requires technician dispatch."

    return {
        "status": "success",
        "subscriber_id": sub["subscriber_id"],
        "full_name": sub["full_name"],
        "optical_power_dbm": power,
        "optical_health": health,
        "connection_state": sub["connection_status"],
        "olt_ip": sub["olt_ip"],
        "pon_port": sub["pon_port"],
        "onu_mac": sub["onu_mac"],
        "recommendation": recommendation,
        "requires_technician": (power < -27.0 or sub["connection_status"] == "degraded")
    }


def check_internet_outage(zone: str) -> Dict[str, Any]:
    """
    Checks if there is a known area-wide fiber cut, scheduled maintenance, or power outage in a specific zone.
    """
    clean_zone = zone.strip().lower()
    matched_zone = None
    for z in COVERED_ZONES:
        if z in clean_zone or clean_zone in z:
            matched_zone = z
            break

    if not matched_zone:
        return {
            "status": "success",
            "zone": zone,
            "has_outage": False,
            "message": f"No widespread network incident reported in {zone}. Backbone links are operating normally."
        }

    zone_info = COVERED_ZONES[matched_zone]
    return {
        "status": "success",
        "zone": matched_zone.capitalize(),
        "has_outage": False,
        "primary_hub": zone_info["hub"],
        "uptime": "99.98%",
        "message": f"Circle Network primary optical backbone in {matched_zone.capitalize()} ({zone_info['hub']}) is 100% operational with no reported outages."
    }


def troubleshoot_internet(subscriber_id_or_pppoe: str, issue_type: str) -> Dict[str, Any]:
    """
    Performs comprehensive diagnostic workflow based on issue type:
    'slow_speed', 'red_los_light', 'frequent_disconnects', 'high_ping', 'no_internet'.
    """
    sub = _lookup_sub(subscriber_id_or_pppoe)
    if not sub:
        return {
            "status": "not_found",
            "message": f"Subscriber '{subscriber_id_or_pppoe}' not found. Please provide your Subscriber ID (e.g. CN-88214)."
        }

    power = sub["optical_power_dbm"]
    issue_lower = issue_type.lower()
    steps: List[str] = []
    can_reboot = True
    escalate = False

    if "red" in issue_lower or "los" in issue_lower or power < -27.0:
        escalate = True
        steps = [
            "1. Inspect the yellow fiber patch cord connecting to the blue port on your ONU (modem).",
            "2. Ensure the cable is not bent at a sharp 90-degree angle or trapped under furniture.",
            "3. Do not unplug the optical cable unnecessarily as it carries invisible laser light.",
            "4. Because optical power is critical, our NOC has flagged this for a priority field technician dispatch."
        ]
        diagnosis = f"Physical fiber signal loss ({power} dBm) detected on port {sub['pon_port']}."
    elif "slow" in issue_lower or "speed" in issue_lower:
        steps = [
            "1. Power off both your optical terminal (ONU) and Wi-Fi router for 45 seconds, then power on.",
            "2. Connect your computer directly to the router LAN port with an Ethernet cable to rule out Wi-Fi interference.",
            "3. Verify router MTU is set to 1492 for Circle Network PPPoE.",
            "4. Configure fast DNS on your router: Primary 1.1.1.1, Secondary 8.8.8.8.",
            "5. Run a speed test to Circle Network BDIX speed test server."
        ]
        diagnosis = f"Fiber signal is healthy ({power} dBm). Issue is likely local Wi-Fi congestion or router session latency."
    else:
        steps = [
            "1. Check if the PON and LAN indicator lights on your ONU are solid green.",
            "2. Restart your Wi-Fi router to re-negotiate PPPoE credentials.",
            "3. If connection does not restore, ask Circle AI to dispatch an OLT port soft reboot."
        ]
        diagnosis = f"General connection check completed. Current status: {sub['connection_status']} ({power} dBm)."

    return {
        "status": "success",
        "subscriber_id": sub["subscriber_id"],
        "full_name": sub["full_name"],
        "issue_type": issue_type,
        "diagnosis": diagnosis,
        "optical_power_dbm": power,
        "actionable_steps": steps,
        "can_dispatch_soft_reboot": can_reboot,
        "recommend_human_escalation": escalate
    }


def check_customer_bill(subscriber_id_or_pppoe: str) -> Dict[str, Any]:
    """
    Retrieves subscriber's billing status, monthly plan fee, due amounts, and bKash payment details.
    """
    sub = _lookup_sub(subscriber_id_or_pppoe)
    if not sub:
        return {
            "status": "not_found",
            "message": f"Subscriber '{subscriber_id_or_pppoe}' not found in Circle Network database."
        }

    due = sub["current_due_bdt"]
    status_label = "Overdue" if due > 0 else "Paid (Up to date)"

    return {
        "status": "success",
        "subscriber_id": sub["subscriber_id"],
        "full_name": sub["full_name"],
        "current_plan": sub["plan_name"],
        "monthly_bill_bdt": sub["monthly_bill_bdt"],
        "current_due_bdt": due,
        "payment_status": status_label,
        "billing_cycle": "1st to 30th of current month",
        "payment_methods": {
            "bkash": f"bKash App -> Make Payment -> Merchant Number: {settings.ISP_BKASH_MERCHANT_NO} -> Reference: {sub['subscriber_id']}",
            "nagad": f"Nagad App -> Merchant Pay -> Merchant Number: {settings.ISP_BKASH_MERCHANT_NO} -> Reference: {sub['subscriber_id']}"
        },
        "auto_renewal_eta": "Connection automatically re-activates within 3 minutes of payment."
    }


def check_payment_status(subscriber_id: str, transaction_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Checks recent payment transactions (bKash/Nagad) and verification status for a subscriber.
    """
    sub = _lookup_sub(subscriber_id)
    if not sub:
        return {
            "status": "not_found",
            "message": f"Subscriber '{subscriber_id}' not found."
        }

    due = sub["current_due_bdt"]
    has_recent = (due == 0.0)

    trx = transaction_id or f"BKH-{str(uuid.uuid4())[:8].upper()}"
    return {
        "status": "success",
        "subscriber_id": sub["subscriber_id"],
        "full_name": sub["full_name"],
        "last_payment": {
            "transaction_id": trx if has_recent else "No recent payment in current billing cycle",
            "amount_bdt": sub["monthly_bill_bdt"] if has_recent else 0.0,
            "payment_method": "bKash Merchant Pay",
            "status": "Reconciled & Active" if has_recent else "Pending Payment",
            "date": "November 2026",
            "message": "Account is fully active with zero outstanding dues." if has_recent else f"Outstanding due of ৳{due:.2f} BDT is awaiting payment."
        }
    }


# =============================================================================
# 3. SALES & PACKAGE TOOLS
# =============================================================================

def get_available_packages() -> Dict[str, Any]:
    """
    Returns official Circle Network fiber broadband packages, speeds (Mbps), and BDT pricing.
    """
    return {
        "status": "success",
        "currency": "BDT",
        "packages": OFFICIAL_PACKAGES
    }


def recommend_internet_package(usage_type: str, num_devices: int, budget_bdt: Optional[float] = None) -> Dict[str, Any]:
    """
    Recommends the ideal Circle Network internet package based on customer usage profile, device count, and budget.
    """
    usage = usage_type.lower()
    
    if "game" in usage or "gaming" in usage or "ping" in usage:
        rec = next(p for p in OFFICIAL_PACKAGES if "Gamer" in p["name"])
        reason = "Engineered with dedicated low-latency gaming routing, optimized DNS, and 300 Mbps BDIX cache peering."
    elif num_devices >= 8 or "4k" in usage or "creator" in usage or "heavy" in usage:
        rec = next(p for p in OFFICIAL_PACKAGES if "Ultra" in p["name"])
        reason = "Delivers 100 Mbps symmetrical fiber with Free Dedicated Real Public IP for smooth multi-screen 4K streaming."
    elif num_devices >= 4 or (budget_bdt and budget_bdt >= 1200):
        rec = next(p for p in OFFICIAL_PACKAGES if "Turbo" in p["name"])
        reason = "Generous 50 Mbps bandwidth accommodates video meetings, downloads, and multiple simultaneous users."
    elif budget_bdt and budget_bdt < 800:
        rec = next(p for p in OFFICIAL_PACKAGES if "Starter" in p["name"])
        reason = "Budget-friendly 20 Mbps fiber connection for light browsing and streaming."
    else:
        rec = next(p for p in OFFICIAL_PACKAGES if "Fast" in p["name"])
        reason = "Our most popular package (30 Mbps for ৳800/mo) offers the best balance of speed, stability, and value for typical households."

    return {
        "status": "success",
        "recommended_package": rec,
        "reasoning": reason,
        "input_profile": {
            "usage_type": usage_type,
            "num_devices": num_devices,
            "budget_bdt": budget_bdt
        }
    }


def check_service_coverage(area_or_thana: str) -> Dict[str, Any]:
    """
    Checks if Circle Network fiber-optic internet is available in a given area or thana in Dhaka.
    """
    clean_area = area_or_thana.strip().lower()
    matched_key = None
    for z in COVERED_ZONES:
        if z in clean_area or clean_area in z:
            matched_key = z
            break

    if matched_key:
        info = COVERED_ZONES[matched_key]
        return {
            "status": "available",
            "coverage_active": True,
            "area": area_or_thana,
            "distribution_hub": info["hub"],
            "installation_eta": f"Within {info['eta_hours']} hours",
            "message": f"Great news! Circle Network 100% fiber-optic service is fully available in {area_or_thana} via {info['hub']}."
        }

    # Check expansion areas
    for exp in EXPANSION_ZONES:
        if exp in clean_area or clean_area in exp:
            return {
                "status": "expansion",
                "coverage_active": False,
                "area": area_or_thana,
                "message": f"Circle Network fiber rollout in {area_or_thana} is currently under expansion. We can take your contact details to notify you when service activates."
            }

    return {
        "status": "survey_required",
        "coverage_active": False,
        "area": area_or_thana,
        "message": f"Coverage in {area_or_thana} requires a quick physical distance survey from our nearest POP. Our sales engineering team can verify drop wire feasibility."
    }


def create_connection_lead(name: str, phone: str, address: str, zone: str, package_name: Optional[str] = "Circle Fast 30 Mbps") -> Dict[str, Any]:
    """
    Creates a new prospective customer lead for a new Circle Network fiber internet connection.
    """
    lead_id = f"LEAD-2026-{str(uuid.uuid4())[:6].upper()}"
    lead_record = {
        "lead_id": lead_id,
        "name": name,
        "phone": phone,
        "address": address,
        "zone": zone,
        "package_name": package_name or "Circle Fast 30 Mbps",
        "status": "new",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    LEADS_REGISTRY[lead_id] = lead_record

    return {
        "status": "created",
        "lead_id": lead_id,
        "customer_name": name,
        "contact_phone": phone,
        "zone": zone,
        "selected_package": package_name,
        "message": f"New connection inquiry registered with ID {lead_id}. A Circle Network field sales officer will call you within 24 hours to schedule the physical fiber survey and installation."
    }


# =============================================================================
# 4. COMPLAINT & TICKET TOOLS
# =============================================================================

def create_complaint_ticket(subscriber_id: str, title: str, description: str, category: str = "optical_loss", priority: str = "urgent") -> Dict[str, Any]:
    """
    Creates an official complaint/support ticket for Circle Network NOC & Field Engineering.
    Categories: 'optical_loss', 'fiber_break', 'slow_speed', 'billing', 'router_config'.
    """
    sub = _lookup_sub(subscriber_id)
    ticket_num = f"TKT-2026-{str(uuid.uuid4())[:4].upper()}"
    sla_hours = 4 if priority == "urgent" else 24
    deadline = (datetime.now(timezone.utc) + timedelta(hours=sla_hours)).strftime("%Y-%m-%d %H:%M UTC")

    sub_name = sub["full_name"] if sub else "Subscriber"
    olt_info = f"OLT {sub['olt_ip']} Port {sub['pon_port']}" if sub else "OLT Gateway"

    ticket_record = {
        "ticket_number": ticket_num,
        "subscriber_id": subscriber_id,
        "customer_name": sub_name,
        "title": title,
        "description": description,
        "category": category,
        "priority": priority,
        "status": "open",
        "sla_deadline": deadline,
        "hardware_location": olt_info,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    TICKETS_REGISTRY[ticket_num] = ticket_record

    return {
        "status": "ticket_created",
        "ticket_number": ticket_num,
        "subscriber_id": subscriber_id,
        "customer_name": sub_name,
        "title": title,
        "priority": priority,
        "sla_target": f"Resolution targeted within {sla_hours} hours ({deadline})",
        "message": f"Complaint ticket {ticket_num} has been officially registered and assigned to Circle Network Tier-1 NOC Desk."
    }


def get_ticket_status(ticket_number: str) -> Dict[str, Any]:
    """
    Checks the real-time status, assigned engineer, and resolution notes for an existing support ticket.
    """
    clean_num = ticket_number.strip().upper()
    ticket = TICKETS_REGISTRY.get(clean_num)

    # Search by partial ticket number if not exact match
    if not ticket:
        for t in TICKETS_REGISTRY.values():
            if clean_num in t["ticket_number"] or t["ticket_number"] in clean_num:
                ticket = t
                break

    if not ticket:
        return {
            "status": "not_found",
            "message": f"Ticket '{ticket_number}' not found in Circle Network NOC ticketing registry."
        }

    return {
        "status": "success",
        "ticket_number": ticket["ticket_number"],
        "subscriber_id": ticket["subscriber_id"],
        "title": ticket["title"],
        "ticket_status": ticket["status"],
        "priority": ticket.get("priority", "urgent"),
        "assigned_agent": ticket.get("assigned_agent", "NOC Shift Engineer"),
        "sla_deadline": ticket.get("sla_deadline"),
        "resolution_notes": ticket.get("resolution_notes", "Under active diagnosis by NOC engineers.")
    }


# =============================================================================
# 5. HUMAN SUPPORT HANDOVER TOOLS
# =============================================================================

def request_human_support(conversation_id: str, reason: str, priority: str = "urgent") -> Dict[str, Any]:
    """
    Immediately escalates a conversation to a human Circle Network NOC support officer.
    """
    return {
        "status": "escalated",
        "conversation_id": conversation_id,
        "escalation_reason": reason,
        "priority": priority,
        "estimated_wait_time": "1-3 minutes",
        "message": "Conversation successfully transferred to Circle Network Tier-1 NOC Desk. A human support officer is joining."
    }


# =============================================================================
# Master Tool Registry & Declarations for Gemini Function Calling
# =============================================================================

TOOL_FUNCTIONS_MAP = {
    # Customer tools
    "get_customer_info": get_customer_info,
    "verify_customer": verify_customer,
    # ISP support tools
    "check_connection_status": check_connection_status,
    "check_internet_outage": check_internet_outage,
    "troubleshoot_internet": troubleshoot_internet,
    "check_customer_bill": check_customer_bill,
    "check_payment_status": check_payment_status,
    # Sales tools
    "get_available_packages": get_available_packages,
    "recommend_internet_package": recommend_internet_package,
    "check_service_coverage": check_service_coverage,
    "create_connection_lead": create_connection_lead,
    # Complaint tools
    "create_complaint_ticket": create_complaint_ticket,
    "get_ticket_status": get_ticket_status,
    # Human support tools
    "request_human_support": request_human_support,
}

ALL_AGENT_TOOLS = list(TOOL_FUNCTIONS_MAP.values())
