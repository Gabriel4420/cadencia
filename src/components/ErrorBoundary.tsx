import React from 'react';

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error?.message || 'Ocorreu um erro inesperado na aplicação.',
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('ErrorBoundary capturou erro:', error, info.componentStack);
  }

  handleReload = () => {
    this.setState({ hasError: false, message: '' });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] dark:bg-[#0B1120] p-6">
          <div className="w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-6">
            <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Algo interrompeu o carregamento
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Seus dados locais permanecem protegidos. Recarregue a página para continuar de onde parou.
            </p>
            <p className="mt-3 rounded-lg bg-slate-100 dark:bg-slate-900 p-3 font-mono text-xs text-slate-700 dark:text-slate-300 break-words">
              {this.state.message.slice(0, 260)}
            </p>
            <button
              type="button"
              onClick={this.handleReload}
              className="mt-5 w-full rounded-lg accent-bg px-4 py-2.5 text-sm font-medium text-white transition-colors"
            >
              Recarregar aplicação
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
