import test from 'node:test';
import assert from 'node:assert/strict';
import { generateIcsCalendar, parseIcsCalendar } from './ics';
import type { Task } from '../types';

test('generateIcsCalendar and parseIcsCalendar round-trip task schedule, priority, and reminder', () => {
  const original: Task[] = [
    {
      id: 't_ics_1',
      userId: 'u1',
      title: 'Reunião de alinhamento, trimestre Q4',
      description: 'Revisar metas; atualizar cronograma',
      priority: 'high',
      category: 'work',
      status: 'pending',
      dueDate: '2026-11-25',
      scheduledTime: '10:30',
      durationMinutes: 60,
      reminderMinutesBefore: 30,
      createdAt: '2026-11-24T10:00:00.000Z',
      updatedAt: '2026-11-24T10:00:00.000Z',
    },
  ];

  const ics = generateIcsCalendar(original);
  assert.ok(ics.includes('BEGIN:VCALENDAR'));
  assert.ok(ics.includes('TRIGGER:-PT30M'));

  const parsed = parseIcsCalendar(ics, 'u1');
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].title, 'Reunião de alinhamento, trimestre Q4');
  assert.equal(parsed[0].description, 'Revisar metas; atualizar cronograma');
  assert.equal(parsed[0].dueDate, '2026-11-25');
  assert.equal(parsed[0].scheduledTime, '10:30');
  assert.equal(parsed[0].durationMinutes, 60);
  assert.equal(parsed[0].reminderMinutesBefore, 30);
  assert.equal(parsed[0].priority, 'high');
});
