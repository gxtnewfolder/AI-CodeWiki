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

    // Shorten labels for the view, but keep full path in tooltip
    const formattedNodes = data.nodes.map((node: any) => ({
      ...node,
      label: node.label.split('/').pop() || node.label, // only filename
      title: node.label, // show full path on hover
    }));

    const nodes = new DataSet<any>(formattedNodes);
    const edges = new DataSet<any>(data.edges);

    const options: any = {
      nodes: {
        shape: 'dot',
        size: 16,
        font: {
          size: 11,
          color: '#e2e8f0', // Slate 200
          face: 'Inter, system-ui, sans-serif',
          strokeWidth: 3,
          strokeColor: '#0f172a', // Match background
          vadjust: 22, // Push label below node
        },
        borderWidth: 2,
        shadow: {
          enabled: true,
          color: 'rgba(0,0,0,0.5)',
          size: 5,
          x: 2,
          y: 2
        }
      },
      edges: {
        width: 1.5,
        color: {
          color: 'rgba(100, 116, 139, 0.4)', // Muted Slate 500
          highlight: '#14b8a6', // Teal 500
          hover: '#14b8a6'
        },
        arrows: {
          to: { enabled: true, scaleFactor: 0.8 }
        },
        smooth: {
          enabled: true,
          type: 'cubicBezier',
          roundness: 0.5
        }
      },
      physics: {
        enabled: true,
        barnesHut: {
          gravitationalConstant: -7000,
          centralGravity: 0.05,
          springLength: 180,
          springConstant: 0.04,
          damping: 0.09,
          avoidOverlap: 1
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
