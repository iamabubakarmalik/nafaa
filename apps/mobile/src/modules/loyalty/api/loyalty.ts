/** Loyalty points API (same endpoints and shapes as the web): programme overview, members, a customer's history, manual changes and expiry. */

import { apiClient } from '@/core/api/client';
import type { TierId } from '@nafaa/core/customers';

export type LoyaltyTxType = 'EARNED' | 'REDEEMED' | 'EXPIRED' | 'ADJUSTMENT';

export interface LoyaltyTransaction { id: string; type: LoyaltyTxType; points: number; balanceAfter: number; reference?: string | null; note?: string | null; createdAt: string }

export interface LoyaltyOverview {
  enabled: boolean;
  settings: { pointsPerRupee: number; redemptionRate: number; minRedeem: number; maxRedeemPercent: number; expiryDays: number };
  members: { withPoints: number; customers: number };
  outstanding: { points: number; value: number };
  period: { issued: number; redeemed: number; expired: number; adjusted: number; redeemedValue: number; salesTotal: number; bills: number };
  trend: Array<{ key: string; issued: number; redeemed: number }>;
  branches: Array<{ shopId: string | null; name: string; issued: number; redeemed: number }>;
  tiers: Array<{ id: TierId; min: number; count: number }>;
}

export interface LoyaltyMember {
  id: string; name: string; phone: string | null; avatarUrl: string | null; loyaltyPoints: number; totalSpent: number;
  isVip: boolean; gender: 'MALE' | 'FEMALE' | 'OTHER' | null; updatedAt: string; lastActivityAt: string | null;
}

export type MemberSort = 'points' | 'spent' | 'recent' | 'name';

export const loyaltyApi = {
  overview: (range?: { from?: string; to?: string }) => apiClient.get<LoyaltyOverview>('/loyalty/overview', { params: range }).then((r) => r.data),
  members: (q: { search?: string; sort?: string; min?: string | number; page?: number; limit?: number }) =>
    apiClient.get<{ page: number; count: number; hasMore: boolean; items: LoyaltyMember[] }>('/loyalty/members', { params: q }).then((r) => r.data),
  history: (customerId: string) =>
    apiClient.get<{ customer: { id: string; name: string; loyaltyPoints: number }; transactions: LoyaltyTransaction[] }>(`/loyalty/customer/${customerId}`).then((r) => r.data),
  adjust: (customerId: string, points: number, note?: string) => apiClient.post<{ loyaltyPoints: number }>(`/loyalty/customer/${customerId}/adjust`, { points, note }).then((r) => r.data),
  expiryPreview: () => apiClient.get<{ customers: number; points: number }>('/loyalty/expiry-preview').then((r) => r.data),
  expireNow: () => apiClient.post<{ customers: number; points: number }>('/loyalty/expire-now').then((r) => r.data),
};
