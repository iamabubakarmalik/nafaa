import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import Constants from 'expo-constants';
import { useAuthStore } from '@/store/auth.store';

/**
 * Smart API URL resolution:
 * 1. If EXPO_PUBLIC_API_URL is set in env → use it
 * 2. If __DEV__ mode + running in Expo Go → auto-detect Metro host IP
 * 3. Production fallback → api.nafaa.pk
 */
function resolveApiUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  if (!__DEV__) {
    return 'https://api.nafaa.pk/api';
  }
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest?.debuggerHost ||
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    return `http://${host}:4000/api`;
  }
  return 'http://localhost:4000/api';
}

const API_URL = resolveApiUrl();
if (__DEV__) console.log('🌐 API URL:', API_URL);

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Track in-flight refresh to dedupe parallel 401s
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const refreshToken = useAuthStore.getState().refreshToken;
      if (!refreshToken) return null;

      // Use raw axios (not apiClient) to avoid interceptor loop
      const res = await axios.post(
        `${API_URL}/auth/refresh`,
        { refreshToken },
        { timeout: 15000, headers: { 'Content-Type': 'application/json' } },
      );

      // Handle both wrapped and unwrapped responses
      const body = res.data;
      const data = body?.data ?? body;
      const newAccess = data?.accessToken;
      const newRefresh = data?.refreshToken;

      if (newAccess && newRefresh) {
        await useAuthStore.getState().updateTokens(newAccess, newRefresh);
        return newAccess;
      }
      return null;
    } catch (e) {
      if (__DEV__) console.log('🔄 Token refresh failed:', (e as Error).message);
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (__DEV__) {
    console.log(`📤 ${config.method?.toUpperCase()} ${config.url}`);
  }
  return config;
});

apiClient.interceptors.response.use(
  (res) => {
    if (__DEV__) console.log(`📥 ${res.status} ${res.config.url}`);
    const body = res.data;
    if (body && typeof body === 'object' && 'data' in body && 'success' in body) {
      (res as any).data = body.data;
    }
    return res;
  },
  async (error: AxiosError) => {
    const original = error.config as AxiosRequestConfig & { _retried?: boolean };

    if (__DEV__) {
      console.log(
        `❌ ${error.response?.status ?? 'NETWORK'} ${error.config?.url}`,
        (error.response?.data as any)?.message || error.message,
      );
    }

    // Don't try to refresh on auth endpoints themselves
    const isAuthEndpoint =
      original?.url?.includes('/auth/login') ||
      original?.url?.includes('/auth/register') ||
      original?.url?.includes('/auth/refresh') ||
      original?.url?.includes('/auth/google');

    // Smart 401 handling: try refresh, retry, only logout if refresh fails
    if (error.response?.status === 401 && !original?._retried && !isAuthEndpoint) {
      original._retried = true;

      const newToken = await refreshAccessToken();

      if (newToken) {
        // Retry original request with new token
        if (original.headers) {
          (original.headers as any).Authorization = `Bearer ${newToken}`;
        }
        return apiClient(original);
      }

      // Refresh failed → genuine session expiry → logout
      await useAuthStore.getState().logout();
    }

    // 402 = Payment Required (trial expired) — DO NOT logout, let UI handle it
    // (TrialExpiredModal will show automatically)

    return Promise.reject(error);
  },
);
