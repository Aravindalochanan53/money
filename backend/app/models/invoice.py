import uuid
from datetime import datetime
from decimal import Decimal
from sqlalchemy import Column, String, Numeric, Date, DateTime, ForeignKey, UniqueConstraint, CheckConstraint, Index
from sqlalchemy.orm import relationship
from app.database import Base

class ReceivableInvoice(Base):
    __tablename__ = "receivable_invoices"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id = Column(String(36), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    customer_id = Column(String(36), ForeignKey("customers.id", ondelete="RESTRICT"), nullable=False)
    invoice_number = Column(String(100), nullable=False)
    invoice_date = Column(Date, nullable=False)
    due_date = Column(Date, nullable=False)
    original_amount = Column(Numeric(15, 2), nullable=False)
    paid_amount = Column(Numeric(15, 2), nullable=False, default=Decimal("0.00"))
    outstanding_balance = Column(Numeric(15, 2), nullable=False)
    payment_status = Column(String(20), nullable=False, default="UNPAID")
    expected_payment_date = Column(Date, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("business_id", "invoice_number", name="uq_business_invoice_number"),
        CheckConstraint("original_amount > 0", name="chk_invoice_orig_amount_pos"),
        CheckConstraint("paid_amount >= 0", name="chk_invoice_paid_amount_nonneg"),
        CheckConstraint("outstanding_balance >= 0", name="chk_invoice_balance_nonneg"),
        CheckConstraint("payment_status IN ('UNPAID', 'PARTIALLY_PAID', 'PAID', 'CANCELLED')", name="chk_invoice_status"),
        Index("idx_invoice_expected_date", "business_id", "expected_payment_date"),
        Index("idx_invoice_status", "business_id", "payment_status"),
    )

    business = relationship("Business", back_populates="receivables")
    customer = relationship("Customer", back_populates="invoices")
