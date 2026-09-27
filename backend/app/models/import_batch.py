import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey, CheckConstraint, Index
from sqlalchemy.orm import relationship
from app.database import Base

def utc_now():
    return datetime.now(timezone.utc)

class ImportBatch(Base):
    __tablename__ = "import_batches"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id = Column(String(36), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    file_type = Column(String(50), nullable=False)  # 'receivables', 'payables', 'expenses'
    filename = Column(String(255), nullable=False)
    status = Column(String(20), nullable=False, default="VALIDATED")  # 'VALIDATED', 'CONFIRMED', 'FAILED', 'CANCELLED'
    total_rows = Column(Integer, nullable=False, default=0)
    valid_rows = Column(Integer, nullable=False, default=0)
    error_rows = Column(Integer, nullable=False, default=0)
    preview_data_json = Column(Text, nullable=True)
    errors_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    confirmed_at = Column(DateTime, nullable=True)

    __table_args__ = (
        CheckConstraint("file_type IN ('receivables', 'payables', 'expenses')", name="chk_import_batch_type"),
        CheckConstraint("status IN ('VALIDATED', 'CONFIRMED', 'FAILED', 'CANCELLED')", name="chk_import_batch_status"),
        Index("idx_import_batch_biz_status", "business_id", "status"),
    )

    business = relationship("Business", back_populates="import_batches")
