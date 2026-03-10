import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MarkdownComponent } from 'ngx-markdown';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideZap, lucideFile, lucideMessageSquare, lucideChevronLeft } from '@ng-icons/lucide';
import { QAResponse } from '../../models/api.models';

@Component({
  selector: 'app-qa-viewer',
  standalone: true,
  imports: [CommonModule, MarkdownComponent, NgIcon],
  providers: [provideIcons({ lucideZap, lucideFile, lucideMessageSquare, lucideChevronLeft })],
  template: `
    <div class="qa-viewer hlm-scrollbar">
      <header class="qa-header">
        <div class="header-main">
          <button class="back-btn" (click)="goBack.emit()">
            <ng-icon name="lucideChevronLeft" size="16" />
            Back
          </button>
          <div class="zap-badge">
            <ng-icon name="lucideZap" size="18" />
          </div>
          <div class="header-info">
            <h1>AI Code Intelligence</h1>
            <p>Retrieval-Augmented Generation result for your codebase</p>
          </div>
        </div>
      </header>

      <div class="qa-content-layout">
        <section class="question-box">
          <div class="box-label">
            <ng-icon name="lucideMessageSquare" size="14" />
            Your Question
          </div>
          <h2 class="question-text">{{ question }}</h2>
        </section>

        <section class="answer-box">
          <div class="box-label">
            <ng-icon name="lucideZap" size="14" />
            AI Analysis
          </div>
          <div class="markdown-body">
            <markdown [data]="response?.answer_md"></markdown>
          </div>
        </section>

        @if (response?.used_files?.length) {
          <section class="sources-box">
            <div class="box-label">
              <ng-icon name="lucideFile" size="14" />
              Source Context
            </div>
            <div class="sources-grid">
              @for (file of response?.used_files; track file.file_path) {
                <button class="source-card" (click)="fileSelect.emit(file.file_path)">
                  <div class="source-icon">
                    <ng-icon name="lucideFile" size="16" />
                  </div>
                  <div class="source-info">
                    <span class="source-name">{{ getFileName(file.file_path) }}</span>
                    <span class="source-path">{{ file.file_path }}</span>
                  </div>
                </button>
              }
            </div>
          </section>
        }
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
      overflow: hidden;
    }

    .qa-viewer {
      height: 100%;
      background: var(--bg);
      display: flex;
      flex-direction: column;
      overflow-y: auto;
    }

    .qa-header {
      padding: var(--space-8) var(--space-12) var(--space-6);
      border-bottom: 1px solid var(--border);
      background: var(--surface-1);
    }

    .header-main {
      display: flex;
      align-items: center;
      gap: var(--space-6);
      max-width: 900px;
      margin: 0 auto;
      width: 100%;
    }

    .back-btn {
      display: flex;
      align-items: center;
      gap: var(--space-1);
      padding: var(--space-2) var(--space-4);
      background: var(--surface-2);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      font-size: var(--text-xs);
      color: var(--text-muted);
      cursor: pointer;
      transition: all 120ms;
    }
    .back-btn:hover { background: var(--surface-3); color: var(--text); }

    .zap-badge {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      background: var(--primary-tint);
      color: var(--primary);
      border-radius: var(--radius-xl);
      box-shadow: 0 0 20px var(--primary-tint);
    }

    .header-info h1 {
      font-size: var(--text-2xl);
      margin-bottom: var(--space-1);
    }

    .header-info p {
      color: var(--text-subtle);
      font-size: var(--text-sm);
    }

    .qa-content-layout {
      flex: 1;
      max-width: 900px;
      margin: 0 auto;
      width: 100%;
      padding: var(--space-8) var(--space-12);
      display: flex;
      flex-direction: column;
      gap: var(--space-8);
    }

    .box-label {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      font-size: 10px;
      font-weight: var(--font-bold);
      text-transform: uppercase;
      color: var(--text-disabled);
      letter-spacing: var(--tracking-caps);
      margin-bottom: var(--space-3);
    }

    .question-box {
      background: var(--surface-2);
      padding: var(--space-6);
      border-radius: var(--radius-lg);
      border-left: 4px solid var(--primary);
    }

    .question-text {
      font-size: var(--text-xl);
      font-weight: var(--font-semibold);
      line-height: var(--leading-snug);
    }

    .answer-box {
      background: var(--surface-1);
      padding: var(--space-8);
      border: 1px solid var(--border);
      border-radius: var(--radius-xl);
      box-shadow: var(--shadow-md);
    }

    .markdown-body {
      font-size: 15px;
      line-height: 1.7;
      color: var(--text);
    }

    .markdown-body :global(p) { margin-bottom: 1.5em; }
    .markdown-body :global(pre) {
      background: var(--surface-2);
      padding: 1rem;
      border-radius: var(--radius-md);
      overflow-x: auto;
      margin: 1.5em 0;
      border: 1px solid var(--border);
    }
    .markdown-body :global(code) {
      font-family: var(--font-mono);
      color: var(--primary);
    }

    .sources-box {
      margin-bottom: var(--space-12);
    }

    .sources-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: var(--space-4);
    }

    .source-card {
      display: flex;
      align-items: center;
      gap: var(--space-4);
      padding: var(--space-4);
      background: var(--surface-1);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      text-align: left;
      cursor: pointer;
      transition: all 150ms ease;
    }

    .source-card:hover {
      border-color: var(--primary);
      background: var(--surface-2);
      transform: translateY(-2px);
      box-shadow: var(--shadow-sm);
    }

    .source-icon {
      flex-shrink: 0;
      width: 32px;
      height: 32px;
      background: var(--surface-2);
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius-md);
      color: var(--text-muted);
    }

    .source-info {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .source-name {
      font-size: var(--text-sm);
      font-weight: var(--font-semibold);
      color: var(--text);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .source-path {
      font-size: 10px;
      color: var(--text-subtle);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `],
})
export class QAViewerComponent {
  @Input() question: string = '';
  @Input() response: QAResponse | null = null;
  @Output() fileSelect = new EventEmitter<string>();
  @Output() goBack = new EventEmitter<void>();

  getFileName(path: string): string {
    return path.split(/[\\\\/]/).pop() || path;
  }
}
