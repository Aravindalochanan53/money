from datetime import date, timedelta
from decimal import Decimal
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.business import Business, BankCashBalance
from app.models.invoice import ReceivableInvoice
from app.models.bill import PayableBill
from app.models.expense import RecurringExpense
from app.models.payment_history import HistoricalPayment
from app.models.customer import Customer
from app.engines.cash_engine import CashEngine
from app.engines.risk_engine import RiskEngine

class CashFlowService:
    @staticmethod
    def get_latest_cash_balance(db: Session, business_id: str) -> Decimal:
        latest = db.query(BankCashBalance).filter(
            BankCashBalance.business_id == business_id
        ).order_by(BankCashBalance.as_of_date.desc(), BankCashBalance.created_at.desc()).first()

        if latest:
            return Decimal(str(latest.balance_amount))
        return Decimal("0.00")

    @classmethod
    def get_timeline(
        cls,
        db: Session,
        business_id: str,
        anchor_date: Optional[date] = None,
        days: int = 90,
        apply_risk_delay: bool = True
    ) -> Dict[str, Any]:
        business = db.query(Business).filter(Business.id == business_id).first()
        if not business:
            raise ValueError("Business not found")

        if anchor_date is None:
            anchor_date = date.today()

        starting_cash = cls.get_latest_cash_balance(db, business_id)
        safety_threshold = Decimal(str(business.safety_cash_threshold))

        # Query unpaid/partially paid receivables
        unpaid_invoices = db.query(ReceivableInvoice).filter(
            ReceivableInvoice.business_id == business_id,
            ReceivableInvoice.payment_status.in_(["UNPAID", "PARTIALLY_PAID"]),
            ReceivableInvoice.outstanding_balance > 0
        ).all()

        # Query customer historical delays
        customer_delays: Dict[str, float] = {}
        if apply_risk_delay:
            hist_records = db.query(HistoricalPayment).filter(
                HistoricalPayment.business_id == business_id
            ).all()
            settlements_by_cust: Dict[str, list] = {}
            for h in hist_records:
                settlements_by_cust.setdefault(h.customer_id, []).append({
                    "due_date": h.due_date,
                    "settled_date": h.settled_date
                })
            for cust_id, settlements in settlements_by_cust.items():
                customer_delays[cust_id] = RiskEngine.calculate_historical_delay(settlements)

        inflow_events: List[Dict[str, Any]] = []
        for inv in unpaid_invoices:
            avg_delay = customer_delays.get(inv.customer_id, 0.0)
            if apply_risk_delay and avg_delay > 0:
                eff_date = RiskEngine.compute_effective_expected_date(inv.due_date, avg_delay, anchor_date)
            else:
                eff_date = inv.expected_payment_date
                if eff_date < anchor_date:
                    eff_date = anchor_date + timedelta(days=1)

            cust_name = inv.customer.name if inv.customer else "Customer"
            inflow_events.append({
                "invoice_id": inv.id,
                "invoice_number": inv.invoice_number,
                "customer_id": inv.customer_id,
                "customer_name": cust_name,
                "amount": Decimal(str(inv.outstanding_balance)),
                "expected_date": eff_date,
                "due_date": inv.due_date,
                "original_amount": Decimal(str(inv.original_amount)),
            })

        # Query unpaid/partially paid payables
        unpaid_bills = db.query(PayableBill).filter(
            PayableBill.business_id == business_id,
            PayableBill.payment_status.in_(["UNPAID", "PARTIALLY_PAID"]),
            PayableBill.outstanding_balance > 0
        ).all()

        outflow_events: List[Dict[str, Any]] = []
        for bill in unpaid_bills:
            sched_date = bill.scheduled_payment_date
            if sched_date < anchor_date:
                sched_date = anchor_date + timedelta(days=1)
            supp_name = bill.supplier.name if bill.supplier else "Supplier"
            outflow_events.append({
                "bill_id": bill.id,
                "bill_number": bill.bill_number,
                "supplier_id": bill.supplier_id,
                "supplier_name": supp_name,
                "amount": Decimal(str(bill.outstanding_balance)),
                "scheduled_date": sched_date,
                "category": bill.category,
                "due_date": bill.due_date,
            })

        # Query recurring expenses and expand across timeline window
        recurring_expenses = db.query(RecurringExpense).filter(
            RecurringExpense.business_id == business_id,
            RecurringExpense.is_active == True
        ).all()

        for exp in recurring_expenses:
            amt = Decimal(str(exp.amount))
            day_num = exp.recurrence_day_of_month
            for d_offset in range(1, days + 1):
                cur_d = anchor_date + timedelta(days=d_offset)
                if cur_d.day == day_num:
                    outflow_events.append({
                        "expense_id": exp.id,
                        "title": exp.title,
                        "category": exp.category,
                        "amount": amt,
                        "scheduled_date": cur_d,
                    })

        timeline_result = CashEngine.compute_timeline(
            anchor_date=anchor_date,
            starting_cash=starting_cash,
            safety_threshold=safety_threshold,
            inflow_events=inflow_events,
            outflow_events=outflow_events,
            days=days
        )

        timeline_result["raw_inflows"] = inflow_events
        timeline_result["raw_outflows"] = outflow_events
        return timeline_result
