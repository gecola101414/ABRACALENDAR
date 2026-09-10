import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  override state: State = {
    hasError: false,
    error: null
  };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl p-8 shadow-xl border border-red-100 max-w-md w-full text-center space-y-4">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-gray-900">
              {this.props.fallbackTitle || "Si è verificato un imprevisto"}
            </h3>
            <p className="text-xs text-gray-500 font-medium">
              I dati sono al sicuro. Clicca sul pulsante sottostante per ricaricare la schermata.
            </p>
            {this.state.error && (
              <div className="p-3 bg-red-50 rounded-xl text-left text-[11px] text-red-800 font-mono overflow-auto max-h-24">
                {this.state.error.message || String(this.state.error)}
              </div>
            )}
            <button
              onClick={this.handleReset}
              className="w-full py-3.5 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-purple-600/20 active:scale-95"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Ricarica Pagina</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
