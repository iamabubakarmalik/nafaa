import { apiClient } from './client';

export interface HealthCheck {
  status: 'HEALTHY' | 'UNHEALTHY';
  checkedAt: string;
  responseTimeMs: number;
  database: { status: string; responseMs: number };
  server: {
    uptime: number;
    uptimeHuman: string;
    nodeVersion: string;
    platform: string;
    memory: { total: number; free: number; used: number; usedPercent: string };
    cpu: { cores: number; model: string; loadAvg: { '1min': string; '5min': string; '15min': string } };
  };
}

export interface DbStats {
  tenants: number;
  users: number;
  products: number;
  sales: number;
  customers: number;
  subscriptions: number;
  invoices: number;
  payments: number;
  notifications: number;
  activityLogs: number;
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const adminHealthApi = {
  check: () => apiClient.get<{ data: HealthCheck }>('/admin/health').then(unwrap),
  dbStats: () => apiClient.get<{ data: DbStats }>('/admin/health/db-stats').then(unwrap),
};
