/**
 * HTTP client for the partner API.
 *
 * Adds the access token, unwraps the {success, data} envelope, and on a 401
 * refreshes the session once through /partner/auth/refresh. Parallel 401s
 * share one refresh; if it fails the partner is signed out.
 */

import axios, { AxiosError, type AxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/store/auth.store';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export const http = axios.create({ baseURL: API_URL, timeout: 30_000 });

http.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing: Promise<string | null> | null = null;

async function refreshSession(): Promise<string | null> {
  const refreshToken = useAuthStore.getState().refreshToken;
  if (!refreshToken) return null;
  try {
    const res = await axios.post(`${API_URL}/partner/auth/refresh`, { refreshToken }, { timeout: 20_000 });
    const data = res.data?.data ?? res.data;
    if (!data?.accessToken) return null;
    useAuthStore.getState().setTokens(data.accessToken, data.refreshToken);
    return data.accessToken as string;
  } catch (e) {
    // Offline: keep the session; only a real rejection signs the partner out.
    if (axios.isAxiosError(e) && !e.response) throw e;
    return null;
  }
}

http.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as (AxiosRequestConfig & { _retried?: boolean }) | undefined;
    const url = original?.url ?? '';
    const isAuthCall = /partner\/auth\/(login|apply|refresh)/.test(url);
    if (error.response?.status === 401 && original && !original._retried && !isAuthCall) {
      original._retried = true;
      refreshing ??= refreshSession().finally(() => { refreshing = null; });
      const token = await refreshing;
      if (token) {
        original.headers = { ...(original.headers ?? {}), Authorization: `Bearer ${token}` };
        return http(original);
      }
      useAuthStore.getState().clear();
    }
    return Promise.reject(error);
  },
);

/** Unwraps the API envelope. */
const unwrap = <T>(body: unknown): T => {
  const b = body as { success?: boolean; data?: T };
  return (b && typeof b === 'object' && 'data' in b ? b.data : body) as T;
};

export const api = {
  get: async <T>(url: string, params?: Record<string, unknown>) => unwrap<T>((await http.get(url, { params })).data),
  post: async <T>(url: string, body?: unknown) => unwrap<T>((await http.post(url, body ?? {})).data),
  patch: async <T>(url: string, body?: unknown) => unwrap<T>((await http.patch(url, body ?? {})).data),
};

/** True when the request never reached the server (no internet, timeout, DNS). */
export const isNetworkError = (e: unknown) => axios.isAxiosError(e) && !e.response;

/** The server's message, in the partner's language, or a plain fallback. */
export function errorText(e: unknown, fallback = 'Kuch ghalat ho gaya. Dobara koshish karein.'): string {
  if (isNetworkError(e)) return 'Internet nahi mil raha. Connection check karein.';
  if (axios.isAxiosError(e)) {
    const m = (e.response?.data as { message?: string | string[] } | undefined)?.message;
    if (Array.isArray(m) && m.length) return m[0];
    if (typeof m === 'string' && m && !/^Internal server error$/i.test(m)) return m;
    if (e.response?.status === 429) return 'Bohat zyada koshishein. Thori der baad karein.';
  }
  return fallback;
}

export const statusOf = (e: unknown) => (axios.isAxiosError(e) ? e.response?.status : undefined);
