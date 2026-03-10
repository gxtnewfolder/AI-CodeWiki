import { Component, inject, signal, OnInit } from '@angular/core';
import { UpperCasePipe } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './services/theme.service';
import { ApiService } from './services/api.service';
import { FileNode, SummaryResponse, Bookmark, HistoryEntry, DepsResult } from './models/api.models';
import { FileTreeComponent } from './components/file-tree/file-tree.component';
import { SummaryViewerComponent } from './components/summary-viewer/summary-viewer.component';
import { SearchPanelComponent } from './components/search-panel/search-panel.component';
import { SettingsComponent } from './components/settings/settings.component';
import { FolderPickerComponent } from './components/folder-picker/folder-picker.component';
import { QAViewerComponent } from './components/qa-viewer/qa-viewer.component';

// spartan-ng helm
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmScrollAreaImports } from '@spartan-ng/helm/scroll-area';
import { HlmInputImports } from '@spartan-ng/helm/input';

// ng-icons
import { provideIcons } from '@ng-icons/core';
import { lucideFolder, lucideSearch, lucideStar, lucideClock, lucideSun, lucideMoon, lucideSettings, lucideBookmark, lucideRefreshCw, lucideFile, lucideFolderOpen, lucideZap } from '@ng-icons/lucide';

type SidebarTab = 'tree' | 'search' | 'bookmarks' | 'history';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    UpperCasePipe,
    FileTreeComponent,
    SummaryViewerComponent,
    SearchPanelComponent,
    SettingsComponent,
    FolderPickerComponent,
    QAViewerComponent,
    ...HlmButtonImports,
    ...HlmIconImports,
    ...HlmCardImports,
    ...HlmScrollAreaImports,
    ...HlmInputImports,
  ],
  providers: [
    provideIcons({
      lucideFolder, lucideSearch, lucideStar, lucideClock,
      lucideSun, lucideMoon, lucideSettings, lucideBookmark,
      lucideRefreshCw, lucideFile, lucideFolderOpen, lucideZap,
    }),
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  private api = inject(ApiService);
  private themeService = inject(ThemeService);

  readonly isDark = this.themeService.isDark;
  readonly activeTab = signal<SidebarTab>('tree');
  readonly showSettings = signal(false);
  readonly showFolderPicker = signal(false);

  readonly projectPath = signal('');
  readonly tree = signal<FileNode | null>(null);
  readonly selectedFile = signal<string | null>(null);
  readonly summary = signal<SummaryResponse | null>(null);
  readonly deps = signal<DepsResult | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly bookmarks = signal<Bookmark[]>([]);
  readonly history = signal<HistoryEntry[]>([]);
  readonly sidebarWidth = signal(280);

  // QA View State
  readonly viewMode = signal<'summary' | 'qa'>('summary');
  readonly currentQA = signal<{ question: string, response: any } | null>(null);

  ngOnInit() {
    const lastProject = localStorage.getItem('codewiki-project');
    if (lastProject) {
      this.projectPath.set(lastProject);
      this.loadTree(lastProject);
    }
  }

  openProject(path: string) {
    if (!path.trim()) return;
    this.projectPath.set(path);
    localStorage.setItem('codewiki-project', path);
    this.showFolderPicker.set(false);
    this.loadTree(path);
  }

  openFolderPicker() {
    // Try native directory picker first (Chrome/Edge)
    if ('showDirectoryPicker' in window) {
      (window as any).showDirectoryPicker({ mode: 'read' })
        .then((handle: any) => {
          // Native picker gives us a handle — we need to prompt user for the actual path
          // since the File System Access API doesn't expose absolute paths.
          // Fallback: open our custom picker pre-filled with directory name
          this.showFolderPicker.set(true);
        })
        .catch(() => {
          // User cancelled or API not supported
          this.showFolderPicker.set(true);
        });
    } else {
      this.showFolderPicker.set(true);
    }
  }

  loadTree(path: string) {
    this.api.getTree(path).subscribe({
      next: (tree) => this.tree.set(tree),
      error: (err) => this.error.set('Failed to load project: ' + err.message),
    });
    this.loadBookmarks();
    this.loadHistory();
  }

  selectFile(filePath: string) {
    this.viewMode.set('summary');
    this.selectedFile.set(filePath);
    this.loading.set(true);
    this.error.set(null);
    this.deps.set(null);

    // Fire both summary + deps in parallel
    this.api
      .getSummary({
        project_path: this.projectPath(),
        file_path: filePath,
      })
      .subscribe({
        next: (res) => {
          this.summary.set(res);
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set(err.error?.error || err.message);
          this.loading.set(false);
        },
      });

    // Deps analysis (parallel, non-blocking)
    this.api.getDeps(this.projectPath(), filePath).subscribe({
      next: (res) => this.deps.set(res),
      error: () => this.deps.set(null), // silently fail
    });
  }

  showQA(data: { question: string, response: any }) {
    this.currentQA.set(data);
    this.viewMode.set('qa');
  }

  toggleTheme() {
    this.themeService.toggle();
  }

  switchTab(tab: SidebarTab) {
    this.activeTab.set(tab);
    if (tab === 'bookmarks') this.loadBookmarks();
    if (tab === 'history') this.loadHistory();
  }

  toggleBookmark() {
    const file = this.selectedFile();
    if (!file) return;

    const existing = this.bookmarks().find((b) => b.file_path === file);
    if (existing) {
      this.api.removeBookmark(existing.id).subscribe(() => this.loadBookmarks());
    } else {
      this.api.addBookmark(this.projectPath(), file).subscribe(() => this.loadBookmarks());
    }
  }

  isBookmarked(): boolean {
    return this.bookmarks().some((b) => b.file_path === this.selectedFile());
  }

  private loadBookmarks() {
    this.api.listBookmarks().subscribe({
      next: (b) => this.bookmarks.set(b),
    });
  }

  private loadHistory() {
    this.api.listHistory().subscribe({
      next: (h) => this.history.set(h),
    });
  }

  onResizeSidebar(event: MouseEvent) {
    const startX = event.clientX;
    const startWidth = this.sidebarWidth();

    const onMove = (e: MouseEvent) => {
      const newWidth = Math.min(400, Math.max(200, startWidth + (e.clientX - startX)));
      this.sidebarWidth.set(newWidth);
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }
}
