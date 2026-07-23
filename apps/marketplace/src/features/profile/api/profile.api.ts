import { marketplaceClient } from '@/api/marketplace-client';
const unwrap = <T>(r: any): T => (r?.data?.data !== undefined ? r.data.data : r?.data);

export const profileApi = {
  addresses: () => marketplaceClient.get('/profile/addresses').then(unwrap<any>),
  addAddress: (data: any) => marketplaceClient.post('/profile/addresses', data).then(unwrap<any>),
  updateAddress: (id: string, data: any) =>
    marketplaceClient.patch(`/profile/addresses/${id}`, data).then(unwrap<any>),
  deleteAddress: (id: string) =>
    marketplaceClient.delete(`/profile/addresses/${id}`).then(unwrap),
  setDefault: (id: string) =>
    marketplaceClient.post(`/profile/addresses/${id}/default`).then(unwrap),
  wallet: () => marketplaceClient.get('/profile/wallet').then(unwrap<any>),
  walletHistory: () => marketplaceClient.get('/profile/wallet/history').then(unwrap<any>),
  referrals: () => marketplaceClient.get('/profile/referrals').then(unwrap<any>),
};
