from fastapi import APIRouter

from models.summary import FileSummaryRequest, FileSummaryResponse
from services.summary_service import summarize_file


router = APIRouter()


@router.post("/summarize-file", response_model=FileSummaryResponse)
async def summarize_file_endpoint(payload: FileSummaryRequest) -> FileSummaryResponse:
    return await summarize_file(payload)

