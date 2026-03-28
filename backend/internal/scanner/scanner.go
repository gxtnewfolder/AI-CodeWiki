package scanner

import (
	"os"
	"path/filepath"
	"sort"
	"strings"
)

type FileNode struct {
	Name       string     `json:"name"`
	Path       string     `json:"path"`
	IsDir      bool       `json:"is_dir"`
	Size       int64      `json:"size,omitempty"`
	HasSummary bool       `json:"has_summary"`
	Children   []FileNode `json:"children,omitempty"`
}

func ScanDirectory(rootPath string, ignorePatterns []string, indexedFiles map[string]bool) (FileNode, error) {
	info, err := os.Stat(rootPath)
	if err != nil {
		return FileNode{}, err
	}

	root := FileNode{
		Name:  info.Name(),
		Path:  "",
		IsDir: true,
	}

	root.Children, err = scanDir(rootPath, "", ignorePatterns, indexedFiles)
	if err != nil {
		return FileNode{}, err
	}

	return root, nil
}

func scanDir(basePath, relPath string, ignorePatterns []string, indexedFiles map[string]bool) ([]FileNode, error) {
	fullPath := filepath.Join(basePath, relPath)
	entries, err := os.ReadDir(fullPath)
	if err != nil {
		return nil, err
	}

	var nodes []FileNode
	for _, entry := range entries {
		name := entry.Name()
		childRel := filepath.Join(relPath, name)

		if shouldIgnore(name, childRel, entry.IsDir(), ignorePatterns) {
			continue
		}

		node := FileNode{
			Name:       name,
			Path:       filepath.ToSlash(childRel),
			IsDir:      entry.IsDir(),
			HasSummary: indexedFiles[filepath.ToSlash(childRel)],
		}

		if entry.IsDir() {
			children, err := scanDir(basePath, childRel, ignorePatterns, indexedFiles)
			if err != nil {
				continue // skip unreadable directories
			}
			node.Children = children
		} else {
			info, err := entry.Info()
			if err == nil {
				node.Size = info.Size()
			}
		}

		nodes = append(nodes, node)
	}

	// Sort: directories first, then alphabetical
	sort.Slice(nodes, func(i, j int) bool {
		if nodes[i].IsDir != nodes[j].IsDir {
			return nodes[i].IsDir
		}
		return strings.ToLower(nodes[i].Name) < strings.ToLower(nodes[j].Name)
	})

	return nodes, nil
}

func shouldIgnore(name, relPath string, isDir bool, patterns []string) bool {
	// Always ignore these
	alwaysIgnore := []string{
		".git", "node_modules", "vendor", "__pycache__",
		".next", ".nuxt", "dist", "build", ".cache",
		".DS_Store", "Thumbs.db", ".idea", ".vscode",
	}
	for _, ig := range alwaysIgnore {
		if name == ig {
			return true
		}
	}

	// Ignore binary / non-code files
	binaryExts := []string{
		".exe", ".dll", ".so", ".dylib", ".o", ".a",
		".zip", ".tar", ".gz", ".rar", ".7z",
		".png", ".jpg", ".jpeg", ".gif", ".ico", ".svg", ".webp",
		".mp3", ".mp4", ".avi", ".mov", ".wav",
		".pdf", ".doc", ".docx", ".xls", ".xlsx",
		".woff", ".woff2", ".ttf", ".eot",
		".lock",
	}
	if !isDir {
		ext := strings.ToLower(filepath.Ext(name))
		for _, be := range binaryExts {
			if ext == be {
				return true
			}
		}
	}

	// User-defined patterns
	for _, pattern := range patterns {
		pattern = strings.TrimSpace(pattern)
		if pattern == "" || strings.HasPrefix(pattern, "#") {
			continue
		}

		// Simple glob matching
		if strings.HasSuffix(pattern, "/") && isDir {
			if name == strings.TrimSuffix(pattern, "/") {
				return true
			}
		}
		if matched, _ := filepath.Match(pattern, name); matched {
			return true
		}
	}

	return false
}
