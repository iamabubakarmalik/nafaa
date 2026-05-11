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

export interface LoyaltyTopCustomer {
  id: string;
  name: string;
  phone?: string | null;
  loyaltyPoints: number;
  totalSpent: number;
}

export interface LoyaltyLeaderboard {
  topCustomers: LoyaltyTopCustomer[];
  totalEarned: number;
  totalRedeemed: number;
}

function unwrapOne<T>(res: any): T {
  const body = res?.data;
  if (body?.data !== undefined) return body.data as T;
  return body as T;
}

export const loyaltyApi = {
  leaderboard: (): Promise<LoyaltyLeaderboard> =>
    apiClient.get('/loyalty/leaderboard').then((r) => unwrapOne<LoyaltyLeaderboard>(r)),
  history: (customerId: string): Promise<{ customer: any; transactions: LoyaltyTransaction[] }> =>
    apiClient
      .get(`/loyalty/customer/${customerId}`)
      .then((r) => unwrapOne<{ customer: any; transactions: LoyaltyTransaction[] }>(r)),
};
