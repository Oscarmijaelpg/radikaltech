import { Component, type ErrorInfo, type ReactNode } from 'react';
import { captureException } from '@/lib/error-reporting';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: undefined };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    captureException(error, { info });
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="min-h-screen grid place-items-center p-6">
            <div className="max-w-md bg-white rounded-3xl shadow-xl p-8 text-center">
              <h2 className="font-display text-2xl font-bold mb-2">Algo salió mal</h2>
              <p className="text-sm text-slate-500 mb-4">
                {this.state.error?.message ?? 'Error inesperado'}
              </p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded-xl bg-[hsl(var(--color-primary))] text-white"
              >
                Recargar
              </button>
            </div>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
