from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session
from datetime import date
from typing import List, Optional

from app.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.risk import ReceivableRiskSummary, RiskAlertOut, RiskAlertUpdate
from app.services.risk_service import RiskService

router = APIRouter(prefix="/risk", tags=["Receivable Risk"])

@router.get("/export")
@router.get("/download")
def export_receivable_risk(
    anchor_date: Optional[date] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    target_date = anchor_date or date.today()
    csv_content = RiskService.export_risk_csv(
        db=db,
        business_id=current_user.business_id,
        anchor_date=target_date
    )
    filename = f"flowcred_risk_radar_{target_date.isoformat()}.csv"
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-cache"
        }
    )

@router.get("/receivables", response_model=ReceivableRiskSummary)
@router.get("/summary", response_model=ReceivableRiskSummary)
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

@router.get("/alerts", response_model=List[RiskAlertOut])
def list_risk_alerts(
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    RiskService.get_receivable_risk_analysis(db=db, business_id=current_user.business_id)
    return RiskService.list_alerts(
        db=db,
        business_id=current_user.business_id,
        status_filter=status_filter
    )

@router.patch("/alerts/{alert_id}", response_model=RiskAlertOut)
def update_risk_alert_status(
    alert_id: str,
    update_data: RiskAlertUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return RiskService.update_alert_status(
        db=db,
        business_id=current_user.business_id,
        alert_id=alert_id,
        new_status=update_data.status
    )
