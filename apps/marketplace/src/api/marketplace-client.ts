import axios, { AxiosError } from 'axios';

const BASE_URL = import.meta.env.VITE_MARKETPLACE_API_URL || 'http://localhost:4000/api/marketplace';

export const marketplaceClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request interceptor: attach token ───
marketplaceClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('marketplace_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Response interceptor: handle 401 silently ───
marketplaceClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Clear invalid token — but DON'T redirect
      // Public pages should still work; protected routes handle redirect themselves
      localStorage.removeItem('marketplace_token');
      localStorage.removeItem('marketplace_refresh_token');

      // Only redirect if we're on a protected page that explicitly needs auth
      // ProtectedRoute component will handle the redirect naturally when store updates
      const authStore = (window as any).__customerAuthStore;
      if (authStore?.getState) {
        try { authStore.getState().logout?.(); } catch {}
      }
    }
    return Promise.reject(error);
  },
);
