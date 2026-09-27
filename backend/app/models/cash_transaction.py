import uuid
from datetime import datetime, timezone, date
from sqlalchemy import Column, String, Numeric, Date, DateTime, ForeignKey, CheckConstraint, Index
from sqlalchemy.orm import relationship
from app.database import Base

def utc_now():
    return datetime.now(timezone.utc)

class CashTransaction(Base):
    __tablename__ = "cash_transactions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id = Column(String(36), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    transaction_date = Column(Date, nullable=False, default=date.today)
    direction = Column(String(10), nullable=False)  # 'INFLOW' or 'OUTFLOW'
    amount = Column(Numeric(15, 2), nullable=False)
    category = Column(String(50), nullable=False)  # 'INVOICE_COLLECTION', 'BILL_PAYMENT', 'RECURRING_EXPENSE', 'MANUAL_ADJUSTMENT'
    source_entity_type = Column(String(50), nullable=False)  # 'invoice', 'bill', 'expense', 'payment', 'manual'
    source_entity_id = Column(String(36), nullable=True)
    payment_id = Column(String(36), ForeignKey("payments.id", ondelete="NO ACTION"), nullable=True)
    description = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    __table_args__ = (
        CheckConstraint("amount > 0", name="chk_cash_tx_amount_pos"),
        CheckConstraint("direction IN ('INFLOW', 'OUTFLOW')", name="chk_cash_tx_direction"),
        Index("idx_cash_tx_business_date", "business_id", "transaction_date"),
        Index("idx_cash_tx_source", "business_id", "source_entity_type", "source_entity_id"),
    )

    business = relationship("Business", back_populates="cash_transactions")
    payment = relationship("PaymentRecord", back_populates="cash_transactions")
