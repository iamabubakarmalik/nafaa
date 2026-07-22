import { useCallback, useEffect, useRef } from 'react';

export function useNotificationSound() {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const unlockedRef = useRef(false);

  const getCtx = useCallback((): AudioContext | null => {
    if (typeof window === 'undefined') return null;
    if (!audioCtxRef.current) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!AC) return null;
      audioCtxRef.current = new AC();
    }
    return audioCtxRef.current;
  }, []);

  useEffect(() => {
    const unlock = () => {
      if (unlockedRef.current) return;
      const ctx = getCtx();
      if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => undefined);
      unlockedRef.current = true;
      window.removeEventListener('click', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('touchstart', unlock);
    };
    window.addEventListener('click', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    window.addEventListener('touchstart', unlock, { once: true });
    return () => {
      window.removeEventListener('click', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('touchstart', unlock);
    };
  }, [getCtx]);

  const isMuted = useCallback(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('notif-sound-muted') === 'true';
  }, []);

  const setMuted = useCallback((muted: boolean) => {
    localStorage.setItem('notif-sound-muted', muted ? 'true' : 'false');
  }, []);

  const playTone = useCallback(
    (freq: number, durationMs: number, delayMs = 0, volume = 0.18) => {
      const ctx = getCtx();
      if (!ctx) return;
      const start = ctx.currentTime + delayMs / 1000;
      const end = start + durationMs / 1000;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(volume, start + 0.015);
      gain.gain.linearRampToValueAtTime(0, end);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(end + 0.02);
    },
    [getCtx],
  );

  const play = useCallback(() => {
    if (isMuted()) return;
    const ctx = getCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => undefined);
    playTone(880, 130, 0);
    playTone(1318, 180, 130);
  }, [getCtx, isMuted, playTone]);

  const playUrgent = useCallback(() => {
    if (isMuted()) return;
    const ctx = getCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => undefined);
    playTone(1000, 80, 0, 0.22);
    playTone(1000, 80, 130, 0.22);
    playTone(1000, 120, 260, 0.22);
  }, [getCtx, isMuted, playTone]);

  return { play, playUrgent, isMuted, setMuted };
}
