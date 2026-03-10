from typing import List
import os
import pathlib
import re

from models.qa import ProjectQARequest, ProjectQAResponse, QAContextSnippet
from services.ollama_client import generate_markdown_response
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
    RAG Phase 2: Use Vector DB for semantic search.
    """
    n_results = max(1, request.max_context_files or 5)
    results = vector_db.query(request.question, n_results=n_results)
    
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
    Index the codebase into ChromaDB.
    """
    project_root = pathlib.Path(project_path)
    if not project_root.exists():
        return
        
    vector_db.reset_collection()
    
    ids = []
    documents = []
    metadatas = []
    
    count = 0
    for root, dirs, files in os.walk(project_root):
        dirs[:] = [d for d in dirs if d not in {"node_modules", ".git", "dist", "build", "target", ".next", ".angular"}]
        
        for name in files:
            ext = pathlib.Path(name).suffix.lower()
            if ext not in CODE_EXTENSIONS:
                continue
                
            full_path = pathlib.Path(root) / name
            try:
                rel_path = str(full_path.relative_to(project_root))
            except ValueError:
                rel_path = str(full_path)
                
            try:
                with open(full_path, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()
            except OSError:
                continue
                
            # Naive chunking: split by line blocks or simple size
            # In a pro version, we'd use LangChain's RecursiveCharacterTextSplitter.from_language
            for i in range(0, len(content), CHUNK_SIZE - CHUNK_OVERLAP):
                chunk = content[i:i + CHUNK_SIZE]
                chunk_id = f"{rel_path}_{i}"
                
                ids.append(chunk_id)
                documents.append(chunk)
                metadatas.append({"file_path": rel_path, "offset": i})
                
                count += 1
                # Batch add every 100 chunks
                if len(ids) >= 100:
                    vector_db.add_documents(ids, documents, metadatas)
                    ids, documents, metadatas = [], [], []

    # Final batch
    if ids:
        vector_db.add_documents(ids, documents, metadatas)
        
    print(f"Index complete: {count} chunks indexed from {project_path}")


async def answer_project_question(request: ProjectQARequest) -> ProjectQAResponse:
    context_snippets = await _retrieve_context_for_question(request)

    joined_context = "\n\n".join(
        f"[{snippet.file_path}]\n{snippet.content_excerpt}" for snippet in context_snippets
    )

    prompt_parts = [PROJECT_QA_SYSTEM_PROMPT]
    prompt_parts.append(f"คำถามจากผู้ใช้:\n{request.question}")

    if joined_context:
        prompt_parts.append("Context ที่ดึงมาจากโปรเจกต์:")
        prompt_parts.append(joined_context)
    else:
        prompt_parts.append("ขณะนี้ยังไม่มี context จาก Vector DB (ใช้ความรู้จากโค้ดที่เห็นในคำถามเป็นหลัก).")

    prompt = "\n\n".join(prompt_parts)

    answer_md = await generate_markdown_response(prompt, model_type="general")

    return ProjectQAResponse(answer_md=answer_md, used_files=context_snippets or None)

