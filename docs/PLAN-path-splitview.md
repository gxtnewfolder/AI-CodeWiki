# PLAN: Path Input & Split-View Summary

> **Status:** Ready for implementation  
> **Created:** 2026-03-10  
> **Agents:** `@backend-specialist` + `@frontend-specialist`

---

## Overview

ปรับปรุง 2 ฟีเจอร์:
1. **Cross-Platform Path Input** — เลือก folder ด้วย OS dialog / directory browser
2. **Split-View Summary** — แบ่งจอ markdown (ซ้าย) + dependency diagram (ขวา)

---

## Phase 1: Backend — Directory Browser API

### T1: Browse Directories Endpoint
**File:** `internal/handler/browse.go` (NEW)  
**Route:** `GET /api/v1/browse?path=`

```go
// Response: list of subdirectories at given path
type BrowseResult struct {
    CurrentPath string      `json:"current_path"`
    Parent      string      `json:"parent"`
    Dirs        []DirEntry  `json:"dirs"`
}

type DirEntry struct {
    Name     string `json:"name"`
    Path     string `json:"path"`
    HasChildren bool `json:"has_children"`
}
```

**Logic:**
- Validate path exists and is directory
- List subdirectories (skip hidden dirs by default)
- Cross-platform: handle `\` vs `/` via `filepath.ToSlash`

### T2: Root Paths Endpoint
**File:** `internal/handler/browse.go`  
**Route:** `GET /api/v1/browse/roots`

**Logic:**
- Windows: list drives (C:, D:, etc.) via `os.Stat` on `A:` through `Z:`
- macOS/Linux: return `/home`, `/Users`, `/opt`, cwd
- Docker: return mounted paths from env `SCAN_PATH`

### T3: Register Routes
**File:** `cmd/server/main.go`  
**Change:** Add 2 routes to API v1 group

---

## Phase 2: Backend — Dependency Analyzer

### T4: Language-Aware Import Parser
**File:** `internal/deps/analyzer.go` (NEW)

**Supported patterns:**

| Language | Regex |
|----------|-------|
| Go | `"([\w/.-]+)"` in import blocks |
| TS/JS | `from\s+['"](\.[\w/.-]+)['"]`, `require\(['"](\.[\w/.-]+)['"]\)` |
| Python | `from\s+([\w.]+)\s+import`, `import\s+([\w.]+)` |
| Java/Kotlin | `import\s+([\w.]+)` |
| Rust | `use\s+(crate::[\w:]+)`, `mod\s+(\w+)` |
| C# | `using\s+([\w.]+)` |

**Logic:**
1. Detect language from file extension
2. Read file → apply regex → extract import paths
3. Resolve relative paths to project-relative paths

### T5: Reverse Dependency Finder
**File:** `internal/deps/reverse.go` (NEW)

**Logic (grep-like):**
1. Get basename of target file (e.g., `handler` from `handler.go`)
2. Walk project tree (respect ignore patterns)
3. For each file of same/compatible language:
   - Read content → grep for target filename in import statements
   - If found → add to `imported_by` list
4. Cap at 50 files scanned to avoid timeout

### T6: Deps API Endpoint
**File:** `internal/handler/handler.go`  
**Route:** `POST /api/v1/deps`

```go
// Request
type DepsRequest struct {
    ProjectPath string `json:"project_path"`
    FilePath    string `json:"file_path"`
}

// Response
type DepsResult struct {
    FilePath   string    `json:"file_path"`
    Imports    []DepLink `json:"imports"`
    ImportedBy []DepLink `json:"imported_by"`
    Exports    []string  `json:"exports"`
}

type DepLink struct {
    FilePath string `json:"file_path"`
    Symbol   string `json:"symbol"`
    Line     int    `json:"line"`
}
```

---

## Phase 3: Frontend — Folder Picker Component

### T7: FolderPicker Component
**File:** `components/folder-picker/folder-picker.component.ts` (NEW)

**Features:**
- Primary: `window.showDirectoryPicker()` (Chrome/Edge)
- Fallback: Dialog with breadcrumb navigation + folder list via `browse` API
- Recent projects list (localStorage, max 5)
- Keyboard support (↑↓ arrows, Enter, Backspace)

### T8: Update App Shell
**File:** `app.html`, `app.ts`

**Changes:**
- Replace text input with "Open Project" button + recent dropdown
- `showDirectoryPicker()` → get directory name → send to backend
- Fallback → open FolderPicker dialog
- Show recent projects on welcome screen

### T9: API Service Updates
**File:** `services/api.service.ts`

**Add:**
- `browseDirs(path: string)`
- `getRoots()`
- `getDeps(projectPath: string, filePath: string)`

---

## Phase 4: Frontend — Split-View + Dependency Diagram

### T10: Install Mermaid
**Command:** `npm install mermaid`

### T11: DepGraph Component
**File:** `components/dep-graph/dep-graph.component.ts` (NEW)

**Features:**
- Input: `DepsResult` → generate Mermaid flowchart syntax
- Render Mermaid diagram in a container
- Color-coded: imports (→ teal), imported_by (← amber)
- Current file highlighted
- Click node → emit `fileSelect` event → navigate

**Mermaid generation example:**
```
graph TD
    A[main.go] -->|imports| B[THIS: handler.go]
    B -->|imports| C[cache.go]
    B -->|imports| D[scanner.go]
    B -->|imports| E[llm/provider.go]
    style B fill:#0d9488,color:#fff
```

### T12: Update SummaryViewer to Split-View
**File:** `components/summary-viewer/summary-viewer.component.ts`

**Changes:**
- Layout: `display: grid; grid-template-columns: 1fr 1fr`
- Left panel: markdown (existing ngx-markdown)
- Right panel: `<app-dep-graph>` component
- Resizable divider between panels
- Toggle button to collapse/expand right panel
- On file select → parallel calls: `getSummary()` + `getDeps()`

### T13: Models Update
**File:** `models/api.models.ts`

**Add:** `DepsResult`, `DepLink`, `BrowseResult`, `DirEntry` interfaces

---

## Phase 5: Integration & Polish

### T14: App Component Wiring
- `selectFile()` → fire both summary + deps requests in parallel
- Pass deps result to summary-viewer → dep-graph
- Store deps in signal

### T15: Responsive & Edge Cases
- Handle files with no imports (show "No dependencies found")
- Handle analysis timeout (show partial results)
- Mobile: stack split-view vertically
- Skeleton loading for both panels

---

## Execution Order

```
T1 → T2 → T3 (Backend: browse)
T4 → T5 → T6 (Backend: deps)
T7 → T8 (Frontend: folder picker)
T9 → T10 → T11 → T12 → T13 (Frontend: split-view)
T14 → T15 (Integration)
```

T1-T3 and T4-T6 can run in parallel.  
T7-T8 and T9-T13 can run in parallel after backend is ready.

---

## Verification

| Test | Expected |
|------|----------|
| GET `/browse/roots` on Windows | Returns `["C:\\", "D:\\", ...]` |
| GET `/browse?path=D:\work` | Returns subdirectories |
| POST `/deps` with `handler.go` | Returns imports: chi, config, cache, etc. + importedBy: main.go |
| Frontend: click "Open Project" | Opens folder picker dialog |
| Frontend: select a .go file | Shows split view: markdown + Mermaid diagram |
| Frontend: click node in diagram | Navigates to that file |
