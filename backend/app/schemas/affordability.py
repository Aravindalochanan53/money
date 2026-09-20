from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import date

class AffordabilityCheckRequest(BaseModel):
    purchase_title: str
    amount: float = Field(..., gt=0)
    planned_date: date
    category: Optional[str] = "CAPITAL_EXPENDITURE"

class AffordabilityTimelinePoint(BaseModel):
    date: str
    baseline_closing: float
    simulated_closing: float
    difference: float
    is_buffer_breach: bool
    is_deficit: bool

class AffordabilityCheckResponse(BaseModel):
    verdict: str  # 'AFFORDABLE', 'RISKY', 'UNSAFE'
    status_code: str
    planned_amount: float
    planned_date: str
    safety_threshold: float
    baseline_min_cash: float
    baseline_min_date: Optional[str]
    simulated_min_cash: float
    simulated_min_date: Optional[str]
    buffer_cushion: float
    recommended_date: Optional[str]
    explanation: str
    simulated_timeline: List[AffordabilityTimelinePoint]
