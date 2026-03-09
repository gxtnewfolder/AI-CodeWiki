import { Component, Input, Output, EventEmitter, inject, signal } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { FileNode } from '../../models/api.models';

@Component({
  selector: 'app-search-panel',
  standalone: true,
  imports: [],
  template: `
    <div class="search-panel">
      <div class="search-input-wrapper">
        <input
          type="search"
          class="search-input"
          placeholder="Search files…"
          (input)="onSearch($event)"
        />
      </div>

      @if (results().length > 0) {
        <div class="search-results">
          <div class="search-count">{{ results().length }} results</div>
          @for (file of results(); track file.path) {
            <button class="sidebar-item" (click)="fileSelect.emit(file.path)">
              <span class="sidebar-item-icon">📄</span>
              <span class="sidebar-item-text">{{ file.path }}</span>
            </button>
          }
        </div>
      } @else if (query() && !searching()) {
        <div class="sidebar-empty">No files found</div>
      }

      @if (searching()) {
        <div class="sidebar-empty">Searching…</div>
      }
    </div>
  `,
  styles: [`
    .search-panel { padding: var(--space-2); }

    .search-input-wrapper { padding: var(--space-2); }

    .search-input {
      width: 100%;
      padding: var(--space-2) var(--space-3);
      font-size: var(--text-sm);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      background: var(--surface-1);
      color: var(--text);
      outline: none;
      font-family: var(--font-body);
    }

    .search-input:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 2px var(--primary-tint);
    }

    .search-results {
      margin-top: var(--space-2);
    }

    .search-count {
      padding: var(--space-1) var(--space-3);
      font-size: var(--text-xs);
      color: var(--text-subtle);
    }
  `],
})
export class SearchPanelComponent {
  @Input() projectPath = '';
  @Output() fileSelect = new EventEmitter<string>();

  private api = inject(ApiService);
  private debounceTimer: any;

  readonly query = signal('');
  readonly results = signal<FileNode[]>([]);
  readonly searching = signal(false);

  onSearch(event: Event) {
    const q = (event.target as HTMLInputElement).value;
    this.query.set(q);

    clearTimeout(this.debounceTimer);

    if (!q || q.length < 2) {
      this.results.set([]);
      return;
    }

    this.searching.set(true);
    this.debounceTimer = setTimeout(() => {
      this.api.searchFiles(q, this.projectPath).subscribe({
        next: (res) => {
          this.results.set(res.results || []);
          this.searching.set(false);
        },
        error: () => {
          this.searching.set(false);
        },
      });
    }, 300);
  }
}
