import React from 'react';

interface ShimmerBlockProps {
  className?: string;
}

export const ShimmerBlock: React.FC<ShimmerBlockProps> = ({ className = '' }) => (
  <div aria-hidden="true" className={`shimmer-block rounded-md ${className}`} />
);

export const TaskListShimmer: React.FC<{ rows?: number }> = ({ rows = 4 }) => (
  <div
    role="status"
    aria-label="Sincronizando atividades"
    className="divide-y divide-slate-100 dark:divide-slate-800/80"
  >
    {Array.from({ length: rows }).map((_, idx) => (
      <div key={idx} className="flex items-start gap-3.5 px-4 py-3.5">
        <ShimmerBlock className="mt-0.5 h-5 w-5 shrink-0 rounded-md" />
        <div className="min-w-0 flex-1 space-y-2">
          <ShimmerBlock className={`h-4 ${idx % 2 === 0 ? 'w-3/5' : 'w-2/5'}`} />
          <div className="flex items-center gap-2">
            <ShimmerBlock className="h-3 w-24" />
            <ShimmerBlock className="h-3 w-16" />
            <ShimmerBlock className="h-3 w-20" />
          </div>
        </div>
      </div>
    ))}
    <span className="sr-only">Carregando atividades...</span>
  </div>
);

export const CalendarAgendaShimmer: React.FC = () => (
  <div role="status" aria-label="Carregando eventos do calendário" className="mt-3 space-y-3 py-1">
    {[0, 1, 2].map((idx) => (
      <div
        key={idx}
        className="flex items-start justify-between gap-3 py-2 border-b border-slate-100 dark:border-slate-800/80 last:border-b-0"
      >
        <div className="flex-1 space-y-1.5">
          <ShimmerBlock className={`h-3.5 ${idx === 1 ? 'w-3/4' : 'w-2/3'}`} />
          <ShimmerBlock className="h-3 w-1/2" />
        </div>
        <ShimmerBlock className="h-6 w-16 shrink-0 rounded-md" />
      </div>
    ))}
    <span className="sr-only">Carregando compromissos...</span>
  </div>
);

export const AnalyticsChartShimmer: React.FC = () => (
  <div role="status" aria-label="Atualizando gráficos de progresso" className="h-64 w-full flex flex-col justify-end gap-3 pt-4">
    <div className="flex items-end justify-between gap-2 h-48 px-2">
      {[42, 68, 54, 84, 62, 76, 48].map((heightPct, idx) => (
        <div key={idx} className="flex-1 flex flex-col items-center justify-end gap-2 h-full">
          <ShimmerBlock className="w-full max-w-[28px] rounded-t-md" />
          <div
            aria-hidden="true"
            className="shimmer-block w-full max-w-[28px] rounded-t-md"
            style={{ height: `${heightPct}%` }}
          />
        </div>
      ))}
    </div>
    <div className="flex items-center justify-between gap-2 px-2">
      {[0, 1, 2, 3, 4, 5, 6].map((idx) => (
        <ShimmerBlock key={idx} className="h-2.5 w-7" />
      ))}
    </div>
    <span className="sr-only">Atualizando visualização...</span>
  </div>
);
