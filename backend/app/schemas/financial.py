from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import date, datetime

class CustomerOut(BaseModel):
    id: str
    name: str
    code: Optional[str] = None
    contact_email: Optional[str] = None
    phone: Optional[str] = None
    standard_credit_days: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class SupplierOut(BaseModel):
    id: str
    name: str
    code: Optional[str] = None
    contact_email: Optional[str] = None
    phone: Optional[str] = None
    standard_payment_days: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class InvoiceCreate(BaseModel):
    customer_name: str
    invoice_number: str
    invoice_date: date
    due_date: date
    original_amount: float = Field(..., gt=0)
    paid_amount: Optional[float] = Field(0.0, ge=0)
    expected_payment_date: Optional[date] = None

class InvoiceOut(BaseModel):
    id: str
    customer_id: str
    customer_name: Optional[str] = None
    invoice_number: str
    invoice_date: date
    due_date: date
    original_amount: float
    paid_amount: float
    outstanding_balance: float
    payment_status: str
    expected_payment_date: date
    days_past_due: int
    is_overdue: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class BillCreate(BaseModel):
    supplier_name: str
    bill_number: str
    bill_date: date
    due_date: date
    category: Optional[str] = "RAW_MATERIAL"
    original_amount: float = Field(..., gt=0)
    paid_amount: Optional[float] = Field(0.0, ge=0)
    scheduled_payment_date: Optional[date] = None

class BillOut(BaseModel):
    id: str
    supplier_id: str
    supplier_name: Optional[str] = None
    bill_number: str
    bill_date: date
    due_date: date
    category: str
    original_amount: float
    paid_amount: float
    outstanding_balance: float
    payment_status: str
    scheduled_payment_date: date
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ExpenseCreate(BaseModel):
    title: str
    category: str
    amount: float = Field(..., gt=0)
    recurrence_day_of_month: int = Field(..., ge=1, le=31)
    is_active: Optional[bool] = True

class ExpenseOut(BaseModel):
    id: str
    title: str
    category: str
    amount: float
    recurrence_day_of_month: int
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
