from typing import Dict, Any, Optional
from datetime import datetime, timezone


# Mock ISP Database for instant zero-dependency testing & Circle Network live integration
MOCK_SUBSCRIBERS = {
    "CN-88214": {
        "subscriber_id": "CN-88214",
        "pppoe_username": "rashed_mirpur10",
        "full_name": "Rashedul Hasan",
        "phone": "+8801711223344",
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
        "zone": "Mirpur-10, Dhaka"
    },
    "CN-99412": {
        "subscriber_id": "CN-99412",
        "pppoe_username": "tanvir_dhanmondi",
        "full_name": "Tanvir Ahmed",
        "phone": "+8801819887766",
        "plan_name": "Circle Gamer 60 Mbps",
        "bandwidth_mbps": 60,
        "monthly_bill_bdt": 1400.0,
        "current_due_bdt": 1400.0,
        "olt_ip": "10.200.22.8",
        "pon_port": "GPON0/1:7",
        "onu_mac": "F4:8E:38:12:90:BB",
        "optical_power_dbm": -28.9,  # High optical loss!
        "connection_status": "degraded",
        "last_seen": "12 mins ago",
        "zone": "Dhanmondi 27, Dhaka"
    }
}

CIRCLE_ISP_PACKAGES = [
    {"name": "Circle Starter 20 Mbps", "speed_mbps": 20, "price_bdt": 600, "bdix": "100 Mbps BDIX", "popular": False},
    {"name": "Circle Fast 30 Mbps", "speed_mbps": 30, "price_bdt": 800, "bdix": "100 Mbps BDIX", "popular": True},
    {"name": "Circle Turbo 50 Mbps", "speed_mbps": 50, "price_bdt": 1200, "bdix": "200 Mbps BDIX", "popular": False},
    {"name": "Circle Gamer 60 Mbps", "speed_mbps": 60, "price_bdt": 1400, "bdix": "300 Mbps BDIX + Low Ping Route", "popular": True},
    {"name": "Circle Ultra 100 Mbps", "speed_mbps": 100, "price_bdt": 2000, "bdix": "500 Mbps BDIX + Public IP", "popular": False},
]


def find_subscriber(identifier: str) -> Optional[Dict[str, Any]]:
    clean = identifier.strip().lower()
    for sub in MOCK_SUBSCRIBERS.values():
        if (sub["subscriber_id"].lower() == clean or 
            sub["pppoe_username"].lower() == clean or 
            sub["phone"] == clean or 
            clean in sub["full_name"].lower()):
            return sub
    return None


def diagnose_onu_status(subscriber_id_or_pppoe: str) -> Dict[str, Any]:
    """Inspects the subscriber's optical network terminal (ONU/ONT) on Circle Network OLT."""
    sub = find_subscriber(subscriber_id_or_pppoe)
    if not sub:
        return {
            "status": "error",
            "message": f"Subscriber '{subscriber_id_or_pppoe}' not found in Circle Network subscriber registry."
        }

    power = sub["optical_power_dbm"]
    if power > -15.0:
        health = "Too Strong (needs optical attenuator)"
        recommendation = "Optical signal is unusually high. Check fiber attenuator."
    elif -25.0 <= power <= -15.0:
        health = "Optimal (Healthy green fiber signal)"
        recommendation = "Optical physical layer is completely healthy."
    elif -27.0 <= power < -25.0:
        health = "Marginal / Degraded"
        recommendation = "Fiber signal attenuation detected. Check patch cord bend or clean optical connector."
    else:
        health = "Critical (Fiber Bend / Break or High Loss)"
        recommendation = "Severe optical loss detected (below -27 dBm). Technician dispatch needed to inspect drop wire / TJ box."

    return {
        "status": "success",
        "subscriber_id": sub["subscriber_id"],
        "full_name": sub["full_name"],
        "pppoe_username": sub["pppoe_username"],
        "olt_ip": sub["olt_ip"],
        "pon_port": sub["pon_port"],
        "onu_mac": sub["onu_mac"],
        "optical_power_dbm": power,
        "optical_health": health,
        "connection_state": sub["connection_status"],
        "recommendation": recommendation
    }


def check_subscriber_billing(subscriber_id_or_pppoe: str) -> Dict[str, Any]:
    """Retrieves current ISP account balance, monthly bill, and payment instructions."""
    sub = find_subscriber(subscriber_id_or_pppoe)
    if not sub:
        return {
            "status": "error",
            "message": f"Subscriber '{subscriber_id_or_pppoe}' not found in Circle Network database."
        }

    return {
        "status": "success",
        "subscriber_id": sub["subscriber_id"],
        "full_name": sub["full_name"],
        "current_plan": sub["plan_name"],
        "monthly_bill_bdt": sub["monthly_bill_bdt"],
        "current_due_bdt": sub["current_due_bdt"],
        "payment_status": "Overdue" if sub["current_due_bdt"] > 0 else "Paid",
        "payment_methods": {
            "bkash": "bKash Merchant Pay -> 01844XXXXXX -> Reference: " + sub["subscriber_id"],
            "nagad": "Nagad Merchant Pay -> 01844XXXXXX -> Reference: " + sub["subscriber_id"],
        }
    }


def reboot_onu_session(subscriber_id_or_pppoe: str) -> Dict[str, Any]:
    """Sends soft reboot signal to the subscriber ONU from Circle Network OLT."""
    sub = find_subscriber(subscriber_id_or_pppoe)
    if not sub:
        return {
            "status": "error",
            "message": f"Cannot reboot port: Subscriber '{subscriber_id_or_pppoe}' not found."
        }

    return {
        "status": "success",
        "message": f"Reboot command dispatched to OLT {sub['olt_ip']} for ONU {sub['onu_mac']}.",
        "subscriber_id": sub["subscriber_id"],
        "expected_downtime": "45-60 seconds",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


def list_internet_plans() -> Dict[str, Any]:
    """Returns available high-speed fiber internet plans for Circle Network."""
    return {
        "status": "success",
        "currency": "BDT",
        "packages": CIRCLE_ISP_PACKAGES
    }
