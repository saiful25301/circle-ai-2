from datetime import datetime, timezone
import uuid
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime
from app.core.database import Base


class Customer(Base):
    """Circle Network ISP Subscriber Profile."""
    __tablename__ = "customers"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    subscriber_id = Column(String(50), unique=True, index=True, nullable=False)  # e.g., CN-88214
    full_name = Column(String(255), nullable=False)
    phone = Column(String(50), index=True, nullable=False)
    email = Column(String(255), nullable=True)
    address = Column(String(500), nullable=True)  # e.g. Mirpur-10, Dhaka
    zone = Column(String(100), nullable=True)     # e.g. Zone-DHK-North

    # ISP Network & PPPoE specs
    pppoe_username = Column(String(100), unique=True, index=True, nullable=False)
    plan_name = Column(String(100), default="Circle Fast 30 Mbps")
    bandwidth_mbps = Column(Integer, default=30)
    monthly_bill_bdt = Column(Float, default=800.0)
    current_due_bdt = Column(Float, default=0.0)

    # Hardware & Optical fiber telemetry
    olt_ip = Column(String(50), default="10.200.14.2")
    pon_port = Column(String(50), default="EPON0/2:4")
    onu_mac = Column(String(50), default="E0:67:B3:91:AA:12")
    optical_power_dbm = Column(Float, default=-19.5)  # Healthy: -15 to -24 dBm; Critical: < -27 dBm
    connection_status = Column(String(50), default="online")  # online, offline, degraded
    last_online_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
