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

// --- Browse ---

export interface DirEntry {
  name: string;
  path: string;
  has_children: boolean;
}

export interface BrowseResult {
  current_path: string;
  parent: string;
  separator: string;
  dirs: DirEntry[];
}

// --- Dependencies ---

export interface DepLink {
  file_path: string;
  symbol: string;
  line: number;
}

export interface DepsResult {
  file_path: string;
  language: string;
  imports: DepLink[];
  imported_by: DepLink[];
  exports: string[];
}

// --- AI Features ---

export interface QARequest {
  project_path: string;
  question: string;
  max_context_files?: number;
}

export interface QAResponse {
  answer_md: string;
  used_files?: { file_path: string; content_excerpt: string }[];
}

export interface ImpactAnalysisRequest {
  project_path: string;
  file_path: string;
  question?: string;
}

export interface ImpactNode {
  id: string;
  label: string;
  file_path?: string;
}

export interface ImpactEdge {
  source: string;
  target: string;
  relation: string;
}

export interface ImpactAnalysisResponse {
  analysis_md: string;
  nodes: ImpactNode[];
  edges: ImpactEdge[];
}

