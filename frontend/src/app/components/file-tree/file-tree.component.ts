import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { FileNode } from '../../models/api.models';

@Component({
  selector: 'app-file-tree',
  standalone: true,
  imports: [],
  template: `
    @if (node) {
      <div class="tree">
        @for (child of node.children; track child.path) {
          @if (child.is_dir) {
            <div class="tree-dir">
              <button
                class="tree-item tree-folder"
                (click)="toggleDir(child.path)"
              >
                <span class="tree-icon">
                  {{ expandedDirs().has(child.path) ? '📂' : '📁' }}
                </span>
                <span class="tree-label">{{ child.name }}</span>
              </button>
              @if (expandedDirs().has(child.path)) {
                <div class="tree-children">
                  <app-file-tree
                    [node]="child"
                    [selectedFile]="selectedFile"
                    [depth]="depth + 1"
                    (fileSelect)="fileSelect.emit($event)"
                  />
                </div>
              }
            </div>
          } @else {
            <button
              class="tree-item tree-file"
              [class.active]="selectedFile === child.path"
              (click)="fileSelect.emit(child.path)"
            >
              <span class="tree-icon">{{ getFileIcon(child.name) }}</span>
              <span class="tree-label">{{ child.name }}</span>
              @if (child.size) {
                <span class="tree-size">{{ formatSize(child.size) }}</span>
              }
            </button>
          }
        }
      </div>
    }
  `,
  styles: [`
    .tree { user-select: none; }
    .tree-children { padding-left: 16px; }

    .tree-item {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      width: 100%;
      padding: 3px var(--space-3);
      border: none;
      background: transparent;
      color: var(--text);
      font-size: var(--text-sm);
      font-family: var(--font-body);
      text-align: left;
      cursor: pointer;
      border-radius: var(--radius-sm);
      transition: background 90ms ease-out;
    }

    .tree-item:hover { background: var(--sidebar-hover); }
    .tree-item.active {
      background: var(--sidebar-active);
      color: var(--primary);
      font-weight: var(--font-medium);
    }

    .tree-icon { font-size: 14px; flex-shrink: 0; width: 18px; text-align: center; }
    .tree-label {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      min-width: 0;
      flex: 1;
    }

    .tree-folder .tree-label { font-weight: var(--font-medium); }

    .tree-size {
      font-size: 10px;
      color: var(--text-subtle);
      font-family: var(--font-mono);
      flex-shrink: 0;
      font-variant-numeric: tabular-nums;
    }
  `],
})
export class FileTreeComponent {
  @Input() node!: FileNode;
  @Input() selectedFile: string | null = null;
  @Input() depth = 0;
  @Output() fileSelect = new EventEmitter<string>();

  readonly expandedDirs = signal(new Set<string>());

  toggleDir(path: string) {
    const current = new Set(this.expandedDirs());
    if (current.has(path)) {
      current.delete(path);
    } else {
      current.add(path);
    }
    this.expandedDirs.set(current);
  }

  getFileIcon(name: string): string {
    const ext = name.split('.').pop()?.toLowerCase() || '';
    const icons: Record<string, string> = {
      ts: '🔷', js: '🟡', go: '🔵', py: '🐍',
      html: '🟠', css: '🎨', json: '📋', md: '📝',
      yaml: '⚙️', yml: '⚙️', sql: '🗄️', sh: '💻',
      toml: '⚙️', rs: '🦀', java: '☕', vue: '💚',
      svelte: '🔥', dockerfile: '🐳',
    };
    return icons[ext] || '📄';
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return bytes + 'B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'K';
    return (bytes / (1024 * 1024)).toFixed(1) + 'M';
  }
}
