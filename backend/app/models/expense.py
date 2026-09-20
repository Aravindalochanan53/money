import uuid
from datetime import datetime
from decimal import Decimal
from sqlalchemy import Column, String, Numeric, Integer, Boolean, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.orm import relationship
from app.database import Base

class RecurringExpense(Base):
    __tablename__ = "recurring_expenses"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id = Column(String(36), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    category = Column(String(50), nullable=False, default="PAYROLL")
    amount = Column(Numeric(15, 2), nullable=False)
    recurrence_day_of_month = Column(Integer, nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        CheckConstraint("amount > 0", name="chk_expense_amount_pos"),
        CheckConstraint("recurrence_day_of_month BETWEEN 1 AND 31", name="chk_expense_day_range"),
        CheckConstraint("category IN ('PAYROLL', 'RENT', 'STATUTORY_GST_TDS', 'LOAN_EMI', 'UTILITIES', 'OTHER')", name="chk_expense_category"),
    )

    business = relationship("Business", back_populates="recurring_expenses")
