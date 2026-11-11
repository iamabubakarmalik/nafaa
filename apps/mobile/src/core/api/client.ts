/**
 * The one API client for the app.
 *
 *  - Adds the access token and the active branch (`x-shop-id`).
 *  - Translates server messages into the user's language (messageKey/params
 *    or known fixed text), like the web client.
 *  - Unwraps the `{ success, data }` envelope: `res.data` is the payload.
 *  - Refreshes the access token once on 401 (parallel requests share one
 *    refresh). The session ends only when the refresh itself is refused; a
 *    network failure keeps the user signed in.
 *  - 402 (trial or plan ended) raises `subscription:required`; it never logs out.
 *    A 402 PLAN_LIMIT (a full plan limit) does not: the screen shows the error.
 */

import axios, { type AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios';
import Constants from 'expo-constants';
import { useAuthStore } from '../auth/store';
import { SHOP_HEADER } from '../auth/shopScope';
import { translateBody } from '../i18n/serverMessage';
import { currentLocale } from '../i18n/runtime';
import { emit } from '../events';

function resolveApiUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  if (!__DEV__) return 'https://api.nafaa.pk/api';
  const hostUri = Constants.expoConfig?.hostUri;
  return hostUri ? `http://${hostUri.split(':')[0]}:4000/api` : 'http://localhost:4000/api';
}

export const API_URL = resolveApiUrl();
export const APP_URL = process.env.EXPO_PUBLIC_APP_URL || 'https://nafaa.pk';

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

type RequestHook = (config: InternalAxiosRequestConfig) => InternalAxiosRequestConfig | void;
const requestHooks = new Set<RequestHook>();

/**
 * Lets other core modules adjust every request (the offline engine adds an
 * `Idempotency-Key` header). Returns a function that removes the hook.
 */
export function addRequestHook(hook: RequestHook): () => void {
  requestHooks.add(hook);
  return () => requestHooks.delete(hook);
}

apiClient.interceptors.request.use((config) => {
  const { accessToken, currentShopId } = useAuthStore.getState();
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  if (currentShopId) config.headers[SHOP_HEADER] = currentShopId;
  config.headers['Accept-Language'] = currentLocale();
  let next = config;
  for (const hook of requestHooks) next = hook(next) ?? next;
  return next;
});

let refreshing: Promise<string | null> | null = null;

/** Refreshes the access token; null when the session is over or the network failed. */
export function refreshAccessToken(): Promise<string | null> {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    const refreshToken = useAuthStore.getState().refreshToken;
    if (!refreshToken) return null;
    try {
      const res = await axios.post(`${API_URL}/auth/refresh`, { refreshToken }, { timeout: 15_000 });
      const data = res.data?.data ?? res.data;
      if (data?.accessToken && data?.refreshToken) {
        await useAuthStore.getState().updateTokens(data.accessToken, data.refreshToken);
        return data.accessToken as string;
      }
      return null;
    } catch (e) {
      const status = (e as AxiosError).response?.status;
      if (status === 401 || status === 403) await useAuthStore.getState().logout();
      return null;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

const AUTH_PATHS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/google'];

apiClient.interceptors.response.use(
  (res) => {
    const body = res.data;
    translateBody(body, false);
    if (body && typeof body === 'object' && 'success' in body && 'data' in body) {
      translateBody(body.data, false);
      res.data = body.data;
    }
    return res;
  },
  async (error: AxiosError) => {
    translateBody(error.response?.data, true);
    const original = error.config as (AxiosRequestConfig & { _retried?: boolean }) | undefined;
    const status = error.response?.status;
    const isAuthPath = AUTH_PATHS.some((p) => original?.url?.includes(p));

    if (status === 401 && original && !original._retried && !isAuthPath) {
      original._retried = true;
      const token = await refreshAccessToken();
      if (token) {
        original.headers = { ...original.headers, Authorization: `Bearer ${token}` };
        return apiClient(original);
      }
    }
    if (status === 402 && (error.response?.data as { code?: string } | undefined)?.code !== 'PLAN_LIMIT') {
      const message = (error.response?.data as { message?: string } | undefined)?.message;
      emit('subscription:required', { message });
    }
    return Promise.reject(error);
  },
);
