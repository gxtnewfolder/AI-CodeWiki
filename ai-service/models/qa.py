from pydantic import BaseModel
from typing import Optional, List


class QAContextSnippet(BaseModel):
    file_path: str
    content_excerpt: str


class ChatMessage(BaseModel):
    role: str   # 'user' or 'assistant'
    content: str


class ProjectQARequest(BaseModel):
    project_path: str
    question: str
    history: List[ChatMessage] = []
    max_context_files: int = 10
    model: Optional[str] = None
    provider: str = "ollama"
    api_key: Optional[str] = None


class IndexRequest(BaseModel):
    project_path: str
    model: Optional[str] = None
    provider: str = "ollama"
    api_key: Optional[str] = None


class ProjectQAResponse(BaseModel):
    answer_md: str
    used_files: Optional[List[QAContextSnippet]] = None

