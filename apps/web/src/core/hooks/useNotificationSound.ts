import { useCallback, useRef } from 'react';

const MUTE_KEY = 'nafaa-notifications-muted';
const VOLUME_KEY = 'nafaa-notifications-volume';

/**
 * Generates LOUD notification sounds using Web Audio API.
 * No file downloads needed — synthesized in real-time.
 */
export function useNotificationSound() {
  const contextRef = useRef<AudioContext | null>(null);

  const getContext = useCallback((): AudioContext | null => {
    if (typeof window === 'undefined') return null;
    if (!contextRef.current) {
      const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return null;
      contextRef.current = new Ctx();
    }
    // Resume if suspended (browser autoplay policy)
    if (contextRef.current && contextRef.current.state === 'suspended') {
      contextRef.current.resume().catch(() => {});
    }
    return contextRef.current;
  }, []);

  const isMuted = useCallback((): boolean => {
    try { return localStorage.getItem(MUTE_KEY) === '1'; } catch { return false; }
  }, []);

  const setMuted = useCallback((muted: boolean) => {
    try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch {}
  }, []);

  const getVolume = useCallback((): number => {
    try {
      const v = localStorage.getItem(VOLUME_KEY);
      return v ? parseFloat(v) : 0.9; // Default LOUD
    } catch { return 0.9; }
  }, []);

  /**
   * Play a single tone with envelope.
   */
  const playTone = useCallback((
    frequency: number,
    duration: number,
    delay: number = 0,
    type: OscillatorType = 'sine',
  ) => {
    const ctx = getContext();
    if (!ctx || isMuted()) return;

    const startTime = ctx.currentTime + delay;
    const endTime = startTime + duration;
    const volume = getVolume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, startTime);

    // Envelope: quick attack, sustained, quick release (loud + clear)
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + 0.02);
    gain.gain.setValueAtTime(volume, endTime - 0.05);
    gain.gain.linearRampToValueAtTime(0, endTime);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(endTime);
  }, [getContext, isMuted, getVolume]);

  /**
   * Standard notification: 3-tone ascending chime (LOUD)
   * Duration: ~0.9 seconds
   */
  const play = useCallback(() => {
    playTone(880, 0.18, 0);      // A5
    playTone(1108, 0.18, 0.22);  // C#6
    playTone(1318, 0.35, 0.44);  // E6 (longer)
  }, [playTone]);

  /**
   * Urgent alert: 4 rapid high beeps + longer final tone
   * Duration: ~1.4 seconds
   */
  const playUrgent = useCallback(() => {
    playTone(1200, 0.15, 0,    'square');
    playTone(1200, 0.15, 0.25, 'square');
    playTone(1200, 0.15, 0.5,  'square');
    playTone(1500, 0.5,  0.8,  'sawtooth');
  }, [playTone]);

  /**
   * Success chime: pleasant 2-tone
   */
  const playSuccess = useCallback(() => {
    playTone(659, 0.15, 0);    // E5
    playTone(880, 0.4, 0.18);  // A5
  }, [playTone]);

  /**
   * Test sound — plays current settings
   */
  const test = useCallback(() => {
    play();
  }, [play]);

  const setVolume = useCallback((v: number) => {
    try { localStorage.setItem(VOLUME_KEY, String(Math.min(1, Math.max(0, v)))); } catch {}
  }, []);

  return {
    play,
    playUrgent,
    playSuccess,
    test,
    isMuted,
    setMuted,
    getVolume,
    setVolume,
  };
}
