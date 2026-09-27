import pytest
import uuid

def register_business(client):
    email = f"finance_{uuid.uuid4().hex[:6]}@example.com"
    res = client.post("/api/v1/auth/register", json={
        "email": email,
        "password": "Password123!",
        "full_name": "Finance Lead",
        "business_name": "Precision Engineering Works",
        "starting_cash": 200000.0,
        "safety_cash_threshold": 50000.0
    })
    assert res.status_code == 201
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_invoice_and_bill_payment_traceability(client):
    headers = register_business(client)

    # 1. Import an invoice and a bill
    inv_csv = (
        "invoice_number,customer_name,invoice_date,due_date,original_amount,paid_amount,expected_date\n"
        "INV-TRACE-01,Sundaram Motors,2026-09-01,2026-10-01,100000.00,0.00,2026-10-05\n"
    )
    val_inv = client.post(
        "/api/v1/import/validate",
        headers=headers,
        files={"file": ("inv.csv", inv_csv.encode("utf-8"), "text/csv")},
        data={"file_type": "receivables"}
    )
    client.post("/api/v1/import/confirm", headers=headers, json={"batch_id": val_inv.json()["batch_id"]})

    bill_csv = (
        "bill_number,vendor_name,bill_date,due_date,total_amount,paid_amount,category\n"
        "BILL-TRACE-01,Apex Steel,2026-09-05,2026-10-02,40000.00,0.00,Raw Materials\n"
    )
    val_bill = client.post(
        "/api/v1/import/validate",
        headers=headers,
        files={"file": ("bill.csv", bill_csv.encode("utf-8"), "text/csv")},
        data={"file_type": "payables"}
    )
    client.post("/api/v1/import/confirm", headers=headers, json={"batch_id": val_bill.json()["batch_id"]})

    # Retrieve invoice & bill IDs
    invoices = client.get("/api/v1/financial/invoices", headers=headers).json()
    bills = client.get("/api/v1/financial/bills", headers=headers).json()
    assert len(invoices) == 1
    assert len(bills) == 1
    inv_id = invoices[0]["id"]
    bill_id = bills[0]["id"]

    # Initial cash: 200,000.0
    prof = client.get("/api/v1/business/profile", headers=headers).json()
    assert prof["current_cash"] == 200000.0

    # 2. Record incoming payment on invoice of 60,000 (partial)
    pay_inv_res = client.post(
        f"/api/v1/financial/invoices/{inv_id}/pay",
        headers=headers,
        json={
            "amount": 60000.0,
            "payment_date": "2026-09-20",
            "reference": "NEFT-SUNDARAM-60K",
            "notes": "Advance milestone payment"
        }
    )
    assert pay_inv_res.status_code == 200
    pay_record = pay_inv_res.json()
    assert pay_record["amount"] == 60000.0
    assert pay_record["payment_type"] == "INCOMING"

    # Verify invoice status updated
    updated_inv = client.get("/api/v1/financial/invoices", headers=headers).json()[0]
    assert updated_inv["paid_amount"] == 60000.0
    assert updated_inv["outstanding_balance"] == 40000.0
    assert updated_inv["payment_status"] == "PARTIALLY_PAID"

    # Business cash should have increased to 260,000.0
    prof = client.get("/api/v1/business/profile", headers=headers).json()
    assert prof["current_cash"] == 260000.0

    # 3. Record outgoing payment on bill of 40,000 (full)
    pay_bill_res = client.post(
        f"/api/v1/financial/bills/{bill_id}/pay",
        headers=headers,
        json={
            "amount": 40000.0,
            "payment_date": "2026-09-21",
            "reference": "RTGS-APEX-40K",
            "notes": "Full vendor clearance"
        }
    )
    assert pay_bill_res.status_code == 200
    bill_pay_record = pay_bill_res.json()
    assert bill_pay_record["amount"] == 40000.0
    assert bill_pay_record["payment_type"] == "OUTGOING"

    # Verify bill status updated
    updated_bill = client.get("/api/v1/financial/bills", headers=headers).json()[0]
    assert updated_bill["paid_amount"] == 40000.0
    assert updated_bill["outstanding_balance"] == 0.0
    assert updated_bill["payment_status"] == "PAID"

    # Business cash should have decreased to 220,000.0
    prof = client.get("/api/v1/business/profile", headers=headers).json()
    assert prof["current_cash"] == 220000.0

    # 4. Verify Payment Records
    payments_res = client.get("/api/v1/financial/payments", headers=headers)
    assert payments_res.status_code == 200
    payments = payments_res.json()
    assert len(payments) == 2
    directions = {p["payment_type"] for p in payments}
    assert directions == {"INCOMING", "OUTGOING"}

    # 5. Verify Cash Transactions Audit Trail
    tx_res = client.get("/api/v1/financial/transactions", headers=headers)
    assert tx_res.status_code == 200
    txs = tx_res.json()
    assert len(txs) == 2

    # Inflow tx linked to invoice
    inflow_tx = next(t for t in txs if t["direction"] == "INFLOW")
    assert inflow_tx["source_entity_type"].lower() in ["invoice", "invoice_payment"]
    assert inflow_tx["source_entity_id"] == inv_id
    assert inflow_tx["amount"] == 60000.0

    # Outflow tx linked to bill
    outflow_tx = next(t for t in txs if t["direction"] == "OUTFLOW")
    assert outflow_tx["source_entity_type"].lower() in ["bill", "bill_payment"]
    assert outflow_tx["source_entity_id"] == bill_id
    assert outflow_tx["amount"] == 40000.0
