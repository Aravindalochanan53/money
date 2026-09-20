from datetime import date, timedelta
from decimal import Decimal
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from app.models.action_item import ActionItem
from app.models.invoice import ReceivableInvoice
from app.models.bill import PayableBill
from app.models.business import Business
from app.services.cashflow_service import CashFlowService
from app.services.risk_service import RiskService

class ActionService:
    @classmethod
    def sync_and_get_actions(
        cls,
        db: Session,
        business_id: str,
        anchor_date: Optional[date] = None
    ) -> List[ActionItem]:
        if anchor_date is None:
            anchor_date = date.today()

        business = db.query(Business).filter(Business.id == business_id).first()
        if not business:
            return []

        safety_thresh = Decimal(str(business.safety_cash_threshold))
        starting_cash = CashFlowService.get_latest_cash_balance(db, business_id)

        # 1. Check timeline for deficits and buffer breaches within next 14 days
        timeline_res = CashFlowService.get_timeline(
            db=db,
            business_id=business_id,
            anchor_date=anchor_date,
            days=30,
            apply_risk_delay=True
        )

        existing_actions = {
            (a.action_code, a.related_entity_id or ""): a
            for a in db.query(ActionItem).filter(
                ActionItem.business_id == business_id,
                ActionItem.status.in_(["OPEN", "IN_PROGRESS"])
            ).all()
        }

        # Rule ACT-01: Cash Deficit in next 14 days
        deficit_point = None
        for p in timeline_res["timeline"][:14]:
            if p["is_deficit"]:
                deficit_point = p
                break

        if deficit_point:
            key = ("ACT-01", "")
            if key not in existing_actions:
                act = ActionItem(
                    business_id=business_id,
                    action_code="ACT-01",
                    severity="CRITICAL",
                    title="Imminent Cash Deficit Alert",
                    description=(
                        f"Projected bank cash goes negative to -₹{abs(deficit_point['closing_balance']):,.2f} "
                        f"on {deficit_point['date']}."
                    ),
                    amount=Decimal(str(abs(deficit_point['closing_balance']))),
                    target_date=date.fromisoformat(deficit_point['date']),
                    related_entity_type="GENERAL",
                    suggested_action="Immediately expedite overdue collections or negotiate vendor payable extensions."
                )
                db.add(act)

        # Rule ACT-02: Buffer Breach in next 14 days (if no deficit on that day)
        buffer_point = None
        for p in timeline_res["timeline"][:14]:
            if p["is_buffer_breach"]:
                buffer_point = p
                break

        if buffer_point and not deficit_point:
            key = ("ACT-02", "")
            if key not in existing_actions:
                shortfall = safety_thresh - Decimal(str(buffer_point['closing_balance']))
                act = ActionItem(
                    business_id=business_id,
                    action_code="ACT-02",
                    severity="WARNING",
                    title="Safety Cash Buffer Breach Warning",
                    description=(
                        f"Projected cash falls to ₹{buffer_point['closing_balance']:,.2f} on {buffer_point['date']}, "
                        f"breaching your ₹{safety_thresh:,.2f} safety threshold (shortfall: ₹{shortfall:,.2f})."
                    ),
                    amount=shortfall,
                    target_date=date.fromisoformat(buffer_point['date']),
                    related_entity_type="GENERAL",
                    suggested_action="Pause uncommitted capital purchases or defer non-urgent vendor payments."
                )
                db.add(act)

        # Rule ACT-03: Overdue Receivable >= ₹50,000 and DPD >= 15
        overdue_invoices = db.query(ReceivableInvoice).filter(
            ReceivableInvoice.business_id == business_id,
            ReceivableInvoice.payment_status.in_(["UNPAID", "PARTIALLY_PAID"]),
            ReceivableInvoice.due_date <= (anchor_date - timedelta(days=15)),
            ReceivableInvoice.outstanding_balance >= Decimal("50000.00")
        ).all()

        for inv in overdue_invoices:
            key = ("ACT-03", inv.id)
            if key not in existing_actions:
                dpd = (anchor_date - inv.due_date).days
                cust_name = inv.customer.name if inv.customer else "Customer"
                act = ActionItem(
                    business_id=business_id,
                    action_code="ACT-03",
                    severity="WARNING",
                    title=f"High-Value Overdue Invoice: {inv.invoice_number}",
                    description=f"{cust_name} owes ₹{inv.outstanding_balance:,.2f}, which is {dpd} days past due.",
                    amount=inv.outstanding_balance,
                    target_date=inv.due_date,
                    related_entity_type="INVOICE",
                    related_entity_id=inv.id,
                    suggested_action=f"Call {cust_name}'s finance department immediately to confirm settlement date."
                )
                db.add(act)

        # Rule ACT-05: Single day outflow >= 50% of starting cash
        if starting_cash > Decimal("0.00"):
            for p in timeline_res["timeline"][:30]:
                outflow_dec = Decimal(str(p["outflows"]))
                if outflow_dec >= (Decimal("0.50") * starting_cash) and outflow_dec >= Decimal("50000.00"):
                    key = ("ACT-05", p["date"])
                    if key not in existing_actions:
                        act = ActionItem(
                            business_id=business_id,
                            action_code="ACT-05",
                            severity="INFO",
                            title=f"Large Scheduled Outflow on {p['date']}",
                            description=(
                                f"Scheduled payments totaling ₹{outflow_dec:,.2f} mature on {p['date']}, "
                                f"representing {float((outflow_dec / starting_cash) * 100):.1f}% of starting cash."
                            ),
                            amount=outflow_dec,
                            target_date=date.fromisoformat(p["date"]),
                            related_entity_type="GENERAL",
                            related_entity_id=p["date"],
                            suggested_action="Review upcoming vendor disbursements and verify expected receipts."
                        )
                        db.add(act)

        db.commit()

        # Return all active and recent actions
        actions = db.query(ActionItem).filter(
            ActionItem.business_id == business_id
        ).order_by(
            ActionItem.status.asc(),
            ActionItem.created_at.desc()
        ).all()

        return actions
