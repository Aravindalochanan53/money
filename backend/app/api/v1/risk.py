from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import date

from app.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.services.risk_service import RiskService

router = APIRouter(prefix="/risk", tags=["Receivable Risk"])

@router.get("/receivables")
def get_receivable_risk(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    today = date.today()
    result = RiskService.get_receivable_risk_analysis(
        db=db,
        business_id=current_user.business_id,
        anchor_date=today
    )
    return result
