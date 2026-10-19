import { apiClient } from '@core/api/client';

export interface GymOverview {
  totals: { totalMembers: number; activeMembers: number; totalTrainers: number; activeMemberships: number };
  today: { checkIns: number; currentlyInside: number; classes: number; classBookings: number; revenue: number; udhaar: number };
  monthly: { revenue: number; collected: number };
  alerts: { expiringMemberships: number; duesCount: number; duesAmount: number };
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const gymDashboardApi = {
  overview: () => apiClient.get('/gym/dashboard/overview').then(unwrap<GymOverview>),
};
