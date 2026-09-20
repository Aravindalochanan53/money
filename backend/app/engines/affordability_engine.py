from datetime import date, timedelta
from decimal import Decimal
from typing import List, Dict, Any, Optional

class AffordabilityEngine:
    @staticmethod
    def evaluate_purchase(
        baseline_timeline: List[Dict[str, Any]],
        safety_threshold: Decimal,
        planned_amount: Decimal,
        planned_date: date,
        anchor_date: date
    ) -> Dict[str, Any]:
        """
        Evaluates planned outflow against baseline daily cash timeline.
        Formula:
            C_t^{sim} = C_t - planned_amount for t >= planned_date
        """
        planned_amt = Decimal(str(planned_amount))
        safety_thresh = Decimal(str(safety_threshold))

        baseline_min = Decimal("Infinity")
        baseline_min_date = None

        simulated_timeline = []
        simulated_min = Decimal("Infinity")
        simulated_min_date = None

        for point in baseline_timeline:
            pt_date = point["date"]
            if isinstance(pt_date, str):
                pt_date = date.fromisoformat(pt_date)

            closing = Decimal(str(point["closing_balance"]))

            if closing < baseline_min:
                baseline_min = closing
                baseline_min_date = pt_date

            if pt_date >= planned_date:
                sim_closing = closing - planned_amt
            else:
                sim_closing = closing

            if sim_closing < simulated_min:
                simulated_min = sim_closing
                simulated_min_date = pt_date

            simulated_timeline.append({
                "date": pt_date.isoformat(),
                "baseline_closing": float(closing),
                "simulated_closing": float(sim_closing),
                "difference": float(sim_closing - closing),
                "is_buffer_breach": (sim_closing < safety_thresh) and (sim_closing >= Decimal("0.00")),
                "is_deficit": sim_closing < Decimal("0.00"),
            })

        # Determine verdict
        if simulated_min >= safety_thresh:
            verdict = "AFFORDABLE"
            status_code = "SAFE"
        elif simulated_min >= Decimal("0.00"):
            verdict = "RISKY"
            status_code = "BUFFER_BREACH"
        else:
            verdict = "UNSAFE"
            status_code = "CASH_DEFICIT"

        buffer_cushion = simulated_min - safety_thresh

        # Safe Date Recommendation Search
        recommended_date = None
        buffer_safe_date = None

        if verdict != "AFFORDABLE":
            for candidate_point in baseline_timeline:
                cand_date = candidate_point["date"]
                if isinstance(cand_date, str):
                    cand_date = date.fromisoformat(cand_date)

                if cand_date <= planned_date:
                    continue

                # Check minimum closing balance from cand_date onwards
                cand_min = Decimal("Infinity")
                for p in baseline_timeline:
                    d = p["date"]
                    if isinstance(d, str):
                        d = date.fromisoformat(d)
                    bal = Decimal(str(p["closing_balance"]))
                    if d >= cand_date:
                        bal -= planned_amt
                    if bal < cand_min:
                        cand_min = bal

                # First date that avoids cash deficit
                if cand_min >= Decimal("0.00") and recommended_date is None:
                    recommended_date = cand_date

                # First date that also preserves safety reserve
                if cand_min >= safety_thresh and buffer_safe_date is None:
                    buffer_safe_date = cand_date

                if recommended_date and buffer_safe_date:
                    break

        # Generate human-readable deterministic explanation
        if verdict == "AFFORDABLE":
            explanation = (
                f"You can safely afford this purchase of ₹{planned_amt:,.2f} on {planned_date.isoformat()}. "
                f"Your projected lowest balance will remain at ₹{simulated_min:,.2f}, which is "
                f"₹{buffer_cushion:,.2f} above your safety threshold of ₹{safety_thresh:,.2f}."
            )
        elif verdict == "RISKY":
            explanation = (
                f"Caution: Purchasing ₹{planned_amt:,.2f} on {planned_date.isoformat()} will breach your "
                f"safety cash threshold (₹{safety_thresh:,.2f}). Your cash dips to ₹{simulated_min:,.2f} "
                f"on {simulated_min_date.isoformat()} (shortfall of ₹{abs(buffer_cushion):,.2f} against your reserve)."
            )
            if buffer_safe_date:
                explanation += f" Consider rescheduling to {buffer_safe_date.isoformat()} to preserve your full safety cushion."
            elif recommended_date:
                explanation += f" Rescheduling to {recommended_date.isoformat()} keeps your account positive."
        else:
            deficit_amt = abs(simulated_min)
            explanation = (
                f"Unsafe: Purchasing ₹{planned_amt:,.2f} on {planned_date.isoformat()} causes a cash deficit! "
                f"Your account balance is projected to fall to -₹{deficit_amt:,.2f} on {simulated_min_date.isoformat()} "
                f"due to existing commitments."
            )
            if recommended_date:
                explanation += f" Earliest date avoiding a deficit is {recommended_date.isoformat()} (after customer collections)."
                if buffer_safe_date:
                    explanation += f" Complete safety reserve restored by {buffer_safe_date.isoformat()}."
            else:
                explanation += " Securing additional customer collections is required before committing."

        return {
            "verdict": verdict,
            "status_code": status_code,
            "planned_amount": float(planned_amt),
            "planned_date": planned_date.isoformat(),
            "safety_threshold": float(safety_thresh),
            "baseline_min_cash": float(baseline_min),
            "baseline_min_date": baseline_min_date.isoformat() if baseline_min_date else None,
            "simulated_min_cash": float(simulated_min),
            "simulated_min_date": simulated_min_date.isoformat() if simulated_min_date else None,
            "buffer_cushion": float(buffer_cushion),
            "recommended_date": recommended_date.isoformat() if recommended_date else None,
            "buffer_safe_date": buffer_safe_date.isoformat() if buffer_safe_date else None,
            "explanation": explanation,
            "simulated_timeline": simulated_timeline,
        }
