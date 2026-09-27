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

    preview_res = IngestionService.validate_and_store_batch(
        db=db,
        business_id=current_user.business_id,
        file_bytes=contents,
        filename=file.filename or "upload.csv",
        file_type=file_type
    )
    return preview_res

@router.post("/confirm", response_model=IngestionConfirmResponse)
def confirm_import(
    req: IngestionConfirmRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not req.batch_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="batch_id is required. Client-supplied records cannot bypass server-side batch validation."
        )

    inserted, updated, file_type = IngestionService.confirm_batch(
        db=db,
        business_id=current_user.business_id,
        batch_id=req.batch_id
    )

    return IngestionConfirmResponse(
        batch_id=req.batch_id,
        success=True,
        file_type=file_type,
        inserted_count=inserted,
        updated_count=updated,
        message=f"Successfully imported {inserted} new records and updated {updated} existing records."
    )
