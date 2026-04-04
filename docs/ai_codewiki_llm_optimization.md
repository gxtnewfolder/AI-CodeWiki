# ⚡ AI-CodeWiki: LLM Cost Optimization Strategy

## 🎯 Objective
Optimize LLM usage to:
- Reduce cost by 60–80%
- Maintain high-quality reasoning for complex tasks
- Scale efficiently for multiple users

---

# 🧠 1. Architecture Overview (LLM Layer)

Frontend (Angular)
        ↓
Backend (Go - Orchestrator)
        ↓
AI Brain (FastAPI)
        ↓
LLM Provider
   ├── Gemini (Default - Cheap)
   ├── Claude (Heavy Reasoning)
   └── Ollama (Local Dev)

---

# 💰 2. Cost Drivers

## High-cost operations:
- Impact Analysis (multi-file reasoning)
- Large context (10k–50k tokens)

## Medium-cost:
- File Summary

## Low-cost:
- RAG Search (if context limited)

---

# ⚙️ 3. Model Routing Strategy (Core Optimization)

## Rule-based routing (MVP)

```go
switch taskType {
case "impact_analysis":
    model = "claude-sonnet"
case "summary", "rag":
    model = "gemini-flash"
default:
    model = "gemini-flash"
}
```

## Token-aware routing (Recommended)

```go
if contextTokens > 20000 {
    model = "claude-sonnet"
} else {
    model = "gemini-flash"
}
```

## Hybrid routing (Best practice)

```go
if taskType == "impact_analysis" || contextTokens > 20000 {
    model = "claude-sonnet"
} else {
    model = "gemini-flash"
}
```

---

# 📊 4. Model Usage Policy

| Task | Model | Reason |
|------|------|--------|
| RAG Search | Gemini Flash | Cheap + fast |
| File Summary | Gemini Flash | Good enough quality |
| Impact Analysis | Claude Sonnet | Strong reasoning |
| Refactor Suggestion | Claude Sonnet | Complex logic |
| Dev / Offline | Ollama | Zero cost |

---

# 🧠 5. Prompt Optimization

- Use top-K chunks (3–5)
- Remove duplicate code
- Strip unnecessary comments

---

# 🗂️ 6. Caching Strategy

```go
cacheKey := hash(filePath + lastModified)

if cache.Exists(cacheKey) {
    return cache.Get(cacheKey)
}
```

Expected savings: 40–70%

---

# ⚡ 7. Performance Optimization

- Parallel embedding + graph queries
- Stream responses to frontend

```go
if claudeTimeout {
    fallbackToGemini()
}
```

---

# 🔁 8. Retry & Fallback

```go
try Claude
if error:
    fallback → Gemini
```

---

# 📉 9. Cost Estimation

| Strategy | Cost |
|----------|------|
| Gemini only | ~$0.12 |
| Claude only | ~$2.20 |
| Hybrid | ~$0.40–0.60 |

---

# 🚀 10. Final Recommendation

- Default: Gemini Flash
- Heavy reasoning: Claude Sonnet
- Dev: Ollama

---

# 🧠 TL;DR

Gemini = cheap execution  
Claude = reasoning engine  
You = orchestrator  
