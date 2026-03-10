from typing import Literal

import httpx

from config import settings


ModelType = Literal["code", "general"]


def _resolve_model(model_type: ModelType) -> str:
    if model_type == "code":
        return settings.ollama_model_code
    return settings.ollama_model_general


async def generate_markdown_response(prompt: str, model_type: ModelType = "code") -> str:
    """
    Call local Ollama and return plain markdown text.
    """
    model = _resolve_model(model_type)
    url = settings.ollama_endpoint("/api/generate")

    async with httpx.AsyncClient(timeout=300.0) as client:
        response = await client.post(
            url,
            json={
                "model": model,
                "prompt": prompt,
                "stream": False,
            },
        )
        response.raise_for_status()
        data = response.json()
        return data.get("response", "")

