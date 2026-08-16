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
  assignedShop?: { id: string; name: string; isMain: boolean; type?: string; isActive?: boolean } | null;
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

/**
 * Determine which shopId to use as active shop:
 * - Non-owner (Manager/Cashier/Staff): MUST use their assigned shopId
 * - Owner/SuperAdmin: use currently-persisted currentShopId, otherwise assignedShop.id (main)
 */
function resolveShopId(user: AuthUser, previousShopId: string | null): string | null {
  // Non-owners locked to assigned shop
  if (user.role !== 'OWNER' && user.role !== 'SUPER_ADMIN') {
    return user.shopId ?? user.assignedShop?.id ?? null;
  }
  // Owner — keep previous choice if still available, else fallback to assigned (main)
  if (previousShopId) return previousShopId;
  return user.shopId ?? user.assignedShop?.id ?? null;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      tenant: null,
      isAuthenticated: false,
      currentShopId: null,
      setSession: ({ accessToken, refreshToken, user, tenant }) => {
        const currentShopId = resolveShopId(user, get().currentShopId);
        set({
          accessToken, refreshToken, user, tenant,
          isAuthenticated: true,
          currentShopId,
        });
      },
      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken }),
      setUser: (user, tenant) => {
        const currentShopId = resolveShopId(user, get().currentShopId);
        set({ user, tenant, isAuthenticated: true, currentShopId });
      },
      updateTenant: (patch) =>
        set((state) => ({
          tenant: state.tenant ? { ...state.tenant, ...patch } : null,
        })),
      updateUser: (patch) =>
        set((state) => {
          const newUser = state.user ? { ...state.user, ...patch } : null;
          const newShopId = newUser
            ? resolveShopId(newUser, state.currentShopId)
            : state.currentShopId;
          return { user: newUser, currentShopId: newShopId };
        }),
      setCurrentShop: (shopId) => {
        const state = get();
        // Non-owner cannot switch away from assigned shop
        if (
          state.user &&
          state.user.role !== 'OWNER' &&
          state.user.role !== 'SUPER_ADMIN' &&
          state.user.shopId &&
          shopId !== state.user.shopId
        ) {
          return; // silently ignore
        }
        set({ currentShopId: shopId });
      },
      logout: async () => {
        try {
          const { clearAllOfflineData } = await import('@core/lib/offline/db');
          await clearAllOfflineData();
        } catch (e) {
          console.warn('Failed to clear offline data:', e);
        }
        // Query cache bhi clear (shared device privacy)
        try {
          const { clearQueryCache } = await import('@core/lib/offline/queryPersister');
          await clearQueryCache();
        } catch {}
        // Offline login credential bhi clear
        try {
          const { clearOfflineCredential } = await import('@core/lib/offline/offlineAuth');
          clearOfflineCredential();
        } catch {}
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

/**
 * Helper hook — returns the effective active shopId
 * (respects role-based locking)
 */
export function useActiveShopId(): string | null {
  return useAuthStore((s) => s.currentShopId);
}

/**
 * Helper — returns whether user can switch shops
 */
export function useCanSwitchShops(): boolean {
  return useAuthStore((s) => s.user?.role === 'OWNER' || s.user?.role === 'SUPER_ADMIN');
}
