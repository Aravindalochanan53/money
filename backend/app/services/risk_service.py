from datetime import date
from decimal import Decimal
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.customer import Customer
from app.models.invoice import ReceivableInvoice
from app.models.payment_history import HistoricalPayment
from app.engines.risk_engine import RiskEngine

class RiskService:
    @classmethod
    def get_receivable_risk_analysis(
        cls,
        db: Session,
        business_id: str,
        anchor_date: Optional[date] = None
    ) -> Dict[str, Any]:
        if anchor_date is None:
            anchor_date = date.today()

        # Get all unpaid invoices for this business
        invoices = db.query(ReceivableInvoice).filter(
            ReceivableInvoice.business_id == business_id,
            ReceivableInvoice.payment_status.in_(["UNPAID", "PARTIALLY_PAID"]),
            ReceivableInvoice.outstanding_balance > 0
        ).all()

        total_ar = sum((Decimal(str(inv.outstanding_balance)) for inv in invoices), Decimal("0.00"))

        # Group invoices by customer
        invoices_by_customer: Dict[str, List[Dict[str, Any]]] = {}
        for inv in invoices:
            invoices_by_customer.setdefault(inv.customer_id, []).append({
                "invoice_id": inv.id,
                "invoice_number": inv.invoice_number,
                "outstanding_balance": Decimal(str(inv.outstanding_balance)),
                "original_amount": Decimal(str(inv.original_amount)),
                "due_date": inv.due_date,
            })

        # Get historical payments grouped by customer
        hist_records = db.query(HistoricalPayment).filter(
            HistoricalPayment.business_id == business_id
        ).all()
        settlements_by_customer: Dict[str, list] = {}
        for h in hist_records:
            settlements_by_customer.setdefault(h.customer_id, []).append({
                "due_date": h.due_date,
                "settled_date": h.settled_date,
            })

        # Get all customers who have either open invoices or historical payments
        all_customers = db.query(Customer).filter(Customer.business_id == business_id).all()

        customer_risk_list: List[Dict[str, Any]] = []
        total_overdue = Decimal("0.00")
        low_risk_count = 0
        med_risk_count = 0
        high_risk_count = 0

        for cust in all_customers:
            cust_invoices = invoices_by_customer.get(cust.id, [])
            cust_settlements = settlements_by_customer.get(cust.id, [])

            if not cust_invoices and not cust_settlements:
                continue

            avg_delay = RiskEngine.calculate_historical_delay(cust_settlements)

            score_res = RiskEngine.score_customer(
                customer_id=cust.id,
                customer_name=cust.name,
                avg_delay_days=avg_delay,
                invoices=cust_invoices,
                total_business_ar=total_ar,
                anchor_date=anchor_date
            )

            total_overdue += Decimal(str(score_res["overdue_amount"]))

            if score_res["risk_tier"] == "LOW":
                low_risk_count += 1
            elif score_res["risk_tier"] == "MEDIUM":
                med_risk_count += 1
            else:
                high_risk_count += 1

            customer_risk_list.append(score_res)

        # Sort by risk score descending
        customer_risk_list.sort(key=lambda x: x["risk_score"], reverse=True)

        return {
            "anchor_date": anchor_date.isoformat(),
            "total_receivables": float(total_ar),
            "total_overdue_amount": float(total_overdue),
            "customer_count": len(customer_risk_list),
            "low_risk_count": low_risk_count,
            "medium_risk_count": med_risk_count,
            "high_risk_count": high_risk_count,
            "customers": customer_risk_list,
        }
