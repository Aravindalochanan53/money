from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import date
from decimal import Decimal

from app.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.business import Business
from app.models.invoice import ReceivableInvoice
from app.models.bill import PayableBill
from app.services.cashflow_service import CashFlowService
from app.services.action_service import ActionService
from app.schemas.action import ActionItemOut

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/overview")
def get_dashboard_overview(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    biz = db.query(Business).filter(Business.id == current_user.business_id).first()
    today = date.today()

    cur_cash = CashFlowService.get_latest_cash_balance(db, biz.id)
    safety_threshold = float(biz.safety_cash_threshold)

    # 30-day timeline
    timeline_30 = CashFlowService.get_timeline(
        db=db,
        business_id=biz.id,
        anchor_date=today,
        days=30,
        apply_risk_delay=True
    )

    # Calculate Total AR
    unpaid_invoices = db.query(ReceivableInvoice).filter(
        ReceivableInvoice.business_id == biz.id,
        ReceivableInvoice.payment_status.in_(["UNPAID", "PARTIALLY_PAID"]),
        ReceivableInvoice.outstanding_balance > 0
    ).all()
    total_ar = sum((Decimal(str(inv.outstanding_balance)) for inv in unpaid_invoices), Decimal("0.00"))
    overdue_ar = sum(
        (Decimal(str(inv.outstanding_balance)) for inv in unpaid_invoices if inv.due_date < today),
        Decimal("0.00")
    )

    # Calculate Total AP
    unpaid_bills = db.query(PayableBill).filter(
        PayableBill.business_id == biz.id,
        PayableBill.payment_status.in_(["UNPAID", "PARTIALLY_PAID"]),
        PayableBill.outstanding_balance > 0
    ).all()
    total_ap = sum((Decimal(str(b.outstanding_balance)) for b in unpaid_bills), Decimal("0.00"))

    # Actions
    actions = ActionService.sync_and_get_actions(db, biz.id, today)
    critical_actions = [a for a in actions if a.severity == "CRITICAL" and a.status in ["OPEN", "IN_PROGRESS"]]
    warning_actions = [a for a in actions if a.severity == "WARNING" and a.status in ["OPEN", "IN_PROGRESS"]]

    # Sparkline (30 points with date and closing_balance)
    sparkline = [
        {"date": p["date"], "closing_balance": p["closing_balance"]}
        for p in timeline_30["timeline"]
    ]

    return {
        "business_name": biz.name,
        "currency": biz.currency,
        "current_cash": float(cur_cash),
        "safety_threshold": safety_threshold,
        "min_cash_30": timeline_30["min_projected_cash"],
        "min_cash_date_30": timeline_30["min_cash_date"],
        "total_receivables": float(total_ar),
        "overdue_receivables": float(overdue_ar),
        "total_payables": float(total_ap),
        "net_working_capital_position": float(cur_cash + total_ar - total_ap),
        "has_buffer_breach_30": timeline_30["has_buffer_breach"],
        "has_deficit_30": timeline_30["has_deficit"],
        "critical_actions_count": len(critical_actions),
        "warning_actions_count": len(warning_actions),
        "sparkline": sparkline,
        "top_actions": [ActionItemOut.model_validate(a) for a in actions[:3]]
    }
