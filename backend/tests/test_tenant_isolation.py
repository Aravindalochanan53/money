import pytest
import uuid

def register_business(client, name_suffix):
    email = f"owner_{name_suffix}_{uuid.uuid4().hex[:6]}@example.com"
    res = client.post("/api/v1/auth/register", json={
        "email": email,
        "password": "Password123!",
        "full_name": f"Owner {name_suffix}",
        "business_name": f"Enterprise {name_suffix}",
        "starting_cash": 100000.0,
        "safety_cash_threshold": 25000.0
    })
    assert res.status_code == 201
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_tenant_data_isolation(client):
    headers_a = register_business(client, "Alpha")
    headers_b = register_business(client, "Beta")

    # Alpha imports receivables
    csv_content = (
        "invoice_number,customer_name,invoice_date,due_date,original_amount,paid_amount,expected_date\n"
        "INV-ALPHA-01,Alpha Cust,2026-09-01,2026-10-01,50000.00,0.00,2026-10-05\n"
    )
    val_a = client.post(
        "/api/v1/import/validate",
        headers=headers_a,
        files={"file": ("alpha_inv.csv", csv_content.encode("utf-8"), "text/csv")},
        data={"file_type": "receivables"}
    )
    assert val_a.status_code == 200
    batch_a_id = val_a.json()["batch_id"]

    # Beta attempts to confirm Alpha's batch -> Must be 404 (not found in Beta's tenant)
    hack_conf = client.post(
        "/api/v1/import/confirm",
        headers=headers_b,
        json={"batch_id": batch_a_id}
    )
    assert hack_conf.status_code == 404

    # Alpha confirms its own batch
    conf_a = client.post(
        "/api/v1/import/confirm",
        headers=headers_a,
        json={"batch_id": batch_a_id}
    )
    assert conf_a.status_code == 200

    # Alpha creates a scenario
    scen_res = client.post(
        "/api/v1/scenarios",
        headers=headers_a,
        json={
            "name": "Alpha Stress Test",
            "description": "Tenant isolation test",
            "changes": [
                {"change_type": "DELAY_RECEIVABLE", "parameters": {"delay_days": 15}}
            ]
        }
    )
    assert scen_res.status_code == 201
    scen_a_id = scen_res.json()["id"]

    # Beta cannot see Alpha's invoices
    invs_b = client.get("/api/v1/financial/invoices", headers=headers_b)
    assert invs_b.status_code == 200
    assert len(invs_b.json()) == 0

    # Beta cannot see Alpha's scenarios
    scens_b = client.get("/api/v1/scenarios", headers=headers_b)
    assert scens_b.status_code == 200
    assert len(scens_b.json()) == 0

    # Beta cannot access Alpha's scenario by ID
    scen_get_b = client.get(f"/api/v1/scenarios/{scen_a_id}", headers=headers_b)
    assert scen_get_b.status_code == 404
