import type { Task, TaskPriority } from '../types';

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

function unescapeIcsText(text: string): string {
  return text
    .replace(/\\n/g, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
}

function formatIcsLocalDateTime(dateStr: string, timeStr: string, addMinutes = 0): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = timeStr.split(':').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1, hh || 9, (mm || 0) + addMinutes, 0, 0);
  return `${dt.getFullYear()}${pad2(dt.getMonth() + 1)}${pad2(dt.getDate())}T${pad2(dt.getHours())}${pad2(dt.getMinutes())}00`;
}

function priorityToIcs(priority: TaskPriority): number {
  if (priority === 'high') return 1;
  if (priority === 'medium') return 5;
  return 9;
}

function icsToPriority(val: string | undefined): TaskPriority {
  const n = Number(val);
  if (n >= 1 && n <= 3) return 'high';
  if (n >= 4 && n <= 6) return 'medium';
  return 'low';
}

export function generateIcsCalendar(tasks: Task[]): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Cadencia//Produtividade//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

  for (const task of tasks) {
    const startTime = task.scheduledTime || '09:00';
    const dtStart = formatIcsLocalDateTime(task.dueDate, startTime, 0);
    const dtEnd = formatIcsLocalDateTime(task.dueDate, startTime, task.durationMinutes || 30);

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${task.id}@cadencia.app`);
    lines.push(`DTSTAMP:${stamp}`);
    lines.push(`DTSTART:${dtStart}`);
    lines.push(`DTEND:${dtEnd}`);
    lines.push(`SUMMARY:${escapeIcsText(task.title)}`);
    if (task.description) {
      lines.push(`DESCRIPTION:${escapeIcsText(task.description)}`);
    }
    lines.push(`PRIORITY:${priorityToIcs(task.priority)}`);
    lines.push(`STATUS:${task.status === 'completed' ? 'COMPLETED' : 'CONFIRMED'}`);

    if (task.reminderMinutesBefore > 0) {
      lines.push('BEGIN:VALARM');
      lines.push(`TRIGGER:-PT${task.reminderMinutesBefore}M`);
      lines.push('ACTION:DISPLAY');
      lines.push(`DESCRIPTION:${escapeIcsText(`Lembrete: ${task.title}`)}`);
      lines.push('END:VALARM');
    }

    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export function parseIcsCalendar(icsContent: string, userId: string): Task[] {
  const unfolded = icsContent.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
  const eventBlocks = unfolded.split('BEGIN:VEVENT').slice(1);
  const imported: Task[] = [];
  const nowIso = new Date().toISOString();

  for (let idx = 0; idx < eventBlocks.length; idx++) {
    const block = eventBlocks[idx].split('END:VEVENT')[0];
    const rawLines = block.split(/\r?\n/);
    const map: Record<string, string> = {};

    for (const line of rawLines) {
      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;
      const key = line.slice(0, colonIdx).split(';')[0].trim().toUpperCase();
      const value = line.slice(colonIdx + 1).trim();
      if (!map[key]) {
        map[key] = value;
      }
    }

    if (!map.SUMMARY) continue;

    const dtStartRaw = map.DTSTART || '';
    const dateMatch = dtStartRaw.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2}))?/);
    if (!dateMatch) continue;

    const dueDate = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
    const scheduledTime =
      dateMatch[4] && dateMatch[5] ? `${dateMatch[4]}:${dateMatch[5]}` : '09:00';

    let durationMinutes = 45;
    if (map.DTEND) {
      const endMatch = map.DTEND.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})/);
      if (endMatch && dateMatch[4] && dateMatch[5]) {
        const startDt = new Date(
          Number(dateMatch[1]),
          Number(dateMatch[2]) - 1,
          Number(dateMatch[3]),
          Number(dateMatch[4]),
          Number(dateMatch[5])
        );
        const endDt = new Date(
          Number(endMatch[1]),
          Number(endMatch[2]) - 1,
          Number(endMatch[3]),
          Number(endMatch[4]),
          Number(endMatch[5])
        );
        const mins = Math.round((endDt.getTime() - startDt.getTime()) / 60000);
        if (mins >= 5 && mins <= 480) {
          durationMinutes = mins;
        }
      }
    }

    const triggerMatch = block.match(/TRIGGER:-PT(\d+)M/i);
    const reminderMinutesBefore = triggerMatch ? Number(triggerMatch[1]) : 15;

    imported.push({
      id: `ics_${Date.now()}_${idx}`,
      userId,
      title: unescapeIcsText(map.SUMMARY).slice(0, 140),
      description: map.DESCRIPTION ? unescapeIcsText(map.DESCRIPTION).slice(0, 600) : '',
      priority: icsToPriority(map.PRIORITY),
      category: 'work',
      status: map.STATUS === 'COMPLETED' ? 'completed' : 'pending',
      dueDate,
      scheduledTime,
      durationMinutes,
      reminderMinutesBefore,
      createdAt: nowIso,
      updatedAt: nowIso,
    });
  }

  return imported;
}
