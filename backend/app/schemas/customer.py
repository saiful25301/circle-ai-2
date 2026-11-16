from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class CustomerBase(BaseModel):
    subscriber_id: str
    full_name: str
    phone: str
    email: Optional[str] = None
    address: Optional[str] = None
    zone: Optional[str] = None
    pppoe_username: str
    plan_name: str = "Circle Fast 30 Mbps"
    bandwidth_mbps: int = 30
    monthly_bill_bdt: float = 800.0
    current_due_bdt: float = 0.0


class CustomerCreate(CustomerBase):
    pass


class CustomerResponse(CustomerBase):
    id: str
    olt_ip: str
    pon_port: str
    onu_mac: str
    optical_power_dbm: float
    connection_status: str
    last_online_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class CustomerDiagnosisResponse(BaseModel):
    subscriber_id: str
    full_name: str
    pppoe_username: str
    connection_status: str
    optical_power_dbm: float
    optical_health: str  # optimal, fair, critical, loss_of_signal
    olt_ip: str
    pon_port: str
    onu_mac: str
    bandwidth_mbps: int
    current_due_bdt: float
    recommendation: str
