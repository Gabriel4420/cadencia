import type { GoogleCalendarEvent, Task } from '../types';
import { getLocalDateStr } from '../utils/productivity';

interface RawGoogleEvent {
  id: string;
  summary?: string;
  description?: string;
  htmlLink?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
}

export async function fetchGoogleCalendarEvents(
  accessToken: string,
  timeMinIso: string,
  timeMaxIso: string
): Promise<GoogleCalendarEvent[]> {
  const params = new URLSearchParams({
    timeMin: timeMinIso,
    timeMax: timeMaxIso,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '100',
  });

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Erro ao carregar Google Calendar (${response.status}): ${errBody.slice(0, 120)}`);
  }

  const data = (await response.json()) as { items?: RawGoogleEvent[] };
  const items = data.items ?? [];

  return items.map((ev) => {
    const startRaw = ev.start?.dateTime || ev.start?.date || new Date().toISOString();
    const endRaw = ev.end?.dateTime || ev.end?.date || startRaw;

    if (ev.start?.dateTime) {
      const startDt = new Date(startRaw);
      const endDt = new Date(endRaw);
      const startDate = getLocalDateStr(startDt);
      const startTime = `${String(startDt.getHours()).padStart(2, '0')}:${String(startDt.getMinutes()).padStart(2, '0')}`;
      const endTime = `${String(endDt.getHours()).padStart(2, '0')}:${String(endDt.getMinutes()).padStart(2, '0')}`;
      const durationMinutes = Math.max(
        15,
        Math.min(480, Math.round((endDt.getTime() - startDt.getTime()) / 60000))
      );
      return {
        id: ev.id,
        summary: ev.summary || 'Compromisso sem título',
        description: ev.description,
        startDate,
        startTime,
        endTime,
        durationMinutes,
        htmlLink: ev.htmlLink,
        source: 'google' as const,
      };
    }

    return {
      id: ev.id,
      summary: ev.summary || 'Evento o dia todo',
      description: ev.description,
      startDate: startRaw.slice(0, 10),
      durationMinutes: 60,
      htmlLink: ev.htmlLink,
      source: 'google' as const,
    };
  });
}

export async function pushTaskToGoogleCalendar(
  accessToken: string,
  task: Task
): Promise<{ id: string; htmlLink?: string }> {
  const [y, m, d] = task.dueDate.split('-').map(Number);
  const [hh, mm] = (task.scheduledTime || '09:00').split(':').map(Number);
  const startDt = new Date(y, (m || 1) - 1, d || 1, hh || 9, mm || 0, 0, 0);
  const endDt = new Date(startDt.getTime() + (task.durationMinutes || 30) * 60000);
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo';

  const body = {
    summary: task.title,
    description: task.description
      ? `${task.description}\n\nSincronizado pelo Cadência.`
      : 'Sincronizado pelo Cadência.',
    start: {
      dateTime: startDt.toISOString(),
      timeZone,
    },
    end: {
      dateTime: endDt.toISOString(),
      timeZone,
    },
    reminders: {
      useDefault: false,
      overrides:
        task.reminderMinutesBefore > 0
          ? [{ method: 'popup', minutes: task.reminderMinutesBefore }]
          : [],
    },
  };

  const response = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Falha ao enviar evento para Google Calendar (${response.status}): ${errBody.slice(0, 120)}`);
  }

  const created = (await response.json()) as { id: string; htmlLink?: string };
  return { id: created.id, htmlLink: created.htmlLink };
}
