import { apiClient } from './client';

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const adminReferralsApi = {
  stats: () => apiClient.get<{ data: any }>('/admin/referrals/stats').then(unwrap),
  list: (params?: { page?: number; limit?: number }) =>
    apiClient.get<{ data: any[] }>('/admin/referrals', { params }).then(unwrap),
  leaderboard: () =>
    apiClient.get<{ data: any[] }>('/admin/referrals/leaderboard').then(unwrap),
};
