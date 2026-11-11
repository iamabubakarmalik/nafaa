import { apiClient } from './client';

export type ReferralStatus = 'PENDING' | 'CONVERTED' | 'PAID' | 'EXPIRED';

export interface AdminReferral {
  id: string;
  code: string;
  status: ReferralStatus;
  rewardAmount: number;
  createdAt: string;
  referrer: { id: string; name: string; referralCode?: string | null };
  referee: { id: string; name: string; status: string; createdAt: string };
}

export interface ReferralStats { total: number; pending: number; converted: number; paid: number; totalRewardsPaid: number }

export interface Referrer { id: string; name: string; referralCode?: string | null; accountCredit: number; successfulReferrals: number; totalEarned: number }

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const adminReferralsApi = {
  stats: () => apiClient.get<{ data: ReferralStats }>('/admin/referrals/stats').then(unwrap),
  list: (params?: { page?: number; limit?: number }) =>
    apiClient.get<{ data: AdminReferral[] }>('/admin/referrals', { params }).then(unwrap),
  listPaged: (params?: { status?: string; search?: string; from?: string; to?: string; page?: number; limit?: number }) =>
    apiClient
      .get<{ data: { items: AdminReferral[]; meta: { page: number; limit: number; total: number; totalPages: number } } }>('/admin/referrals/paged', { params })
      .then(unwrap),
  leaderboard: () => apiClient.get<{ data: Referrer[] }>('/admin/referrals/leaderboard').then(unwrap),
};
