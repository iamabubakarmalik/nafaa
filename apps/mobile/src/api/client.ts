import axios from 'axios';
import { useAuthStore } from '@/store/auth.store';

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  'http://192.168.1.17:4000/api';

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

    // Auto-unwrap { success, data, timestamp } envelope from backend
    const body = res.data;
    if (body && typeof body === 'object' && 'data' in body && 'success' in body) {
      // Replace res.data with the unwrapped payload so all callers see the real data
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
