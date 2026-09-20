from pydantic import BaseModel, EmailStr
from typing import Optional

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    business_name: str
    currency: Optional[str] = "INR"
    safety_cash_threshold: Optional[float] = 100000.00
    starting_cash: Optional[float] = 0.00

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    business_id: str
    business_name: str
    full_name: str
    email: str
    role: str

class TokenData(BaseModel):
    user_id: Optional[str] = None
    business_id: Optional[str] = None
    role: Optional[str] = None
