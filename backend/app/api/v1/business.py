from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from decimal import Decimal
from datetime import date, timedelta

from app.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.business import Business, BankCashBalance
from app.schemas.business import BusinessOut, BusinessUpdate, BankCashBalanceCreate, BankCashBalanceOut
from app.services.cashflow_service import CashFlowService

router = APIRouter(prefix="/business", tags=["Business"])

@router.get("/profile", response_model=BusinessOut)
def get_business_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    biz = db.query(Business).filter(Business.id == current_user.business_id).first()
    if not biz:
        raise HTTPException(status_code=404, detail="Business not found")

    cur_cash = CashFlowService.get_latest_cash_balance(db, biz.id)
    latest_bal = db.query(BankCashBalance).filter(
        BankCashBalance.business_id == biz.id
    ).order_by(BankCashBalance.as_of_date.desc()).first()

    return BusinessOut(
        id=biz.id,
        name=biz.name,
        currency=biz.currency,
        safety_cash_threshold=float(biz.safety_cash_threshold),
        current_cash=float(cur_cash),
        as_of_date=latest_bal.as_of_date.isoformat() if latest_bal else None,
        created_at=biz.created_at
    )

@router.put("/profile", response_model=BusinessOut)
def update_business_profile(
    update_data: BusinessUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    biz = db.query(Business).filter(Business.id == current_user.business_id).first()
    if not biz:
        raise HTTPException(status_code=404, detail="Business not found")

    if update_data.name is not None:
        biz.name = update_data.name
    if update_data.currency is not None:
        biz.currency = update_data.currency
    if update_data.safety_cash_threshold is not None:
        biz.safety_cash_threshold = Decimal(str(update_data.safety_cash_threshold))

    db.commit()
    db.refresh(biz)

    cur_cash = CashFlowService.get_latest_cash_balance(db, biz.id)
    latest_bal = db.query(BankCashBalance).filter(
        BankCashBalance.business_id == biz.id
    ).order_by(BankCashBalance.as_of_date.desc()).first()

    return BusinessOut(
        id=biz.id,
        name=biz.name,
        currency=biz.currency,
        safety_cash_threshold=float(biz.safety_cash_threshold),
        current_cash=float(cur_cash),
        as_of_date=latest_bal.as_of_date.isoformat() if latest_bal else None,
        created_at=biz.created_at
    )

@router.post("/opening-balance", response_model=BankCashBalanceOut)
def set_bank_cash_balance(
    balance_in: BankCashBalanceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    bal_date = balance_in.as_of_date or date.today()
    dec_amt = Decimal(str(balance_in.balance_amount))

    existing = db.query(BankCashBalance).filter(
        BankCashBalance.business_id == current_user.business_id,
        BankCashBalance.as_of_date == bal_date
    ).first()

    if existing:
        existing.balance_amount = dec_amt
        existing.notes = balance_in.notes
        db.commit()
        db.refresh(existing)
        return existing
    else:
        new_bal = BankCashBalance(
            business_id=current_user.business_id,
            as_of_date=bal_date,
            balance_amount=dec_amt,
            notes=balance_in.notes
        )
        db.add(new_bal)
        db.commit()
        db.refresh(new_bal)
        return new_bal

@router.post("/load-demo-data")
def load_demo_data(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from app.models.customer import Customer
    from app.models.supplier import Supplier
    from app.models.invoice import ReceivableInvoice
    from app.models.bill import PayableBill
    from app.models.expense import RecurringExpense
    from app.models.payment_history import HistoricalPayment
    from app.models.action_item import ActionItem

    biz_id = current_user.business_id
    biz = db.query(Business).filter(Business.id == biz_id).first()
    if not biz:
        raise HTTPException(status_code=404, detail="Business not found")

    # 1. Update business parameters
    biz.name = "Sri Lakshmi Components"
    biz.currency = "INR"
    biz.safety_cash_threshold = Decimal("150000.00")

    # 2. Set opening balance (₹5,00,000)
    today = date.today()
    bal = db.query(BankCashBalance).filter(
        BankCashBalance.business_id == biz_id,
        BankCashBalance.as_of_date == today
    ).first()
    if bal:
        bal.balance_amount = Decimal("500000.00")
    else:
        bal = BankCashBalance(
            business_id=biz_id,
            as_of_date=today,
            balance_amount=Decimal("500000.00"),
            notes="Sri Lakshmi Components reference starting cash"
        )
        db.add(bal)

    # 3. Setup Customers
    customers_data = [
        {"name": "Sundaram Motors", "credit_days": 30, "delay_days": 20},
        {"name": "Ashok Auto Corp", "credit_days": 30, "delay_days": 10},
        {"name": "Bharat Heavy Gear", "credit_days": 30, "delay_days": 5},
    ]
    cust_map = {}
    for c_info in customers_data:
        c = db.query(Customer).filter(Customer.business_id == biz_id, Customer.name == c_info["name"]).first()
        if not c:
            c = Customer(business_id=biz_id, name=c_info["name"], standard_credit_days=c_info["credit_days"])
            db.add(c)
            db.flush()
        cust_map[c_info["name"]] = c

        # Insert historical payment to establish delay habit
        existing_hist = db.query(HistoricalPayment).filter(
            HistoricalPayment.business_id == biz_id,
            HistoricalPayment.customer_id == c.id
        ).first()
        if not existing_hist:
            hist = HistoricalPayment(
                business_id=biz_id,
                customer_id=c.id,
                invoice_number=f"HIST-{c_info['name'][:3].upper()}",
                due_date=date(2026, 8, 1),
                settled_date=date(2026, 8, 1 + c_info["delay_days"]),
                amount_settled=Decimal("100000.00"),
                delay_days=c_info["delay_days"]
            )
            db.add(hist)

    # 4. Setup Invoices
    # Calculate dates relative to today
    invoices_data = [
        ("INV-801", "Sundaram Motors", today - timedelta(days=45), today - timedelta(days=15), Decimal("180000.00"), today + timedelta(days=5)),
        ("INV-802", "Ashok Auto Corp", today - timedelta(days=30), today, Decimal("250000.00"), today + timedelta(days=11)),
        ("INV-803", "Bharat Heavy Gear", today - timedelta(days=20), today + timedelta(days=10), Decimal("120000.00"), today + timedelta(days=15)),
        ("INV-804", "Sundaram Motors", today - timedelta(days=10), today + timedelta(days=20), Decimal("300000.00"), today + timedelta(days=40)),
    ]
    for inv_num, cust_n, inv_d, due_d, amt, exp_d in invoices_data:
        existing_inv = db.query(ReceivableInvoice).filter(
            ReceivableInvoice.business_id == biz_id,
            ReceivableInvoice.invoice_number == inv_num
        ).first()
        if not existing_inv:
            inv = ReceivableInvoice(
                business_id=biz_id,
                customer_id=cust_map[cust_n].id,
                invoice_number=inv_num,
                invoice_date=inv_d,
                due_date=due_d,
                original_amount=amt,
                paid_amount=Decimal("0.00"),
                outstanding_balance=amt,
                payment_status="UNPAID",
                expected_payment_date=exp_d
            )
            db.add(inv)

    # 5. Setup Suppliers
    suppliers_data = ["Precision Steel Tubes", "Om Carbide Tools", "Apex Heat Treaters"]
    supp_map = {}
    for s_name in suppliers_data:
        s = db.query(Supplier).filter(Supplier.business_id == biz_id, Supplier.name == s_name).first()
        if not s:
            s = Supplier(business_id=biz_id, name=s_name, standard_payment_days=30)
            db.add(s)
            db.flush()
        supp_map[s_name] = s

    # 6. Setup Bills
    bills_data = [
        ("BILL-301", "Precision Steel Tubes", today - timedelta(days=25), today + timedelta(days=4), "RAW_MATERIAL", Decimal("220000.00"), today + timedelta(days=4)),
        ("BILL-302", "Om Carbide Tools", today - timedelta(days=20), today + timedelta(days=8), "RAW_MATERIAL", Decimal("90000.00"), today + timedelta(days=8)),
        ("BILL-303", "Apex Heat Treaters", today - timedelta(days=10), today + timedelta(days=18), "SERVICES", Decimal("60000.00"), today + timedelta(days=18)),
    ]
    for b_num, supp_n, b_d, due_d, cat, amt, sched_d in bills_data:
        existing_b = db.query(PayableBill).filter(
            PayableBill.business_id == biz_id,
            PayableBill.bill_number == b_num
        ).first()
        if not existing_b:
            b = PayableBill(
                business_id=biz_id,
                supplier_id=supp_map[supp_n].id,
                bill_number=b_num,
                bill_date=b_d,
                due_date=due_d,
                category=cat,
                original_amount=amt,
                paid_amount=Decimal("0.00"),
                outstanding_balance=amt,
                payment_status="UNPAID",
                scheduled_payment_date=sched_d
            )
            db.add(b)

    # 7. Setup Recurring Expenses
    expenses_data = [
        ("Factory Staff Payroll", "PAYROLL", Decimal("180000.00"), 7),
        ("Factory Shed Rent", "RENT", Decimal("50000.00"), 5),
        ("CNC Machine Loan EMI", "LOAN_EMI", Decimal("45000.00"), 10),
        ("GST Statutory Settlement", "STATUTORY_GST_TDS", Decimal("75000.00"), 20),
    ]
    for exp_title, exp_cat, exp_amt, exp_day in expenses_data:
        existing_exp = db.query(RecurringExpense).filter(
            RecurringExpense.business_id == biz_id,
            RecurringExpense.title == exp_title
        ).first()
        if not existing_exp:
            exp = RecurringExpense(
                business_id=biz_id,
                title=exp_title,
                category=exp_cat,
                amount=exp_amt,
                recurrence_day_of_month=exp_day,
                is_active=True
            )
            db.add(exp)

    db.commit()

    return {
        "success": True,
        "message": "Sri Lakshmi Components reference demo data successfully loaded!",
        "business_name": biz.name,
        "opening_cash": 500000.0,
        "safety_threshold": 150000.0,
        "receivables_count": 4,
        "payables_count": 3,
        "expenses_count": 4
    }
