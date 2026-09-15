import { useCallback } from 'react';
import { usePrivacyStore } from '../stores/privacy.store';

/* ═════════════════════════════════════════════════════════════
   useAppLock — ab sirf ek patla sa raasta
   ─────────────────────────────────────────────────────────────
   Pehle is file ka apna alag PIN tha: localStorage me SHA-256
   hash, apna unlock ka waqt, apna idle timer. Natija ye tha ke
   dukaan me DO alag PIN chal rahe thay — ek khata lock ka aur
   ek cost chhupane ka — aur dono sirf usi browser me.

   Ab wahi ek server wala PIN sab jagah chalta hai. Ye hook
   sirf purane safhon ki khatir baqi hai jo `useAppLock()` bulate
   hain; andar se wohi `privacy.store` chalta hai.

   Naya kaam `usePrivacyStore` aur `<PageLockGate/>` se karein.
   ═════════════════════════════════════════════════════════════ */

export function useAppLock() {
  const store = usePrivacyStore();

  const isEnabled = store.hasPin;
  const isUnlocked = store.isUnlocked();

  const setup = useCallback(async (pin: string) => {
    await store.setPin(pin);
    store.unlock();
  }, [store]);

  const unlock = useCallback(async (pin: string): Promise<boolean> => {
    const ok = await store.verifyPin(pin);
    if (ok) store.unlock();
    return ok;
  }, [store]);

  const lock = useCallback(() => store.lock(), [store]);

  const disable = useCallback(
    (pin: string) => store.removePin({ currentPin: pin }),
    [store],
  );

  const changePin = useCallback(async (oldPin: string, newPin: string): Promise<boolean> => {
    try {
      await store.setPin(newPin, oldPin);
      return true;
    } catch {
      return false;
    }
  }, [store]);

  return {
    isEnabled,
    isUnlocked,
    isLocked: isEnabled && !isUnlocked,
    /** Ab safhe khud lock hote hain — ye purani setting be-kaar hai */
    hideStats: store.hideCost,
    idleTimeoutMinutes: store.unlockMinutes,

    setup,
    unlock,
    lock,
    disable,
    changePin,
    toggleHideStats: () => store.toggleHideCost(),
    setIdleTimeoutMinutes: (_m: number) => {
      /* Ab unlock ki muddat Settings → Security se set hoti hai */
    },
  };
}
