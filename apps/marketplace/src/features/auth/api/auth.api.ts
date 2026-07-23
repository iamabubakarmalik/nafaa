import { marketplaceClient } from '@api/marketplace-client';
import type { MarketplaceCustomer } from '@app-types/customer.types';

const unwrap = <T>(r: any): T => (r?.data?.data !== undefined ? r.data.data : r?.data);

export interface RegisterPayload {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
  referralCode?: string;
}

export interface LoginPayload {
  email?: string;
  phone?: string;
  password: string;
}

export interface AuthResponse {
  customer: MarketplaceCustomer;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
  isNewUser?: boolean;
}

export const marketAuthApi = {
  // ─── EMAIL + PASSWORD ───
  register: (payload: RegisterPayload) =>
    marketplaceClient.post('/auth/register', payload).then((r) => unwrap<AuthResponse>(r)),

  login: (payload: LoginPayload) =>
    marketplaceClient.post('/auth/login', payload).then((r) => unwrap<AuthResponse>(r)),

  // ─── OTP (Phone) ───
  sendOtp: (phone: string, purpose: 'LOGIN' | 'REGISTER' | 'RESET_PASSWORD') =>
    marketplaceClient.post('/auth/otp/send', { phone, purpose }).then(unwrap),

  verifyOtp: (data: { phone: string; code: string; purpose: string; fullName?: string }) =>
    marketplaceClient.post('/auth/otp/verify', data).then((r) => unwrap<AuthResponse>(r)),

  // ─── PASSWORD RESET ───
  forgotPassword: (email: string) =>
    marketplaceClient.post('/auth/forgot-password', { email }).then(unwrap),

  resetPassword: (token: string, newPassword: string) =>
    marketplaceClient.post('/auth/reset-password', { token, newPassword }).then(unwrap),

  // ─── PROFILE ───
  me: () => marketplaceClient.get('/auth/me').then((r) => unwrap<MarketplaceCustomer>(r)),

  updateProfile: (data: any) =>
    marketplaceClient.patch('/auth/me', data).then((r) => unwrap<MarketplaceCustomer>(r)),

  // ─── GOOGLE OAUTH ───
  googleLoginUrl: () => {
    const baseUrl = (marketplaceClient.defaults.baseURL || '').replace(/\/$/, '');
    return `${baseUrl}/auth/google`;
  },

  completeGoogleSignup: (tempToken: string) =>
    marketplaceClient
      .post('/auth/google/complete-signup', { tempToken })
      .then((r) => unwrap<AuthResponse>(r)),

  // ─── EMAIL VERIFY ───
  sendVerifyEmail: () =>
    marketplaceClient.post('/auth/verify-email/send').then(unwrap) as Promise<{
      success: boolean; message: string; alreadyVerified?: boolean; devCode?: string;
    }>,

  confirmVerifyEmail: (code: string) =>
    marketplaceClient.post('/auth/verify-email/confirm', { code }).then(unwrap),

  // ─── LOGOUT ───
  logout: (refreshToken: string) =>
    marketplaceClient.post('/auth/logout', { refreshToken }).then(unwrap),
};
