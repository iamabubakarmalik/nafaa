import { useState, useEffect, useCallback } from 'react';

const PRIVACY_ENABLED_KEY = 'nafaa.sales.privacy.enabled';
const PRIVACY_PASSWORD_KEY = 'nafaa.sales.privacy.hash';
const PRIVACY_UNLOCKED_UNTIL_KEY = 'nafaa.sales.privacy.unlocked-until';
const HIDE_AMOUNTS_KEY = 'nafaa.sales.hide-amounts';
const UNLOCK_DURATION_MS = 8 * 60 * 60 * 1000;

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'nafaa-salt-2026');
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function isUnlockValid(): boolean {
  try {
    const until = localStorage.getItem(PRIVACY_UNLOCKED_UNTIL_KEY);
    if (!until) return false;
    const t = parseInt(until, 10);
    if (isNaN(t)) return false;
    return Date.now() < t;
  } catch {
    return false;
  }
}

export function useSalesPrivacy() {
  const [isEnabled, setIsEnabled] = useState<boolean>(() => {
    try { return localStorage.getItem(PRIVACY_ENABLED_KEY) === 'true'; } catch { return false; }
  });
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => isUnlockValid());
  const [hideAmounts, setHideAmounts] = useState<boolean>(() => {
    try { return localStorage.getItem(HIDE_AMOUNTS_KEY) === 'true'; } catch { return false; }
  });

  useEffect(() => {
    const onFocus = () => setIsUnlocked(isUnlockValid());
    const onStorage = (e: StorageEvent) => {
      if (e.key === PRIVACY_UNLOCKED_UNTIL_KEY) setIsUnlocked(isUnlockValid());
      if (e.key === PRIVACY_ENABLED_KEY) setIsEnabled(e.newValue === 'true');
      if (e.key === HIDE_AMOUNTS_KEY) setHideAmounts(e.newValue === 'true');
    };
    window.addEventListener('focus', onFocus);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const enable = useCallback(async (password: string) => {
    if (password.length < 4) throw new Error('Password minimum 4 characters');
    const hash = await hashPassword(password);
    const until = Date.now() + UNLOCK_DURATION_MS;
    localStorage.setItem(PRIVACY_ENABLED_KEY, 'true');
    localStorage.setItem(PRIVACY_PASSWORD_KEY, hash);
    localStorage.setItem(PRIVACY_UNLOCKED_UNTIL_KEY, String(until));
    setIsEnabled(true);
    setIsUnlocked(true);
  }, []);

  const disable = useCallback(async (password: string) => {
    const hash = await hashPassword(password);
    const stored = localStorage.getItem(PRIVACY_PASSWORD_KEY);
    if (hash !== stored) throw new Error('Ghalat password');
    localStorage.removeItem(PRIVACY_ENABLED_KEY);
    localStorage.removeItem(PRIVACY_PASSWORD_KEY);
    localStorage.removeItem(PRIVACY_UNLOCKED_UNTIL_KEY);
    setIsEnabled(false);
    setIsUnlocked(false);
  }, []);

  const unlock = useCallback(async (password: string) => {
    const hash = await hashPassword(password);
    const stored = localStorage.getItem(PRIVACY_PASSWORD_KEY);
    if (hash !== stored) throw new Error('Ghalat password');
    const until = Date.now() + UNLOCK_DURATION_MS;
    localStorage.setItem(PRIVACY_UNLOCKED_UNTIL_KEY, String(until));
    setIsUnlocked(true);
  }, []);

  const lock = useCallback(() => {
    localStorage.removeItem(PRIVACY_UNLOCKED_UNTIL_KEY);
    setIsUnlocked(false);
  }, []);

  const toggleHideAmounts = useCallback(() => {
    setHideAmounts((prev) => {
      const next = !prev;
      try { localStorage.setItem(HIDE_AMOUNTS_KEY, String(next)); } catch {}
      return next;
    });
  }, []);

  return {
    isEnabled,
    isUnlocked,
    isLocked: isEnabled && !isUnlocked,
    hideStats: hideAmounts,
    hideAmounts,
    enable,
    disable,
    unlock,
    lock,
    toggleHideStats: toggleHideAmounts,
    toggleHideAmounts,
  };
}
