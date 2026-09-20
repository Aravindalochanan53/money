from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.business import router as business_router
from app.api.v1.ingestion import router as ingestion_router
from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.timeline import router as timeline_router
from app.api.v1.risk import router as risk_router
from app.api.v1.affordability import router as affordability_router
from app.api.v1.scenarios import router as scenarios_router
from app.api.v1.actions import router as actions_router
from app.api.v1.financial import router as financial_router

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(business_router)
api_router.include_router(ingestion_router)
api_router.include_router(dashboard_router)
api_router.include_router(timeline_router)
api_router.include_router(risk_router)
api_router.include_router(affordability_router)
api_router.include_router(scenarios_router)
api_router.include_router(actions_router)
api_router.include_router(financial_router)
