import React, { useEffect, useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import {
  PRIORITY_LABELS,
  REMINDER_OPTIONS,
  type Task,
  type TaskCategory,
  type TaskDraft,
  type TaskPriority,
} from '../types';
import {
  getAllCategoryOptions,
  MAX_CATEGORY_LENGTH,
  type AddCategoryResult,
} from '../utils/categories';
import { getLocalDateStr } from '../utils/productivity';

interface TaskModalProps {
  open: boolean;
  editingTask: Task | null;
  defaultDate?: string;
  defaultReminderMinutes?: number;
  customCategories: string[];
  onAddCategory: (name: string) => AddCategoryResult;
  onClose: () => void;
  onSave: (draft: TaskDraft, editingId?: string) => void;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  open,
  editingTask,
  defaultDate,
  defaultReminderMinutes = 15,
  customCategories,
  onAddCategory,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [category, setCategory] = useState<TaskCategory>('work');
  const [dueDate, setDueDate] = useState(getLocalDateStr());
  const [scheduledTime, setScheduledTime] = useState('14:00');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [reminderMinutesBefore, setReminderMinutesBefore] = useState(defaultReminderMinutes);
  const [error, setError] = useState<string | null>(null);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryError, setCategoryError] = useState<string | null>(null);

  const categoryOptions = useMemo(
    () => getAllCategoryOptions(customCategories, editingTask ? [editingTask] : []),
    [customCategories, editingTask]
  );

  useEffect(() => {
    if (!open) return;
    setError(null);
    setCreatingCategory(false);
    setNewCategoryName('');
    setCategoryError(null);
    if (editingTask) {
      setTitle(editingTask.title);
      setDescription(editingTask.description || '');
      setPriority(editingTask.priority);
      setCategory(editingTask.category);
      setDueDate(editingTask.dueDate);
      setScheduledTime(editingTask.scheduledTime || '09:00');
      setDurationMinutes(editingTask.durationMinutes);
      setReminderMinutesBefore(editingTask.reminderMinutesBefore);
    } else {
      setTitle('');
      setDescription('');
      setPriority('medium');
      setCategory('work');
      setDueDate(defaultDate || getLocalDateStr());
      setScheduledTime('14:00');
      setDurationMinutes(30);
      setReminderMinutesBefore(defaultReminderMinutes);
    }
  }, [open, editingTask, defaultDate, defaultReminderMinutes]);

  const handleCreateCategory = () => {
    const result = onAddCategory(newCategoryName);
    if (!result.ok) {
      setCategoryError(result.error || 'Não foi possível criar a categoria.');
      return;
    }
    if (result.categoryId) {
      setCategory(result.categoryId);
    }
    setNewCategoryName('');
    setCategoryError(null);
    setCreatingCategory(false);
  };

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      setError('Informe um título para a atividade antes de salvar.');
      return;
    }
    if (trimmed.length > 140) {
      setError('O título deve ter no máximo 140 caracteres.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
      setError('Selecione uma data válida.');
      return;
    }
    const safeDuration = Number(durationMinutes);
    if (Number.isNaN(safeDuration) || safeDuration < 5 || safeDuration > 480) {
      setError('A duração deve ficar entre 5 e 480 minutos.');
      return;
    }

    onSave(
      {
        title: trimmed,
        description: description.trim().slice(0, 600),
        priority,
        category,
        dueDate,
        scheduledTime,
        durationMinutes: safeDuration,
        reminderMinutesBefore: Number(reminderMinutesBefore),
      },
      editingTask?.id
    );
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-modal-heading"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-[2px] p-4"
    >
      <div className="w-full max-w-lg rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4">
          <h2
            id="task-modal-heading"
            className="text-base font-semibold text-slate-900 dark:text-slate-100"
          >
            {editingTask ? 'Editar atividade' : 'Nova atividade'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar formulário de atividade"
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="p-6 space-y-4">
          {error && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-3.5 py-2.5 text-xs font-medium text-red-700 dark:text-red-300"
            >
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="task-title-input"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Título da atividade
            </label>
            <input
              id="task-title-input"
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Ex.: Revisar relatório trimestral de métricas"
              maxLength={140}
              autoFocus
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>

          <div>
            <label
              htmlFor="task-desc-input"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Notas ou critérios de entrega (opcional)
            </label>
            <textarea
              id="task-desc-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              maxLength={600}
              placeholder="Detalhes objetivos para manter foco na execução..."
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Prioridade
              </span>
              <div className="grid grid-cols-3 gap-1.5 p-1 rounded-lg bg-slate-100 dark:bg-slate-900">
                {(['high', 'medium', 'low'] as TaskPriority[]).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setPriority(level)}
                    className={`rounded-md py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                      priority === level
                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    {PRIORITY_LABELS[level]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="task-category-select"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                >
                  Categoria
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setCreatingCategory((v) => !v);
                    setCategoryError(null);
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-medium accent-text hover:underline whitespace-nowrap"
                >
                  <Plus className="h-3 w-3" />
                  <span>{creatingCategory ? 'Cancelar' : 'Nova categoria'}</span>
                </button>
              </div>
              <select
                id="task-category-select"
                value={category}
                onChange={(e) => setCategory(e.target.value as TaskCategory)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
              >
                {categoryOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {creatingCategory && (
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/60 p-3 space-y-2">
              <label
                htmlFor="new-category-modal-input"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Nome da nova categoria
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="new-category-modal-input"
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => {
                    setNewCategoryName(e.target.value);
                    if (categoryError) setCategoryError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleCreateCategory();
                    }
                  }}
                  placeholder="Ex.: Financeiro, Projetos, Casa..."
                  maxLength={MAX_CATEGORY_LENGTH}
                  className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={handleCreateCategory}
                  className="rounded-lg accent-bg px-3 py-1.5 text-xs font-medium text-white whitespace-nowrap shrink-0"
                >
                  Adicionar
                </button>
              </div>
              {categoryError && (
                <p role="alert" className="text-xs text-red-600 dark:text-red-400">
                  {categoryError}
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label
                htmlFor="task-date-input"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Data
              </label>
              <input
                id="task-date-input"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label
                htmlFor="task-time-input"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Horário
              </label>
              <input
                id="task-time-input"
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label
                htmlFor="task-duration-input"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Duração (min)
              </label>
              <input
                id="task-duration-input"
                type="number"
                min={5}
                max={480}
                step={5}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="task-reminder-select"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Lembrete automático no cronograma
            </label>
            <select
              id="task-reminder-select"
              value={reminderMinutesBefore}
              onChange={(e) => setReminderMinutesBefore(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
            >
              {REMINDER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-lg accent-bg px-5 py-2 text-sm font-medium text-white transition-colors whitespace-nowrap"
            >
              {editingTask ? 'Salvar alterações' : 'Criar atividade'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
