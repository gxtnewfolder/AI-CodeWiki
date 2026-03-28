import { Component, Input, Output, EventEmitter, inject, signal } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { FileNode } from '../../models/api.models';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideFile, lucideZap, lucideSearch } from '@ng-icons/lucide';
import { MarkdownComponent } from 'ngx-markdown';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-search-panel',
  standalone: true,
  imports: [NgIcon, MarkdownComponent, CommonModule, FormsModule],
  providers: [provideIcons({ lucideFile, lucideZap, lucideSearch })],
  template: `
    <div class="search-panel">
      <!-- Mode Toggle (Segmented Control) -->
      <div class="toggle-container">
        <div class="segmented-control">
          <button 
            [class.active]="mode() === 'search'" 
            (click)="mode.set('search')"
            aria-label="Search files"
          >
            <ng-icon name="lucideSearch" size="14" />
            <span>Files</span>
          </button>
          <button 
            [class.active]="mode() === 'qa'" 
            (click)="mode.set('qa')"
            aria-label="Ask AI"
          >
            <ng-icon name="lucideZap" size="14" />
            <span>AI QA</span>
          </button>
          <div class="selection-indicator" [class.shift]="mode() === 'qa'"></div>
        </div>
      </div>

      <!-- Search Input Area -->
      <div class="search-box-wrapper">
        <div class="input-container">
          <ng-icon 
            [name]="mode() === 'search' ? 'lucideSearch' : 'lucideZap'" 
            size="14" 
            class="input-icon"
            [class.text-primary]="mode() === 'qa'"
          />
          <input
            type="search"
            class="modern-input"
            [placeholder]="mode() === 'search' ? 'Search files…' : 'Ask anything about code…'"
            [(ngModel)]="rawQuery"
            (input)="onInput($event)"
            (keydown.enter)="onEnter()"
          />
          @if (mode() === 'qa' && rawQuery) {
            <div class="input-hint-badge">Enter</div>
          }
        </div>
      </div>

      <!-- Scrollable Content -->
      <div class="results-viewport hlm-scrollbar">
        @if (mode() === 'search') {
          @if (results().length > 0) {
            <div class="search-results-list animate-in">
              <div class="results-header">
                {{ results().length }} files found
              </div>
              @for (file of results(); track file.path) {
                <button class="file-result-item" (click)="fileSelect.emit(file.path)">
                  <div class="file-icon-bg">
                    <ng-icon name="lucideFile" size="12" />
                  </div>
                  <span class="file-path-text">{{ file.path }}</span>
                </button>
              }
            </div>
          } @else if (query() && !searching()) {
            <div class="empty-state-illust animate-in">
              <div class="empty-icon-circle">
                <ng-icon name="lucideSearch" size="24" />
              </div>
              <p>No files match your search</p>
            </div>
          }
        } @else {
          @if (!searching() && !query()) {
            <div class="empty-state-illust animate-in">
              <div class="empty-icon-circle ai">
                <ng-icon name="lucideZap" size="24" />
              </div>
              <h3>Codebase Intelligence</h3>
              <p>Ask about architecture, patterns, or specific implementations.</p>
            </div>
          }
        }

        @if (searching()) {
          <div class="loading-overlay">
            <div class="loading-bar"></div>
            <span class="text-xs">{{ mode() === 'search' ? 'Scanning...' : 'Consulting codebase...' }}</span>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .search-panel { 
      display: flex;
      flex-direction: column;
      height: 100%;
      background: var(--sidebar-bg);
    }

    /* ─── Mode Toggle (Premium Segmented Control) ─── */
    .toggle-container {
      padding: var(--space-3) var(--space-4) var(--space-2);
    }

    .segmented-control {
      position: relative;
      display: flex;
      background: var(--surface-3);
      padding: 2px;
      border-radius: var(--radius-lg);
      border: 1px solid var(--border);
    }

    .segmented-control button {
      position: relative;
      z-index: 2;
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-2);
      padding: var(--space-1) 0;
      height: 28px;
      font-size: 11px;
      font-weight: var(--font-medium);
      color: var(--text-subtle);
      border: none;
      background: transparent;
      cursor: pointer;
      transition: color 200ms ease;
    }

    .segmented-control button.active {
      color: var(--text);
    }

    .selection-indicator {
      position: absolute;
      top: 2px;
      left: 2px;
      width: calc(50% - 2px);
      height: calc(100% - 4px);
      background: var(--surface-1);
      border-radius: calc(var(--radius-lg) - 2px);
      box-shadow: var(--shadow-sm);
      z-index: 1;
      transition: transform 250ms cubic-bezier(0.4, 0, 0.2, 1);
    }

    .selection-indicator.shift {
      transform: translateX(100%);
    }

    /* ─── Search Box ─── */
    .search-box-wrapper {
      padding: var(--space-2) var(--space-4);
    }

    .input-container {
      position: relative;
      display: flex;
      align-items: center;
    }

    .input-icon {
      position: absolute;
      left: 10px;
      color: var(--text-disabled);
      pointer-events: none;
      transition: color 200ms;
    }

    .modern-input {
      width: 100%;
      height: 36px;
      padding: 0 12px 0 32px;
      font-size: var(--text-sm);
      background: var(--surface-1);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      color: var(--text);
      outline: none;
      transition: all 150ms ease;
    }

    .modern-input:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px var(--primary-tint);
    }

    .input-hint-badge {
      position: absolute;
      right: 8px;
      padding: 2px 6px;
      font-size: 9px;
      font-weight: var(--font-bold);
      color: var(--text-disabled);
      background: var(--surface-3);
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      pointer-events: none;
    }

    /* ─── Results Area ─── */
    .results-viewport {
      flex: 1;
      overflow-y: auto;
      padding: var(--space-2) 0;
    }

    .results-header {
      padding: var(--space-2) var(--space-4);
      font-size: 10px;
      font-weight: var(--font-bold);
      text-transform: uppercase;
      color: var(--text-disabled);
      letter-spacing: var(--tracking-caps);
    }

    .file-result-item {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      width: 100%;
      padding: var(--space-2) var(--space-4);
      border: none;
      background: transparent;
      text-align: left;
      cursor: pointer;
      transition: all 120ms ease;
    }

    .file-result-item:hover {
      background: var(--sidebar-hover);
    }

    .file-icon-bg {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      background: var(--surface-2);
      border-radius: var(--radius-sm);
      color: var(--text-muted);
    }

    .file-path-text {
      font-size: 12px;
      color: var(--text-muted);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* ─── QA Content (Glassmorphism inspired) ─── */
    .qa-content-card {
      padding: var(--space-3) var(--space-4);
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
    }

    .qa-bubble {
      background: var(--surface-1);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: var(--space-4);
      box-shadow: var(--shadow-sm);
    }

    .qa-markdown {
      font-size: 13px;
      line-height: 1.65;
      color: var(--text-muted);
      max-height: 400px;
      overflow-y: auto;
    }

    .qa-markdown :global(p) { margin-bottom: var(--space-3); }
    .qa-markdown :global(code) { 
      background: var(--surface-2);
      padding: 1px 4px;
      border-radius: 3px;
      font-size: 0.9em;
      color: var(--primary);
    }

    .label-xs {
      font-size: 9px;
      font-weight: var(--font-bold);
      text-transform: uppercase;
      color: var(--text-disabled);
      margin-bottom: var(--space-2);
      letter-spacing: var(--tracking-caps);
    }

    .source-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .chip-item {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 8px;
      background: var(--surface-3);
      border: 1px solid var(--border);
      border-radius: 20px;
      font-size: 10px;
      color: var(--text-muted);
      cursor: pointer;
      transition: all 150ms;
    }

    .chip-item:hover {
      background: var(--primary-tint);
      color: var(--primary);
      border-color: var(--primary);
    }

    /* ─── State illustrations ─── */
    .empty-state-illust {
      padding: var(--space-12) var(--space-6);
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-3);
    }

    .empty-icon-circle {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 56px;
      height: 56px;
      background: var(--surface-3);
      border-radius: 50%;
      color: var(--text-disabled);
      margin-bottom: var(--space-2);
    }

    .empty-icon-circle.ai {
      background: var(--primary-tint);
      color: var(--primary);
    }

    .empty-state-illust h3 {
      font-size: var(--text-base);
      font-weight: var(--font-semibold);
      color: var(--text);
    }

    .empty-state-illust p {
      font-size: var(--text-sm);
      color: var(--text-subtle);
      max-width: 200px;
    }

    /* ─── Loading State ─── */
    .loading-overlay {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: var(--space-8) 0;
      gap: var(--space-3);
      color: var(--text-subtle);
    }

    .loading-bar {
      width: 40px;
      height: 3px;
      background: var(--surface-3);
      border-radius: 2px;
      position: relative;
      overflow: hidden;
    }

    .loading-bar::after {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: var(--primary);
      animation: progress 1s infinite linear;
    }

    @keyframes progress {
      0% { left: -100%; }
      100% { left: 100%; }
    }
  `],
})
export class SearchPanelComponent {
  @Input() projectPath = '';
  @Output() fileSelect = new EventEmitter<string>();
  @Output() qaResult = new EventEmitter<{question: string, response: any}>();

  private api = inject(ApiService);
  private debounceTimer: any;

  readonly mode = signal<'search' | 'qa'>('search');
  readonly query = signal('');
  readonly results = signal<FileNode[]>([]);
  readonly qaResponse = signal<any>(null);
  readonly searching = signal(false);

  rawQuery = '';

  onInput(event: Event) {
    if (this.mode() === 'search') {
      this.onSearch();
    }
  }

  onEnter() {
    if (this.mode() === 'qa') {
      this.onQA();
    }
  }

  private onSearch() {
    const q = this.rawQuery;
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

  private onQA() {
    const q = this.rawQuery;
    if (!q || q.length < 5) return;

    this.query.set(q);
    this.searching.set(true);
    this.qaResponse.set(null);

    this.api.codeQA({
      project_path: this.projectPath,
      question: q
    }).subscribe({
      next: (res) => {
        this.qaResponse.set(res);
        this.searching.set(false);
        this.qaResult.emit({ question: q, response: res });
      },
      error: () => {
        this.searching.set(false);
      }
    });
  }
}
