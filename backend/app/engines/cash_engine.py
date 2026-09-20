from datetime import date, timedelta
from decimal import Decimal
from typing import List, Dict, Any, Optional

class DailyCashPoint:
    def __init__(
        self,
        timeline_date: date,
        opening_balance: Decimal,
        inflows: Decimal,
        outflows: Decimal,
        closing_balance: Decimal,
        is_buffer_breach: bool,
        is_deficit: bool,
        inflow_items: Optional[List[Dict[str, Any]]] = None,
        outflow_items: Optional[List[Dict[str, Any]]] = None,
    ):
        self.date = timeline_date
        self.opening_balance = opening_balance
        self.inflows = inflows
        self.outflows = outflows
        self.net_change = inflows - outflows
        self.closing_balance = closing_balance
        self.is_buffer_breach = is_buffer_breach
        self.is_deficit = is_deficit
        self.inflow_items = inflow_items or []
        self.outflow_items = outflow_items or []

    def to_dict(self) -> Dict[str, Any]:
        return {
            "date": self.date.isoformat(),
            "opening_balance": float(self.opening_balance),
            "inflows": float(self.inflows),
            "outflows": float(self.outflows),
            "net_change": float(self.net_change),
            "closing_balance": float(self.closing_balance),
            "is_buffer_breach": self.is_buffer_breach,
            "is_deficit": self.is_deficit,
            "inflow_items": self.inflow_items,
            "outflow_items": self.outflow_items,
        }


class CashEngine:
    @staticmethod
    def compute_timeline(
        anchor_date: date,
        starting_cash: Decimal,
        safety_threshold: Decimal,
        inflow_events: List[Dict[str, Any]],
        outflow_events: List[Dict[str, Any]],
        days: int = 90
    ) -> Dict[str, Any]:
        """
        Computes deterministic daily cash timeline from anchor_date + 1 to anchor_date + days.
        Formula:
            C_t = C_{t-1} + I_t - O_t
        """
        timeline_points: List[DailyCashPoint] = []
        current_balance = Decimal(str(starting_cash))
        safety_thresh = Decimal(str(safety_threshold))

        # Index inflows by expected date
        inflows_by_date: Dict[date, List[Dict[str, Any]]] = {}
        for item in inflow_events:
            d = item["expected_date"]
            if isinstance(d, str):
                d = date.fromisoformat(d)
            inflows_by_date.setdefault(d, []).append(item)

        # Index outflows by scheduled date
        outflows_by_date: Dict[date, List[Dict[str, Any]]] = {}
        for item in outflow_events:
            d = item["scheduled_date"]
            if isinstance(d, str):
                d = date.fromisoformat(d)
            outflows_by_date.setdefault(d, []).append(item)

        min_projected_cash = current_balance
        min_cash_date = anchor_date
        total_inflows = Decimal("0.00")
        total_outflows = Decimal("0.00")
        buffer_breach_count = 0
        deficit_count = 0

        for day_offset in range(1, days + 1):
            day_date = anchor_date + timedelta(days=day_offset)
            opening_balance = current_balance

            # Aggregate inflows for this day
            day_inflow_items = inflows_by_date.get(day_date, [])
            day_inflows = sum((Decimal(str(x["amount"])) for x in day_inflow_items), Decimal("0.00"))

            # Aggregate outflows for this day
            day_outflow_items = outflows_by_date.get(day_date, [])
            day_outflows = sum((Decimal(str(x["amount"])) for x in day_outflow_items), Decimal("0.00"))

            closing_balance = opening_balance + day_inflows - day_outflows
            current_balance = closing_balance

            total_inflows += day_inflows
            total_outflows += day_outflows

            is_deficit = closing_balance < Decimal("0.00")
            is_buffer_breach = (closing_balance < safety_thresh) and not is_deficit

            if is_deficit:
                deficit_count += 1
            elif is_buffer_breach:
                buffer_breach_count += 1

            if closing_balance < min_projected_cash:
                min_projected_cash = closing_balance
                min_cash_date = day_date

            point = DailyCashPoint(
                timeline_date=day_date,
                opening_balance=opening_balance,
                inflows=day_inflows,
                outflows=day_outflows,
                closing_balance=closing_balance,
                is_buffer_breach=is_buffer_breach,
                is_deficit=is_deficit,
                inflow_items=day_inflow_items,
                outflow_items=day_outflow_items,
            )
            timeline_points.append(point)

        return {
            "anchor_date": anchor_date.isoformat(),
            "starting_cash": float(starting_cash),
            "safety_threshold": float(safety_thresh),
            "days": days,
            "timeline": [p.to_dict() for p in timeline_points],
            "min_projected_cash": float(min_projected_cash),
            "min_cash_date": min_cash_date.isoformat(),
            "total_projected_inflows": float(total_inflows),
            "total_projected_outflows": float(total_outflows),
            "net_projected_change": float(total_inflows - total_outflows),
            "ending_cash": float(current_balance),
            "buffer_breach_count": buffer_breach_count,
            "deficit_count": deficit_count,
            "has_buffer_breach": buffer_breach_count > 0,
            "has_deficit": deficit_count > 0,
        }
