from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from routers import summary, qa, impact

app = FastAPI(
    title="AI CodeWiki Microservice (The Brain)",
    description="Python FastAPI service that connects to Local LLM via Ollama, RAG Vector DB, and Graph DB.",
    version="0.1.0",
)

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    print(f"Validation Error Details: {exc.errors()}")
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors(), "body": exc.body},
    )

app.include_router(summary.router, prefix="/api/v1", tags=["summary"])
app.include_router(qa.router, prefix="/api/v1", tags=["qa"])
app.include_router(impact.router, prefix="/api/v1", tags=["impact"])


@app.get("/health")
async def health_check() -> dict:
    return {"status": "ok"}

