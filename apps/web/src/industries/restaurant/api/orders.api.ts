import { apiClient } from '@core/api/client';

export type OrderMode = 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY' | 'DRIVE_THRU' | 'ROOM_SERVICE' | 'PICKUP';
export type OrderStatus =
  | 'DRAFT' | 'PLACED' | 'CONFIRMED' | 'COOKING' | 'READY' | 'SERVED'
  | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED' | 'ON_HOLD';

export interface OrderItemModifier {
  modifierOptionId: string;
  quantity?: number;
  notes?: string;
}

export interface OrderItem {
  id?: string;
  productId: string;
  variantId?: string;
  quantity: number;
  unit?: string;
  basePrice?: number;
  itemDiscount?: number;
  specialInstructions?: string;
  spiceLevel?: string;
  cookingNote?: string;
  courseNumber?: number;
  status?: OrderStatus;
  modifiers?: OrderItemModifier[];
  product?: any;
  total?: number;
  modifierTotal?: number;
}

export interface RestaurantOrder {
  id: string;
  orderNumber: string;
  mode: OrderMode;
  status: OrderStatus;
  tableId?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  numberOfGuests?: number;
  specialRequests?: string;
  waiterId?: string;
  subtotal: number;
  serviceCharge: number;
  serviceChargePct: number;
  taxAmount: number;
  taxPct: number;
  discount: number;
  deliveryFee: number;
  packagingFee: number;
  tip: number;
  total: number;
  paidAmount: number;
  placedAt?: string;
  confirmedAt?: string;
  cookingStartedAt?: string;
  readyAt?: string;
  servedAt?: string;
  outForDeliveryAt?: string;
  deliveredAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  estimatedPrepTime?: number;
  deliveryAddress?: string;
  deliveryLat?: number;
  deliveryLng?: number;
  deliveryNotes?: string;
  isSplitBill: boolean;
  saleId?: string;
  items: OrderItem[];
  table?: any;
  delivery?: any;
  kots?: any[];
  payments?: any[];
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const ordersApi = {
  create: (data: Partial<RestaurantOrder> & { items: OrderItem[] }) =>
    apiClient.post('/restaurant/orders', data).then(unwrap<RestaurantOrder>),

  list: (params?: { status?: string; mode?: string; tableId?: string; from?: string; to?: string; search?: string }) =>
    apiClient.get('/restaurant/orders', { params }).then(unwrap<RestaurantOrder[]>),

  summary: (params?: { from?: string; to?: string }) =>
    apiClient.get('/restaurant/orders/summary', { params }).then(unwrap<any>),

  getOne: (id: string) =>
    apiClient.get('/restaurant/orders/' + id).then(unwrap<RestaurantOrder>),

  updateStatus: (id: string, status: OrderStatus, opts?: { notes?: string; cancellationReason?: string }) =>
    apiClient.patch('/restaurant/orders/' + id + '/status', { status, ...opts }).then(unwrap<RestaurantOrder>),

  addPayment: (id: string, payment: { amount: number; paymentMethod: string; paidBy?: string; reference?: string; notes?: string }) =>
    apiClient.post('/restaurant/orders/' + id + '/payments', payment).then(unwrap<RestaurantOrder>),

  addItems: (id: string, items: OrderItem[]) =>
    apiClient.post('/restaurant/orders/' + id + '/items', { items }).then(unwrap<RestaurantOrder>),

  removeItem: (id: string, itemId: string) =>
    apiClient.delete('/restaurant/orders/' + id + '/items/' + itemId).then(unwrap),

  splitBill: (id: string, splits: { paidBy: string; amount: number; paymentMethod: string }[]) =>
    apiClient.post('/restaurant/orders/' + id + '/split-bill', { splits }).then(unwrap<RestaurantOrder>),
};
