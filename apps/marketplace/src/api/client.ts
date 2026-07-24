import axios, { AxiosError, AxiosInstance } from 'axios';
import { toast } from 'sonner';

const BASE_URL = import.meta.env.VITE_MARKETPLACE_API_URL || 'http://localhost:4000/api/marketplace';

export const marketplaceClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000, 
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach token
marketplaceClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('marketplace_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Attach language
  const lang = localStorage.getItem('marketplace-lang') || 'en';
  if (config.headers) config.headers['Accept-Language'] = lang;
  return config;
});

// Response interceptor — handle 401, errors
let refreshPromise: Promise<string> | null = null;

marketplaceClient.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original: any = error.config;

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = localStorage.getItem('marketplace_refresh_token');
      if (!refreshToken) {
        // No refresh — force logout
        localStorage.removeItem('marketplace_token');
        localStorage.removeItem('marketplace_customer');
        if (!window.location.pathname.startsWith('/login')) {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }

      try {
        if (!refreshPromise) {
          refreshPromise = axios
            .post(`${BASE_URL}/auth/refresh`, { refreshToken })
            .then((r) => {
              const data = r.data?.data || r.data;
              const newToken = data.tokens.accessToken;
              const newRefresh = data.tokens.refreshToken;
              localStorage.setItem('marketplace_token', newToken);
              if (newRefresh) localStorage.setItem('marketplace_refresh_token', newRefresh);
              return newToken;
            })
            .finally(() => { refreshPromise = null; });
        }
        const newToken = await refreshPromise;
        original.headers.Authorization = `Bearer ${newToken}`;
        return marketplaceClient(original);
      } catch {
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }

    // Global error toasts (except for silent endpoints)
    const silentEndpoints = ['/auth/me', '/notifications/unread-count'];
    const isSilent = silentEndpoints.some((e) => original?.url?.includes(e));

    if (!isSilent && error.response?.status && error.response.status >= 500) {
      toast.error('Server error — please try again', { id: 'server-error' });
    }

    return Promise.reject(error);
  },
);

// Utility to unwrap { data: { data: T } } envelope
export const unwrap = <T>(res: any): T => (res?.data?.data !== undefined ? res.data.data : res?.data);
