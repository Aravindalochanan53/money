import uuid
from datetime import datetime, timezone, date
from decimal import Decimal
from sqlalchemy import Column, String, Numeric, Date, DateTime, ForeignKey, CheckConstraint, Index
from sqlalchemy.orm import relationship
from app.database import Base

def utc_now():
    return datetime.now(timezone.utc)

class PaymentRecord(Base):
    __tablename__ = "payments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id = Column(String(36), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    payment_type = Column(String(20), nullable=False)  # 'INCOMING' or 'OUTGOING'
    payment_date = Column(Date, nullable=False, default=date.today)
    amount = Column(Numeric(15, 2), nullable=False)
    payment_method = Column(String(50), nullable=False, default="BANK_TRANSFER")
    reference_number = Column(String(100), nullable=True)
    invoice_id = Column(String(36), ForeignKey("receivable_invoices.id", ondelete="NO ACTION"), nullable=True)
    bill_id = Column(String(36), ForeignKey("payable_bills.id", ondelete="NO ACTION"), nullable=True)
    notes = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    __table_args__ = (
        CheckConstraint("amount > 0", name="chk_payment_amount_positive"),
        CheckConstraint("payment_type IN ('INCOMING', 'OUTGOING')", name="chk_payment_type_valid"),
        Index("idx_payment_business_date", "business_id", "payment_date"),
        Index("idx_payment_invoice", "business_id", "invoice_id"),
        Index("idx_payment_bill", "business_id", "bill_id"),
    )

    business = relationship("Business", back_populates="payments")
    invoice = relationship("ReceivableInvoice", back_populates="payments")
    bill = relationship("PayableBill", back_populates="payments")
    cash_transactions = relationship("CashTransaction", back_populates="payment", cascade="all, delete-orphan")
