import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { FileNode } from '../../models/api.models';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideFolder, lucideFolderOpen, lucideFile, lucideFileCode,
  lucideFileText, lucideFileJson, lucideSettings, lucideDatabase,
  lucideTerminal, lucideGlobe, lucidePackage, lucideGitBranch,
} from '@ng-icons/lucide';

// Map file extension → lucide icon name
const EXT_ICON: Record<string, string> = {
  ts: 'lucideFileCode', tsx: 'lucideFileCode',
  js: 'lucideFileCode', jsx: 'lucideFileCode', mjs: 'lucideFileCode',
  go: 'lucideFileCode',
  py: 'lucideFileCode',
  rs: 'lucideFileCode',
  java: 'lucideFileCode', kt: 'lucideFileCode',
  cs: 'lucideFileCode',
  html: 'lucideGlobe', vue: 'lucideGlobe', svelte: 'lucideGlobe',
  css: 'lucideFileText', scss: 'lucideFileText',
  json: 'lucideFileJson', jsonc: 'lucideFileJson',
  yaml: 'lucideSettings', yml: 'lucideSettings', toml: 'lucideSettings',
  md: 'lucideFileText', mdx: 'lucideFileText',
  sql: 'lucideDatabase',
  sh: 'lucideTerminal', bash: 'lucideTerminal', zsh: 'lucideTerminal',
  dockerfile: 'lucidePackage',
  gitignore: 'lucideGitBranch', gitattributes: 'lucideGitBranch',
};

@Component({
  selector: 'app-file-tree',
  standalone: true,
  imports: [NgIcon],
  providers: [
    provideIcons({
      lucideFolder, lucideFolderOpen, lucideFile, lucideFileCode,
      lucideFileText, lucideFileJson, lucideSettings, lucideDatabase,
      lucideTerminal, lucideGlobe, lucidePackage, lucideGitBranch,
    }),
  ],
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
                <ng-icon
                  class="tree-icon"
                  [name]="expandedDirs().has(child.path) ? 'lucideFolderOpen' : 'lucideFolder'"
                  size="14"
                />
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
              <ng-icon
                class="tree-icon"
                [name]="getFileIconName(child.name)"
                size="14"
              />
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

    .tree-icon {
      flex-shrink: 0;
      width: 16px;
      color: var(--text-muted);
    }

    .tree-folder .tree-icon { color: var(--primary); }
    .tree-item.active .tree-icon { color: var(--primary); }

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

  getFileIconName(name: string): string {
    const lower = name.toLowerCase();
    // Check full filename first (dockerfile, .gitignore etc)
    if (lower === 'dockerfile' || lower.startsWith('docker')) return 'lucidePackage';
    if (lower.startsWith('.git')) return 'lucideGitBranch';

    const ext = name.split('.').pop()?.toLowerCase() || '';
    return EXT_ICON[ext] || 'lucideFile';
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return bytes + 'B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'K';
    return (bytes / (1024 * 1024)).toFixed(1) + 'M';
  }
}
