import { Component, Input, Output, EventEmitter } from '@angular/core';
import { DepsResult } from '../../models/api.models';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideActivity, lucideLink, lucideDownload, lucideUpload, lucideZap } from '@ng-icons/lucide';
import { ImpactAnalysisResponse } from '../../models/api.models';
import { MarkdownComponent } from 'ngx-markdown';
import { GraphViewerComponent } from '../graph-viewer/graph-viewer.component';

declare const mermaid: any;

@Component({
  selector: 'app-dep-graph',
  standalone: true,
  imports: [NgIcon, MarkdownComponent, GraphViewerComponent],
  providers: [
    provideIcons({
      lucideActivity,
      lucideLink,
      lucideDownload,
      lucideUpload,
      lucideZap,
    }),
  ],
  template: `
    <div class="dep-graph">
      <div class="dep-header">
        <span class="dep-title">
          <ng-icon name="lucideActivity" size="14" class="mr-1 text-primary opacity-70" />
          Dependencies
        </span>
        @if (deps) {
          <span class="dep-count">
            {{ (deps.imports.length || 0) + (deps.imported_by.length || 0) }} connections
          </span>
        }
        <button class="ai-impact-btn" (click)="analyzeImpact.emit()">
          <ng-icon name="lucideZap" size="12" class="mr-1" />
          AI Impact
        </button>
      </div>

      @if (impactAnalysis) {
        <div class="ai-insight-panel">
          <div class="insight-header">
            <ng-icon name="lucideZap" size="14" class="text-primary" />
            AI Structural Insight
          </div>
          <div class="insight-body">
            <markdown [data]="impactAnalysis.analysis_md"></markdown>
          </div>
        </div>
      }

      @if (!deps || ((deps.imports.length || 0) === 0 && (deps.imported_by.length || 0) === 0)) {
        <div class="dep-empty">
          <ng-icon name="lucideLink" size="32" class="opacity-20" />
          <p>No dependencies found</p>
        </div>
      } @else {
        <div class="dep-content">
          <!-- Interactive Vis-Network Graph (Powered by Neo4j) -->
          <div class="graph-viewer-wrapper">
            <app-graph-viewer 
              [projectPath]="projectPath" 
              [filePath]="currentFile" 
            />
          </div>

          <!-- Deps list fallback / detail -->
          <div class="dep-lists">
            @if (deps.imports.length) {
              <div class="dep-section">
                <div class="dep-section-label">→ Imports ({{ deps.imports.length }})</div>
                @for (dep of deps.imports; track dep.symbol) {
                  <button class="dep-item import" (click)="onNodeClick(dep.file_path)">
                    <ng-icon name="lucideDownload" size="12" class="dep-item-icon" />
                    <span class="dep-item-path">{{ dep.symbol }}</span>
                    <span class="dep-item-line">L{{ dep.line }}</span>
                  </button>
                }
              </div>
            }
            @if (deps.imported_by.length) {
              <div class="dep-section">
                <div class="dep-section-label">← Used by ({{ deps.imported_by.length }})</div>
                @for (dep of deps.imported_by; track dep.file_path) {
                  <button class="dep-item reverse" (click)="onNodeClick(dep.file_path)">
                    <ng-icon name="lucideUpload" size="12" class="dep-item-icon" />
                    <span class="dep-item-path">{{ dep.file_path }}</span>
                    <span class="dep-item-line">L{{ dep.line }}</span>
                  </button>
                }
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; }

    .dep-graph {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
    }

    .dep-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-3) var(--space-4);
      border-bottom: 1px solid var(--border);
      flex-shrink: 0;
    }

    .dep-title {
      font-size: var(--text-sm);
      font-weight: var(--font-semibold);
    }

    .dep-count {
      font-size: var(--text-xs);
      color: var(--text-subtle);
    }

    .dep-empty {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: var(--space-2);
      color: var(--text-subtle);
      font-size: var(--text-sm);
    }

    .dep-empty span { font-size: 32px; }

    .dep-content {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
    }

    .graph-viewer-wrapper {
      width: 100%;
      height: 400px; /* More room for nodes to breathe */
      flex-shrink: 0;
      border-bottom: 1px solid var(--border);
    }

    .dep-lists {
      padding: var(--space-2) 0;
    }

    .dep-section { margin-bottom: var(--space-2); }

    .dep-section-label {
      padding: var(--space-1) var(--space-4);
      font-size: var(--text-xs);
      font-weight: var(--font-medium);
      color: var(--text-subtle);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .dep-item {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      width: 100%;
      padding: var(--space-1) var(--space-4);
      border: none;
      background: transparent;
      cursor: pointer;
      font-size: var(--text-xs);
      font-family: var(--font-mono);
      color: var(--text-muted);
      text-align: left;
      transition: background 90ms ease-out;
    }

    .dep-item:hover { background: var(--surface-2); }
    .dep-item-icon { flex-shrink: 0; }

    .dep-item-path {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .dep-item.import .dep-item-path { color: var(--primary); }
    .dep-item.reverse .dep-item-path { color: var(--warning); }

    .dep-item-line {
      flex-shrink: 0;
      color: var(--text-disabled);
      font-size: 10px;
    }

    .ai-impact-btn {
      display: flex;
      align-items: center;
      padding: 4px 8px;
      margin-left: var(--space-2);
      font-size: 10px;
      font-weight: var(--font-semibold);
      background: var(--primary-tint);
      color: var(--primary);
      border: 1px solid var(--primary-tint);
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: all 120ms;
    }
    .ai-impact-btn:hover { background: var(--primary); color: white; }

    .ai-insight-panel {
      margin: 0;
      padding: var(--space-4) var(--space-4) var(--space-6);
      background: var(--surface-1);
      border-bottom: 1px solid var(--border);
      max-height: 50vh;
      overflow-y: auto;
      flex-shrink: 0;
      animation: slide-up-fade-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
    }

    .insight-header {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      font-size: var(--text-xs);
      font-weight: var(--font-bold);
      color: var(--primary);
      text-transform: uppercase;
      margin-bottom: var(--space-3);
    }

    .insight-body {
      font-size: 13px;
      line-height: 1.6;
      color: var(--text-muted);
    }
    
    /* Aggressive Headings Fix */
    :host ::ng-deep .insight-body h1 {
      font-size: 15px !important;
      font-weight: 700 !important;
      margin: 16px 0 8px !important;
      color: var(--primary) !important;
      border: none !important;
      padding: 0 !important;
    }

    :host ::ng-deep .insight-body h2 {
      font-size: 13px !important;
      font-weight: 600 !important;
      margin: 12px 0 4px !important;
      color: var(--text) !important;
      border: none !important;
      padding: 0 !important;
    }

    :host ::ng-deep .insight-body p { 
      margin: 8px 0 !important; 
      font-size: 13px !important;
    }

    :host ::ng-deep .insight-body ul, 
    :host ::ng-deep .insight-body ol { 
      padding-left: 18px !important; 
      margin: 8px 0 !important; 
    }

    :host ::ng-deep .insight-body li { 
      margin: 4px 0 !important; 
    }

    :host ::ng-deep .insight-body code {
      background: var(--surface-2) !important;
      padding: 2px 4px !important;
      border-radius: 4px !important;
      font-size: 11px !important;
      color: var(--primary) !important;
      font-family: var(--font-mono) !important;
    }
  `],
})
export class DepGraphComponent {
  @Input() projectPath = '';
  @Input() deps: DepsResult | null = null;
  @Input() currentFile: string = '';
  @Input() impactAnalysis: ImpactAnalysisResponse | null = null;
  @Output() fileSelect = new EventEmitter<string>();
  @Output() analyzeImpact = new EventEmitter<void>();

  onNodeClick(filePath: string) {
    this.fileSelect.emit(filePath);
  }
}
