import { apiClient } from './client';
import type { AuthTenant, AuthUser } from '@/store/auth.store';

export interface RegisterPayload {
  shopName: string;
  fullName: string;
  email: string;
  phone?: string;
  password: string;
  referralCode?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

interface AuthResponse {
  user: AuthUser;
  tenant: AuthTenant;
  accessToken: string;
  refreshToken: string;
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const authApi = {
  register: (payload: RegisterPayload) =>
    apiClient.post<{ data: AuthResponse }>('/auth/register', payload).then(unwrap),
  login: (payload: LoginPayload) =>
    apiClient.post<{ data: AuthResponse }>('/auth/login', payload).then(unwrap),
  me: () =>
    apiClient
      .get<{ data: { user: AuthUser; tenant: AuthTenant } }>('/auth/me')
      .then(unwrap),
  logout: (refreshToken: string) =>
    apiClient.post('/auth/logout', { refreshToken }).then(unwrap),
};
