## AI Microservice (The Brain)

Microservice นี้ทำหน้าที่เป็น **สมอง** ของระบบ AI-CodeWiki ตามสเปกใน `docs/spec-llm.md`:

- เชื่อมต่อ **Local LLM** ผ่าน Ollama
- ทำ **RAG** ด้วย Vector DB (เช่น Chroma/FAISS)
- ทำ **Graph-based reasoning** ด้วย Neo4j
- ให้บริการ endpoint ระดับสูงสำหรับ:
  - สรุปไฟล์เดี่ยว (On-Demand File Summary)
  - Project-level QA (ถามข้ามทั้งโปรเจกต์)
  - Dependency / Impact Analysis

### Run (dev)

```bash
pip install -r requirements.txt
uvicorn main:app --reload
```

จากนั้นเชื่อมต่อจาก Go Backend ตามที่ระบุใน `docs/spec-llm.md` (เช่น `/summarize-file`, `/project-qa`, `/impact`).

