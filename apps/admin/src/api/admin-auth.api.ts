import { apiClient } from './client';
import type { AdminUser } from '@/store/auth.store';

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export type LoginResult =
  | { twoFactorRequired: true }
  | { twoFactorRequired?: undefined; user: AdminUser; accessToken: string; refreshToken: string };

export interface AdminSession {
  id: string; userAgent: string | null; ipAddress: string | null; deviceName: string | null; location: string | null; lastUsedAt: string; createdAt: string;
}

export const adminAuthApi = {
  login: (email: string, password: string, code?: string) =>
    apiClient.post<{ data: LoginResult }>('/admin/auth/login', { email, password, ...(code ? { code } : {}) }).then(unwrap),
  me: () => apiClient.get<{ data: AdminUser }>('/admin/auth/me').then(unwrap),
  logout: (refreshToken?: string) =>
    apiClient.post('/admin/auth/logout', { refreshToken }).then(unwrap),
  inviteInfo: (token: string) =>
    apiClient.get<{ data: { email: string; fullName: string; roleName: string | null; expiresAt: string } }>('/admin/auth/invite', { params: { token } }).then(unwrap),
  acceptInvite: (token: string, password: string) =>
    apiClient.post<{ data: { success: true; email: string } }>('/admin/auth/accept-invite', { token, password }).then(unwrap),
  setupTwoFactor: () => apiClient.post<{ data: { secret: string; otpauthUrl: string } }>('/admin/auth/2fa/setup').then(unwrap),
  enableTwoFactor: (code: string) => apiClient.post<{ data: { backupCodes: string[] } }>('/admin/auth/2fa/enable', { code }).then(unwrap),
  disableTwoFactor: (code: string) => apiClient.post<{ data: { success: true } }>('/admin/auth/2fa/disable', { code }).then(unwrap),
  sessions: () => apiClient.get<{ data: AdminSession[] }>('/admin/auth/sessions').then(unwrap),
  endSession: (id: string) => apiClient.delete(`/admin/auth/sessions/${id}`).then(unwrap),
};
