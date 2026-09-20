from datetime import date
from decimal import Decimal
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

from app.models.business import Business
from app.models.affordability import AffordabilityQuery
from app.services.cashflow_service import CashFlowService
from app.engines.affordability_engine import AffordabilityEngine
from app.schemas.affordability import AffordabilityCheckRequest

class AffordabilityService:
    @classmethod
    def evaluate(
        cls,
        db: Session,
        business_id: str,
        request: AffordabilityCheckRequest,
        anchor_date: Optional[date] = None
    ) -> Dict[str, Any]:
        if anchor_date is None:
            anchor_date = date.today()

        business = db.query(Business).filter(Business.id == business_id).first()
        if not business:
            raise ValueError("Business not found")

        # Get baseline 90-day timeline
        baseline_res = CashFlowService.get_timeline(
            db=db,
            business_id=business_id,
            anchor_date=anchor_date,
            days=90,
            apply_risk_delay=True
        )

        planned_amt = Decimal(str(request.amount))
        safety_thresh = Decimal(str(business.safety_cash_threshold))

        eval_res = AffordabilityEngine.evaluate_purchase(
            baseline_timeline=baseline_res["timeline"],
            safety_threshold=safety_thresh,
            planned_amount=planned_amt,
            planned_date=request.planned_date,
            anchor_date=anchor_date
        )

        # Audit log in database
        rec_date = date.fromisoformat(eval_res["recommended_date"]) if eval_res["recommended_date"] else None
        audit_entry = AffordabilityQuery(
            business_id=business_id,
            purchase_title=request.purchase_title,
            amount=planned_amt,
            planned_date=request.planned_date,
            baseline_min_cash=Decimal(str(eval_res["baseline_min_cash"])),
            simulated_min_cash=Decimal(str(eval_res["simulated_min_cash"])),
            verdict=eval_res["verdict"],
            recommended_date=rec_date,
            explanation=eval_res["explanation"]
        )
        db.add(audit_entry)
        db.commit()

        return eval_res
