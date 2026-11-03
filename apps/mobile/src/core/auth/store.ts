/**
 * Signed-in session.
 *
 * Tokens live in the Keychain / Keystore (expo-secure-store); the user and
 * tenant records (not secret, and too large for SecureStore on Android) live
 * in the device store. The keys match the 1.x app, so people stay signed in
 * after the update.
 *
 * Branch rules follow the web: staff are locked to their assigned branch;
 * owners can switch, including "All shops".
 */

import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { kv } from '../storage/kv';
import { emit } from '../events';
import type { AuthSession, AuthTenant, AuthUser } from './types';

const SECURE = { access: 'access-token', refresh: 'refresh-token', legacyUser: 'auth-user', legacyTenant: 'auth-tenant' } as const;
const KV = { user: 'nafaa.auth.user', tenant: 'nafaa.auth.tenant', shop: 'nafaa.auth.shop' } as const;

export interface AuthState {
  user: AuthUser | null;
  tenant: AuthTenant | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  /** Stored session has been read (the app can decide where to go). */
  isInitialized: boolean;
  currentShopId: string | null;

  setSession: (session: AuthSession) => Promise<void>;
  updateTokens: (accessToken: string, refreshToken: string) => Promise<void>;
  updateTenant: (patch: Partial<AuthTenant>) => void;
  updateUser: (patch: Partial<AuthUser>) => void;
  setCurrentShop: (shopId: string | null) => void;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
}

const isOwnerRole = (role?: string) => role === 'OWNER' || role === 'SUPER_ADMIN';

function resolveShopId(user: AuthUser, previous: string | null): string | null {
  if (!isOwnerRole(user.role)) return user.shopId ?? user.assignedShop?.id ?? null;
  return previous ?? user.shopId ?? user.assignedShop?.id ?? null;
}

function clearServerCache() {
  // Loaded lazily: the query client imports the API client, which imports this store.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { queryClient } = require('../query/client') as typeof import('../query/client');
  queryClient.cancelQueries().catch(() => undefined);
  queryClient.clear();
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  tenant: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isInitialized: false,
  currentShopId: null,

  setSession: async ({ user, tenant, accessToken, refreshToken }) => {
    const previousUser = get().user;
    const storedUser = kv.get<AuthUser | null>(KV.user, null);
    // A stored shop only carries over when the same person signs in again.
    const keepShop =
      previousUser?.id === user.id
        ? get().currentShopId
        : storedUser?.id === user.id
          ? kv.get<string | null>(KV.shop, null)
          : null;
    const currentShopId = resolveShopId(user, keepShop);
    set({ user, tenant, accessToken, refreshToken, isAuthenticated: true, currentShopId });
    kv.set(KV.user, user);
    kv.set(KV.tenant, tenant);
    kv.set(KV.shop, currentShopId);
    await Promise.all([
      SecureStore.setItemAsync(SECURE.access, accessToken),
      SecureStore.setItemAsync(SECURE.refresh, refreshToken),
    ]).catch(() => undefined);
  },

  updateTokens: async (accessToken, refreshToken) => {
    set({ accessToken, refreshToken });
    await Promise.all([
      SecureStore.setItemAsync(SECURE.access, accessToken),
      SecureStore.setItemAsync(SECURE.refresh, refreshToken),
    ]).catch(() => undefined);
  },

  updateTenant: (patch) => {
    const tenant = get().tenant;
    if (!tenant) return;
    const next = { ...tenant, ...patch };
    set({ tenant: next });
    kv.set(KV.tenant, next);
  },

  updateUser: (patch) => {
    const user = get().user;
    if (!user) return;
    const next = { ...user, ...patch };
    const currentShopId = resolveShopId(next, get().currentShopId);
    set({ user: next, currentShopId });
    kv.set(KV.user, next);
  },

  setCurrentShop: (shopId) => {
    const { user, currentShopId: previous } = get();
    if (user && !isOwnerRole(user.role) && user.shopId && shopId !== user.shopId) return;
    if (shopId === previous) return;
    set({ currentShopId: shopId });
    kv.set(KV.shop, shopId);
    // Every cached response belongs to the old branch now.
    if (previous) { clearServerCache(); emit('shop:changed', undefined); }
  },

  logout: async () => {
    set({ user: null, tenant: null, accessToken: null, refreshToken: null, isAuthenticated: false, currentShopId: null });
    kv.remove(KV.user);
    kv.remove(KV.tenant);
    kv.remove(KV.shop);
    try {
      clearServerCache();
    } catch {
      // Query client not created yet.
    }
    await Promise.all([
      SecureStore.deleteItemAsync(SECURE.access),
      SecureStore.deleteItemAsync(SECURE.refresh),
      SecureStore.deleteItemAsync(SECURE.legacyUser),
      SecureStore.deleteItemAsync(SECURE.legacyTenant),
    ]).catch(() => undefined);
    emit('session:expired', undefined);
  },

  initialize: async () => {
    try {
      const [accessToken, refreshToken] = await Promise.all([
        SecureStore.getItemAsync(SECURE.access),
        SecureStore.getItemAsync(SECURE.refresh),
      ]);
      let user = kv.get<AuthUser | null>(KV.user, null);
      let tenant = kv.get<AuthTenant | null>(KV.tenant, null);
      // 1.x kept these in SecureStore; move them once.
      if (!user || !tenant) {
        const [u, tn] = await Promise.all([
          SecureStore.getItemAsync(SECURE.legacyUser),
          SecureStore.getItemAsync(SECURE.legacyTenant),
        ]);
        if (u && tn) {
          user = JSON.parse(u) as AuthUser;
          tenant = JSON.parse(tn) as AuthTenant;
          kv.set(KV.user, user);
          kv.set(KV.tenant, tenant);
        }
      }
      if (accessToken && refreshToken && user && tenant) {
        const currentShopId = resolveShopId(user, kv.get<string | null>(KV.shop, null));
        set({ user, tenant, accessToken, refreshToken, isAuthenticated: true, currentShopId });
      }
    } catch {
      // A broken store means signed out.
    } finally {
      set({ isInitialized: true });
    }
  },
}));

/** True when a session was stored by this or the 1.x app (synchronous, for boot). */
export function hasStoredSession(): boolean {
  return !!kv.get<AuthUser | null>(KV.user, null);
}

export const useIsOwner = () => useAuthStore((s) => isOwnerRole(s.user?.role));
export const useCanSwitchShops = useIsOwner;
export const useActiveShopId = () => useAuthStore((s) => s.currentShopId);
export { isOwnerRole };
