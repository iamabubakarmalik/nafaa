import { apiClient } from './client';

export interface SystemOverview {
  tenants: {
    total: number;
    active: number;
    trial: number;
    suspended: number;
    newToday: number;
    newThisMonth: number;
    byStatus: Array<{ status: string; _count: { _all: number } }>;
  };
  users: { total: number };
  business: {
    totalProducts: number;
    totalSales: number;
    totalRevenuePlatform: number;
  };
  subscriptions: {
    total: number;
    active: number;
  };
  payments: {
    pendingCount: number;
    totalApprovedRevenue: number;
  };
}

export interface TrendPoint {
  date: string;
  count?: number;
  amount?: number;
}

export interface PlanDistribution {
  name: string;
  count: number;
  revenue: number;
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const adminSystemApi = {
  overview: () =>
    apiClient.get<{ data: SystemOverview }>('/admin/system/overview').then(unwrap),
  signupTrend: (days = 30) =>
    apiClient
      .get<{ data: TrendPoint[] }>('/admin/system/signup-trend', { params: { days } })
      .then(unwrap),
  revenueTrend: (days = 30) =>
    apiClient
      .get<{ data: TrendPoint[] }>('/admin/system/revenue-trend', { params: { days } })
      .then(unwrap),
  planDistribution: () =>
    apiClient
      .get<{ data: PlanDistribution[] }>('/admin/system/plan-distribution')
      .then(unwrap),
  recentActivity: () =>
    apiClient.get<{ data: any }>('/admin/system/recent-activity').then(unwrap),
};
