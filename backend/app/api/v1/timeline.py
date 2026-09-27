from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import date
from typing import Optional

from app.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.services.cashflow_service import CashFlowService

router = APIRouter(prefix="/timeline", tags=["Cash Timeline"])

@router.get("")
def get_cash_timeline(
    anchor_date: Optional[date] = Query(None),
    days: int = Query(90, ge=7, le=180),
    apply_risk_delay: bool = Query(True),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    anchor = anchor_date or date.today()
    result = CashFlowService.get_timeline(
        db=db,
        business_id=current_user.business_id,
        anchor_date=anchor,
        days=days,
        apply_risk_delay=apply_risk_delay
    )
    # Exclude raw event objects from final JSON to keep payload clean
    result.pop("raw_inflows", None)
    result.pop("raw_outflows", None)
    return result
