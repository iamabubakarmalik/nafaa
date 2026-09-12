import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { isAllShops, shopParam } from '@core/lib/shopScope';

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
  // Non-owners locked to assigned shop — 'All Shops' is never theirs to pick
  if (user.role !== 'OWNER' && user.role !== 'SUPER_ADMIN') {
    return user.shopId ?? user.assignedShop?.id ?? null;
  }
  // Owner — keep previous choice (including the ALL_SHOPS sentinel), else main
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
      
        // Trigger prewarm after successful login (loads all pages' data in background)
        if (typeof window !== 'undefined' && navigator.onLine) {
          setTimeout(() => {
            import('@core/lib/offline/offlinePrewarm').then(({ prewarmAfterLogin }) => {
              prewarmAfterLogin().catch(() => {});
            }).catch(() => {});
            // Also trigger full sync for fresh data
            import('@core/lib/offline/syncEngine').then(({ downloadAllData }) => {
              downloadAllData(true).catch(() => {});
            }).catch(() => {});
          }, 500);
        }
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
        // Non-owner cannot switch away from assigned shop (nor pick All Shops)
        if (
          state.user &&
          state.user.role !== 'OWNER' &&
          state.user.role !== 'SUPER_ADMIN' &&
          state.user.shopId &&
          shopId !== state.user.shopId
        ) {
          return; // silently ignore
        }
        const previous = state.currentShopId;
        if (shopId === previous) return;

        set({ currentShopId: shopId });

        // Only a real *switch* needs the cache thrown away. Picking the first
        // branch on load (null → shop) has nothing stale to clear, and doing it
        // there would wipe the very queries that are still loading.
        if (!previous) return;

        // Every server response now belongs to a different branch. Almost no
        // query key carries the shop id, so the cache has to go — otherwise
        // the new branch renders the old branch's sales, stock and khata.
        import('@core/lib/queryClient')
          .then(({ resetServerCache }) => resetServerCache())
          .catch(() => {});

        // Offline mirror is per-branch too — pull the new branch's data down.
        if (typeof window !== 'undefined' && navigator.onLine) {
          import('@core/lib/offline/syncEngine')
            .then(({ downloadAllData }) => downloadAllData(true).catch(() => {}))
            .catch(() => {});
        }
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
        // NOTE: Offline credential ko PRESERVE karo — user offline wapis login kar sake
        // Sirf 'Switch Account' se clear hota hai (LoginPage pe button)
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
 * (respects role-based locking). Can be the ALL_SHOPS sentinel for owners.
 */
export function useActiveShopId(): string | null {
  return useAuthStore((s) => s.currentShopId);
}

/**
 * The active shopId for use as a query param / body field — `undefined` when
 * the owner is viewing All Shops or hasn't picked a branch yet.
 */
export function useShopParam(): string | undefined {
  return useAuthStore((s) => shopParam(s.currentShopId));
}

/** True when the owner is on the consolidated cross-branch view. */
export function useIsAllShops(): boolean {
  return useAuthStore((s) => isAllShops(s.currentShopId));
}

/**
 * Helper — returns whether user can switch shops
 */
export function useCanSwitchShops(): boolean {
  return useAuthStore((s) => s.user?.role === 'OWNER' || s.user?.role === 'SUPER_ADMIN');
}
