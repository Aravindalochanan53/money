from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime

class RiskAlertOut(BaseModel):
    id: str
    business_id: str
    severity: str
    alert_type: str
    title: str
    description: str
    related_entity_type: Optional[str] = None
    related_entity_id: Optional[str] = None
    status: str
    detected_at: datetime
    resolved_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class RiskAlertUpdate(BaseModel):
    status: str  # 'OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED'

class CustomerRiskOut(BaseModel):
    customer_id: str
    customer_name: str
    risk_tier: str
    risk_score: float
    total_ar: Optional[float] = 0.0
    total_outstanding: Optional[float] = 0.0
    overdue_amount: float = 0.0
    avg_delay_days: float = 0.0
    concentration_pct: float = 0.0
    explanation: Optional[str] = None
    open_invoices_count: Optional[int] = 0

class ReceivableRiskSummary(BaseModel):
    anchor_date: str
    total_receivables: float
    total_overdue_amount: float
    customer_count: int
    low_risk_count: int
    medium_risk_count: int
    high_risk_count: int
    customers: List[CustomerRiskOut]
    alerts: List[RiskAlertOut] = []
