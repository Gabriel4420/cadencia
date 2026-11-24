export type TaskPriority = 'high' | 'medium' | 'low';
export type BuiltInTaskCategory = 'work' | 'personal' | 'study' | 'health';
export type TaskCategory = string;
export type TaskStatus = 'pending' | 'completed';
export type AppSection = 'today' | 'tasks' | 'calendar' | 'analytics' | 'achievements';
export type AccentTheme = 'cobalt' | 'emerald' | 'amber' | 'slate';
export type SortMode = 'smart' | 'time' | 'dueDate' | 'priority';

export interface Task {
  id: string;
  userId: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  category: TaskCategory;
  status: TaskStatus;
  dueDate: string; // YYYY-MM-DD
  scheduledTime?: string; // HH:mm
  durationMinutes: number;
  reminderMinutesBefore: number; // 0 = no reminder, else minutes before scheduledTime
  calendarEventId?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskDraft {
  title: string;
  description: string;
  priority: TaskPriority;
  category: TaskCategory;
  dueDate: string;
  scheduledTime: string;
  durationMinutes: number;
  reminderMinutesBefore: number;
}

export interface UserGamificationProfile {
  userId: string;
  xp: number;
  coins: number;
  streakDays: number;
  streakFreezes: number;
  dailyGoal: number;
  focusMinutesTotal: number;
  lastActiveDate?: string;
  unlockedRewardIds: string[];
  activeAccent: AccentTheme;
  customCategories?: string[];
  updatedAt: string;
}

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  startDate: string; // YYYY-MM-DD
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  durationMinutes: number;
  htmlLink?: string;
  source: 'google';
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  xpBonus: number;
  coinsBonus: number;
  current: number;
  target: number;
  unlocked: boolean;
  iconName: 'flag' | 'flame' | 'clock' | 'target' | 'calendar' | 'award' | 'zap' | 'sun' | 'layers' | 'trophy';
}

export interface RewardItem {
  id: string;
  title: string;
  description: string;
  cost: number;
  type: 'accent' | 'consumable' | 'audio';
  accentValue?: AccentTheme;
}

export interface NotificationPreferences {
  enabled: boolean;
  soundEnabled: boolean;
  defaultLeadMinutes: number;
}

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  tone: 'info' | 'success' | 'warning' | 'reward';
}

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  high: 'Alta',
  medium: 'Média',
  low: 'Baixa',
};

export const BUILT_IN_CATEGORY_IDS: BuiltInTaskCategory[] = ['work', 'study', 'health', 'personal'];

export const CATEGORY_LABELS: Record<BuiltInTaskCategory, string> = {
  work: 'Trabalho',
  personal: 'Pessoal',
  study: 'Estudos',
  health: 'Saúde',
};

export const REMINDER_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: 'Sem lembrete' },
  { value: 5, label: '5 min antes' },
  { value: 15, label: '15 min antes' },
  { value: 30, label: '30 min antes' },
  { value: 60, label: '1 hora antes' },
];
