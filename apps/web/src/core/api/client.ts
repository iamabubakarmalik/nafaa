import axios from 'axios';
import { useAuthStore } from '@core/stores/auth.store';
import { SHOP_HEADER } from '@core/lib/shopScope';
import { hasTranslation, t, type Params } from '@core/i18n/runtime';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const { accessToken, currentShopId } = useAuthStore.getState();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  // ─── Active branch ───────────────────────────────────────────
  // Every tenant-scoped endpoint narrows by this. `all` asks for the owner's
  // consolidated view; omitting it entirely means the same thing, so requests
  // made before a shop is picked still behave like the old single-shop app.
  if (currentShopId) {
    config.headers[SHOP_HEADER] = currentShopId;
  }
  return config;
});

/**
 * Server messages are written in the source language (Roman Urdu or English).
 * They are translated here, once, so every screen that shows
 * `error.response.data.message` gets the user's language without changes.
 * Messages with values come as `messageKey` + `params` (see the API's
 * common/i18n/api-message.ts).
 */
function translateBody(body: unknown, isError: boolean) {
  if (!body || typeof body !== 'object') return;
  const b = body as { message?: unknown; messageKey?: unknown; params?: unknown };
  if (typeof b.messageKey === 'string') {
    b.message = t(b.messageKey, (b.params ?? undefined) as Params | undefined);
  } else if (typeof b.message === 'string') {
    if (isError || hasTranslation(b.message)) b.message = t(b.message);
  } else if (Array.isArray(b.message) && isError) {
    b.message = b.message.map((m) => (typeof m === 'string' ? t(m) : m));
  }
}

let isRefreshing = false;
let pendingQueue: Array<(t: string) => void> = [];

apiClient.interceptors.response.use(
  (res) => {
    translateBody(res.data, false);
    // Most success bodies are wrapped: { success, data: { message } }.
    translateBody((res.data as { data?: unknown } | undefined)?.data, false);
    return res;
  },
  async (error) => {
    translateBody(error.response?.data, true);
    const original = error.config;
    const status = error.response?.status;

    if (status === 401 && !original._retry) {
      original._retry = true;

      // ─── Offline / network down → refresh attempt mat karo ───
      // Session rakho — offline mode me kaam chalta rahe
      if (!navigator.onLine) {
        console.warn('[api] 401 while offline — keeping session, will retry online');
        return Promise.reject(error);
      }

      const refreshToken = useAuthStore.getState().refreshToken;
      if (!refreshToken) {
        // Refresh token hi nahi — ab logout
        useAuthStore.getState().logout();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve) => {
          pendingQueue.push((token) => {
            original.headers.Authorization = `Bearer ${token}`;
            resolve(apiClient(original));
          });
        });
      }

      isRefreshing = true;
      try {
        const { data } = await axios.post(
          `${apiClient.defaults.baseURL}/auth/refresh`,
          { refreshToken },
        );
        const tokens = data.data;
        useAuthStore.getState().setTokens(tokens.accessToken, tokens.refreshToken);
        pendingQueue.forEach((cb) => cb(tokens.accessToken));
        pendingQueue = [];
        original.headers.Authorization = `Bearer ${tokens.accessToken}`;
        return apiClient(original);
      } catch (e: any) {
        const refreshStatus = e?.response?.status;

        // Refresh endpoint ne 401/403 diya = session sach me khatam
        if (refreshStatus === 401 || refreshStatus === 403) {
          useAuthStore.getState().logout();
        } else {
          // Network error / server down — session rakho
          console.warn('[api] Refresh failed (network) — keeping session');
        }
        return Promise.reject(e);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  },
);
