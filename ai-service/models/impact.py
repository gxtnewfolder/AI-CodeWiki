from pydantic import BaseModel
from typing import Optional, List


class ImpactNode(BaseModel):
    id: str
    label: str
    file_path: Optional[str] = None


class ImpactEdge(BaseModel):
    source: str
    target: str
    relation: str


class ImpactAnalysisRequest(BaseModel):
    project_path: str
    file_path: str
    question: Optional[str] = None


class ImpactAnalysisResponse(BaseModel):
    analysis_md: str
    nodes: List[ImpactNode] = []
    edges: List[ImpactEdge] = []

