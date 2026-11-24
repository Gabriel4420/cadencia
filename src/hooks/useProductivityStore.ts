import { useCallback, useEffect, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import type {
  AccentTheme,
  Task,
  TaskDraft,
  UserGamificationProfile,
} from '../types';
import {
  db,
  handleFirestoreError,
  OperationType,
  testFirestoreConnection,
} from '../services/firebase';
import {
  calculateTaskReward,
  FOCUS_SESSION_COINS,
  FOCUS_SESSION_XP,
  redeemReward,
} from '../utils/gamification';
import { getLocalDateStr } from '../utils/productivity';
import {
  addCustomCategoryToList,
  removeCustomCategoryFromList,
  sanitizeCustomCategories,
  sanitizeTaskCategory,
} from '../utils/categories';

const TASKS_STORAGE_KEY = 'cadencia_tasks_prod_v2';
const PROFILE_STORAGE_KEY = 'cadencia_profile_prod_v2';
const LEGACY_STORAGE_KEYS = ['cadencia_tasks_v1', 'cadencia_profile_v1'];
const SYNC_CHANNEL_NAME = 'cadencia_realtime_sync';

function createCleanProfile(userId: string = 'local_user'): UserGamificationProfile {
  return {
    userId,
    xp: 0,
    coins: 0,
    streakDays: 0,
    streakFreezes: 0,
    dailyGoal: 5,
    focusMinutesTotal: 0,
    unlockedRewardIds: [],
    activeAccent: 'cobalt',
    customCategories: [],
    updatedAt: new Date().toISOString(),
  };
}

function purgeLegacyMockStorage(): void {
  try {
    for (const key of LEGACY_STORAGE_KEYS) {
      localStorage.removeItem(key);
    }
  } catch {
    // ignore storage errors
  }
}

function sanitizeId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
  return cleaned.length > 0 ? cleaned : `id_${Date.now()}`;
}

function sanitizeTaskForBlueprint(task: Task, userId: string): Task {
  const safeDueDate = /^\d{4}-\d{2}-\d{2}$/.test(task.dueDate)
    ? task.dueDate
    : getLocalDateStr();
  const base: Task = {
    id: sanitizeId(task.id),
    userId: sanitizeId(userId),
    title: task.title.trim().slice(0, 140) || 'Atividade',
    priority: ['high', 'medium', 'low'].includes(task.priority) ? task.priority : 'medium',
    category: sanitizeTaskCategory(task.category),
    status: task.status === 'completed' ? 'completed' : 'pending',
    dueDate: safeDueDate,
    durationMinutes: Math.max(5, Math.min(480, Math.round(task.durationMinutes || 30))),
    reminderMinutesBefore: Math.max(0, Math.min(1440, Math.round(task.reminderMinutesBefore || 0))),
    createdAt: (task.createdAt || new Date().toISOString()).slice(0, 40),
    updatedAt: (task.updatedAt || new Date().toISOString()).slice(0, 40),
  };
  if (task.description && task.description.trim().length > 0) {
    base.description = task.description.trim().slice(0, 600);
  }
  if (task.scheduledTime && task.scheduledTime.trim().length > 0) {
    base.scheduledTime = task.scheduledTime.trim().slice(0, 10);
  }
  if (task.calendarEventId && task.calendarEventId.trim().length > 0) {
    base.calendarEventId = task.calendarEventId.trim().slice(0, 200);
  }
  if (task.completedAt && task.completedAt.trim().length > 0) {
    base.completedAt = task.completedAt.trim().slice(0, 40);
  }
  return base;
}

function sanitizeProfileForBlueprint(
  profile: UserGamificationProfile,
  userId: string
): UserGamificationProfile {
  return {
    userId: sanitizeId(userId),
    xp: Math.max(0, Math.min(1000000, Math.round(profile.xp))),
    coins: Math.max(0, Math.min(1000000, Math.round(profile.coins))),
    streakDays: Math.max(0, Math.min(10000, Math.round(profile.streakDays))),
    streakFreezes: Math.max(0, Math.min(50, Math.round(profile.streakFreezes))),
    dailyGoal: Math.max(1, Math.min(50, Math.round(profile.dailyGoal))),
    focusMinutesTotal: Math.max(0, Math.min(1000000, Math.round(profile.focusMinutesTotal))),
    ...(profile.lastActiveDate ? { lastActiveDate: profile.lastActiveDate.slice(0, 16) } : {}),
    unlockedRewardIds: profile.unlockedRewardIds.slice(0, 20).map((r) => r.slice(0, 64)),
    activeAccent: profile.activeAccent,
    customCategories: sanitizeCustomCategories(profile.customCategories),
    updatedAt: (profile.updatedAt || new Date().toISOString()).slice(0, 40),
  };
}

function loadLocalTasks(): Task[] {
  purgeLegacyMockStorage();
  try {
    const raw = localStorage.getItem(TASKS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Task[];
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // start clean
  }
  return [];
}

function loadLocalProfile(): UserGamificationProfile {
  purgeLegacyMockStorage();
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as UserGamificationProfile;
      if (parsed && typeof parsed.xp === 'number') {
        return {
          ...parsed,
          customCategories: sanitizeCustomCategories(parsed.customCategories),
        };
      }
    }
  } catch {
    // start clean
  }
  return createCleanProfile('local_user');
}

export interface UseProductivityStoreOptions {
  user: User | null;
  onNotifyToast: (
    title: string,
    description?: string,
    tone?: 'info' | 'success' | 'warning' | 'reward'
  ) => void;
}

export function useProductivityStore({ user, onNotifyToast }: UseProductivityStoreOptions) {
  const [tasks, setTasks] = useState<Task[]>(() => loadLocalTasks());
  const [profile, setProfile] = useState<UserGamificationProfile>(() => loadLocalProfile());
  const [cloudSyncState, setCloudSyncState] = useState<'local' | 'syncing' | 'synced'>('local');
  const channelRef = useRef<BroadcastChannel | null>(null);
  const cloudEnabledRef = useRef<boolean>(false);

  // Persist locally & broadcast across open browser tabs in real time
  const persistLocal = useCallback((nextTasks: Task[], nextProfile?: UserGamificationProfile) => {
    try {
      localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(nextTasks));
      if (nextProfile) {
        localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(nextProfile));
      }
      channelRef.current?.postMessage({
        type: 'STATE_UPDATED',
        tasks: nextTasks,
        profile: nextProfile,
      });
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Multi-tab real-time sync channel
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const ch = new BroadcastChannel(SYNC_CHANNEL_NAME);
    channelRef.current = ch;
    ch.onmessage = (ev) => {
      if (ev.data?.type === 'STATE_UPDATED') {
        if (Array.isArray(ev.data.tasks)) setTasks(ev.data.tasks);
        if (ev.data.profile) setProfile(ev.data.profile);
      }
    };
    return () => {
      ch.close();
      channelRef.current = null;
    };
  }, []);

  // Test Firestore reachability once on startup
  useEffect(() => {
    testFirestoreConnection().catch(() => {});
  }, []);

  // Real-time Firestore sync when authenticated
  useEffect(() => {
    if (!user) {
      cloudEnabledRef.current = false;
      setCloudSyncState('local');
      return;
    }

    setCloudSyncState('syncing');
    cloudEnabledRef.current = true;
    const uid = sanitizeId(user.uid);
    const tasksPath = `users/${uid}/tasks`;
    const profilePath = `users/${uid}/profile/gamification`;

    const tasksQuery = query(collection(db, tasksPath), where('userId', '==', uid));
    const unsubTasks = onSnapshot(
      tasksQuery,
      (snap) => {
        if (snap.empty) {
          // Seed initial cloud state from current local tasks if cloud is empty
          setTasks((currentLocal) => {
            const migrated = currentLocal.map((t) => sanitizeTaskForBlueprint(t, uid));
            migrated.forEach((item) => {
              setDoc(doc(db, tasksPath, item.id), item).catch((err) => {
                handleFirestoreError(err, OperationType.CREATE, `${tasksPath}/${item.id}`, false);
                cloudEnabledRef.current = false;
                setCloudSyncState('local');
              });
            });
            return migrated;
          });
        } else {
          const remoteTasks = snap.docs.map((d) => d.data() as Task);
          setTasks(remoteTasks);
          try {
            localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(remoteTasks));
          } catch {
            // ignore
          }
        }
        setCloudSyncState('synced');
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, tasksPath, false);
        cloudEnabledRef.current = false;
        setCloudSyncState('local');
      }
    );

    const profileRef = doc(db, 'users', uid, 'profile', 'gamification');
    const unsubProfile = onSnapshot(
      profileRef,
      (snap) => {
        if (snap.exists()) {
          const remoteProfile = snap.data() as UserGamificationProfile;
          setProfile(remoteProfile);
          try {
            localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(remoteProfile));
          } catch {
            // ignore
          }
        } else {
          setProfile((currentLocal) => {
            const safeProf = sanitizeProfileForBlueprint(currentLocal, uid);
            setDoc(profileRef, safeProf).catch((err) => {
              handleFirestoreError(err, OperationType.CREATE, profilePath, false);
            });
            return safeProf;
          });
        }
      },
      (err) => {
        handleFirestoreError(err, OperationType.GET, profilePath, false);
      }
    );

    return () => {
      unsubTasks();
      unsubProfile();
    };
  }, [user]);

  const syncProfileToCloud = useCallback(
    (nextProfile: UserGamificationProfile) => {
      if (!user || !cloudEnabledRef.current) return;
      const uid = sanitizeId(user.uid);
      const safeProf = sanitizeProfileForBlueprint(nextProfile, uid);
      setDoc(doc(db, 'users', uid, 'profile', 'gamification'), safeProf, { merge: true }).catch(
        (err) => {
          handleFirestoreError(
            err,
            OperationType.UPDATE,
            `users/${uid}/profile/gamification`,
            false
          );
        }
      );
    },
    [user]
  );

  const addTask = useCallback(
    (draft: TaskDraft) => {
      const uid = user ? sanitizeId(user.uid) : 'local_user';
      const nowIso = new Date().toISOString();
      const newTask = sanitizeTaskForBlueprint(
        {
          id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          userId: uid,
          title: draft.title,
          description: draft.description,
          priority: draft.priority,
          category: draft.category,
          status: 'pending',
          dueDate: draft.dueDate,
          scheduledTime: draft.scheduledTime,
          durationMinutes: draft.durationMinutes,
          reminderMinutesBefore: draft.reminderMinutesBefore,
          createdAt: nowIso,
          updatedAt: nowIso,
        },
        uid
      );

      setTasks((prev) => {
        const next = [newTask, ...prev];
        persistLocal(next);
        return next;
      });

      if (user && cloudEnabledRef.current) {
        setDoc(doc(db, 'users', uid, 'tasks', newTask.id), newTask).catch((err) => {
          handleFirestoreError(err, OperationType.CREATE, `users/${uid}/tasks/${newTask.id}`, false);
        });
      }

      onNotifyToast('Atividade adicionada', `"${newTask.title}" incluída no cronograma.`, 'success');
      return newTask;
    },
    [user, persistLocal, onNotifyToast]
  );

  const updateTask = useCallback(
    (taskId: string, draft: TaskDraft) => {
      const uid = user ? sanitizeId(user.uid) : 'local_user';
      const nowIso = new Date().toISOString();
      let updatedItem: Task | null = null;

      setTasks((prev) => {
        const next = prev.map((t) => {
          if (t.id !== taskId) return t;
          updatedItem = sanitizeTaskForBlueprint(
            {
              ...t,
              title: draft.title,
              description: draft.description,
              priority: draft.priority,
              category: draft.category,
              dueDate: draft.dueDate,
              scheduledTime: draft.scheduledTime,
              durationMinutes: draft.durationMinutes,
              reminderMinutesBefore: draft.reminderMinutesBefore,
              updatedAt: nowIso,
            },
            uid
          );
          return updatedItem;
        });
        persistLocal(next);
        return next;
      });

      if (user && cloudEnabledRef.current && updatedItem) {
        const safe = updatedItem as Task;
        updateDoc(doc(db, 'users', uid, 'tasks', taskId), {
          title: safe.title,
          description: safe.description ?? '',
          priority: safe.priority,
          category: safe.category,
          dueDate: safe.dueDate,
          scheduledTime: safe.scheduledTime ?? '',
          durationMinutes: safe.durationMinutes,
          reminderMinutesBefore: safe.reminderMinutesBefore,
          updatedAt: safe.updatedAt,
        }).catch((err) => {
          handleFirestoreError(err, OperationType.UPDATE, `users/${uid}/tasks/${taskId}`, false);
        });
      }

      onNotifyToast('Atividade atualizada', 'Alterações salvas e sincronizadas.', 'info');
    },
    [user, persistLocal, onNotifyToast]
  );

  const deleteTask = useCallback(
    (taskId: string) => {
      const uid = user ? sanitizeId(user.uid) : 'local_user';
      setTasks((prev) => {
        const next = prev.filter((t) => t.id !== taskId);
        persistLocal(next);
        return next;
      });

      if (user && cloudEnabledRef.current) {
        deleteDoc(doc(db, 'users', uid, 'tasks', taskId)).catch((err) => {
          handleFirestoreError(err, OperationType.DELETE, `users/${uid}/tasks/${taskId}`, false);
        });
      }

      onNotifyToast('Atividade removida', 'O item foi excluído da sua lista.', 'info');
    },
    [user, persistLocal, onNotifyToast]
  );

  const toggleTaskStatus = useCallback(
    (taskId: string) => {
      const uid = user ? sanitizeId(user.uid) : 'local_user';
      const now = new Date();
      const nowIso = now.toISOString();
      const todayStr = getLocalDateStr(now);

      const target = tasks.find((t) => t.id === taskId);
      if (!target) return;

      const completing = target.status === 'pending';
      const nextStatus = completing ? 'completed' : 'pending';
      const nextCompletedAt = completing ? nowIso : undefined;

      const nextTasks = tasks.map((t) =>
        t.id === taskId
          ? sanitizeTaskForBlueprint(
              {
                ...t,
                status: nextStatus,
                completedAt: nextCompletedAt,
                updatedAt: nowIso,
              },
              uid
            )
          : t
      );

      let nextProfile = profile;
      if (completing) {
        const reward = calculateTaskReward(target, now);
        const streakIncrement = profile.lastActiveDate !== todayStr ? 1 : 0;
        nextProfile = sanitizeProfileForBlueprint(
          {
            ...profile,
            xp: profile.xp + reward.xp,
            coins: profile.coins + reward.coins,
            streakDays: profile.streakDays + streakIncrement,
            lastActiveDate: todayStr,
            updatedAt: nowIso,
          },
          uid
        );
        setProfile(nextProfile);
        syncProfileToCloud(nextProfile);
        onNotifyToast(
          `+${reward.xp} XP · +${reward.coins} moedas`,
          reward.onTimeBonus
            ? `Concluída no prazo! Bônus de pontualidade aplicado.`
            : `Atividade "${target.title}" marcada como concluída.`,
          'reward'
        );
      }

      setTasks(nextTasks);
      persistLocal(nextTasks, nextProfile);

      if (user && cloudEnabledRef.current) {
        updateDoc(doc(db, 'users', uid, 'tasks', taskId), {
          status: nextStatus,
          completedAt: nextCompletedAt ?? '',
          updatedAt: nowIso,
        }).catch((err) => {
          handleFirestoreError(err, OperationType.UPDATE, `users/${uid}/tasks/${taskId}`, false);
        });
      }
    },
    [tasks, profile, user, persistLocal, syncProfileToCloud, onNotifyToast]
  );

  const completeFocusSession = useCallback(
    (minutes: number, taskTitle?: string) => {
      const uid = user ? sanitizeId(user.uid) : 'local_user';
      const nowIso = new Date().toISOString();
      const todayStr = getLocalDateStr();
      const nextProfile = sanitizeProfileForBlueprint(
        {
          ...profile,
          xp: profile.xp + FOCUS_SESSION_XP,
          coins: profile.coins + FOCUS_SESSION_COINS,
          focusMinutesTotal: profile.focusMinutesTotal + Math.max(1, Math.round(minutes)),
          lastActiveDate: todayStr,
          updatedAt: nowIso,
        },
        uid
      );
      setProfile(nextProfile);
      persistLocal(tasks, nextProfile);
      syncProfileToCloud(nextProfile);
      onNotifyToast(
        `Sessão de foco concluída (+${FOCUS_SESSION_XP} XP)`,
        taskTitle
          ? `${minutes} min dedicados a "${taskTitle}" · +${FOCUS_SESSION_COINS} moedas.`
          : `${minutes} min registrados · +${FOCUS_SESSION_COINS} moedas.`,
        'reward'
      );
    },
    [profile, tasks, user, persistLocal, syncProfileToCloud, onNotifyToast]
  );

  const redeemRewardItem = useCallback(
    (rewardId: string) => {
      const result = redeemReward(profile, rewardId);
      if (!result.redeemed) {
        onNotifyToast('Não foi possível resgatar', result.reason, 'warning');
        return false;
      }
      const uid = user ? sanitizeId(user.uid) : 'local_user';
      const safeProfile = sanitizeProfileForBlueprint(result.profile, uid);
      setProfile(safeProfile);
      persistLocal(tasks, safeProfile);
      syncProfileToCloud(safeProfile);
      onNotifyToast('Recompensa resgatada!', 'Benefício aplicado ao seu perfil.', 'reward');
      return true;
    },
    [profile, tasks, user, persistLocal, syncProfileToCloud, onNotifyToast]
  );

  const setActiveAccent = useCallback(
    (accent: AccentTheme) => {
      const uid = user ? sanitizeId(user.uid) : 'local_user';
      const nextProfile = sanitizeProfileForBlueprint(
        {
          ...profile,
          activeAccent: accent,
          updatedAt: new Date().toISOString(),
        },
        uid
      );
      setProfile(nextProfile);
      persistLocal(tasks, nextProfile);
      syncProfileToCloud(nextProfile);
    },
    [profile, tasks, user, persistLocal, syncProfileToCloud]
  );

  const setDailyGoal = useCallback(
    (goal: number) => {
      const clamped = Math.max(1, Math.min(20, Math.round(goal)));
      const uid = user ? sanitizeId(user.uid) : 'local_user';
      const nextProfile = sanitizeProfileForBlueprint(
        {
          ...profile,
          dailyGoal: clamped,
          updatedAt: new Date().toISOString(),
        },
        uid
      );
      setProfile(nextProfile);
      persistLocal(tasks, nextProfile);
      syncProfileToCloud(nextProfile);
    },
    [profile, tasks, user, persistLocal, syncProfileToCloud]
  );

  const addCustomCategory = useCallback(
    (rawName: string) => {
      const current = sanitizeCustomCategories(profile.customCategories);
      const result = addCustomCategoryToList(current, rawName);
      if (!result.ok) {
        return result;
      }
      if (!result.alreadyExists) {
        const uid = user ? sanitizeId(user.uid) : 'local_user';
        const nextProfile = sanitizeProfileForBlueprint(
          {
            ...profile,
            customCategories: result.customCategories,
            updatedAt: new Date().toISOString(),
          },
          uid
        );
        setProfile(nextProfile);
        persistLocal(tasks, nextProfile);
        syncProfileToCloud(nextProfile);
        onNotifyToast(
          'Categoria criada',
          `"${result.categoryId}" já está disponível para suas atividades.`,
          'success'
        );
      }
      return result;
    },
    [profile, tasks, user, persistLocal, syncProfileToCloud, onNotifyToast]
  );

  const removeCustomCategory = useCallback(
    (categoryName: string) => {
      const current = sanitizeCustomCategories(profile.customCategories);
      const nextCategories = removeCustomCategoryFromList(current, categoryName);
      const uid = user ? sanitizeId(user.uid) : 'local_user';
      const nextProfile = sanitizeProfileForBlueprint(
        {
          ...profile,
          customCategories: nextCategories,
          updatedAt: new Date().toISOString(),
        },
        uid
      );
      setProfile(nextProfile);
      persistLocal(tasks, nextProfile);
      syncProfileToCloud(nextProfile);
      onNotifyToast(
        'Categoria removida',
        `"${categoryName}" foi removida das opções personalizadas.`,
        'info'
      );
    },
    [profile, tasks, user, persistLocal, syncProfileToCloud, onNotifyToast]
  );

  const linkCalendarEvent = useCallback(
    (taskId: string, calendarEventId: string) => {
      const uid = user ? sanitizeId(user.uid) : 'local_user';
      const nowIso = new Date().toISOString();
      setTasks((prev) => {
        const next = prev.map((t) =>
          t.id === taskId ? { ...t, calendarEventId, updatedAt: nowIso } : t
        );
        persistLocal(next);
        return next;
      });
      if (user && cloudEnabledRef.current) {
        updateDoc(doc(db, 'users', uid, 'tasks', taskId), {
          calendarEventId: calendarEventId.slice(0, 200),
          updatedAt: nowIso,
        }).catch((err) => {
          handleFirestoreError(err, OperationType.UPDATE, `users/${uid}/tasks/${taskId}`, false);
        });
      }
    },
    [user, persistLocal]
  );

  const importTasks = useCallback(
    (incomingTasks: Task[]) => {
      if (incomingTasks.length === 0) return;
      const uid = user ? sanitizeId(user.uid) : 'local_user';
      const sanitized = incomingTasks.map((t) => sanitizeTaskForBlueprint(t, uid));

      setTasks((prev) => {
        const next = [...sanitized, ...prev];
        persistLocal(next);
        return next;
      });

      if (user && cloudEnabledRef.current) {
        sanitized.forEach((item) => {
          setDoc(doc(db, 'users', uid, 'tasks', item.id), item).catch((err) => {
            handleFirestoreError(err, OperationType.CREATE, `users/${uid}/tasks/${item.id}`, false);
          });
        });
      }

      onNotifyToast(
        `${sanitized.length} atividade(s) importada(s)`,
        'Os eventos do calendário foram adicionados ao seu cronograma.',
        'success'
      );
    },
    [user, persistLocal, onNotifyToast]
  );

  const clearCompletedTasks = useCallback(() => {
    const uid = user ? sanitizeId(user.uid) : 'local_user';
    const completedIds = tasks.filter((t) => t.status === 'completed').map((t) => t.id);
    if (completedIds.length === 0) return;

    const next = tasks.filter((t) => t.status !== 'completed');
    setTasks(next);
    persistLocal(next);

    if (user && cloudEnabledRef.current) {
      completedIds.forEach((id) => {
        deleteDoc(doc(db, 'users', uid, 'tasks', id)).catch((err) => {
          handleFirestoreError(err, OperationType.DELETE, `users/${uid}/tasks/${id}`, false);
        });
      });
    }
    onNotifyToast(
      `${completedIds.length} concluída(s) arquivada(s)`,
      'Sua lista foi limpa mantendo todo o histórico de XP e conquistas.',
      'info'
    );
  }, [tasks, user, persistLocal, onNotifyToast]);

  return {
    tasks,
    profile,
    cloudSyncState,
    addTask,
    updateTask,
    deleteTask,
    toggleTaskStatus,
    completeFocusSession,
    redeemRewardItem,
    setActiveAccent,
    setDailyGoal,
    addCustomCategory,
    removeCustomCategory,
    linkCalendarEvent,
    importTasks,
    clearCompletedTasks,
  };
}
