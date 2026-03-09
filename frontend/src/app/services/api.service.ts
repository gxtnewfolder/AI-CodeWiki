import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  FileNode,
  SummaryRequest,
  SummaryResponse,
  SearchResult,
  Bookmark,
  HistoryEntry,
  LLMValidation,
} from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:8080/api/v1';

  // --- Tree ---
  getTree(path: string): Observable<FileNode> {
    return this.http.get<FileNode>(`${this.baseUrl}/tree`, {
      params: { path },
    });
  }

  // --- Summary ---
  getSummary(req: SummaryRequest): Observable<SummaryResponse> {
    return this.http.post<SummaryResponse>(`${this.baseUrl}/summary`, req);
  }

  // --- Search ---
  searchFiles(query: string, path: string): Observable<SearchResult> {
    return this.http.get<SearchResult>(`${this.baseUrl}/search`, {
      params: { q: query, path },
    });
  }

  // --- Settings ---
  getSettings(): Observable<Record<string, string>> {
    return this.http.get<Record<string, string>>(`${this.baseUrl}/settings`);
  }

  updateSettings(settings: Record<string, string>): Observable<{ status: string }> {
    return this.http.put<{ status: string }>(`${this.baseUrl}/settings`, settings);
  }

  // --- Bookmarks ---
  listBookmarks(): Observable<Bookmark[]> {
    return this.http.get<Bookmark[]>(`${this.baseUrl}/bookmarks`);
  }

  addBookmark(projectPath: string, filePath: string): Observable<{ id: number; status: string }> {
    return this.http.post<{ id: number; status: string }>(`${this.baseUrl}/bookmarks`, {
      project_path: projectPath,
      file_path: filePath,
    });
  }

  removeBookmark(id: number): Observable<{ status: string }> {
    return this.http.delete<{ status: string }>(`${this.baseUrl}/bookmarks/${id}`);
  }

  // --- History ---
  listHistory(): Observable<HistoryEntry[]> {
    return this.http.get<HistoryEntry[]>(`${this.baseUrl}/history`);
  }

  // --- LLM Validation ---
  validateLLMKey(provider: string, apiKey: string): Observable<LLMValidation> {
    return this.http.post<LLMValidation>(`${this.baseUrl}/llm/validate`, {
      provider,
      api_key: apiKey,
    });
  }
}
