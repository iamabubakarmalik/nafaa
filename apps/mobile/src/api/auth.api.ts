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
  isNewDevice?: boolean;
  requiresEmailVerification?: boolean;
}

interface GoogleNeedsShopNameResponse {
  needsShopName: true;
  tempToken: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
}

type GoogleResponse = AuthResponse | GoogleNeedsShopNameResponse;

export interface ActiveSession {
  id: string;
  deviceName: string;
  location: string;
  ipAddress?: string | null;
  lastActive: string;
  createdAt: string;
  expiresAt: string;
}

export interface LoginHistoryEntry {
  id: string;
  success: boolean;
  failureReason?: string | null;
  ipAddress?: string | null;
  deviceName?: string | null;
  location?: string | null;
  isNewDevice: boolean;
  createdAt: string;
}

function unwrap<T>(res: any): T {
  const body = res?.data;
  if (body?.data !== undefined) return body.data as T;
  return body as T;
}

function unwrapPlain<T>(res: any): T {
  return res?.data as T;
}

export const authApi = {
  register: (payload: RegisterPayload) =>
    apiClient.post('/auth/register', payload).then((r) => unwrap<AuthResponse>(r)),

  login: (payload: LoginPayload) =>
    apiClient.post('/auth/login', payload).then((r) => unwrap<AuthResponse>(r)),

  me: () =>
    apiClient.get('/auth/me').then((r) => unwrap<{ user: AuthUser; tenant: AuthTenant }>(r)),

  logout: (refreshToken: string) =>
    apiClient.post('/auth/logout', { refreshToken }).then((r) => unwrapPlain<any>(r)),

  forgotPassword: (email: string) =>
    apiClient.post('/auth/forgot-password', { email }).then((r) => unwrapPlain<any>(r)),

  resetPassword: (token: string, newPassword: string) =>
    apiClient.post('/auth/reset-password', { token, newPassword }).then((r) => unwrapPlain<any>(r)),

  changePassword: (currentPassword: string, newPassword: string) =>
    apiClient.post('/auth/change-password', { currentPassword, newPassword }).then((r) => unwrapPlain<any>(r)),

  setPassword: (newPassword: string) =>
    apiClient.post('/auth/set-password', { newPassword }).then((r) => unwrapPlain<any>(r)),

  updateProfile: (data: { fullName?: string; phone?: string; avatarUrl?: string }) =>
    apiClient.patch('/auth/me', data).then((r) => unwrap<AuthUser>(r)),

  sendVerifyEmail: () =>
    apiClient.post('/auth/verify-email/send').then((r) => unwrapPlain<any>(r)),

  confirmVerifyEmail: (code: string) =>
    apiClient.post('/auth/verify-email/confirm', { code }).then((r) => unwrapPlain<any>(r)),

  sendOtp: (email: string, purpose: 'VERIFY_EMAIL' | 'PASSWORD_RESET' | 'LOGIN' = 'VERIFY_EMAIL') =>
    apiClient.post('/auth/otp/send', { email, purpose }).then((r) => unwrapPlain<any>(r)),

  verifyOtp: (email: string, code: string, purpose: 'VERIFY_EMAIL' | 'PASSWORD_RESET' | 'LOGIN' = 'VERIFY_EMAIL') =>
    apiClient.post('/auth/otp/verify', { email, code, purpose }).then((r) => unwrapPlain<any>(r)),

  googleMobile: (idToken: string, shopName?: string): Promise<GoogleResponse> =>
    apiClient.post('/auth/google/mobile', { idToken, shopName }).then((r) => {
      const body = r?.data;
      const result = body?.data !== undefined ? body.data : body;
      return result as GoogleResponse;
    }),

  completeGoogleSignup: (tempToken: string, shopName: string) =>
    apiClient
      .post('/auth/google/mobile', { idToken: tempToken, shopName })
      .then((r) => unwrap<AuthResponse>(r)),

  disconnectGoogle: () =>
    apiClient.post('/auth/google/disconnect').then((r) => unwrapPlain<any>(r)),

  // ─── Session Management ───
  listSessions: () =>
    apiClient.get('/auth/sessions').then((r) => unwrapPlain<ActiveSession[]>(r)),

  revokeSession: (sessionId: string) =>
    apiClient.post(`/auth/sessions/${sessionId}/revoke`).then((r) => unwrapPlain<any>(r)),

  revokeOtherSessions: (refreshToken: string) =>
    apiClient
      .post('/auth/sessions/revoke-others', { refreshToken })
      .then((r) => unwrapPlain<any>(r)),

  loginHistory: () =>
    apiClient.get('/auth/login-history').then((r) => unwrapPlain<LoginHistoryEntry[]>(r)),
};

export function isGoogleAuthResponse(r: GoogleResponse): r is AuthResponse {
  return 'accessToken' in r;
}
