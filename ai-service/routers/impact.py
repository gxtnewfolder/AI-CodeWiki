from fastapi import APIRouter

from models.impact import ImpactAnalysisRequest, ImpactAnalysisResponse
from services.graph_service import analyze_impact


router = APIRouter()


@router.post("/impact", response_model=ImpactAnalysisResponse)
async def impact_analysis_endpoint(payload: ImpactAnalysisRequest) -> ImpactAnalysisResponse:
    return await analyze_impact(payload)

