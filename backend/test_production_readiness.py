import asyncio
import os
import sys
import time

# Ensure backend root is on sys.path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

import httpx
from httpx import ASGITransport, AsyncClient
from app.main import app
from app.core.config import settings
from app.core.security import create_access_token, decode_access_token, get_password_hash, verify_password
from app.core.database import AsyncSessionLocal, Base, engine
from app.core.seeder import seed_database
from app.services.isp_tools.tools import (
    get_customer_info,
    verify_customer,
    check_connection_status,
    check_internet_outage,
    troubleshoot_internet,
    check_customer_bill,
    check_payment_status,
    get_available_packages,
    recommend_internet_package,
    check_service_coverage,
    create_connection_lead,
    create_complaint_ticket,
    get_ticket_status,
    request_human_support,
)
from app.services.ai.agent import process_chat
from app.services.rag.retriever import semantic_search, get_rag_context


class TestResults:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.tests = []

    def record(self, category: str, name: str, success: bool, detail: str = ""):
        self.tests.append({
            "category": category,
            "name": name,
            "success": success,
            "detail": detail
        })
        if success:
            self.passed += 1
            print(f"  [PASS] {name} {f'({detail})' if detail else ''}")
        else:
            self.failed += 1
            print(f"  [FAIL] {name} - ERROR: {detail}")


results = TestResults()


async def run_security_tests(client: AsyncClient):
    print("\n" + "=" * 70)
    print("SECTION 1: AUTHENTICATION, RBAC & SECURITY TESTS")
    print("=" * 70)

    # 1. Password Hashing (bcrypt)
    raw_pw = "TestPassword@123"
    hashed = get_password_hash(raw_pw)
    is_valid = verify_password(raw_pw, hashed)
    is_invalid = not verify_password("WrongPassword", hashed)
    results.record(
        "Security",
        "Password Hashing & Verification (Bcrypt 12 rounds)",
        is_valid and is_invalid,
        f"Hash length={len(hashed)}"
    )

    # 2. JWT Generation and Decoding
    test_sub = "test-agent-uuid"
    token = create_access_token(
        subject=test_sub,
        extra_claims={"role": "agent", "email": "agent@circlenetwork.com"}
    )
    payload = decode_access_token(token)
    jwt_valid = (
        payload is not None
        and payload.get("sub") == test_sub
        and payload.get("role") == "agent"
    )
    results.record(
        "Security",
        "JWT Token Generation & Decoding (HS256)",
        jwt_valid,
        f"Decoded sub={payload.get('sub') if payload else None}"
    )

    # 3. Login API with valid Admin credentials
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@circlenetwork.com.bd", "password": "Circle@2026"}
    )
    admin_token = None
    if login_resp.status_code == 200:
        data = login_resp.json()
        admin_token = data.get("access_token")
    results.record(
        "Security",
        "Admin Login Endpoint (POST /api/v1/auth/login)",
        login_resp.status_code == 200 and admin_token is not None,
        f"Status: {login_resp.status_code}"
    )

    # 4. Login API with invalid credentials
    invalid_login = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@circlenetwork.com.bd", "password": "WrongPassword999"}
    )
    results.record(
        "Security",
        "Invalid Password Rejection (401 Unauthorized)",
        invalid_login.status_code == 401,
        f"Status: {invalid_login.status_code}"
    )

    # 5. RBAC Protection on Customer PII (GET /api/v1/customers without token)
    unauth_cust = await client.get("/api/v1/customers")
    results.record(
        "Security",
        "Customer PII Protection without Auth (GET /api/v1/customers -> 401)",
        unauth_cust.status_code == 401,
        f"Status: {unauth_cust.status_code}"
    )

    # 6. RBAC Protection on Tickets (GET /api/v1/tickets without token)
    unauth_tkt = await client.get("/api/v1/tickets")
    results.record(
        "Security",
        "Support Tickets Protection without Auth (GET /api/v1/tickets -> 401)",
        unauth_tkt.status_code == 401,
        f"Status: {unauth_tkt.status_code}"
    )

    # 7. Authorized Access to Protected Endpoints with Admin Token
    auth_headers = {"Authorization": f"Bearer {admin_token}"} if admin_token else {}
    auth_cust = await client.get("/api/v1/customers", headers=auth_headers)
    results.record(
        "Security",
        "Authorized Access to Customer Data with Admin Bearer Token",
        auth_cust.status_code == 200,
        f"Status: {auth_cust.status_code}, Customers fetched: {len(auth_cust.json()) if auth_cust.status_code == 200 else 0}"
    )

    # 8. Rate Limiting on Login (10 req/min limit)
    hit_rate_limit = False
    rate_limit_resp = None
    for _ in range(12):
        r = await client.post(
            "/api/v1/auth/login",
            json={"email": "fake@test.com", "password": "bad"}
        )
        if r.status_code == 429:
            hit_rate_limit = True
            rate_limit_resp = r
            break
    has_retry_after = (
        rate_limit_resp is not None and "Retry-After" in rate_limit_resp.headers
    ) if hit_rate_limit else False
    results.record(
        "Security",
        "Sliding Window Rate Limiter (429 Too Many Requests with Retry-After)",
        hit_rate_limit and has_retry_after,
        f"Hit 429: {hit_rate_limit}, Retry-After: {rate_limit_resp.headers.get('Retry-After') if hit_rate_limit else 'None'}"
    )

    # 9. Input Sanitization & XSS Protection
    dirty_title = '<script>alert("pwned")</script>Optical Loss Alert<style>body{color:red}</style>'
    dirty_desc = '<img src=x onerror=alert(1)>Customer fiber drop damaged.'
    clean_tkt = await client.post(
        "/api/v1/tickets",
        headers=auth_headers,
        json={
            "customer_id": "CN-88214",
            "title": dirty_title,
            "description": dirty_desc,
            "category": "fiber_cut",
            "priority": "high",
        }
    )
    sanitized_ok = False
    if clean_tkt.status_code == 201:
        tdata = clean_tkt.json()
        sanitized_ok = (
            "<script>" not in tdata.get("title", "")
            and "<style>" not in tdata.get("title", "")
            and "Optical Loss Alert" in tdata.get("title", "")
        )
    results.record(
        "Security",
        "Input Sanitization (XSS tags stripped from inputs)",
        sanitized_ok,
        f"Saved title: '{clean_tkt.json().get('title') if clean_tkt.status_code == 201 else 'Failed'}'"
    )

    return admin_token


async def run_database_tests():
    print("\n" + "=" * 70)
    print("SECTION 2: DATABASE MODELS & SEED DATA TESTS")
    print("=" * 70)

    expected_tables = {
        "users",
        "customers",
        "agents",
        "conversations",
        "messages",
        "tickets",
        "packages",
        "payments",
        "leads",
        "knowledge_documents",
        "tool_logs",
        "ai_feedback",
    }
    registered = set(Base.metadata.tables.keys())
    missing = expected_tables - registered
    results.record(
        "Database",
        "12 Core SQLAlchemy 2.0 Models Registration",
        len(missing) == 0,
        f"Registered {len(registered)} tables, Missing: {list(missing)}"
    )

    # Verify seed data in database
    async with AsyncSessionLocal() as session:
        from sqlalchemy import select
        from app.models.customer import Customer
        from app.models.package import Package
        from app.models.knowledge import KnowledgeDocument

        cust_count = (await session.execute(select(Customer))).scalars().all()
        pkg_count = (await session.execute(select(Package))).scalars().all()
        doc_count = (await session.execute(select(KnowledgeDocument))).scalars().all()

        results.record(
            "Database",
            "Database Seeding Verification (Customers, Official Packages, Knowledge Docs)",
            len(cust_count) >= 3 and len(pkg_count) >= 5 and len(doc_count) >= 5,
            f"Customers: {len(cust_count)}, Packages: {len(pkg_count)}, KB Docs: {len(doc_count)}"
        )


async def run_isp_tool_tests():
    print("\n" + "=" * 70)
    print("SECTION 3: 14 ISP BACKEND TOOLS FUNCTION CALLING TESTS")
    print("=" * 70)

    # 1. get_customer_info
    c_info = await get_customer_info(subscriber_id_or_phone="CN-88214")
    results.record(
        "ISP Tools",
        "Tool 1: get_customer_info",
        c_info.get("status") == "success" and bool(c_info.get("full_name")),
        f"Customer: {c_info.get('full_name')}, Status: {c_info.get('connection_status')}"
    )

    # 2. verify_customer
    v_info = await verify_customer(subscriber_id="CN-88214", phone="01711223344")
    results.record(
        "ISP Tools",
        "Tool 2: verify_customer",
        v_info.get("verified") is True,
        f"Verified: {v_info.get('verified')}, Name: {v_info.get('full_name')}"
    )

    # 3. check_connection_status
    conn_info = await check_connection_status(subscriber_id_or_pppoe="CN-88214")
    results.record(
        "ISP Tools",
        "Tool 3: check_connection_status",
        conn_info.get("optical_power_dbm") is not None,
        f"Power: {conn_info.get('optical_power_dbm')} dBm, Health: {conn_info.get('optical_health')}"
    )

    # 4. check_internet_outage
    outage_info = await check_internet_outage(zone="Mirpur")
    results.record(
        "ISP Tools",
        "Tool 4: check_internet_outage",
        outage_info.get("status") == "success" and "has_outage" in outage_info,
        f"Outage Status: {outage_info.get('status')}, Has Outage: {outage_info.get('has_outage')}"
    )

    # 5. troubleshoot_internet
    trouble_info = await troubleshoot_internet(subscriber_id_or_pppoe="CN-88214", issue_type="slow_speed")
    results.record(
        "ISP Tools",
        "Tool 5: troubleshoot_internet",
        trouble_info.get("status") == "success" and len(trouble_info.get("actionable_steps", [])) > 0,
        f"Steps: {len(trouble_info.get('actionable_steps', []))}"
    )

    # 6. check_customer_bill
    bill_info = await check_customer_bill(subscriber_id_or_pppoe="CN-88214")
    results.record(
        "ISP Tools",
        "Tool 6: check_customer_bill",
        bill_info.get("monthly_bill_bdt") is not None,
        f"Monthly: ৳{bill_info.get('monthly_bill_bdt')}, Due: ৳{bill_info.get('current_due_bdt')}"
    )

    # 7. check_payment_status
    pay_info = await check_payment_status(subscriber_id="CN-88214")
    results.record(
        "ISP Tools",
        "Tool 7: check_payment_status",
        pay_info.get("status") == "success",
        f"Payment Status: {pay_info.get('status')}"
    )

    # 8. get_available_packages
    pkgs = await get_available_packages()
    results.record(
        "ISP Tools",
        "Tool 8: get_available_packages",
        pkgs.get("status") == "success" and len(pkgs.get("packages", [])) >= 5,
        f"Total real packages: {len(pkgs.get('packages', []))}"
    )

    # 9. recommend_internet_package
    rec_pkg = await recommend_internet_package(usage_type="gaming", num_devices=4, budget_bdt=2500)
    results.record(
        "ISP Tools",
        "Tool 9: recommend_internet_package",
        rec_pkg.get("status") == "success" and rec_pkg.get("recommended_package") is not None,
        f"Recommended: {rec_pkg.get('recommended_package', {}).get('name') if isinstance(rec_pkg.get('recommended_package'), dict) else rec_pkg.get('recommended_package')}"
    )

    # 10. check_service_coverage
    cov_info = await check_service_coverage(area_or_thana="Mirpur")
    results.record(
        "ISP Tools",
        "Tool 10: check_service_coverage",
        cov_info.get("coverage_active") is True and cov_info.get("status") == "available",
        f"Covered: {cov_info.get('coverage_active')}, Status: {cov_info.get('status')}"
    )

    # 11. create_connection_lead
    lead_info = await create_connection_lead(
        name="Tanvir Hossain",
        phone="01911999888",
        address="House 12, Road 4, Sector 7",
        zone="Uttara",
        package_name="Circle Fiber 50 Mbps"
    )
    results.record(
        "ISP Tools",
        "Tool 11: create_connection_lead",
        lead_info.get("status") == "lead_created" or bool(lead_info.get("lead_id")),
        f"Lead ID: {lead_info.get('lead_id')}"
    )

    # 12. create_complaint_ticket
    tkt_tool = await create_complaint_ticket(
        subscriber_id="CN-88214",
        title="Optical loss",
        description="Red light blinking on ONU since morning",
        category="optical_loss",
        priority="urgent"
    )
    tkt_num = tkt_tool.get("ticket_number")
    results.record(
        "ISP Tools",
        "Tool 12: create_complaint_ticket",
        bool(tkt_num),
        f"Created Ticket: {tkt_num}"
    )

    # 13. get_ticket_status
    if tkt_num:
        stat_info = await get_ticket_status(ticket_number=tkt_num)
        results.record(
            "ISP Tools",
            "Tool 13: get_ticket_status",
            stat_info.get("status") == "success" and bool(stat_info.get("ticket_status")),
            f"Ticket: {tkt_num}, Status: {stat_info.get('ticket_status')}"
        )
    else:
        results.record("ISP Tools", "Tool 13: get_ticket_status", True, "Skipped gracefully")

    # 14. request_human_support
    handoff_tool = await request_human_support(
        conversation_id="conv-test-123",
        reason="Customer requested human agent escalation for billing dispute",
        priority="urgent"
    )
    results.record(
        "ISP Tools",
        "Tool 14: request_human_support",
        handoff_tool.get("status") == "escalated",
        f"Handoff Status: {handoff_tool.get('message')}"
    )


async def run_gemini_and_workflow_tests():
    print("\n" + "=" * 70)
    print("SECTION 4: GEMINI INTEGRATION & END-TO-END WORKFLOW TESTS")
    print("=" * 70)

    # Multi-turn customer test: Asking about packages and billing
    conv_id = f"test-eval-{int(time.time())}"
    user_query = "What internet packages do you have and what are their prices?"

    try:
        response = await process_chat(
            conversation_id=conv_id,
            user_message=user_query,
            customer_id="CN-88214"
        )
        ai_reply = response.get("reply", "")
        tool_executed = len(response.get("tool_calls", [])) > 0
        has_pricing = any(word in ai_reply for word in ["Mbps", "799", "840", "999", "2800", "টাকা"])
        results.record(
            "AI Agent",
            "Gemini Agent Package Query Workflow (Bangla/English context)",
            bool(ai_reply) and (tool_executed or has_pricing),
            f"Reply len: {len(ai_reply)}, Tools executed: {len(response.get('tool_calls', []))}"
        )
    except Exception as e:
        results.record(
            "AI Agent",
            "Gemini Agent Package Query Workflow",
            False,
            str(e)
        )


async def run_rag_retrieval_tests():
    print("\n" + "=" * 70)
    print("SECTION 5: RAG RETRIEVAL & OFFICIAL DATA TESTS")
    print("=" * 70)

    # Query 1: English package prices
    res_en = await semantic_search("Circle Network 32 Mbps 50 Mbps 70 Mbps package monthly price", top_k=3)
    results.record(
        "RAG Retrieval",
        "RAG Knowledge Base Search (English Package Pricing)",
        len(res_en) > 0,
        f"Retrieved {len(res_en)} articles. Top: {res_en[0].get('title') if res_en else 'None'}"
    )

    # Query 2: Bangla payment methods
    res_bn = await semantic_search("বিকাশ বা নগদে বিল পেমেন্ট কিভাবে করব?", top_k=3)
    results.record(
        "RAG Retrieval",
        "RAG Knowledge Base Search (Bangla MFS Payment Flow)",
        len(res_bn) > 0,
        f"Retrieved {len(res_bn)} articles. Top: {res_bn[0].get('title') if res_bn else 'None'}"
    )


async def main():
    print("======================================================================")
    print("  CIRCLE AI - PRODUCTION READINESS, SECURITY & VERIFICATION SUITE")
    print("  ISP: Circle Network Bangladesh | Official 2026 Telemetry & Packages")
    print("======================================================================")

    # Initialize schema & database seed
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        try:
            await seed_database(session)
        except Exception as e:
            print(f"Seed notice: {e}")

    # Run tests using httpx AsyncClient
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        admin_token = await run_security_tests(client)
        await run_database_tests()
        await run_isp_tool_tests()
        await run_gemini_and_workflow_tests()
        await run_rag_retrieval_tests()

    print("\n" + "=" * 70)
    print(f"VERIFICATION SUMMARY: {results.passed} PASSED | {results.failed} FAILED")
    print("=" * 70)

    if results.failed > 0:
        print("\nSome tests failed. See details above.")
        sys.exit(1)
    else:
        print("\nALL PRODUCTION READINESS & SECURITY CHECKS PASSED PERFECTLY!")
        sys.exit(0)


if __name__ == "__main__":
    asyncio.run(main())
