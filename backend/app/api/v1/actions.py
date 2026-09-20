from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import date
from typing import List

from app.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.action_item import ActionItem
from app.schemas.action import ActionItemOut, ActionItemUpdate
from app.services.action_service import ActionService

router = APIRouter(prefix="/actions", tags=["Action Center"])

@router.get("", response_model=List[ActionItemOut])
def get_actions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    today = date.today()
    actions = ActionService.sync_and_get_actions(
        db=db,
        business_id=current_user.business_id,
        anchor_date=today
    )
    return actions

@router.patch("/{action_id}", response_model=ActionItemOut)
def update_action_status(
    action_id: str,
    update_data: ActionItemUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    act = db.query(ActionItem).filter(
        ActionItem.id == action_id,
        ActionItem.business_id == current_user.business_id
    ).first()

    if not act:
        raise HTTPException(status_code=404, detail="Action item not found")

    act.status = update_data.status
    db.commit()
    db.refresh(act)
    return act
