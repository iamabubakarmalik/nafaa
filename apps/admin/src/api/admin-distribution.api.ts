/** Distribution usage per business: booker logins (billed per login), 30-day activity and the plan flag. */

import { apiClient } from './client';

export interface DistributionUsageRow {
  tenantId: string;
  name: string;
  status: string;
  businessType: string | null;
  enabled: boolean;
  plan: { name: string; slug: string; featureDistribution: boolean } | null;
  subscriptionStatus: string | null;
  /** Active non-owner users holding distribution.orders.book. */
  bookerLogins: number;
  activeBookers30d: number;
  orders30d: number;
  orderValue30d: number;
}

export interface DistributionUsage {
  tenants: DistributionUsageRow[];
  totals: { tenants: number; bookerLogins: number };
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const adminDistributionApi = {
  usage: (tenantId?: string) =>
    apiClient.get<{ data: DistributionUsage }>('/admin/distribution/usage', { params: tenantId ? { tenantId } : {} }).then(unwrap),
};
