import pytest
import uuid

def register_business(client):
    email = f"risk_user_{uuid.uuid4().hex[:6]}@example.com"
    res = client.post("/api/v1/auth/register", json={
        "email": email,
        "password": "Password123!",
        "full_name": "Risk Manager",
        "business_name": "Auto Precision Works",
        "starting_cash": 100000.0,
        "safety_cash_threshold": 40000.0
    })
    assert res.status_code == 201
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_cash_timeline_totals_and_buffer_breach(client):
    headers = register_business(client)

    # Add an invoice expected on day 5: +50,000
    inv_csv = (
        "invoice_number,customer_name,invoice_date,due_date,original_amount,paid_amount,expected_date\n"
        "INV-CW-01,Customer Alpha,2026-09-01,2026-10-01,50000.00,0.00,2026-10-05\n"
    )
    val_inv = client.post(
        "/api/v1/import/validate",
        headers=headers,
        files={"file": ("inv.csv", inv_csv.encode("utf-8"), "text/csv")},
        data={"file_type": "receivables"}
    )
    client.post("/api/v1/import/confirm", headers=headers, json={"batch_id": val_inv.json()["batch_id"]})

    # Add a large bill due on day 3: -80,000 (starting cash is 100k, so balance becomes 20k, which is < 40k safety threshold!)
    bill_csv = (
        "bill_number,vendor_name,bill_date,due_date,total_amount,paid_amount,category\n"
        "BILL-CW-01,Vendor Prime,2026-09-01,2026-10-03,80000.00,0.00,Raw Material\n"
    )
    val_bill = client.post(
        "/api/v1/import/validate",
        headers=headers,
        files={"file": ("bill.csv", bill_csv.encode("utf-8"), "text/csv")},
        data={"file_type": "payables"}
    )
    client.post("/api/v1/import/confirm", headers=headers, json={"batch_id": val_bill.json()["batch_id"]})

    # Query timeline with anchor 2026-10-01
    timeline_res = client.get("/api/v1/timeline?anchor_date=2026-10-01&days=10", headers=headers)
    assert timeline_res.status_code == 200
    data = timeline_res.json()

    assert data["starting_cash"] == 100000.0
    assert data["safety_threshold"] == 40000.0
    assert data["has_buffer_breach"] is True

    # Find day 3 (2026-10-03)
    day_3 = next(p for p in data["timeline"] if p["date"] == "2026-10-03")
    assert day_3["outflows"] == 80000.0
    assert day_3["closing_balance"] == 20000.0
    assert day_3["is_buffer_breach"] is True

    # Find day 5 (2026-10-05)
    day_5 = next(p for p in data["timeline"] if p["date"] == "2026-10-05")
    assert day_5["inflows"] == 50000.0
    assert day_5["closing_balance"] == 70000.0
    assert day_5["is_buffer_breach"] is False

def test_risk_alerts_generation_and_rules(client):
    headers = register_business(client)

    # Ingest an already-overdue invoice (due 2026-08-01 when current anchor is late 2026)
    inv_csv = (
        "invoice_number,customer_name,invoice_date,due_date,original_amount,paid_amount,expected_date\n"
        "INV-OVERDUE-99,Slow Payer Corp,2026-07-01,2026-08-01,75000.00,0.00,2026-08-15\n"
    )
    val_inv = client.post(
        "/api/v1/import/validate",
        headers=headers,
        files={"file": ("inv.csv", inv_csv.encode("utf-8"), "text/csv")},
        data={"file_type": "receivables"}
    )
    client.post("/api/v1/import/confirm", headers=headers, json={"batch_id": val_inv.json()["batch_id"]})

    # Query risk alerts
    alerts_res = client.get("/api/v1/risk/alerts", headers=headers)
    assert alerts_res.status_code == 200
    alerts = alerts_res.json()
    assert len(alerts) >= 1
    overdue_alert = next(a for a in alerts if "OVERDUE" in a["alert_type"])
    assert "Slow Payer Corp" in overdue_alert["title"] or "INV-OVERDUE-99" in overdue_alert["description"]
    assert overdue_alert["severity"] in ["HIGH", "CRITICAL"]

    # Query risk summary
    summary_res = client.get("/api/v1/risk/summary", headers=headers)
    assert summary_res.status_code == 200
    summary = summary_res.json()
    assert summary["total_overdue_amount"] == 75000.0
    assert len(summary["alerts"]) >= 1

    # Download / Export Risk Radar CSV
    export_res = client.get("/api/v1/risk/export", headers=headers)
    assert export_res.status_code == 200
    assert "text/csv" in export_res.headers.get("content-type", "")
    assert "attachment; filename=" in export_res.headers.get("content-disposition", "")
    assert "# FlowCred Receivable Risk Radar Export" in export_res.text
    assert "Invoice Number" in export_res.text
    assert "INV-OVERDUE-99" in export_res.text
    assert "Slow Payer Corp" in export_res.text

    # Verify download alias endpoint works identically
    download_res = client.get("/api/v1/risk/download", headers=headers)
    assert download_res.status_code == 200
    assert "INV-OVERDUE-99" in download_res.text
