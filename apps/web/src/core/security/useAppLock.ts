import { useEffect, useState, useCallback, useRef } from 'react';

/**
 * Global App Lock — one PIN reused across:
 *   Sales, Khata, Cost/Profit toggles, Reports profit, Damage void, etc.
 *
 * PIN is SHA-256 hashed in localStorage.
 * Unlock persists in localStorage (survives refresh/tab close) with expiry.
 * Idle timeout is user-configurable (default: never).
 */

const PIN_HASH_KEY = 'nafaa.applock.pin-hash';
const PIN_ENABLED_KEY = 'nafaa.applock.enabled';
const UNLOCKED_UNTIL_KEY = 'nafaa.applock.unlocked-until';  // timestamp
const HIDE_STATS_KEY = 'nafaa.applock.hide-stats';
const IDLE_TIMEOUT_KEY = 'nafaa.applock.idle-timeout-minutes';  // 0 = never
const LAST_ACTIVITY_KEY = 'nafaa.applock.last-activity';

// Default: unlock lasts 24 hours (long enough for a work day, short enough for security)
const DEFAULT_UNLOCK_DURATION_MS = 24 * 60 * 60 * 1000;

async function sha256(text: string): Promise<string> {
  const buf = new TextEncoder().encode(text);
  const hashBuf = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hashBuf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

type Listener = () => void;
const listeners = new Set<Listener>();
function emit() { listeners.forEach((l) => l()); }

function getIsUnlocked(): boolean {
  const untilStr = localStorage.getItem(UNLOCKED_UNTIL_KEY);
  if (!untilStr) return false;
  const until = Number(untilStr);
  if (isNaN(until)) return false;
  if (Date.now() >= until) {
    // Expired
    localStorage.removeItem(UNLOCKED_UNTIL_KEY);
    return false;
  }

  // Check idle timeout
  const idleMinutes = Number(localStorage.getItem(IDLE_TIMEOUT_KEY) || '0');
  if (idleMinutes > 0) {
    const lastActivity = Number(localStorage.getItem(LAST_ACTIVITY_KEY) || '0');
    if (lastActivity > 0) {
      const idleMs = Date.now() - lastActivity;
      if (idleMs > idleMinutes * 60 * 1000) {
        // Idle timeout hit — auto lock
        localStorage.removeItem(UNLOCKED_UNTIL_KEY);
        localStorage.removeItem(LAST_ACTIVITY_KEY);
        return false;
      }
    }
  }
  return true;
}

export function useAppLock() {
  const [isEnabled, setIsEnabled] = useState(() => localStorage.getItem(PIN_ENABLED_KEY) === 'true');
  const [isUnlocked, setIsUnlocked] = useState(() => getIsUnlocked());
  const [hideStats, setHideStats] = useState(() => localStorage.getItem(HIDE_STATS_KEY) === 'true');
  const [idleTimeoutMinutes, setIdleTimeoutMinutesState] = useState(() =>
    Number(localStorage.getItem(IDLE_TIMEOUT_KEY) || '0')
  );
  const activityTimerRef = useRef<any>(null);

  useEffect(() => {
    const sync = () => {
      setIsEnabled(localStorage.getItem(PIN_ENABLED_KEY) === 'true');
      setIsUnlocked(getIsUnlocked());
      setHideStats(localStorage.getItem(HIDE_STATS_KEY) === 'true');
      setIdleTimeoutMinutes(Number(localStorage.getItem(IDLE_TIMEOUT_KEY) || '0'));
    };
    listeners.add(sync);
    window.addEventListener('storage', sync);
    return () => { listeners.delete(sync); window.removeEventListener('storage', sync); };
  }, []);

  // Track user activity — updates last-activity timestamp
  useEffect(() => {
    if (!isEnabled || !isUnlocked) return;
    if (idleTimeoutMinutes <= 0) return; // never auto-lock

    const bumpActivity = () => {
      localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
    };

    // Initial bump
    bumpActivity();

    // Throttle: max once every 30 seconds
    let last = 0;
    const throttledBump = () => {
      const now = Date.now();
      if (now - last > 30_000) {
        last = now;
        bumpActivity();
      }
    };

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((ev) => window.addEventListener(ev, throttledBump, { passive: true }));

    // Check idle every minute
    activityTimerRef.current = setInterval(() => {
      const stillUnlocked = getIsUnlocked();
      if (!stillUnlocked) {
        setIsUnlocked(false);
        emit();
      }
    }, 60_000);

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, throttledBump));
      if (activityTimerRef.current) clearInterval(activityTimerRef.current);
    };
  }, [isEnabled, isUnlocked, idleTimeoutMinutes]);

  const isLocked = isEnabled && !isUnlocked;

  const setUnlockedWithExpiry = () => {
    const until = Date.now() + DEFAULT_UNLOCK_DURATION_MS;
    localStorage.setItem(UNLOCKED_UNTIL_KEY, String(until));
    localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
  };

  const setup = useCallback(async (pin: string) => {
    if (!/^\d{4,8}$/.test(pin)) throw new Error('PIN must be 4-8 digits');
    const hash = await sha256(pin);
    localStorage.setItem(PIN_HASH_KEY, hash);
    localStorage.setItem(PIN_ENABLED_KEY, 'true');
    setUnlockedWithExpiry();
    setIsEnabled(true);
    setIsUnlocked(true);
    emit();
  }, []);

  const unlock = useCallback(async (pin: string): Promise<boolean> => {
    const stored = localStorage.getItem(PIN_HASH_KEY);
    if (!stored) return false;
    const hash = await sha256(pin);
    if (hash !== stored) return false;
    setUnlockedWithExpiry();
    setIsUnlocked(true);
    emit();
    return true;
  }, []);

  const lock = useCallback(() => {
    localStorage.removeItem(UNLOCKED_UNTIL_KEY);
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    setIsUnlocked(false);
    emit();
  }, []);

  const disable = useCallback(async (pin: string): Promise<boolean> => {
    const stored = localStorage.getItem(PIN_HASH_KEY);
    if (!stored) return false;
    const hash = await sha256(pin);
    if (hash !== stored) return false;
    localStorage.removeItem(PIN_HASH_KEY);
    localStorage.removeItem(PIN_ENABLED_KEY);
    localStorage.removeItem(UNLOCKED_UNTIL_KEY);
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    setIsEnabled(false);
    setIsUnlocked(false);
    emit();
    return true;
  }, []);

  const changePin = useCallback(async (oldPin: string, newPin: string): Promise<boolean> => {
    const ok = await unlock(oldPin);
    if (!ok) return false;
    await setup(newPin);
    return true;
  }, [unlock, setup]);

  const toggleHideStats = useCallback(() => {
    const next = !hideStats;
    localStorage.setItem(HIDE_STATS_KEY, String(next));
    setHideStats(next);
    emit();
  }, [hideStats]);

  const setIdleTimeoutMinutes = useCallback((minutes: number) => {
    const val = Math.max(0, Math.min(1440, Math.floor(minutes))); // 0-1440 (24h)
    localStorage.setItem(IDLE_TIMEOUT_KEY, String(val));
    setIdleTimeoutMinutesState(val);
    if (val > 0) {
      localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
    }
    emit();
  }, []);

  return {
    isEnabled,
    isUnlocked,
    isLocked,
    hideStats,
    idleTimeoutMinutes,
    setup,
    unlock,
    lock,
    disable,
    changePin,
    toggleHideStats,
    setIdleTimeoutMinutes,
  };
}
