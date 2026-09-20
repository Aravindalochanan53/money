from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import date

from app.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.affordability import AffordabilityCheckRequest, AffordabilityCheckResponse
from app.services.affordability_service import AffordabilityService

router = APIRouter(prefix="/affordability", tags=["Can I Afford This?"])

@router.post("/check", response_model=AffordabilityCheckResponse)
def check_affordability(
    req: AffordabilityCheckRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    today = date.today()
    result = AffordabilityService.evaluate(
        db=db,
        business_id=current_user.business_id,
        request=req,
        anchor_date=today
    )
    return result
