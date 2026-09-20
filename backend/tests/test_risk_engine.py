import pytest
from datetime import date
from decimal import Decimal
from app.engines.risk_engine import RiskEngine

def test_risk_engine_customer_scoring():
    anchor = date(2026, 10, 1)

    # Customer 1: Low risk, prompt payer (0 days delay), no overdue, low concentration
    c1_settlements = [
        {"due_date": date(2026, 8, 1), "settled_date": date(2026, 8, 1)},
        {"due_date": date(2026, 9, 1), "settled_date": date(2026, 9, 2)},
    ]
    c1_delay = RiskEngine.calculate_historical_delay(c1_settlements)
    assert c1_delay <= 5.0

    c1_invoices = [
        {"outstanding_balance": Decimal("20000.00"), "due_date": date(2026, 10, 15)},
    ]
    res1 = RiskEngine.score_customer(
        customer_id="cust-1",
        customer_name="Prompt Motors",
        avg_delay_days=c1_delay,
        invoices=c1_invoices,
        total_business_ar=Decimal("200000.00"),
        anchor_date=anchor
    )
    assert res1["risk_tier"] == "LOW"
    assert res1["risk_score"] <= 30.0

    # Customer 2: High risk (long delay, 45 days overdue, high concentration)
    c2_invoices = [
        {"outstanding_balance": Decimal("120000.00"), "due_date": date(2026, 8, 15)}, # DPD = 47 days
    ]
    res2 = RiskEngine.score_customer(
        customer_id="cust-2",
        customer_name="Chronic Late Corp",
        avg_delay_days=35.0, # 80 pts
        invoices=c2_invoices,
        total_business_ar=Decimal("200000.00"), # 60% concentration -> 100 pts
        anchor_date=anchor
    )
    assert res2["risk_tier"] == "HIGH"
    assert res2["risk_score"] >= 61.0
