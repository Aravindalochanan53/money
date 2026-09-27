import uuid
from datetime import datetime, timezone, date
from sqlalchemy import Column, String, Numeric, Date, Text, DateTime, ForeignKey, CheckConstraint, Index
from sqlalchemy.orm import relationship
from app.database import Base

def utc_now():
    return datetime.now(timezone.utc)

class Scenario(Base):
    __tablename__ = "scenarios"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id = Column(String(36), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    scenario_type = Column(String(50), nullable=False)  # 'DELAY_CUSTOMER_PAYMENT', 'REDUCE_COLLECTIONS_PERCENT', 'UNPLANNED_EXPENSE', 'POSTPONE_SUPPLIER_PAYABLE', 'CUSTOM'
    status = Column(String(20), nullable=False, default="ACTIVE")  # 'ACTIVE', 'DRAFT', 'ARCHIVED'
    created_by_user_id = Column(String(36), ForeignKey("users.id", ondelete="NO ACTION"), nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    __table_args__ = (
        CheckConstraint("status IN ('ACTIVE', 'DRAFT', 'ARCHIVED')", name="chk_scenario_status"),
        Index("idx_scenarios_business", "business_id", "status"),
    )

    business = relationship("Business", back_populates="scenarios")
    user = relationship("User")
    changes = relationship("ScenarioChange", back_populates="scenario", cascade="all, delete-orphan")


class ScenarioChange(Base):
    __tablename__ = "scenario_changes"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    scenario_id = Column(String(36), ForeignKey("scenarios.id", ondelete="CASCADE"), nullable=False)
    change_type = Column(String(50), nullable=False)  # 'DELAY_RECEIVABLE', 'HAIRCUT_COLLECTIONS', 'ADD_EXPENSE', 'POSTPONE_PAYABLE', 'CUSTOM_OVERRIDE'
    target_entity_type = Column(String(50), nullable=True)  # 'customer', 'supplier', 'invoice', 'bill', 'expense', 'general'
    target_entity_id = Column(String(36), nullable=True)
    parameters_json = Column(Text, nullable=False, default="{}")
    impact_amount = Column(Numeric(15, 2), nullable=True)
    effective_date = Column(Date, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    __table_args__ = (
        Index("idx_scenario_changes_scenario", "scenario_id"),
    )

    scenario = relationship("Scenario", back_populates="changes")
