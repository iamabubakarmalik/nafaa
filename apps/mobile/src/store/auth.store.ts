import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  role: 'SUPER_ADMIN' | 'OWNER' | 'MANAGER' | 'CASHIER' | 'STAFF';
  tenantId: string;
  permissions?: string[];
  emailVerified?: boolean;
}

export interface AuthTenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  businessType?: string | null;
  businessFeatures?: Record<string, boolean> | null;
  defaultUnit?: string | null;
}

interface AuthState {
  user: AuthUser | null;
  tenant: AuthTenant | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isInitialized: boolean;

  setSession: (data: {
    user: AuthUser;
    tenant: AuthTenant;
    accessToken: string;
    refreshToken: string;
  }) => Promise<void>;
  updateTokens: (accessToken: string, refreshToken: string) => Promise<void>;
  updateTenant: (patch: Partial<AuthTenant>) => Promise<void>;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
}

const STORAGE_KEYS = {
  user: 'auth-user',
  tenant: 'auth-tenant',
  access: 'access-token',
  refresh: 'refresh-token',
} as const;

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  tenant: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isInitialized: false,

  setSession: async ({ user, tenant, accessToken, refreshToken }) => {
    set({ user, tenant, accessToken, refreshToken, isAuthenticated: true });
    try {
      await Promise.all([
        SecureStore.setItemAsync(STORAGE_KEYS.user, JSON.stringify(user)),
        SecureStore.setItemAsync(STORAGE_KEYS.tenant, JSON.stringify(tenant)),
        SecureStore.setItemAsync(STORAGE_KEYS.access, accessToken),
        SecureStore.setItemAsync(STORAGE_KEYS.refresh, refreshToken),
      ]);
    } catch (e) {
      console.error('[auth.store] SecureStore persist failed:', e);
    }
  },

  updateTokens: async (accessToken, refreshToken) => {
    set({ accessToken, refreshToken });
    try {
      await Promise.all([
        SecureStore.setItemAsync(STORAGE_KEYS.access, accessToken),
        SecureStore.setItemAsync(STORAGE_KEYS.refresh, refreshToken),
      ]);
    } catch (e) {
      console.error('[auth.store] Token update persist failed:', e);
    }
  },

  updateTenant: async (patch) => {
    const current = get().tenant;
    if (!current) return;
    const updated = { ...current, ...patch };
    set({ tenant: updated });
    try {
      await SecureStore.setItemAsync(STORAGE_KEYS.tenant, JSON.stringify(updated));
    } catch (e) {
      console.error('[auth.store] Tenant update persist failed:', e);
    }
  },

  logout: async () => {
    set({
      user: null,
      tenant: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    });
    try {
      await Promise.all([
        SecureStore.deleteItemAsync(STORAGE_KEYS.user),
        SecureStore.deleteItemAsync(STORAGE_KEYS.tenant),
        SecureStore.deleteItemAsync(STORAGE_KEYS.access),
        SecureStore.deleteItemAsync(STORAGE_KEYS.refresh),
      ]);
    } catch (e) {
      console.error('[auth.store] Logout cleanup failed:', e);
    }
  },

  initialize: async () => {
    try {
      const [userStr, tenantStr, accessToken, refreshToken] = await Promise.all([
        SecureStore.getItemAsync(STORAGE_KEYS.user),
        SecureStore.getItemAsync(STORAGE_KEYS.tenant),
        SecureStore.getItemAsync(STORAGE_KEYS.access),
        SecureStore.getItemAsync(STORAGE_KEYS.refresh),
      ]);

      if (userStr && tenantStr && accessToken && refreshToken) {
        set({
          user: JSON.parse(userStr),
          tenant: JSON.parse(tenantStr),
          accessToken,
          refreshToken,
          isAuthenticated: true,
        });
      }
    } catch (e) {
      console.error('[auth.store] Initialization failed:', e);
    } finally {
      set({ isInitialized: true });
    }
  },
}));
