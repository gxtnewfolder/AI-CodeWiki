package db

import "time"

type FileSummary struct {
	ID          int64     `json:"id"`
	ProjectPath string    `json:"project_path"`
	FilePath    string    `json:"file_path"`
	FileHash    string    `json:"file_hash"`
	SummaryMD   string    `json:"summary_md"`
	Provider    string    `json:"provider"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type Setting struct {
	ID        int64     `json:"id"`
	Key       string    `json:"key"`
	Value     string    `json:"value"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Bookmark struct {
	ID          int64     `json:"id"`
	ProjectPath string    `json:"project_path"`
	FilePath    string    `json:"file_path"`
	DisplayName string    `json:"display_name"`
	CreatedAt   time.Time `json:"created_at"`
}

type HistoryEntry struct {
	ID          int64     `json:"id"`
	ProjectPath string    `json:"project_path"`
	FilePath    string    `json:"file_path"`
	ViewedAt    time.Time `json:"viewed_at"`
}
