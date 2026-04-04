from typing import List
import os
import pathlib
import re

from models.qa import ProjectQARequest, ProjectQAResponse, QAContextSnippet
from services.ollama_client import route_and_generate
from services.cache_service import cache_service
from services.vector_db import vector_db

# Chunk size for code indexing
CHUNK_SIZE = 2000
CHUNK_OVERLAP = 200


PROJECT_QA_SYSTEM_PROMPT = """
คุณคือ Senior Software Architect ที่ช่วยตอบคำถามเกี่ยวกับโครงสร้างและ behavior ของทั้งโปรเจกต์
จะได้รับคำถามจากผู้ใช้พร้อม context ของไฟล์/โค้ดที่เกี่ยวข้อง (ถ้ามี)

กติกา:
- ตอบเป็น Markdown ภาษาไทยผสมอังกฤษ (technical terms เป็นอังกฤษ)
- เน้นอธิบายภาพรวม flow และชี้ไปที่ไฟล์/ส่วนสำคัญของโค้ด
- หลีกเลี่ยงการเดา ถ้าไม่มีข้อมูลให้บอกตรงๆ ว่าข้อมูลไม่พอ
- ห้ามมี code fence ครอบ markdown ภายนอก (ห้ามใช้ ``` ครอบทั้งคำตอบ)
""".strip()


CODE_EXTENSIONS = {
    ".go",
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".py",
    ".java",
    ".kt",
    ".rs",
    ".cs",
    ".md",
}


def _score_text(text: str, terms: list[str]) -> int:
    score = 0
    lower = text.lower()
    for t in terms:
        if len(t) < 3:
            continue
        score += lower.count(t)
    return score


async def _retrieve_context_for_question(request: ProjectQARequest) -> List[QAContextSnippet]:
    """
    RAG Phase 2: Use Vector DB for semantic search with project-specific filtering.
    """
    n_results = max(1, request.max_context_files or 5)
    # Filter by project_path to separate projects
    where = {"project_path": request.project_path}
    results = vector_db.query(request.question, n_results=n_results, where=where)
    
    snippets = []
    if results and results['documents']:
        # Results format from ChromaDB: {'documents': [[...]], 'metadatas': [[...]], ...}
        docs = results['documents'][0]
        meta = results['metadatas'][0]
        
        for d, m in zip(docs, meta):
            snippets.append(QAContextSnippet(
                file_path=m.get('file_path', 'unknown'),
                content_excerpt=d[:2000] # Use more of the chunk
            ))
            
    return snippets

async def index_codebase(project_path: str):
    """
    Index the codebase into ChromaDB with project-specific tagging.
    """
    project_root = pathlib.Path(project_path)
    if not project_root.exists():
        return
        
    # Only delete existing data for THIS project, not the entire DB
    print(f"Purging old vector data for project: {project_path}")
    vector_db.delete_project_data(project_path)
    
    ids = []
    documents = []
    metadatas = []
    
    # Folders to skip entirely
    SKIP_DIRS = {
        "node_modules", ".git", "dist", "build", "target", ".next", ".angular",
        ".agent", ".vscode", ".antigravity", "__pycache__", "venv", ".venv"
    }

    count = 0
    for root, dirs, files in os.walk(project_root):
        # Efficiently skip unwanted directories
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        
        for name in files:
            ext = pathlib.Path(name).suffix.lower()
            if ext not in CODE_EXTENSIONS:
                continue
                
            full_path = pathlib.Path(root) / name
            try:
                rel_path = str(full_path.relative_to(project_root))
            except ValueError:
                rel_path = str(full_path)
                
            # Second-level noise check for files (e.g. minified files or huge bundles)
            if any(x in rel_path.lower() for x in [".min.js", "bundle.js", "vendor/"]):
                continue

            try:
                with open(full_path, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()
            except OSError:
                continue
                
            # Naive chunking
            for i in range(0, len(content), CHUNK_SIZE - CHUNK_OVERLAP):
                chunk = content[i:i + CHUNK_SIZE]
                chunk_id = f"{project_path}_{rel_path}_{i}"
                
                ids.append(chunk_id)
                documents.append(chunk)
                metadatas.append({
                    "project_path": project_path,
                    "file_path": rel_path,
                    "offset": i
                })
                
                count += 1
                # Batch add every 200 chunks for better performance
                if len(ids) >= 200:
                    vector_db.add_documents(ids, documents, metadatas)
                    ids, documents, metadatas = [], [], []

    # Final batch
    if ids:
        vector_db.add_documents(ids, documents, metadatas)
        
    print(f"Index complete: {count} chunks indexed from {project_path}")


def strip_code_noise(content: str) -> str:
    """
    Remove comments and redundant whitespace to save tokens.
    """
    # Remove single line comments (basic for Go, JS, Py)
    content = re.sub(r'//.*', '', content)
    content = re.sub(r'#.*', '', content)
    # Remove multiple newlines
    content = re.sub(r'\n\s*\n', '\n', content)
    return content.strip()

async def answer_project_question(request: ProjectQARequest) -> ProjectQAResponse:
    # Rule 6: Check cache first
    cache_key = f"qa_{request.project_path}_{request.question}"
    cached_md = cache_service.get(cache_key)
    
    context_snippets = await _retrieve_context_for_question(request)

    if cached_md:
        return ProjectQAResponse(answer_md=cached_md, used_files=context_snippets or None)

    joined_context = "\n\n".join(
        f"[{snippet.file_path}]\n{strip_code_noise(snippet.content_excerpt)}" for snippet in context_snippets
    )

    prompt_parts = [PROJECT_QA_SYSTEM_PROMPT]
    prompt_parts.append(f"โปรเจกต์ที่สแกนอยู่: {request.project_path}")
    prompt_parts.append(f"คำถามจากผู้ใช้:\n{request.question}")

    if joined_context:
        prompt_parts.append("Context จากโปรเจกต์ (Cleaned):")
        prompt_parts.append(joined_context)
    else:
        prompt_parts.append("ขณะนี้ยังไม่มี context (ใช้ความรู้ทั่วไป).")

    prompt = "\n\n".join(prompt_parts)
    est_tokens = len(prompt) // 4

    answer_md = await route_and_generate(
        prompt, 
        task_type="rag",
        context_tokens=est_tokens
    )

    # Save to cache
    cache_service.set(cache_key, answer_md)

    return ProjectQAResponse(answer_md=answer_md, used_files=context_snippets or None)
