import { Injectable, signal, computed } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ProjectService {
  // Set of file paths that have been indexed/summarized in this session
  private _indexedFiles = signal<Set<string>>(new Set());
  
  readonly indexedFiles = computed(() => this._indexedFiles());

  // Mark a file as indexed
  markAsIndexed(path: string) {
    const current = new Set(this._indexedFiles());
    current.add(path);
    this._indexedFiles.set(current);
  }

  // Check if a file is indexed (checking both the service state and the node property)
  isIndexed(path: string, defaultValue = false): boolean {
    return defaultValue || this._indexedFiles().has(path);
  }

  // Bulk add indexed files (e.g. from initial tree load)
  registerIndexedFiles(paths: string[]) {
    const current = new Set(this._indexedFiles());
    paths.forEach(p => current.add(p));
    this._indexedFiles.set(current);
  }
}
