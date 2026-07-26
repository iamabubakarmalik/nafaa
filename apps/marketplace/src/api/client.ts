import axios, { AxiosError, AxiosInstance } from 'axios';
import { toast } from 'sonner';

const BASE_URL =
  import.meta.env.VITE_MARKETPLACE_API_URL || 'http://localhost:4000/api/marketplace';

export const marketplaceClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Endpoints where we NEVER show error toasts (silent background calls)
const SILENT_ENDPOINTS = [
  '/auth/me',
  '/notifications/unread-count',
  '/cart',
  '/wishlist',
  '/auth/sessions',
  '/profile/stats',
  '/profile/wallet',
];

// Endpoints that DON'T trigger auto-refresh (auth endpoints themselves)
const NO_REFRESH_ENDPOINTS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/otp/', '/auth/password/reset'];

// Request interceptor — attach token
marketplaceClient.interceptors.request.use((config) => {
  const token =
    localStorage.getItem('marketplace_access_token') ||
    localStorage.getItem('marketplace_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const lang = localStorage.getItem('marketplace-lang') || 'en';
  if (config.headers) config.headers['Accept-Language'] = lang;
  return config;
});

let refreshPromise: Promise<string> | null = null;

const softLogout = () => {
  localStorage.removeItem('marketplace_access_token');
  localStorage.removeItem('marketplace_token');
  localStorage.removeItem('marketplace_refresh_token');
  localStorage.removeItem('marketplace_customer');
};

marketplaceClient.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original: any = error.config;
    const url: string = original?.url || '';
    const status = error.response?.status;
    const isSilent = SILENT_ENDPOINTS.some((e) => url.includes(e));
    const isAuthEndpoint = NO_REFRESH_ENDPOINTS.some((e) => url.includes(e));

    // 401 — attempt refresh (except for auth endpoints)
    if (status === 401 && !original._retry && !isAuthEndpoint) {
      original._retry = true;
      const refreshToken = localStorage.getItem('marketplace_refresh_token');

      if (!refreshToken) {
        softLogout();
        // Only redirect if user is on a protected page (not already at /login etc)
        if (!isSilent && !window.location.pathname.match(/^\/(login|register|forgot|reset|verify|auth)/)) {
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
              const newToken = data.tokens?.accessToken || data.accessToken;
              const newRefresh = data.tokens?.refreshToken || data.refreshToken;
              if (newToken) {
                localStorage.setItem('marketplace_access_token', newToken);
                localStorage.setItem('marketplace_token', newToken);
              }
              if (newRefresh) localStorage.setItem('marketplace_refresh_token', newRefresh);
              return newToken;
            })
            .finally(() => { refreshPromise = null; });
        }
        const newToken = await refreshPromise;
        if (original.headers) original.headers.Authorization = `Bearer ${newToken}`;
        return marketplaceClient(original);
      } catch {
        softLogout();
        if (!isSilent && !window.location.pathname.match(/^\/(login|register|forgot|reset|verify|auth)/)) {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    }

    // 403 / auth-related errors — soft logout if it's "User not found" or "inactive"
    const errMsg: string = (error.response?.data as any)?.message || '';
    if (
      status === 401 &&
      /user not found|inactive|invalid token|banned/i.test(errMsg)
    ) {
      softLogout();
      if (!isSilent && !window.location.pathname.match(/^\/(login|register|forgot|reset|verify|auth)/)) {
        toast.error('Session expired — please login again');
        setTimeout(() => (window.location.href = '/login'), 500);
      }
      return Promise.reject(error);
    }

    // 5xx — server error toast
    if (!isSilent && status && status >= 500) {
      toast.error('Server error — please try again', { id: 'server-error' });
    }

    return Promise.reject(error);
  },
);

// Utility to unwrap { data: T } / { data: { data: T } } envelope
export const unwrap = <T>(res: any): T => (res?.data?.data !== undefined ? res.data.data : res?.data);
