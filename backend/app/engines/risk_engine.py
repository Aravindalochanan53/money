from datetime import date, timedelta
from decimal import Decimal
from typing import List, Dict, Any, Optional

class RiskEngine:
    @staticmethod
    def calculate_historical_delay(settlements: List[Dict[str, Any]]) -> float:
        """
        Calculates average historical delay in days for a customer.
        settlements: list of dicts with 'due_date' and 'settled_date'
        """
        if not settlements:
            return 0.0
        delays = []
        for s in settlements:
            due = s["due_date"]
            if isinstance(due, str):
                due = date.fromisoformat(due)
            settled = s["settled_date"]
            if isinstance(settled, str):
                settled = date.fromisoformat(settled)
            delay = (settled - due).days
            delays.append(delay)
        return float(sum(delays) / len(delays))

    @staticmethod
    def compute_effective_expected_date(
        due_date: date,
        avg_delay_days: float,
        anchor_date: date
    ) -> date:
        """
        Computes effective expected date:
        ExpectedDate = max(DueDate + max(0, avg_delay_days), anchor_date + 1)
        """
        delay_offset = max(0, int(round(avg_delay_days)))
        projected = due_date + timedelta(days=delay_offset)
        min_allowed = anchor_date + timedelta(days=1)
        return max(projected, min_allowed)

    @staticmethod
    def score_customer(
        customer_id: str,
        customer_name: str,
        avg_delay_days: float,
        invoices: List[Dict[str, Any]],
        total_business_ar: Decimal,
        anchor_date: date
    ) -> Dict[str, Any]:
        """
        Scores customer on 3 transparent pillars:
        - 50% Historical Delay Factor
        - 30% Overdue Severity Factor
        - 20% Concentration Factor
        """
        # Pillar 1: Historical Delay Factor (50%)
        if avg_delay_days <= 5:
            delay_pts = 0.0
        elif avg_delay_days <= 15:
            delay_pts = 25.0
        elif avg_delay_days <= 30:
            delay_pts = 50.0
        elif avg_delay_days <= 60:
            delay_pts = 80.0
        else:
            delay_pts = 100.0

        # Pillar 2: Overdue Severity Factor (30%)
        max_dpd = 0
        customer_ar = Decimal("0.00")
        overdue_amount = Decimal("0.00")

        for inv in invoices:
            bal = Decimal(str(inv.get("outstanding_balance", inv.get("original_amount", 0))))
            customer_ar += bal
            due = inv["due_date"]
            if isinstance(due, str):
                due = date.fromisoformat(due)
            dpd = max(0, (anchor_date - due).days)
            if dpd > 0:
                overdue_amount += bal
            if dpd > max_dpd:
                max_dpd = dpd

        if max_dpd == 0:
            overdue_pts = 0.0
        elif max_dpd <= 15:
            overdue_pts = 30.0
        elif max_dpd <= 30:
            overdue_pts = 60.0
        elif max_dpd <= 60:
            overdue_pts = 85.0
        else:
            overdue_pts = 100.0

        # Pillar 3: Revenue Concentration Factor (20%)
        if total_business_ar > Decimal("0.00"):
            concentration_pct = float((customer_ar / total_business_ar) * 100)
        else:
            concentration_pct = 0.0

        if concentration_pct <= 15.0:
            concentration_pts = 10.0
        elif concentration_pct <= 30.0:
            concentration_pts = 40.0
        elif concentration_pct <= 50.0:
            concentration_pts = 75.0
        else:
            concentration_pts = 100.0

        # Composite Score (0 - 100)
        composite_score = round(
            (0.50 * delay_pts) + (0.30 * overdue_pts) + (0.20 * concentration_pts), 1
        )

        if composite_score <= 30.0:
            risk_tier = "LOW"
        elif composite_score <= 60.0:
            risk_tier = "MEDIUM"
        else:
            risk_tier = "HIGH"

        return {
            "customer_id": customer_id,
            "customer_name": customer_name,
            "risk_score": composite_score,
            "risk_tier": risk_tier,
            "avg_delay_days": round(avg_delay_days, 1),
            "max_dpd": max_dpd,
            "total_outstanding": float(customer_ar),
            "overdue_amount": float(overdue_amount),
            "concentration_pct": round(concentration_pct, 1),
            "factors": {
                "delay_points": delay_pts,
                "overdue_points": overdue_pts,
                "concentration_points": concentration_pts,
            }
        }
