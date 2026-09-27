from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class ImportErrorDetail(BaseModel):
    row_number: int
    column: Optional[str] = None
    message: str
    raw_data: Dict[str, Any]

class IngestionPreviewResponse(BaseModel):
    batch_id: str
    file_type: str  # 'receivables', 'payables', 'expenses'
    filename: Optional[str] = None
    total_rows: int
    valid_rows: int
    error_rows: int
    duplicate_count: int = 0
    columns_detected: List[str]
    preview_data: List[Dict[str, Any]]
    errors: List[ImportErrorDetail]
    is_ready_to_import: bool

class IngestionConfirmRequest(BaseModel):
    batch_id: str
    # Optional legacy fallback, but never trusted without server-side validation
    file_type: Optional[str] = None
    records: Optional[List[Dict[str, Any]]] = None

class IngestionConfirmResponse(BaseModel):
    batch_id: str
    success: bool
    file_type: str
    inserted_count: int
    updated_count: int
    message: str
