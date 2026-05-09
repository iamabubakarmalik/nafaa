import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  role: string;
  tenantId: string;
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
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  tenant: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isInitialized: false,

  setSession: async ({ user, tenant, accessToken, refreshToken }) => {
    await SecureStore.setItemAsync('auth-user', JSON.stringify(user));
    await SecureStore.setItemAsync('auth-tenant', JSON.stringify(tenant));
    await SecureStore.setItemAsync('access-token', accessToken);
    await SecureStore.setItemAsync('refresh-token', refreshToken);
    set({ user, tenant, accessToken, refreshToken, isAuthenticated: true });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('auth-user');
    await SecureStore.deleteItemAsync('auth-tenant');
    await SecureStore.deleteItemAsync('access-token');
    await SecureStore.deleteItemAsync('refresh-token');
    set({
      user: null,
      tenant: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    });
  },

  initialize: async () => {
    try {
      const userStr = await SecureStore.getItemAsync('auth-user');
      const tenantStr = await SecureStore.getItemAsync('auth-tenant');
      const accessToken = await SecureStore.getItemAsync('access-token');
      const refreshToken = await SecureStore.getItemAsync('refresh-token');

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
      console.error('Auth initialization failed:', e);
    } finally {
      set({ isInitialized: true });
    }
  },
}));
