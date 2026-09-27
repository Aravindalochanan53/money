from datetime import date, timedelta
from decimal import Decimal
from typing import List, Dict, Any, Optional
from app.engines.cash_engine import CashEngine

class ScenarioEngine:
    @staticmethod
    def simulate(
        anchor_date: date,
        starting_cash: Decimal,
        safety_threshold: Decimal,
        base_inflows: List[Dict[str, Any]],
        base_outflows: List[Dict[str, Any]],
        scenario_type: str,
        params: Dict[str, Any],
        days: int = 90
    ) -> Dict[str, Any]:
        """
        Non-destructively clones and modifies inflow/outflow events, then runs CashEngine.
        """
        modified_inflows = []
        for inf in base_inflows:
            item = dict(inf)
            if isinstance(item["expected_date"], str):
                item["expected_date"] = date.fromisoformat(item["expected_date"])
            item["amount"] = Decimal(str(item["amount"]))
            modified_inflows.append(item)

        modified_outflows = []
        for out in base_outflows:
            item = dict(out)
            if isinstance(item["scheduled_date"], str):
                item["scheduled_date"] = date.fromisoformat(item["scheduled_date"])
            item["amount"] = Decimal(str(item["amount"]))
            modified_outflows.append(item)

        scenario_name = params.get("name", "Custom Scenario")
        scenario_description = ""

        if scenario_type == "DELAY_CUSTOMER_PAYMENT":
            customer_id = params.get("customer_id")
            customer_name = params.get("customer_name", "Customer")
            delay_days = int(params.get("delay_days", 15))
            scenario_description = f"Delay all collections from {customer_name} by {delay_days} days."

            for item in modified_inflows:
                if str(item.get("customer_id")) == str(customer_id) or item.get("customer_name") == customer_name:
                    item["expected_date"] = item["expected_date"] + timedelta(days=delay_days)

        elif scenario_type == "REDUCE_COLLECTIONS_PERCENT":
            drop_pct = Decimal(str(params.get("drop_percent", 20)))
            multiplier = Decimal("1.00") - (drop_pct / Decimal("100.00"))
            scenario_description = f"Reduce all expected customer collections across the board by {drop_pct}%."

            for item in modified_inflows:
                item["amount"] = round(item["amount"] * multiplier, 2)

        elif scenario_type == "UNPLANNED_EXPENSE":
            expense_amt = Decimal(str(params.get("amount", 100000)))
            exp_date = params.get("expense_date")
            if isinstance(exp_date, str):
                exp_date = date.fromisoformat(exp_date)
            expense_title = params.get("title", "Unplanned Expense")
            scenario_description = f"Incur unplanned expense of ₹{expense_amt:,.2f} on {exp_date.isoformat()} ({expense_title})."

            modified_outflows.append({
                "title": expense_title,
                "amount": expense_amt,
                "scheduled_date": exp_date,
                "category": "UNPLANNED"
            })

        elif scenario_type == "POSTPONE_SUPPLIER_PAYABLE":
            supplier_id = params.get("supplier_id")
            supplier_name = params.get("supplier_name", "Supplier")
            postpone_days = int(params.get("postpone_days", 15))
            scenario_description = f"Postpone payments to supplier {supplier_name} by {postpone_days} days."

            for item in modified_outflows:
                if str(item.get("supplier_id")) == str(supplier_id) or item.get("supplier_name") == supplier_name:
                    item["scheduled_date"] = item["scheduled_date"] + timedelta(days=postpone_days)

        elif scenario_type == "CUSTOM":
            scenario_description = params.get("description", "Custom scenario simulation.")
            if "delay_days" in params:
                delay_days = int(params["delay_days"])
                for item in modified_inflows:
                    item["expected_date"] = item["expected_date"] + timedelta(days=delay_days)
            if "increase_percentage" in params:
                pct = Decimal(str(params["increase_percentage"]))
                multiplier = Decimal("1.00") + (pct / Decimal("100.00"))
                for item in modified_outflows:
                    item["amount"] = round(item["amount"] * multiplier, 2)

        else:
            raise ValueError(f"Unsupported scenario_type: {scenario_type}")

        # Compute baseline timeline
        baseline_result = CashEngine.compute_timeline(
            anchor_date=anchor_date,
            starting_cash=starting_cash,
            safety_threshold=safety_threshold,
            inflow_events=base_inflows,
            outflow_events=base_outflows,
            days=days
        )

        # Compute simulated scenario timeline
        simulated_result = CashEngine.compute_timeline(
            anchor_date=anchor_date,
            starting_cash=starting_cash,
            safety_threshold=safety_threshold,
            inflow_events=modified_inflows,
            outflow_events=modified_outflows,
            days=days
        )

        # Build comparison points
        comparison_points = []
        base_points = baseline_result["timeline"]
        sim_points = simulated_result["timeline"]

        for b, s in zip(base_points, sim_points):
            comparison_points.append({
                "date": b["date"],
                "baseline_closing": b["closing_balance"],
                "simulated_closing": s["closing_balance"],
                "difference": round(s["closing_balance"] - b["closing_balance"], 2),
                "is_buffer_breach": s["is_buffer_breach"],
                "is_deficit": s["is_deficit"],
            })

        min_diff = simulated_result["min_projected_cash"] - baseline_result["min_projected_cash"]

        return {
            "scenario_name": scenario_name,
            "scenario_type": scenario_type,
            "scenario_description": scenario_description,
            "params": params,
            "baseline_min_cash": baseline_result["min_projected_cash"],
            "simulated_min_cash": simulated_result["min_projected_cash"],
            "min_cash_impact": round(min_diff, 2),
            "simulated_ending_cash": simulated_result["ending_cash"],
            "has_buffer_breach": simulated_result["has_buffer_breach"],
            "has_deficit": simulated_result["has_deficit"],
            "comparison_timeline": comparison_points,
        }
