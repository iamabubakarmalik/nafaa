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

  // CRITICAL: Update Zustand state FIRST (synchronous), then persist to SecureStore
  // This prevents the race condition where navigation happens before token saved
  setSession: async ({ user, tenant, accessToken, refreshToken }) => {
    // 1. Update in-memory state IMMEDIATELY (sync) so guards see logged-in state
    set({ user, tenant, accessToken, refreshToken, isAuthenticated: true });

    // 2. Persist to SecureStore in background (parallel, non-blocking)
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

  // Used by API client when refreshing access token
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

  logout: async () => {
    // Clear state immediately
    set({
      user: null,
      tenant: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    });
    // Clear storage in background
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
