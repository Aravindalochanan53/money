from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from datetime import date
from decimal import Decimal
from typing import List, Optional

from app.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.customer import Customer
from app.models.supplier import Supplier
from app.models.invoice import ReceivableInvoice
from app.models.bill import PayableBill
from app.models.expense import RecurringExpense
from app.schemas.financial import (
    InvoiceOut, InvoiceCreate, BillOut, BillCreate,
    ExpenseOut, ExpenseCreate, CustomerOut, SupplierOut
)

router = APIRouter(prefix="/financial", tags=["Financial Entities"])

# --- Invoices ---
@router.get("/invoices", response_model=List[InvoiceOut])
def get_invoices(
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(ReceivableInvoice).filter(ReceivableInvoice.business_id == current_user.business_id)
    if status_filter:
        query = query.filter(ReceivableInvoice.payment_status == status_filter.upper())
    invoices = query.order_by(ReceivableInvoice.due_date.asc()).all()

    today = date.today()
    results = []
    for inv in invoices:
        dpd = max(0, (today - inv.due_date).days)
        results.append(InvoiceOut(
            id=inv.id,
            customer_id=inv.customer_id,
            customer_name=inv.customer.name if inv.customer else "Unknown",
            invoice_number=inv.invoice_number,
            invoice_date=inv.invoice_date,
            due_date=inv.due_date,
            original_amount=float(inv.original_amount),
            paid_amount=float(inv.paid_amount),
            outstanding_balance=float(inv.outstanding_balance),
            payment_status=inv.payment_status,
            expected_payment_date=inv.expected_payment_date,
            days_past_due=dpd,
            is_overdue=(dpd > 0 and inv.payment_status != "PAID"),
            created_at=inv.created_at
        ))
    return results

# --- Bills ---
@router.get("/bills", response_model=List[BillOut])
def get_bills(
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(PayableBill).filter(PayableBill.business_id == current_user.business_id)
    if status_filter:
        query = query.filter(PayableBill.payment_status == status_filter.upper())
    bills = query.order_by(PayableBill.due_date.asc()).all()

    results = []
    for b in bills:
        results.append(BillOut(
            id=b.id,
            supplier_id=b.supplier_id,
            supplier_name=b.supplier.name if b.supplier else "Unknown",
            bill_number=b.bill_number,
            bill_date=b.bill_date,
            due_date=b.due_date,
            category=b.category,
            original_amount=float(b.original_amount),
            paid_amount=float(b.paid_amount),
            outstanding_balance=float(b.outstanding_balance),
            payment_status=b.payment_status,
            scheduled_payment_date=b.scheduled_payment_date,
            created_at=b.created_at
        ))
    return results

# --- Expenses ---
@router.get("/expenses", response_model=List[ExpenseOut])
def get_expenses(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    expenses = db.query(RecurringExpense).filter(
        RecurringExpense.business_id == current_user.business_id,
        RecurringExpense.is_active == True
    ).order_by(RecurringExpense.recurrence_day_of_month.asc()).all()

    return [
        ExpenseOut(
            id=e.id,
            title=e.title,
            category=e.category,
            amount=float(e.amount),
            recurrence_day_of_month=e.recurrence_day_of_month,
            is_active=e.is_active,
            created_at=e.created_at
        )
        for e in expenses
    ]

# --- Customers ---
@router.get("/customers", response_model=List[CustomerOut])
def get_customers(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(Customer).filter(Customer.business_id == current_user.business_id).all()

# --- Suppliers ---
@router.get("/suppliers", response_model=List[SupplierOut])
def get_suppliers(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(Supplier).filter(Supplier.business_id == current_user.business_id).all()
