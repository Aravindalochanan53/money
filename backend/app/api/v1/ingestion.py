from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.import_schema import IngestionPreviewResponse, IngestionConfirmRequest, IngestionConfirmResponse
from app.services.ingestion_service import IngestionService

router = APIRouter(prefix="/import", tags=["Data Ingestion"])

@router.post("/validate", response_model=IngestionPreviewResponse)
async def validate_upload(
    file: UploadFile = File(...),
    file_type: str = Form(...),  # 'receivables', 'payables', 'expenses'
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    contents = await file.read()
    if not contents:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty."
        )

    raw_rows = IngestionService.read_file_to_dicts(contents, file.filename)
    if not raw_rows:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file contains no data rows."
        )

    preview_res = IngestionService.validate_dataset(raw_rows, file_type.lower())
    return preview_res

@router.post("/confirm", response_model=IngestionConfirmResponse)
def confirm_import(
    req: IngestionConfirmRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not req.records:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No records provided to confirm."
        )

    inserted, updated = IngestionService.commit_records(
        db=db,
        business_id=current_user.business_id,
        file_type=req.file_type.lower(),
        records=req.records
    )

    return IngestionConfirmResponse(
        success=True,
        file_type=req.file_type,
        inserted_count=inserted,
        updated_count=updated,
        message=f"Successfully imported {inserted} new records and updated {updated} existing records."
    )
