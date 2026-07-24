import { marketplaceClient, unwrap } from '@/api/client';
import type { MarketplaceCustomer } from '@/types';

export type OtpPurpose = 'LOGIN' | 'REGISTER' | 'VERIFY_PHONE' | 'RESET_PASSWORD';

export interface AuthResponse {
  customer: MarketplaceCustomer;
  tokens: {
    accessToken: string;
    refreshToken: string;
    accessTokenExpiresIn?: number;
    refreshTokenExpiresIn?: number;
  };
  isNewUser?: boolean;
}

export interface RegisterPayload {
  fullName: string;
  phone: string;
  email?: string;
  password: string;
  referralCode?: string;
  language?: 'ur' | 'en';
}

export interface LoginPayload {
  phone?: string;
  email?: string;
  password: string;
}

export interface SendOtpPayload {
  phone: string;
  purpose: OtpPurpose;
}

export interface VerifyOtpPayload {
  phone: string;
  code: string;
  purpose: OtpPurpose;
  fullName?: string;
  referralCode?: string;
}

const authBase = () => (marketplaceClient.defaults.baseURL || '').replace(/\/$/, '');

export const authApi = {
  // ─── OTP FLOW ───
  sendOtp: (payload: SendOtpPayload) =>
    marketplaceClient.post('/auth/otp/send', payload).then(unwrap<{
      success: boolean; message: string; expiresIn: number; devCode?: string;
    }>),

  verifyOtp: (payload: VerifyOtpPayload) =>
    marketplaceClient.post('/auth/otp/verify', payload).then(unwrap<AuthResponse>),

  // ─── PASSWORD FLOW ───
  register: (payload: RegisterPayload) =>
    marketplaceClient.post('/auth/register', payload).then(unwrap<AuthResponse>),

  login: (payload: LoginPayload) =>
    marketplaceClient.post('/auth/login', payload).then(unwrap<AuthResponse>),

  // ─── SOCIAL (id_token — mobile) ───
  socialLogin: (payload: { provider: 'GOOGLE' | 'FACEBOOK' | 'APPLE'; idToken: string; referralCode?: string }) =>
    marketplaceClient.post('/auth/social', payload).then(unwrap<AuthResponse>),

  // ─── GOOGLE OAUTH (redirect flow — web) ───
  googleLoginUrl: () => `${authBase()}/auth/google`,

  // ─── TOKENS ───
  refresh: (refreshToken: string) =>
    marketplaceClient.post('/auth/refresh', { refreshToken }).then(unwrap<AuthResponse>),

  logout: (refreshToken?: string) =>
    marketplaceClient.post('/auth/logout', { refreshToken }).then(unwrap),

  // ─── PROFILE ───
  me: () => marketplaceClient.get('/auth/me').then(unwrap<MarketplaceCustomer>),

  updateProfile: (data: any) =>
    marketplaceClient.patch('/auth/me', data).then(unwrap<MarketplaceCustomer>),

  // ─── PASSWORD ───
  setPassword: (newPassword: string) =>
    marketplaceClient.post('/auth/password/set', { newPassword }).then(unwrap),

  changePassword: (currentPassword: string, newPassword: string) =>
    marketplaceClient.post('/auth/password/change', { currentPassword, newPassword }).then(unwrap),

  resetPassword: (phone: string, code: string, newPassword: string) =>
    marketplaceClient.post('/auth/password/reset', { phone, code, newPassword }).then(unwrap),

  // ─── SESSIONS ───
  sessions: () => marketplaceClient.get('/auth/sessions').then(unwrap<any[]>),

  revokeSession: (sessionId: string) =>
    marketplaceClient.delete(`/auth/sessions/${sessionId}`).then(unwrap),

  loginHistory: () => marketplaceClient.get('/auth/login-history').then(unwrap<any[]>),

  deleteAccount: (reason?: string) =>
    marketplaceClient.delete('/auth/me', { data: { reason } }).then(unwrap),
};
