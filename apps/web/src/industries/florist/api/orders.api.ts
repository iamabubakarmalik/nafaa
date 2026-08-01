import { apiClient } from '@core/api/client';

export type FloristOrderType = 'WALK_IN' | 'PHONE_ORDER' | 'DELIVERY' | 'EVENT_ORDER' | 'CORPORATE' | 'SUBSCRIPTION' | 'ONLINE';
export type FloristOrderStatus = 'DRAFT' | 'CONFIRMED' | 'IN_PREPARATION' | 'READY_FOR_DELIVERY' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';
export type FloristDeliveryTimeSlot = 'MORNING' | 'AFTERNOON' | 'EVENING' | 'EXPRESS' | 'SCHEDULED';

export interface FloristOrder {
  id: string;
  orderNumber: string;
  orderType: FloristOrderType;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  senderName?: string;
  recipientName?: string;
  recipientPhone?: string;
  deliveryAddress?: string;
  city?: string;
  area?: string;
  landmark?: string;
  latitude?: number;
  longitude?: number;
  messageCard?: string;
  isAnonymous: boolean;
  items: Array<{ productId: string; productName: string; quantity: number; unitPrice: number; total: number; customization?: string }>;
  subtotal: number;
  discountAmount: number;
  deliveryCharge: number;
  wrappingCharge: number;
  totalAmount: number;
  advancePaid: number;
  paymentMethod?: string;
  deliveryTimeSlot?: FloristDeliveryTimeSlot;
  scheduledDeliveryDate?: string;
  scheduledDeliveryTime?: string;
  actualDeliveryTime?: string;
  deliveredBy?: string;
  deliveredToName?: string;
  deliveryPhotoUrl?: string;
  eventDate?: string;
  eventName?: string;
  eventVenue?: string;
  isRecurring: boolean;
  recurringFrequency?: string;
  status: FloristOrderStatus;
  preparedAt?: string;
  notes?: string;
  specialInstructions?: string;
  internalNotes?: string;
  handledById?: string;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const floristOrdersApi = {
  create: (data: Partial<FloristOrder>) =>
    apiClient.post('/florist/orders', data).then(unwrap<FloristOrder>),

  list: (params?: { orderType?: string; status?: string; scheduledDate?: string; from?: string; to?: string; search?: string }) =>
    apiClient.get('/florist/orders', { params }).then(unwrap<FloristOrder[]>),

  summary: () => apiClient.get('/florist/orders/summary').then(unwrap<any>),

  todayDeliveries: () => apiClient.get('/florist/orders/today-deliveries').then(unwrap<FloristOrder[]>),

  byTimeSlot: (date: string) =>
    apiClient.get('/florist/orders/by-time-slot', { params: { date } }).then(unwrap<Record<string, FloristOrder[]>>),

  getOne: (id: string) => apiClient.get('/florist/orders/' + id).then(unwrap<FloristOrder>),

  update: (id: string, data: Partial<FloristOrder>) =>
    apiClient.patch('/florist/orders/' + id, data).then(unwrap<FloristOrder>),

  updateStatus: (id: string, data: { status: FloristOrderStatus; notes?: string }) =>
    apiClient.patch('/florist/orders/' + id + '/status', data).then(unwrap<FloristOrder>),

  confirmDelivery: (id: string, data: { deliveredBy?: string; deliveredToName?: string; deliveryPhotoUrl?: string }) =>
    apiClient.post('/florist/orders/' + id + '/confirm-delivery', data).then(unwrap<FloristOrder>),

  remove: (id: string) => apiClient.delete('/florist/orders/' + id).then(unwrap),
};
