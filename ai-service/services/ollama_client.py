from typing import Literal

import httpx

from config import settings


ModelType = Literal["code", "general", "impact", "summary"]


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
    Generate markdown response using local Ollama, Gemini, or Claude.
    """
    model = model_name if model_name else _resolve_model(model_type)

    # 1. Handle Claude (Heavy Reasoning)
    if provider == "claude":
        if not api_key: return "Error: Claude API Key missing."
        url = "https://api.anthropic.com/v1/messages"
        async with httpx.AsyncClient(timeout=300.0) as client:
            resp = await client.post(
                url,
                headers={
                    "x-api-key": api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json"
                },
                json={
                    "model": model,
                    "max_tokens": 4096,
                    "messages": [{"role": "user", "content": prompt}]
                }
            )
            if resp.status_code != 200: return f"Claude Error: {resp.text}"
            return resp.json()['content'][0]['text']

    # 2. Handle Google Gemini (Fast/Cheap)
    elif provider == "gemini":
        if not api_key: return "Error: Gemini API Key missing."
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        async with httpx.AsyncClient(timeout=300.0) as client:
            resp = await client.post(url, json={"contents": [{"parts": [{"text": prompt}]}]})
            if resp.status_code != 200: return f"Gemini Error: {resp.text}"
            return resp.json()['candidates'][0]['content']['parts'][0]['text']

    # 3. Handle Local Ollama (Zero Cost)
    else:
        url = settings.ollama_endpoint("/api/generate")
        async with httpx.AsyncClient(timeout=300.0) as client:
            response = await client.post(url, json={"model": model, "prompt": prompt, "stream": False})
            response.raise_for_status()
            return response.json().get("response", "")


async def route_and_generate(
    prompt: str,
    task_type: Literal["impact_analysis", "summary", "rag", "refactor"] = "rag",
    context_tokens: int = 0
) -> str:
    """
    Smart Router based on the optimization strategy.
    """
    # Use heavy reasoning (Claude) for complex tasks OR very large context
    if (task_type in ["impact_analysis", "refactor"] or context_tokens > 20000) and settings.claude_api_key:
        provider = "claude"
        model = settings.model_heavy
        key = settings.claude_api_key
    # Use fast/cheap reasoning (Gemini) for everything else
    elif settings.gemini_api_key:
        provider = "gemini"
        model = settings.model_fast
        key = settings.gemini_api_key
    # Fallback to local Ollama
    else:
        provider = "ollama"
        model = settings.ollama_model_general
        key = None

    return await generate_markdown_response(prompt, provider=provider, model_name=model, api_key=key)
