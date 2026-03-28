from typing import Literal

import httpx

from config import settings


ModelType = Literal["code", "general"]


def _resolve_model(model_type: ModelType) -> str:
    if model_type == "code":
        return settings.ollama_model_code
    return settings.ollama_model_general


async def generate_markdown_response(
    prompt: str, 
    model_type: ModelType = "code", 
    model_name: str = None,
    provider: str = "ollama",
    api_key: str = None
) -> str:
    """
    Generate markdown response using either local Ollama or Cloud LLMs (Gemini, etc.)
    """
    # 1. Fallback to settings if model_name is missing
    model = model_name if model_name else _resolve_model(model_type)

    # 2. Handle Google Gemini
    if provider == "gemini":
        if not api_key:
            return "Error: Gemini API Key is missing. Please configure it in settings."
        
        # Default Gemini model if unspecified
        gemini_model = model if model and "gemini" in model.lower() else "gemini-3-flash-preview"
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{gemini_model}:generateContent?key={api_key}"
        
        async with httpx.AsyncClient(timeout=300.0) as client:
            resp = await client.post(
                url,
                json={
                    "contents": [{
                        "parts": [{"text": prompt}]
                    }]
                }
            )
            if resp.status_code != 200:
                return f"Error from Gemini API: {resp.text}"
            
            data = resp.json()
            try:
                return data['candidates'][0]['content']['parts'][0]['text']
            except (KeyError, IndexError):
                return "Error: Unexpected response format from Gemini."

    # 3. Handle Local Ollama
    else:
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

