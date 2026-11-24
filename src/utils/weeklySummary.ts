import {
  PRIORITY_LABELS,
  type Task,
  type TaskCategory,
  type TaskPriority,
  type UserGamificationProfile,
} from '../types';
import { getAllCategoryOptions, getCategoryLabel } from './categories';
import { calculateLevelInfo } from './gamification';
import { addDays, getLocalDateStr } from './productivity';

export interface WeeklyCompletedActivity {
  id: string;
  title: string;
  category: TaskCategory;
  categoryLabel: string;
  priority: TaskPriority;
  priorityLabel: string;
  dueDate: string;
  completedDate: string;
  scheduledTime: string | null;
  durationMinutes: number;
  onTime: boolean;
}

export interface WeeklyDailyPoint {
  date: string;
  weekdayLabel: string;
  completed: number;
  planned: number;
  durationMinutes: number;
}

export interface WeeklyCategorySummary {
  category: TaskCategory;
  label: string;
  completed: number;
  durationMinutes: number;
}

export interface WeeklyPrioritySummary {
  priority: TaskPriority;
  label: string;
  completed: number;
}

export interface WeeklySummaryReport {
  generatedAt: string;
  period: {
    startDate: string;
    endDate: string;
    days: 7;
  };
  metrics: {
    completedCount: number;
    plannedCount: number;
    weeklyCompletionRate: number;
    overallCompletionRate: number;
    onTimeRate: number | null;
    totalCompletedDurationMinutes: number;
    averageDailyCompleted: number;
    mostProductiveDay: {
      date: string;
      weekdayLabel: string;
      completed: number;
    } | null;
  };
  profile: {
    level: number;
    levelTitle: string;
    xp: number;
    coins: number;
    streakDays: number;
    dailyGoal: number;
    focusMinutesTotal: number;
  };
  dailyBreakdown: WeeklyDailyPoint[];
  categoryBreakdown: WeeklyCategorySummary[];
  priorityBreakdown: WeeklyPrioritySummary[];
  completedActivities: WeeklyCompletedActivity[];
}

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function formatIsoDatePtBr(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  if (!y || !m || !d) return dateStr;
  return `${d}/${m}/${y}`;
}

export function formatDurationPtBr(totalMinutes: number): string {
  const safe = Math.max(0, Math.round(totalMinutes));
  if (safe < 60) return `${safe} min`;
  const hours = Math.floor(safe / 60);
  const mins = safe % 60;
  return mins === 0 ? `${hours}h` : `${hours}h ${mins}min`;
}

/**
 * Resolves the local completion date (YYYY-MM-DD) of a completed task.
 */
function resolveCompletedDate(task: Task): string {
  if (task.completedAt) {
    const parsed = new Date(task.completedAt);
    if (!Number.isNaN(parsed.getTime())) {
      // Preserve explicit date prefix when string is ISO UTC midnight/date-like or local date
      return task.completedAt.slice(0, 10);
    }
  }
  return task.dueDate;
}

export function buildWeeklySummaryReport(
  tasks: Task[],
  profile: UserGamificationProfile,
  now: Date = new Date()
): WeeklySummaryReport {
  const endDate = getLocalDateStr(now);
  const startDate = addDays(endDate, -6);

  const completedTasksAll = tasks.filter((t) => t.status === 'completed');
  const overallCompletionRate =
    tasks.length === 0 ? 0 : Math.round((completedTasksAll.length / tasks.length) * 100);

  const weeklyCompletedRaw = completedTasksAll
    .map((task) => ({
      task,
      completedDate: resolveCompletedDate(task),
    }))
    .filter(({ completedDate }) => completedDate >= startDate && completedDate <= endDate);

  const plannedInPeriod = tasks.filter((t) => t.dueDate >= startDate && t.dueDate <= endDate);

  const completedActivities: WeeklyCompletedActivity[] = weeklyCompletedRaw
    .sort((a, b) => {
      if (a.completedDate !== b.completedDate) {
        return b.completedDate.localeCompare(a.completedDate);
      }
      const timeA = a.task.scheduledTime || '23:59';
      const timeB = b.task.scheduledTime || '23:59';
      return timeB.localeCompare(timeA);
    })
    .map(({ task, completedDate }) => ({
      id: task.id,
      title: task.title,
      category: task.category,
      categoryLabel: getCategoryLabel(task.category),
      priority: task.priority,
      priorityLabel: PRIORITY_LABELS[task.priority],
      dueDate: task.dueDate,
      completedDate,
      scheduledTime: task.scheduledTime || null,
      durationMinutes: task.durationMinutes,
      onTime: completedDate <= task.dueDate,
    }));

  const completedCount = completedActivities.length;
  const plannedCount = plannedInPeriod.length;
  const completedFromPlannedCount = plannedInPeriod.filter((t) => t.status === 'completed').length;
  const weeklyCompletionRate =
    plannedCount === 0
      ? completedCount > 0
        ? 100
        : 0
      : Math.round((completedFromPlannedCount / plannedCount) * 100);

  const onTimeCount = completedActivities.filter((a) => a.onTime).length;
  const onTimeRate =
    completedCount === 0 ? null : Math.round((onTimeCount / completedCount) * 100);

  const totalCompletedDurationMinutes = completedActivities.reduce(
    (sum, a) => sum + a.durationMinutes,
    0
  );

  const dailyBreakdown: WeeklyDailyPoint[] = [];
  for (let offset = 6; offset >= 0; offset--) {
    const date = addDays(endDate, -offset);
    const [y, m, d] = date.split('-').map(Number);
    const dt = new Date(y, (m || 1) - 1, d || 1);
    const dayCompleted = completedActivities.filter((a) => a.completedDate === date);
    const dayPlanned = tasks.filter((t) => t.dueDate === date);
    dailyBreakdown.push({
      date,
      weekdayLabel: WEEKDAY_LABELS[dt.getDay()],
      completed: dayCompleted.length,
      planned: dayPlanned.length,
      durationMinutes: dayCompleted.reduce((sum, a) => sum + a.durationMinutes, 0),
    });
  }

  let mostProductiveDay: WeeklySummaryReport['metrics']['mostProductiveDay'] = null;
  for (const day of dailyBreakdown) {
    if (day.completed > 0 && (!mostProductiveDay || day.completed >= mostProductiveDay.completed)) {
      mostProductiveDay = {
        date: day.date,
        weekdayLabel: day.weekdayLabel,
        completed: day.completed,
      };
    }
  }

  const categoryOptions = getAllCategoryOptions(profile.customCategories || [], tasks);
  const categoryBreakdown: WeeklyCategorySummary[] = categoryOptions.map((opt) => {
    const items = completedActivities.filter((a) => a.category === opt.id);
    return {
      category: opt.id,
      label: opt.label,
      completed: items.length,
      durationMinutes: items.reduce((sum, a) => sum + a.durationMinutes, 0),
    };
  });

  const priorities: TaskPriority[] = ['high', 'medium', 'low'];
  const priorityBreakdown: WeeklyPrioritySummary[] = priorities.map((priority) => ({
    priority,
    label: PRIORITY_LABELS[priority],
    completed: completedActivities.filter((a) => a.priority === priority).length,
  }));

  const levelInfo = calculateLevelInfo(profile.xp);

  return {
    generatedAt: now.toISOString(),
    period: {
      startDate,
      endDate,
      days: 7,
    },
    metrics: {
      completedCount,
      plannedCount,
      weeklyCompletionRate,
      overallCompletionRate,
      onTimeRate,
      totalCompletedDurationMinutes,
      averageDailyCompleted: Number((completedCount / 7).toFixed(1)),
      mostProductiveDay,
    },
    profile: {
      level: levelInfo.level,
      levelTitle: levelInfo.title,
      xp: profile.xp,
      coins: profile.coins,
      streakDays: profile.streakDays,
      dailyGoal: profile.dailyGoal,
      focusMinutesTotal: profile.focusMinutesTotal,
    },
    dailyBreakdown,
    categoryBreakdown,
    priorityBreakdown,
    completedActivities,
  };
}

export function formatWeeklySummaryAsText(report: WeeklySummaryReport): string {
  const periodLabel = `${formatIsoDatePtBr(report.period.startDate)} a ${formatIsoDatePtBr(report.period.endDate)}`;
  const lines: string[] = [
    `CADÊNCIA — RESUMO SEMANAL (${periodLabel})`,
    '============================================================',
    '',
    'MÉTRICAS DE DESEMPENHO (ÚLTIMOS 7 DIAS)',
    `- Atividades concluídas na semana: ${report.metrics.completedCount}`,
    `- Atividades planejadas para o período: ${report.metrics.plannedCount}`,
    `- Taxa de conclusão semanal: ${report.metrics.weeklyCompletionRate}%`,
    `- Pontualidade nas entregas: ${report.metrics.onTimeRate === null ? '—' : `${report.metrics.onTimeRate}%`}`,
    `- Tempo total em atividades concluídas: ${formatDurationPtBr(report.metrics.totalCompletedDurationMinutes)}`,
    `- Média diária de entregas: ${report.metrics.averageDailyCompleted} atividade(s)/dia`,
    `- Dia mais produtivo: ${
      report.metrics.mostProductiveDay
        ? `${report.metrics.mostProductiveDay.weekdayLabel} (${formatIsoDatePtBr(report.metrics.mostProductiveDay.date)}) — ${report.metrics.mostProductiveDay.completed} concluída(s)`
        : '—'
    }`,
    `- Sequência ativa: ${report.profile.streakDays} dia(s) · Foco acumulado: ${formatDurationPtBr(report.profile.focusMinutesTotal)}`,
    `- Perfil: Nível ${report.profile.level} (${report.profile.levelTitle}) · ${report.profile.xp} XP · ${report.profile.coins} moedas`,
    '',
    'DISTRIBUIÇÃO POR CATEGORIA',
    ...report.categoryBreakdown.map(
      (c) => `- ${c.label}: ${c.completed} concluída(s) (${formatDurationPtBr(c.durationMinutes)})`
    ),
    '',
    'ATIVIDADES CONCLUÍDAS NA SEMANA',
  ];

  if (report.completedActivities.length === 0) {
    lines.push('- Nenhuma atividade concluída nos últimos 7 dias.');
  } else {
    report.completedActivities.forEach((item, index) => {
      const timeSegment = item.scheduledTime ? ` às ${item.scheduledTime}` : '';
      const punctuality = item.onTime ? 'No prazo' : 'Após o prazo';
      lines.push(
        `${index + 1}. [x] ${item.title} — ${formatIsoDatePtBr(item.completedDate)}${timeSegment} | ${item.categoryLabel} | Prioridade ${item.priorityLabel} | ${item.durationMinutes} min | ${punctuality}`
      );
    });
  }

  lines.push('');
  return lines.join('\n');
}

export function formatWeeklySummaryAsJson(report: WeeklySummaryReport): string {
  return JSON.stringify(report, null, 2);
}

export function triggerFileDownload(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
