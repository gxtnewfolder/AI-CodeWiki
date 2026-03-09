package scanner

import (
	"bufio"
	"os"
	"path/filepath"
	"strings"
)

func LoadIgnorePatterns(projectPath string) []string {
	var patterns []string

	// Load from .codewikiignore in project root
	ignorePath := filepath.Join(projectPath, ".codewikiignore")
	if f, err := os.Open(ignorePath); err == nil {
		defer f.Close()
		scanner := bufio.NewScanner(f)
		for scanner.Scan() {
			line := strings.TrimSpace(scanner.Text())
			if line != "" && !strings.HasPrefix(line, "#") {
				patterns = append(patterns, line)
			}
		}
	}

	return patterns
}
