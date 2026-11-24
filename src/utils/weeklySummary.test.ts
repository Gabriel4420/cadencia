import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildWeeklySummaryReport,
  formatWeeklySummaryAsJson,
  formatWeeklySummaryAsText,
} from './weeklySummary';
import type { Task, UserGamificationProfile } from '../types';

function makeProfile(overrides: Partial<UserGamificationProfile> = {}): UserGamificationProfile {
  return {
    userId: 'u1',
    xp: 180,
    coins: 75,
    streakDays: 4,
    streakFreezes: 1,
    dailyGoal: 4,
    focusMinutesTotal: 120,
    unlockedRewardIds: [],
    activeAccent: 'cobalt',
    updatedAt: '2026-11-24T12:00:00.000Z',
    ...overrides,
  };
}

function makeTask(overrides: Partial<Task>): Task {
  return {
    id: 't1',
    userId: 'u1',
    title: 'Tarefa teste',
    priority: 'medium',
    category: 'work',
    status: 'completed',
    dueDate: '2026-11-24',
    scheduledTime: '10:00',
    durationMinutes: 45,
    reminderMinutesBefore: 15,
    completedAt: '2026-11-24T10:30:00.000Z',
    createdAt: '2026-11-23T08:00:00.000Z',
    updatedAt: '2026-11-24T10:30:00.000Z',
    ...overrides,
  };
}

test('buildWeeklySummaryReport filters last 7 days completed tasks and calculates weekly metrics', () => {
  const now = new Date(2026, 10, 24, 15, 0, 0); // 2026-11-24 -> window 2026-11-18..2026-11-24
  const tasks: Task[] = [
    makeTask({
      id: 'in-week-on-time',
      title: 'Finalizar relatório trimestral',
      priority: 'high',
      category: 'work',
      dueDate: '2026-11-24',
      completedAt: '2026-11-24T11:00:00.000Z',
      durationMinutes: 60,
    }),
    makeTask({
      id: 'in-week-late',
      title: 'Estudar arquitetura React',
      priority: 'medium',
      category: 'study',
      dueDate: '2026-11-20',
      completedAt: '2026-11-22T09:00:00.000Z',
      durationMinutes: 30,
    }),
    makeTask({
      id: 'too-old',
      title: 'Tarefa de duas semanas atrás',
      dueDate: '2026-11-10',
      completedAt: '2026-11-10T10:00:00.000Z',
      durationMinutes: 50,
    }),
    makeTask({
      id: 'pending-in-week',
      title: 'Agendar consulta',
      status: 'pending',
      category: 'health',
      dueDate: '2026-11-24',
      completedAt: undefined,
      durationMinutes: 20,
    }),
  ];

  const report = buildWeeklySummaryReport(tasks, makeProfile(), now);

  assert.equal(report.period.startDate, '2026-11-18');
  assert.equal(report.period.endDate, '2026-11-24');
  assert.equal(report.metrics.completedCount, 2);
  assert.equal(report.metrics.plannedCount, 3);
  assert.equal(report.metrics.weeklyCompletionRate, 67);
  assert.equal(report.metrics.onTimeRate, 50);
  assert.equal(report.metrics.totalCompletedDurationMinutes, 90);
  assert.equal(report.dailyBreakdown.length, 7);
  assert.deepEqual(
    report.completedActivities.map((a) => a.id),
    ['in-week-on-time', 'in-week-late']
  );
  assert.equal(report.completedActivities[0].onTime, true);
  assert.equal(report.completedActivities[1].onTime, false);
  assert.equal(report.profile.level, 2);
});

test('buildWeeklySummaryReport and formatters handle an empty week cleanly', () => {
  const now = new Date(2026, 10, 24, 15, 0, 0);
  const report = buildWeeklySummaryReport([], makeProfile({ xp: 0, coins: 0, streakDays: 0, focusMinutesTotal: 0 }), now);

  assert.equal(report.metrics.completedCount, 0);
  assert.equal(report.metrics.onTimeRate, null);
  assert.equal(report.metrics.mostProductiveDay, null);
  assert.equal(report.completedActivities.length, 0);

  const text = formatWeeklySummaryAsText(report);
  assert.match(text, /Nenhuma atividade concluída nos últimos 7 dias\./);
  assert.match(text, /Pontualidade nas entregas: —/);

  const parsed = JSON.parse(formatWeeklySummaryAsJson(report));
  assert.equal(parsed.period.days, 7);
  assert.equal(parsed.metrics.completedCount, 0);
  assert.deepEqual(parsed.completedActivities, []);
});

test('formatWeeklySummaryAsText and JSON contain activity details and metrics', () => {
  const now = new Date(2026, 10, 24, 15, 0, 0);
  const tasks = [
    makeTask({
      id: 'a1',
      title: 'Revisar deploy de produção',
      priority: 'high',
      category: 'work',
      dueDate: '2026-11-24',
      scheduledTime: '14:00',
      durationMinutes: 45,
      completedAt: '2026-11-24T14:20:00.000Z',
    }),
  ];

  const report = buildWeeklySummaryReport(tasks, makeProfile(), now);
  const text = formatWeeklySummaryAsText(report);
  assert.match(text, /Revisar deploy de produção/);
  assert.match(text, /Trabalho/);
  assert.match(text, /Prioridade Alta/);
  assert.match(text, /45 min/);
  assert.match(text, /No prazo/);

  const parsed = JSON.parse(formatWeeklySummaryAsJson(report));
  assert.equal(parsed.completedActivities.length, 1);
  assert.equal(parsed.completedActivities[0].title, 'Revisar deploy de produção');
  assert.equal(parsed.metrics.onTimeRate, 100);
});
