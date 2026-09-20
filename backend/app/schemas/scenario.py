from pydantic import BaseModel
from typing import Dict, Any, List, Optional

class ScenarioRequest(BaseModel):
    scenario_type: str  # 'DELAY_CUSTOMER_PAYMENT', 'REDUCE_COLLECTIONS_PERCENT', 'UNPLANNED_EXPENSE', 'POSTPONE_SUPPLIER_PAYABLE'
    params: Dict[str, Any]
    days: Optional[int] = 90

class ScenarioTimelinePoint(BaseModel):
    date: str
    baseline_closing: float
    simulated_closing: float
    difference: float
    is_buffer_breach: bool
    is_deficit: bool

class ScenarioResponse(BaseModel):
    scenario_name: str
    scenario_type: str
    scenario_description: str
    params: Dict[str, Any]
    baseline_min_cash: float
    simulated_min_cash: float
    min_cash_impact: float
    simulated_ending_cash: float
    has_buffer_breach: bool
    has_deficit: bool
    comparison_timeline: List[ScenarioTimelinePoint]
