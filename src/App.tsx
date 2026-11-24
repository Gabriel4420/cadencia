import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import { AnimatePresence, motion } from 'motion/react';
import { Plus } from 'lucide-react';
import type {
  AppSection,
  GoogleCalendarEvent,
  Task,
  TaskDraft,
  ToastItem,
} from './types';
import {
  connectGoogleCalendar,
  getAccessToken,
  googleSignIn,
  initAuth,
  logoutGoogle,
} from './services/firebase';
import {
  fetchGoogleCalendarEvents,
  pushTaskToGoogleCalendar,
} from './services/googleCalendar';
import {
  dispatchPushNotification,
  getNotificationPermission,
  playFocusChime,
  requestNotificationPermission,
  type PushPermissionState,
} from './services/notifications';
import { useProductivityStore } from './hooks/useProductivityStore';
import { getDueReminders } from './utils/productivity';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Sidebar } from './components/Sidebar';
import { FocusTodayView } from './components/FocusTodayView';
import { TasksView } from './components/TasksView';
import { CalendarView } from './components/CalendarView';
import { AnalyticsView } from './components/AnalyticsView';
import { GamificationView } from './components/GamificationView';
import { TaskModal } from './components/TaskModal';
import { ConfirmDialog } from './components/ConfirmDialog';
import { ToastContainer } from './components/ToastContainer';
import { OfflineIndicator } from './components/OfflineIndicator';

const SECTION_TITLES: Record<AppSection, string> = {
  today: 'Foco Hoje',
  tasks: 'Atividades',
  calendar: 'Calendário',
  analytics: 'Progresso',
  achievements: 'Conquistas',
};

function CadenciaApp() {
  const [activeSection, setActiveSection] = useState<AppSection>('today');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    }
    return 'light';
  });

  const [user, setUser] = useState<User | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  const [googleEvents, setGoogleEvents] = useState<GoogleCalendarEvent[]>([]);
  const [googleLoading, setGoogleLoading] = useState(false);

  const [pushPermission, setPushPermission] = useState<PushPermissionState>(() =>
    getNotificationPermission()
  );
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [modalDefaultDate, setModalDefaultDate] = useState<string | undefined>(undefined);
  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(null);

  // Explicit confirmation states (mandatory before Google Calendar mutations & bulk/destructive deletes)
  const [pendingDeleteTask, setPendingDeleteTask] = useState<Task | null>(null);
  const [confirmClearCompleted, setConfirmClearCompleted] = useState(false);
  const [pendingGooglePushTask, setPendingGooglePushTask] = useState<Task | null>(null);
  const [googlePushBusy, setGooglePushBusy] = useState(false);

  const notifiedRemindersRef = useRef<Set<string>>(new Set());

  const pushToast = useCallback(
    (
      title: string,
      description?: string,
      tone: 'info' | 'success' | 'warning' | 'reward' = 'info'
    ) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev.slice(-3), { id, title, description, tone }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4200);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const store = useProductivityStore({
    user,
    onNotifyToast: pushToast,
  });

  // Sync theme class with <html> and localStorage
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem('cadencia_theme', theme);
    } catch {
      // ignore
    }
  }, [theme]);

  // Sync unlocked accent reward with <html data-accent="...">
  useEffect(() => {
    document.documentElement.dataset.accent = store.profile.activeAccent;
  }, [store.profile.activeAccent]);

  // Initialize Firebase Auth listener
  useEffect(() => {
    return initAuth((authUser) => {
      setUser(authUser);
    });
  }, []);

  // Load Google Calendar events when access token is available
  const refreshGoogleEvents = useCallback(
    async (explicitToken?: string) => {
      const token = explicitToken || googleToken || getAccessToken();
      if (!token) return;
      setGoogleLoading(true);
      try {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
        const end = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString();
        const events = await fetchGoogleCalendarEvents(token, start, end);
        setGoogleEvents(events);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro ao consultar Google Calendar.';
        pushToast('Falha na sincronização do calendário', msg, 'warning');
      } finally {
        setGoogleLoading(false);
      }
    },
    [googleToken, pushToast]
  );

  const handleSignIn = useCallback(async () => {
    setAuthLoading(true);
    try {
      const result = await googleSignIn();
      setUser(result.user);
      pushToast(
        'Conta Google conectada',
        'Sincronização em tempo real entre dispositivos ativada.',
        'success'
      );
    } catch {
      pushToast(
        'Autenticação cancelada',
        'Você continua usando o Cadência normalmente no modo local offline.',
        'info'
      );
    } finally {
      setAuthLoading(false);
    }
  }, [pushToast]);

  const handleConnectGoogleCalendar = useCallback(async () => {
    setGoogleLoading(true);
    try {
      const result = await connectGoogleCalendar();
      setGoogleToken(result.accessToken);
      pushToast(
        'Google Calendar conectado',
        'Seus compromissos foram vinculados com sucesso.',
        'success'
      );
      await refreshGoogleEvents(result.accessToken);
    } catch {
      pushToast(
        'Conexão cancelada',
        'Você pode exportar ou importar seu cronograma via arquivos .ics a qualquer momento.',
        'info'
      );
    } finally {
      setGoogleLoading(false);
    }
  }, [pushToast, refreshGoogleEvents]);

  const handleSignOut = useCallback(async () => {
    await logoutGoogle();
    setUser(null);
    setGoogleToken(null);
    setGoogleEvents([]);
    pushToast('Sessão encerrada', 'Seus dados locais continuam disponíveis offline.', 'info');
  }, [pushToast]);

  // Schedule-based automatic reminder engine (checks every 15s)
  useEffect(() => {
    const checkReminders = () => {
      const due = getDueReminders(store.tasks, new Date(), notifiedRemindersRef.current);
      if (due.length === 0) return;

      due.forEach(({ task, minutesUntilStart, reminderKey }) => {
        notifiedRemindersRef.current.add(reminderKey);
        const body =
          minutesUntilStart > 0
            ? `Começa em ${minutesUntilStart} min (${task.scheduledTime}) · ${task.durationMinutes} min`
            : `Horário agendado agora (${task.scheduledTime})`;

        pushToast(`Lembrete: ${task.title}`, body, 'warning');
        playFocusChime(store.profile.unlockedRewardIds.includes('zen_chime'));
        dispatchPushNotification(`Cadência · ${task.title}`, body, reminderKey).catch(() => {});
      });
    };

    checkReminders();
    const timer = window.setInterval(checkReminders, 15000);
    return () => window.clearInterval(timer);
  }, [store.tasks, store.profile.unlockedRewardIds, pushToast]);

  // Keyboard shortcuts (N = New task, 1-5 = sections)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setEditingTask(null);
        setModalDefaultDate(undefined);
        setTaskModalOpen(true);
      } else if (e.key === '1') setActiveSection('today');
      else if (e.key === '2') setActiveSection('tasks');
      else if (e.key === '3') setActiveSection('calendar');
      else if (e.key === '4') setActiveSection('analytics');
      else if (e.key === '5') setActiveSection('achievements');
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleEnablePush = useCallback(async () => {
    const result = await requestNotificationPermission();
    setPushPermission(result);
    if (result === 'granted') {
      pushToast(
        'Notificações push ativadas',
        'Você receberá lembretes automáticos antes de cada tarefa agendada.',
        'success'
      );
      dispatchPushNotification(
        'Cadência — Lembretes ativados',
        'Seus alertas automáticos do cronograma estão configurados.',
        'cadencia-welcome'
      ).catch(() => {});
    } else if (result === 'denied') {
      pushToast(
        'Permissão bloqueada no navegador',
        'Os lembretes continuarão aparecendo diretamente dentro do aplicativo.',
        'warning'
      );
    } else {
      pushToast(
        'Notificações indisponíveis neste navegador',
        'Alertas internos do Cadência permanecem ativos.',
        'info'
      );
    }
  }, [pushToast]);

  const handleTestNotification = useCallback(() => {
    const body = 'Lembrete de teste disparado com sucesso para o seu cronograma.';
    pushToast('Lembrete automático ativo', body, 'info');
    playFocusChime(store.profile.unlockedRewardIds.includes('zen_chime'));
    dispatchPushNotification('Cadência · Alerta de cronograma', body, `test-${Date.now()}`).catch(
      () => {}
    );
  }, [pushToast, store.profile.unlockedRewardIds]);

  const handleSaveTask = useCallback(
    (draft: TaskDraft, editingId?: string) => {
      if (editingId) {
        store.updateTask(editingId, draft);
      } else {
        store.addTask(draft);
      }
    },
    [store]
  );

  const handleConfirmPushToGoogle = useCallback(async () => {
    if (!pendingGooglePushTask) return;
    const token = googleToken || getAccessToken();
    if (!token) {
      setPendingGooglePushTask(null);
      pushToast('Conecte sua conta Google', 'Faça login para sincronizar com o Google Calendar.', 'warning');
      return;
    }
    setGooglePushBusy(true);
    try {
      const created = await pushTaskToGoogleCalendar(token, pendingGooglePushTask);
      store.linkCalendarEvent(pendingGooglePushTask.id, created.id);
      pushToast(
        'Enviado ao Google Calendar',
        `"${pendingGooglePushTask.title}" foi criado no seu calendário principal.`,
        'success'
      );
      await refreshGoogleEvents(token);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao criar evento.';
      pushToast('Não foi possível enviar ao Google Calendar', msg, 'warning');
    } finally {
      setGooglePushBusy(false);
      setPendingGooglePushTask(null);
    }
  }, [pendingGooglePushTask, googleToken, store, pushToast, refreshGoogleEvents]);

  const handleImportGoogleEventAsTask = useCallback(
    (ev: GoogleCalendarEvent) => {
      store.addTask({
        title: ev.summary.slice(0, 140),
        description: (ev.description || 'Importado do Google Calendar').slice(0, 600),
        priority: 'medium',
        category: 'work',
        dueDate: ev.startDate,
        scheduledTime: ev.startTime || '09:00',
        durationMinutes: ev.durationMinutes,
        reminderMinutesBefore: 15,
      });
    },
    [store]
  );

  const pendingCount = useMemo(
    () => store.tasks.filter((t) => t.status === 'pending').length,
    [store.tasks]
  );

  const syncedCalendarCount = useMemo(
    () =>
      store.tasks.filter((t) => Boolean(t.calendarEventId)).length + googleEvents.length,
    [store.tasks, googleEvents.length]
  );

  const openNewTask = (dateStr?: string) => {
    setEditingTask(null);
    setModalDefaultDate(dateStr);
    setTaskModalOpen(true);
  };

  const openEditTask = (task: Task) => {
    setEditingTask(task);
    setModalDefaultDate(undefined);
    setTaskModalOpen(true);
  };

  const handleSelectFocusTask = (task: Task) => {
    setFocusedTaskId(task.id);
    setActiveSection('today');
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F8FAFC] dark:bg-[#0B1120] text-[#0F172A] dark:text-[#F1F5F9]">
      <Sidebar
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        pendingCount={pendingCount}
        profile={store.profile}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
        pushPermission={pushPermission}
        onEnablePush={handleEnablePush}
        user={user}
        authLoading={authLoading}
        cloudSyncState={store.cloudSyncState}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        onNewTask={() => openNewTask()}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Desktop Workspace Top Header (clean contextual breadcrumb + 1 primary CTA) */}
        <header className="hidden md:flex flex-col border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-[#0F172A]/90 backdrop-blur-sm sticky top-0 z-20">
          <div className="flex items-center justify-between gap-8 px-8 py-3.5">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-400 dark:text-slate-500">Cadência</span>
              <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
                /
              </span>
              <span className="font-medium text-slate-900 dark:text-slate-100">
                {SECTION_TITLES[activeSection]}
              </span>
            </div>

            <button
              type="button"
              onClick={() => openNewTask()}
              className="inline-flex items-center gap-2 rounded-lg accent-bg px-4 py-2 text-xs font-medium text-white transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="h-4 w-4" />
              <span>Nova atividade</span>
            </button>
          </div>
          <div aria-hidden="true" className="shimmer-progress-track">
            <div
              key={`${activeSection}-${store.cloudSyncState === 'syncing' ? 'sync' : 'idle'}`}
              className={
                store.cloudSyncState === 'syncing'
                  ? 'h-full w-full shimmer-block'
                  : 'shimmer-progress-bar'
              }
            />
          </div>
        </header>

        {/* Main Viewport with Fast Fluid SPA Transitions */}
        <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-10">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              className="shimmer-sweep rounded-xl"
            >
              {activeSection === 'today' && (
                <FocusTodayView
                  tasks={store.tasks}
                  profile={store.profile}
                  focusedTaskId={focusedTaskId}
                  pushPermission={pushPermission}
                  soundEnabled={true}
                  isSyncing={store.cloudSyncState === 'syncing'}
                  onSelectFocusTask={handleSelectFocusTask}
                  onToggleTask={store.toggleTaskStatus}
                  onEditTask={openEditTask}
                  onDeleteTask={setPendingDeleteTask}
                  onQuickAddTask={store.addTask}
                  onOpenNewTaskModal={() => openNewTask()}
                  onCompleteFocusSession={store.completeFocusSession}
                  onEnablePush={handleEnablePush}
                  onTestNotification={handleTestNotification}
                />
              )}

              {activeSection === 'tasks' && (
                <TasksView
                  tasks={store.tasks}
                  customCategories={store.profile.customCategories || []}
                  isSyncing={store.cloudSyncState === 'syncing'}
                  onAddCategory={store.addCustomCategory}
                  onRemoveCategory={store.removeCustomCategory}
                  onToggleTask={store.toggleTaskStatus}
                  onEditTask={openEditTask}
                  onDeleteTask={setPendingDeleteTask}
                  onFocusTask={handleSelectFocusTask}
                  onOpenNewTaskModal={() => openNewTask()}
                  onRequestClearCompleted={() => setConfirmClearCompleted(true)}
                />
              )}

              {activeSection === 'calendar' && (
                <CalendarView
                  tasks={store.tasks}
                  googleEvents={googleEvents}
                  hasGoogleToken={Boolean(googleToken)}
                  googleLoading={googleLoading}
                  onConnectGoogle={handleConnectGoogleCalendar}
                  onRefreshGoogleEvents={() => refreshGoogleEvents()}
                  onRequestPushTaskToGoogle={setPendingGooglePushTask}
                  onImportGoogleEventAsTask={handleImportGoogleEventAsTask}
                  onImportIcsTasks={store.importTasks}
                  onOpenNewTaskForDate={(dateStr) => openNewTask(dateStr)}
                  onToggleTask={store.toggleTaskStatus}
                  onNotify={pushToast}
                />
              )}

              {activeSection === 'analytics' && (
                <AnalyticsView
                  tasks={store.tasks}
                  profile={store.profile}
                  theme={theme}
                  isSyncing={store.cloudSyncState === 'syncing'}
                  onNotify={pushToast}
                />
              )}

              {activeSection === 'achievements' && (
                <GamificationView
                  tasks={store.tasks}
                  profile={store.profile}
                  syncedCalendarCount={syncedCalendarCount}
                  onRedeemReward={store.redeemRewardItem}
                  onSelectAccent={store.setActiveAccent}
                  onChangeDailyGoal={store.setDailyGoal}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Create / Edit Task Modal */}
      <TaskModal
        open={taskModalOpen}
        editingTask={editingTask}
        defaultDate={modalDefaultDate}
        customCategories={store.profile.customCategories || []}
        onAddCategory={store.addCustomCategory}
        onClose={() => setTaskModalOpen(false)}
        onSave={handleSaveTask}
      />

      {/* Explicit Confirmation Dialog: Delete single task */}
      <ConfirmDialog
        open={Boolean(pendingDeleteTask)}
        title="Excluir atividade?"
        description="Esta atividade será removida permanentemente da sua lista e sincronizada entre seus dispositivos."
        details={pendingDeleteTask ? [`Atividade: ${pendingDeleteTask.title}`] : undefined}
        confirmLabel="Excluir"
        tone="danger"
        onCancel={() => setPendingDeleteTask(null)}
        onConfirm={() => {
          if (pendingDeleteTask) {
            store.deleteTask(pendingDeleteTask.id);
          }
          setPendingDeleteTask(null);
        }}
      />

      {/* Explicit Confirmation Dialog: Archive completed tasks */}
      <ConfirmDialog
        open={confirmClearCompleted}
        title="Arquivar atividades concluídas?"
        description="As tarefas já finalizadas serão removidas da lista ativa, mantendo intactos seu nível, XP e conquistas."
        confirmLabel="Arquivar concluídas"
        tone="danger"
        onCancel={() => setConfirmClearCompleted(false)}
        onConfirm={() => {
          store.clearCompletedTasks();
          setConfirmClearCompleted(false);
        }}
      />

      {/* Mandatory Confirmation Dialog before writing to Google Calendar */}
      <ConfirmDialog
        open={Boolean(pendingGooglePushTask)}
        title="Criar evento no Google Calendar?"
        description="Você está prestes a adicionar esta atividade ao seu calendário principal do Google Calendar."
        details={
          pendingGooglePushTask
            ? [
                `Título: ${pendingGooglePushTask.title}`,
                `Data e horário: ${pendingGooglePushTask.dueDate} às ${pendingGooglePushTask.scheduledTime || '09:00'} (${pendingGooglePushTask.durationMinutes} min)`,
                pendingGooglePushTask.reminderMinutesBefore > 0
                  ? `Lembrete pop-up: ${pendingGooglePushTask.reminderMinutesBefore} minutos antes`
                  : 'Sem lembrete configurado',
              ]
            : undefined
        }
        confirmLabel="Confirmar envio"
        loading={googlePushBusy}
        onCancel={() => setPendingGooglePushTask(null)}
        onConfirm={handleConfirmPushToGoogle}
      />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      <OfflineIndicator />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <CadenciaApp />
    </ErrorBoundary>
  );
}
