import { marketplaceClient, unwrap } from '@/api/client';
import type { CustomerAddress } from '@/types';

export interface CreateAddressPayload {
  label: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  city: string;
  area: string;
  province?: string;
  postalCode?: string;
  lat?: number;
  lng?: number;
  addressType?: 'HOME' | 'OFFICE' | 'OTHER';
  isDefault?: boolean;
  deliveryNotes?: string;
}

export const profileApi = {
  // Addresses
  listAddresses: () =>
    marketplaceClient.get('/profile/addresses').then(unwrap<CustomerAddress[]>),

  createAddress: (data: CreateAddressPayload) =>
    marketplaceClient.post('/profile/addresses', data).then(unwrap<CustomerAddress>),

  updateAddress: (id: string, data: Partial<CreateAddressPayload>) =>
    marketplaceClient.patch(`/profile/addresses/${id}`, data).then(unwrap<CustomerAddress>),

  deleteAddress: (id: string) =>
    marketplaceClient.delete(`/profile/addresses/${id}`).then(unwrap<{ success: boolean }>),

  setDefaultAddress: (id: string) =>
    marketplaceClient.post(`/profile/addresses/${id}/default`).then(unwrap<{ success: boolean }>),

  // Cards
  listCards: () =>
    marketplaceClient.get('/profile/cards').then(unwrap<any[]>),

  saveCard: (data: any) =>
    marketplaceClient.post('/profile/cards', data).then(unwrap),

  deleteCard: (id: string) =>
    marketplaceClient.delete(`/profile/cards/${id}`).then(unwrap),

  // Wallet
  wallet: () =>
    marketplaceClient.get('/profile/wallet').then(unwrap<{
      balance: number;
      loyaltyPoints: number;
      loyaltyValue: number;
      currency: string;
      recentTransactions: any[];
    }>),

  walletHistory: (limit = 50, offset = 0) =>
    marketplaceClient.get('/profile/wallet/history', { params: { limit, offset } }).then(unwrap<{
      items: any[]; total: number;
    }>),

  // Referrals
  referrals: () =>
    marketplaceClient.get('/profile/referrals').then(unwrap<{
      referralCode: string;
      totalReferrals: number;
      referredCustomers: any[];
      bonusPerReferral: number;
    }>),

  // Push tokens
  registerPushToken: (data: { token: string; platform: string; deviceInfo?: any }) =>
    marketplaceClient.post('/profile/push-tokens', data).then(unwrap),

  removePushToken: (token: string) =>
    marketplaceClient.delete('/profile/push-tokens', { data: { token } }).then(unwrap),

  // Marketing prefs
  updateMarketingPrefs: (prefs: { emails?: boolean; sms?: boolean; push?: boolean; whatsapp?: boolean }) =>
    marketplaceClient.patch('/profile/marketing-prefs', prefs).then(unwrap),
};
