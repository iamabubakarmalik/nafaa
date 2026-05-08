import { apiClient } from './client';

export type LoyaltyTxType = 'EARNED' | 'REDEEMED' | 'EXPIRED' | 'ADJUSTMENT';

export interface LoyaltyTransaction {
  id: string;
  type: LoyaltyTxType;
  points: number;
  balanceAfter: number;
  reference?: string | null;
  note?: string | null;
  createdAt: string;
}

export interface LoyaltyLeaderboard {
  topCustomers: Array<{
    id: string;
    name: string;
    phone?: string | null;
    loyaltyPoints: number;
    totalSpent: number;
  }>;
  totalEarned: number;
  totalRedeemed: number;
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const loyaltyApi = {
  leaderboard: () =>
    apiClient.get<{ data: LoyaltyLeaderboard }>('/loyalty/leaderboard').then(unwrap),
  history: (customerId: string) =>
    apiClient
      .get<{ data: { customer: any; transactions: LoyaltyTransaction[] } }>(
        `/loyalty/customer/${customerId}`,
      )
      .then(unwrap),
};
