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
  customer?: (Pick<import('./customers.api').DairyCustomer, 'id' | 'name' | 'customerNumber' | 'phone' | 'address' | 'area'> & { route?: { id: string; name: string } | null }) | null;
  createdAt: string;
}

export interface DeliverySummary {
  date: string; totalDeliveries: number; totalLiters: number; totalRevenue: number; collected: number;
  deliveredCount: number; skippedCount: number; pendingCount: number; pendingLiters: number; morningLiters: number; eveningLiters: number;
}

export interface ConfirmInput { deliveredQty: number; paidAmount?: number; paymentMethod?: string; containerReturned?: boolean; notes?: string; managerPin?: string }

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const dairyDeliveriesApi = {
  sheet: (params: { from?: string; to?: string; slot?: string; routeId?: string; status?: string; search?: string; customerId?: string }) =>
    apiClient.get('/dairy/deliveries', { params }).then(unwrap<DairyDelivery[]>),
  summary: (date?: string) => apiClient.get('/dairy/deliveries/daily-summary', { params: { date } }).then(unwrap<DeliverySummary>),
  deliver: (id: string, data: ConfirmInput) => apiClient.post('/dairy/deliveries/' + id + '/confirm', data).then(unwrap<DairyDelivery>),
  confirmAll: (data: { date?: string; slot?: string; routeId?: string; ids?: string[] }) =>
    apiClient.post('/dairy/deliveries/confirm-all', data).then(unwrap<{ total: number; done: number; failed: Array<{ id: string; reason: string }> }>),
  markSkipped: (id: string, data: { reason?: string; managerPin?: string }) => apiClient.post('/dairy/deliveries/' + id + '/skip', data).then(unwrap<DairyDelivery>),
  markCancelled: (id: string, data: { reason?: string; managerPin?: string }) => apiClient.post('/dairy/deliveries/' + id + '/cancel', data).then(unwrap<DairyDelivery>),
  add: (data: { dairyCustomerId: string; deliveryDate?: string; slot?: string; scheduledQty: number; ratePerLiter?: number; notes?: string; deliverNow?: boolean }) =>
    apiClient.post('/dairy/deliveries', data).then(unwrap<DairyDelivery>),
  generate: (data: { date?: string; slot?: string; routeId?: string }) =>
    apiClient.post('/dairy/deliveries/bulk-generate', data).then(unwrap<{ generatedCount: number; date: string; slot: string }>),
  create: (data: any) => apiClient.post('/dairy/deliveries', data).then(unwrap<DairyDelivery>),
  bulkGenerate: (data: { date?: string; slot?: string; routeId?: string }) =>
    apiClient.post('/dairy/deliveries/bulk-generate', data).then(unwrap<any>),
  list: (params?: any) => apiClient.get('/dairy/deliveries', { params }).then(unwrap<DairyDelivery[]>),
  today: (slot?: string, routeId?: string) => apiClient.get('/dairy/deliveries/today', { params: { slot, routeId } }).then(unwrap<DairyDelivery[]>),
  confirm: (id: string, data: { deliveredQty: number; returnedQty?: number; customerSignature?: string; notes?: string }) =>
    apiClient.post('/dairy/deliveries/' + id + '/confirm', data).then(unwrap<DairyDelivery>),
  skip: (id: string, reason: string) => apiClient.post('/dairy/deliveries/' + id + '/skip', { reason }).then(unwrap<DairyDelivery>),
  cancel: (id: string) => apiClient.post('/dairy/deliveries/' + id + '/cancel').then(unwrap<DairyDelivery>),
};
