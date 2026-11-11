import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN_STAFF';
  lastLoginAt?: string | null;
  /** Filled by /admin/auth/me; older saved sessions may not have them until it loads. */
  isSuperAdmin?: boolean;
  adminRole?: string | null;
  adminPermissions?: string[];
  totpEnabled?: boolean;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AdminUser | null;
  isAuthenticated: boolean;
  setSession: (data: {
    accessToken: string;
    refreshToken: string;
    user: AdminUser;
  }) => void;
  setTokens: (a: string, r: string) => void;
  setUser: (user: AdminUser) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      setSession: ({ accessToken, refreshToken, user }) =>
        set({ accessToken, refreshToken, user, isAuthenticated: true }),
      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken }),
      setUser: (user) => set({ user }),
      logout: () =>
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          isAuthenticated: false,
        }),
    }),
    { name: 'nafaa-admin-auth' },
  ),
);
