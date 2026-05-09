import axios from 'axios';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { useAuthStore } from '@/store/auth.store';

function resolveApiUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl && envUrl.length > 0 && !envUrl.includes('localhost') && !envUrl.includes('192.168')) {
    return envUrl;
  }
  if (Platform.OS === 'web') {
    return envUrl || 'http://localhost:4000/api';
  }
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants.manifest as any)?.debuggerHost ||
    (Constants.manifest2 as any)?.extra?.expoGo?.debuggerHost;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    return `http://${host}:4000/api`;
  }
  return envUrl || 'http://localhost:4000/api';
}

const API_URL = resolveApiUrl();
console.log('🌐 API URL:', API_URL);

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
});

// ✅ ASYNC interceptor — waits for store + falls back to SecureStore
apiClient.interceptors.request.use(
  async (config) => {
    let token = useAuthStore.getState().accessToken;

    // Fallback: if store empty (during app reload), read directly from SecureStore
    if (!token) {
      try {
        token = await SecureStore.getItemAsync('access-token');
      } catch {}
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log(`📤 ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => Promise.reject(error),
);

apiClient.interceptors.response.use(
  (res) => {
    console.log(`📥 ${res.status} ${res.config.url}`);
    if (res.data && typeof res.data === 'object' && 'success' in res.data && 'data' in res.data) {
      res.data = res.data.data;
    }
    return res;
  },
  async (error) => {
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      console.error('⏱️ Timeout — backend not reachable at', API_URL);
    } else if (error.message === 'Network Error') {
      console.error('🔌 Network Error at', API_URL);
    } else if (error.response) {
      console.error(`❌ ${error.response.status} ${error.config?.url}`, error.response.data);
    }

    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      // Don't auto-logout for auth endpoints OR if we just reloaded (token might be loading)
      const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/register');
      const storeReady = useAuthStore.getState().isInitialized;

      if (!isAuthEndpoint && storeReady) {
        await useAuthStore.getState().logout();
      }
    }
    return Promise.reject(error);
  },
);

export { API_URL };
