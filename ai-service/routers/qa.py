from fastapi import APIRouter

from models.qa import ProjectQARequest, ProjectQAResponse, IndexRequest
from services.rag_service import answer_project_question, index_codebase


router = APIRouter()


@router.post("/project-qa", response_model=ProjectQAResponse)
async def project_qa_endpoint(payload: ProjectQARequest) -> ProjectQAResponse:
    return await answer_project_question(payload)


@router.post("/index-codebase")
async def index_codebase_endpoint(payload: IndexRequest):
    # This should probably be a background task in a real app, 
    # but for now we wait for it to complete.
    await index_codebase(payload.project_path)
    return {"status": "success", "message": f"Project {payload.project_path} indexed"}

