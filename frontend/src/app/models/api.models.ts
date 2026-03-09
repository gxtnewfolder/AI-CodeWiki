export interface FileNode {
  name: string;
  path: string;
  is_dir: boolean;
  size?: number;
  children?: FileNode[];
}

export interface SummaryRequest {
  project_path: string;
  file_path: string;
}

export interface SummaryResponse {
  file_path: string;
  summary: string;
  provider: string;
  cache_hit: boolean;
  hash: string;
}

export interface SearchResult {
  query: string;
  results: FileNode[];
  count: number;
}

export interface Bookmark {
  id: number;
  project_path: string;
  file_path: string;
  display_name: string;
  created_at: string;
}

export interface HistoryEntry {
  id: number;
  project_path: string;
  file_path: string;
  viewed_at: string;
}

export interface LLMValidation {
  valid: boolean;
  message: string;
}
