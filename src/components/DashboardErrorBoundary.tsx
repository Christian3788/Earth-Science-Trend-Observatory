import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface DashboardErrorBoundaryProps {
  children: React.ReactNode;
  /** Label shown in the fallback so judges know which panel failed. */
  panelName?: string;
}

interface DashboardErrorBoundaryState {
  error: Error | null;
}

/**
 * Catches render crashes in the visualization stage so one failing panel
 * never blanks the whole observatory during a live demo.
 */
export class DashboardErrorBoundary extends React.Component<
  DashboardErrorBoundaryProps,
  DashboardErrorBoundaryState
> {
  state: DashboardErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): DashboardErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error(`[DashboardErrorBoundary:${this.props.panelName || 'panel'}]`, error, info);
  }

  private handleReset = () => {
    this.setState({ error: null });
  };

  render(): React.ReactNode {
    if (this.state.error) {
      return (
        <div
          role="alert"
          className="bg-white border border-amber-300 rounded-lg p-6 flex flex-col sm:flex-row sm:items-center gap-4"
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className="p-2 rounded-md bg-amber-100 shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-700" />
            </span>
            <div className="min-w-0">
              <div className="text-sm font-bold text-slate-950">
                {this.props.panelName || 'Visualization panel'} hit a rendering snag
              </div>
              <div className="text-xs font-mono text-slate-600 mt-1 truncate">
                {this.state.error.message || 'Unknown render error'}
              </div>
              <div className="text-xs text-slate-600 mt-1">
                The rest of the observatory is unaffected. Reset the panel to try again.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={this.handleReset}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-slate-900 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset Panel</span>
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
