export type PushPermissionState = 'granted' | 'denied' | 'default' | 'unsupported';

export function getNotificationPermission(): PushPermissionState {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission as PushPermissionState;
}

export async function requestNotificationPermission(): Promise<PushPermissionState> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  try {
    const perm = await Notification.requestPermission();
    return perm as PushPermissionState;
  } catch {
    return 'denied';
  }
}

export async function dispatchPushNotification(
  title: string,
  body: string,
  tag?: string
): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  if (Notification.permission !== 'granted') {
    return false;
  }
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.showNotification(title, {
          body,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          tag: tag || 'cadencia-reminder',
        });
        return true;
      }
    }
    new Notification(title, {
      body,
      icon: '/pwa-192x192.png',
      tag: tag || 'cadencia-reminder',
    });
    return true;
  } catch {
    return false;
  }
}

export function playFocusChime(zenUnlocked: boolean = false): void {
  if (typeof window === 'undefined') return;
  const activation = (navigator as unknown as { userActivation?: { hasBeenActive?: boolean } })
    .userActivation;
  if (activation && !activation.hasBeenActive) {
    return;
  }
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const notes = zenUnlocked ? [523.25, 659.25, 783.99] : [587.33, 880];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = zenUnlocked ? 'sine' : 'triangle';
      osc.frequency.value = freq;
      const start = ctx.currentTime + idx * 0.14;
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.exponentialRampToValueAtTime(0.11, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.48);
    });
  } catch {
    // Audio playback blocked before interaction
  }
}
