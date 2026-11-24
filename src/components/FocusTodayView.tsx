import React, { useMemo, useState } from 'react';
import { BellRing, ChevronDown, ChevronRight, Plus } from 'lucide-react';
import type { Task, TaskDraft, UserGamificationProfile } from '../types';
import type { PushPermissionState } from '../services/notifications';
import {
  computeAnalytics,
  formatShortDatePtBr,
  getLocalDateStr,
  sortTasks,
} from '../utils/productivity';
import { FocusTimerCard } from './FocusTimerCard';
import { TaskRow } from './TaskRow';
import { TaskListShimmer } from './Shimmer';

interface FocusTodayViewProps {
  tasks: Task[];
  profile: UserGamificationProfile;
  focusedTaskId: string | null;
  pushPermission: PushPermissionState;
  soundEnabled: boolean;
  isSyncing?: boolean;
  onSelectFocusTask: (task: Task) => void;
  onToggleTask: (id: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
  onQuickAddTask: (draft: TaskDraft) => void;
  onOpenNewTaskModal: () => void;
  onCompleteFocusSession: (minutes: number, taskTitle?: string) => void;
  onEnablePush: () => void;
  onTestNotification: () => void;
}

export const FocusTodayView: React.FC<FocusTodayViewProps> = ({
  tasks,
  profile,
  focusedTaskId,
  pushPermission,
  soundEnabled,
  isSyncing = false,
  onSelectFocusTask,
  onToggleTask,
  onEditTask,
  onDeleteTask,
  onQuickAddTask,
  onOpenNewTaskModal,
  onCompleteFocusSession,
  onEnablePush,
  onTestNotification,
}) => {
  const [scope, setScope] = useState<'today' | 'all_pending'>('today');
  const [scopeTransitionKey, setScopeTransitionKey] = useState(0);
  const [quickTitle, setQuickTitle] = useState('');
  const [quickError, setQuickError] = useState<string | null>(null);
  const [showCompletedToday, setShowCompletedToday] = useState(false);

  const todayStr = getLocalDateStr();
  const analytics = useMemo(() => computeAnalytics(tasks, 7), [tasks]);

  const rankedPending = useMemo(() => {
    const pending = tasks.filter((t) => t.status === 'pending');
    const filtered =
      scope === 'today' ? pending.filter((t) => t.dueDate <= todayStr) : pending;
    return sortTasks(filtered, 'smart');
  }, [tasks, scope, todayStr]);

  const completedTodayList = useMemo(
    () =>
      tasks.filter((t) => {
        if (t.status !== 'completed') return false;
        const doneDay = t.completedAt ? t.completedAt.slice(0, 10) : t.dueDate;
        return doneDay === todayStr;
      }),
    [tasks, todayStr]
  );

  const upcomingReminders = useMemo(() => {
    return sortTasks(
      tasks.filter(
        (t) =>
          t.status === 'pending' &&
          Boolean(t.scheduledTime) &&
          t.reminderMinutesBefore > 0
      ),
      'time'
    ).slice(0, 4);
  }, [tasks]);

  const activeFocusTask = useMemo(() => {
    if (focusedTaskId) {
      const found = tasks.find((t) => t.id === focusedTaskId && t.status === 'pending');
      if (found) return found;
    }
    return rankedPending[0] || null;
  }, [focusedTaskId, tasks, rankedPending]);

  const goalPct = Math.min(100, Math.round((analytics.completedToday / Math.max(1, profile.dailyGoal)) * 100));

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = quickTitle.trim();
    if (!trimmed) {
      setQuickError('Digite o título da atividade para adicionar rapidamente.');
      return;
    }
    onQuickAddTask({
      title: trimmed,
      description: '',
      priority: 'high',
      category: 'work',
      dueDate: todayStr,
      scheduledTime: '16:00',
      durationMinutes: 30,
      reminderMinutesBefore: 15,
    });
    setQuickTitle('');
    setQuickError(null);
  };

  const rawToday = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());
  const formattedToday = rawToday.charAt(0).toUpperCase() + rawToday.slice(1);

  return (
    <div className="space-y-6">
      {/* Header Row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {formattedToday}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Foco nas tarefas prioritárias
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-slate-500 dark:text-slate-400">Meta diária</p>
            <p className="font-mono text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">
              {analytics.completedToday}/{profile.dailyGoal} ({goalPct}%)
            </p>
          </div>
          <div className="h-9 w-9 relative shrink-0" aria-hidden="true">
            <svg viewBox="0 0 36 36" className="h-9 w-9 -rotate-90">
              <circle
                cx="18"
                cy="18"
                r="15"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                className="text-slate-200 dark:text-slate-800"
              />
              <circle
                cx="18"
                cy="18"
                r="15"
                fill="none"
                stroke="var(--accent-primary)"
                strokeWidth="3"
                strokeDasharray={`${goalPct * 0.942} 100`}
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* 4-Column Flat KPI Strip with crisp hairlines on mobile 2x2 and desktop 4x1 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-200 dark:bg-slate-800">
        <div className="bg-white dark:bg-[#111827] px-5 py-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Pendentes hoje</p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">
            {analytics.pendingToday}
          </p>
        </div>
        <div className="bg-white dark:bg-[#111827] px-5 py-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Concluídas hoje</p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
            {analytics.completedToday}
          </p>
        </div>
        <div className="bg-white dark:bg-[#111827] px-5 py-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Sequência ativa</p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">
            {profile.streakDays} dias
          </p>
        </div>
        <div className="bg-white dark:bg-[#111827] px-5 py-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Tempo em foco</p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">
            {profile.focusMinutesTotal} min
          </p>
        </div>
      </div>

      {/* Main 2-Column Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Ranked Pending Tasks */}
        <div className="lg:col-span-8 space-y-4">
          <section
            aria-labelledby="priority-queue-heading"
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827]"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 px-5 py-4">
              <div>
                <h2
                  id="priority-queue-heading"
                  className="text-base font-semibold text-slate-900 dark:text-slate-100"
                >
                  Fila priorizada
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Ordenada automaticamente por urgência, horário e nível de prioridade.
                </p>
              </div>
              <div className="flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-900 p-1">
                <button
                  type="button"
                  onClick={() => {
                    if (scope !== 'today') {
                      setScope('today');
                      setScopeTransitionKey((k) => k + 1);
                    }
                  }}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                    scope === 'today'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Hoje
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (scope !== 'all_pending') {
                      setScope('all_pending');
                      setScopeTransitionKey((k) => k + 1);
                    }
                  }}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                    scope === 'all_pending'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Todas pendentes
                </button>
              </div>
            </div>

            {/* Fast Inline Capture */}
            <form
              onSubmit={handleQuickAdd}
              noValidate
              className="border-b border-slate-100 dark:border-slate-800 px-4 py-3"
            >
              <div className="flex items-center gap-2">
                <label htmlFor="quick-add-input" className="sr-only">
                  Adicionar atividade prioritária para hoje
                </label>
                <input
                  id="quick-add-input"
                  type="text"
                  value={quickTitle}
                  onChange={(e) => {
                    setQuickTitle(e.target.value);
                    if (quickError) setQuickError(null);
                  }}
                  placeholder="Adicionar atividade rápida para hoje..."
                  maxLength={140}
                  className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/70 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-lg accent-bg px-3.5 py-2 text-xs font-medium text-white transition-colors whitespace-nowrap shrink-0"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Adicionar</span>
                </button>
              </div>
              {quickError && (
                <p role="alert" className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                  {quickError}
                </p>
              )}
            </form>

            <div
              key={scopeTransitionKey}
              className={scopeTransitionKey > 0 ? 'shimmer-sweep' : ''}
            >
              {isSyncing && tasks.length === 0 ? (
                <TaskListShimmer rows={4} />
              ) : rankedPending.length === 0 ? (
                <div className="px-6 py-10 text-center">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {tasks.length === 0
                      ? 'Sua lista está limpa e pronta para começar'
                      : 'Tudo concluído neste recorte'}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {tasks.length === 0
                      ? 'Adicione sua primeira atividade acima ou agende com data, horário e lembrete automático.'
                      : 'Você zerou suas pendências atuais. Aproveite o ritmo ou planeje a próxima entrega.'}
                  </p>
                  <button
                    type="button"
                    onClick={onOpenNewTaskModal}
                    className="mt-4 inline-flex items-center gap-2 rounded-lg accent-bg px-4 py-2 text-xs font-medium text-white"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>
                      {tasks.length === 0 ? 'Criar primeira atividade' : 'Agendar nova atividade'}
                    </span>
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {rankedPending.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      isFocused={activeFocusTask?.id === task.id}
                      onToggle={onToggleTask}
                      onEdit={onEditTask}
                      onDelete={onDeleteTask}
                      onFocus={onSelectFocusTask}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Collapsible Completed Today */}
          {completedTodayList.length > 0 && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827]">
              <button
                type="button"
                aria-expanded={showCompletedToday}
                onClick={() => setShowCompletedToday((v) => !v)}
                className="flex w-full items-center justify-between px-5 py-3.5 text-left text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
              >
                <span className="flex items-center gap-2">
                  {showCompletedToday ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <span>Concluídas hoje ({completedTodayList.length})</span>
                </span>
                <span className="font-mono tabular-nums text-[11px]">XP contabilizado</span>
              </button>
              {showCompletedToday && (
                <div className="divide-y divide-slate-100 dark:divide-slate-800/80 border-t border-slate-100 dark:border-slate-800">
                  {completedTodayList.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      onToggle={onToggleTask}
                      onEdit={onEditTask}
                      onDelete={onDeleteTask}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Focus Timer & Automated Schedule Reminders */}
        <div className="lg:col-span-4 space-y-5">
          <FocusTimerCard
            activeTask={activeFocusTask}
            zenChimeUnlocked={profile.unlockedRewardIds.includes('zen_chime')}
            soundEnabled={soundEnabled}
            onSessionComplete={onCompleteFocusSession}
          />

          <section
            aria-labelledby="reminders-heading"
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5"
          >
            <div className="flex items-center justify-between gap-2">
              <h2
                id="reminders-heading"
                className="text-sm font-semibold text-slate-900 dark:text-slate-100"
              >
                Lembretes automáticos
              </h2>
              <button
                type="button"
                onClick={pushPermission === 'granted' ? onTestNotification : onEnablePush}
                className="text-xs font-medium accent-text hover:underline whitespace-nowrap"
              >
                {pushPermission === 'granted' ? 'Testar push' : 'Ativar push'}
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {pushPermission === 'granted'
                ? 'Notificações push autorizadas para alertas no cronograma.'
                : 'Alertas visuais ativos no app. Autorize push para receber fora da aba.'}
            </p>

            {upcomingReminders.length === 0 ? (
              <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
                Nenhum lembrete agendado. Defina horário e antecedência nas atividades.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-slate-100 dark:divide-slate-800/80">
                {upcomingReminders.map((task) => (
                  <li key={task.id} className="py-2.5 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-medium text-slate-800 dark:text-slate-200 line-clamp-1">
                        {task.title}
                      </p>
                      <BellRing
                        className="h-3.5 w-3.5 shrink-0 text-slate-400 mt-0.5"
                        aria-hidden="true"
                      />
                    </div>
                    <p className="mt-0.5 text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                      {formatShortDatePtBr(task.dueDate)} {task.scheduledTime} · aviso{' '}
                      {task.reminderMinutesBefore} min antes
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
