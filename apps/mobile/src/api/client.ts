import axios from 'axios';
import Constants from 'expo-constants';
import { useAuthStore } from '@/store/auth.store';

/**
 * Smart API URL resolution:
 * 1. If EXPO_PUBLIC_API_URL is set in env → use it (manual override)
 * 2. If __DEV__ mode + running in Expo Go → auto-detect Metro host IP
 * 3. Production fallback → api.nafaa.pk
 */
function resolveApiUrl(): string {
  // Manual override (e.g., production .env)
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // Production fallback
  if (!__DEV__) {
    return 'https://api.nafaa.pk/api';
  }

  // Development: auto-detect Metro host IP (so phone testing works on any WiFi)
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest?.debuggerHost ||
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost;

  if (hostUri) {
    const host = hostUri.split(':')[0]; // strip :8081
    return `http://${host}:4000/api`;
  }

  // Last resort fallback
  return 'http://localhost:4000/api';
}

const API_URL = resolveApiUrl();

if (__DEV__) console.log('🌐 API URL:', API_URL);

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

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
  async (error) => {
    if (__DEV__) {
      console.log(
        `❌ ${error.response?.status ?? 'NETWORK'} ${error.config?.url}`,
        error.response?.data?.message || error.message,
      );
    }
    if (error.response?.status === 401) {
      await useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  },
);
