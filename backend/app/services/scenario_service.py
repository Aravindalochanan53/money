import json
import uuid
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.business import Business
from app.models.scenario import Scenario, ScenarioChange
from app.services.cashflow_service import CashFlowService
from app.engines.scenario_engine import ScenarioEngine
from app.schemas.scenario import ScenarioRequest, ScenarioCreate, ScenarioChangeCreate

def utc_now():
    return datetime.now(timezone.utc)

class ScenarioService:
    @classmethod
    def list_scenarios(cls, db: Session, business_id: str) -> List[Scenario]:
        return db.query(Scenario).filter(
            Scenario.business_id == business_id
        ).order_by(Scenario.created_at.desc()).all()

    @classmethod
    def get_scenario(cls, db: Session, business_id: str, scenario_id: str) -> Scenario:
        sc = db.query(Scenario).filter(
            Scenario.id == scenario_id,
            Scenario.business_id == business_id
        ).first()
        if not sc:
            raise HTTPException(status_code=404, detail="Scenario not found.")
        return sc

    @classmethod
    def create_scenario(
        cls,
        db: Session,
        business_id: str,
        user_id: Optional[str],
        data: ScenarioCreate
    ) -> Scenario:
        scenario = Scenario(
            id=str(uuid.uuid4()),
            business_id=business_id,
            name=data.name,
            description=data.description,
            scenario_type=data.scenario_type,
            status="ACTIVE",
            created_by_user_id=user_id,
            created_at=utc_now(),
            updated_at=utc_now()
        )
        db.add(scenario)
        db.flush()

        # If initial params provided, create an initial ScenarioChange
        if data.params:
            change = ScenarioChange(
                id=str(uuid.uuid4()),
                scenario_id=scenario.id,
                change_type=data.scenario_type,
                parameters_json=json.dumps(data.params),
                created_at=utc_now()
            )
            db.add(change)

        if data.changes:
            for ch in data.changes:
                change_row = ScenarioChange(
                    id=str(uuid.uuid4()),
                    scenario_id=scenario.id,
                    change_type=ch.change_type,
                    target_entity_type=ch.target_entity_type,
                    target_entity_id=ch.target_entity_id,
                    parameters_json=json.dumps(ch.parameters),
                    impact_amount=Decimal(str(ch.impact_amount)) if ch.impact_amount else None,
                    effective_date=ch.effective_date,
                    created_at=utc_now()
                )
                db.add(change_row)

        db.commit()
        db.refresh(scenario)
        return scenario

    @classmethod
    def delete_scenario(cls, db: Session, business_id: str, scenario_id: str) -> bool:
        sc = cls.get_scenario(db, business_id, scenario_id)
        db.delete(sc)
        db.commit()
        return True

    @classmethod
    def add_scenario_change(
        cls,
        db: Session,
        business_id: str,
        scenario_id: str,
        data: ScenarioChangeCreate
    ) -> ScenarioChange:
        sc = cls.get_scenario(db, business_id, scenario_id)
        change = ScenarioChange(
            id=str(uuid.uuid4()),
            scenario_id=sc.id,
            change_type=data.change_type,
            target_entity_type=data.target_entity_type,
            target_entity_id=data.target_entity_id,
            parameters_json=json.dumps(data.parameters),
            impact_amount=Decimal(str(data.impact_amount)) if data.impact_amount else None,
            effective_date=data.effective_date,
            created_at=utc_now()
        )
        db.add(change)
        sc.updated_at = utc_now()
        db.commit()
        db.refresh(change)
        return change

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
            raise HTTPException(status_code=404, detail="Business not found.")

        starting_cash = CashFlowService.get_latest_cash_balance(db, business_id)
        safety_thresh = Decimal(str(business.safety_cash_threshold))

        # Get base timeline events
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

        sim_res["scenario_id"] = request.scenario_id
        return sim_res

    @classmethod
    def simulate_persisted(
        cls,
        db: Session,
        business_id: str,
        scenario_id: str,
        days: int = 90,
        anchor_date: Optional[date] = None
    ) -> Dict[str, Any]:
        sc = cls.get_scenario(db, business_id, scenario_id)

        # Merge parameters from scenario changes
        combined_params: Dict[str, Any] = {"name": sc.name}
        for ch in sc.changes:
            try:
                ch_params = json.loads(ch.parameters_json)
                combined_params.update(ch_params)
            except Exception:
                pass

        req = ScenarioRequest(
            scenario_type=sc.scenario_type,
            params=combined_params,
            days=days,
            scenario_id=sc.id
        )
        return cls.simulate(db, business_id, req, anchor_date=anchor_date)
