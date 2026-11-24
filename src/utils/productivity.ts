import type { SortMode, Task, TaskCategory, TaskPriority } from '../types';
import { getAllCategoryOptions } from './categories';

export function getLocalDateStr(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDays(dateStr: string, delta: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d + delta);
  return getLocalDateStr(dt);
}

export function parseTaskScheduledDate(task: Pick<Task, 'dueDate' | 'scheduledTime'>): Date | null {
  if (!task.dueDate) return null;
  const [y, m, d] = task.dueDate.split('-').map(Number);
  if (!y || !m || !d) return null;
  if (task.scheduledTime && /^\d{2}:\d{2}$/.test(task.scheduledTime)) {
    const [hh, mm] = task.scheduledTime.split(':').map(Number);
    return new Date(y, m - 1, d, hh, mm, 0, 0);
  }
  return new Date(y, m - 1, d, 23, 59, 0, 0);
}

export function isTaskOverdue(task: Task, now: Date = new Date()): boolean {
  if (task.status === 'completed') return false;
  const todayStr = getLocalDateStr(now);
  if (task.dueDate < todayStr) return true;
  if (task.dueDate === todayStr && task.scheduledTime) {
    const scheduled = parseTaskScheduledDate(task);
    if (scheduled && scheduled.getTime() < now.getTime()) {
      return true;
    }
  }
  return false;
}

const PRIORITY_WEIGHT: Record<TaskPriority, number> = {
  high: 100,
  medium: 60,
  low: 25,
};

/**
 * Deterministic smart priority scoring so pending tasks surface in true order of urgency.
 */
export function calculatePriorityScore(task: Task, now: Date = new Date()): number {
  if (task.status === 'completed') return -1000;

  let score = PRIORITY_WEIGHT[task.priority];
  const todayStr = getLocalDateStr(now);
  const tomorrowStr = addDays(todayStr, 1);

  if (isTaskOverdue(task, now)) {
    score += 75;
  } else if (task.dueDate === todayStr) {
    score += 45;
    if (task.scheduledTime) {
      const scheduled = parseTaskScheduledDate(task);
      if (scheduled) {
        const diffMin = (scheduled.getTime() - now.getTime()) / 60000;
        if (diffMin >= 0 && diffMin <= 120) {
          score += 35;
        } else if (diffMin > 120 && diffMin <= 240) {
          score += 15;
        }
      }
    }
  } else if (task.dueDate === tomorrowStr) {
    score += 15;
  }

  return score;
}

export function sortTasks(tasks: Task[], mode: SortMode, now: Date = new Date()): Task[] {
  const copy = [...tasks];
  copy.sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === 'pending' ? -1 : 1;
    }
    if (mode === 'smart') {
      const diff = calculatePriorityScore(b, now) - calculatePriorityScore(a, now);
      if (diff !== 0) return diff;
    } else if (mode === 'priority') {
      const diff = PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority];
      if (diff !== 0) return diff;
    } else if (mode === 'time') {
      const timeA = `${a.dueDate}T${a.scheduledTime || '23:59'}`;
      const timeB = `${b.dueDate}T${b.scheduledTime || '23:59'}`;
      if (timeA !== timeB) return timeA.localeCompare(timeB);
    } else if (mode === 'dueDate') {
      if (a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    }
    const fallbackA = `${a.dueDate}T${a.scheduledTime || '23:59'}`;
    const fallbackB = `${b.dueDate}T${b.scheduledTime || '23:59'}`;
    return fallbackA.localeCompare(fallbackB);
  });
  return copy;
}

export interface DueReminder {
  task: Task;
  minutesUntilStart: number;
  reminderKey: string;
}

/**
 * Finds pending tasks whose automatic schedule reminder window is currently active.
 */
export function getDueReminders(
  tasks: Task[],
  now: Date,
  notifiedKeys: ReadonlySet<string>
): DueReminder[] {
  const due: DueReminder[] = [];
  for (const task of tasks) {
    if (task.status !== 'pending') continue;
    if (!task.scheduledTime || task.reminderMinutesBefore <= 0) continue;

    const scheduled = parseTaskScheduledDate(task);
    if (!scheduled) continue;

    const diffMs = scheduled.getTime() - now.getTime();
    const diffMin = Math.round(diffMs / 60000);
    // Fire when within [ -5 min past start, reminderMinutesBefore ]
    if (diffMin <= task.reminderMinutesBefore && diffMin >= -5) {
      const reminderKey = `${task.id}_${task.dueDate}_${task.scheduledTime}_${task.reminderMinutesBefore}`;
      if (!notifiedKeys.has(reminderKey)) {
        due.push({
          task,
          minutesUntilStart: Math.max(0, diffMin),
          reminderKey,
        });
      }
    }
  }
  return due;
}

export interface DailySeriesPoint {
  date: string;
  label: string;
  completed: number;
  planned: number;
  focusMinutes: number;
}

export interface CategoryStat {
  category: TaskCategory;
  label: string;
  completed: number;
  pending: number;
  total: number;
}

export interface HeatmapDay {
  date: string;
  count: number;
  intensity: 0 | 1 | 2 | 3 | 4;
}

export interface AnalyticsSummary {
  completionRate: number;
  onTimeRate: number;
  completedToday: number;
  pendingToday: number;
  overdueCount: number;
  totalCompleted: number;
  totalPending: number;
  dailySeries: DailySeriesPoint[];
  categoryStats: CategoryStat[];
  priorityBreakdown: { priority: TaskPriority; label: string; completed: number; pending: number }[];
  heatmap28Days: HeatmapDay[];
}

const SHORT_WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function computeAnalytics(
  tasks: Task[],
  rangeDays: 7 | 14 | 30 = 7,
  now: Date = new Date(),
  customCategories: string[] = []
): AnalyticsSummary {
  const todayStr = getLocalDateStr(now);
  const completedTasks = tasks.filter((t) => t.status === 'completed');
  const pendingTasks = tasks.filter((t) => t.status === 'pending');

  const completedToday = completedTasks.filter((t) => {
    const doneDay = t.completedAt ? t.completedAt.slice(0, 10) : t.dueDate;
    return doneDay === todayStr;
  }).length;

  const pendingToday = pendingTasks.filter((t) => t.dueDate <= todayStr).length;
  const overdueCount = pendingTasks.filter((t) => isTaskOverdue(t, now)).length;

  const completionRate =
    tasks.length === 0 ? 0 : Math.round((completedTasks.length / tasks.length) * 100);

  let onTimeCompleted = 0;
  for (const t of completedTasks) {
    if (!t.completedAt) {
      onTimeCompleted += 1;
      continue;
    }
    const doneDay = t.completedAt.slice(0, 10);
    if (doneDay <= t.dueDate) {
      onTimeCompleted += 1;
    }
  }
  const onTimeRate =
    completedTasks.length === 0 ? 0 : Math.round((onTimeCompleted / completedTasks.length) * 100);

  const dailySeries: DailySeriesPoint[] = [];
  for (let i = rangeDays - 1; i >= 0; i--) {
    const dateStr = addDays(todayStr, -i);
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    const label =
      rangeDays <= 7
        ? SHORT_WEEKDAYS[dt.getDay()]
        : `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`;

    const dayCompleted = completedTasks.filter((t) => {
      const doneDay = t.completedAt ? t.completedAt.slice(0, 10) : t.dueDate;
      return doneDay === dateStr;
    });
    const dayPlanned = tasks.filter((t) => t.dueDate === dateStr);
    const focusMinutes = dayCompleted.reduce((acc, t) => acc + t.durationMinutes, 0);

    dailySeries.push({
      date: dateStr,
      label,
      completed: dayCompleted.length,
      planned: dayPlanned.length,
      focusMinutes,
    });
  }

  const categoryOptions = getAllCategoryOptions(customCategories, tasks);
  const categoryStats: CategoryStat[] = categoryOptions.map((opt) => {
    const matching = tasks.filter((t) => t.category === opt.id);
    const completed = matching.filter((t) => t.status === 'completed').length;
    const pending = matching.length - completed;
    return {
      category: opt.id,
      label: opt.label,
      completed,
      pending,
      total: matching.length,
    };
  });

  const prioLabels: Record<TaskPriority, string> = {
    high: 'Alta',
    medium: 'Média',
    low: 'Baixa',
  };
  const priorities: TaskPriority[] = ['high', 'medium', 'low'];
  const priorityBreakdown = priorities.map((priority) => {
    const matching = tasks.filter((t) => t.priority === priority);
    const completed = matching.filter((t) => t.status === 'completed').length;
    return {
      priority,
      label: prioLabels[priority],
      completed,
      pending: matching.length - completed,
    };
  });

  const heatmap28Days: HeatmapDay[] = [];
  for (let i = 27; i >= 0; i--) {
    const dateStr = addDays(todayStr, -i);
    const count = completedTasks.filter((t) => {
      const doneDay = t.completedAt ? t.completedAt.slice(0, 10) : t.dueDate;
      return doneDay === dateStr;
    }).length;
    const intensity: 0 | 1 | 2 | 3 | 4 =
      count === 0 ? 0 : count === 1 ? 1 : count === 2 ? 2 : count <= 4 ? 3 : 4;
    heatmap28Days.push({ date: dateStr, count, intensity });
  }

  return {
    completionRate,
    onTimeRate,
    completedToday,
    pendingToday,
    overdueCount,
    totalCompleted: completedTasks.length,
    totalPending: pendingTasks.length,
    dailySeries,
    categoryStats,
    priorityBreakdown,
    heatmap28Days,
  };
}

export function formatShortDatePtBr(dateStr: string, todayStr: string = getLocalDateStr()): string {
  if (dateStr === todayStr) return 'Hoje';
  if (dateStr === addDays(todayStr, 1)) return 'Amanhã';
  if (dateStr === addDays(todayStr, -1)) return 'Ontem';
  const [, m, d] = dateStr.split('-').map(Number);
  const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  return `${d} ${months[(m || 1) - 1]}`;
}
