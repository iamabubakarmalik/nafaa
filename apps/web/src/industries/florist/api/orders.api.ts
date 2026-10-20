import { apiClient } from '@core/api/client';

/** Same values as the server enums. */
export type FloristOrderType = 'WALK_IN' | 'DELIVERY' | 'EVENT' | 'WEDDING' | 'SUBSCRIPTION' | 'CORPORATE';
export type FloristOrderStatus = 'DRAFT' | 'CONFIRMED' | 'IN_PREPARATION' | 'READY_FOR_DELIVERY' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';
export type FloristDeliveryTimeSlot = 'MORNING_9_12' | 'AFTERNOON_12_3' | 'EVENING_3_6' | 'NIGHT_6_9' | 'URGENT' | 'SCHEDULED';

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

/** Delivery details sent with a counter bill; money and items come from the bill. */
export interface OrderFromSale {
  saleId: string;
  orderType: FloristOrderType;
  senderName?: string;
  recipientName?: string;
  recipientPhone?: string;
  deliveryAddress?: string;
  area?: string;
  city?: string;
  landmark?: string;
  messageCard?: string;
  isAnonymous?: boolean;
  deliveryTimeSlot?: FloristDeliveryTimeSlot;
  scheduledDeliveryDate?: string;
  scheduledDeliveryTime?: string;
  eventName?: string;
  eventVenue?: string;
  specialInstructions?: string;
}

export interface OrdersQuery { status?: string; orderType?: string; scheduledDate?: string; from?: string; to?: string; search?: string; page?: number; limit?: number }

export interface OrdersPage {
  items: FloristOrder[];
  total: number;
  page: number;
  limit: number;
  totals: { value: number; received: number; delivery: number };
  counts: Partial<Record<FloristOrderStatus, number>>;
}

interface Bucket { key: string; count: number; value: number }
export interface OrdersAnalytics {
  orders: number; value: number; delivered: number; deliveryCharges: number;
  byDay: Bucket[]; bySlot: Bucket[]; byArea: Bucket[]; byType: Bucket[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- axios envelope varies by endpoint
const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const floristOrdersApi = {
  fromSale: (data: OrderFromSale) =>
    apiClient.post('/florist/orders/from-sale', data).then(unwrap<FloristOrder>),

  paged: (params: OrdersQuery) =>
    apiClient.get('/florist/orders/paged', { params }).then(unwrap<OrdersPage>),

  analytics: (params: { from?: string; to?: string }) =>
    apiClient.get('/florist/orders/analytics', { params }).then(unwrap<OrdersAnalytics>),

  /** `bills`: comma separated bill numbers, to find the orders of those bills. */
  list: (params?: { orderType?: string; status?: string; scheduledDate?: string; from?: string; to?: string; search?: string; bills?: string }) =>
    apiClient.get('/florist/orders', { params }).then(unwrap<FloristOrder[]>),

  summary: () => apiClient.get('/florist/orders/summary').then(unwrap<any>),

  todayDeliveries: () => apiClient.get('/florist/orders/today-deliveries').then(unwrap<FloristOrder[]>),

  byTimeSlot: (date: string) =>
    apiClient.get('/florist/orders/by-time-slot', { params: { date } }).then(unwrap<Record<string, FloristOrder[]>>),


  update: (id: string, data: Partial<FloristOrder>) =>
    apiClient.patch('/florist/orders/' + id, data).then(unwrap<FloristOrder>),

  updateStatus: (id: string, data: { status: FloristOrderStatus; notes?: string }) =>
    apiClient.patch('/florist/orders/' + id + '/status', data).then(unwrap<FloristOrder>),

  confirmDelivery: (id: string, data: { deliveredBy?: string; deliveredToName?: string; deliveryPhotoUrl?: string }) =>
    apiClient.post('/florist/orders/' + id + '/confirm-delivery', data).then(unwrap<FloristOrder>),

  remove: (id: string) => apiClient.delete('/florist/orders/' + id).then(unwrap),
};
