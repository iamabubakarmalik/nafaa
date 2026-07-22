import { apiClient } from '@/api/client';

export type FreshnessStatus = 'FRESH' | 'DAY_OLD' | 'NEAR_EXPIRY' | 'EXPIRED' | 'DISCARDED';

export interface FreshnessLog {
  id: string;
  productId: string;
  productName: string;
  batchNumber?: string;
  productionDate: string;
  bestBefore: string;
  expiryDate?: string;
  initialQty: number;
  currentQty: number;
  soldQty: number;
  wastedQty: number;
  discountedQty: number;
  status: FreshnessStatus;
  discardedAt?: string;
  discardReason?: string;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const freshnessApi = {
  create: (data: Partial<FreshnessLog>) => apiClient.post('/bakery/freshness', data).then(unwrap<FreshnessLog>),
  list: (params?: any) => apiClient.get('/bakery/freshness', { params }).then(unwrap<FreshnessLog[]>),
  summary: () => apiClient.get('/bakery/freshness/summary').then(unwrap<any>),
  runCheck: () => apiClient.post('/bakery/freshness/run-expiry-check').then(unwrap<any>),
  getOne: (id: string) => apiClient.get('/bakery/freshness/' + id).then(unwrap<FreshnessLog>),
  sale: (id: string, qty: number) => apiClient.post('/bakery/freshness/' + id + '/sale', { qty }).then(unwrap<FreshnessLog>),
  discard: (id: string, qty: number, reason: string) =>
    apiClient.post('/bakery/freshness/' + id + '/discard', { qty, reason }).then(unwrap<FreshnessLog>),
  discount: (id: string, qty: number) =>
    apiClient.post('/bakery/freshness/' + id + '/discount', { qty }).then(unwrap<FreshnessLog>),
};
