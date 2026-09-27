import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, CheckConstraint, Index
from sqlalchemy.orm import relationship
from app.database import Base

def utc_now():
    return datetime.now(timezone.utc)

class RiskAlert(Base):
    __tablename__ = "risk_alerts"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id = Column(String(36), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    severity = Column(String(20), nullable=False)  # 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'
    alert_type = Column(String(50), nullable=False)  # 'OVERDUE_INVOICE', 'BUFFER_BREACH_PROJECTED', 'HIGH_RISK_CUSTOMER', 'UNPAID_BILL', 'CASH_DEFICIT'
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    related_entity_type = Column(String(50), nullable=True)  # 'invoice', 'customer', 'bill', 'timeline'
    related_entity_id = Column(String(36), nullable=True)
    status = Column(String(20), nullable=False, default="OPEN")  # 'OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED'
    detected_at = Column(DateTime, default=utc_now, nullable=False)
    resolved_at = Column(DateTime, nullable=True)

    __table_args__ = (
        CheckConstraint("severity IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')", name="chk_risk_alert_severity"),
        CheckConstraint("status IN ('OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED')", name="chk_risk_alert_status"),
        Index("idx_risk_alert_business_status", "business_id", "status"),
        Index("idx_risk_alert_entity", "business_id", "related_entity_type", "related_entity_id"),
    )

    business = relationship("Business", back_populates="risk_alerts")
