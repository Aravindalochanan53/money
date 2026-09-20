from datetime import date
from decimal import Decimal
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

from app.models.business import Business
from app.services.cashflow_service import CashFlowService
from app.engines.scenario_engine import ScenarioEngine
from app.schemas.scenario import ScenarioRequest

class ScenarioService:
    @classmethod
    def simulate(
        cls,
        db: Session,
        business_id: str,
        request: ScenarioRequest,
        anchor_date: Optional[date] = None
    ) -> Dict[str, Any]:
        if anchor_date is None:
            anchor_date = date.today()

        business = db.query(Business).filter(Business.id == business_id).first()
        if not business:
            raise ValueError("Business not found")

        starting_cash = CashFlowService.get_latest_cash_balance(db, business_id)
        safety_thresh = Decimal(str(business.safety_cash_threshold))

        # Get raw events
        timeline_res = CashFlowService.get_timeline(
            db=db,
            business_id=business_id,
            anchor_date=anchor_date,
            days=request.days or 90,
            apply_risk_delay=True
        )

        sim_res = ScenarioEngine.simulate(
            anchor_date=anchor_date,
            starting_cash=starting_cash,
            safety_threshold=safety_thresh,
            base_inflows=timeline_res["raw_inflows"],
            base_outflows=timeline_res["raw_outflows"],
            scenario_type=request.scenario_type,
            params=request.params,
            days=request.days or 90
        )

        return sim_res
