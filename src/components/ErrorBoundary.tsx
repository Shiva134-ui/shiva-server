import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  inline?: boolean;
  resetKey?: string;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  public componentDidUpdate(prevProps: Props) {
    if (this.state.hasError && this.props.resetKey !== prevProps.resetKey) {
      this.resetError();
    }
  }

  private resetError = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.inline) {
        return (
          <div className="p-6 md:p-8 bg-[#1A1A1A] border border-rose-500/20 rounded-2xl max-w-4xl mx-auto my-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-[#F87171] shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-medium font-serif text-[#ECECEC] mb-1">
                  {this.props.fallbackTitle || 'Component Error'}
                </h2>
                <p className="text-xs font-mono text-[#F87171] mb-4 break-words">
                  {this.state.error?.message || this.state.error?.toString() || 'An unexpected rendering error occurred.'}
                </p>
                <div className="flex flex-wrap gap-2.5">
                  <button
                    onClick={this.resetError}
                    className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white hover:bg-neutral-200 text-[#0A0A0A] font-semibold rounded-xl text-xs transition-colors shadow-sm active:scale-[0.98] cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Retry Component
                  </button>
                  <button
                    onClick={() => window.location.reload()}
                    className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#0F0F0F] hover:bg-[#222222] border border-[#2A2A2A] text-[#ECECEC] rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Reload Page
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      }

      return (
        <div className="min-h-screen bg-[#0A0A0A] text-[#ECECEC] p-8 flex flex-col justify-center max-w-4xl mx-auto">
          <div className="flex items-center gap-3 text-[#F87171] mb-4">
            <AlertTriangle className="w-6 h-6" />
            <h1 className="text-2xl font-normal font-serif text-[#ECECEC] tracking-tight">System Runtime Recovery</h1>
          </div>
          <p className="text-[#8C8C8C] mb-4 text-xs font-mono">{this.state.error?.toString()}</p>
          <div className="mb-6 flex gap-3">
            <button
              onClick={this.resetError}
              className="px-4 py-2 bg-white hover:bg-neutral-200 text-[#0A0A0A] font-semibold rounded-xl text-xs transition shadow-sm cursor-pointer"
            >
              Attempt Recovery
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-[#1A1A1A] hover:bg-[#222222] border border-[#2A2A2A] text-[#ECECEC] rounded-xl text-xs transition cursor-pointer"
            >
              Hard Reload
            </button>
          </div>
          {this.state.error?.stack && (
            <pre className="bg-rose-500/10 p-4 rounded-xl overflow-auto text-xs text-[#F87171] border border-rose-500/20 max-h-48 mb-4 font-mono">
              {this.state.error.stack}
            </pre>
          )}
          {this.state.errorInfo?.componentStack && (
            <pre className="bg-[#0F0F0F] p-4 rounded-xl overflow-auto text-xs text-[#8C8C8C] border border-[#2A2A2A] max-h-48 font-mono">
              {this.state.errorInfo.componentStack}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
export default ErrorBoundary;
