import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, UniqueConstraint, CheckConstraint
from sqlalchemy.orm import relationship
from app.database import Base

class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id = Column(String(36), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    code = Column(String(50), nullable=True)
    contact_email = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    standard_payment_days = Column(Integer, nullable=False, default=30)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("business_id", "name", name="uq_business_supplier_name"),
        CheckConstraint("standard_payment_days >= 0", name="chk_supplier_payment_days_positive"),
    )

    business = relationship("Business", back_populates="suppliers")
    bills = relationship("PayableBill", back_populates="supplier", cascade="all, delete-orphan")
