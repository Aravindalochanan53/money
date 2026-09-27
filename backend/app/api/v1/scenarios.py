from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from datetime import date
from typing import List

from app.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.scenario import (
    ScenarioRequest, ScenarioResponse, ScenarioCreate, ScenarioOut,
    ScenarioChangeCreate, ScenarioChangeOut
)
from app.services.scenario_service import ScenarioService

router = APIRouter(prefix="/scenarios", tags=["Scenario Simulator"])

@router.get("", response_model=List[ScenarioOut])
def list_scenarios(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return ScenarioService.list_scenarios(db=db, business_id=current_user.business_id)

@router.post("", response_model=ScenarioOut, status_code=status.HTTP_201_CREATED)
def create_scenario(
    data: ScenarioCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return ScenarioService.create_scenario(
        db=db,
        business_id=current_user.business_id,
        user_id=current_user.id,
        data=data
    )

@router.get("/{scenario_id}", response_model=ScenarioOut)
def get_scenario(
    scenario_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return ScenarioService.get_scenario(
        db=db,
        business_id=current_user.business_id,
        scenario_id=scenario_id
    )

@router.delete("/{scenario_id}")
def delete_scenario(
    scenario_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ScenarioService.delete_scenario(
        db=db,
        business_id=current_user.business_id,
        scenario_id=scenario_id
    )
    return {"message": "Scenario deleted successfully", "id": scenario_id}

@router.post("/{scenario_id}/simulate", response_model=ScenarioResponse)
def simulate_persisted_scenario(
    scenario_id: str,
    days: int = Query(90, ge=7, le=180),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    today = date.today()
    return ScenarioService.simulate_persisted(
        db=db,
        business_id=current_user.business_id,
        scenario_id=scenario_id,
        days=days,
        anchor_date=today
    )

@router.post("/{scenario_id}/changes", response_model=ScenarioChangeOut, status_code=status.HTTP_201_CREATED)
def add_scenario_change(
    scenario_id: str,
    change_data: ScenarioChangeCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return ScenarioService.add_scenario_change(
        db=db,
        business_id=current_user.business_id,
        scenario_id=scenario_id,
        data=change_data
    )

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
