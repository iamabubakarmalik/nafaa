import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: 'OWNER' | 'MANAGER' | 'CASHIER' | 'STAFF';
  emailVerified: boolean;
}

export interface AuthTenant {
  id: string;
  name: string;
  slug: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'TRIAL';
  currency: string;
  language: string;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  tenant: AuthTenant | null;
  isAuthenticated: boolean;
  setSession: (data: {
    accessToken: string;
    refreshToken: string;
    user: AuthUser;
    tenant: AuthTenant;
  }) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: AuthUser, tenant: AuthTenant) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      tenant: null,
      isAuthenticated: false,
      setSession: ({ accessToken, refreshToken, user, tenant }) =>
        set({ accessToken, refreshToken, user, tenant, isAuthenticated: true }),
      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken }),
      setUser: (user, tenant) => set({ user, tenant }),
      logout: () =>
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          tenant: null,
          isAuthenticated: false,
        }),
    }),
    { name: 'nafaa-auth' },
  ),
);
