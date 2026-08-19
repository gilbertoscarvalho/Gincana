import React, { StrictMode, Component, ReactNode, ErrorInfo } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: ''
    };
  }

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, errorMessage: error.message || 'Erro inesperado ao renderizar o aplicativo.' };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in React render tree:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-amber-500/30 rounded-3xl p-6 sm:p-8 text-center space-y-5 shadow-2xl">
            <div className="w-12 h-12 bg-amber-500/20 text-amber-300 rounded-2xl flex items-center justify-center mx-auto">
              ⚠️
            </div>
            <h1 className="text-xl font-bold text-amber-200">Somos Jóias Preciosas 2026</h1>
            <p className="text-sm text-slate-300">
              Ocorreu uma instabilidade na inicialização da página. Clique no botão abaixo para reiniciar o portal.
            </p>
            {this.state.errorMessage && (
              <p className="text-xs bg-slate-950 p-3 rounded-xl text-rose-300 font-mono text-left break-words">
                {this.state.errorMessage}
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  try {
                    localStorage.removeItem('ccb_gincana_settings');
                  } catch (e) {}
                  window.location.reload();
                }}
                className="flex-1 py-3 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm rounded-xl transition-all shadow-lg shadow-amber-500/20 cursor-pointer"
              >
                Recarregar Portal
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

