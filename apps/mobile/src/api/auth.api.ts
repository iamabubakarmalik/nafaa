import { apiClient } from './client';
import type { AuthUser, AuthTenant } from '@/store/auth.store';

interface AuthResponse {
  user: AuthUser;
  tenant: AuthTenant;
  accessToken: string;
  refreshToken: string;
}

export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post<AuthResponse>('/auth/login', { email, password }).then((r) => r.data),

  register: (payload: {
    shopName: string;
    fullName: string;
    email: string;
    phone?: string;
    password: string;
    referralCode?: string;
  }) => apiClient.post<AuthResponse>('/auth/register', payload).then((r) => r.data),

  me: () =>
    apiClient.get<{ user: AuthUser; tenant: AuthTenant }>('/auth/me').then((r) => r.data),

  logout: (refreshToken: string) =>
    apiClient.post('/auth/logout', { refreshToken }),
};
