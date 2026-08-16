import axios from 'axios';
import { useAuthStore } from '@core/stores/auth.store';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let pendingQueue: Array<(t: string) => void> = [];

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
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
