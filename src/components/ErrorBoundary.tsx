import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('[Bob] view crashed:', error, info?.componentStack);
  }

  private reset = (): void => {
    this.setState({ error: null });
  };

  private reload = (): void => {
    window.location.reload();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="max-w-[560px] mx-auto px-6 py-16 text-center">
        <div className="text-[11px] tracking-[0.09em] text-[#999] uppercase font-semibold">
          Something went wrong
        </div>
        <h2 className="text-[22px] font-extrabold tracking-tight text-[var(--t)] mt-2 mb-2">
          This view hit an unexpected error
        </h2>
        <p className="text-[13px] leading-relaxed text-[var(--m)] mb-6">
          Your research is safe. Reload this view to continue, or restart Bob if the problem
          keeps happening.
        </p>
        <pre className="text-[11px] text-left bg-[var(--s2)] border border-[var(--line)] rounded-xl p-3 overflow-x-auto mb-6 text-[var(--m)]">
          {error.message}
        </pre>
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={this.reset}
            className="h-9 px-4 rounded-xl border border-[var(--line)] bg-[var(--s)] hover:bg-[var(--s2)] text-[var(--t)] text-[12px] font-medium transition-colors"
          >
            Try again
          </button>
          <button
            onClick={this.reload}
            className="h-9 px-4 rounded-xl bg-[var(--y)] hover:bg-[#e0ac15] text-[#171717] text-[12px] font-bold transition-all"
          >
            Reload Bob
          </button>
        </div>
      </div>
    );
  }
}
