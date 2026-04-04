import { Component, ElementRef, Input, OnChanges, OnDestroy, SimpleChanges, ViewChild, inject } from '@angular/core';
import { Network, DataSet } from 'vis-network/standalone';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-graph-viewer',
  standalone: true,
  template: `
    <div class="graph-container">
      <div #graphContainer class="graph-canvas"></div>
      @if (loading()) {
        <div class="graph-loader">
          <div class="spinner"></div>
          <span>Loading Knowledge Graph...</span>
        </div>
      }
    </div>
  `,
  styleUrls: ['./graph-viewer.component.css']
})
export class GraphViewerComponent implements OnChanges, OnDestroy {
  private api = inject(ApiService);
  
  @Input() projectPath = '';
  @Input() filePath = '';
  
  @ViewChild('graphContainer', { static: true }) graphContainer!: ElementRef;
  
  private network: Network | null = null;
  loading = signal(false);

  ngOnChanges(changes: SimpleChanges) {
    if ((changes['projectPath'] || changes['filePath']) && this.projectPath && this.filePath) {
      this.loadGraph();
    }
  }

  private loadGraph() {
    this.loading.set(true);
    this.api.getGraph(this.projectPath, this.filePath).subscribe({
      next: (data) => {
        this.renderGraph(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  private renderGraph(data: any) {
    if (this.network) {
      this.network.destroy();
    }

    const formattedNodes = data.nodes.map((node: any) => {
      // Split by path separators
      let label = node.label.split(/\/|\\/).pop() || node.label;
      
      // If result is a long namespace (C# style), take only the last part
      if (label.includes('.') && label.length > 20 && !label.includes(' ')) {
        const parts = label.split('.');
        label = parts.pop() || label;
      }

      return {
        ...node,
        label: label,
        title: node.label, // Full path on hover
      };
    });

    const nodes = new DataSet<any>(formattedNodes);
    const edges = new DataSet<any>(data.edges);

    const options: any = {
      nodes: {
        shape: 'dot',
        size: 16,
        font: {
          size: 11,
          color: '#e2e8f0',
          face: 'Inter, system-ui, sans-serif',
          strokeWidth: 3,
          strokeColor: '#0f172a',
          vadjust: 25,
        },
        borderWidth: 2,
        shadow: { enabled: true, color: 'rgba(0,0,0,0.4)', size: 4 }
      },
      edges: {
        width: 1.2,
        color: {
          color: 'rgba(100, 116, 139, 0.3)',
          highlight: '#14b8a6',
        },
        arrows: { to: { enabled: true, scaleFactor: 0.6 } },
        smooth: { enabled: true, type: 'cubicBezier', roundness: 0.5 }
      },
      physics: {
        enabled: true,
        barnesHut: {
          gravitationalConstant: -15000, // Stronger repulsion to separate nodes
          centralGravity: 0.05,
          springLength: 250,           // Longer wires
          springConstant: 0.04,
          damping: 0.09,
          avoidOverlap: 1              // Force nodes to not touch
        },
        stabilization: { iterations: 150 }
      },
      interaction: {
        hover: true,
        tooltipDelay: 200,
        zoomView: true
      },
      groups: {
        center: {
          color: { background: '#14b8a6', border: '#115e59' },
          size: 26,
          font: { size: 14, color: '#ffffff', strokeWidth: 4, strokeColor: '#0f172a', vadjust: 30 }
        },
        connected: {
          color: { background: '#334155', border: '#475569' }
        }
      }
    };

    this.network = new Network(this.graphContainer.nativeElement, { nodes, edges }, options);
    
    // Smooth zoom to fit
    this.network.once('stabilizationIterationsDone', () => {
      this.network?.fit({
        animation: {
          duration: 1200,
          easingFunction: 'easeInOutQuad'
        }
      });
    });
  }

  ngOnDestroy() {
    if (this.network) {
      this.network.destroy();
    }
  }
}

// Helper to use signal in class
import { signal } from '@angular/core';
