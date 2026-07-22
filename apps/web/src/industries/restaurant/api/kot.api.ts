import { apiClient } from '@core/api/client';

export type KotStatus = 'PENDING' | 'PRINTED' | 'ACKNOWLEDGED' | 'COOKING' | 'READY' | 'SERVED' | 'CANCELLED';

export interface Kot {
  id: string;
  orderId: string;
  kotNumber: string;
  station?: string;
  status: KotStatus;
  itemIds: string[];
  itemsSnapshot: any;
  printedAt?: string;
  printedBy?: string;
  acknowledgedAt?: string;
  cookingStartedAt?: string;
  readyAt?: string;
  servedAt?: string;
  cancelledAt?: string;
  notes?: string;
  priority?: string;
  order?: any;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const kotApi = {
  create: (data: { orderId: string; itemIds: string[]; station?: string; priority?: string; notes?: string }) =>
    apiClient.post('/restaurant/kot', data).then(unwrap<Kot>),

  list: (params?: { status?: string; station?: string; orderId?: string }) =>
    apiClient.get('/restaurant/kot', { params }).then(unwrap<Kot[]>),

  updateStatus: (id: string, status: KotStatus) =>
    apiClient.patch('/restaurant/kot/' + id + '/status', { status }).then(unwrap<Kot>),
};
