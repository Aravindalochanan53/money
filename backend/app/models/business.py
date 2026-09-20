import uuid
from datetime import datetime, date
from decimal import Decimal
from sqlalchemy import Column, String, Numeric, DateTime, Date, ForeignKey, UniqueConstraint, CheckConstraint
from sqlalchemy.orm import relationship
from app.database import Base

class Business(Base):
    __tablename__ = "businesses"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    currency = Column(String(3), nullable=False, default="INR")
    safety_cash_threshold = Column(Numeric(15, 2), nullable=False, default=Decimal("100000.00"))
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    __table_args__ = (
        CheckConstraint("safety_cash_threshold >= 0", name="chk_business_safety_cash_positive"),
    )

    # Relationships
    users = relationship("User", back_populates="business", cascade="all, delete-orphan")
    bank_balances = relationship("BankCashBalance", back_populates="business", cascade="all, delete-orphan")
    customers = relationship("Customer", back_populates="business", cascade="all, delete-orphan")
    suppliers = relationship("Supplier", back_populates="business", cascade="all, delete-orphan")
    receivables = relationship("ReceivableInvoice", back_populates="business", cascade="all, delete-orphan")
    payables = relationship("PayableBill", back_populates="business", cascade="all, delete-orphan")
    recurring_expenses = relationship("RecurringExpense", back_populates="business", cascade="all, delete-orphan")
    historical_payments = relationship("HistoricalPayment", back_populates="business", cascade="all, delete-orphan")
    affordability_queries = relationship("AffordabilityQuery", back_populates="business", cascade="all, delete-orphan")
    action_items = relationship("ActionItem", back_populates="business", cascade="all, delete-orphan")


class BankCashBalance(Base):
    __tablename__ = "bank_cash_balances"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id = Column(String(36), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    as_of_date = Column(Date, nullable=False, default=date.today)
    balance_amount = Column(Numeric(15, 2), nullable=False)
    notes = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("business_id", "as_of_date", name="uq_business_balance_date"),
        CheckConstraint("balance_amount >= 0", name="chk_bank_balance_positive"),
    )

    business = relationship("Business", back_populates="bank_balances")
