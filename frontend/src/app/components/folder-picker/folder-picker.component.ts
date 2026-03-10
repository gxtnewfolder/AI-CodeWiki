import { Component, inject, signal, Output, EventEmitter, OnInit } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { DirEntry } from '../../models/api.models';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideX, lucideFolder, lucideFolderOpen, lucideHistory, lucideChevronRight } from '@ng-icons/lucide';

@Component({
  selector: 'app-folder-picker',
  standalone: true,
  imports: [NgIcon],
  providers: [
    provideIcons({
      lucideX,
      lucideFolder,
      lucideFolderOpen,
      lucideHistory,
      lucideChevronRight,
    }),
  ],
  template: `
    <div class="picker-overlay" (click)="close()">
      <div class="picker-dialog" (click)="$event.stopPropagation()">
        <div class="picker-header">
          <h3>Open Project</h3>
          <button class="picker-close" (click)="close()">
            <ng-icon name="lucideX" size="18" />
          </button>
        </div>

        <!-- Path input -->
        <div class="picker-input-row">
          <input
            type="text"
            class="picker-input"
            [value]="currentPath()"
            (input)="onPathInput($event)"
            (keydown.enter)="selectCurrent()"
            placeholder="Enter path or browse below..."
          />
          <button class="picker-btn primary" (click)="selectCurrent()">Open</button>
        </div>

        <!-- Breadcrumb -->
        @if (breadcrumbs().length) {
          <div class="picker-breadcrumb">
            @for (bc of breadcrumbs(); track bc.path) {
              <button class="crumb" (click)="navigateTo(bc.path)">{{ bc.name }}</button>
              <ng-icon name="lucideChevronRight" size="12" class="text-muted-foreground opacity-50" />
            }
          </div>
        }

        <!-- Directory list -->
        <div class="picker-list">
          @if (loading()) {
            <div class="picker-loading">Loading...</div>
          } @else if (error()) {
            <div class="picker-error">{{ error() }}</div>
          } @else {
            @if (parentPath()) {
              <button class="picker-item parent" (click)="navigateTo(parentPath()!)">
                <ng-icon name="lucideFolder" size="16" class="text-primary opacity-70" />
                <span>..</span>
              </button>
            }
            @for (dir of dirs(); track dir.path) {
              <button
                class="picker-item"
                (click)="navigateTo(dir.path)"
                (dblclick)="onSelect(dir.path)"
              >
                <ng-icon [name]="dir.has_children ? 'lucideFolderOpen' : 'lucideFolder'" size="16" class="text-primary" />
                <span class="picker-item-name">{{ dir.name }}</span>
              </button>
            } @empty {
              <div class="picker-empty">No subdirectories</div>
            }
          }
        </div>

        <!-- Recent projects -->
        @if (recentProjects().length) {
          <div class="picker-recent">
            <div class="picker-recent-label">Recent Projects</div>
            @for (p of recentProjects(); track p) {
              <button class="picker-item recent" (click)="onSelect(p)">
                <ng-icon name="lucideHistory" size="14" />
                <span class="picker-item-name">{{ p }}</span>
              </button>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .picker-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100;
    }

    .picker-dialog {
      background: var(--surface-1);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      width: 560px;
      max-height: 70vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    }

    .picker-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-4);
      border-bottom: 1px solid var(--border);
    }

    .picker-header h3 {
      font-size: var(--text-lg);
      font-weight: var(--font-semibold);
    }

    .picker-close {
      border: none;
      background: transparent;
      cursor: pointer;
      font-size: var(--text-lg);
      color: var(--text-muted);
      padding: var(--space-1);
      border-radius: var(--radius-sm);
    }
    .picker-close:hover { background: var(--surface-2); }

    .picker-input-row {
      display: flex;
      gap: var(--space-2);
      padding: var(--space-3) var(--space-4);
      border-bottom: 1px solid var(--border);
    }

    .picker-input {
      flex: 1;
      padding: var(--space-2) var(--space-3);
      font-family: var(--font-mono);
      font-size: var(--text-sm);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      background: var(--bg);
      color: var(--text);
      outline: none;
    }
    .picker-input:focus { border-color: var(--primary); }

    .picker-btn {
      padding: var(--space-2) var(--space-4);
      font-size: var(--text-sm);
      font-weight: var(--font-medium);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      cursor: pointer;
      background: var(--surface-2);
      color: var(--text);
    }
    .picker-btn.primary {
      background: var(--primary);
      color: var(--primary-foreground, #fff);
      border-color: var(--primary);
    }

    .picker-breadcrumb {
      display: flex;
      align-items: center;
      gap: 2px;
      padding: var(--space-2) var(--space-4);
      font-size: var(--text-xs);
      overflow-x: auto;
      border-bottom: 1px solid var(--border);
    }

    .crumb {
      border: none;
      background: transparent;
      cursor: pointer;
      color: var(--primary);
      font-size: var(--text-xs);
      padding: 2px var(--space-1);
      border-radius: var(--radius-sm);
    }
    .crumb:hover { background: var(--surface-2); }
    .crumb-sep { color: var(--text-disabled); }

    .picker-list {
      flex: 1;
      overflow-y: auto;
      max-height: 300px;
    }

    .picker-item {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      width: 100%;
      padding: var(--space-2) var(--space-4);
      border: none;
      background: transparent;
      cursor: pointer;
      font-size: var(--text-sm);
      color: var(--text);
      text-align: left;
      transition: background 90ms;
    }
    .picker-item:hover { background: var(--surface-2); }
    .picker-item.parent { color: var(--text-muted); }

    .picker-item-name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .picker-loading, .picker-empty, .picker-error {
      padding: var(--space-6);
      text-align: center;
      color: var(--text-subtle);
      font-size: var(--text-sm);
    }
    .picker-error { color: var(--danger); }

    .picker-recent {
      border-top: 1px solid var(--border);
      padding: var(--space-2) 0;
    }

    .picker-recent-label {
      padding: var(--space-1) var(--space-4);
      font-size: var(--text-xs);
      font-weight: var(--font-medium);
      color: var(--text-subtle);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .picker-item.recent { color: var(--text-muted); }
  `],
})
export class FolderPickerComponent implements OnInit {
  private api = inject(ApiService);

  @Output() folderSelected = new EventEmitter<string>();
  @Output() closed = new EventEmitter<void>();

  readonly currentPath = signal('');
  readonly dirs = signal<DirEntry[]>([]);
  readonly parentPath = signal<string | null>(null);
  readonly breadcrumbs = signal<{ name: string; path: string }[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly recentProjects = signal<string[]>([]);

  ngOnInit() {
    // Load recent projects from localStorage
    const stored = localStorage.getItem('codewiki-recent');
    if (stored) {
      try {
        this.recentProjects.set(JSON.parse(stored));
      } catch { /* ignore */ }
    }

    // Load roots
    this.loadRoots();
  }

  private loadRoots() {
    this.loading.set(true);
    this.api.getRoots().subscribe({
      next: (roots) => {
        this.dirs.set(roots);
        this.loading.set(false);
        this.parentPath.set(null);
        this.breadcrumbs.set([]);
      },
      error: (err) => {
        this.error.set('Failed to load roots: ' + err.message);
        this.loading.set(false);
      },
    });
  }

  navigateTo(path: string) {
    this.currentPath.set(path);
    this.loading.set(true);
    this.error.set(null);

    this.api.browseDirs(path).subscribe({
      next: (result) => {
        this.dirs.set(result.dirs);
        this.parentPath.set(result.parent || null);
        this.loading.set(false);

        // Build breadcrumbs
        const parts = result.current_path.split('/').filter(Boolean);
        const crumbs: { name: string; path: string }[] = [];
        let accumulated = '';
        for (const part of parts) {
          accumulated += (accumulated ? '/' : '') + part;
          // On Windows, first part might be "C:" — add slash
          const crumbPath = accumulated.includes(':') && !accumulated.includes('/')
            ? accumulated + '/'
            : accumulated;
          crumbs.push({ name: part, path: crumbPath });
        }
        this.breadcrumbs.set(crumbs);
      },
      error: (err) => {
        this.error.set('Cannot access: ' + path);
        this.loading.set(false);
      },
    });
  }

  onPathInput(event: Event) {
    this.currentPath.set((event.target as HTMLInputElement).value);
  }

  selectCurrent() {
    const path = this.currentPath();
    if (path) {
      this.onSelect(path);
    }
  }

  onSelect(path: string) {
    // Save to recent projects
    const recent = this.recentProjects().filter(p => p !== path);
    recent.unshift(path);
    const trimmed = recent.slice(0, 5);
    this.recentProjects.set(trimmed);
    localStorage.setItem('codewiki-recent', JSON.stringify(trimmed));

    this.folderSelected.emit(path);
  }

  close() {
    this.closed.emit();
  }
}
