import pytest
from datetime import date
from decimal import Decimal
from app.engines.cash_engine import CashEngine

def test_cash_engine_simple_projection():
    anchor = date(2026, 10, 1)
    starting_cash = Decimal("100000.00")
    safety_threshold = Decimal("25000.00")

    inflow_events = [
        {"expected_date": date(2026, 10, 5), "amount": Decimal("50000.00")},
        {"expected_date": date(2026, 10, 10), "amount": Decimal("30000.00")},
    ]

    outflow_events = [
        {"scheduled_date": date(2026, 10, 3), "amount": Decimal("40000.00")},
        {"scheduled_date": date(2026, 10, 8), "amount": Decimal("20000.00")},
    ]

    res = CashEngine.compute_timeline(
        anchor_date=anchor,
        starting_cash=starting_cash,
        safety_threshold=safety_threshold,
        inflow_events=inflow_events,
        outflow_events=outflow_events,
        days=10
    )

    assert res["starting_cash"] == 100000.00
    assert res["days"] == 10
    assert len(res["timeline"]) == 10

    # Day 1: 100000
    # Day 2: 100000
    # Day 3: 100000 - 40000 = 60000
    # Day 4: 60000
    # Day 5: 60000 + 50000 = 110000
    # Day 6: 110000
    # Day 7: 110000
    # Day 8: 110000 - 20000 = 90000
    # Day 9: 90000
    # Day 10: 90000 + 30000 = 120000
    timeline = {p["date"]: p["closing_balance"] for p in res["timeline"]}
    assert timeline["2026-10-02"] == 100000.00
    assert timeline["2026-10-03"] == 60000.00
    assert timeline["2026-10-05"] == 110000.00
    assert timeline["2026-10-08"] == 90000.00
    assert timeline["2026-10-10"] == 120000.00

    assert res["min_projected_cash"] == 60000.00
    assert res["min_cash_date"] == "2026-10-03"
    assert res["has_buffer_breach"] is False
    assert res["has_deficit"] is False

def test_cash_engine_buffer_breach_and_deficit():
    anchor = date(2026, 10, 1)
    starting_cash = Decimal("50000.00")
    safety_threshold = Decimal("30000.00")

    outflow_events = [
        {"scheduled_date": date(2026, 10, 2), "amount": Decimal("25000.00")}, # Bal: 25000 -> breach (<30000)
        {"scheduled_date": date(2026, 10, 4), "amount": Decimal("35000.00")}, # Bal: -10000 -> deficit (<0)
    ]

    res = CashEngine.compute_timeline(
        anchor_date=anchor,
        starting_cash=starting_cash,
        safety_threshold=safety_threshold,
        inflow_events=[],
        outflow_events=outflow_events,
        days=5
    )

    assert res["has_buffer_breach"] is True
    assert res["has_deficit"] is True
    assert res["min_projected_cash"] == -10000.00
