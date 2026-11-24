import React, { useEffect, useMemo, useState } from 'react';
import { Check, Code2, Copy, Download, FileText, ListChecks, X } from 'lucide-react';
import type { Task, UserGamificationProfile } from '../types';
import {
  buildWeeklySummaryReport,
  formatDurationPtBr,
  formatIsoDatePtBr,
  formatWeeklySummaryAsJson,
  formatWeeklySummaryAsText,
  triggerFileDownload,
} from '../utils/weeklySummary';

interface WeeklySummaryModalProps {
  open: boolean;
  tasks: Task[];
  profile: UserGamificationProfile;
  onClose: () => void;
  onNotify?: (
    title: string,
    description?: string,
    tone?: 'info' | 'success' | 'warning' | 'reward'
  ) => void;
}

type SummaryViewFormat = 'list' | 'json';

export const WeeklySummaryModal: React.FC<WeeklySummaryModalProps> = ({
  open,
  tasks,
  profile,
  onClose,
  onNotify,
}) => {
  const [format, setFormat] = useState<SummaryViewFormat>('list');
  const [copied, setCopied] = useState(false);

  const report = useMemo(() => buildWeeklySummaryReport(tasks, profile), [tasks, profile]);
  const readableText = useMemo(() => formatWeeklySummaryAsText(report), [report]);
  const jsonText = useMemo(() => formatWeeklySummaryAsJson(report), [report]);

  useEffect(() => {
    if (!open) return;
    setCopied(false);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const periodRangeLabel = `${formatIsoDatePtBr(report.period.startDate)} — ${formatIsoDatePtBr(report.period.endDate)}`;

  const handleCopy = async () => {
    const content = format === 'json' ? jsonText : readableText;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(content);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = content;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      onNotify?.(
        'Resumo copiado',
        format === 'json'
          ? 'O JSON do resumo semanal foi copiado para a área de transferência.'
          : 'A lista legível do resumo semanal foi copiada para a área de transferência.',
        'success'
      );
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      onNotify?.(
        'Não foi possível copiar automaticamente',
        'Utilize os botões de download para salvar o resumo semanal.',
        'warning'
      );
    }
  };

  const handleDownloadTxt = () => {
    const filename = `cadencia-resumo-semanal-${report.period.endDate}.txt`;
    triggerFileDownload(readableText, filename, 'text/plain;charset=utf-8');
    onNotify?.('Lista semanal baixada', `Arquivo ${filename} salvo com sucesso.`, 'success');
  };

  const handleDownloadJson = () => {
    const filename = `cadencia-resumo-semanal-${report.period.endDate}.json`;
    triggerFileDownload(jsonText, filename, 'application/json;charset=utf-8');
    onNotify?.('JSON semanal baixado', `Arquivo ${filename} salvo com sucesso.`, 'success');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="weekly-summary-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 backdrop-blur-[2px] p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 px-6 py-4">
          <div>
            <h2
              id="weekly-summary-title"
              className="text-base font-semibold text-slate-900 dark:text-slate-100"
            >
              Resumo semanal
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Últimos 7 dias · <span className="font-mono">{periodRangeLabel}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar resumo semanal"
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Format Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/40 px-6 py-2.5">
          <div
            role="tablist"
            aria-label="Formato do resumo semanal"
            className="inline-flex items-center gap-1 rounded-lg bg-slate-200/70 dark:bg-slate-800 p-0.5"
          >
            <button
              type="button"
              role="tab"
              aria-selected={format === 'list'}
              onClick={() => {
                setFormat('list');
                setCopied(false);
              }}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                format === 'list'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <ListChecks className="h-3.5 w-3.5" />
              <span>Lista legível</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={format === 'json'}
              onClick={() => {
                setFormat('json');
                setCopied(false);
              }}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                format === 'json'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Code2 className="h-3.5 w-3.5" />
              <span>JSON</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Copiado</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copiar {format === 'json' ? 'JSON' : 'lista'}</span>
              </>
            )}
          </button>
        </div>

        {/* Scrollable Content */}
        <div key={format} className="flex-1 overflow-y-auto px-6 py-5 shimmer-sweep">
          {format === 'list' ? (
            <div className="space-y-5">
              {/* Compact Metrics Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-px overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-200 dark:bg-slate-800">
                <div className="bg-white dark:bg-[#0F172A] px-3.5 py-3">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Concluídas</p>
                  <p className="mt-0.5 font-mono text-lg font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                    {report.metrics.completedCount}
                  </p>
                </div>
                <div className="bg-white dark:bg-[#0F172A] px-3.5 py-3">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Pontualidade</p>
                  <p className="mt-0.5 font-mono text-lg font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                    {report.metrics.onTimeRate === null ? '—' : `${report.metrics.onTimeRate}%`}
                  </p>
                </div>
                <div className="bg-white dark:bg-[#0F172A] px-3.5 py-3">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Tempo entregue</p>
                  <p className="mt-0.5 font-mono text-lg font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                    {formatDurationPtBr(report.metrics.totalCompletedDurationMinutes)}
                  </p>
                </div>
                <div className="bg-white dark:bg-[#0F172A] px-3.5 py-3">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Sequência</p>
                  <p className="mt-0.5 font-mono text-lg font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                    {report.profile.streakDays}d
                  </p>
                </div>
              </div>

              {/* Additional Metrics List */}
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Métricas de desempenho
                </h3>
                <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-200/70 dark:border-slate-800 pb-1.5">
                    <dt className="text-slate-500 dark:text-slate-400">Conclusão semanal</dt>
                    <dd className="font-mono font-medium tabular-nums text-slate-900 dark:text-slate-100">
                      {report.metrics.weeklyCompletionRate}% ({report.metrics.plannedCount}{' '}
                      planejadas)
                    </dd>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-200/70 dark:border-slate-800 pb-1.5">
                    <dt className="text-slate-500 dark:text-slate-400">Média diária</dt>
                    <dd className="font-mono font-medium tabular-nums text-slate-900 dark:text-slate-100">
                      {report.metrics.averageDailyCompleted} / dia
                    </dd>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-200/70 dark:border-slate-800 pb-1.5">
                    <dt className="text-slate-500 dark:text-slate-400">Dia mais produtivo</dt>
                    <dd className="font-mono font-medium tabular-nums text-slate-900 dark:text-slate-100">
                      {report.metrics.mostProductiveDay
                        ? `${report.metrics.mostProductiveDay.weekdayLabel} (${report.metrics.mostProductiveDay.completed})`
                        : '—'}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-200/70 dark:border-slate-800 pb-1.5">
                    <dt className="text-slate-500 dark:text-slate-400">Evolução atual</dt>
                    <dd className="font-mono font-medium tabular-nums text-slate-900 dark:text-slate-100">
                      Nível {report.profile.level} · {report.profile.xp} XP
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Completed Activities List */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Atividades concluídas na semana
                  </h3>
                  <span className="font-mono text-xs tabular-nums text-slate-400 dark:text-slate-500">
                    {report.completedActivities.length} item(ns)
                  </span>
                </div>

                {report.completedActivities.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-200 dark:border-slate-800 px-4 py-7 text-center">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Nenhuma atividade concluída nos últimos 7 dias
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Conclua tarefas na semana para vê-las listadas aqui e exportá-las no relatório.
                    </p>
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-100 dark:divide-slate-800 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A]">
                    {report.completedActivities.map((item) => (
                      <li
                        key={item.id}
                        className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                            {item.title}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                            {item.categoryLabel} · Prioridade {item.priorityLabel} ·{' '}
                            {item.durationMinutes} min
                          </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 text-xs">
                          <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
                            {formatIsoDatePtBr(item.completedDate)}
                            {item.scheduledTime ? ` ${item.scheduledTime}` : ''}
                          </span>
                          <span
                            className={`font-medium ${
                              item.onTime
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-amber-600 dark:text-amber-400'
                            }`}
                          >
                            {item.onTime ? 'No prazo' : 'Após o prazo'}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ) : (
            <pre
              aria-label="Conteúdo JSON do resumo semanal"
              className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B1120] p-4 font-mono text-xs leading-relaxed text-slate-800 dark:text-slate-200"
            >
              {jsonText}
            </pre>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 px-6 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 dark:border-slate-700 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
          >
            Fechar
          </button>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleDownloadTxt}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Baixar lista (.txt)</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadJson}
              className="inline-flex items-center gap-1.5 rounded-lg accent-bg px-4 py-2 text-xs font-medium text-white transition-colors whitespace-nowrap"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Baixar JSON (.json)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
