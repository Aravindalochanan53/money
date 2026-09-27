import pytest
import uuid

def register_business(client):
    email = f"scenario_user_{uuid.uuid4().hex[:6]}@example.com"
    res = client.post("/api/v1/auth/register", json={
        "email": email,
        "password": "Password123!",
        "full_name": "Scenario Tester",
        "business_name": "Dynamic Casting Works",
        "starting_cash": 250000.0,
        "safety_cash_threshold": 60000.0
    })
    assert res.status_code == 201
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_persisted_scenarios_and_simulation(client):
    headers = register_business(client)

    # 1. Create a persisted scenario
    scen_payload = {
        "name": "Supply Shock Simulation",
        "description": "Customer delays 20 days and fuel expenses rise 15%",
        "changes": [
            {
                "change_type": "DELAY_RECEIVABLE",
                "parameters": {"delay_days": 20}
            },
            {
                "change_type": "EXPENSE_INCREASE",
                "parameters": {"increase_percentage": 15.0}
            }
        ]
    }

    create_res = client.post("/api/v1/scenarios", headers=headers, json=scen_payload)
    assert create_res.status_code == 201
    scen = create_res.json()
    assert scen["name"] == "Supply Shock Simulation"
    assert len(scen["changes"]) == 2
    scen_id = scen["id"]

    # 2. List scenarios
    list_res = client.get("/api/v1/scenarios", headers=headers)
    assert list_res.status_code == 200
    scens = list_res.json()
    assert len(scens) == 1
    assert scens[0]["id"] == scen_id

    # 3. Retrieve specific scenario
    get_res = client.get(f"/api/v1/scenarios/{scen_id}", headers=headers)
    assert get_res.status_code == 200
    assert get_res.json()["name"] == "Supply Shock Simulation"

    # 4. Simulate the scenario
    sim_res = client.post(f"/api/v1/scenarios/{scen_id}/simulate", headers=headers, json={})
    assert sim_res.status_code == 200
    sim_data = sim_res.json()
    assert "comparison_timeline" in sim_data
    assert len(sim_data["comparison_timeline"]) > 0

def test_affordability_evaluations(client):
    headers = register_business(client)

    # Business has 250,000 starting cash and 60,000 buffer (available buffer = 190,000)

    # Test 1: Small safe purchase of 50,000
    safe_check = client.post(
        "/api/v1/affordability/check",
        headers=headers,
        json={
            "purchase_title": "Office Laptops",
            "amount": 50000.0,
            "planned_date": "2026-10-05"
        }
    )
    assert safe_check.status_code == 200
    safe_data = safe_check.json()
    assert safe_data["verdict"] == "AFFORDABLE"
    assert safe_data["buffer_cushion"] >= 0

    # Test 2: Huge unsafe purchase of 300,000 (exceeds total starting cash)
    unsafe_check = client.post(
        "/api/v1/affordability/check",
        headers=headers,
        json={
            "purchase_title": "Heavy Hydraulic Press",
            "amount": 300000.0,
            "planned_date": "2026-10-05"
        }
    )
    assert unsafe_check.status_code == 200
    unsafe_data = unsafe_check.json()
    assert unsafe_data["verdict"] == "UNSAFE"
    assert unsafe_data["simulated_min_cash"] < 0
