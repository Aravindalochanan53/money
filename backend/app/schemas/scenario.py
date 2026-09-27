from pydantic import BaseModel, Field, ConfigDict
from typing import Dict, Any, List, Optional
from datetime import date, datetime

class ScenarioChangeCreate(BaseModel):
    change_type: str
    target_entity_type: Optional[str] = None
    target_entity_id: Optional[str] = None
    parameters: Dict[str, Any] = Field(default_factory=dict)
    impact_amount: Optional[float] = None
    effective_date: Optional[date] = None

class ScenarioChangeOut(BaseModel):
    id: str
    scenario_id: str
    change_type: str
    target_entity_type: Optional[str] = None
    target_entity_id: Optional[str] = None
    parameters: Dict[str, Any] = Field(default_factory=dict)
    impact_amount: Optional[float] = None
    effective_date: Optional[date] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ScenarioCreate(BaseModel):
    name: str
    description: Optional[str] = None
    scenario_type: str = "CUSTOM"  # 'DELAY_CUSTOMER_PAYMENT', 'REDUCE_COLLECTIONS_PERCENT', 'UNPLANNED_EXPENSE', 'POSTPONE_SUPPLIER_PAYABLE', 'CUSTOM'
    params: Optional[Dict[str, Any]] = Field(default_factory=dict)
    changes: Optional[List[ScenarioChangeCreate]] = None

class ScenarioOut(BaseModel):
    id: str
    business_id: str
    name: str
    description: Optional[str] = None
    scenario_type: str
    status: str
    created_at: datetime
    updated_at: datetime
    changes: List[ScenarioChangeOut] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)

class ScenarioRequest(BaseModel):
    scenario_type: str
    params: Dict[str, Any]
    days: Optional[int] = 90
    scenario_id: Optional[str] = None

class ScenarioTimelinePoint(BaseModel):
    date: str
    baseline_closing: float
    simulated_closing: float
    difference: float
    is_buffer_breach: bool
    is_deficit: bool

class ScenarioResponse(BaseModel):
    scenario_id: Optional[str] = None
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
