import uuid
from datetime import datetime
from sqlalchemy import Column, String, Numeric, Date, Text, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.orm import relationship
from app.database import Base

class AffordabilityQuery(Base):
    __tablename__ = "affordability_queries"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id = Column(String(36), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    purchase_title = Column(String(255), nullable=False)
    amount = Column(Numeric(15, 2), nullable=False)
    planned_date = Column(Date, nullable=False)
    baseline_min_cash = Column(Numeric(15, 2), nullable=False)
    simulated_min_cash = Column(Numeric(15, 2), nullable=False)
    verdict = Column(String(30), nullable=False)
    recommended_date = Column(Date, nullable=True)
    explanation = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        CheckConstraint("amount > 0", name="chk_affordability_amount_pos"),
        CheckConstraint("verdict IN ('AFFORDABLE', 'RISKY', 'UNSAFE')", name="chk_affordability_verdict"),
    )

    business = relationship("Business", back_populates="affordability_queries")
