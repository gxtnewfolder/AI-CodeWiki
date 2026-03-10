from pydantic import BaseModel


class FileSummaryRequest(BaseModel):
    project_path: str
    file_path: str
    file_content: str


class FileSummaryResponse(BaseModel):
    project_path: str
    file_path: str
    summary_md: str

