import csv
import io
import uuid
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.customer import Customer
from app.models.invoice import ReceivableInvoice
from app.models.payment_history import HistoricalPayment
from app.models.risk_alert import RiskAlert
from app.engines.risk_engine import RiskEngine

def utc_now():
    return datetime.now(timezone.utc)

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
                # Check / sync risk alert for HIGH risk customer
                cls._ensure_alert(
                    db=db,
                    business_id=business_id,
                    severity="HIGH",
                    alert_type="HIGH_RISK_CUSTOMER",
                    title=f"High Risk Customer: {cust.name}",
                    description=score_res.get("explanation", "High credit delay or overdue risk detected"),
                    related_entity_type="customer",
                    related_entity_id=cust.id
                )

            customer_risk_list.append(score_res)

        # Check for overdue invoices > 30 days and record critical alerts
        for inv in invoices:
            if inv.due_date < anchor_date:
                days_overdue = (anchor_date - inv.due_date).days
                if days_overdue >= 15:
                    cls._ensure_alert(
                        db=db,
                        business_id=business_id,
                        severity="CRITICAL" if days_overdue >= 30 else "HIGH",
                        alert_type="OVERDUE_INVOICE",
                        title=f"Overdue Invoice #{inv.invoice_number} ({days_overdue} days late)",
                        description=f"Invoice #{inv.invoice_number} of ₹{float(inv.outstanding_balance):,.2f} is {days_overdue} days past due.",
                        related_entity_type="invoice",
                        related_entity_id=inv.id
                    )

        # Sort by risk score descending
        customer_risk_list.sort(key=lambda x: x["risk_score"], reverse=True)

        alerts = db.query(RiskAlert).filter(
            RiskAlert.business_id == business_id,
            RiskAlert.status.in_(["OPEN", "ACKNOWLEDGED"])
        ).order_by(RiskAlert.detected_at.desc()).all()

        return {
            "anchor_date": anchor_date.isoformat(),
            "total_receivables": float(total_ar),
            "total_overdue_amount": float(total_overdue),
            "customer_count": len(customer_risk_list),
            "low_risk_count": low_risk_count,
            "medium_risk_count": med_risk_count,
            "high_risk_count": high_risk_count,
            "customers": customer_risk_list,
            "alerts": alerts
        }

    @classmethod
    def export_risk_csv(
        cls,
        db: Session,
        business_id: str,
        anchor_date: Optional[date] = None
    ) -> str:
        if anchor_date is None:
            anchor_date = date.today()

        # Fetch risk analysis
        analysis = cls.get_receivable_risk_analysis(
            db=db,
            business_id=business_id,
            anchor_date=anchor_date
        )

        customer_map = {c["customer_id"]: c for c in analysis.get("customers", [])}

        invoices = db.query(ReceivableInvoice).filter(
            ReceivableInvoice.business_id == business_id,
            ReceivableInvoice.payment_status.in_(["UNPAID", "PARTIALLY_PAID"]),
            ReceivableInvoice.outstanding_balance > 0
        ).order_by(ReceivableInvoice.due_date.asc()).all()

        output = io.StringIO()
        writer = csv.writer(output)

        # Write metadata banner
        writer.writerow(["# FlowCred Receivable Risk Radar Export"])
        writer.writerow(["# Anchor Date", anchor_date.isoformat()])
        writer.writerow(["# Total Receivables (INR)", f"{analysis['total_receivables']:.2f}"])
        writer.writerow(["# Overdue Receivables (INR)", f"{analysis['total_overdue_amount']:.2f}"])
        writer.writerow(["# High Risk Customers", analysis["high_risk_count"]])
        writer.writerow([])

        # CSV Column headers
        writer.writerow([
            "Invoice Number",
            "Customer Name",
            "Customer ID",
            "Outstanding Balance (INR)",
            "Original Amount (INR)",
            "Due Date",
            "Days Overdue",
            "Aging Status",
            "Customer Avg Delay (Days)",
            "Risk Tier",
            "Risk Score",
            "Primary Rule ID",
            "Rule Explanation"
        ])

        for inv in invoices:
            cust_info = customer_map.get(inv.customer_id, {})
            days_overdue = max(0, (anchor_date - inv.due_date).days)
            aging_status = f"{days_overdue} days overdue" if days_overdue > 0 else "Current"

            # Determine invoice-level tier and rule trigger
            tier = "LOW"
            rule_id = "RULE-STD"
            rule_desc = "Routine collection schedule within credit grace period"

            if cust_info.get("risk_tier") == "HIGH" or days_overdue > 30:
                tier = "HIGH"
                if days_overdue > 30:
                    rule_id = "RULE-OVERDUE-30"
                    rule_desc = f"Invoice is {days_overdue} days past due date"
                else:
                    rule_id = "RULE-CUST-HIGH-RISK"
                    rule_desc = cust_info.get("explanation", "Customer scored high risk")
            elif cust_info.get("risk_tier") == "MEDIUM" or days_overdue > 0:
                tier = "MEDIUM"
                if days_overdue > 0:
                    rule_id = "RULE-OVERDUE-GRACE"
                    rule_desc = f"Invoice is {days_overdue} days past due date"
                else:
                    rule_id = "RULE-CUST-MED-RISK"
                    rule_desc = cust_info.get("explanation", "Customer shows moderate payment friction")

            cust_name = cust_info.get("customer_name")
            if not cust_name and inv.customer:
                cust_name = inv.customer.name
            cust_name = cust_name or "Customer"

            avg_delay = cust_info.get("avg_delay_days")
            delay_str = f"{round(avg_delay, 1)}" if avg_delay is not None else "0.0"
            risk_score = cust_info.get("risk_score", 0.0)

            writer.writerow([
                inv.invoice_number,
                cust_name,
                inv.customer_id,
                f"{float(inv.outstanding_balance):.2f}",
                f"{float(inv.original_amount):.2f}",
                inv.due_date.isoformat(),
                days_overdue,
                aging_status,
                delay_str,
                tier,
                f"{float(risk_score):.1f}",
                rule_id,
                rule_desc
            ])

        return output.getvalue()

    @classmethod
    def _ensure_alert(
        cls,
        db: Session,
        business_id: str,
        severity: str,
        alert_type: str,
        title: str,
        description: str,
        related_entity_type: str,
        related_entity_id: str
    ):
        existing = db.query(RiskAlert).filter(
            RiskAlert.business_id == business_id,
            RiskAlert.alert_type == alert_type,
            RiskAlert.related_entity_id == related_entity_id,
            RiskAlert.status.in_(["OPEN", "ACKNOWLEDGED"])
        ).first()

        if not existing:
            new_alert = RiskAlert(
                id=str(uuid.uuid4()),
                business_id=business_id,
                severity=severity,
                alert_type=alert_type,
                title=title,
                description=description,
                related_entity_type=related_entity_type,
                related_entity_id=related_entity_id,
                status="OPEN",
                detected_at=utc_now()
            )
            db.add(new_alert)
            db.commit()

    @classmethod
    def list_alerts(cls, db: Session, business_id: str, status_filter: Optional[str] = None) -> List[RiskAlert]:
        query = db.query(RiskAlert).filter(RiskAlert.business_id == business_id)
        if status_filter:
            query = query.filter(RiskAlert.status == status_filter.upper())
        return query.order_by(RiskAlert.detected_at.desc()).all()

    @classmethod
    def update_alert_status(cls, db: Session, business_id: str, alert_id: str, new_status: str) -> RiskAlert:
        alert = db.query(RiskAlert).filter(
            RiskAlert.id == alert_id,
            RiskAlert.business_id == business_id
        ).first()
        if not alert:
            raise HTTPException(status_code=404, detail="Risk alert not found.")

        alert.status = new_status.upper()
        if alert.status in ("RESOLVED", "DISMISSED"):
            alert.resolved_at = utc_now()
        db.commit()
        db.refresh(alert)
        return alert
