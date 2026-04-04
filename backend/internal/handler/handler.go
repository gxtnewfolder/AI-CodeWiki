package handler

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/user/ai-codewiki-backend/internal/cache"
	"github.com/user/ai-codewiki-backend/internal/config"
	"github.com/user/ai-codewiki-backend/internal/deps"
	"github.com/user/ai-codewiki-backend/internal/hasher"
	"github.com/user/ai-codewiki-backend/internal/llm"
	"github.com/user/ai-codewiki-backend/internal/scanner"
)

type Handler struct {
	db    *sql.DB
	cfg   *config.Config
	cache *cache.Cache
}

func New(db *sql.DB, cfg *config.Config) *Handler {
	return &Handler{
		db:    db,
		cfg:   cfg,
		cache: cache.New(db),
	}
}

// --- Helpers ---

func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

// --- Tree ---

func (h *Handler) GetTree(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Query().Get("path")
	if path == "" {
		writeError(w, http.StatusBadRequest, "path query parameter is required")
		return
	}

	if _, err := os.Stat(path); os.IsNotExist(err) {
		writeError(w, http.StatusNotFound, "directory not found")
		return
	}

	ignorePatterns := scanner.LoadIgnorePatterns(path)
	
	// Get indexed files to mark them in the tree
	indexedFiles, _ := h.cache.ListIndexedFiles(path)
	if indexedFiles == nil {
		indexedFiles = make(map[string]bool)
	}

	tree, err := scanner.ScanDirectory(path, ignorePatterns, indexedFiles)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to scan directory: "+err.Error())
		return
	}

	// Automated Indexing Trigger (Async)
	// If we are at the root (no subpath relative to project), trigger indexing
	go func(p string) {
		h.callAIIndex(p)
	}(path)

	writeJSON(w, http.StatusOK, tree)
}

// --- Summary ---

type SummaryRequest struct {
	ProjectPath string `json:"project_path"`
	FilePath    string `json:"file_path"`
}

type SummaryResponse struct {
	FilePath  string `json:"file_path"`
	Summary   string `json:"summary"`
	Provider  string `json:"provider"`
	CacheHit  bool   `json:"cache_hit"`
	Hash      string `json:"hash"`
}

type aiServiceSummaryRequest struct {
	ProjectPath string `json:"project_path"`
	FilePath    string `json:"file_path"`
	FileContent string `json:"file_content"`
	Model       string `json:"model,omitempty"`
	Provider    string `json:"provider,omitempty"`
	APIKey      string `json:"api_key,omitempty"`
}

type aiServiceSummaryResponse struct {
	ProjectPath string `json:"project_path"`
	FilePath    string `json:"file_path"`
	SummaryMD   string `json:"summary_md"`
}

func (h *Handler) GetSummary(w http.ResponseWriter, r *http.Request) {
	var req SummaryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.ProjectPath == "" || req.FilePath == "" {
		writeError(w, http.StatusBadRequest, "project_path and file_path are required")
		return
	}

	// Build full path
	fullPath := filepath.Join(req.ProjectPath, req.FilePath)
	if _, err := os.Stat(fullPath); os.IsNotExist(err) {
		writeError(w, http.StatusNotFound, "file not found")
		return
	}

	// Compute hash
	fileHash, err := hasher.HashFile(fullPath)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to hash file: "+err.Error())
		return
	}

	// Check cache
	if cached, hit := h.cache.Get(req.ProjectPath, req.FilePath, fileHash); hit {
		// Record history
		h.recordHistory(req.ProjectPath, req.FilePath)

		writeJSON(w, http.StatusOK, SummaryResponse{
			FilePath: req.FilePath,
			Summary:  cached.SummaryMD,
			Provider: cached.Provider,
			CacheHit: true,
			Hash:     fileHash,
		})
		return
	}

	// Read file content
	content, err := os.ReadFile(fullPath)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to read file: "+err.Error())
		return
	}

	// Decide which backend to use:
	// - ถ้า llm_provider == "ollama" → ส่งไป Python ai-service (Local LLM ผ่าน Ollama)
	// - ถ้าอย่างอื่น → ใช้ llm provider เดิม (gemini/openai/claude ฯลฯ)
	providerName := h.getSetting("llm_provider", "gemini")

	var summary string

	if providerName == "ollama" {
		modelName := h.getSetting("llm_model", "qwen2.5-coder:7b")
		summary, err = h.callAISummary(req.ProjectPath, req.FilePath, string(content), modelName, providerName, "")
		if err != nil {
			writeError(w, http.StatusInternalServerError, "AI summarization failed: "+err.Error())
			return
		}
	} else {
		// Even for other providers, if the user explicitly wants to use the Py service (optional feature check)
		// For now, let's keep the existing Go direct call but extend callAISummary signature
		apiKey := h.getSetting("llm_key_"+providerName, "")
		if apiKey == "" {
			writeError(w, http.StatusBadRequest, "no API key configured for provider: "+providerName)
			return
		}

		provider := llm.NewProvider(providerName, apiKey)

		summary, err = provider.Summarize(r.Context(), string(content), "")
		if err != nil {
			writeError(w, http.StatusInternalServerError, "AI summarization failed: "+err.Error())
			return
		}
	}

	// Save to cache
	h.cache.Set(req.ProjectPath, req.FilePath, fileHash, summary, providerName)

	// Record history
	h.recordHistory(req.ProjectPath, req.FilePath)

	writeJSON(w, http.StatusOK, SummaryResponse{
		FilePath: req.FilePath,
		Summary:  summary,
		Provider: providerName,
		CacheHit: false,
		Hash:     fileHash,
	})
}

// callAISummary forwards the summarization request to the Python AI microservice.
func (h *Handler) callAISummary(projectPath, filePath, content, model, provider, apiKey string) (string, error) {
	baseURL := strings.TrimRight(h.cfg.AIServiceURL, "/")
	if baseURL == "" {
		return "", fmt.Errorf("AI_SERVICE_URL is not configured")
	}

	payload := aiServiceSummaryRequest{
		ProjectPath: projectPath,
		FilePath:    filePath,
		FileContent: content,
		Model:       model,
		Provider:    provider,
		APIKey:      apiKey,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return "", fmt.Errorf("marshal ai-service request: %w", err)
	}

	url := baseURL + "/api/v1/summarize-file"
	resp, err := http.Post(url, "application/json", bytes.NewReader(body))
	if err != nil {
		return "", fmt.Errorf("call ai-service: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("ai-service returned status %d", resp.StatusCode)
	}

	var aiResp aiServiceSummaryResponse
	if err := json.NewDecoder(resp.Body).Decode(&aiResp); err != nil {
		return "", fmt.Errorf("decode ai-service response: %w", err)
	}

	if aiResp.SummaryMD == "" {
		return "", fmt.Errorf("ai-service returned empty summary")
	}

	return aiResp.SummaryMD, nil
}

// --- Search ---

func (h *Handler) SearchFiles(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("q")
	path := r.URL.Query().Get("path")

	if query == "" || path == "" {
		writeError(w, http.StatusBadRequest, "q and path query parameters are required")
		return
	}

	ignorePatterns := scanner.LoadIgnorePatterns(path)
	
	// Get indexed files to mark them (needed for consistency)
	indexedFiles, _ := h.cache.ListIndexedFiles(path)
	if indexedFiles == nil {
		indexedFiles = make(map[string]bool)
	}

	tree, err := scanner.ScanDirectory(path, ignorePatterns, indexedFiles)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to scan: "+err.Error())
		return
	}

	var results []scanner.FileNode
	searchTree(tree.Children, strings.ToLower(query), &results)

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"query":   query,
		"results": results,
		"count":   len(results),
	})
}

func searchTree(nodes []scanner.FileNode, query string, results *[]scanner.FileNode) {
	for _, n := range nodes {
		if strings.Contains(strings.ToLower(n.Name), query) || strings.Contains(strings.ToLower(n.Path), query) {
			if !n.IsDir {
				*results = append(*results, n)
			}
		}
		if n.IsDir && n.Children != nil {
			searchTree(n.Children, query, results)
		}
	}
}

// --- Settings ---

func (h *Handler) GetSettings(w http.ResponseWriter, r *http.Request) {
	rows, err := h.db.Query("SELECT key, value FROM settings")
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer rows.Close()

	settings := make(map[string]string)
	for rows.Next() {
		var k, v string
		rows.Scan(&k, &v)
		// Mask API keys
		if strings.HasPrefix(k, "llm_key_") && len(v) > 8 {
			settings[k] = v[:4] + "****" + v[len(v)-4:]
		} else {
			settings[k] = v
		}
	}

	writeJSON(w, http.StatusOK, settings)
}

func (h *Handler) UpdateSettings(w http.ResponseWriter, r *http.Request) {
	var body map[string]string
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	for k, v := range body {
		h.db.Exec(
			`INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
			 ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
			k, v, time.Now(),
		)
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// --- Bookmarks ---

func (h *Handler) ListBookmarks(w http.ResponseWriter, r *http.Request) {
	rows, err := h.db.Query("SELECT id, project_path, file_path, display_name, created_at FROM bookmarks ORDER BY created_at DESC")
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer rows.Close()

	var bookmarks []map[string]interface{}
	for rows.Next() {
		var id int64
		var pp, fp, dn string
		var ca time.Time
		rows.Scan(&id, &pp, &fp, &dn, &ca)
		bookmarks = append(bookmarks, map[string]interface{}{
			"id": id, "project_path": pp, "file_path": fp, "display_name": dn, "created_at": ca,
		})
	}

	if bookmarks == nil {
		bookmarks = []map[string]interface{}{}
	}
	writeJSON(w, http.StatusOK, bookmarks)
}

func (h *Handler) AddBookmark(w http.ResponseWriter, r *http.Request) {
	var body struct {
		ProjectPath string `json:"project_path"`
		FilePath    string `json:"file_path"`
		DisplayName string `json:"display_name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if body.DisplayName == "" {
		body.DisplayName = filepath.Base(body.FilePath)
	}

	result, err := h.db.Exec(
		`INSERT OR IGNORE INTO bookmarks (project_path, file_path, display_name) VALUES (?, ?, ?)`,
		body.ProjectPath, body.FilePath, body.DisplayName,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	id, _ := result.LastInsertId()
	writeJSON(w, http.StatusCreated, map[string]interface{}{"id": id, "status": "ok"})
}

func (h *Handler) RemoveBookmark(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid bookmark id")
		return
	}

	h.db.Exec("DELETE FROM bookmarks WHERE id = ?", id)
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// --- History ---

func (h *Handler) ListHistory(w http.ResponseWriter, r *http.Request) {
	rows, err := h.db.Query(
		"SELECT id, project_path, file_path, viewed_at FROM history ORDER BY viewed_at DESC LIMIT 50",
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer rows.Close()

	var history []map[string]interface{}
	for rows.Next() {
		var id int64
		var pp, fp string
		var va time.Time
		rows.Scan(&id, &pp, &fp, &va)
		history = append(history, map[string]interface{}{
			"id": id, "project_path": pp, "file_path": fp, "viewed_at": va,
		})
	}

	if history == nil {
		history = []map[string]interface{}{}
	}
	writeJSON(w, http.StatusOK, history)
}

// --- LLM Validation ---

func (h *Handler) ValidateLLMKey(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Provider string `json:"provider"`
		APIKey   string `json:"api_key"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	provider := llm.NewProvider(body.Provider, body.APIKey)
	if err := provider.ValidateKey(r.Context(), body.APIKey); err != nil {
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"valid":   false,
			"message": err.Error(),
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"valid":   true,
		"message": "API key is valid",
	})
}

// --- Internal Helpers ---

func (h *Handler) getSetting(key, fallback string) string {
	var value string
	err := h.db.QueryRow("SELECT value FROM settings WHERE key = ?", key).Scan(&value)
	if err != nil || value == "" {
		return fallback
	}
	return value
}

func (h *Handler) recordHistory(projectPath, filePath string) {
	h.db.Exec(
		"INSERT INTO history (project_path, file_path, viewed_at) VALUES (?, ?, ?)",
		projectPath, filePath, time.Now(),
	)
}

// --- Dependencies ---

func (h *Handler) GetDeps(w http.ResponseWriter, r *http.Request) {
	var req struct {
		ProjectPath string `json:"project_path"`
		FilePath    string `json:"file_path"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.ProjectPath == "" || req.FilePath == "" {
		writeError(w, http.StatusBadRequest, "project_path and file_path are required")
		return
	}

	// Forward analysis: what does this file import?
	result := deps.AnalyzeFile(req.ProjectPath, req.FilePath)

	// Reverse analysis: who imports this file? (grep-like)
	result.ImportedBy = deps.FindReverseDeps(req.ProjectPath, req.FilePath)

	writeJSON(w, http.StatusOK, result)
}

// --- AI Features ---

func (h *Handler) CodeQA(w http.ResponseWriter, r *http.Request) {
	var req struct {
		ProjectPath     string `json:"project_path"`
		Question        string `json:"question"`
		MaxContextFiles int    `json:"max_context_files"`
		History         []struct {
			Role    string `json:"role"`
			Content string `json:"content"`
		} `json:"history"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.MaxContextFiles <= 0 {
		req.MaxContextFiles = 5
	}

	// Fetch model and provider from settings
	modelName := h.getSetting("llm_model", "qwen2.5-coder:7b")
	providerName := h.getSetting("llm_provider", "ollama")
	apiKey := h.getSetting("llm_key_"+providerName, "")

	baseURL := strings.TrimRight(h.cfg.AIServiceURL, "/")
	
	// Create a map to inject model and provider
	payload := map[string]interface{}{
		"project_path":      req.ProjectPath,
		"question":          req.Question,
		"history":           req.History,
		"max_context_files": req.MaxContextFiles,
		"model":             modelName,
		"provider":          providerName,
		"api_key":           apiKey,
	}
	
	body, _ := json.Marshal(payload)
	url := baseURL + "/api/v1/project-qa"

	resp, err := http.Post(url, "application/json", bytes.NewReader(body))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "ai-service connection failed: "+err.Error())
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		writeError(w, resp.StatusCode, "ai-service error")
		return
	}

	var aiResp interface{}
	json.NewDecoder(resp.Body).Decode(&aiResp)
	writeJSON(w, http.StatusOK, aiResp)
}

func (h *Handler) AnalyzeImpact(w http.ResponseWriter, r *http.Request) {
	var req struct {
		ProjectPath string `json:"project_path"`
		FilePath    string `json:"file_path"`
		Question    string `json:"question"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	// Fetch model and provider from settings
	modelName := h.getSetting("llm_model", "qwen2.5-coder:7b")
	providerName := h.getSetting("llm_provider", "ollama")
	apiKey := h.getSetting("llm_key_"+providerName, "")

	baseURL := strings.TrimRight(h.cfg.AIServiceURL, "/")
	
	payload := map[string]interface{}{
		"project_path": req.ProjectPath,
		"file_path":    req.FilePath,
		"question":     req.Question,
		"model":        modelName,
		"provider":     providerName,
		"api_key":      apiKey,
	}
	
	body, _ := json.Marshal(payload)
	url := baseURL + "/api/v1/impact"

	resp, err := http.Post(url, "application/json", bytes.NewReader(body))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "ai-service connection failed: "+err.Error())
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		writeError(w, resp.StatusCode, "ai-service error")
		return
	}

	var aiResp interface{}
	json.NewDecoder(resp.Body).Decode(&aiResp)
	writeJSON(w, http.StatusOK, aiResp)
}

func (h *Handler) IndexProject(w http.ResponseWriter, r *http.Request) {
	var req struct {
		ProjectPath string `json:"project_path"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.ProjectPath == "" {
		writeError(w, http.StatusBadRequest, "project_path is required")
		return
	}

	err := h.callAIIndex(req.ProjectPath)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to trigger indexing: "+err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "ok", "message": "indexing triggered"})
}

func (h *Handler) callAIIndex(projectPath string) error {
	// 1. Trigger Vector DB Indexing (ChromaDB)
	go h.triggerVectorIndex(projectPath)

	// 2. Trigger Graph DB Sync (Neo4j)
	go h.triggerGraphSync(projectPath)

	return nil
}

func (h *Handler) triggerVectorIndex(projectPath string) {
	baseURL := strings.TrimRight(h.cfg.AIServiceURL, "/")
	payload := map[string]string{"project_path": projectPath}
	body, _ := json.Marshal(payload)
	url := baseURL + "/api/v1/index-codebase"
	http.Post(url, "application/json", bytes.NewReader(body))
}

func (h *Handler) triggerGraphSync(projectPath string) {
	baseURL := strings.TrimRight(h.cfg.AIServiceURL, "/")
	
	// Scan all files for dependencies
	var allFiles []string
	filepath.Walk(projectPath, func(path string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() {
			return nil
		}
		// Filter out common ignored dirs manually for the walk
		rel, _ := filepath.Rel(projectPath, path)
		if strings.Contains(rel, "node_modules") || strings.Contains(rel, ".git") {
			return nil
		}
		allFiles = append(allFiles, filepath.ToSlash(rel))
		return nil
	})

	analysis := deps.AnalyzeProject(projectPath, allFiles)
	
	payload := map[string]interface{}{
		"project_path": projectPath,
		"analysis":     analysis,
	}
	
	body, _ := json.Marshal(payload)
	url := baseURL + "/api/v1/sync-project-graph"
	http.Post(url, "application/json", bytes.NewReader(body))
}

func (h *Handler) GetProjectGraph(w http.ResponseWriter, r *http.Request) {
	projectPath := r.URL.Query().Get("project_path")
	filePath := r.URL.Query().Get("file_path")
	if projectPath == "" || filePath == "" {
		writeError(w, http.StatusBadRequest, "project_path and file_path are required")
		return
	}

	baseURL := strings.TrimRight(h.cfg.AIServiceURL, "/")
	// Important: use QueryEscape for paths as they contain slashes and spaces
	url := fmt.Sprintf("%s/api/v1/subgraph?project_path=%s&file_path=%s",
		baseURL, strings.ReplaceAll(projectPath, " ", "%20"), strings.ReplaceAll(filePath, " ", "%20"))

	resp, err := http.Get(url)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "ai-service connection failed: "+err.Error())
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		writeError(w, resp.StatusCode, "ai-service error")
		return
	}

	var result interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to decode ai-service response")
		return
	}
	writeJSON(w, http.StatusOK, result)
}
