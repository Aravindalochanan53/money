from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import date, datetime

class ActionItemOut(BaseModel):
    id: str
    action_code: str
    severity: str  # 'CRITICAL', 'WARNING', 'INFO'
    title: str
    description: str
    amount: Optional[float] = None
    target_date: Optional[date] = None
    related_entity_type: Optional[str] = None
    related_entity_id: Optional[str] = None
    suggested_action: str
    status: str  # 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'DISMISSED'
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ActionItemUpdate(BaseModel):
    status: str  # 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'DISMISSED'
