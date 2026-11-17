import logging
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func
from app.core.security import get_password_hash
from app.models import (
    User,
    Agent,
    Package,
    Customer,
    Conversation,
    Message,
    Ticket,
    Payment,
    Lead,
    KnowledgeDocument,
    KnowledgeChunk,
    ToolLog,
    AIFeedback,
)
from app.services.rag.retriever import REAL_CIRCLE_KNOWLEDGE_ARTICLES, index_document

logger = logging.getLogger(__name__)


def utcnow_naive() -> datetime:
    """Return timezone-naive UTC datetime compatible with PostgreSQL TIMESTAMP WITHOUT TIME ZONE."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


REAL_PACKAGES_SEED = [
    {
        "id": "pkg-1",
        "name": "Circle Fiber 32 Mbps",
        "code": "CF-32",
        "bandwidth_mbps": 32,
        "bdix_speed_mbps": 100,
        "monthly_price_bdt": 799.0,
        "description": "আবাসিক ব্রাউজিং ও বিনোদনের জন্য সাশ্রয়ী প্যাকেজ। বাফারলেস ফেসবুক ভিডিও ও এইচডি ইউটিউব স্ট্রিমিং, ১০০ এমবিপিএস বিডিআইএক্স ক্যাশ।",
        "is_active": True,
    },
    {
        "id": "pkg-2",
        "name": "Circle Fiber 50 Mbps",
        "code": "CF-50",
        "bandwidth_mbps": 50,
        "bdix_speed_mbps": 100,
        "monthly_price_bdt": 840.0,
        "description": "ছোট ও মাঝারি পরিবারের জন্য ফ্যামিলি চয়েস। একাধিক ডিভাইসে ৪K স্ট্রিমিং, ১০০ এমবিপিএস বিডিআইএক্স ও ক্যাশ স্পিড।",
        "is_active": True,
    },
    {
        "id": "pkg-3",
        "name": "Circle Fiber 70 Mbps",
        "code": "CF-70",
        "bandwidth_mbps": 70,
        "bdix_speed_mbps": 100,
        "monthly_price_bdt": 999.0,
        "description": "সার্কেল নেটওয়ার্কের সর্বাধিক জনপ্রিয় বেস্ট সেলার হোম প্যাকেজ। সেরা গেমিং পিং, আল্ট্রা এইচডি স্ট্রিমিং ও ওয়ার্ক-ফ্রম-হোম।",
        "is_active": True,
    },
    {
        "id": "pkg-4",
        "name": "Circle Fiber 150 Mbps",
        "code": "CF-150",
        "bandwidth_mbps": 150,
        "bdix_speed_mbps": 200,
        "monthly_price_bdt": 1500.0,
        "description": "হেভি ডাউনলোডার ও কন্টেন্ট ক্রিয়েটরদের জন্য স্ট্রিম প্রো প্যাকেজ। বাফারলেস ৪K স্ট্রিমিং ও পাবলিক আইপি সাপোর্ট।",
        "is_active": True,
    },
    {
        "id": "pkg-5",
        "name": "Circle Fiber 200 Mbps",
        "code": "CF-200",
        "bandwidth_mbps": 200,
        "bdix_speed_mbps": 300,
        "monthly_price_bdt": 2500.0,
        "description": "গেমিং ইন্টারনেট ও পাওয়ার ইউজারদের জন্য আল্ট্রা-ফাস্ট প্যাকেজ। < ১৫ms লো পিং গেমিং, ফ্রি IPv6 পাবলিক আইপি ও ৩০০ Mbps বিডিআইএক্স।",
        "is_active": True,
    },
]


async def ensure_knowledge_and_packages_seeded(db: AsyncSession) -> None:
    """Ensures real Circle Network packages and knowledge articles with vector embeddings are populated."""
    # 1. Update or seed real packages
    for p_info in REAL_PACKAGES_SEED:
        p_res = await db.execute(select(Package).where(Package.id == p_info["id"]))
        pkg = p_res.scalar_one_or_none()
        if not pkg:
            # Check by code
            p_code_res = await db.execute(select(Package).where(Package.code == p_info["code"]))
            pkg = p_code_res.scalar_one_or_none()

        if pkg:
            pkg.name = p_info["name"]
            pkg.code = p_info["code"]
            pkg.bandwidth_mbps = p_info["bandwidth_mbps"]
            pkg.bdix_speed_mbps = p_info["bdix_speed_mbps"]
            pkg.monthly_price_bdt = p_info["monthly_price_bdt"]
            pkg.description = p_info["description"]
            pkg.is_active = True
        else:
            new_pkg = Package(**p_info)
            db.add(new_pkg)
    await db.commit()

    # 2. Seed real Knowledge Articles and generate semantic vector chunks
    for a_data in REAL_CIRCLE_KNOWLEDGE_ARTICLES:
        k_res = await db.execute(select(KnowledgeDocument).where(KnowledgeDocument.id == a_data["id"]))
        doc = k_res.scalar_one_or_none()
        if not doc:
            k_slug_res = await db.execute(select(KnowledgeDocument).where(KnowledgeDocument.slug == a_data["slug"]))
            doc = k_slug_res.scalar_one_or_none()

        now = utcnow_naive()
        if doc:
            doc.title = a_data["title"]
            doc.category = a_data["category"]
            doc.summary = a_data["summary"]
            doc.content = a_data["content"]
            doc.keywords = a_data["keywords"]
            doc.is_published = True
            doc.updated_at = now
        else:
            doc = KnowledgeDocument(
                id=a_data["id"],
                title=a_data["title"],
                slug=a_data["slug"],
                category=a_data["category"],
                summary=a_data["summary"],
                content=a_data["content"],
                keywords=a_data["keywords"],
                citations_count=18,
                views_count=120,
                is_published=True,
                author="Circle NOC Documentation Team",
                created_at=now,
                updated_at=now,
            )
            db.add(doc)
            await db.flush()

        # Chunk and index document only if missing embeddings or chunks
        if not doc.embedding or not doc.chunks:
            try:
                await index_document(doc, db)
            except Exception as e:
                logger.warning(f"Error vector indexing document {doc.title}: {e}")

    # 3. Ensure any existing un-indexed documents also receive embeddings and chunks
    all_docs_res = await db.execute(select(KnowledgeDocument))
    all_docs = all_docs_res.scalars().all()
    for d in all_docs:
        if not d.embedding or not d.chunks:
            try:
                await index_document(d, db)
            except Exception as e:
                logger.warning(f"Error indexing legacy doc {d.title}: {e}")

    # 4. Ensure realistic sample ToolLogs and AIFeedback exist for analytics
    await ensure_analytics_data_seeded(db)

    await db.commit()
    logger.info("Circle Network verified packages, Knowledge Base, and analytics seed synced!")


async def ensure_analytics_data_seeded(db: AsyncSession) -> None:
    """Ensure baseline tool logs and customer feedback exist in PostgreSQL for realistic analytics."""
    from datetime import timedelta
    fb_check = await db.execute(select(func.count(AIFeedback.id)))
    fb_count = fb_check.scalar() or 0

    now = utcnow_naive()

    # Find an existing conversation ID to link
    conv_res = await db.execute(select(Conversation.id).limit(3))
    conv_ids = [r[0] for r in conv_res.all()]
    if not conv_ids:
        # Create a baseline conversation if none exists
        demo_conv = Conversation(
            id="conv-demo-analytics",
            channel="webchat",
            status="resolved",
            priority="normal",
            customer_name="Rashedul Hasan",
            subscriber_id="CN-88214",
            is_ai_handled=True,
            created_at=now - timedelta(days=2),
            updated_at=now - timedelta(days=2),
        )
        db.add(demo_conv)
        await db.flush()
        conv_ids = [demo_conv.id]

    c_id = conv_ids[0]

    if fb_count < 3:
        sample_feedbacks = [
            AIFeedback(
                id="fb-seed-1",
                conversation_id=c_id,
                rating=5,
                is_resolved=True,
                feedback_text="Circle AI instantly verified my optical line power (-19.2 dBm). Very fast support!",
                customer_sentiment="positive",
                created_at=now - timedelta(hours=2),
            ),
            AIFeedback(
                id="fb-seed-2",
                conversation_id=c_id,
                rating=5,
                is_resolved=True,
                feedback_text="Clear explanation on how to pay bill via bKash. Connection unblocked in 5 mins.",
                customer_sentiment="positive",
                created_at=now - timedelta(days=1),
            ),
            AIFeedback(
                id="fb-seed-3",
                conversation_id=c_id,
                rating=4,
                is_resolved=True,
                feedback_text="Good package recommendations for 70 Mbps BDIX gaming.",
                customer_sentiment="positive",
                created_at=now - timedelta(days=3),
            ),
            AIFeedback(
                id="fb-seed-4",
                conversation_id=c_id,
                rating=5,
                is_resolved=True,
                feedback_text="Smooth human handoff to NOC engineer Mahbub. Fixed fiber issue quickly.",
                customer_sentiment="positive",
                created_at=now - timedelta(days=5),
            ),
        ]
        db.add_all(sample_feedbacks)

    tool_check = await db.execute(select(func.count(ToolLog.id)))
    tool_count = tool_check.scalar() or 0
    if tool_count < 6:
        sample_tools = [
            ToolLog(
                id="log-seed-1",
                tool_name="check_connection_status",
                conversation_id=c_id,
                subscriber_id="CN-88214",
                input_args={"subscriber_id_or_pppoe": "CN-88214"},
                output_result={"status": "online", "optical_power_dbm": -19.2, "pon_port": "EPON0/2:4"},
                gemini_model="gemini-3.5-flash-lite",
                execution_time_ms=88,
                confidence_score=0.98,
                escalated=False,
                created_at=now - timedelta(hours=3),
            ),
            ToolLog(
                id="log-seed-2",
                tool_name="get_available_packages",
                conversation_id=c_id,
                subscriber_id=None,
                input_args={},
                output_result={"count": 5, "packages": ["Circle Fiber 32 Mbps", "Circle Fiber 70 Mbps"]},
                gemini_model="gemini-3.5-flash-lite",
                execution_time_ms=64,
                confidence_score=0.99,
                escalated=False,
                created_at=now - timedelta(hours=5),
            ),
            ToolLog(
                id="log-seed-3",
                tool_name="check_customer_bill",
                conversation_id=c_id,
                subscriber_id="CN-88214",
                input_args={"subscriber_id_or_pppoe": "CN-88214"},
                output_result={"monthly_bill_bdt": 999.0, "current_due_bdt": 0.0, "status": "paid"},
                gemini_model="gemini-3.5-flash-lite",
                execution_time_ms=92,
                confidence_score=0.97,
                escalated=False,
                created_at=now - timedelta(days=1),
            ),
            ToolLog(
                id="log-seed-4",
                tool_name="check_service_coverage",
                conversation_id=c_id,
                subscriber_id=None,
                input_args={"area_or_thana": "Uttara"},
                output_result={"status": "active", "zone": "Uttara", "pop": "POP-Uttara-Sector3"},
                gemini_model="gemini-3.5-flash-lite",
                execution_time_ms=75,
                confidence_score=0.99,
                escalated=False,
                created_at=now - timedelta(days=2),
            ),
            ToolLog(
                id="log-seed-5",
                tool_name="troubleshoot_internet",
                conversation_id=c_id,
                subscriber_id="CN-99412",
                input_args={"subscriber_id_or_pppoe": "CN-99412", "issue_type": "red_los_light"},
                output_result={"status": "critical", "optical_power_dbm": -28.9, "requires_technician": True},
                gemini_model="gemini-3.5-flash-lite",
                execution_time_ms=115,
                confidence_score=0.99,
                escalated=True,
                created_at=now - timedelta(days=4),
            ),
            ToolLog(
                id="log-seed-6",
                tool_name="request_human_support",
                conversation_id=c_id,
                subscriber_id="CN-99412",
                input_args={"conversation_id": c_id, "reason": "Optical fiber signal loss below -27 dBm"},
                output_result={"status": "escalated", "assigned_desk": "Tier-1 NOC"},
                gemini_model="gemini-3.5-flash-lite",
                execution_time_ms=50,
                confidence_score=1.0,
                escalated=True,
                created_at=now - timedelta(days=4),
            ),
        ]
        db.add_all(sample_tools)


async def seed_database(db: AsyncSession) -> None:
    """Seed initial Circle Network ISP demo data if database is fresh."""
    # Always ensure real packages and knowledge articles are present
    await ensure_knowledge_and_packages_seeded(db)

    # Check if admin already exists
    admin_check = await db.execute(select(User).where(User.email == "admin@circlenetwork.com.bd"))
    if admin_check.scalar_one_or_none():
        return  # Already seeded

    logger.info("Seeding initial Circle Network ISP database records...")

    # 1. Users (Admin and Agent)
    admin_user = User(
        id="usr-admin-01",
        email="admin@circlenetwork.com.bd",
        full_name="Circle NOC Administrator",
        hashed_password=get_password_hash("Circle@2026"),
        role="admin",
        is_active=True,
    )
    agent_user = User(
        id="usr-agent-01",
        email="agent@circlenetwork.com.bd",
        full_name="Farhan Kabir",
        hashed_password=get_password_hash("Agent@2026"),
        role="agent",
        is_active=True,
    )
    db.add_all([admin_user, agent_user])
    await db.flush()

    # 2. Agents
    agents_data = [
        Agent(
            id="agt-1",
            user_id=agent_user.id,
            name="Farhan Kabir",
            role="support_officer",
            avatar="FK",
            is_online=True,
            max_active_chats=5,
            active_chats_count=2,
            resolved_today_count=18,
        ),
        Agent(
            id="agt-2",
            name="Mahbub Alam",
            role="noc_engineer",
            avatar="MA",
            is_online=True,
            max_active_chats=4,
            active_chats_count=1,
            resolved_today_count=12,
        ),
        Agent(
            id="agt-3",
            name="Nusrat Jahan",
            role="billing_specialist",
            avatar="NJ",
            is_online=True,
            max_active_chats=6,
            active_chats_count=3,
            resolved_today_count=24,
        ),
        Agent(
            id="agt-4",
            name="Tanvir Hasan",
            role="support_officer",
            avatar="TH",
            is_online=False,
            max_active_chats=5,
            active_chats_count=0,
            resolved_today_count=9,
        ),
    ]
    db.add_all(agents_data)
    await db.flush()

    # 3. Packages are seeded with real Circle Network 2026 data by ensure_knowledge_and_packages_seeded()

    # 4. Customers
    customers_data = [
        Customer(
            id="cst-1",
            subscriber_id="CN-88214",
            full_name="Rashedul Hasan",
            phone="+8801711223344",
            email="rashed.mirpur@gmail.com",
            address="House 42, Road 7, Block C, Mirpur-10, Dhaka",
            zone="Mirpur-10",
            package_id="pkg-3",
            pppoe_username="rashed_mirpur10",
            plan_name="Circle Fiber 70 Mbps",
            bandwidth_mbps=70,
            monthly_bill_bdt=999.0,
            current_due_bdt=0.0,
            olt_ip="10.200.14.2",
            pon_port="EPON0/2:4",
            onu_mac="E0:67:B3:91:AA:12",
            optical_power_dbm=-19.4,
            connection_status="online",
        ),
        Customer(
            id="cst-2",
            subscriber_id="CN-99412",
            full_name="Tanvir Ahmed",
            phone="+8801819887766",
            email="tanvir.ahmed@yahoo.com",
            address="Apartment 4B, Road 27, Dhanmondi, Dhaka",
            zone="Dhanmondi",
            package_id="pkg-5",
            pppoe_username="tanvir_dhanmondi",
            plan_name="Circle Fiber 200 Mbps",
            bandwidth_mbps=200,
            monthly_bill_bdt=2500.0,
            current_due_bdt=2500.0,
            olt_ip="10.200.22.8",
            pon_port="GPON0/1:7",
            onu_mac="F4:8E:38:12:90:BB",
            optical_power_dbm=-28.9,  # High optical loss!
            connection_status="degraded",
        ),
        Customer(
            id="cst-3",
            subscriber_id="CN-77301",
            full_name="Nazmul Huda",
            phone="+8801914556677",
            email="nazmul.huda@gmail.com",
            address="Sector 4, Road 11, Uttara, Dhaka",
            zone="Uttara",
            package_id="pkg-2",
            pppoe_username="nazmul_uttara4",
            plan_name="Circle Fiber 50 Mbps",
            bandwidth_mbps=50,
            monthly_bill_bdt=840.0,
            current_due_bdt=0.0,
            olt_ip="10.200.18.5",
            pon_port="EPON0/1:2",
            onu_mac="C8:3A:35:4F:99:E1",
            optical_power_dbm=-21.2,
            connection_status="online",
        ),
        Customer(
            id="cst-4",
            subscriber_id="CN-66104",
            full_name="Sabina Yasmin",
            phone="+8801611009988",
            email="sabina.yasmin@outlook.com",
            address="Road 11, Block D, Banani, Dhaka",
            zone="Banani",
            package_id="pkg-1",
            pppoe_username="sabina_banani",
            plan_name="Circle Fiber 32 Mbps",
            bandwidth_mbps=32,
            monthly_bill_bdt=799.0,
            current_due_bdt=799.0,
            olt_ip="10.200.30.12",
            pon_port="GPON0/3:5",
            onu_mac="BC:24:11:80:55:0A",
            optical_power_dbm=-23.5,
            connection_status="online",
        ),
        Customer(
            id="cst-5",
            subscriber_id="CN-55219",
            full_name="Arifur Rahman",
            phone="+8801715667788",
            email="arifur.rahman@gmail.com",
            address="House 8, Road 2, Block B, Mohammadpur, Dhaka",
            zone="Mohammadpur",
            package_id="pkg-4",
            pppoe_username="arif_mohammadpur",
            plan_name="Circle Fiber 150 Mbps",
            bandwidth_mbps=150,
            monthly_bill_bdt=1500.0,
            current_due_bdt=0.0,
            olt_ip="10.200.16.4",
            pon_port="EPON0/4:1",
            onu_mac="D4:6E:0E:3B:77:2C",
            optical_power_dbm=-18.7,
            connection_status="online",
        ),
    ]
    db.add_all(customers_data)
    await db.flush()

    # 5. Knowledge Documents
    kb_data = [
        KnowledgeDocument(
            id="kb-1",
            title="Troubleshooting Red LOS Light on Fiber ONU",
            slug="troubleshoot-red-los-onu",
            category="troubleshooting",
            content="""When the LOS (Loss of Signal) light on your Circle Network ONU is blinking red:
1. Do not bend or sharply pull the thin yellow fiber optic patch 
2. Check if the blue/green square SC/UPC connector is firmly inserted into the PON port until it clicks.
3. If the drop wire from the outside pole was snagged or cut by utility workers, notify Circle AI to dispatch a fiber technician immediately.
4. Optical power below -27 dBm will cause intermittent disconnection; normal signal is between -15 dBm and -24 dBm.""",
            summary="Steps to identify optical fiber signal loss when the red LOS LED is flashing on the ONU.",
            keywords=["LOS", "red light", "fiber break", "optical loss", "drop wire"],
            citations_count=184,
            views_count=520,
            is_published=True,
            author="NOC Technical Support",
        ),
        KnowledgeDocument(
            id="kb-2",
            title="Configuring PPPoE on TP-Link, D-Link, and Tenda Routers",
            slug="router-pppoe-setup-guide",
            category="router_setup",
            content="""To set up your Wi-Fi router for Circle Network:
1. Connect the LAN cable from the ONU to the WAN (blue) port of your router.
2. Open a browser and navigate to 192.168.0.1 or 192.168.1.1.
3. Set the Internet Connection Type to PPPoE.
4. Enter your Circle Network PPPoE username and password (found on your activation SMS).
5. Set the MTU size to 1492.
6. Save and reboot your router. Within 30 seconds the WAN status should show Connected.""",
            summary="Standard PPPoE configuration parameters and MTU 1492 settings for home routers.",
            keywords=["PPPoE", "router setup", "TP-Link", "Tenda", "MTU 1492", "WAN"],
            citations_count=142,
            views_count=410,
            is_published=True,
            author="NOC Field Engineer",
        ),
        KnowledgeDocument(
            id="kb-3",
            title="How to Pay Circle Network Monthly Bill via bKash",
            slug="bkash-merchant-payment-guide",
            category="billing",
            content="""Pay your monthly Circle Network broadband bill easily through bKash:
1. Open the bKash App and tap 'Pay Bill'.
2. Search for 'Circle Network' in the internet provider directory.
3. Enter your Subscriber ID (e.g., CN-88214) or PPPoE Username.
4. Review your monthly bill amount and enter your bKash PIN to confirm.
5. You will receive an instant payment confirmation SMS, and your connection status will be renewed automatically.""",
            summary="Step-by-step instructions for paying monthly ISP dues via the bKash app.",
            keywords=["bKash", "bill pay", "due payment", "merchant", "invoice"],
            citations_count=98,
            views_count=350,
            is_published=True,
            author="Billing Accounts Team",
        ),
        KnowledgeDocument(
            id="kb-4",
            title="BDIX Peering & Low Latency Gaming Routes",
            slug="bdix-peering-gaming-routes",
            category="bdix",
            content="""Circle Network is directly connected to the Bangladesh Internet Exchange (BDIX) with multi-gigabit uplinks.
- Local streaming platforms (Bioscope, Chorki, Toffee, Bongo) stream at 100 Mbps regardless of base internet package.
- Direct peering with regional gaming CDNs provides 25-35ms ping to Singapore and India servers for competitive games like Valorant and PUBG Mobile.
- Contact Circle AI or NOC if you require custom BDIX routing optimization.""",
            summary="Overview of high-speed BDIX local exchange peering and low-ping gaming routes.",
            keywords=["BDIX", "gaming", "ping", "low latency", "peering"],
            citations_count=76,
            views_count=290,
            is_published=True,
            author="Core Network Team",
        ),
    ]
    db.add_all(kb_data)
    await db.flush()

    # 6. Conversations and Messages
    conv1 = Conversation(
        id="conv-demo-mirpur",
        customer_id="cst-1",
        assigned_agent_id="agt-1",
        channel="webchat",
        status="ai_handling",
        priority="normal",
        customer_name="Rashedul Hasan",
        customer_phone="+8801711223344",
        subscriber_id="CN-88214",
        is_ai_handled=True,
        metadata_info={"zone": "Mirpur-10", "plan": "Circle Fast 30 Mbps"},
    )
    conv2 = Conversation(
        id="conv-demo-dhanmondi",
        customer_id="cst-2",
        assigned_agent_id="agt-2",
        channel="webchat",
        status="agent_handling",
        priority="urgent",
        customer_name="Tanvir Ahmed",
        customer_phone="+8801819887766",
        subscriber_id="CN-99412",
        is_ai_handled=False,
        metadata_info={"zone": "Dhanmondi", "plan": "Circle Gamer 60 Mbps", "issue": "Critical Optical Loss"},
    )
    conv3 = Conversation(
        id="conv-demo-banani",
        customer_id="cst-4",
        assigned_agent_id="agt-3",
        channel="webchat",
        status="resolved",
        priority="normal",
        customer_name="Sabina Yasmin",
        customer_phone="+8801611009988",
        subscriber_id="CN-66104",
        is_ai_handled=True,
        metadata_info={"zone": "Banani", "plan": "Circle Fast 30 Mbps", "issue": "bKash bill confirmation"},
    )
    db.add_all([conv1, conv2, conv3])
    await db.flush()

    # Messages for conv1
    msgs_conv1 = [
        Message(
            id="msg-101",
            conversation_id="conv-demo-mirpur",
            sender_type="customer",
            sender_name="Rashedul Hasan",
            content="Hello, my internet seems a bit slow today. Can you check my connection status?",
        ),
        Message(
            id="msg-102",
            conversation_id="conv-demo-mirpur",
            sender_type="ai_agent",
            sender_name="Circle AI",
            content="Hello Rashedul Hasan! I diagnosed your ONU on OLT 10.200.14.2 port EPON0/2:4. Your optical power is -19.4 dBm (Normal/Healthy) and your 30 Mbps profile is active. I sent a remote port ping to refresh your lease.",
            tool_calls={"tool": "diagnose_onu_status", "optical_power_dbm": -19.4, "status": "healthy"},
        ),
    ]

    # Messages for conv2
    msgs_conv2 = [
        Message(
            id="msg-201",
            conversation_id="conv-demo-dhanmondi",
            sender_type="customer",
            sender_name="Tanvir Ahmed",
            content="Red light flashing on my ONU box! Frequent disconnects in Dhanmondi.",
        ),
        Message(
            id="msg-202",
            conversation_id="conv-demo-dhanmondi",
            sender_type="ai_agent",
            sender_name="Circle AI",
            content="I ran an optical telemetry check and detected a critical signal drop of -28.9 dBm (Threshold: -27.0 dBm). I have automatically escalated this to our NOC engineer Mahbub Alam and generated emergency ticket TKT-2026-0819.",
            tool_calls={"tool": "diagnose_onu_status", "optical_power_dbm": -28.9, "escalated": True},
        ),
        Message(
            id="msg-203",
            conversation_id="conv-demo-dhanmondi",
            sender_type="human_agent",
            sender_name="Mahbub Alam",
            content="Hi Tanvir, NOC field team has been dispatched to Dhanmondi Road 27 junction box. Splicing drop wire now. Expected restore within 45 mins.",
        ),
    ]
    db.add_all(msgs_conv1 + msgs_conv2)
    await db.flush()

    # 7. Tickets
    tkt1 = Ticket(
        id="tkt-1",
        ticket_number="TKT-2026-0819",
        customer_id="cst-2",
        conversation_id="conv-demo-dhanmondi",
        assigned_agent_id="agt-2",
        title="Critical Optical Loss (-28.9 dBm) in Dhanmondi",
        description="ONU optical power is degraded below -27dBm on GPON0/1:7. Customer experiencing packet loss and red LOS blinking in Dhanmondi.",
        category="optical_loss",
        priority="urgent",
        status="in_progress",
        optical_loss_dbm=-28.9,
        resolution_notes="Dispatched fiber team to Road 27 TJ Box.",
    )
    tkt2 = Ticket(
        id="tkt-2",
        ticket_number="TKT-2026-0742",
        customer_id="cst-4",
        conversation_id="conv-demo-banani",
        assigned_agent_id="agt-3",
        title="bKash Payment Verification Discrepancy",
        description="Subscriber paid 800 BDT via bKash transaction BKH-99214. Ledger sync pending in billing database.",
        category="billing",
        priority="normal",
        status="resolved",
        resolution_notes="Transaction verified with bKash merchant statement and account credited.",
        resolved_at=utcnow_naive(),
    )
    db.add_all([tkt1, tkt2])
    await db.flush()

    # 8. Payments
    payments_data = [
        Payment(
            id="pmt-1",
            customer_id="cst-1",
            transaction_id="BKH-2026-88214",
            amount_bdt=800.0,
            payment_method="bkash",
            status="paid",
            billing_month="November 2026",
            phone="+8801711223344",
        ),
        Payment(
            id="pmt-2",
            customer_id="cst-3",
            transaction_id="BKH-2026-77301",
            amount_bdt=1200.0,
            payment_method="bkash",
            status="paid",
            billing_month="November 2026",
            phone="+8801914556677",
        ),
        Payment(
            id="pmt-3",
            customer_id="cst-5",
            transaction_id="NGD-2026-55219",
            amount_bdt=2000.0,
            payment_method="nagad",
            status="paid",
            billing_month="November 2026",
            phone="+8801715667788",
        ),
    ]
    db.add_all(payments_data)
    await db.flush()

    # 9. Tool Logs
    logs_data = [
        ToolLog(
            id="log-1",
            tool_name="diagnose_onu_status",
            conversation_id="conv-demo-mirpur",
            subscriber_id="CN-88214",
            input_args={"subscriber_id": "CN-88214"},
            output_result={"connection_status": "online", "optical_power_dbm": -19.4, "olt_ip": "10.200.14.2"},
            gemini_model="gemini-1.5-flash",
            execution_time_ms=124,
            confidence_score=0.98,
            escalated=False,
        ),
        ToolLog(
            id="log-2",
            tool_name="diagnose_onu_status",
            conversation_id="conv-demo-dhanmondi",
            subscriber_id="CN-99412",
            input_args={"subscriber_id": "CN-99412"},
            output_result={"connection_status": "degraded", "optical_power_dbm": -28.9, "error": "Signal below -27.0 dBm threshold"},
            gemini_model="gemini-1.5-flash",
            execution_time_ms=138,
            confidence_score=0.99,
            escalated=True,
        ),
    ]
    db.add_all(logs_data)
    await db.commit()
    logger.info("Circle Network initial demo database successfully seeded!")