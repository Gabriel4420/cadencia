import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Pause, Play, RotateCcw } from 'lucide-react';
import type { Task } from '../types';
import { playFocusChime } from '../services/notifications';

interface FocusTimerCardProps {
  activeTask: Task | null;
  zenChimeUnlocked: boolean;
  soundEnabled: boolean;
  onSessionComplete: (minutes: number, taskTitle?: string) => void;
}

const PRESETS = [15, 25, 45] as const;

export const FocusTimerCard: React.FC<FocusTimerCardProps> = ({
  activeTask,
  zenChimeUnlocked,
  soundEnabled,
  onSessionComplete,
}) => {
  const [presetMinutes, setPresetMinutes] = useState<number>(25);
  const [secondsLeft, setSecondsLeft] = useState<number>(25 * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const completedRef = useRef<boolean>(false);

  useEffect(() => {
    if (!isRunning) return;
    const interval = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(interval);
          setIsRunning(false);
          if (!completedRef.current) {
            completedRef.current = true;
            if (soundEnabled) playFocusChime(zenChimeUnlocked);
            onSessionComplete(presetMinutes, activeTask?.title);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [isRunning, presetMinutes, activeTask?.title, soundEnabled, zenChimeUnlocked, onSessionComplete]);

  const selectPreset = (mins: number) => {
    setIsRunning(false);
    completedRef.current = false;
    setPresetMinutes(mins);
    setSecondsLeft(mins * 60);
  };

  const handleReset = () => {
    setIsRunning(false);
    completedRef.current = false;
    setSecondsLeft(presetMinutes * 60);
  };

  const handleCompleteNow = () => {
    setIsRunning(false);
    const elapsedMinutes = Math.max(
      1,
      Math.round((presetMinutes * 60 - secondsLeft) / 60) || presetMinutes
    );
    if (soundEnabled) playFocusChime(zenChimeUnlocked);
    onSessionComplete(elapsedMinutes, activeTask?.title);
    completedRef.current = false;
    setSecondsLeft(presetMinutes * 60);
  };

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');
  const pct = Math.round(((presetMinutes * 60 - secondsLeft) / (presetMinutes * 60)) * 100);

  return (
    <section
      aria-labelledby="focus-timer-heading"
      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5"
    >
      <div className="flex items-center justify-between gap-2">
        <h2
          id="focus-timer-heading"
          className="text-sm font-semibold text-slate-900 dark:text-slate-100"
        >
          Sessão de foco
        </h2>
        <div className="flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-900 p-0.5">
          {PRESETS.map((mins) => (
            <button
              key={mins}
              type="button"
              onClick={() => selectPreset(mins)}
              className={`rounded-md px-2 py-1 text-xs font-mono tabular-nums transition-colors ${
                presetMinutes === mins
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {mins}m
            </button>
          ))}
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 truncate">
        {activeTask ? `Em foco: ${activeTask.title}` : 'Selecione uma atividade pendente para focar'}
      </p>

      <div className="mt-4 flex flex-col items-center py-3">
        <span
          data-testid="focus-timer-display"
          className="font-mono text-4xl font-semibold tracking-tight tabular-nums text-slate-900 dark:text-slate-100"
        >
          {mm}:{ss}
        </span>

        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className="h-full rounded-full accent-bg transition-[width] duration-300"
            style={{ width: `${Math.max(2, pct)}%` }}
          />
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            completedRef.current = false;
            setIsRunning((r) => !r);
          }}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg accent-bg px-4 py-2 text-xs font-medium text-white transition-colors whitespace-nowrap"
        >
          {isRunning ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          <span>{isRunning ? 'Pausar' : 'Iniciar foco'}</span>
        </button>
        <button
          type="button"
          onClick={handleReset}
          aria-label="Reiniciar cronômetro de foco"
          title="Reiniciar"
          className="rounded-lg border border-slate-200 dark:border-slate-700 p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={handleCompleteNow}
          aria-label="Registrar bloco de foco concluído"
          title="Registrar bloco (+25 XP)"
          className="rounded-lg border border-slate-200 dark:border-slate-700 p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </section>
  );
};
