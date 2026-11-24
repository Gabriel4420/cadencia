import React, { useEffect, useMemo, useState } from 'react';
import { FileText } from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Task, UserGamificationProfile } from '../types';
import { computeAnalytics } from '../utils/productivity';
import { WeeklySummaryModal } from './WeeklySummaryModal';
import { AnalyticsChartShimmer, ShimmerBlock } from './Shimmer';

interface AnalyticsViewProps {
  tasks: Task[];
  profile: UserGamificationProfile;
  theme: 'light' | 'dark';
  isSyncing?: boolean;
  onNotify?: (
    title: string,
    description?: string,
    tone?: 'info' | 'success' | 'warning' | 'reward'
  ) => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  tasks,
  profile,
  theme,
  isSyncing = false,
  onNotify,
}) => {
  const [rangeDays, setRangeDays] = useState<7 | 14 | 30>(7);
  const [rangeTransitioning, setRangeTransitioning] = useState(false);
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);

  const summary = useMemo(
    () => computeAnalytics(tasks, rangeDays, new Date(), profile.customCategories || []),
    [tasks, rangeDays, profile.customCategories]
  );

  useEffect(() => {
    if (!rangeTransitioning) return;
    const timer = window.setTimeout(() => setRangeTransitioning(false), 220);
    return () => window.clearTimeout(timer);
  }, [rangeTransitioning]);

  const handleSelectRange = (days: 7 | 14 | 30) => {
    if (days === rangeDays) return;
    setRangeDays(days);
    setRangeTransitioning(true);
  };

  const gridStroke = theme === 'dark' ? '#1E293B' : '#E2E8F0';
  const axisTickColor = theme === 'dark' ? '#94A3B8' : '#64748B';
  const tooltipBg = theme === 'dark' ? '#0F172A' : '#FFFFFF';
  const tooltipBorder = theme === 'dark' ? '#334155' : '#E2E8F0';

  const heatmapClass = (intensity: 0 | 1 | 2 | 3 | 4) => {
    if (intensity === 0) return 'bg-slate-100 dark:bg-slate-800/80';
    if (intensity === 1) return 'bg-blue-200 dark:bg-blue-900/60';
    if (intensity === 2) return 'bg-blue-400 dark:bg-blue-700';
    if (intensity === 3) return 'bg-blue-500 dark:bg-blue-500';
    return 'bg-blue-700 dark:bg-blue-400';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Análise de progresso
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Acompanhe sua constância, pontualidade no cronograma e distribuição de esforço.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setSummaryModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
          >
            <FileText className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
            <span>Resumo semanal</span>
          </button>

          <div className="flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-900 p-1">
            {([7, 14, 30] as const).map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => handleSelectRange(days)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  rangeDays === days
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {days} dias
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-200 dark:bg-slate-800">
        {isSyncing && tasks.length === 0 ? (
          [0, 1, 2, 3].map((idx) => (
            <div key={idx} className="bg-white dark:bg-[#111827] px-5 py-4 space-y-2">
              <ShimmerBlock className="h-3 w-24" />
              <ShimmerBlock className="h-7 w-16" />
            </div>
          ))
        ) : (
          <>
            <div className="bg-white dark:bg-[#111827] px-5 py-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">Taxa de conclusão</p>
              <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                {summary.completionRate}%
              </p>
            </div>
            <div className="bg-white dark:bg-[#111827] px-5 py-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">Pontualidade</p>
              <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                {summary.totalCompleted === 0 ? '—' : `${summary.onTimeRate}%`}
              </p>
            </div>
            <div className="bg-white dark:bg-[#111827] px-5 py-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">Total concluídas</p>
              <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                {summary.totalCompleted}
              </p>
            </div>
            <div className="bg-white dark:bg-[#111827] px-5 py-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">Foco acumulado</p>
              <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                {profile.focusMinutesTotal} min
              </p>
            </div>
          </>
        )}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section
          aria-labelledby="chart-execution-heading"
          className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5"
        >
          <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2
                id="chart-execution-heading"
                className="text-sm font-semibold text-slate-900 dark:text-slate-100"
              >
                Ritmo de entregas ({rangeDays} dias)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Atividades concluídas em comparação com o planejado por dia.
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full accent-bg" /> Concluídas
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-0.5 w-3 bg-slate-400" /> Planejadas
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            {rangeTransitioning || (isSyncing && tasks.length === 0) ? (
              <AnalyticsChartShimmer />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={summary.dailySeries}
                  margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="completedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent-fg)" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="var(--accent-fg)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: axisTickColor, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: axisTickColor, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: tooltipBg,
                      borderColor: tooltipBorder,
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="planned"
                    name="Planejadas"
                    stroke="#94A3B8"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    fill="none"
                    isAnimationActive={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="completed"
                    name="Concluídas"
                    stroke="var(--accent-fg)"
                    strokeWidth={2.2}
                    fill="url(#completedGrad)"
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section
          aria-labelledby="chart-category-heading"
          className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5"
        >
          <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2
                id="chart-category-heading"
                className="text-sm font-semibold text-slate-900 dark:text-slate-100"
              >
                Atividades por categoria
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Equilíbrio entre entregas concluídas e em aberto.
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-xs accent-bg" /> Concluídas
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-xs bg-slate-300 dark:bg-slate-600" /> Pendentes
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={summary.categoryStats}
                margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: axisTickColor, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: axisTickColor, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: tooltipBg,
                    borderColor: tooltipBorder,
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Bar
                  dataKey="completed"
                  name="Concluídas"
                  fill="var(--accent-fg)"
                  radius={[4, 4, 0, 0]}
                  barSize={20}
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="pending"
                  name="Pendentes"
                  fill={theme === 'dark' ? '#334155' : '#CBD5E1'}
                  radius={[4, 4, 0, 0]}
                  barSize={20}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* Bottom Row: Priority Breakdown + 28-Day Consistency Map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section
          aria-labelledby="priority-breakdown-heading"
          className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5"
        >
          <h2
            id="priority-breakdown-heading"
            className="text-sm font-semibold text-slate-900 dark:text-slate-100"
          >
            Execução por prioridade
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Proporção de conclusão em cada faixa de criticidade.
          </p>

          <div className="mt-5 space-y-4">
            {summary.priorityBreakdown.map((item) => {
              const total = item.completed + item.pending;
              const pct = total === 0 ? 0 : Math.round((item.completed / total) * 100);
              return (
                <div key={item.priority}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      Prioridade {item.label}
                    </span>
                    <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
                      {item.completed}/{total} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className={`h-full rounded-full transition-[width] duration-300 ${
                        item.priority === 'high'
                          ? 'bg-red-500'
                          : item.priority === 'medium'
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section
          aria-labelledby="consistency-map-heading"
          className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5"
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2
                id="consistency-map-heading"
                className="text-sm font-semibold text-slate-900 dark:text-slate-100"
              >
                Consistência dos últimos 28 dias
              </h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Cada bloco representa o volume de atividades finalizadas naquele dia.
              </p>
            </div>
            <span className="font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
              {profile.streakDays}d seguidos
            </span>
          </div>

          <div className="mt-5 grid grid-cols-7 gap-2">
            {summary.heatmap28Days.map((day) => (
              <div
                key={day.date}
                title={`${day.date}: ${day.count} concluída(s)`}
                className={`flex h-9 items-center justify-center rounded-md font-mono text-[11px] tabular-nums transition-colors ${heatmapClass(
                  day.intensity
                )} ${
                  day.intensity >= 3
                    ? 'text-white font-medium'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                {day.count > 0 ? day.count : '·'}
              </div>
            ))}
          </div>
        </section>
      </div>

      <WeeklySummaryModal
        open={summaryModalOpen}
        tasks={tasks}
        profile={profile}
        onClose={() => setSummaryModalOpen(false)}
        onNotify={onNotify}
      />
    </div>
  );
};
