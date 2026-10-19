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
  order?: {
    id: string; orderNumber: string; mode: string; status: string; numberOfGuests?: number | null; customerName?: string | null;
    specialRequests?: string | null; createdAt: string; estimatedPrepTime?: number | null; token?: number | null;
    table?: { tableNumber: string; tableName?: string | null; section?: string | null } | null;
  };
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const kotApi = {
  create: (data: { orderId: string; itemIds: string[]; station?: string; priority?: string; notes?: string }) =>
    apiClient.post('/restaurant/kot', data).then(unwrap<Kot>),

  list: (params?: { status?: string; station?: string; orderId?: string; active?: boolean }) =>
    apiClient.get('/restaurant/kot', { params }).then(unwrap<Kot[]>),

  updateStatus: (id: string, status: KotStatus) =>
    apiClient.patch('/restaurant/kot/' + id + '/status', { status }).then(unwrap<Kot>),
};
