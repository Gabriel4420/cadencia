import React, { useMemo, useState } from 'react';
import { Plus, Search, Tag, Trash2, X } from 'lucide-react';
import {
  type SortMode,
  type Task,
  type TaskCategory,
} from '../types';
import {
  getAllCategoryOptions,
  MAX_CATEGORY_LENGTH,
  type AddCategoryResult,
} from '../utils/categories';
import { sortTasks } from '../utils/productivity';
import { TaskRow } from './TaskRow';
import { TaskListShimmer } from './Shimmer';

interface TasksViewProps {
  tasks: Task[];
  customCategories: string[];
  isSyncing?: boolean;
  onAddCategory: (name: string) => AddCategoryResult;
  onRemoveCategory: (name: string) => void;
  onToggleTask: (id: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
  onFocusTask: (task: Task) => void;
  onOpenNewTaskModal: () => void;
  onRequestClearCompleted: () => void;
}

export const TasksView: React.FC<TasksViewProps> = ({
  tasks,
  customCategories,
  isSyncing = false,
  onAddCategory,
  onRemoveCategory,
  onToggleTask,
  onEditTask,
  onDeleteTask,
  onFocusTask,
  onOpenNewTaskModal,
  onRequestClearCompleted,
}) => {
  const [statusFilter, setStatusFilter] = useState<'pending' | 'completed' | 'all'>('pending');
  const [categoryFilter, setCategoryFilter] = useState<TaskCategory | 'all'>('all');
  const [sortMode, setSortMode] = useState<SortMode>('smart');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoriesPanelOpen, setCategoriesPanelOpen] = useState(false);
  const [newCatInput, setNewCatInput] = useState('');
  const [catError, setCatError] = useState<string | null>(null);
  const [filterTransitionKey, setFilterTransitionKey] = useState(0);

  const categoryOptions = useMemo(
    () => getAllCategoryOptions(customCategories, tasks),
    [customCategories, tasks]
  );

  const completedCount = useMemo(
    () => tasks.filter((t) => t.status === 'completed').length,
    [tasks]
  );

  const handleAddCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = onAddCategory(newCatInput);
    if (!res.ok) {
      setCatError(res.error || 'Informe um nome válido.');
      return;
    }
    setNewCatInput('');
    setCatError(null);
  };

  const filteredTasks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = tasks.filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
      if (
        q &&
        !t.title.toLowerCase().includes(q) &&
        !(t.description || '').toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
    return sortTasks(list, sortMode);
  }, [tasks, statusFilter, categoryFilter, sortMode, searchQuery]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Todas as atividades
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Gerencie prioridades, prazos e lembretes de todo o seu cronograma.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-expanded={categoriesPanelOpen}
            onClick={() => setCategoriesPanelOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
          >
            <Tag className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
            <span>Categorias ({categoryOptions.length})</span>
          </button>

          {completedCount > 0 && (
            <button
              type="button"
              onClick={onRequestClearCompleted}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Arquivar concluídas ({completedCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* Custom Categories Management Panel */}
      {categoriesPanelOpen && (
        <section
          aria-labelledby="categories-manager-heading"
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 space-y-4 shimmer-sweep"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2
                id="categories-manager-heading"
                className="text-sm font-semibold text-slate-900 dark:text-slate-100"
              >
                Gerenciar categorias
              </h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Crie categorias personalizadas além das padrões para organizar projetos, áreas e metas.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCategoriesPanelOpen(false)}
              aria-label="Fechar painel de categorias"
              className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleAddCategorySubmit} noValidate className="space-y-1.5">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <label htmlFor="tasks-new-category-input" className="sr-only">
                Nova categoria personalizada
              </label>
              <input
                id="tasks-new-category-input"
                type="text"
                value={newCatInput}
                onChange={(e) => {
                  setNewCatInput(e.target.value);
                  if (catError) setCatError(null);
                }}
                placeholder="Nova categoria (ex.: Financeiro, Projetos, Casa)..."
                maxLength={MAX_CATEGORY_LENGTH}
                className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/70 px-3.5 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
              />
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-1.5 rounded-lg accent-bg px-4 py-2 text-xs font-medium text-white whitespace-nowrap shrink-0"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Criar categoria</span>
              </button>
            </div>
            {catError && (
              <p role="alert" className="text-xs text-red-600 dark:text-red-400">
                {catError}
              </p>
            )}
          </form>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                Padrão
              </p>
              <ul className="divide-y divide-slate-100 dark:divide-slate-800/80 rounded-lg border border-slate-200/80 dark:border-slate-800">
                {categoryOptions
                  .filter((o) => o.isBuiltIn)
                  .map((opt) => (
                    <li
                      key={opt.id}
                      className="flex items-center justify-between px-3 py-2 text-xs text-slate-700 dark:text-slate-300"
                    >
                      <span>{opt.label}</span>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500">Fixa</span>
                    </li>
                  ))}
              </ul>
            </div>

            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                Personalizadas ({customCategories.length})
              </p>
              {customCategories.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200 dark:border-slate-800 px-3 py-5 text-center text-xs text-slate-500 dark:text-slate-400">
                  Nenhuma categoria personalizada criada ainda.
                </div>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800/80 rounded-lg border border-slate-200/80 dark:border-slate-800">
                  {customCategories.map((cat) => (
                    <li
                      key={cat}
                      className="flex items-center justify-between px-3 py-2 text-xs text-slate-800 dark:text-slate-200"
                    >
                      <span className="truncate font-medium">{cat}</span>
                      <button
                        type="button"
                        onClick={() => {
                          if (categoryFilter === cat) setCategoryFilter('all');
                          onRemoveCategory(cat);
                        }}
                        aria-label={`Remover categoria "${cat}"`}
                        className="rounded-md p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-900 p-1">
            {(
              [
                { id: 'pending', label: 'Pendentes' },
                { id: 'completed', label: 'Concluídas' },
                { id: 'all', label: 'Todas' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setStatusFilter(tab.id);
                  setFilterTransitionKey((k) => k + 1);
                }}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  statusFilter === tab.id
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <label htmlFor="tasks-category-filter" className="sr-only">
            Filtrar por categoria
          </label>
          <select
            id="tasks-category-filter"
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value as TaskCategory | 'all');
              setFilterTransitionKey((k) => k + 1);
            }}
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200"
          >
            <option value="all">Todas as categorias</option>
            {categoryOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>

          <label htmlFor="tasks-sort-select" className="sr-only">
            Ordenar atividades
          </label>
          <select
            id="tasks-sort-select"
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200"
          >
            <option value="smart">Ordenar: Prioridade inteligente</option>
            <option value="priority">Ordenar: Nível de prioridade</option>
            <option value="time">Ordenar: Horário agendado</option>
            <option value="dueDate">Ordenar: Data de entrega</option>
          </select>
        </div>

        <div className="relative w-full lg:w-64">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <label htmlFor="tasks-search-input" className="sr-only">
            Buscar atividades
          </label>
          <input
            id="tasks-search-input"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por título ou nota..."
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/70 pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Task List */}
      <div
        key={filterTransitionKey}
        className={`rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] ${
          filterTransitionKey > 0 ? 'shimmer-sweep' : ''
        }`}
      >
        {isSyncing && tasks.length === 0 ? (
          <TaskListShimmer rows={4} />
        ) : filteredTasks.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
              Nenhuma atividade encontrada
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Ajuste os filtros ativos ou crie uma nova atividade para o seu cronograma.
            </p>
            <button
              type="button"
              onClick={onOpenNewTaskModal}
              className="mt-4 inline-flex items-center gap-2 rounded-lg accent-bg px-4 py-2 text-xs font-medium text-white"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Nova atividade</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {filteredTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onToggle={onToggleTask}
                onEdit={onEditTask}
                onDelete={onDeleteTask}
                onFocus={onFocusTask}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
