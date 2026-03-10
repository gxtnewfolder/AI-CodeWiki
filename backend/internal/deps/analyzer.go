package deps

import (
	"bufio"
	"os"
	"path/filepath"
	"regexp"
	"strings"
)

// languagePatterns returns import regex patterns for each language.
var languagePatterns = map[string][]*regexp.Regexp{
	"go": {
		regexp.MustCompile(`"([^"]+)"`), // import "pkg" or in import blocks
	},
	"typescript": {
		regexp.MustCompile(`from\s+['"]([^'"]+)['"]`),          // import { } from '...'
		regexp.MustCompile(`import\s+['"]([^'"]+)['"]`),         // import '...' (side-effect)
		regexp.MustCompile(`require\(\s*['"]([^'"]+)['"]\s*\)`), // require('...')
	},
	"javascript": {
		regexp.MustCompile(`from\s+['"]([^'"]+)['"]`),
		regexp.MustCompile(`require\(\s*['"]([^'"]+)['"]\s*\)`),
	},
	"python": {
		regexp.MustCompile(`from\s+([\w.]+)\s+import`), // from xxx import
		regexp.MustCompile(`^import\s+([\w.]+)`),        // import xxx
	},
	"java": {
		regexp.MustCompile(`import\s+([\w.]+);`),
	},
	"kotlin": {
		regexp.MustCompile(`import\s+([\w.]+)`),
	},
	"rust": {
		regexp.MustCompile(`use\s+((?:crate|super|self)::[\w:]+)`),
		regexp.MustCompile(`mod\s+(\w+)`),
	},
	"csharp": {
		regexp.MustCompile(`using\s+([\w.]+)\s*;`),
	},
}

// exportPatterns detect exported symbols in each language.
var exportPatterns = map[string][]*regexp.Regexp{
	"go": {
		regexp.MustCompile(`^func\s+([A-Z]\w+)`),   // exported functions
		regexp.MustCompile(`^type\s+([A-Z]\w+)`),    // exported types
		regexp.MustCompile(`^var\s+([A-Z]\w+)`),     // exported vars
	},
	"typescript": {
		regexp.MustCompile(`export\s+(?:function|class|const|let|var|type|interface|enum)\s+(\w+)`),
		regexp.MustCompile(`export\s+default\s+(?:function|class)\s+(\w+)`),
	},
	"javascript": {
		regexp.MustCompile(`export\s+(?:function|class|const|let|var)\s+(\w+)`),
		regexp.MustCompile(`module\.exports\s*=`),
	},
	"python": {
		regexp.MustCompile(`^def\s+(\w+)`),
		regexp.MustCompile(`^class\s+(\w+)`),
	},
}

// DetectLanguage returns the language based on file extension.
func DetectLanguage(filePath string) string {
	ext := strings.ToLower(filepath.Ext(filePath))
	switch ext {
	case ".go":
		return "go"
	case ".ts", ".tsx":
		return "typescript"
	case ".js", ".jsx", ".mjs", ".cjs":
		return "javascript"
	case ".py":
		return "python"
	case ".java":
		return "java"
	case ".kt", ".kts":
		return "kotlin"
	case ".rs":
		return "rust"
	case ".cs":
		return "csharp"
	default:
		return ""
	}
}

// AnalyzeFile parses a file and extracts its imports and exports.
func AnalyzeFile(projectPath, filePath string) *DepsResult {
	lang := DetectLanguage(filePath)
	if lang == "" {
		return &DepsResult{FilePath: filePath, Language: "unknown"}
	}

	fullPath := filepath.Join(projectPath, filePath)
	file, err := os.Open(fullPath)
	if err != nil {
		return &DepsResult{FilePath: filePath, Language: lang}
	}
	defer file.Close()

	patterns := languagePatterns[lang]
	expPatterns := exportPatterns[lang]

	var imports []DepLink
	var exports []string

	scanner := bufio.NewScanner(file)
	lineNum := 0
	inImportBlock := false // for Go's import ( ) blocks

	for scanner.Scan() {
		lineNum++
		line := scanner.Text()
		trimmed := strings.TrimSpace(line)

		// Handle Go import blocks
		if lang == "go" {
			if trimmed == "import (" {
				inImportBlock = true
				continue
			}
			if inImportBlock && trimmed == ")" {
				inImportBlock = false
				continue
			}
		}

		// Extract imports
		for _, p := range patterns {
			matches := p.FindStringSubmatch(trimmed)
			if len(matches) >= 2 {
				importPath := matches[1]

				// Resolve to file path
				resolved := resolveImport(projectPath, filePath, importPath, lang)

				imports = append(imports, DepLink{
					FilePath: resolved,
					Symbol:   importPath,
					Line:     lineNum,
				})
			}
		}

		// Extract exports
		for _, p := range expPatterns {
			matches := p.FindStringSubmatch(trimmed)
			if len(matches) >= 2 {
				exports = append(exports, matches[1])
			}
		}
	}

	return &DepsResult{
		FilePath: filePath,
		Language: lang,
		Imports:  imports,
		Exports:  exports,
	}
}

// resolveImport tries to resolve an import string to an actual project file path.
func resolveImport(projectPath, sourceFile, importPath, lang string) string {
	switch lang {
	case "go":
		// For Go, extract the last part after module prefix
		// e.g., "github.com/user/project/internal/config" -> "internal/config"
		parts := strings.Split(importPath, "/")
		// Try to find matching directory in project
		for i := range parts {
			candidate := strings.Join(parts[i:], "/")
			checkPath := filepath.Join(projectPath, candidate)
			if info, err := os.Stat(checkPath); err == nil && info.IsDir() {
				return filepath.ToSlash(candidate)
			}
		}
		return importPath

	case "typescript", "javascript":
		if !strings.HasPrefix(importPath, ".") {
			return importPath // node_module, keep as-is
		}
		sourceDir := filepath.Dir(sourceFile)
		resolved := filepath.Join(sourceDir, importPath)
		resolved = filepath.ToSlash(resolved)

		// Try with extensions
		for _, ext := range []string{".ts", ".tsx", ".js", ".jsx", "/index.ts", "/index.js"} {
			candidate := filepath.Join(projectPath, resolved+ext)
			if _, err := os.Stat(candidate); err == nil {
				return resolved + ext
			}
		}
		return resolved

	default:
		return importPath
	}
}
