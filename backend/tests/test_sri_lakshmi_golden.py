import pytest
from datetime import date
from decimal import Decimal
from app.engines.cash_engine import CashEngine
from app.engines.risk_engine import RiskEngine
from app.engines.affordability_engine import AffordabilityEngine

def test_sri_lakshmi_components_golden_timeline():
    anchor = date(2026, 10, 1)
    starting_cash = Decimal("500000.00")
    safety_threshold = Decimal("150000.00")

    inflows = [
        # INV-801 Sundaram Motors: expected 2026-10-05 (due 09-15 + 20d delay)
        {"expected_date": date(2026, 10, 5), "amount": Decimal("180000.00"), "title": "INV-801 Sundaram Motors"},
        # INV-802 Ashok Auto Corp: expected 2026-10-11 (due 10-01 + 10d delay)
        {"expected_date": date(2026, 10, 11), "amount": Decimal("250000.00"), "title": "INV-802 Ashok Auto Corp"},
        # INV-803 Bharat Heavy Gear: expected 2026-10-15 (due 10-10 + 5d delay)
        {"expected_date": date(2026, 10, 15), "amount": Decimal("120000.00"), "title": "INV-803 Bharat Heavy Gear"},
    ]

    outflows = [
        # BILL-301 Precision Steel Tubes
        {"scheduled_date": date(2026, 10, 4), "amount": Decimal("220000.00"), "title": "BILL-301 Precision Steel"},
        # Factory Shed Rent (5th)
        {"scheduled_date": date(2026, 10, 5), "amount": Decimal("50000.00"), "title": "Factory Shed Rent"},
        # Staff Payroll (7th)
        {"scheduled_date": date(2026, 10, 7), "amount": Decimal("180000.00"), "title": "Factory Staff Payroll"},
        # BILL-302 Om Carbide Tools (8th)
        {"scheduled_date": date(2026, 10, 8), "amount": Decimal("90000.00"), "title": "BILL-302 Om Carbide"},
        # CNC Machine Loan EMI (10th)
        {"scheduled_date": date(2026, 10, 10), "amount": Decimal("45000.00"), "title": "CNC Loan EMI"},
        # BILL-303 Apex Heat Treaters (18th)
        {"scheduled_date": date(2026, 10, 18), "amount": Decimal("60000.00"), "title": "BILL-303 Apex Heat"},
        # GST Statutory Settlement (20th)
        {"scheduled_date": date(2026, 10, 20), "amount": Decimal("75000.00"), "title": "GST Settlement"},
    ]

    res = CashEngine.compute_timeline(
        anchor_date=anchor,
        starting_cash=starting_cash,
        safety_threshold=safety_threshold,
        inflow_events=inflows,
        outflow_events=outflows,
        days=25
    )

    timeline = {p["date"]: p["closing_balance"] for p in res["timeline"]}

    # Verify key deterministic milestone days
    assert timeline["2026-10-04"] == 280000.00
    assert timeline["2026-10-05"] == 410000.00
    assert timeline["2026-10-07"] == 230000.00
    assert timeline["2026-10-08"] == 140000.00 # Buffer breach (< 150000)
    assert timeline["2026-10-10"] == 95000.00  # Baseline dip
    assert timeline["2026-10-11"] == 345000.00
    assert timeline["2026-10-15"] == 465000.00
    assert timeline["2026-10-18"] == 405000.00
    assert timeline["2026-10-20"] == 330000.00

    assert res["min_projected_cash"] == 95000.00
    assert res["min_cash_date"] == "2026-10-10"
    assert res["has_buffer_breach"] is True
    assert res["has_deficit"] is False

    # Golden Affordability Test:
    # Attempt purchase of CNC Tool Presetter for ₹2,00,000 on Oct 6
    aff_res = AffordabilityEngine.evaluate_purchase(
        baseline_timeline=res["timeline"],
        safety_threshold=safety_threshold,
        planned_amount=Decimal("200000.00"),
        planned_date=date(2026, 10, 6),
        anchor_date=anchor
    )

    # Simulated Oct 10 balance should be 95,000 - 2,00,000 = -1,05,000
    assert aff_res["verdict"] == "UNSAFE"
    assert aff_res["simulated_min_cash"] == -105000.00
    assert aff_res["simulated_min_date"] == "2026-10-10"
    # Safe date recommended should be on or after Oct 11 when Ashok Auto clears
    assert aff_res["recommended_date"] in ["2026-10-11", "2026-10-12"]
