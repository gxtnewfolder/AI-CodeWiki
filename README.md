# AI-CodeWiki ⚡

AI-CodeWiki is a powerful AI-driven codebase intelligence tool designed to help developers understand, navigate, and analyze complex codebases in minutes. By combining semantic search (RAG), graph-based dependency analysis, and local LLMs, it provides a comprehensive overview of any project.

## 🌟 Key Features

- **AI-Powered Code QA**: Ask complex questions about your codebase and get precise answers based on real context (using ChromaDB & Ollama).
- **Interactive Dependency Graphs**: Visualize file relationships with Mermaid-based interactive diagrams.
- **Impact Analysis**: Analyze the potential impact of changes across the codebase using Neo4j-powered graph analysis.
- **Instant Summaries**: Get AI-generated summaries for any file, explaining its purpose and logic at a glance.
- **Premium UI/UX**: Modern, glassmorphism-inspired interface with dark mode support.

## 🏗️ Architecture

AI-CodeWiki consists of three main components:

1.  **Backend (Go)**: A high-performance chi-based server handling project scanning, file management, and proxying AI requests.
2.  **AI Service (FastAPI)**: "The Brain" of the system, written in Python, managing:
    *   **RAG (Retrieval-Augmented Generation)** via ChromaDB.
    *   **Graph Analysis** via Neo4j.
    *   **Local LLM Integration** via Ollama.
3.  **Frontend (Angular)**: A premium web interface built with Spartan-NG icons (Lucide) and Tailwind CSS.

## 🚀 Getting Started

### Prerequisites

- **Go 1.21+**
- **Python 3.10+** (with `pip`)
- **Node.js & npm** (Angular CLI installed)
- **Ollama** (with `qwen2.5-coder:7b` model)
- **Neo4j** (Optional, for graph analysis)

### Running with Docker (Recommended)

The easiest way to run the entire stack (including Neo4j) is using Docker Compose:

```bash
docker-compose up --build
```

- **Frontend**: `http://localhost`
- **Backend API**: `http://localhost:8080`
- **Neo4j Dashboard**: `http://localhost:7474` (user: `neo4j`, pass: `password`)

> [!TIP]
> This setup connects to your **host's local Ollama** by default using `host.docker.internal`. Make sure Ollama is running on your machine.

### Manual Installation

## 🛠️ Configuration

Edit `ai-service/config.py` or use environment variables:
- `OLLAMA_BASE_URL`: Default `http://localhost:11434`
- `VECTOR_DB_URL`: Default `chromadb://localhost:8000`
- `BACKEND_BASE_URL`: Default `http://localhost:8080`

## 🔒 License

MIT License. See `LICENSE` for details.
