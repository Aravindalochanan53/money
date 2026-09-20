import pytest
from datetime import date
from decimal import Decimal
from app.engines.affordability_engine import AffordabilityEngine

def test_affordability_engine_verdicts():
    anchor = date(2026, 10, 1)
    safety_threshold = Decimal("50000.00")

    # Baseline daily balances:
    # 2026-10-02: 100000
    # 2026-10-03: 90000
    # 2026-10-04: 120000
    baseline_timeline = [
        {"date": "2026-10-02", "closing_balance": 100000.0},
        {"date": "2026-10-03", "closing_balance": 90000.0},
        {"date": "2026-10-04", "closing_balance": 120000.0},
        {"date": "2026-10-05", "closing_balance": 150000.0},
    ]

    # Test 1: AFFORDABLE (Cost: 20,000 on Oct 2)
    # Min simulated cash: 90000 - 20000 = 70000 >= 50000 threshold
    res_aff = AffordabilityEngine.evaluate_purchase(
        baseline_timeline=baseline_timeline,
        safety_threshold=safety_threshold,
        planned_amount=Decimal("20000.00"),
        planned_date=date(2026, 10, 2),
        anchor_date=anchor
    )
    assert res_aff["verdict"] == "AFFORDABLE"
    assert res_aff["simulated_min_cash"] == 70000.00
    assert res_aff["buffer_cushion"] == 20000.00

    # Test 2: RISKY (Buffer breach, Cost: 50,000 on Oct 2)
    # Min simulated cash: 90000 - 50000 = 40000 (< 50000 threshold, but >= 0)
    res_risk = AffordabilityEngine.evaluate_purchase(
        baseline_timeline=baseline_timeline,
        safety_threshold=safety_threshold,
        planned_amount=Decimal("50000.00"),
        planned_date=date(2026, 10, 2),
        anchor_date=anchor
    )
    assert res_risk["verdict"] == "RISKY"
    assert res_risk["simulated_min_cash"] == 40000.00
    assert res_risk["recommended_date"] == "2026-10-03"
    assert res_risk["buffer_safe_date"] == "2026-10-04"

    # Test 3: UNSAFE (Cash deficit, Cost: 100,000 on Oct 2)
    # Min simulated cash: 90000 - 100000 = -10000 (< 0)
    res_unsafe = AffordabilityEngine.evaluate_purchase(
        baseline_timeline=baseline_timeline,
        safety_threshold=safety_threshold,
        planned_amount=Decimal("100000.00"),
        planned_date=date(2026, 10, 2),
        anchor_date=anchor
    )
    assert res_unsafe["verdict"] == "UNSAFE"
    assert res_unsafe["simulated_min_cash"] == -10000.00
