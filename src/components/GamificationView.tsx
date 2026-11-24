import React, { useMemo } from 'react';
import {
  Award,
  Calendar,
  Check,
  Clock,
  Coins,
  Flag,
  Flame,
  Layers,
  Shield,
  Sun,
  Target,
  Trophy,
  Zap,
} from 'lucide-react';
import type { AccentTheme, Achievement, Task, UserGamificationProfile } from '../types';
import {
  calculateLevelInfo,
  evaluateAchievements,
  REWARDS_CATALOG,
} from '../utils/gamification';

interface GamificationViewProps {
  tasks: Task[];
  profile: UserGamificationProfile;
  syncedCalendarCount: number;
  onRedeemReward: (rewardId: string) => void;
  onSelectAccent: (accent: AccentTheme) => void;
  onChangeDailyGoal: (goal: number) => void;
}

const ACHIEVEMENT_ICONS: Record<Achievement['iconName'], React.ElementType> = {
  flag: Flag,
  flame: Flame,
  clock: Clock,
  target: Target,
  calendar: Calendar,
  award: Award,
  zap: Zap,
  sun: Sun,
  layers: Layers,
  trophy: Trophy,
};

export const GamificationView: React.FC<GamificationViewProps> = ({
  tasks,
  profile,
  syncedCalendarCount,
  onRedeemReward,
  onSelectAccent,
  onChangeDailyGoal,
}) => {
  const levelInfo = useMemo(() => calculateLevelInfo(profile.xp), [profile.xp]);
  const achievements = useMemo(
    () => evaluateAchievements(tasks, profile, syncedCalendarCount),
    [tasks, profile, syncedCalendarCount]
  );
  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Conquistas e recompensas
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Ganhe XP e moedas de foco ao cumprir prazos, completar sessões e manter sua cadência diária.
        </p>
      </div>

      {/* Level & Currency Hero Banner */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium accent-text">Nível {levelInfo.level}</p>
            <h2 className="mt-0.5 text-xl font-bold text-slate-900 dark:text-slate-100">
              {levelInfo.title}
            </h2>
            <div className="mt-3 max-w-md">
              <div className="flex items-center justify-between text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400 mb-1.5">
                <span>{profile.xp} XP atual</span>
                <span>
                  {levelInfo.xpToNext > 0
                    ? `Faltam ${levelInfo.xpToNext} XP para o Nível ${levelInfo.level + 1}`
                    : 'Nível máximo atingido'}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full accent-bg transition-[width] duration-300"
                  style={{ width: `${levelInfo.progressPct}%` }}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-5 border-t lg:border-t-0 lg:border-l border-slate-100 dark:border-slate-800 pt-4 lg:pt-0 lg:pl-6 shrink-0">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Moedas</p>
              <p
                data-testid="coins-balance"
                className="mt-1 flex items-center gap-1.5 font-mono text-lg font-semibold tabular-nums text-slate-900 dark:text-slate-100"
              >
                <Coins className="h-4 w-4 text-amber-500" aria-hidden="true" />
                {profile.coins}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Sequência</p>
              <p className="mt-1 flex items-center gap-1.5 font-mono text-lg font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                <Flame className="h-4 w-4 text-amber-500" aria-hidden="true" />
                {profile.streakDays}d
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Escudos</p>
              <p className="mt-1 flex items-center gap-1.5 font-mono text-lg font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                <Shield className="h-4 w-4 accent-text" aria-hidden="true" />
                {profile.streakFreezes}
              </p>
            </div>
          </div>
        </div>

        {/* Daily Goal Control */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800 pt-4">
          <div className="text-xs text-slate-600 dark:text-slate-400">
            <span className="font-medium text-slate-900 dark:text-slate-100">Meta diária:</span>{' '}
            conclua {profile.dailyGoal} atividades por dia para manter sua pontuação máxima.
          </div>
          <div className="flex items-center gap-1.5">
            {[3, 5, 7, 10].map((goal) => (
              <button
                key={goal}
                type="button"
                onClick={() => onChangeDailyGoal(goal)}
                className={`rounded-md px-2.5 py-1 text-xs font-mono tabular-nums transition-colors ${
                  profile.dailyGoal === goal
                    ? 'accent-bg text-white font-medium'
                    : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {goal}/dia
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Rewards Shop */}
      <section aria-labelledby="rewards-shop-heading" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2
              id="rewards-shop-heading"
              className="text-base font-semibold text-slate-900 dark:text-slate-100"
            >
              Recompensas resgatáveis
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Use suas moedas de foco para desbloquear paletas visuais, escudos de sequência e alertas sonoros.
            </p>
          </div>
          {profile.activeAccent !== 'cobalt' && (
            <button
              type="button"
              onClick={() => onSelectAccent('cobalt')}
              className="text-xs font-medium accent-text hover:underline"
            >
              Voltar para Cobalto padrão
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {REWARDS_CATALOG.map((reward) => {
            const isUnlocked = profile.unlockedRewardIds.includes(reward.id);
            const isEquipped =
              reward.type === 'accent' && reward.accentValue === profile.activeAccent;
            const canAfford = profile.coins >= reward.cost;

            return (
              <div
                key={reward.id}
                className="flex flex-col justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {reward.title}
                    </h3>
                    <span className="font-mono text-xs font-medium tabular-nums text-amber-600 dark:text-amber-400 shrink-0">
                      {reward.cost} moedas
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                    {reward.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                  {reward.type === 'accent' && isUnlocked ? (
                    <button
                      type="button"
                      onClick={() => reward.accentValue && onSelectAccent(reward.accentValue)}
                      disabled={isEquipped}
                      className={`w-full rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                        isEquipped
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-default'
                          : 'border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {isEquipped ? 'Aplicada atualmente' : 'Aplicar paleta'}
                    </button>
                  ) : reward.type === 'audio' && isUnlocked ? (
                    <p className="flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                      <Check className="h-3.5 w-3.5" /> Desbloqueado e ativo
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onRedeemReward(reward.id)}
                      disabled={!canAfford}
                      className={`w-full rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                        canAfford
                          ? 'accent-bg text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      {canAfford
                        ? reward.type === 'consumable'
                          ? `Comprar por ${reward.cost} moedas`
                          : `Resgatar por ${reward.cost} moedas`
                        : `Faltam ${reward.cost - profile.coins} moedas`}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Achievements Grid */}
      <section aria-labelledby="achievements-list-heading" className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2
            id="achievements-list-heading"
            className="text-base font-semibold text-slate-900 dark:text-slate-100"
          >
            Conquistas ({unlockedCount}/{achievements.length})
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Atualizadas automaticamente conforme sua rotina
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {achievements.map((ach) => {
            const Icon = ACHIEVEMENT_ICONS[ach.iconName];
            const pct = Math.min(100, Math.round((ach.current / Math.max(1, ach.target)) * 100));
            return (
              <div
                key={ach.id}
                className={`rounded-xl border p-4 transition-colors ${
                  ach.unlocked
                    ? 'border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827]'
                    : 'border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#0F172A]/60'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      ach.unlocked
                        ? 'accent-soft-bg accent-text'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {ach.title}
                      </h3>
                      <span
                        className={`text-xs font-medium shrink-0 ${
                          ach.unlocked
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {ach.unlocked ? 'Desbloqueada' : `${ach.current}/${ach.target}`}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {ach.description}
                    </p>
                    <div className="mt-2.5 flex items-center gap-3">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-800">
                        <div
                          className={`h-full rounded-full transition-[width] duration-300 ${
                            ach.unlocked ? 'bg-emerald-500' : 'accent-bg'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="font-mono text-[11px] tabular-nums text-slate-500 dark:text-slate-400 shrink-0">
                        +{ach.xpBonus} XP · +{ach.coinsBonus} moedas
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
