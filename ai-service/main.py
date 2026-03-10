from fastapi import FastAPI

from routers import summary, qa, impact


app = FastAPI(
    title="AI CodeWiki Microservice (The Brain)",
    description="Python FastAPI service that connects to Local LLM via Ollama, RAG Vector DB, and Graph DB.",
    version="0.1.0",
)

app.include_router(summary.router, prefix="/api/v1", tags=["summary"])
app.include_router(qa.router, prefix="/api/v1", tags=["qa"])
app.include_router(impact.router, prefix="/api/v1", tags=["impact"])


@app.get("/health")
async def health_check() -> dict:
    return {"status": "ok"}

