import { apiClient } from './client';

export type DashboardDays = 7 | 14 | 30 | 90;

export interface Compare { value: number; prev: number }

export interface DashboardAlert {
  id: string;
  level: 'danger' | 'warning' | 'info';
  title: string;
  detail: string;
  count: number;
  to: string;
}

export interface DashboardSummary {
  range: { days: number; from: string; to: string; timezone: string };
  kpis: {
    tenants: { total: number; active: number; trial: number; suspended: number; new: number; newPrev: number };
    sellingShops: { last7: number; prev7: number };
    gmv: Compare;
    bills: Compare;
    mrr: number;
    arr: number;
    payingShops: number;
    churned: number;
    revenue: Compare;
  };
  daily: Array<{ date: string; signups: number; bills: number; gmv: number; revenue: number }>;
  funnel: Array<{ key: string; label: string; count: number }>;
  industries: Array<{ type: string; shops: number; selling: number; gmv: number }>;
  alerts: DashboardAlert[];
}

export const adminDashboardApi = {
  summary: (days: DashboardDays) =>
    apiClient.get<{ data: DashboardSummary }>('/admin/dashboard', { params: { days } }).then((r) => r.data.data),
};
