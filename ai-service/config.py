import os
from urllib.parse import urljoin


class Settings:
    """
    Minimal settings object without relying on Pydantic BaseSettings,
    เพื่อหลีกเลี่ยงปัญหา migration ระหว่าง Pydantic v1/v2.
    """

    app_name: str = "AI CodeWiki Microservice (The Brain)"

    # LLM Providers & Keys
    ollama_base_url: str
    ollama_model_code: str
    ollama_model_general: str
    gemini_api_key: str
    claude_api_key: str

    # Routing Models
    model_fast: str = "gemini-3-flash-preview"
    model_heavy: str = "claude-3-5-sonnet-20240620"

    # Backend (Go) base URL for deps API
    backend_base_url: str

    def __init__(self) -> None:
        self.ollama_base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        self.ollama_model_code = os.getenv("OLLAMA_MODEL_CODE", "qwen2.5-coder:7b")
        self.ollama_model_general = os.getenv("OLLAMA_MODEL_GENERAL", "qwen2.5-coder:7b")
        
        # API Keys from env
        self.gemini_api_key = os.getenv("GEMINI_API_KEY", "")
        self.claude_api_key = os.getenv("CLAUDE_API_KEY", "")

        self.vector_db_url = os.getenv("VECTOR_DB_URL", "chromadb://localhost:8000")
        self.graph_db_url = os.getenv("GRAPH_DB_URL", "bolt://localhost:7687")
        self.graph_db_user = os.getenv("GRAPH_DB_USER", "neo4j")
        self.graph_db_password = os.getenv("GRAPH_DB_PASSWORD", "password")

        self.backend_base_url = os.getenv("BACKEND_BASE_URL", "http://localhost:8080")

    def ollama_endpoint(self, path: str) -> str:
        return urljoin(self.ollama_base_url.rstrip("/") + "/", path.lstrip("/"))

    def backend_endpoint(self, path: str) -> str:
        return urljoin(self.backend_base_url.rstrip("/") + "/", path.lstrip("/"))


settings = Settings()

