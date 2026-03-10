import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { MarkdownComponent } from 'ngx-markdown';
import { SummaryResponse, DepsResult } from '../../models/api.models';
import { DepGraphComponent } from '../dep-graph/dep-graph.component';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideFile, lucideStar, lucideRefreshCw, lucideChevronLeft, lucideChevronRight, lucideAlertTriangle, lucideZap } from '@ng-icons/lucide';
import { ApiService } from '../../services/api.service';
import { inject } from '@angular/core';

@Component({
  selector: 'app-summary-viewer',
  standalone: true,
  imports: [MarkdownComponent, DepGraphComponent, NgIcon],
  providers: [
    provideIcons({
      lucideFile,
      lucideStar,
      lucideRefreshCw,
      lucideChevronLeft,
      lucideChevronRight,
      lucideAlertTriangle,
      lucideZap,
    }),
  ],
  template: `
    <div class="viewer">
      <!-- Header -->
      <div class="viewer-header">
        <div class="viewer-path">
          <ng-icon name="lucideFile" size="14" class="text-muted-foreground mr-1" />
          <span class="viewer-path-text">{{ filePath }}</span>
        </div>
        <div class="viewer-actions">
          <button
            class="btn btn-ghost btn-sm"
            (click)="toggleBookmark.emit()"
            [title]="isBookmarked ? 'Remove Bookmark' : 'Add Bookmark'"
          >
            <ng-icon
              [name]="'lucideStar'"
              [class.text-amber-400]="isBookmarked"
              [class.fill-amber-400]="isBookmarked"
              size="16"
            />
          </button>
          <button class="btn btn-ghost btn-sm" (click)="regenerate.emit()" title="Regenerate">
            <ng-icon name="lucideRefreshCw" size="14" />
          </button>
          <button
            class="btn btn-ghost btn-sm"
            (click)="showDeps.set(!showDeps())"
            [title]="showDeps() ? 'Hide Dependencies' : 'Show Dependencies'"
          >
            <ng-icon [name]="showDeps() ? 'lucideChevronRight' : 'lucideChevronLeft'" size="14" />
            <span class="ml-1">{{ showDeps() ? 'Hide' : 'Deps' }}</span>
          </button>
        </div>
      </div>

      <!-- Split Content -->
      <div class="viewer-split" [class.split-active]="showDeps()">
        <!-- Left: Markdown Summary -->
        <div class="viewer-content">
          @if (loading) {
            <!-- Skeleton Loading -->
            <div class="skeleton">
              <div class="skeleton-line w-40"></div>
              <div class="skeleton-line w-80"></div>
              <div class="skeleton-line w-60"></div>
              <div class="skeleton-spacer"></div>
              <div class="skeleton-line w-30"></div>
              <div class="skeleton-line w-70"></div>
              <div class="skeleton-line w-50"></div>
              <div class="skeleton-line w-90"></div>
              <div class="skeleton-spacer"></div>
              <div class="skeleton-line w-35"></div>
              <div class="skeleton-line w-65"></div>
            </div>
          } @else if (error) {
            <div class="error-card">
              <ng-icon name="lucideAlertTriangle" size="32" class="text-danger mb-2" />
              <div class="error-title">Error</div>
              <div class="error-message">{{ error }}</div>
              <button class="btn btn-primary btn-sm" (click)="regenerate.emit()">
                Retry
              </button>
            </div>
          } @else if (summary) {
            <div class="markdown-body">
              <markdown [data]="summary.summary" />
            </div>
          }
        </div>

        <!-- Right: Dependency Graph -->
        @if (showDeps()) {
          <div class="viewer-deps-divider" (mousedown)="onResizeDeps($event)"></div>
          <div class="viewer-deps" [style.width.px]="depsWidth()">
            <app-dep-graph
              [deps]="deps"
              [currentFile]="filePath"
              [impactAnalysis]="impactAnalysis()"
              (fileSelect)="fileSelect.emit($event)"
              (analyzeImpact)="onAnalyzeImpact()"
            />
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
    }

    .viewer {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
    }

    .viewer-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-3) var(--space-6);
      background: var(--surface-1);
      border-bottom: 1px solid var(--border);
      flex-shrink: 0;
    }

    .viewer-path {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      min-width: 0;
    }

    .viewer-path-icon { flex-shrink: 0; }
    .viewer-path-text {
      font-family: var(--font-mono);
      font-size: var(--text-sm);
      color: var(--text-muted);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .viewer-actions {
      display: flex;
      gap: var(--space-1);
      flex-shrink: 0;
    }

    /* ─── Split Layout ─── */
    .viewer-split {
      flex: 1;
      display: flex;
      overflow: hidden;
    }

    .viewer-content {
      flex: 1;
      overflow-y: auto;
      padding: var(--space-8) var(--space-10);
      display: flex;
      flex-direction: column;
      align-items: center;
      min-width: 0;
    }

    .viewer-deps-divider {
      width: 4px;
      cursor: col-resize;
      background: transparent;
      flex-shrink: 0;
      transition: background 120ms;
    }
    .viewer-deps-divider:hover { background: var(--primary); }

    .viewer-deps {
      flex-shrink: 0;
      border-left: 1px solid var(--border);
      overflow: hidden;
      background: var(--surface-1);
    }

    /* ─── Markdown (ngx-markdown) ─── */
    .markdown-body {
      width: 100%;
      max-width: 900px;
      font-size: var(--text-base);
      line-height: var(--leading-normal);
      color: var(--text);
    }

    :host ::ng-deep .markdown-body markdown h1 {
      font-size: var(--text-2xl);
      font-weight: var(--font-semibold);
      margin: var(--space-8) 0 var(--space-4);
      padding-bottom: var(--space-2);
      border-bottom: 1px solid var(--border);
      letter-spacing: -0.01em;
    }

    :host ::ng-deep .markdown-body markdown h2 {
      font-size: var(--text-xl);
      font-weight: var(--font-semibold);
      margin: var(--space-6) 0 var(--space-3);
      color: var(--primary);
    }

    :host ::ng-deep .markdown-body markdown h3 {
      font-size: var(--text-lg);
      font-weight: var(--font-medium);
      margin: var(--space-4) 0 var(--space-2);
    }

    :host ::ng-deep .markdown-body markdown p {
      margin: var(--space-3) 0;
    }

    :host ::ng-deep .markdown-body markdown ul,
    :host ::ng-deep .markdown-body markdown ol {
      margin: var(--space-3) 0;
      padding-left: var(--space-6);
    }

    :host ::ng-deep .markdown-body markdown li {
      margin: var(--space-1) 0;
    }

    :host ::ng-deep .markdown-body markdown code {
      font-family: var(--font-mono);
      font-size: 0.875em;
      padding: 2px 6px;
      background: var(--surface-2);
      border-radius: var(--radius-sm);
      color: var(--primary);
    }

    :host ::ng-deep .markdown-body markdown pre {
      margin: var(--space-4) 0;
      padding: var(--space-4);
      background: #1e1e1e;
      border-radius: var(--radius-lg);
      overflow-x: auto;
      font-size: var(--text-sm);
    }

    :host ::ng-deep .markdown-body markdown pre code {
      background: none;
      padding: 0;
      color: #d4d4d4;
      border-radius: 0;
    }

    :host ::ng-deep .markdown-body markdown strong {
      font-weight: var(--font-semibold);
    }

    :host ::ng-deep .markdown-body markdown blockquote {
      border-left: 3px solid var(--primary);
      padding: var(--space-2) var(--space-4);
      margin: var(--space-4) 0;
      background: var(--primary-tint);
      border-radius: 0 var(--radius-md) var(--radius-md) 0;
      color: var(--text-muted);
    }

    :host ::ng-deep .markdown-body markdown table {
      width: 100%;
      border-collapse: collapse;
      margin: var(--space-4) 0;
      font-size: var(--text-sm);
    }

    :host ::ng-deep .markdown-body markdown th,
    :host ::ng-deep .markdown-body markdown td {
      padding: var(--space-2) var(--space-3);
      border: 1px solid var(--border);
      text-align: left;
    }

    :host ::ng-deep .markdown-body markdown th {
      background: var(--surface-2);
      font-weight: var(--font-semibold);
    }

    /* ─── Skeleton ─── */
    .skeleton {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
      width: 100%;
      max-width: 900px;
      padding: var(--space-2) 0;
    }

    .skeleton-line {
      height: 16px;
      background: linear-gradient(90deg, var(--surface-2) 25%, var(--surface-3) 50%, var(--surface-2) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s ease-in-out infinite;
      border-radius: var(--radius-sm);
    }

    .skeleton-spacer { height: var(--space-4); }

    .w-30 { width: 30%; }
    .w-35 { width: 35%; }
    .w-40 { width: 40%; }
    .w-50 { width: 50%; }
    .w-60 { width: 60%; }
    .w-65 { width: 65%; }
    .w-70 { width: 70%; }
    .w-80 { width: 80%; }
    .w-90 { width: 90%; }

    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    /* ─── Error ─── */
    .error-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-8);
      background: var(--danger-bg);
      border: 1px solid var(--danger);
      border-radius: var(--radius-lg);
      text-align: center;
      max-width: 400px;
    }

    .error-icon { font-size: 32px; }
    .error-title {
      font-size: var(--text-lg);
      font-weight: var(--font-semibold);
      color: var(--danger);
    }
    .error-message {
      font-size: var(--text-sm);
      color: var(--text-muted);
      word-break: break-word;
    }
  `],
})
export class SummaryViewerComponent {
  @Input() filePath!: string;
  @Input() summary: SummaryResponse | null = null;
  @Input() deps: DepsResult | null = null;
  @Input() loading = false;
  @Input() error: string | null = null;
  @Input() isBookmarked = false;
  @Output() toggleBookmark = new EventEmitter<void>();
  @Output() regenerate = new EventEmitter<void>();
  @Output() fileSelect = new EventEmitter<string>();

  @Input() projectPath = '';
  
  private api = inject(ApiService);
  readonly impactAnalysis = signal<any>(null);
  readonly analyzingImpact = signal(false);

  onAnalyzeImpact() {
    if (!this.projectPath || !this.filePath) return;
    
    this.analyzingImpact.set(true);
    this.api.analyzeImpact({
      project_path: this.projectPath,
      file_path: this.filePath
    }).subscribe({
      next: (res) => {
        this.impactAnalysis.set(res);
        this.analyzingImpact.set(false);
      },
      error: () => {
        this.analyzingImpact.set(false);
      }
    });
  }

  // Reset impact when file changes
  ngOnChanges() {
    this.impactAnalysis.set(null);
  }

  readonly showDeps = signal(true);
  readonly depsWidth = signal(360);

  onResizeDeps(event: MouseEvent) {
    const startX = event.clientX;
    const startWidth = this.depsWidth();

    const onMove = (e: MouseEvent) => {
      // Moving left = larger width (panel is on right)
      const newWidth = Math.min(600, Math.max(240, startWidth - (e.clientX - startX)));
      this.depsWidth.set(newWidth);
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }
}
