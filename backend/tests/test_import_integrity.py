import pytest
import uuid

def register_business(client):
    email = f"importer_{uuid.uuid4().hex[:6]}@example.com"
    res = client.post("/api/v1/auth/register", json={
        "email": email,
        "password": "Password123!",
        "full_name": "Importer Test",
        "business_name": "Import Integrity Ltd",
        "starting_cash": 100000.0,
        "safety_cash_threshold": 20000.0
    })
    assert res.status_code == 201
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_intra_file_duplicate_detection(client):
    headers = register_business(client)

    # CSV with duplicate invoice_number in the same file
    csv_content = (
        "invoice_number,customer_name,invoice_date,due_date,original_amount,paid_amount,expected_date\n"
        "INV-DUP-100,Customer X,2026-09-01,2026-10-01,15000.00,0.00,2026-10-05\n"
        "INV-DUP-100,Customer X,2026-09-01,2026-10-01,15000.00,0.00,2026-10-05\n"
    )

    val_res = client.post(
        "/api/v1/import/validate",
        headers=headers,
        files={"file": ("invoices.csv", csv_content.encode("utf-8"), "text/csv")},
        data={"file_type": "receivables"}
    )
    assert val_res.status_code == 200
    data = val_res.json()
    assert data["total_rows"] == 2
    assert data["error_rows"] >= 1
    # Check that error mentions duplicate
    err_msgs = [e["message"] for e in data["errors"]]
    assert any("Duplicate invoice_number" in msg for msg in err_msgs)

def test_cross_db_duplicate_detection(client):
    headers = register_business(client)

    # First upload and confirm
    csv_1 = (
        "invoice_number,customer_name,invoice_date,due_date,original_amount,paid_amount,expected_date\n"
        "INV-EXISTING-01,Cust 1,2026-09-01,2026-10-01,20000.00,0.00,2026-10-05\n"
    )
    val_1 = client.post(
        "/api/v1/import/validate",
        headers=headers,
        files={"file": ("batch1.csv", csv_1.encode("utf-8"), "text/csv")},
        data={"file_type": "receivables"}
    )
    assert val_1.status_code == 200
    b_id = val_1.json()["batch_id"]

    conf_1 = client.post(
        "/api/v1/import/confirm",
        headers=headers,
        json={"batch_id": b_id}
    )
    assert conf_1.status_code == 200

    # Second upload with the SAME invoice_number
    csv_2 = (
        "invoice_number,customer_name,invoice_date,due_date,original_amount,paid_amount,expected_date\n"
        "INV-EXISTING-01,Cust 1,2026-09-01,2026-10-01,20000.00,0.00,2026-10-05\n"
    )
    val_2 = client.post(
        "/api/v1/import/validate",
        headers=headers,
        files={"file": ("batch2.csv", csv_2.encode("utf-8"), "text/csv")},
        data={"file_type": "receivables"}
    )
    assert val_2.status_code == 200
    data_2 = val_2.json()
    assert data_2["error_rows"] == 1
    err_msgs = [e["message"] for e in data_2["errors"]]
    assert any("already exists in system" in msg for msg in err_msgs)

def test_batch_tampering_and_replay_protection(client):
    headers = register_business(client)

    # Replay protection / Fake batch ID
    fake_batch_id = str(uuid.uuid4())
    res = client.post(
        "/api/v1/import/confirm",
        headers=headers,
        json={"batch_id": fake_batch_id}
    )
    assert res.status_code == 404

    # Valid batch import
    csv_content = (
        "invoice_number,customer_name,invoice_date,due_date,original_amount,paid_amount,expected_date\n"
        "INV-ONE-TIME,Cust One,2026-09-01,2026-10-01,30000.00,0.00,2026-10-05\n"
    )
    val_res = client.post(
        "/api/v1/import/validate",
        headers=headers,
        files={"file": ("batch.csv", csv_content.encode("utf-8"), "text/csv")},
        data={"file_type": "receivables"}
    )
    batch_id = val_res.json()["batch_id"]

    # First confirm succeeds
    conf_1 = client.post("/api/v1/import/confirm", headers=headers, json={"batch_id": batch_id})
    assert conf_1.status_code == 200
    assert conf_1.json()["inserted_count"] == 1

    # Second confirm (replay) fails
    conf_2 = client.post("/api/v1/import/confirm", headers=headers, json={"batch_id": batch_id})
    assert conf_2.status_code == 400
    assert "confirmed" in conf_2.json()["detail"].lower()
