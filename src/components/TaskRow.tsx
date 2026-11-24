import React from 'react';
import { Bell, CalendarCheck2, Check, Pencil, Play, Trash2 } from 'lucide-react';
import { PRIORITY_LABELS, type Task } from '../types';
import { getCategoryLabel } from '../utils/categories';
import { formatShortDatePtBr, isTaskOverdue } from '../utils/productivity';

interface TaskRowProps {
  task: Task;
  isFocused?: boolean;
  onToggle: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onFocus?: (task: Task) => void;
}

const PRIORITY_TEXT_CLASS = {
  high: 'text-red-600 dark:text-red-400 font-medium',
  medium: 'text-amber-700 dark:text-amber-400 font-medium',
  low: 'text-emerald-700 dark:text-emerald-400 font-medium',
};

export const TaskRow: React.FC<TaskRowProps> = ({
  task,
  isFocused = false,
  onToggle,
  onEdit,
  onDelete,
  onFocus,
}) => {
  const isCompleted = task.status === 'completed';
  const overdue = isTaskOverdue(task);

  return (
    <div
      className={`group flex items-start gap-3.5 py-3.5 px-4 transition-colors duration-150 ${
        isFocused
          ? 'bg-blue-50/50 dark:bg-blue-950/20'
          : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
      }`}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={isCompleted}
        aria-label={isCompleted ? `Reabrir "${task.title}"` : `Concluir "${task.title}"`}
        onClick={() => onToggle(task.id)}
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors duration-150 ${
          isCompleted
            ? 'accent-bg accent-border text-white'
            : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 hover:border-slate-500 dark:hover:border-slate-400'
        }`}
      >
        {isCompleted && <Check className="h-3.5 w-3.5 stroke-[2.5]" />}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <p
            className={`text-sm leading-snug ${
              isCompleted
                ? 'line-through text-slate-400 dark:text-slate-500'
                : 'font-medium text-slate-900 dark:text-slate-100'
            }`}
          >
            {task.title}
          </p>
        </div>

        {task.description && !isCompleted && (
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
            {task.description}
          </p>
        )}

        {/* Zero-pill unboxed typographic metadata with subtle dot separators */}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
          <span className={PRIORITY_TEXT_CLASS[task.priority]}>
            Prioridade {PRIORITY_LABELS[task.priority]}
          </span>
          <span aria-hidden="true">·</span>
          <span>{getCategoryLabel(task.category)}</span>
          <span aria-hidden="true">·</span>
          <span
            className={`font-mono tabular-nums ${
              overdue ? 'text-red-600 dark:text-red-400 font-medium' : ''
            }`}
          >
            {formatShortDatePtBr(task.dueDate)}
            {task.scheduledTime ? ` ${task.scheduledTime}` : ''}
            {overdue ? ' (Atrasada)' : ''}
          </span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums">{task.durationMinutes} min</span>
          {task.reminderMinutesBefore > 0 && !isCompleted && (
            <>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                <Bell className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span>{task.reminderMinutesBefore}m antes</span>
              </span>
            </>
          )}
          {task.calendarEventId && (
            <>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                <CalendarCheck2 className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span>No Google Calendar</span>
              </span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity duration-150">
        {!isCompleted && onFocus && (
          <button
            type="button"
            onClick={() => onFocus(task)}
            aria-label={`Iniciar foco em "${task.title}"`}
            title="Focar nesta atividade"
            className="rounded-md p-2 text-slate-500 hover:bg-slate-200/70 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100 transition-colors"
          >
            <Play className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={() => onEdit(task)}
          aria-label={`Editar "${task.title}"`}
          title="Editar atividade"
          className="rounded-md p-2 text-slate-500 hover:bg-slate-200/70 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100 transition-colors"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(task)}
          aria-label={`Excluir "${task.title}"`}
          title="Excluir atividade"
          className="rounded-md p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-950/50 dark:hover:text-red-400 transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
