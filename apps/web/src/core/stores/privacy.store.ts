import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { securityApi, type PinStatus } from '@core/security/security.api';

/* ═════════════════════════════════════════════════════════════
   PRIVACY STORE — cost/profit kis ko dikhe
   ─────────────────────────────────────────────────────────────
   Do cheezein alag alag hain:

   1. PIN khud — ab SERVER par hai (bcrypt). Har device par wohi
      chalta hai. Pehle yahan localStorage me SHA-256 hash tha, is
      liye doosre mobile par PIN kaam hi nahi karta tha aur browser
      ka data saaf karne par hamesha ke liye gayab ho jata tha.

   2. "Abhi khula hai" ki haalat — ye JAAN BOOJH kar is device par
      hi rehti hai. Malik apne phone par PIN daale to sirf us ke
      phone par cost khulti hai; counter wale ke computer par nahi.
      Waqt guzarne par khud band ho jati hai.

   `useCostHidden()`, `<HiddenValue/>` aur `<PrivacyToggle/>` ka
   istemal waisa ka waisa hai — 60 se zyada safhe inhi par chal
   rahe hain, unme kuch badalne ki zaroorat nahi.
   ═════════════════════════════════════════════════════════════ */

interface PrivacyState {
  hideCost: boolean;
  hideSales: boolean;

  /** Server se aayi hui haalat — app khulte hi bhar jati hai */
  hasPin: boolean;
  lockedRoutes: string[];
  unlockMinutes: number;
  canManage: boolean;
  /** Server se abhi tak jawab aaya hai ya nahi */
  loaded: boolean;

  /** Is device par unlock kab tak (ms timestamp) */
  unlockedUntil: number;

  toggleHideCost: () => void;
  toggleHideSales: () => void;
  setHideCost: (v: boolean) => void;
  setHideSales: (v: boolean) => void;

  /** App shuru hote hi — aur PIN badalne ke baad */
  refresh: () => Promise<PinStatus | null>;
  applyStatus: (s: PinStatus) => void;

  setPin: (pin: string, currentPin?: string) => Promise<void>;
  resetPinWithPassword: (password: string, newPin: string) => Promise<void>;
  removePin: (body: { currentPin?: string; password?: string }) => Promise<boolean>;
  verifyPin: (pin: string) => Promise<boolean>;

  unlock: (minutes?: number) => void;
  lock: () => void;
  hasPinSet: () => boolean;
  isUnlocked: () => boolean;

  /** Purane naam — pehle se mojood safhe inhein bulate hain */
  hasPin_legacy?: never;
}

export const usePrivacyStore = create<PrivacyState>()(
  persist(
    (set, get) => ({
      hideCost: false,
      hideSales: false,

      hasPin: false,
      lockedRoutes: [],
      unlockMinutes: 15,
      canManage: false,
      loaded: false,

      unlockedUntil: 0,

      toggleHideCost: () => set((s) => ({ hideCost: !s.hideCost })),
      toggleHideSales: () => set((s) => ({ hideSales: !s.hideSales })),
      setHideCost: (v) => set({ hideCost: v }),
      setHideSales: (v) => set({ hideSales: v }),

      applyStatus: (st) =>
        set((prev) => ({
          hasPin: st.hasPin,
          lockedRoutes: st.lockedRoutes ?? [],
          unlockMinutes: st.unlockMinutes || 15,
          canManage: st.canManage,
          loaded: true,
          // PIN laga hai to cost by-default chhupi rehti hai.
          // Malik ne "hamesha chhupao" chuna ho to wo bhi maanein.
          hideCost: st.hasPin ? true : st.hideCostByDefault || prev.hideCost,
          // Server par PIN hat gaya ho to purana unlock bhi be-maani
          unlockedUntil: st.hasPin ? prev.unlockedUntil : 0,
        })),

      refresh: async () => {
        try {
          const st = await securityApi.status();
          get().applyStatus(st);
          return st;
        } catch {
          // Offline ya abhi login nahi — jo pehle se maloom hai wohi
          // chalta rahe. Halat na maloom ho to cost chhupi rehti hai,
          // kyunke ghalti se dikha dena zyada bura hai.
          set({ loaded: true });
          return null;
        }
      },

      setPin: async (pin, currentPin) => {
        await securityApi.setPin(pin, currentPin);
        set({ hasPin: true, hideCost: true, unlockedUntil: 0 });
        await get().refresh();
      },

      resetPinWithPassword: async (password, newPin) => {
        await securityApi.resetPin(password, newPin);
        set({ hasPin: true, hideCost: true, unlockedUntil: 0 });
        await get().refresh();
      },

      removePin: async (body) => {
        try {
          await securityApi.removePin(body);
          set({ hasPin: false, hideCost: false, unlockedUntil: 0, lockedRoutes: [] });
          return true;
        } catch {
          return false;
        }
      },

      verifyPin: async (pin) => {
        try {
          const r = await securityApi.verifyPin(pin);
          return !!r?.valid;
        } catch {
          return false;
        }
      },

      unlock: (minutes) => {
        const m = minutes ?? get().unlockMinutes ?? 15;
        set({ unlockedUntil: Date.now() + m * 60 * 1000 });
      },

      lock: () => set({ unlockedUntil: 0 }),

      hasPinSet: () => get().hasPin,
      isUnlocked: () => Date.now() < get().unlockedUntil,
    }),
    {
      name: 'privacy-settings',
      // PIN ka hash ab kabhi device par nahi rakha jata.
      // Sirf "kya dikhana hai" ki pasand aur khula-hone ka waqt.
      partialize: (s) => ({
        hideCost: s.hideCost,
        hideSales: s.hideSales,
        unlockedUntil: s.unlockedUntil,
      }),
    },
  ),
);

/** Purane naam se bulane walon ke liye — `store.hasPin()` */
export function hasPin() {
  return usePrivacyStore.getState().hasPin;
}
