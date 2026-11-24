import React, { useMemo, useRef, useState } from 'react';
import {
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Download,
  Plus,
  RefreshCw,
  Upload,
} from 'lucide-react';
import { PRIORITY_LABELS, type GoogleCalendarEvent, type Task } from '../types';
import { getCategoryLabel } from '../utils/categories';
import { getLocalDateStr } from '../utils/productivity';
import { generateIcsCalendar, parseIcsCalendar } from '../utils/ics';
import { GoogleSignInButton } from './GoogleSignInButton';
import { CalendarAgendaShimmer } from './Shimmer';

interface CalendarViewProps {
  tasks: Task[];
  googleEvents: GoogleCalendarEvent[];
  hasGoogleToken: boolean;
  googleLoading: boolean;
  onConnectGoogle: () => void;
  onRefreshGoogleEvents: () => void;
  onRequestPushTaskToGoogle: (task: Task) => void;
  onImportGoogleEventAsTask: (ev: GoogleCalendarEvent) => void;
  onImportIcsTasks: (tasks: Task[]) => void;
  onOpenNewTaskForDate: (dateStr: string) => void;
  onToggleTask: (id: string) => void;
  onNotify: (title: string, description?: string, tone?: 'info' | 'success' | 'warning') => void;
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export const CalendarView: React.FC<CalendarViewProps> = ({
  tasks,
  googleEvents,
  hasGoogleToken,
  googleLoading,
  onConnectGoogle,
  onRefreshGoogleEvents,
  onRequestPushTaskToGoogle,
  onImportGoogleEventAsTask,
  onImportIcsTasks,
  onOpenNewTaskForDate,
  onToggleTask,
  onNotify,
}) => {
  const todayStr = getLocalDateStr();
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [monthCursor, setMonthCursor] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const rawMonthLabel = new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  }).format(monthCursor);
  const monthLabel = rawMonthLabel.charAt(0).toUpperCase() + rawMonthLabel.slice(1);

  const calendarDays = useMemo(() => {
    const year = monthCursor.getFullYear();
    const month = monthCursor.getMonth();
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: { dateStr: string; day: number; inMonth: boolean }[] = [];
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const dt = new Date(year, month, -i);
      cells.push({ dateStr: getLocalDateStr(dt), day: dt.getDate(), inMonth: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(year, month, d);
      cells.push({ dateStr: getLocalDateStr(dt), day: d, inMonth: true });
    }
    while (cells.length < 42) {
      const nextDay = cells.length - firstDayOfWeek - daysInMonth + 1;
      const dt = new Date(year, month + 1, nextDay);
      cells.push({ dateStr: getLocalDateStr(dt), day: dt.getDate(), inMonth: false });
    }
    return cells;
  }, [monthCursor]);

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of tasks) {
      const list = map.get(t.dueDate) || [];
      list.push(t);
      map.set(t.dueDate, list);
    }
    return map;
  }, [tasks]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, GoogleCalendarEvent[]>();
    for (const ev of googleEvents) {
      const list = map.get(ev.startDate) || [];
      list.push(ev);
      map.set(ev.startDate, list);
    }
    return map;
  }, [googleEvents]);

  const selectedDayTasks = useMemo(() => {
    const list = tasksByDate.get(selectedDate) || [];
    return [...list].sort((a, b) => (a.scheduledTime || '23:59').localeCompare(b.scheduledTime || '23:59'));
  }, [tasksByDate, selectedDate]);

  const selectedDayEvents = useMemo(
    () => eventsByDate.get(selectedDate) || [],
    [eventsByDate, selectedDate]
  );

  const handleExportIcs = () => {
    const content = generateIcsCalendar(tasks);
    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cadencia-cronograma-${todayStr}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onNotify('Arquivo .ics exportado', 'Compatível com Google Calendar, Apple Calendar e Outlook.', 'success');
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseIcsCalendar(text, 'local_user');
      if (parsed.length === 0) {
        onNotify('Nenhum evento encontrado', 'Verifique se o arquivo .ics contém eventos válidos.', 'warning');
      } else {
        onImportIcsTasks(parsed);
      }
    } catch {
      onNotify('Falha na leitura do arquivo', 'Não foi possível importar o arquivo selecionado.', 'warning');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const selectedDateFormatted = useMemo(() => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const raw = new Intl.DateTimeFormat('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(new Date(y, (m || 1) - 1, d || 1));
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }, [selectedDate]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Calendário integrado
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Visualize seu cronograma mensal, sincronize com o Google Calendar ou importe/exporte arquivos .ics.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".ics,text/calendar"
            onChange={handleImportFile}
            className="hidden"
            aria-label="Importar arquivo iCalendar .ics"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Importar .ics</span>
          </button>
          <button
            type="button"
            onClick={handleExportIcs}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Exportar .ics</span>
          </button>
        </div>
      </div>

      {/* Google Calendar Integration Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] px-5 py-4">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Google Calendar
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {hasGoogleToken
              ? `Conectado · ${googleEvents.length} compromisso(s) carregado(s) do seu calendário principal.`
              : 'Conecte sua conta Google para visualizar eventos e enviar tarefas agendadas com confirmação.'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {hasGoogleToken ? (
            <button
              type="button"
              onClick={onRefreshGoogleEvents}
              disabled={googleLoading}
              className={`inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap ${
                googleLoading ? 'shimmer-button' : ''
              }`}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${googleLoading ? 'animate-spin' : ''}`} />
              <span>{googleLoading ? 'Sincronizando...' : 'Atualizar eventos'}</span>
            </button>
          ) : (
            <GoogleSignInButton
              onClick={onConnectGoogle}
              loading={googleLoading}
              label="Conectar Google Calendar"
            />
          )}
        </div>
      </div>

      {/* Calendar Grid + Day Schedule Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Month Grid */}
        <section
          aria-label="Grade mensal do calendário"
          className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              {monthLabel}
            </h2>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  setMonthCursor(new Date(now.getFullYear(), now.getMonth(), 1));
                  setSelectedDate(todayStr);
                }}
                className="rounded-md border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Hoje
              </button>
              <button
                type="button"
                aria-label="Mês anterior"
                onClick={() =>
                  setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1))
                }
                className="rounded-md border border-slate-200 dark:border-slate-700 p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Próximo mês"
                onClick={() =>
                  setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1))
                }
                className="rounded-md border border-slate-200 dark:border-slate-700 p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 text-center text-[11px] font-medium text-slate-500 dark:text-slate-400 pb-2">
            {WEEKDAYS.map((w) => (
              <div key={w}>{w}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((cell) => {
              const dayTasks = tasksByDate.get(cell.dateStr) || [];
              const dayGoogle = eventsByDate.get(cell.dateStr) || [];
              const pendingDay = dayTasks.filter((t) => t.status === 'pending').length;
              const doneDay = dayTasks.length - pendingDay;
              const isSelected = cell.dateStr === selectedDate;
              const isToday = cell.dateStr === todayStr;

              return (
                <button
                  key={cell.dateStr}
                  type="button"
                  onClick={() => setSelectedDate(cell.dateStr)}
                  aria-label={`Selecionar ${cell.dateStr}, ${dayTasks.length} atividades e ${dayGoogle.length} eventos`}
                  aria-pressed={isSelected}
                  className={`flex flex-col items-center justify-between rounded-lg border p-2 min-h-[56px] transition-colors ${
                    isSelected
                      ? 'accent-border accent-soft-bg'
                      : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  } ${!cell.inMonth ? 'opacity-40' : ''}`}
                >
                  <span
                    className={`font-mono text-xs tabular-nums ${
                      isToday
                        ? 'font-bold accent-text'
                        : 'font-medium text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {cell.day}
                  </span>

                  <div className="flex items-center gap-1 mt-1">
                    {pendingDay > 0 && (
                      <span
                        className="h-1.5 w-3 rounded-full accent-bg"
                        title={`${pendingDay} pendente(s)`}
                      />
                    )}
                    {doneDay > 0 && (
                      <span
                        className="h-1.5 w-1.5 rounded-full bg-emerald-500"
                        title={`${doneDay} concluída(s)`}
                      />
                    )}
                    {dayGoogle.length > 0 && (
                      <span
                        className="h-1.5 w-1.5 rounded-full bg-amber-500"
                        title={`${dayGoogle.length} evento(s) Google Calendar`}
                      />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-slate-100 dark:border-slate-800 pt-3 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-3 rounded-full accent-bg" /> Pendentes
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Concluídas
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Google Calendar
            </span>
          </div>
        </section>

        {/* Selected Day Agenda */}
        <section
          aria-labelledby="day-agenda-heading"
          className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5"
        >
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2
                id="day-agenda-heading"
                className="text-sm font-semibold text-slate-900 dark:text-slate-100"
              >
                {selectedDateFormatted}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {selectedDayTasks.length} atividade(s) · {selectedDayEvents.length} evento(s) externos
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenNewTaskForDate(selectedDate)}
              className="inline-flex items-center gap-1 rounded-lg accent-bg px-3 py-1.5 text-xs font-medium text-white whitespace-nowrap shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Agendar</span>
            </button>
          </div>

          <div key={selectedDate} className="shimmer-sweep">
            {googleLoading ? (
              <CalendarAgendaShimmer />
            ) : selectedDayTasks.length === 0 && selectedDayEvents.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  Dia livre no cronograma
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Clique em "Agendar" para planejar uma nova atividade com lembrete automático.
                </p>
              </div>
            ) : (
              <div className="mt-3 space-y-4">
                {selectedDayTasks.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                      Atividades do Cadência
                    </p>
                    <ul className="divide-y divide-slate-100 dark:divide-slate-800/80">
                      {selectedDayTasks.map((task) => (
                        <li key={task.id} className="py-2.5 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={() => onToggleTask(task.id)}
                              className={`text-left text-xs font-medium hover:underline ${
                                task.status === 'completed'
                                  ? 'line-through text-slate-400 dark:text-slate-500'
                                  : 'text-slate-900 dark:text-slate-100'
                              }`}
                            >
                              {task.title}
                            </button>
                            <p className="mt-0.5 text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                              {task.scheduledTime || 'Sem hora'} · {task.durationMinutes} min ·{' '}
                              {getCategoryLabel(task.category)} · {PRIORITY_LABELS[task.priority]}
                            </p>
                          </div>

                        {hasGoogleToken && !task.calendarEventId && (
                          <button
                            type="button"
                            onClick={() => onRequestPushTaskToGoogle(task)}
                            aria-label={`Enviar "${task.title}" para o Google Calendar`}
                            title="Enviar para Google Calendar"
                            className="shrink-0 inline-flex items-center gap-1 rounded-md border border-slate-200 dark:border-slate-700 px-2 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap"
                          >
                            <CalendarPlus className="h-3 w-3" />
                            <span>Enviar</span>
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedDayEvents.length > 0 && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                    Eventos do Google Calendar
                  </p>
                  <ul className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {selectedDayEvents.map((ev) => (
                      <li key={ev.id} className="py-2.5 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">
                            {ev.summary}
                          </p>
                          <p className="mt-0.5 text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                            {ev.startTime ? `${ev.startTime}–${ev.endTime || ''}` : 'Dia inteiro'} ·{' '}
                            {ev.durationMinutes} min
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onImportGoogleEventAsTask(ev)}
                          className="shrink-0 rounded-md border border-slate-200 dark:border-slate-700 px-2 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap"
                        >
                          Importar tarefa
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
