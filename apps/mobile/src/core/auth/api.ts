/**
 * Auth endpoints (apps/api/src/modules/auth). The client unwraps the
 * `{ success, data }` envelope, so these return the payload.
 */

import { apiClient } from '../api/client';
import type { AuthResponse, AuthTenant, AuthUser, Shop } from './types';

export interface RegisterPayload {
  shopName: string;
  fullName: string;
  email: string;
  phone?: string;
  password: string;
  referralCode?: string;
  language?: string;
}

export type GoogleResult = AuthResponse | { needsShopName: true; tempToken: string; email: string; fullName: string; avatarUrl?: string };

export const isGoogleSession = (r: GoogleResult): r is AuthResponse => 'accessToken' in r;

export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post<AuthResponse>('/auth/login', { email, password }).then((r) => r.data),
  register: (payload: RegisterPayload) =>
    apiClient.post<AuthResponse>('/auth/register', payload).then((r) => r.data),
  me: () => apiClient.get<{ user: AuthUser; tenant: AuthTenant }>('/auth/me').then((r) => r.data),
  logout: (refreshToken: string) => apiClient.post('/auth/logout', { refreshToken }, { timeout: 5000 }).then((r) => r.data),
  forgotPassword: (email: string) => apiClient.post('/auth/forgot-password', { email }).then((r) => r.data),
  resetPassword: (token: string, newPassword: string) => apiClient.post('/auth/reset-password', { token, newPassword }).then((r) => r.data),
  changePassword: (currentPassword: string, newPassword: string) =>
    apiClient.post('/auth/change-password', { currentPassword, newPassword }).then((r) => r.data),
  setPassword: (newPassword: string) => apiClient.post('/auth/set-password', { newPassword }).then((r) => r.data),
  sendVerifyEmail: () =>
    apiClient.post<{ alreadyVerified?: boolean; devCode?: string }>('/auth/verify-email/send').then((r) => r.data),
  confirmVerifyEmail: (code: string) => apiClient.post('/auth/verify-email/confirm', { code }).then((r) => r.data),
  googleMobile: (idToken: string, shopName?: string) =>
    apiClient.post<GoogleResult>('/auth/google/mobile', { idToken, shopName }).then((r) => r.data),
  shops: () => apiClient.get<Shop[] | { data: Shop[] }>('/shops').then((r) => (Array.isArray(r.data) ? r.data : r.data?.data ?? [])),
};
