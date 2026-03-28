from fastapi import APIRouter

from models.impact import ImpactAnalysisRequest, ImpactAnalysisResponse, ProjectGraphSyncRequest
from services.graph_service import analyze_impact, sync_project_dependencies


router = APIRouter()


@router.post("/impact", response_model=ImpactAnalysisResponse)
async def impact_analysis_endpoint(payload: ImpactAnalysisRequest) -> ImpactAnalysisResponse:
    return await analyze_impact(payload)


@router.post("/sync-project-graph")
async def sync_project_graph_endpoint(payload: ProjectGraphSyncRequest):
    # This might be heavy, so we don't return anything fancy
    await sync_project_dependencies(payload)
    return {"status": "success", "message": "Project graph synchronized"}

