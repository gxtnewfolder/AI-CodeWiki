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
    model: Optional[str] = None
    provider: str = "ollama"
    api_key: Optional[str] = None


class ImpactAnalysisResponse(BaseModel):
    analysis_md: str
    nodes: List[ImpactNode] = []
    edges: List[ImpactEdge] = []


class DepLink(BaseModel):
    file_path: str
    symbol: Optional[str] = None
    line: int = 0


class DepsResult(BaseModel):
    file_path: str
    language: str
    imports: List[DepLink] = []
    imported_by: List[DepLink] = []
    exports: List[str] = []


class ProjectGraphSyncRequest(BaseModel):
    project_path: str
    analysis: List[DepsResult]

