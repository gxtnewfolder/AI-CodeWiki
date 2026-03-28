from pydantic import BaseModel
from typing import Optional


class FileSummaryRequest(BaseModel):
    project_path: str
    file_path: str
    file_content: str
    model: Optional[str] = None
    provider: str = "ollama"
    api_key: Optional[str] = None


class FileSummaryResponse(BaseModel):
    project_path: str
    file_path: str
    summary_md: str

