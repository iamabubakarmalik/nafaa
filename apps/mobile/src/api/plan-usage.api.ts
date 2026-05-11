import { apiClient } from './client';

export interface PlanUsage {
  plan: {
    id: string;
    name: string;
    maxProducts: number;
    maxCustomers: number;
    maxUsers: number;
    maxShops: number;
  };
  usage: {
    products: { current: number; limit: number; percent: number };
    customers: { current: number; limit: number; percent: number };
    users: { current: number; limit: number; percent: number };
    shops: { current: number; limit: number; percent: number };
  };
}

function unwrapOne<T>(res: any): T {
  const body = res?.data;
  if (body?.data !== undefined) return body.data as T;
  return body as T;
}

export const planUsageApi = {
  get: (): Promise<PlanUsage> =>
    apiClient.get('/plan-usage').then((r) => unwrapOne<PlanUsage>(r)),
};
