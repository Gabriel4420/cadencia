import type {
  Achievement,
  RewardItem,
  Task,
  TaskPriority,
  UserGamificationProfile,
} from '../types';
import { getLocalDateStr } from './productivity';

export interface LevelInfo {
  level: number;
  title: string;
  currentXp: number;
  levelFloorXp: number;
  nextLevelXp: number;
  progressPct: number;
  xpToNext: number;
}

const LEVEL_THRESHOLDS = [0, 100, 250, 450, 700, 1050, 1500, 2050, 2700, 3500, 4500];

const LEVEL_TITLES = [
  'Iniciante Focado',
  'Ritmo Constante',
  'Planejador Ágil',
  'Estrategista Diário',
  'Arquiteto do Tempo',
  'Especialista em Fluxo',
  'Guardião da Cadência',
  'Líder de Alta Performance',
  'Visionário Disciplinado',
  'Mestre da Cadência',
];

export function calculateLevelInfo(xp: number): LevelInfo {
  const safeXp = Math.max(0, Math.floor(xp));
  let levelIndex = 0;
  for (let i = 0; i < LEVEL_THRESHOLDS.length - 1; i++) {
    if (safeXp >= LEVEL_THRESHOLDS[i]) {
      levelIndex = i;
    }
  }
  const level = levelIndex + 1;
  const levelFloorXp = LEVEL_THRESHOLDS[levelIndex];
  const nextLevelXp = LEVEL_THRESHOLDS[Math.min(levelIndex + 1, LEVEL_THRESHOLDS.length - 1)];
  const span = Math.max(1, nextLevelXp - levelFloorXp);
  const progressPct =
    level >= LEVEL_TITLES.length
      ? 100
      : Math.min(100, Math.round(((safeXp - levelFloorXp) / span) * 100));

  return {
    level,
    title: LEVEL_TITLES[Math.min(levelIndex, LEVEL_TITLES.length - 1)],
    currentXp: safeXp,
    levelFloorXp,
    nextLevelXp,
    progressPct,
    xpToNext: Math.max(0, nextLevelXp - safeXp),
  };
}

const BASE_XP_BY_PRIORITY: Record<TaskPriority, number> = {
  low: 15,
  medium: 30,
  high: 50,
};

const BASE_COINS_BY_PRIORITY: Record<TaskPriority, number> = {
  low: 8,
  medium: 15,
  high: 25,
};

export interface TaskCompletionReward {
  xp: number;
  coins: number;
  onTimeBonus: boolean;
}

export function calculateTaskReward(task: Task, now: Date = new Date()): TaskCompletionReward {
  const todayStr = getLocalDateStr(now);
  const onTimeBonus = todayStr <= task.dueDate;
  const xp = BASE_XP_BY_PRIORITY[task.priority] + (onTimeBonus ? 15 : 0);
  const coins = BASE_COINS_BY_PRIORITY[task.priority] + (onTimeBonus ? 5 : 0);
  return { xp, coins, onTimeBonus };
}

export const FOCUS_SESSION_XP = 25;
export const FOCUS_SESSION_COINS = 15;

export const REWARDS_CATALOG: RewardItem[] = [
  {
    id: 'accent_emerald',
    title: 'Paleta Esmeralda Botânica',
    description: 'Destaque visual em verde esmeralda para foco calmo e equilibrado.',
    cost: 60,
    type: 'accent',
    accentValue: 'emerald',
  },
  {
    id: 'accent_amber',
    title: 'Paleta Âmbar Solar',
    description: 'Realce quente em âmbar dourado para sessões de alta energia.',
    cost: 80,
    type: 'accent',
    accentValue: 'amber',
  },
  {
    id: 'accent_slate',
    title: 'Paleta Ardósia Monocromática',
    description: 'Estética ultra-minimalista em grafite neutro sem distrações.',
    cost: 100,
    type: 'accent',
    accentValue: 'slate',
  },
  {
    id: 'streak_freeze',
    title: 'Escudo de Sequência',
    description: 'Protege sua sequência diária automaticamente em um dia de pausa.',
    cost: 50,
    type: 'consumable',
  },
  {
    id: 'zen_chime',
    title: 'Sino Harmônico de Foco',
    description: 'Desbloqueia o alerta sonoro suave ao concluir blocos de foco.',
    cost: 45,
    type: 'audio',
  },
];

export function redeemReward(
  profile: UserGamificationProfile,
  rewardId: string
): { profile: UserGamificationProfile; redeemed: boolean; reason?: string } {
  const reward = REWARDS_CATALOG.find((r) => r.id === rewardId);
  if (!reward) {
    return { profile, redeemed: false, reason: 'Recompensa não encontrada.' };
  }

  const alreadyUnlocked = profile.unlockedRewardIds.includes(reward.id);
  if (reward.type !== 'consumable' && alreadyUnlocked) {
    return { profile, redeemed: false, reason: 'Recompensa já desbloqueada.' };
  }

  if (profile.coins < reward.cost) {
    return { profile, redeemed: false, reason: 'Moedas de foco insuficientes.' };
  }

  const updatedUnlocked = alreadyUnlocked
    ? profile.unlockedRewardIds
    : [...profile.unlockedRewardIds, reward.id];

  const nextProfile: UserGamificationProfile = {
    ...profile,
    coins: profile.coins - reward.cost,
    streakFreezes:
      reward.id === 'streak_freeze' ? profile.streakFreezes + 1 : profile.streakFreezes,
    unlockedRewardIds: updatedUnlocked,
    activeAccent: reward.accentValue ? reward.accentValue : profile.activeAccent,
    updatedAt: new Date().toISOString(),
  };

  return { profile: nextProfile, redeemed: true };
}

export function evaluateAchievements(
  tasks: Task[],
  profile: UserGamificationProfile,
  calendarSyncedCount: number
): Achievement[] {
  const completed = tasks.filter((t) => t.status === 'completed');
  const highPriorityCompleted = completed.filter((t) => t.priority === 'high').length;
  const onTimeCompleted = completed.filter((t) => {
    const doneDay = t.completedAt ? t.completedAt.slice(0, 10) : t.dueDate;
    return doneDay <= t.dueDate;
  }).length;
  const earlyBirdCount = completed.filter(
    (t) => t.scheduledTime && t.scheduledTime < '10:00'
  ).length;
  const scheduledWithReminder = tasks.filter(
    (t) => Boolean(t.scheduledTime) && t.reminderMinutesBefore > 0
  ).length;
  const categoriesCovered = new Set(completed.map((t) => t.category)).size;
  const todayStr = getLocalDateStr();
  const completedToday = completed.filter((t) => {
    const doneDay = t.completedAt ? t.completedAt.slice(0, 10) : t.dueDate;
    return doneDay === todayStr;
  }).length;

  const definitions: Omit<Achievement, 'unlocked'>[] = [
    {
      id: 'first_step',
      title: 'Primeiro Passo',
      description: 'Conclua sua primeira atividade registrada no Cadência.',
      xpBonus: 30,
      coinsBonus: 15,
      current: Math.min(1, completed.length),
      target: 1,
      iconName: 'flag',
    },
    {
      id: 'priority_master',
      title: 'Mestre da Prioridade',
      description: 'Finalize 5 tarefas classificadas como Alta prioridade.',
      xpBonus: 80,
      coinsBonus: 40,
      current: Math.min(5, highPriorityCompleted),
      target: 5,
      iconName: 'target',
    },
    {
      id: 'streak_3',
      title: 'Cadência de 3 Dias',
      description: 'Mantenha uma sequência ativa por 3 dias consecutivos.',
      xpBonus: 60,
      coinsBonus: 30,
      current: Math.min(3, profile.streakDays),
      target: 3,
      iconName: 'flame',
    },
    {
      id: 'streak_7',
      title: 'Semana Imparável',
      description: 'Atinja 7 dias seguidos mantendo sua rotina produtiva.',
      xpBonus: 150,
      coinsBonus: 75,
      current: Math.min(7, profile.streakDays),
      target: 7,
      iconName: 'zap',
    },
    {
      id: 'punctual_pro',
      title: 'Pontualidade Cirúrgica',
      description: 'Entregue 8 atividades dentro do prazo programado.',
      xpBonus: 90,
      coinsBonus: 45,
      current: Math.min(8, onTimeCompleted),
      target: 8,
      iconName: 'clock',
    },
    {
      id: 'deep_focus',
      title: 'Foco Profundo',
      description: 'Acumule 180 minutos em sessões de foco cronometradas.',
      xpBonus: 100,
      coinsBonus: 50,
      current: Math.min(180, profile.focusMinutesTotal),
      target: 180,
      iconName: 'award',
    },
    {
      id: 'daily_goal_hit',
      title: 'Meta Diária Cumprida',
      description: `Conclua pelo menos ${profile.dailyGoal} atividades no mesmo dia.`,
      xpBonus: 70,
      coinsBonus: 35,
      current: Math.min(profile.dailyGoal, completedToday),
      target: profile.dailyGoal,
      iconName: 'trophy',
    },
    {
      id: 'early_bird',
      title: 'Ritmo Matinal',
      description: 'Conclua 3 atividades agendadas antes das 10h00.',
      xpBonus: 65,
      coinsBonus: 30,
      current: Math.min(3, earlyBirdCount),
      target: 3,
      iconName: 'sun',
    },
    {
      id: 'balanced_life',
      title: 'Equilíbrio Total',
      description: 'Conclua tarefas nas 4 categorias (Trabalho, Estudos, Saúde e Pessoal).',
      xpBonus: 85,
      coinsBonus: 40,
      current: Math.min(4, categoriesCovered),
      target: 4,
      iconName: 'layers',
    },
    {
      id: 'calendar_pro',
      title: 'Agenda Sincronizada',
      description: 'Agende 5 tarefas com lembretes automáticos ou sincronize com calendário.',
      xpBonus: 75,
      coinsBonus: 35,
      current: Math.min(5, scheduledWithReminder + calendarSyncedCount),
      target: 5,
      iconName: 'calendar',
    },
  ];

  return definitions.map((a) => ({
    ...a,
    unlocked: a.current >= a.target,
  }));
}
