import csv
import io
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from typing import List, Dict, Any, Tuple, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
import openpyxl

from app.models.customer import Customer
from app.models.supplier import Supplier
from app.models.invoice import ReceivableInvoice
from app.models.bill import PayableBill
from app.models.expense import RecurringExpense
from app.schemas.import_schema import IngestionPreviewResponse, ImportErrorDetail

class IngestionService:
    @staticmethod
    def _parse_date(val: Any) -> Optional[date]:
        if isinstance(val, (datetime, date)):
            return val.date() if isinstance(val, datetime) else val
        if not val or not str(val).strip():
            return None
        val_str = str(val).strip()
        for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%m/%d/%Y", "%Y/%m/%d"):
            try:
                return datetime.strptime(val_str, fmt).date()
            except ValueError:
                continue
        return None

    @staticmethod
    def _parse_decimal(val: Any) -> Optional[Decimal]:
        if val is None:
            return None
        val_str = str(val).strip().replace(",", "").replace("₹", "").replace("$", "")
        if not val_str:
            return None
        try:
            d = Decimal(val_str)
            return d
        except InvalidOperation:
            return None

    @classmethod
    def read_file_to_dicts(cls, file_bytes: bytes, filename: str) -> List[Dict[str, Any]]:
        filename_lower = filename.lower()
        rows = []
        if filename_lower.endswith(".csv"):
            text = file_bytes.decode("utf-8-sig", errors="replace")
            reader = csv.DictReader(io.StringIO(text))
            for r in reader:
                cleaned_row = {
                    k.strip().lower().replace(" ", "_"): v.strip() if v else ""
                    for k, v in r.items() if k
                }
                rows.append(cleaned_row)
        elif filename_lower.endswith((".xlsx", ".xls")):
            wb = openpyxl.load_workbook(filename=io.BytesIO(file_bytes), data_only=True)
            ws = wb.active
            header = []
            for cell in ws[1]:
                val = str(cell.value or "").strip().lower().replace(" ", "_")
                header.append(val)
            for row in ws.iter_rows(min_row=2, values_only=True):
                if not any(row):
                    continue
                row_dict = {}
                for col_idx, col_name in enumerate(header):
                    if col_name:
                        val = row[col_idx] if col_idx < len(row) else ""
                        row_dict[col_name] = val
                rows.append(row_dict)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unsupported file format. Please upload a .csv or .xlsx file."
            )
        return rows

    @classmethod
    def validate_dataset(
        cls,
        raw_rows: List[Dict[str, Any]],
        file_type: str
    ) -> IngestionPreviewResponse:
        total_rows = len(raw_rows)
        errors: List[ImportErrorDetail] = []
        preview_data: List[Dict[str, Any]] = []
        columns_detected = list(raw_rows[0].keys()) if raw_rows else []

        seen_identifiers = set()

        for idx, row in enumerate(raw_rows, start=1):
            row_errors = []
            normalized: Dict[str, Any] = {}

            if file_type == "receivables":
                inv_num = str(row.get("invoice_number", "")).strip()
                cust_name = str(row.get("customer_name", "") or row.get("customer", "")).strip()
                inv_date = cls._parse_date(row.get("invoice_date", "") or row.get("date", ""))
                due_date = cls._parse_date(row.get("due_date", ""))
                orig_amt = cls._parse_decimal(row.get("original_amount", "") or row.get("amount", ""))
                paid_amt = cls._parse_decimal(row.get("paid_amount", "0") or "0") or Decimal("0.00")
                expected_date = cls._parse_date(row.get("expected_date", "") or row.get("expected_payment_date", ""))

                if not inv_num:
                    row_errors.append("invoice_number is required.")
                elif inv_num in seen_identifiers:
                    row_errors.append(f"Duplicate invoice_number '{inv_num}' found in file.")
                seen_identifiers.add(inv_num)

                if not cust_name:
                    row_errors.append("customer_name is required.")
                if not inv_date:
                    row_errors.append("Valid invoice_date (YYYY-MM-DD) is required.")
                if not due_date:
                    row_errors.append("Valid due_date (YYYY-MM-DD) is required.")
                if inv_date and due_date and due_date < inv_date:
                    row_errors.append("due_date cannot be earlier than invoice_date.")
                if orig_amt is None or orig_amt <= Decimal("0.00"):
                    row_errors.append("original_amount must be a positive number.")
                if paid_amt < Decimal("0.00") or (orig_amt and paid_amt > orig_amt):
                    row_errors.append("paid_amount cannot be negative or greater than original_amount.")

                if expected_date is None and due_date is not None:
                    expected_date = due_date

                if not row_errors:
                    bal = orig_amt - paid_amt
                    st = "PAID" if bal == Decimal("0.00") else ("PARTIALLY_PAID" if paid_amt > 0 else "UNPAID")
                    normalized = {
                        "invoice_number": inv_num,
                        "customer_name": cust_name,
                        "invoice_date": inv_date.isoformat(),
                        "due_date": due_date.isoformat(),
                        "original_amount": float(orig_amt),
                        "paid_amount": float(paid_amt),
                        "outstanding_balance": float(bal),
                        "payment_status": st,
                        "expected_payment_date": expected_date.isoformat(),
                    }

            elif file_type == "payables":
                bill_num = str(row.get("bill_number", "")).strip()
                supp_name = str(row.get("supplier_name", "") or row.get("supplier", "")).strip()
                bill_date = cls._parse_date(row.get("bill_date", "") or row.get("date", ""))
                due_date = cls._parse_date(row.get("due_date", ""))
                orig_amt = cls._parse_decimal(row.get("amount", "") or row.get("original_amount", ""))
                paid_amt = cls._parse_decimal(row.get("paid_amount", "0") or "0") or Decimal("0.00")
                category = str(row.get("category", "RAW_MATERIAL")).strip().upper() or "RAW_MATERIAL"
                sched_date = cls._parse_date(row.get("scheduled_date", "") or row.get("scheduled_payment_date", ""))

                if not bill_num:
                    row_errors.append("bill_number is required.")
                elif bill_num in seen_identifiers:
                    row_errors.append(f"Duplicate bill_number '{bill_num}' found in file.")
                seen_identifiers.add(bill_num)

                if not supp_name:
                    row_errors.append("supplier_name is required.")
                if not bill_date:
                    row_errors.append("Valid bill_date (YYYY-MM-DD) is required.")
                if not due_date:
                    row_errors.append("Valid due_date (YYYY-MM-DD) is required.")
                if bill_date and due_date and due_date < bill_date:
                    row_errors.append("due_date cannot be earlier than bill_date.")
                if orig_amt is None or orig_amt <= Decimal("0.00"):
                    row_errors.append("amount must be a positive number.")
                if paid_amt < Decimal("0.00") or (orig_amt and paid_amt > orig_amt):
                    row_errors.append("paid_amount cannot be negative or greater than amount.")

                if sched_date is None and due_date is not None:
                    sched_date = due_date

                if not row_errors:
                    bal = orig_amt - paid_amt
                    st = "PAID" if bal == Decimal("0.00") else ("PARTIALLY_PAID" if paid_amt > 0 else "UNPAID")
                    normalized = {
                        "bill_number": bill_num,
                        "supplier_name": supp_name,
                        "bill_date": bill_date.isoformat(),
                        "due_date": due_date.isoformat(),
                        "category": category,
                        "original_amount": float(orig_amt),
                        "paid_amount": float(paid_amt),
                        "outstanding_balance": float(bal),
                        "payment_status": st,
                        "scheduled_payment_date": sched_date.isoformat(),
                    }

            elif file_type == "expenses":
                title = str(row.get("title", "")).strip()
                cat = str(row.get("category", "OTHER")).strip().upper()
                amt = cls._parse_decimal(row.get("amount", ""))
                try:
                    day_of_month = int(row.get("day_of_month", "") or row.get("day", 1))
                except (ValueError, TypeError):
                    day_of_month = None

                if not title:
                    row_errors.append("title is required.")
                if amt is None or amt <= Decimal("0.00"):
                    row_errors.append("amount must be a positive number.")
                if day_of_month is None or not (1 <= day_of_month <= 31):
                    row_errors.append("day_of_month must be an integer between 1 and 31.")

                if not row_errors:
                    normalized = {
                        "title": title,
                        "category": cat,
                        "amount": float(amt),
                        "recurrence_day_of_month": day_of_month,
                        "is_active": True,
                    }
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Unknown file_type: {file_type}"
                )

            if row_errors:
                for err in row_errors:
                    errors.append(ImportErrorDetail(
                        row_number=idx,
                        message=err,
                        raw_data=row
                    ))
            else:
                preview_data.append(normalized)

        valid_count = len(preview_data)
        error_count = len(set(e.row_number for e in errors))

        return IngestionPreviewResponse(
            file_type=file_type,
            total_rows=total_rows,
            valid_rows=valid_count,
            error_rows=error_count,
            columns_detected=columns_detected,
            preview_data=preview_data[:50],  # preview first 50
            errors=errors[:100],             # preview first 100 errors
            is_ready_to_import=(error_count == 0 and valid_count > 0)
        )

    @classmethod
    def commit_records(
        cls,
        db: Session,
        business_id: str,
        file_type: str,
        records: List[Dict[str, Any]]
    ) -> Tuple[int, int]:
        inserted = 0
        updated = 0

        if file_type == "receivables":
            for rec in records:
                cust_name = rec["customer_name"].strip()
                # Find or create customer
                cust = db.query(Customer).filter(
                    Customer.business_id == business_id,
                    Customer.name == cust_name
                ).first()
                if not cust:
                    cust = Customer(
                        business_id=business_id,
                        name=cust_name,
                        standard_credit_days=30
                    )
                    db.add(cust)
                    db.flush()

                # Upsert invoice
                existing = db.query(ReceivableInvoice).filter(
                    ReceivableInvoice.business_id == business_id,
                    ReceivableInvoice.invoice_number == rec["invoice_number"]
                ).first()

                orig_amt = Decimal(str(rec["original_amount"]))
                paid_amt = Decimal(str(rec.get("paid_amount", 0)))
                bal = Decimal(str(rec.get("outstanding_balance", orig_amt - paid_amt)))

                if existing:
                    existing.customer_id = cust.id
                    existing.invoice_date = date.fromisoformat(rec["invoice_date"])
                    existing.due_date = date.fromisoformat(rec["due_date"])
                    existing.original_amount = orig_amt
                    existing.paid_amount = paid_amt
                    existing.outstanding_balance = bal
                    existing.payment_status = rec["payment_status"]
                    existing.expected_payment_date = date.fromisoformat(rec["expected_payment_date"])
                    updated += 1
                else:
                    new_inv = ReceivableInvoice(
                        business_id=business_id,
                        customer_id=cust.id,
                        invoice_number=rec["invoice_number"],
                        invoice_date=date.fromisoformat(rec["invoice_date"]),
                        due_date=date.fromisoformat(rec["due_date"]),
                        original_amount=orig_amt,
                        paid_amount=paid_amt,
                        outstanding_balance=bal,
                        payment_status=rec["payment_status"],
                        expected_payment_date=date.fromisoformat(rec["expected_payment_date"])
                    )
                    db.add(new_inv)
                    inserted += 1

        elif file_type == "payables":
            for rec in records:
                supp_name = rec["supplier_name"].strip()
                supp = db.query(Supplier).filter(
                    Supplier.business_id == business_id,
                    Supplier.name == supp_name
                ).first()
                if not supp:
                    supp = Supplier(
                        business_id=business_id,
                        name=supp_name,
                        standard_payment_days=30
                    )
                    db.add(supp)
                    db.flush()

                existing = db.query(PayableBill).filter(
                    PayableBill.business_id == business_id,
                    PayableBill.bill_number == rec["bill_number"]
                ).first()

                orig_amt = Decimal(str(rec["original_amount"]))
                paid_amt = Decimal(str(rec.get("paid_amount", 0)))
                bal = Decimal(str(rec.get("outstanding_balance", orig_amt - paid_amt)))

                if existing:
                    existing.supplier_id = supp.id
                    existing.bill_date = date.fromisoformat(rec["bill_date"])
                    existing.due_date = date.fromisoformat(rec["due_date"])
                    existing.category = rec.get("category", "RAW_MATERIAL")
                    existing.original_amount = orig_amt
                    existing.paid_amount = paid_amt
                    existing.outstanding_balance = bal
                    existing.payment_status = rec["payment_status"]
                    existing.scheduled_payment_date = date.fromisoformat(rec["scheduled_payment_date"])
                    updated += 1
                else:
                    new_bill = PayableBill(
                        business_id=business_id,
                        supplier_id=supp.id,
                        bill_number=rec["bill_number"],
                        bill_date=date.fromisoformat(rec["bill_date"]),
                        due_date=date.fromisoformat(rec["due_date"]),
                        category=rec.get("category", "RAW_MATERIAL"),
                        original_amount=orig_amt,
                        paid_amount=paid_amt,
                        outstanding_balance=bal,
                        payment_status=rec["payment_status"],
                        scheduled_payment_date=date.fromisoformat(rec["scheduled_payment_date"])
                    )
                    db.add(new_bill)
                    inserted += 1

        elif file_type == "expenses":
            for rec in records:
                title = rec["title"].strip()
                amt = Decimal(str(rec["amount"]))
                day = int(rec["recurrence_day_of_month"])
                existing = db.query(RecurringExpense).filter(
                    RecurringExpense.business_id == business_id,
                    RecurringExpense.title == title
                ).first()

                if existing:
                    existing.category = rec.get("category", "OTHER")
                    existing.amount = amt
                    existing.recurrence_day_of_month = day
                    existing.is_active = True
                    updated += 1
                else:
                    new_exp = RecurringExpense(
                        business_id=business_id,
                        title=title,
                        category=rec.get("category", "OTHER"),
                        amount=amt,
                        recurrence_day_of_month=day,
                        is_active=True
                    )
                    db.add(new_exp)
                    inserted += 1

        db.commit()
        return inserted, updated
