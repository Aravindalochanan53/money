# FlowCred — MSME Cash-Flow Decision Engine

Know what your business can afford — before you spend.

## Architecture

```
React 19 + TypeScript + Vite  ──(Authenticated JSON REST)──>  FastAPI  ──(SQLAlchemy 2.0)──>  PostgreSQL 16
```

- **Frontend**: React 19, TypeScript, Tailwind CSS, Vite. Real API integration via `src/lib/api/client.ts`.
- **Backend**: FastAPI, Pydantic v2, Python 3.11+.
- **Database Layer**: PostgreSQL (documented default), SQLAlchemy 2.0 ORM with connection pooling, Alembic migrations.
- **Test Isolation**: SQLite in-memory fixture (`sqlite:///:memory:`) for fast automated CI/pytest runs without mutating development data.

---

## Quick Start Guide

### 1. Prerequisites
- Python 3.11+
- Node.js 18+ and npm
- Docker and Docker Compose (for PostgreSQL)

---

### 2. Environment Configuration

Copy the example environment files:

```bash
# Root environment config (for Docker Compose)
cp .env.example .env

# Backend environment config
cp backend/.env.example backend/.env
```

Key environment variables in `backend/.env`:
- `DATABASE_URL`: `postgresql://flowcred:flowcred_dev_password@localhost:5432/flowcred`
- `SECRET_KEY`: A secure 32+ character key for JWT token signing.
- `CORS_ORIGINS`: Explicit local origins (e.g., `["http://localhost:5173", "http://127.0.0.1:5173"]`).

---

### 3. Start PostgreSQL Database

Start the PostgreSQL 16 container with health check and persistent storage:

```bash
docker compose up -d
```

Verify container status:
```bash
docker compose ps
```

The database container includes:
- **Persistent Volume**: `flowcred_postgres_data`
- **Health Check**: `pg_isready -U flowcred -d flowcred`
- **Port**: `5432`

---

### 4. Run Alembic Database Migrations

Apply database migrations to set up the complete schema (17 tables):

```bash
cd backend
python -m alembic upgrade head
```

To inspect pending migrations offline:
```bash
python -m alembic upgrade head --sql
```

*Note: For local development testing without Docker, SQLite can be used by setting `DATABASE_URL=sqlite:///./flowcred.db` in `backend/.env`.*

---

### 5. Start Backend Service

```bash
cd backend
python -m uvicorn app.main:app --reload --port 8000
```

The FastAPI Swagger docs will be available at: `http://localhost:8000/docs`.

---

### 6. Start Frontend Application

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## Verification & Testing Commands

### Backend Automated Tests
Backend tests run against an isolated in-memory test database:
```bash
cd backend
python -m pytest -v
```

### Frontend Tests & Type Checking
```bash
# Run unit tests (Vitest)
npm test

# Run Oxlint linter
npm run lint

# Run TypeScript type check and production bundle build
npm run build
```
"# money" 
