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
  emailVerifiedAt?: string | null;
  avatarUrl?: string;
  shopId?: string | null;
  assignedShop?: { id: string; name: string; isMain: boolean } | null;
  hasPassword?: boolean;
  googleId?: string | null;
  authProvider?: 'EMAIL' | 'GOOGLE' | 'HYBRID';
  createdAt?: string;
  lastLoginAt?: string | null;
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
  currentShopId: string | null;
  setSession: (data: {
    accessToken: string;
    refreshToken: string;
    user: AuthUser;
    tenant: AuthTenant;
  }) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: AuthUser, tenant: AuthTenant) => void;
  updateTenant: (patch: Partial<AuthTenant>) => void;
  updateUser: (patch: Partial<AuthUser>) => void;
  setCurrentShop: (shopId: string | null) => void;
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
      currentShopId: null,
      setSession: ({ accessToken, refreshToken, user, tenant }) =>
        set({ accessToken, refreshToken, user, tenant, isAuthenticated: true }),
      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken }),
      setUser: (user, tenant) => set({ user, tenant, isAuthenticated: true }),
      updateTenant: (patch) =>
        set((state) => ({
          tenant: state.tenant ? { ...state.tenant, ...patch } : null,
        })),
      updateUser: (patch) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...patch } : null,
        })),
      setCurrentShop: (shopId) => set({ currentShopId: shopId }),
      logout: async () => {
        try {
          const { clearAllOfflineData } = await import('@/lib/offline/db');
          await clearAllOfflineData();
        } catch (e) {
          console.warn('Failed to clear offline data:', e);
        }
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          tenant: null,
          isAuthenticated: false,
          currentShopId: null,
        });
      },
    }),
    { name: 'nafaa-auth' },
  ),
);
