import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.config import settings
from app.database import engine, Base
import app.models  # Ensure all models are imported before create_all
from app.api.v1 import api_router

# Production schema changes are managed strictly via Alembic migrations.
# In local development test mode with SQLite, initialize tables only if running against local dev sqlite.
if settings.DATABASE_URL.startswith("sqlite") and settings.ENVIRONMENT.lower() in ("development", "test"):
    Base.metadata.create_all(bind=engine)


app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="The Cash-Flow Decision Engine for MSMEs. Know what your business can afford — before you spend."
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API v1 Router
app.include_router(api_router, prefix=settings.API_V1_PREFIX)

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "FlowCred Decision Engine", "version": "1.0.0"}

# Mount frontend if directory exists
frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend"))
if os.path.exists(frontend_dir):
    app.mount("/static", StaticFiles(directory=frontend_dir), name="static")

    @app.get("/")
    def serve_index():
        index_file = os.path.join(frontend_dir, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        return {"message": "FlowCred API active. Frontend index.html not yet initialized."}
