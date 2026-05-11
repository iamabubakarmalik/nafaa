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
  isNewUser?: boolean;
}

const unwrap = <T>(res: any): T =>
  res?.data?.data !== undefined ? res.data.data : res?.data;
const unwrapPlain = <T>(res: any): T => res?.data;

export const authApi = {
  register: (payload: RegisterPayload) =>
    apiClient.post('/auth/register', payload).then((r) => unwrap<AuthResponse>(r)),

  login: (payload: LoginPayload) =>
    apiClient.post('/auth/login', payload).then((r) => unwrap<AuthResponse>(r)),

  me: () =>
    apiClient.get('/auth/me').then((r) => unwrap<{ user: AuthUser; tenant: AuthTenant }>(r)),

  logout: (refreshToken: string) =>
    apiClient.post('/auth/logout', { refreshToken }).then(unwrapPlain),

  forgotPassword: (email: string) =>
    apiClient.post('/auth/forgot-password', { email }).then(unwrapPlain),

  resetPassword: (token: string, newPassword: string) =>
    apiClient.post('/auth/reset-password', { token, newPassword }).then(unwrapPlain),

  changePassword: (currentPassword: string, newPassword: string) =>
    apiClient.post('/auth/change-password', { currentPassword, newPassword }).then(unwrapPlain),

  setPassword: (newPassword: string) =>
    apiClient.post('/auth/set-password', { newPassword }).then(unwrapPlain),

  updateProfile: (data: { fullName?: string; phone?: string; avatarUrl?: string }) =>
    apiClient.patch('/auth/me', data).then((r) => unwrap<AuthUser>(r)),

  sendVerifyEmail: () =>
    apiClient.post('/auth/verify-email/send').then(unwrapPlain) as Promise<{ success: boolean; message: string; alreadyVerified?: boolean; devCode?: string }>,

  confirmVerifyEmail: (code: string) =>
    apiClient.post('/auth/verify-email/confirm', { code }).then(unwrapPlain),

  completeGoogleSignup: (tempToken: string, shopName: string) =>
    apiClient
      .post('/auth/google/complete-signup', { tempToken, shopName })
      .then((r) => unwrap<AuthResponse>(r)),

  disconnectGoogle: () =>
    apiClient.post('/auth/google/disconnect').then(unwrapPlain),

  googleLoginUrl: () => {
    const baseUrl = (apiClient.defaults.baseURL || '').replace(/\/$/, '');
    return `${baseUrl}/auth/google`;
  },
};
