package deps

// DepsResult contains the dependency analysis for a single file.
type DepsResult struct {
	FilePath   string    `json:"file_path"`
	Language   string    `json:"language"`
	Imports    []DepLink `json:"imports"`
	ImportedBy []DepLink `json:"imported_by"`
	Exports    []string  `json:"exports"`
}

// DepLink represents a single dependency connection.
type DepLink struct {
	FilePath string `json:"file_path"`
	Symbol   string `json:"symbol"`
	Line     int    `json:"line"`
}
