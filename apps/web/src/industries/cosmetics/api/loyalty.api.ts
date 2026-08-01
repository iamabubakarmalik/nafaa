import { apiClient } from '@core/api/client';

export interface CosmeticsLoyaltyMember {
  id: string;
  memberCode: string;
  customerId?: string;
  name: string;
  phone: string;
  email?: string;
  dateOfBirth?: string;
  skinType?: string;
  skinConcerns: string[];
  favoriteFragranceFamilies: string[];
  tier: string;
  pointsBalance: number;
  lifetimePoints: number;
  totalSpent: number;
  totalPurchases: number;
  lastPurchaseAt?: string;
  birthdayOfferSent: boolean;
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const cosmeticsLoyaltyApi = {
  create: (data: Partial<CosmeticsLoyaltyMember>) =>
    apiClient.post('/cosmetics/loyalty', data).then(unwrap<CosmeticsLoyaltyMember>),

  list: (params?: { tier?: string; active?: boolean; search?: string }) =>
    apiClient.get('/cosmetics/loyalty', { params }).then(unwrap<CosmeticsLoyaltyMember[]>),

  summary: () => apiClient.get('/cosmetics/loyalty/summary').then(unwrap<any>),

  birthdaysThisMonth: () =>
    apiClient.get('/cosmetics/loyalty/birthdays-this-month').then(unwrap<CosmeticsLoyaltyMember[]>),

  topSpenders: (limit = 10) =>
    apiClient.get('/cosmetics/loyalty/top-spenders', { params: { limit } }).then(unwrap<CosmeticsLoyaltyMember[]>),

  byPhone: (phone: string) =>
    apiClient.get('/cosmetics/loyalty/by-phone/' + encodeURIComponent(phone)).then(unwrap<CosmeticsLoyaltyMember | null>),

  getOne: (id: string) => apiClient.get('/cosmetics/loyalty/' + id).then(unwrap<CosmeticsLoyaltyMember>),

  update: (id: string, data: Partial<CosmeticsLoyaltyMember>) =>
    apiClient.patch('/cosmetics/loyalty/' + id, data).then(unwrap<CosmeticsLoyaltyMember>),

  awardPoints: (id: string, points: number, reason?: string) =>
    apiClient.post('/cosmetics/loyalty/' + id + '/award-points', { points, reason }).then(unwrap<CosmeticsLoyaltyMember>),

  redeemPoints: (id: string, points: number, note?: string) =>
    apiClient.post('/cosmetics/loyalty/' + id + '/redeem-points', { points, note }).then(unwrap<CosmeticsLoyaltyMember>),

  recordPurchase: (id: string, amount: number) =>
    apiClient.post('/cosmetics/loyalty/' + id + '/record-purchase', { amount }).then(unwrap<CosmeticsLoyaltyMember>),

  markBirthdayOfferSent: (id: string) =>
    apiClient.post('/cosmetics/loyalty/' + id + '/birthday-offer-sent').then(unwrap<CosmeticsLoyaltyMember>),

  remove: (id: string) => apiClient.delete('/cosmetics/loyalty/' + id).then(unwrap),
};
