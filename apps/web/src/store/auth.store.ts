import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: 'SUPER_ADMIN' | 'OWNER' | 'MANAGER' | 'CASHIER' | 'STAFF';
  permissions?: string[];
  emailVerified: boolean;
  avatarUrl?: string;
}

export interface AuthTenant {
  id: string;
  name: string;
  slug: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'TRIAL';
  currency: string;
  language: string;
  businessType?: string | null;
  businessFeatures?: Record<string, boolean> | null;
  defaultUnit?: string | null;
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
  updateTenant: (patch: Partial<AuthTenant>) => void;
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
      setUser: (user, tenant) => set({ user, tenant, isAuthenticated: true }),
      updateTenant: (patch) =>
        set((state) => ({
          tenant: state.tenant ? { ...state.tenant, ...patch } : null,
        })),
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
