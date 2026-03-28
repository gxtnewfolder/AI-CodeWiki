package cache

import (
	"database/sql"
	"time"

	"github.com/user/ai-codewiki-backend/internal/db"
)

type Cache struct {
	DB *sql.DB
}

func New(database *sql.DB) *Cache {
	return &Cache{DB: database}
}

// Get returns a cached summary if the hash matches.
func (c *Cache) Get(projectPath, filePath, currentHash string) (*db.FileSummary, bool) {
	var s db.FileSummary
	err := c.DB.QueryRow(
		`SELECT id, project_path, file_path, file_hash, summary_md, provider, updated_at
		 FROM file_summaries WHERE project_path = ? AND file_path = ?`,
		projectPath, filePath,
	).Scan(&s.ID, &s.ProjectPath, &s.FilePath, &s.FileHash, &s.SummaryMD, &s.Provider, &s.UpdatedAt)

	if err != nil {
		return nil, false
	}

	// Cache hit only if hash matches
	if s.FileHash == currentHash {
		return &s, true
	}

	return nil, false
}

// Set stores or updates a summary in the cache.
func (c *Cache) Set(projectPath, filePath, fileHash, summaryMD, provider string) error {
	_, err := c.DB.Exec(
		`INSERT INTO file_summaries (project_path, file_path, file_hash, summary_md, provider, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?)
		 ON CONFLICT(project_path, file_path) DO UPDATE SET
		   file_hash = excluded.file_hash,
		   summary_md = excluded.summary_md,
		   provider = excluded.provider,
		   updated_at = excluded.updated_at`,
		projectPath, filePath, fileHash, summaryMD, provider, time.Now(),
	)
	return err
}

// ListIndexedFiles returns a map of all file paths that have an existing summary.
func (c *Cache) ListIndexedFiles(projectPath string) (map[string]bool, error) {
	rows, err := c.DB.Query("SELECT file_path FROM file_summaries WHERE project_path = ?", projectPath)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	indexedFiles := make(map[string]bool)
	for rows.Next() {
		var fp string
		if err := rows.Scan(&fp); err == nil {
			indexedFiles[fp] = true
		}
	}
	return indexedFiles, nil
}

// Stats returns cache statistics.
func (c *Cache) Stats() (total int, err error) {
	err = c.DB.QueryRow("SELECT COUNT(*) FROM file_summaries").Scan(&total)
	return
}
