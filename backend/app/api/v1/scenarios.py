from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import date

from app.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.scenario import ScenarioRequest, ScenarioResponse
from app.services.scenario_service import ScenarioService

router = APIRouter(prefix="/scenarios", tags=["Scenario Simulator"])

@router.post("/simulate", response_model=ScenarioResponse)
def simulate_scenario(
    req: ScenarioRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    today = date.today()
    result = ScenarioService.simulate(
        db=db,
        business_id=current_user.business_id,
        request=req,
        anchor_date=today
    )
    return result
