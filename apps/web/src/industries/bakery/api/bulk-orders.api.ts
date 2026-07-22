import { apiClient } from '@core/api/client';

export interface BulkOrder {
  id: string;
  orderNumber: string;
  customerId?: string;
  organizationName: string;
  contactPerson?: string;
  contactPhone: string;
  contactEmail?: string;
  orderType: string;
  eventDate: string;
  eventTime?: string;
  venue?: string;
  totalGuests?: number;
  totalItems: number;
  items: any;
  quotedPrice: number;
  finalPrice?: number;
  advancePaid: number;
  paidAmount: number;
  paymentStatus: string;
  status: string;
  requiresDelivery: boolean;
  deliveryAddress?: string;
  requiresSetup: boolean;
  setupTime?: string;
  specialInstructions?: string;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const bulkOrdersApi = {
  create: (data: any) => apiClient.post('/bakery/bulk-orders', data).then(unwrap<BulkOrder>),
  list: (params?: any) => apiClient.get('/bakery/bulk-orders', { params }).then(unwrap<BulkOrder[]>),
  getOne: (id: string) => apiClient.get('/bakery/bulk-orders/' + id).then(unwrap<BulkOrder>),
  update: (id: string, data: any) => apiClient.patch('/bakery/bulk-orders/' + id, data).then(unwrap<BulkOrder>),
  updateStatus: (id: string, status: string) => apiClient.patch('/bakery/bulk-orders/' + id + '/status', { status }).then(unwrap<BulkOrder>),
  payment: (id: string, amount: number) => apiClient.post('/bakery/bulk-orders/' + id + '/payment', { amount }).then(unwrap<BulkOrder>),
};
