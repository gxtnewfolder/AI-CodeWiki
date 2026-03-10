package deps

import (
	"bufio"
	"os"
	"path/filepath"
	"strings"
)

// maxFilesToScan caps how many files we scan for reverse deps (avoid timeout).
const maxFilesToScan = 200

// FindReverseDeps walks the project and finds files that import the target file.
// This is the "who uses this file?" query — equivalent to `grep -r "filename" --include="*.ext"`.
func FindReverseDeps(projectPath, targetFile string) []DepLink {
	targetLang := DetectLanguage(targetFile)
	if targetLang == "" {
		return nil
	}

	// Build search terms: basename without extension, and full relative path
	targetBase := strings.TrimSuffix(filepath.Base(targetFile), filepath.Ext(targetFile))
	targetDir := filepath.ToSlash(filepath.Dir(targetFile))

	// Compatible extensions to search
	searchExts := compatibleExtensions(targetLang)

	var results []DepLink
	filesScanned := 0

	filepath.Walk(projectPath, func(path string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() {
			if info != nil && info.IsDir() && isSkipDir(info.Name()) {
				return filepath.SkipDir
			}
			return nil
		}

		if filesScanned >= maxFilesToScan {
			return filepath.SkipAll
		}

		ext := strings.ToLower(filepath.Ext(path))
		if !searchExts[ext] {
			return nil
		}

		relPath, _ := filepath.Rel(projectPath, path)
		relPath = filepath.ToSlash(relPath)

		// Don't check the target file itself
		if relPath == filepath.ToSlash(targetFile) {
			return nil
		}

		filesScanned++

		// Grep the file for references to the target
		links := grepFileForImport(path, relPath, targetBase, targetDir, targetLang)
		results = append(results, links...)

		return nil
	})

	return results
}

// grepFileForImport reads a file line by line and checks if it imports the target.
func grepFileForImport(fullPath, relPath, targetBase, targetDir, lang string) []DepLink {
	file, err := os.Open(fullPath)
	if err != nil {
		return nil
	}
	defer file.Close()

	patterns := languagePatterns[lang]
	if patterns == nil {
		return nil
	}

	var links []DepLink
	scanner := bufio.NewScanner(file)
	lineNum := 0

	for scanner.Scan() {
		lineNum++
		line := strings.TrimSpace(scanner.Text())

		for _, p := range patterns {
			matches := p.FindStringSubmatch(line)
			if len(matches) < 2 {
				continue
			}
			importStr := matches[1]

			// Check if this import references our target file
			if matchesTarget(importStr, targetBase, targetDir, lang) {
				links = append(links, DepLink{
					FilePath: relPath,
					Symbol:   importStr,
					Line:     lineNum,
				})
				return links // one match per file is enough
			}
		}
	}

	return links
}

// matchesTarget checks if an import string refers to the target file.
func matchesTarget(importStr, targetBase, targetDir, lang string) bool {
	importStr = strings.ToLower(importStr)
	targetBase = strings.ToLower(targetBase)
	targetDir = strings.ToLower(targetDir)

	switch lang {
	case "go":
		// Go import: "module/internal/config" → target is "internal/config"
		return strings.HasSuffix(importStr, targetDir) ||
			strings.HasSuffix(importStr, "/"+targetBase)

	case "typescript", "javascript":
		// TS/JS: "./services/api.service" or "../api"
		cleanImport := strings.TrimPrefix(importStr, "./")
		cleanImport = strings.TrimPrefix(cleanImport, "../")
		return strings.Contains(cleanImport, targetBase)

	default:
		return strings.Contains(importStr, targetBase)
	}
}

func compatibleExtensions(lang string) map[string]bool {
	switch lang {
	case "go":
		return map[string]bool{".go": true}
	case "typescript":
		return map[string]bool{".ts": true, ".tsx": true}
	case "javascript":
		return map[string]bool{".js": true, ".jsx": true, ".mjs": true, ".cjs": true, ".ts": true}
	case "python":
		return map[string]bool{".py": true}
	case "java":
		return map[string]bool{".java": true}
	case "kotlin":
		return map[string]bool{".kt": true, ".kts": true}
	case "rust":
		return map[string]bool{".rs": true}
	case "csharp":
		return map[string]bool{".cs": true}
	default:
		return nil
	}
}

func isSkipDir(name string) bool {
	skip := map[string]bool{
		"node_modules": true, ".git": true, "__pycache__": true,
		"vendor": true, "dist": true, "build": true, "target": true,
		".next": true, ".nuxt": true, ".angular": true,
	}
	return skip[name]
}
