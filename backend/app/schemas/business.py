from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import date, datetime

class BusinessUpdate(BaseModel):
    name: Optional[str] = None
    currency: Optional[str] = None
    safety_cash_threshold: Optional[float] = Field(None, ge=0)

class BusinessOut(BaseModel):
    id: str
    name: str
    currency: str
    safety_cash_threshold: float
    current_cash: float
    as_of_date: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class BankCashBalanceCreate(BaseModel):
    balance_amount: float = Field(..., ge=0)
    as_of_date: Optional[date] = None
    notes: Optional[str] = None

class BankCashBalanceOut(BaseModel):
    id: str
    business_id: str
    as_of_date: date
    balance_amount: float
    notes: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
