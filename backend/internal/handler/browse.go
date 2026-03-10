package handler

import (
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"sort"
	"strings"
)

// BrowseResult is the response for the browse endpoint.
type BrowseResult struct {
	CurrentPath string     `json:"current_path"`
	Parent      string     `json:"parent"`
	Separator   string     `json:"separator"`
	Dirs        []DirEntry `json:"dirs"`
}

// DirEntry represents a single directory in browse results.
type DirEntry struct {
	Name        string `json:"name"`
	Path        string `json:"path"`
	HasChildren bool   `json:"has_children"`
}

// BrowseDirs lists subdirectories at a given path.
func (h *Handler) BrowseDirs(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Query().Get("path")
	if path == "" {
		writeError(w, http.StatusBadRequest, "path query parameter is required")
		return
	}

	// Normalize path
	path = filepath.Clean(path)

	info, err := os.Stat(path)
	if err != nil || !info.IsDir() {
		writeError(w, http.StatusNotFound, "directory not found: "+path)
		return
	}

	entries, err := os.ReadDir(path)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to read directory: "+err.Error())
		return
	}

	var dirs []DirEntry
	for _, e := range entries {
		if !e.IsDir() {
			continue
		}
		name := e.Name()
		// Skip hidden directories
		if strings.HasPrefix(name, ".") {
			continue
		}
		// Skip common noise directories
		if isNoisyDir(name) {
			continue
		}

		fullPath := filepath.Join(path, name)
		hasChildren := dirHasSubdirs(fullPath)

		dirs = append(dirs, DirEntry{
			Name:        name,
			Path:        filepath.ToSlash(fullPath),
			HasChildren: hasChildren,
		})
	}

	sort.Slice(dirs, func(i, j int) bool {
		return strings.ToLower(dirs[i].Name) < strings.ToLower(dirs[j].Name)
	})

	parent := filepath.Dir(path)
	if parent == path {
		parent = "" // at root
	}

	writeJSON(w, http.StatusOK, BrowseResult{
		CurrentPath: filepath.ToSlash(path),
		Parent:      filepath.ToSlash(parent),
		Separator:   string(filepath.Separator),
		Dirs:        dirs,
	})
}

// GetRoots returns available root paths based on OS.
func (h *Handler) GetRoots(w http.ResponseWriter, r *http.Request) {
	var roots []DirEntry

	if runtime.GOOS == "windows" {
		// Check drives A-Z
		for c := 'C'; c <= 'Z'; c++ {
			drive := string(c) + ":\\"
			if _, err := os.Stat(drive); err == nil {
				roots = append(roots, DirEntry{
					Name:        string(c) + ":",
					Path:        filepath.ToSlash(drive),
					HasChildren: true,
				})
			}
		}
	} else {
		// macOS / Linux
		commonPaths := []string{"/home", "/Users", "/opt", "/var", "/tmp"}
		for _, p := range commonPaths {
			if info, err := os.Stat(p); err == nil && info.IsDir() {
				roots = append(roots, DirEntry{
					Name:        filepath.Base(p),
					Path:        p,
					HasChildren: dirHasSubdirs(p),
				})
			}
		}
		// Also add current working directory
		if cwd, err := os.Getwd(); err == nil {
			roots = append(roots, DirEntry{
				Name:        "cwd: " + filepath.Base(cwd),
				Path:        filepath.ToSlash(cwd),
				HasChildren: true,
			})
		}
	}

	// Add SCAN_PATH if set
	if scanPath := os.Getenv("SCAN_PATH"); scanPath != "" {
		roots = append([]DirEntry{{
			Name:        "📁 " + filepath.Base(scanPath),
			Path:        filepath.ToSlash(scanPath),
			HasChildren: true,
		}}, roots...)
	}

	writeJSON(w, http.StatusOK, roots)
}

func isNoisyDir(name string) bool {
	noisy := map[string]bool{
		"node_modules": true, "__pycache__": true, ".git": true,
		"vendor": true, "dist": true, "build": true, "target": true,
		"$RECYCLE.BIN": true, "System Volume Information": true,
	}
	return noisy[name]
}

func dirHasSubdirs(path string) bool {
	entries, err := os.ReadDir(path)
	if err != nil {
		return false
	}
	for _, e := range entries {
		if e.IsDir() && !strings.HasPrefix(e.Name(), ".") {
			return true
		}
	}
	return false
}
