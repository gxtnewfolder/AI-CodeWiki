from pydantic import BaseModel
from typing import Optional, List


class QAContextSnippet(BaseModel):
    file_path: str
    content_excerpt: str


class ProjectQARequest(BaseModel):
    project_path: str
    question: str
    max_context_files: int = 10


class IndexRequest(BaseModel):
    project_path: str


class ProjectQAResponse(BaseModel):
    answer_md: str
    used_files: Optional[List[QAContextSnippet]] = None

