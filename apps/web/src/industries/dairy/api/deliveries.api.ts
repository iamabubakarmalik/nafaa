import { apiClient } from '@core/api/client';

export type DeliveryStatus = 'SCHEDULED' | 'DELIVERED' | 'SKIPPED' | 'MISSED' | 'RETURNED' | 'CANCELLED';

export interface DairyDelivery {
  id: string;
  dairyCustomerId: string;
  routeId?: string;
  deliveryDate: string;
  slot: string;
  scheduledQty: number;
  deliveredQty: number;
  returnedQty: number;
  unit: string;
  status: DeliveryStatus;
  skipReason?: string;
  ratePerLiter: number;
  totalAmount: number;
  isPaid: boolean;
  paidAmount: number;
  containerReturned: boolean;
  deliveredAt?: string;
  notes?: string;
  customerSignature?: string;
  customer?: any;
  createdAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const dairyDeliveriesApi = {
  create: (data: any) => apiClient.post('/dairy/deliveries', data).then(unwrap<DairyDelivery>),
  bulkGenerate: (data: { date?: string; slot?: string; routeId?: string }) =>
    apiClient.post('/dairy/deliveries/bulk-generate', data).then(unwrap<any>),
  list: (params?: any) => apiClient.get('/dairy/deliveries', { params }).then(unwrap<DairyDelivery[]>),
  today: (slot?: string, routeId?: string) => apiClient.get('/dairy/deliveries/today', { params: { slot, routeId } }).then(unwrap<DairyDelivery[]>),
  dailySummary: (date?: string) => apiClient.get('/dairy/deliveries/daily-summary', { params: { date } }).then(unwrap<any>),
  confirm: (id: string, data: { deliveredQty: number; returnedQty?: number; customerSignature?: string; notes?: string }) =>
    apiClient.post('/dairy/deliveries/' + id + '/confirm', data).then(unwrap<DairyDelivery>),
  skip: (id: string, reason: string) => apiClient.post('/dairy/deliveries/' + id + '/skip', { reason }).then(unwrap<DairyDelivery>),
  cancel: (id: string) => apiClient.post('/dairy/deliveries/' + id + '/cancel').then(unwrap<DairyDelivery>),
};
