# PLAN: AI-Powered Code Wiki

> สร้างแอปพลิเคชันสำหรับนักพัฒนา เพื่อใช้อ่านและทำความเข้าใจโครงสร้างโปรเจกต์ (Source Code) โดยใช้ AI ช่วยสรุปการทำงานของแต่ละไฟล์ในรูปแบบ Markdown พร้อมระบบ Caching

---

## Overview

**What:** IDE-like Web Application ที่ช่วยให้ทีม dev อ่าน/เข้าใจ codebase ได้เร็วขึ้น ด้วย AI Summary  
**Why:** ลดเวลาในการ onboard โปรเจกต์ใหม่ / ทำความเข้าใจ legacy code  
**Who:** ทีม dev 2-4 คน ใช้งานผ่าน browser ทั้ง local และ VM  

---

## Project Type

**WEB** — Angular Frontend + Go Backend (Separate Services)

---

## Success Criteria

| # | Criteria | Verification |
|---|----------|-------------|
| 1 | User เปิดเว็บ → เห็น File Tree ของโปรเจกต์ที่กำหนด | เลือก path → tree โหลดสำเร็จ |
| 2 | คลิกไฟล์ → AI สรุปเป็น Markdown (Cache ถ้ามี) | คลิกไฟล์เดิมซ้ำ → response เร็วขึ้น (cache hit) |
| 3 | รองรับ Multi-LLM (Gemini, OpenAI, Claude, Ollama) | เปลี่ยน provider ใน Settings → สรุปไฟล์สำเร็จ |
| 4 | Search/Bookmark/History ใช้งานได้ | ค้นหาไฟล์ → bookmark → เห็นใน history |
| 5 | Dark/Light Mode toggle | สลับ theme → UI อัปเดตทันที |
| 6 | Docker Compose `up` แล้วใช้งานได้ทันที | `docker compose up` → เข้า localhost สำเร็จ |
| 7 | Deploy บน VM (DigitalOcean) สำเร็จ | เข้า IP/domain → ใช้งานได้ |

---

## Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Frontend** | Angular v20+ (Standalone Components, Signals) | Latest Angular with modern APIs |
| **UI Components** | spartan-ng (shadcn/ui for Angular) | Copy-paste components, full code ownership, accessible |
| **CSS** | Tailwind CSS v4 | spartan-ng built on Tailwind, Dark Mode built-in |
| **Markdown** | ngx-markdown + highlight.js | Render MD + Syntax Highlighting |
| **Backend** | Go (Golang) + Chi router | ตาม Spec, Chi = lightweight, composable middleware |
| **Database** | SQLite (via go-sqlite3) | ตาม Spec, zero-config, embedded, portable |
| **AI Clients** | Multi-provider HTTP clients | Gemini, OpenAI, Claude REST APIs + Ollama local |
| **UI Reference** | Refero MCP | ดึง reference UI จากแอปชั้นนำ (เมื่อ subscription active) |
| **Analytics** | PostHog (Optional) | ตาม Spec |
| **Container** | Docker Compose | Frontend (nginx) + Backend (Go binary) |
| **Reverse Proxy** | Nginx (in Frontend container) | Serve Angular + Proxy API to Go backend |

### UI Component Strategy (spartan-ng)

spartan-ng ใช้ **Brain-Helm Architecture:**
- **Brain** (`@spartan-ng/brain`) — Logic, state, accessibility (headless)
- **Helm** (`@spartan-ng/helm`) — UI skin + Tailwind styling

Components ที่จะใช้:
| Component | Use Case |
|-----------|----------|
| `hlm-button` | Actions, submit, validate key |
| `hlm-input` | API key input, search bar |
| `hlm-select` | LLM provider selector |
| `hlm-tabs` | Sidebar tabs (Tree/Bookmarks/History) |
| `hlm-dialog` | Confirmation dialogs |
| `hlm-toast` | Success/error notifications |
| `hlm-scroll-area` | File tree scrolling |
| `hlm-separator` | Layout dividers |
| `hlm-badge` | File type labels |
| `hlm-card` | Settings sections, summary card |
| `hlm-switch` | Dark/Light mode toggle |
| `hlm-command` | Command palette (search) |

### Refero MCP Integration

> ⚠️ Refero MCP subscription ต้อง active ก่อนใช้งาน

เมื่อ subscription พร้อม ให้ใช้สำหรับ:
- ค้นหา **IDE-like layout** reference (VS Code, Cursor, Linear)
- ดึง **File Tree sidebar** best practices
- อ้างอิง **Settings page** patterns (API key configuration)
- ดึง **Empty state** / **Loading state** design references

---

## Architecture Decisions (ADRs)

### ADR-001: Monolith Go Backend (ไม่แยก Microservices)

| Option | Pros | Cons |
|--------|------|------|
| **Monolith Go** | Simple deploy, 1 binary, DB embedded | ถ้าโตมากต้อง refactor |
| Microservices | Scale แยกได้ | Over-engineering สำหรับ 2-4 users |

**Decision:** Monolith Go — 2-4 users ไม่ต้องการ distributed system  
**Revisit:** เมื่อ users > 20 หรือต้องการ horizontal scaling

---

### ADR-002: SQLite แทน PostgreSQL

| Option | Pros | Cons |
|--------|------|------|
| **SQLite** | Zero-config, portable, fast read | Write concurrency จำกัด |
| PostgreSQL | Concurrent writes, scale | ต้อง setup DB server แยก |

**Decision:** SQLite — cache data เป็น read-heavy, write ไม่บ่อย (เฉพาะตอน AI สรุปใหม่)  
**Mitigation:** ใช้ WAL mode สำหรับ concurrent read  
**Revisit:** เมื่อต้องการ multi-instance backend หรือ shared DB

---

### ADR-003: Multi-LLM via Provider Interface Pattern

**Decision:** สร้าง `LLMProvider` interface ใน Go ที่ abstract การเรียก AI API  
แต่ละ provider (Gemini, OpenAI, Claude, Ollama) implement interface เดียวกัน  
User เลือก provider + ใส่ API key ผ่าน Settings page → เก็บใน SQLite (encrypted)

```
type LLMProvider interface {
    Summarize(ctx context.Context, code string, prompt string) (string, error)
    Name() string
    ValidateKey(key string) error
}
```

---

### ADR-004: File Ignore Pattern via .codewikiignore

**Decision:** ใช้ไฟล์ `.codewikiignore` (คล้าย `.gitignore` syntax) + default ignore list  
**Default ignores:** `node_modules/`, `.git/`, `vendor/`, `dist/`, `build/`, `*.exe`, `*.dll`, binary files  
**Override:** User สามารถ customize ผ่าน Settings หรือแก้ไฟล์ `.codewikiignore` ที่ root ของ scanned project

---

## File Structure

```
AI-CodeWiki/
├── docs/
│   ├── Spec.md
│   └── PLAN-ai-codewiki.md          # This file
│
├── backend/                          # Go Backend
│   ├── cmd/
│   │   └── server/
│   │       └── main.go               # Entry point
│   ├── internal/
│   │   ├── config/
│   │   │   └── config.go             # App config (env vars, defaults)
│   │   ├── handler/
│   │   │   ├── tree.go               # GET /api/v1/tree
│   │   │   ├── summary.go            # POST /api/v1/summary
│   │   │   ├── settings.go           # CRUD /api/v1/settings
│   │   │   ├── bookmark.go           # CRUD /api/v1/bookmarks
│   │   │   ├── history.go            # GET /api/v1/history
│   │   │   └── search.go             # GET /api/v1/search
│   │   ├── scanner/
│   │   │   ├── scanner.go            # Directory scanner (recursive)
│   │   │   └── ignore.go             # .codewikiignore parser
│   │   ├── hasher/
│   │   │   └── hasher.go             # SHA-256 file hashing
│   │   ├── llm/
│   │   │   ├── provider.go           # LLMProvider interface
│   │   │   ├── gemini.go             # Gemini implementation
│   │   │   ├── openai.go             # OpenAI implementation
│   │   │   ├── claude.go             # Claude implementation
│   │   │   └── ollama.go             # Ollama implementation
│   │   ├── cache/
│   │   │   └── cache.go              # SQLite cache layer
│   │   ├── db/
│   │   │   ├── sqlite.go             # DB connection + migrations
│   │   │   └── models.go             # Data models
│   │   └── middleware/
│   │       └── cors.go               # CORS middleware
│   ├── go.mod
│   ├── go.sum
│   └── Dockerfile
│
├── frontend/                         # Angular Frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/
│   │   │   │   ├── services/
│   │   │   │   │   ├── api.service.ts          # HTTP client to backend
│   │   │   │   │   ├── theme.service.ts        # Dark/Light mode
│   │   │   │   │   ├── bookmark.service.ts     # Bookmark management
│   │   │   │   │   └── history.service.ts      # View history
│   │   │   │   └── models/
│   │   │   │       ├── file-tree.model.ts      # Tree node types
│   │   │   │       ├── summary.model.ts        # AI summary types
│   │   │   │       └── settings.model.ts       # Settings types
│   │   │   ├── features/
│   │   │   │   ├── file-tree/
│   │   │   │   │   ├── file-tree.component.ts  # Sidebar tree
│   │   │   │   │   └── tree-node.component.ts  # Recursive node
│   │   │   │   ├── summary-viewer/
│   │   │   │   │   └── summary-viewer.component.ts  # MD renderer
│   │   │   │   ├── settings/
│   │   │   │   │   └── settings.component.ts   # LLM config page
│   │   │   │   ├── search/
│   │   │   │   │   └── search.component.ts     # Search panel
│   │   │   │   ├── bookmarks/
│   │   │   │   │   └── bookmarks.component.ts  # Bookmark list
│   │   │   │   └── history/
│   │   │   │       └── history.component.ts    # View history
│   │   │   ├── shared/
│   │   │   │   └── components/                 # Reusable UI
│   │   │   ├── app.component.ts                # Root layout (IDE-like)
│   │   │   └── app.routes.ts                   # Routing
│   │   ├── styles.css                          # Tailwind + global styles
│   │   └── index.html
│   ├── angular.json
│   ├── package.json
│   ├── tailwind.config.js
│   └── Dockerfile
│
├── docker-compose.yml                # Frontend + Backend orchestration
├── docker-compose.prod.yml           # Production overrides (VM deploy)
├── nginx.conf                        # Reverse proxy config
└── .codewikiignore.default           # Default ignore patterns
```

---

## API Specification (Expanded)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/tree?path=...` | Get file tree (with ignore rules applied) |
| `POST` | `/api/v1/summary` | Get/Generate AI summary (cache-aware) |
| `GET` | `/api/v1/search?q=...&path=...` | Search files by name/path in project |
| `GET` | `/api/v1/settings` | Get current settings (LLM config) |
| `PUT` | `/api/v1/settings` | Update settings (API keys, provider) |
| `GET` | `/api/v1/bookmarks` | List bookmarked files |
| `POST` | `/api/v1/bookmarks` | Add bookmark |
| `DELETE` | `/api/v1/bookmarks/:id` | Remove bookmark |
| `GET` | `/api/v1/history` | List recently viewed files |
| `POST` | `/api/v1/llm/validate` | Validate API key for a provider |

---

## Task Breakdown

### Phase 1: Foundation (P0)

- [ ] **T1: Initialize Go Backend project**  
  Agent: `backend-specialist` | Skill: `api-patterns`  
  INPUT: `go mod init` + Chi router setup  
  OUTPUT: Running HTTP server on `:8080` with health endpoint  
  VERIFY: `curl localhost:8080/health` → `200 OK`

- [ ] **T2: SQLite Database + Migrations**  
  Agent: `backend-specialist` | Skill: `database-design`  
  INPUT: Schema from Spec (file_summaries + settings + bookmarks + history tables)  
  OUTPUT: Auto-migration on startup, tables created  
  VERIFY: `sqlite3 data.db ".tables"` → shows all tables

- [ ] **T3: Initialize Angular v20+ Frontend project**  
  Agent: `frontend-specialist` | Skill: `frontend-design`  
  INPUT: `ng new frontend --standalone --style=css --routing` (Angular v20+)  
  OUTPUT: Angular app running on `:4200`  
  VERIFY: `ng serve` → browser shows Angular welcome page

- [ ] **T4: Tailwind CSS v4 + spartan-ng Setup + Design System**  
  Agent: `frontend-specialist` | Skill: `tailwind-patterns`  
  INPUT: Install Tailwind v4 + spartan-ng CLI (`npx spartan-ng init`) + Dark/Light theme  
  OUTPUT: spartan-ng components available, theme toggle works  
  VERIFY: Render `hlm-button` + `hlm-switch` → toggle dark mode → entire UI switches

---

### Phase 2: Core Features (P1)

- [ ] **T5: Directory Scanner + Ignore System**  
  Agent: `backend-specialist`  
  INPUT: Project path → recursive scan with `.codewikiignore`  
  OUTPUT: JSON tree endpoint `GET /api/v1/tree`  
  VERIFY: Scan a real project → tree JSON returned without ignored files

- [ ] **T6: File Hashing (SHA-256)**  
  Agent: `backend-specialist`  
  INPUT: File path → compute hash  
  OUTPUT: Hash string for cache comparison  
  VERIFY: Hash same file twice → same result; edit file → different hash

- [ ] **T7: LLM Provider Interface + Gemini Implementation**  
  Agent: `backend-specialist` | Skill: `api-patterns`  
  INPUT: `LLMProvider` interface + Gemini REST client  
  OUTPUT: `Summarize()` returns Markdown from Gemini API  
  VERIFY: Send code snippet → receive Markdown summary

- [ ] **T8: Additional LLM Providers (OpenAI, Claude, Ollama)**  
  Agent: `backend-specialist`  
  INPUT: Implement 3 more providers using same interface  
  OUTPUT: All 4 providers can summarize code  
  VERIFY: Switch provider in config → each returns valid Markdown

- [ ] **T9: Cache Layer (SQLite)**  
  Agent: `backend-specialist` | Skill: `database-design`  
  INPUT: File path + hash → check DB → return cached or call AI  
  OUTPUT: `POST /api/v1/summary` with cache logic  
  VERIFY: First call → slow (AI). Second call (same hash) → fast (cache)

- [ ] **T10: Settings API (CRUD)**  
  Agent: `backend-specialist`  
  INPUT: API endpoints for managing LLM settings + API keys  
  OUTPUT: `GET/PUT /api/v1/settings` working  
  VERIFY: Save API key → retrieve it → use it for summarization

---

### Phase 3: Frontend UI (P2)

- [ ] **T11: IDE-like Layout (App Shell) — ใช้ spartan-ng + Refero reference**  
  Agent: `frontend-specialist` | Skill: `frontend-design`  
  INPUT: Sidebar (resizable) + Main panel + Top bar using spartan-ng components  
  OUTPUT: Responsive IDE layout with Dark/Light mode (hlm-switch)  
  VERIFY: Resize sidebar → layout adapts; toggle theme → colors change

- [ ] **T12: File Tree Component (Sidebar)**  
  Agent: `frontend-specialist`  
  INPUT: API response → recursive tree component  
  OUTPUT: Expandable/collapsible file tree with icons  
  VERIFY: Load project → navigate folders → click file

- [ ] **T13: Summary Viewer (Markdown Renderer)**  
  Agent: `frontend-specialist`  
  INPUT: Markdown from API → rendered view  
  OUTPUT: Beautiful Markdown with syntax highlighting  
  VERIFY: Click file → see formatted summary with code blocks highlighted

- [ ] **T14: Settings Page (LLM Configuration) — spartan-ng forms**  
  Agent: `frontend-specialist`  
  INPUT: hlm-select (provider), hlm-input (API key), hlm-button (validate/save)  
  OUTPUT: Settings page with provider selector + key input + validate button  
  VERIFY: Enter key → validate → see hlm-toast success/error; switch provider → save

- [ ] **T15: Search Component**  
  Agent: `frontend-specialist`  
  INPUT: Search bar → call search API → show results  
  OUTPUT: Searchable file list with highlighting  
  VERIFY: Type filename → see matching results → click to navigate

- [ ] **T16: Bookmark & History Components**  
  Agent: `frontend-specialist`  
  INPUT: Bookmark button on summary + history auto-tracking  
  OUTPUT: Bookmark list + History list in sidebar tabs  
  VERIFY: Bookmark file → see in bookmarks; view files → see in history

---

### Phase 4: Integration & Deployment (P3)

- [ ] **T17: Docker Compose Setup**  
  Agent: `backend-specialist` | Skill: `deployment-procedures`  
  INPUT: 2 Dockerfiles + docker-compose.yml + nginx.conf  
  OUTPUT: `docker compose up` → full app running  
  VERIFY: `docker compose up -d` → `localhost` shows working app

- [ ] **T18: Production Config (VM Deploy)**  
  Agent: `backend-specialist` | Skill: `deployment-procedures`  
  INPUT: docker-compose.prod.yml + env config  
  OUTPUT: Deployable on DigitalOcean droplet  
  VERIFY: SSH to VM → `docker compose -f docker-compose.prod.yml up -d` → accessible via IP

- [ ] **T19: PostHog Analytics Integration (Optional)**  
  Agent: `frontend-specialist`  
  INPUT: PostHog JS SDK → track summary events  
  OUTPUT: Events sent when AI summary requested  
  VERIFY: Check PostHog dashboard → see events

---

### Phase X: Verification

- [ ] Go backend builds without errors: `go build ./...`
- [ ] Angular frontend builds: `ng build --configuration=production`
- [ ] Docker Compose up successful: `docker compose up --build`
- [ ] All API endpoints respond correctly (manual test with curl/Postman)
- [ ] File tree loads for a real project
- [ ] AI summary works with at least 1 provider
- [ ] Cache hit returns faster than cache miss
- [ ] Dark/Light mode toggle works
- [ ] Search/Bookmark/History features functional
- [ ] Large project scan (>1000 files) completes in <5s

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (User)                        │
│            Angular v20+ SPA + spartan-ng                 │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │File Tree │  │Summary Viewer│  │Settings/Search/   │  │
│  │(Sidebar) │  │(Markdown)    │  │Bookmark/History   │  │
│  │hlm-tabs  │  │ngx-markdown  │  │hlm-select/input   │  │
│  └──────────┘  └──────────────┘  └───────────────────┘  │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP (REST API)
                         ▼
┌─────────────────────────────────────────────────────────┐
│               Nginx (Reverse Proxy)                      │
│         Static files + /api/* → Go Backend               │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│              Go Backend (Chi Router)                     │
│  ┌──────────┐  ┌──────────┐  ┌────────────────────┐    │
│  │ Scanner  │  │ Hasher   │  │  LLM Provider      │    │
│  │ + Ignore │  │ SHA-256  │  │  ┌───────────────┐  │    │
│  └──────────┘  └──────────┘  │  │ Gemini        │  │    │
│                              │  │ OpenAI        │  │    │
│  ┌──────────────────────┐    │  │ Claude        │  │    │
│  │  Cache Layer         │    │  │ Ollama (local)│  │    │
│  │  (Hash check → DB)   │    │  └───────────────┘  │    │
│  └──────────┬───────────┘    └────────────┬───────┘    │
│             │                             │             │
│             ▼                             ▼             │
│  ┌──────────────────┐         ┌───────────────────┐    │
│  │   SQLite (WAL)    │         │  External AI APIs  │    │
│  │  - file_summaries │         │  (or Ollama local) │    │
│  │  - settings       │         └───────────────────┘    │
│  │  - bookmarks      │                                  │
│  │  - history        │                                  │
│  └──────────────────┘                                   │
└─────────────────────────────────────────────────────────┘
```

---

## Notes

- **Stream Response** marked as optional future — architecture supports adding SSE/WebSocket later via the `LLMProvider` interface
- **API Key Security:** Keys stored encrypted in SQLite, never exposed in API responses (masked)
- **Large Project Support:** Scanner uses goroutines for parallel directory walking + streaming JSON response
- **Angular v20+ Standalone:** ไม่ใช้ NgModules, ใช้ standalone components + inject() + signals
- **spartan-ng:** ใช้ Brain-Helm architecture — Brain จัดการ logic/a11y, Helm จัดการ UI/Tailwind
- **Refero MCP:** ใช้ดึง UI reference เมื่อ subscription active — ค้นหา IDE layout, file tree, settings patterns
- **Chi Router:** เลือก Chi แทน Gin เพราะ composable middleware, net/http compatible, lightweight
