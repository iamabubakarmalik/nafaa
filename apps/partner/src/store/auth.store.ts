/**
 * Signed-in partner: tokens and the last known profile, kept in
 * localStorage so the app opens straight to the dashboard (also offline).
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Me } from '@/api/types';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  me: Me | null;
  setSession: (s: { accessToken: string; refreshToken: string; partner?: Me }) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setMe: (me: Me) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      me: null,
      setSession: ({ accessToken, refreshToken, partner }) => set((s) => ({ accessToken, refreshToken, me: partner ?? s.me })),
      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      setMe: (me) => set({ me }),
      clear: () => set({ accessToken: null, refreshToken: null, me: null }),
    }),
    { name: 'nafaa-partner-auth', version: 1 },
  ),
);
