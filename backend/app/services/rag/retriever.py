from typing import List, Dict, Any, Optional

DEFAULT_KNOWLEDGE_BASE = [
    {
        "id": "kb-1",
        "title": "Red LOS (Loss of Signal) Light on ONU",
        "category": "troubleshooting",
        "keywords": ["red light", "los", "no internet", "fiber", "onu", "blinking red", "optical"],
        "content": (
            "If the LOS light on your Circle Network ONU is blinking red, it indicates that the ONU is not receiving "
            "an optical light signal from our OLT distribution box. Steps: 1) Verify that the blue/green fiber patch cord "
            "clicked firmly into the ONU optical port. 2) Check if the thin yellow fiber cable has sharp bends or tight pinches. "
            "Do NOT bend it tighter than a drink can radius. 3) If the cable is straight and firmly connected, there may be "
            "a physical fiber cut on the street drop wire. Request technician dispatch or call Circle Network helpline 09611800800."
        )
    },
    {
        "id": "kb-2",
        "title": "Configuring PPPoE on Wi-Fi Router (TP-Link, D-Link, Tenda, Netgear)",
        "category": "router_setup",
        "keywords": ["pppoe", "router", "setup", "password", "tp-link", "tenda", "configuration", "wan"],
        "content": (
            "To configure your Wi-Fi router for Circle Network: 1) Connect an Ethernet cable from the ONU LAN port to the "
            "WAN port (usually blue/yellow) of your Wi-Fi router. 2) Open a browser and go to your router IP (192.168.0.1 or "
            "192.168.1.1). 3) In Quick Setup or WAN Settings, select Connection Type as 'PPPoE'. 4) Enter your Circle Network "
            "PPPoE Username and Password provided in your welcome SMS. 5) Set MTU to 1492. 6) Save and reboot the router."
        )
    },
    {
        "id": "kb-3",
        "title": "Paying Monthly Internet Bill via bKash & Nagad",
        "category": "billing",
        "keywords": ["bkash", "nagad", "bill", "payment", "bdt", "due", "recharge", "invoice"],
        "content": (
            "Circle Network bill payment instructions: 1) Open bKash App -> Select 'Make Payment' -> Enter Merchant No "
            "01844XXXXXX. 2) Enter your monthly amount in BDT. 3) In the Reference field, enter your Subscriber ID (e.g., CN-88214). "
            "4) Confirm PIN. Your account and bandwidth will be renewed automatically within 3 minutes of payment receipt."
        )
    },
    {
        "id": "kb-4",
        "title": "BDIX & Gaming Latency Optimization (DNS Settings)",
        "category": "performance",
        "keywords": ["bdix", "ping", "gaming", "dns", "slow", "fps", "packet loss", "latency", "pubg", "valorant"],
        "content": (
            "Circle Network offers direct multi-gigabit peering with BDIX, Dhaka IX, Google GGC, and Cloudflare CDN. "
            "To get the lowest gaming ping: 1) In your router or Windows network adapter, configure Primary DNS to 1.1.1.1 "
            "and Secondary DNS to 8.8.8.8. 2) Connect gaming PCs via Cat6 LAN cable rather than 2.4GHz Wi-Fi to eliminate "
            "jitter and packet drops. 3) Circle Network Gamer packages come with prioritized routing for Valorant, CS2, and PUBG."
        )
    },
    {
        "id": "kb-5",
        "title": "Circle Network Package Upgrades & Fair Usage Policy",
        "category": "packages",
        "keywords": ["upgrade", "package", "plan", "price", "speed", "mbps", "unlimited"],
        "content": (
            "Circle Network offers 100% true unlimited fiber broadband with no FUP speed drops: "
            "- Circle Starter: 20 Mbps @ 600 BDT/month "
            "- Circle Fast: 30 Mbps @ 800 BDT/month (Most Popular) "
            "- Circle Turbo: 50 Mbps @ 1200 BDT/month "
            "- Circle Gamer: 60 Mbps + Low Latency Routing @ 1400 BDT/month "
            "- Circle Ultra: 100 Mbps + Free Real IP @ 2000 BDT/month. "
            "Plan upgrades take effect on the 1st of the next billing cycle or immediately upon settling prorated difference."
        )
    }
]


def search_knowledge_base(query: str, top_k: int = 3) -> List[Dict[str, Any]]:
    """Hybrid keyword/semantic search over ISP knowledge base."""
    terms = [t.lower() for t in query.split() if len(t) > 2]
    scored = []

    for item in DEFAULT_KNOWLEDGE_BASE:
        score = 0
        text_lower = (item["title"] + " " + item["content"]).lower()
        for term in terms:
            if term in item["title"].lower():
                score += 5
            elif any(term in k.lower() for k in item["keywords"]):
                score += 3
            elif term in text_lower:
                score += 1
        if score > 0:
            scored.append((score, item))

    scored.sort(key=lambda x: x[0], reverse=True)
    if not scored:
        return DEFAULT_KNOWLEDGE_BASE[:top_k]
    return [item for _, item in scored[:top_k]]
