import uuid
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Optional, List, Tuple
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.invoice import ReceivableInvoice
from app.models.bill import PayableBill
from app.models.payment import PaymentRecord
from app.models.cash_transaction import CashTransaction
from app.models.business import BankCashBalance
from app.schemas.financial import PaymentCreate

def utc_now():
    return datetime.now(timezone.utc)

class PaymentService:
    @staticmethod
    def _update_bank_balance(db: Session, business_id: str, delta: Decimal, as_of: date):
        latest = db.query(BankCashBalance).filter(
            BankCashBalance.business_id == business_id
        ).order_by(BankCashBalance.as_of_date.desc(), BankCashBalance.created_at.desc()).first()

        current_amt = Decimal(str(latest.balance_amount)) if latest else Decimal("0.00")
        new_amt = current_amt + delta
        if new_amt < Decimal("0.00"):
            # Cash deficit can happen in reality, but clamp or record notes
            pass

        today_bal = db.query(BankCashBalance).filter(
            BankCashBalance.business_id == business_id,
            BankCashBalance.as_of_date == as_of
        ).first()

        if today_bal:
            today_bal.balance_amount = new_amt
        else:
            new_bal = BankCashBalance(
                id=str(uuid.uuid4()),
                business_id=business_id,
                as_of_date=as_of,
                balance_amount=new_amt,
                notes="Auto-updated from cash transaction",
                created_at=utc_now()
            )
            db.add(new_bal)

    @classmethod
    def record_invoice_payment(
        cls,
        db: Session,
        business_id: str,
        invoice_id: str,
        data: PaymentCreate
    ) -> Tuple[PaymentRecord, CashTransaction]:
        inv = db.query(ReceivableInvoice).filter(
            ReceivableInvoice.id == invoice_id,
            ReceivableInvoice.business_id == business_id
        ).first()

        if not inv:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Invoice '{invoice_id}' not found."
            )

        pay_amt = Decimal(str(data.amount))
        if pay_amt <= Decimal("0.00"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Payment amount must be positive."
            )

        cur_balance = Decimal(str(inv.outstanding_balance))
        if pay_amt > cur_balance:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Payment amount ₹{pay_amt} exceeds outstanding balance of ₹{cur_balance}."
            )

        pay_date = data.payment_date or date.today()

        # Update invoice
        new_paid = Decimal(str(inv.paid_amount)) + pay_amt
        new_balance = cur_balance - pay_amt
        inv.paid_amount = new_paid
        inv.outstanding_balance = new_balance
        if new_balance == Decimal("0.00"):
            inv.payment_status = "PAID"
        else:
            inv.payment_status = "PARTIALLY_PAID"

        # Create Payment Record
        payment = PaymentRecord(
            id=str(uuid.uuid4()),
            business_id=business_id,
            payment_type="INCOMING",
            payment_date=pay_date,
            amount=pay_amt,
            payment_method=data.payment_method or "BANK_TRANSFER",
            reference_number=data.reference_number,
            invoice_id=inv.id,
            notes=data.notes,
            created_at=utc_now()
        )
        db.add(payment)
        db.flush()

        # Create Cash Transaction traceable to invoice and payment
        cust_name = inv.customer.name if inv.customer else "Customer"
        cash_tx = CashTransaction(
            id=str(uuid.uuid4()),
            business_id=business_id,
            transaction_date=pay_date,
            direction="INFLOW",
            amount=pay_amt,
            category="INVOICE_COLLECTION",
            source_entity_type="invoice",
            source_entity_id=inv.id,
            payment_id=payment.id,
            description=f"Payment received for invoice {inv.invoice_number} from {cust_name}",
            created_at=utc_now()
        )
        db.add(cash_tx)

        # Update bank cash balance snapshot
        cls._update_bank_balance(db, business_id, delta=pay_amt, as_of=pay_date)

        db.commit()
        db.refresh(payment)
        db.refresh(cash_tx)
        return payment, cash_tx

    @classmethod
    def record_bill_payment(
        cls,
        db: Session,
        business_id: str,
        bill_id: str,
        data: PaymentCreate
    ) -> Tuple[PaymentRecord, CashTransaction]:
        bill = db.query(PayableBill).filter(
            PayableBill.id == bill_id,
            PayableBill.business_id == business_id
        ).first()

        if not bill:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Bill '{bill_id}' not found."
            )

        pay_amt = Decimal(str(data.amount))
        if pay_amt <= Decimal("0.00"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Payment amount must be positive."
            )

        cur_balance = Decimal(str(bill.outstanding_balance))
        if pay_amt > cur_balance:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Payment amount ₹{pay_amt} exceeds outstanding balance of ₹{cur_balance}."
            )

        pay_date = data.payment_date or date.today()

        # Update bill
        new_paid = Decimal(str(bill.paid_amount)) + pay_amt
        new_balance = cur_balance - pay_amt
        bill.paid_amount = new_paid
        bill.outstanding_balance = new_balance
        if new_balance == Decimal("0.00"):
            bill.payment_status = "PAID"
        else:
            bill.payment_status = "PARTIALLY_PAID"

        # Create Payment Record
        payment = PaymentRecord(
            id=str(uuid.uuid4()),
            business_id=business_id,
            payment_type="OUTGOING",
            payment_date=pay_date,
            amount=pay_amt,
            payment_method=data.payment_method or "BANK_TRANSFER",
            reference_number=data.reference_number,
            bill_id=bill.id,
            notes=data.notes,
            created_at=utc_now()
        )
        db.add(payment)
        db.flush()

        # Create Cash Transaction traceable to bill and payment
        supp_name = bill.supplier.name if bill.supplier else "Supplier"
        cash_tx = CashTransaction(
            id=str(uuid.uuid4()),
            business_id=business_id,
            transaction_date=pay_date,
            direction="OUTFLOW",
            amount=pay_amt,
            category="BILL_PAYMENT",
            source_entity_type="bill",
            source_entity_id=bill.id,
            payment_id=payment.id,
            description=f"Payment made for bill {bill.bill_number} to {supp_name}",
            created_at=utc_now()
        )
        db.add(cash_tx)

        # Update bank cash balance snapshot
        cls._update_bank_balance(db, business_id, delta=-pay_amt, as_of=pay_date)

        db.commit()
        db.refresh(payment)
        db.refresh(cash_tx)
        return payment, cash_tx
