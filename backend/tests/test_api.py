import pytest
import uuid
from fastapi.testclient import TestClient
from app.main import app

def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_auth_and_tenant_isolation(client):
    run_id = uuid.uuid4().hex[:6]
    email_a = f"owner_a_{run_id}@factory.com"
    email_b = f"owner_b_{run_id}@trading.com"

    # Register Business A
    res_a = client.post("/api/v1/auth/register", json={
        "email": email_a,
        "password": "SecurePassword123!",
        "full_name": "Rajesh Sharma",
        "business_name": "Sri Lakshmi Components",
        "starting_cash": 500000.0,
        "safety_cash_threshold": 150000.0
    })
    assert res_a.status_code == 201
    token_a = res_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # Register Business B
    res_b = client.post("/api/v1/auth/register", json={
        "email": email_b,
        "password": "SecurePassword456!",
        "full_name": "Anil Gupta",
        "business_name": "Gupta Enterprises",
        "starting_cash": 200000.0,
        "safety_cash_threshold": 50000.0
    })
    assert res_b.status_code == 201
    token_b = res_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Business A checks profile
    prof_a = client.get("/api/v1/business/profile", headers=headers_a)
    assert prof_a.status_code == 200
    assert prof_a.json()["name"] == "Sri Lakshmi Components"
    assert prof_a.json()["current_cash"] == 500000.0
    assert prof_a.json()["safety_cash_threshold"] == 150000.0

    # Business B checks profile
    prof_b = client.get("/api/v1/business/profile", headers=headers_b)
    assert prof_b.status_code == 200
    assert prof_b.json()["name"] == "Gupta Enterprises"
    assert prof_b.json()["current_cash"] == 200000.0
    assert prof_b.json()["safety_cash_threshold"] == 50000.0

    # Test CSV Ingestion for Business A
    receivables_csv = (
        "invoice_number,customer_name,invoice_date,due_date,original_amount,paid_amount,expected_date\n"
        "INV-801,Sundaram Motors,2026-08-15,2026-09-15,180000.00,0.00,2026-10-05\n"
        "INV-802,Ashok Auto Corp,2026-09-01,2026-10-01,250000.00,0.00,2026-10-11\n"
    )
    val_res = client.post(
        "/api/v1/import/validate",
        headers=headers_a,
        files={"file": ("invoices.csv", receivables_csv.encode("utf-8"), "text/csv")},
        data={"file_type": "receivables"}
    )
    assert val_res.status_code == 200
    assert val_res.json()["valid_rows"] == 2
    assert val_res.json()["is_ready_to_import"] is True
    batch_id = val_res.json()["batch_id"]

    # Confirm Import using validated batch_id
    conf_res = client.post(
        "/api/v1/import/confirm",
        headers=headers_a,
        json={"batch_id": batch_id}
    )
    assert conf_res.status_code == 200
    assert conf_res.json()["inserted_count"] == 2

    # Business B should NOT see Business A's invoices
    invoices_b = client.get("/api/v1/financial/invoices", headers=headers_b)
    assert invoices_b.status_code == 200
    assert len(invoices_b.json()) == 0

    # Business A SHOULD see 2 invoices
    invoices_a = client.get("/api/v1/financial/invoices", headers=headers_a)
    assert invoices_a.status_code == 200
    assert len(invoices_a.json()) == 2
    assert invoices_a.json()[0]["invoice_number"] in ["INV-801", "INV-802"]

    # Test Affordability Endpoint for Business A
    aff_check = client.post(
        "/api/v1/affordability/check",
        headers=headers_a,
        json={
            "purchase_title": "CNC Tool Presetter",
            "amount": 200000.0,
            "planned_date": "2026-10-06"
        }
    )
    assert aff_check.status_code == 200
    assert aff_check.json()["verdict"] in ["AFFORDABLE", "RISKY", "UNSAFE"]
    assert "explanation" in aff_check.json()

    # Test Timeline Endpoint
    timeline_res = client.get("/api/v1/timeline?days=30", headers=headers_a)
    assert timeline_res.status_code == 200
    assert len(timeline_res.json()["timeline"]) == 30
    assert timeline_res.json()["starting_cash"] == 500000.0

    # Test Actions Endpoint
    actions_res = client.get("/api/v1/actions", headers=headers_a)
    assert actions_res.status_code == 200
    assert isinstance(actions_res.json(), list)

    # Test Load Demo Data Endpoint for Business B
    load_demo_res = client.post("/api/v1/business/load-demo-data", headers=headers_b)
    assert load_demo_res.status_code == 200
    assert load_demo_res.json()["business_name"] == "Sri Lakshmi Components"
    assert load_demo_res.json()["opening_cash"] == 500000.0
    assert load_demo_res.json()["receivables_count"] == 4
