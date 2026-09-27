import uuid
from datetime import datetime
from decimal import Decimal
from sqlalchemy import Column, String, Numeric, Date, DateTime, ForeignKey, UniqueConstraint, CheckConstraint, Index
from sqlalchemy.orm import relationship
from app.database import Base

class PayableBill(Base):
    __tablename__ = "payable_bills"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id = Column(String(36), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    supplier_id = Column(String(36), ForeignKey("suppliers.id", ondelete="NO ACTION"), nullable=False)
    bill_number = Column(String(100), nullable=False)
    bill_date = Column(Date, nullable=False)
    due_date = Column(Date, nullable=False)
    category = Column(String(50), nullable=False, default="RAW_MATERIAL")
    original_amount = Column(Numeric(15, 2), nullable=False)
    paid_amount = Column(Numeric(15, 2), nullable=False, default=Decimal("0.00"))
    outstanding_balance = Column(Numeric(15, 2), nullable=False)
    payment_status = Column(String(20), nullable=False, default="UNPAID")
    scheduled_payment_date = Column(Date, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("business_id", "bill_number", name="uq_business_bill_number"),
        CheckConstraint("original_amount > 0", name="chk_bill_orig_amount_pos"),
        CheckConstraint("paid_amount >= 0", name="chk_bill_paid_amount_nonneg"),
        CheckConstraint("outstanding_balance >= 0", name="chk_bill_balance_nonneg"),
        CheckConstraint("payment_status IN ('UNPAID', 'PARTIALLY_PAID', 'PAID', 'CANCELLED')", name="chk_bill_status"),
        Index("idx_bill_scheduled_date", "business_id", "scheduled_payment_date"),
        Index("idx_bill_status", "business_id", "payment_status"),
    )

    business = relationship("Business", back_populates="payables")
    supplier = relationship("Supplier", back_populates="bills")
    payments = relationship("PaymentRecord", back_populates="bill")

