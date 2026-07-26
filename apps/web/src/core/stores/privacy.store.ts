import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Simple SHA-256 hash for PIN storage.
 * NOT high-security — just prevents casual peeking.
 */
async function sha256(text: string): Promise<string> {
  if (!text) return '';
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

interface PrivacyState {
  hideCost: boolean;
  hideSales: boolean;
  pinHash: string | null;         // Owner's PIN hash (if set)
  unlockedUntil: number;          // Timestamp when temporary unlock expires

  toggleHideCost: () => void;
  toggleHideSales: () => void;
  setHideCost: (v: boolean) => void;
  setHideSales: (v: boolean) => void;

  // PIN management
  setPin: (pin: string) => Promise<void>;
  removePin: (currentPin: string) => Promise<boolean>;
  verifyPin: (pin: string) => Promise<boolean>;
  unlock: (minutes: number) => void;
  lock: () => void;
  hasPin: () => boolean;
  isUnlocked: () => boolean;
}

export const usePrivacyStore = create<PrivacyState>()(
  persist(
    (set, get) => ({
      hideCost: false,
      hideSales: false,
      pinHash: null,
      unlockedUntil: 0,

      toggleHideCost: () => set((s) => ({ hideCost: !s.hideCost })),
      toggleHideSales: () => set((s) => ({ hideSales: !s.hideSales })),
      setHideCost: (v) => set({ hideCost: v }),
      setHideSales: (v) => set({ hideSales: v }),

      setPin: async (pin: string) => {
        const hash = await sha256(pin);
        set({ pinHash: hash, hideCost: true, unlockedUntil: 0 });
      },

      removePin: async (currentPin: string) => {
        const hash = await sha256(currentPin);
        if (hash !== get().pinHash) return false;
        set({ pinHash: null, hideCost: false, unlockedUntil: 0 });
        return true;
      },

      verifyPin: async (pin: string) => {
        const hash = await sha256(pin);
        return hash === get().pinHash;
      },

      unlock: (minutes: number) => {
        set({ unlockedUntil: Date.now() + minutes * 60 * 1000 });
      },

      lock: () => set({ unlockedUntil: 0 }),

      hasPin: () => !!get().pinHash,
      isUnlocked: () => Date.now() < get().unlockedUntil,
    }),
    {
      name: 'privacy-settings',
      partialize: (s) => ({
        hideCost: s.hideCost,
        hideSales: s.hideSales,
        pinHash: s.pinHash,
      }),
    },
  ),
);
