import React from 'react';
import type { User } from 'firebase/auth';
import {
  BarChart3,
  Bell,
  BellOff,
  CalendarDays,
  CheckSquare,
  Cloud,
  Flame,
  LogOut,
  Moon,
  Plus,
  Sun,
  Target,
  Trophy,
} from 'lucide-react';
import type { AppSection, UserGamificationProfile } from '../types';
import { calculateLevelInfo } from '../utils/gamification';
import type { PushPermissionState } from '../services/notifications';
import { GoogleSignInButton } from './GoogleSignInButton';
import { PWAInstallButton } from './PWAInstallButton';

interface SidebarProps {
  activeSection: AppSection;
  onSelectSection: (section: AppSection) => void;
  pendingCount: number;
  profile: UserGamificationProfile;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  pushPermission: PushPermissionState;
  onEnablePush: () => void;
  user: User | null;
  authLoading: boolean;
  cloudSyncState: 'local' | 'syncing' | 'synced';
  onSignIn: () => void;
  onSignOut: () => void;
  onNewTask: () => void;
}

const NAV_ITEMS: { id: AppSection; label: string; shortLabel: string; icon: React.ElementType }[] = [
  { id: 'today', label: 'Foco Hoje', shortLabel: 'Hoje', icon: Target },
  { id: 'tasks', label: 'Atividades', shortLabel: 'Tarefas', icon: CheckSquare },
  { id: 'calendar', label: 'Calendário', shortLabel: 'Agenda', icon: CalendarDays },
  { id: 'analytics', label: 'Progresso', shortLabel: 'Gráficos', icon: BarChart3 },
  { id: 'achievements', label: 'Conquistas', shortLabel: 'Prêmios', icon: Trophy },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onSelectSection,
  pendingCount,
  profile,
  theme,
  onToggleTheme,
  pushPermission,
  onEnablePush,
  user,
  authLoading,
  cloudSyncState,
  onSignIn,
  onSignOut,
  onNewTask,
}) => {
  const levelInfo = calculateLevelInfo(profile.xp);

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 md:shrink-0 md:flex-col md:border-r md:border-slate-200 dark:md:border-slate-800 bg-white dark:bg-[#0F172A] min-h-screen sticky top-0 h-screen">
        <div className="flex items-center justify-between px-5 py-5 border-b border-slate-100 dark:border-slate-800/80">
          <a
            href="#today"
            onClick={(e) => {
              e.preventDefault();
              onSelectSection('today');
            }}
            className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0"
          >
            Cadência
          </a>
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
            title={theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 transition-colors"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>

        <nav aria-label="Navegação principal" className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-current={active ? 'page' : undefined}
                onClick={() => onSelectSection(item.id)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'accent-soft-bg accent-text'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 hover:text-slate-900 dark:hover:bg-slate-800/70 dark:hover:text-slate-100'
                }`}
              >
                <span className="flex items-center gap-3 min-w-0">
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">{item.label}</span>
                </span>
                {item.id === 'today' && pendingCount > 0 && (
                  <span className="font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
                    {pendingCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Gamification Level Summary */}
        <div className="px-4 py-3.5 border-t border-slate-100 dark:border-slate-800/80">
          <button
            type="button"
            onClick={() => onSelectSection('achievements')}
            className="w-full text-left group"
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                Nível {levelInfo.level} · {levelInfo.title}
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full rounded-full accent-bg transition-[width] duration-300"
                style={{ width: `${levelInfo.progressPct}%` }}
              />
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
              <span>{profile.xp} XP</span>
              <span className="inline-flex items-center gap-1">
                <Flame className="h-3 w-3 text-amber-500" aria-hidden="true" />
                {profile.streakDays}d · {profile.coins} moedas
              </span>
            </div>
          </button>
        </div>

        {/* Utilities: Push, PWA Install, Account Sync */}
        <div className="px-4 py-4 border-t border-slate-100 dark:border-slate-800/80 space-y-2.5">
          <button
            type="button"
            onClick={onEnablePush}
            className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <span className="flex items-center gap-2 whitespace-nowrap">
              {pushPermission === 'granted' ? (
                <Bell className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <BellOff className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              )}
              <span>Notificações push</span>
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {pushPermission === 'granted' ? 'Ativo' : 'Ativar'}
            </span>
          </button>

          <PWAInstallButton />

          {user ? (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-2">
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">
                  {user.displayName || 'Conta conectada'}
                </p>
                <p className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  <Cloud className="h-3 w-3 shrink-0" aria-hidden="true" />
                  <span>
                    {cloudSyncState === 'synced'
                      ? 'Sincronizado'
                      : cloudSyncState === 'syncing'
                        ? 'Sincronizando...'
                        : 'Offline local'}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={onSignOut}
                aria-label="Sair da conta Google"
                title="Sair"
                className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <GoogleSignInButton
              onClick={onSignIn}
              loading={authLoading}
              label="Sincronizar com Google"
              fullWidth
            />
          )}
        </div>
      </aside>

      {/* Mobile Compact Header (52px) */}
      <header className="md:hidden sticky top-0 z-30 flex h-[52px] items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-sm px-4">
        <a
          href="#today"
          onClick={(e) => {
            e.preventDefault();
            onSelectSection('today');
          }}
          className="font-display text-base font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0"
        >
          Cadência
        </a>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={onNewTask}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg accent-bg px-3 text-xs font-medium text-white whitespace-nowrap shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Nova</span>
          </button>
        </div>
      </header>

      {/* Mobile Bottom Navigation (58px; total sticky 110px = 13.0% of 844px <= 15% cap) */}
      <nav
        aria-label="Navegação inferior"
        className="md:hidden fixed bottom-0 inset-x-0 z-30 grid h-[58px] grid-cols-5 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-sm"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-current={active ? 'page' : undefined}
              onClick={() => onSelectSection(item.id)}
              className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
                active ? 'accent-text' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span className="truncate max-w-full px-1">{item.shortLabel}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
