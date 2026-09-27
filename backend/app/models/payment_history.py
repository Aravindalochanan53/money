import uuid
from datetime import datetime
from sqlalchemy import Column, String, Numeric, Integer, Date, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.orm import relationship
from app.database import Base

class HistoricalPayment(Base):
    __tablename__ = "historical_payments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id = Column(String(36), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    customer_id = Column(String(36), ForeignKey("customers.id", ondelete="NO ACTION"), nullable=False)
    invoice_number = Column(String(100), nullable=False)
    due_date = Column(Date, nullable=False)
    settled_date = Column(Date, nullable=False)
    amount_settled = Column(Numeric(15, 2), nullable=False)
    delay_days = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        CheckConstraint("amount_settled > 0", name="chk_hist_amount_pos"),
    )

    business = relationship("Business", back_populates="historical_payments")
    customer = relationship("Customer", back_populates="historical_payments")
