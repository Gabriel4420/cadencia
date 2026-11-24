import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculatePriorityScore,
  computeAnalytics,
  getDueReminders,
  isTaskOverdue,
  sortTasks,
} from './productivity';
import type { Task } from '../types';

function makeTask(overrides: Partial<Task>): Task {
  return {
    id: 't1',
    userId: 'u1',
    title: 'Tarefa de teste',
    priority: 'medium',
    category: 'work',
    status: 'pending',
    dueDate: '2026-11-24',
    scheduledTime: '14:00',
    durationMinutes: 30,
    reminderMinutesBefore: 15,
    createdAt: '2026-11-24T08:00:00.000Z',
    updatedAt: '2026-11-24T08:00:00.000Z',
    ...overrides,
  };
}

test('isTaskOverdue detects past dates and past times today accurately', () => {
  const now = new Date(2026, 10, 24, 15, 0, 0); // 2026-11-24 15:00
  assert.equal(isTaskOverdue(makeTask({ dueDate: '2026-11-23' }), now), true);
  assert.equal(isTaskOverdue(makeTask({ dueDate: '2026-11-24', scheduledTime: '14:00' }), now), true);
  assert.equal(isTaskOverdue(makeTask({ dueDate: '2026-11-24', scheduledTime: '16:30' }), now), false);
  assert.equal(isTaskOverdue(makeTask({ dueDate: '2026-11-23', status: 'completed' }), now), false);
});

test('smart sorting ranks overdue high priority above future low priority and completed last', () => {
  const now = new Date(2026, 10, 24, 14, 0, 0);
  const lowFuture = makeTask({ id: 'low', priority: 'low', dueDate: '2026-11-28', scheduledTime: '10:00' });
  const highSoon = makeTask({ id: 'high_soon', priority: 'high', dueDate: '2026-11-24', scheduledTime: '14:45' });
  const highOverdue = makeTask({ id: 'high_overdue', priority: 'high', dueDate: '2026-11-23', scheduledTime: '09:00' });
  const done = makeTask({ id: 'done', priority: 'high', status: 'completed', dueDate: '2026-11-24' });

  assert.ok(calculatePriorityScore(highOverdue, now) > calculatePriorityScore(lowFuture, now));
  const sorted = sortTasks([done, lowFuture, highSoon, highOverdue], 'smart', now);
  assert.deepEqual(
    sorted.map((t) => t.id),
    ['high_soon', 'high_overdue', 'low', 'done']
  );
});

test('getDueReminders triggers inside lead time window and respects already notified set', () => {
  const now = new Date(2026, 10, 24, 13, 50, 0); // 10 min before 14:00
  const taskSoon = makeTask({ id: 'soon', dueDate: '2026-11-24', scheduledTime: '14:00', reminderMinutesBefore: 15 });
  const taskFar = makeTask({ id: 'far', dueDate: '2026-11-24', scheduledTime: '18:00', reminderMinutesBefore: 15 });
  const taskNoRem = makeTask({ id: 'norem', dueDate: '2026-11-24', scheduledTime: '14:00', reminderMinutesBefore: 0 });

  const notified = new Set<string>();
  const due1 = getDueReminders([taskSoon, taskFar, taskNoRem], now, notified);
  assert.equal(due1.length, 1);
  assert.equal(due1[0].task.id, 'soon');
  assert.equal(due1[0].minutesUntilStart, 10);

  notified.add(due1[0].reminderKey);
  const due2 = getDueReminders([taskSoon, taskFar, taskNoRem], now, notified);
  assert.equal(due2.length, 0);
});

test('computeAnalytics calculates completion rates and 28-day heatmap', () => {
  const now = new Date(2026, 10, 24, 12, 0, 0);
  const tasks = [
    makeTask({ id: '1', status: 'completed', dueDate: '2026-11-24', completedAt: '2026-11-24T10:00:00.000Z', category: 'work' }),
    makeTask({ id: '2', status: 'pending', dueDate: '2026-11-24', category: 'study' }),
  ];
  const summary = computeAnalytics(tasks, 7, now);
  assert.equal(summary.completionRate, 50);
  assert.equal(summary.completedToday, 1);
  assert.equal(summary.pendingToday, 1);
  assert.equal(summary.dailySeries.length, 7);
  assert.equal(summary.heatmap28Days.length, 28);
});
