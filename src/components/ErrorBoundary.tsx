import React from 'react';
import { toast } from '../utils/toast';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    toast.error(`Системная ошибка: ${error.message || 'Произошёл сбой в работе приложения'}`);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-stone-900 flex items-center justify-center p-4">
          <div className="bg-stone-800 border border-stone-700 rounded-2xl p-6 sm:p-8 max-w-md w-full text-center shadow-2xl">
            <div className="w-12 h-12 bg-rose-950/80 border border-rose-800/50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-rose-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Произошла непредвиденная ошибка</h2>
            <p className="text-xs text-stone-300 mb-6 leading-relaxed">
              {this.state.error?.message || 'Произошёл сбой интерфейса. Мы уже зарегистрировали эту ошибку.'}
            </p>
            <button
              onClick={this.handleReset}
              className="w-full py-3 px-4 bg-rose-900 hover:bg-rose-800 text-white font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Перезагрузить страницу</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
