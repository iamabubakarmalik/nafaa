import { apiClient } from './client';
import type { AdminUser } from '@/store/auth.store';

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const adminAuthApi = {
  login: (email: string, password: string) =>
    apiClient
      .post<{ data: { user: AdminUser; accessToken: string; refreshToken: string } }>(
        '/admin/auth/login',
        { email, password },
      )
      .then(unwrap),
  me: () => apiClient.get<{ data: AdminUser }>('/admin/auth/me').then(unwrap),
  logout: (refreshToken?: string) =>
    apiClient.post('/admin/auth/logout', { refreshToken }).then(unwrap),
};
