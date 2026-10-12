/** Loyalty points: programme overview, members, a customer's history, manual adjustment and expiry. */

import { apiClient } from '@core/api/client';

export type LoyaltyTxType = 'EARNED' | 'REDEEMED' | 'EXPIRED' | 'ADJUSTMENT';
export type TierId = 'starter' | 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

export interface LoyaltyTransaction {
  id: string;
  type: LoyaltyTxType;
  points: number;
  balanceAfter: number;
  reference?: string | null;
  note?: string | null;
  createdAt: string;
}

export interface LoyaltyOverview {
  enabled: boolean;
  settings: { pointsPerRupee: number; redemptionRate: number; minRedeem: number; maxRedeemPercent: number; expiryDays: number };
  from: string | null; to: string; grouping: 'day' | 'month';
  members: { withPoints: number; customers: number };
  outstanding: { points: number; value: number };
  period: { issued: number; redeemed: number; expired: number; adjusted: number; redeemedValue: number; salesTotal: number; bills: number };
  trend: Array<{ key: string; issued: number; redeemed: number }>;
  branches: Array<{ shopId: string | null; name: string; issued: number; redeemed: number }>;
  tiers: Array<{ id: TierId; min: number; count: number }>;
}

export interface LoyaltyMember {
  id: string; name: string; phone: string | null; avatarUrl: string | null; loyaltyPoints: number; totalSpent: number;
  isVip: boolean; gender: string | null; updatedAt: string; lastActivityAt: string | null;
}

/** Kept for older screens. */
export interface LoyaltyLeaderboard {
  topCustomers: Array<{ id: string; name: string; phone?: string | null; loyaltyPoints: number; totalSpent: number }>;
  totalEarned: number;
  totalRedeemed: number;
}

export const TIERS: Array<{ id: TierId; label: string; min: number; color: string }> = [
  { id: 'starter', label: 'Starter', min: 1, color: '#64748b' }, { id: 'bronze', label: 'Bronze', min: 100, color: '#b45309' },
  { id: 'silver', label: 'Silver', min: 500, color: '#64748b' }, { id: 'gold', label: 'Gold', min: 1000, color: '#ca8a04' },
  { id: 'platinum', label: 'Platinum', min: 2000, color: '#0891b2' }, { id: 'diamond', label: 'Diamond', min: 5000, color: '#7c3aed' },
];
export const tierOf = (points: number) => [...TIERS].reverse().find((t) => points >= t.min) ?? TIERS[0];

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const loyaltyApi = {
  overview: (range?: { from?: string; to?: string }) => apiClient.get<{ data: LoyaltyOverview }>('/loyalty/overview', { params: range }).then(unwrap),
  members: (q: { search?: string; sort?: string; page?: number; limit?: number }) =>
    apiClient.get<{ data: { page: number; count: number; hasMore: boolean; items: LoyaltyMember[] } }>('/loyalty/members', { params: q }).then(unwrap),
  leaderboard: () => apiClient.get<{ data: LoyaltyLeaderboard }>('/loyalty/leaderboard').then(unwrap),
  history: (customerId: string) =>
    apiClient.get<{ data: { customer: { id: string; name: string; loyaltyPoints: number }; transactions: LoyaltyTransaction[] } }>(`/loyalty/customer/${customerId}`).then(unwrap),
  adjust: (customerId: string, points: number, note?: string) =>
    apiClient.post<{ data: { loyaltyPoints: number } }>(`/loyalty/customer/${customerId}/adjust`, { points, note }).then(unwrap),
  expiryPreview: () => apiClient.get<{ data: { customers: number; points: number } }>('/loyalty/expiry-preview').then(unwrap),
  expireNow: () => apiClient.post<{ data: { customers: number; points: number } }>('/loyalty/expire-now').then(unwrap),
};
