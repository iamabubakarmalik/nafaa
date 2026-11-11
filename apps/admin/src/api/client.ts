import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/store/auth.store';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export const apiClient = axios.create({ baseURL, withCredentials: true });

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/**
 * The access token is short-lived. On a 401 the client swaps the refresh
 * token for new tokens once (parallel requests wait for the same swap) and
 * retries; only when that fails is the admin signed out.
 */
let refreshing: Promise<string | null | 'offline'> | null = null;

/** New access token; null = session is over; 'offline' = could not reach the server. */
async function refreshTokens(): Promise<string | null | 'offline'> {
  const { refreshToken, setTokens } = useAuthStore.getState();
  if (!refreshToken) return null;
  try {
    const res = await axios.post<{ data: { accessToken: string; refreshToken: string } }>(`${baseURL}/admin/auth/refresh`, { refreshToken }, { withCredentials: true });
    const { accessToken, refreshToken: next } = res.data.data;
    setTokens(accessToken, next);
    return accessToken;
  } catch (e) {
    // Offline or server down: keep the session and let the request fail.
    return (e as AxiosError).response ? null : 'offline';
  }
}

apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
    const isAuthCall = /\/admin\/auth\/(login|refresh)/.test(original?.url ?? '');
    if (error.response?.status === 401 && original && !original._retried && !isAuthCall) {
      original._retried = true;
      refreshing ??= refreshTokens().finally(() => { refreshing = null; });
      const token = await refreshing;
      if (token && token !== 'offline') {
        original.headers.Authorization = `Bearer ${token}`;
        return apiClient(original);
      }
      if (token === null) useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  },
);
