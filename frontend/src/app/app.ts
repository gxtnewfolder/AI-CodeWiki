import { Component, inject, signal, OnInit } from '@angular/core';
import { UpperCasePipe } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './services/theme.service';
import { ApiService } from './services/api.service';
import { FileNode, SummaryResponse, Bookmark, HistoryEntry } from './models/api.models';
import { FileTreeComponent } from './components/file-tree/file-tree.component';
import { SummaryViewerComponent } from './components/summary-viewer/summary-viewer.component';
import { SearchPanelComponent } from './components/search-panel/search-panel.component';
import { SettingsComponent } from './components/settings/settings.component';

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

  readonly projectPath = signal('');
  readonly tree = signal<FileNode | null>(null);
  readonly selectedFile = signal<string | null>(null);
  readonly summary = signal<SummaryResponse | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly bookmarks = signal<Bookmark[]>([]);
  readonly history = signal<HistoryEntry[]>([]);
  readonly sidebarWidth = signal(280);

  ngOnInit() {
    const lastProject = localStorage.getItem('codewiki-project');
    if (lastProject) {
      this.projectPath.set(lastProject);
      this.loadTree(lastProject);
    }
  }

  openProject(path: string) {
    this.projectPath.set(path);
    localStorage.setItem('codewiki-project', path);
    this.loadTree(path);
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
    this.selectedFile.set(filePath);
    this.loading.set(true);
    this.error.set(null);

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
