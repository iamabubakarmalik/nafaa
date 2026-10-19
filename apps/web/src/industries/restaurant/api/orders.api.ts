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
  isReturned?: boolean;
  returnReason?: string | null;
  sentToKitchenAt?: string | null;
  cookingStartedAt?: string | null;
  readyAt?: string | null;
  servedAt?: string | null;
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
  modifiers?: Array<OrderItemModifier & { priceAdjustment?: number; modifierOption?: { name: string; modifierGroup?: { name: string } } }>;
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
  parentOrderId?: string | null;
  saleId?: string;
  riderId?: string | null;
  deliveryStatus?: string | null;
  /** Place of the order in its branch's business day, called out at the counter. */
  token?: number | null;
  waiter?: { id: string; fullName: string } | null;
  waiterName?: string | null;
  sale?: { id: string; saleNumber: string; status: string; total?: number; creditAmount: number; refundedAmount?: number } | null;
  splitOrders?: Array<{ id: string; orderNumber: string; total: number; status: OrderStatus; saleId?: string | null }>;
  parentOrder?: { id: string; orderNumber: string; status: OrderStatus } | null;
  items: OrderItem[];
  table?: any;
  delivery?: any;
  kots?: any[];
  payments?: any[];
  createdAt: string;
  updatedAt: string;
}

export interface OrderCharges {
  serviceChargePct?: number;
  taxPct?: number;
  discount?: number;
  deliveryFee?: number;
  packagingFee?: number;
  tip?: number;
}

export type CheckoutPart = { method: string; amount: number; reference?: string | null; paidBy?: string };

export interface OrderPageQuery {
  search?: string; status?: string; mode?: string; tableId?: string; waiterId?: string;
  from?: string; to?: string; sort?: string; page?: number; limit?: number;
}

export interface OrderPageStats {
  all: number; open: number; openAmount: number; kitchen: number; ready: number; billPrinted: number;
  completed: number; completedAmount: number; cancelled: number; cancelledAmount: number; averageBill: number;
  /** Paid orders whose bill was voided later (left out of the money). */
  voidedBills: number;
  byMode: Array<{ mode: OrderMode; count: number; amount: number }>;
}

export interface OrderPage {
  items: RestaurantOrder[];
  total: number; page: number; limit: number;
  stats: OrderPageStats;
}

interface GroupRow { key: string; label: string; bills: number; amount: number }

export interface DayClose {
  date: string;
  figures: { bills: number; net: number; gross: number; refunds: number; cashIn: number; credit: number; discount: number; service: number };
  groupedTotal: number;
  tips: number;
  byMode: GroupRow[];
  byWaiter: GroupRow[];
  byTable: GroupRow[];
  openOrders: Array<{ id: string; orderNumber: string; mode: OrderMode; status: OrderStatus; total: number; paidAmount: number; due: number; createdAt: string; customerName?: string | null; table?: { tableNumber: string } | null; delivery?: { rider?: { name: string } | null } | null }>;
  openAmount: number;
  voids: { count: number; amount: number; cookedAmount: number; items: Array<{ id: string; quantity: number; total: number; returnReason?: string | null; cookingStartedAt?: string | null; updatedAt: string; product?: { name: string } | null; order: { id: string; orderNumber: string } }> };
  cancelled: { count: number; amount: number; orders: Array<{ id: string; orderNumber: string; total: number; cancellationReason?: string | null }> };
  riderCash: Array<{ riderId: string; name: string; phone: string; orders: number; amount: number }>;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const ordersApi = {
  create: (data: Partial<RestaurantOrder> & { items: OrderItem[]; sendToKitchen?: boolean }) =>
    apiClient.post('/restaurant/orders', data).then(unwrap<RestaurantOrder>),

  list: (params?: { status?: string; mode?: string; tableId?: string; from?: string; to?: string; search?: string; saleId?: string; open?: boolean; waiterId?: string; saleIds?: string }) =>
    apiClient.get('/restaurant/orders', { params }).then(unwrap<RestaurantOrder[]>),

  /** Server-paged list; the stats cover the whole filter. */
  page: (params: OrderPageQuery) =>
    apiClient.get('/restaurant/orders/page', { params }).then(unwrap<OrderPage>),

  dayClose: (date?: string) =>
    apiClient.get('/restaurant/orders/day-close', { params: date ? { date } : {} }).then(unwrap<DayClose>),

  summary: (params?: { from?: string; to?: string }) =>
    apiClient.get('/restaurant/orders/summary', { params }).then(unwrap<any>),

  getOne: (id: string) =>
    apiClient.get('/restaurant/orders/' + id).then(unwrap<RestaurantOrder>),

  update: (id: string, data: OrderCharges & { numberOfGuests?: number; waiterId?: string; customerId?: string; customerName?: string; customerPhone?: string; specialRequests?: string; deliveryAddress?: string; deliveryNotes?: string }) =>
    apiClient.patch('/restaurant/orders/' + id, data).then(unwrap<RestaurantOrder>),

  updateStatus: (id: string, status: OrderStatus, opts?: { notes?: string; cancellationReason?: string; managerPin?: string }) =>
    apiClient.patch('/restaurant/orders/' + id + '/status', { status, ...opts }).then(unwrap<RestaurantOrder>),

  /** Once the order is fully paid (or closed on khata) the server turns it into a bill (Sale). */
  addPayment: (id: string, payment: {
    amount: number; paymentMethod: string; paidBy?: string; reference?: string; notes?: string;
    closeOnCredit?: boolean; customerId?: string; managerPin?: string;
  }) =>
    apiClient.post('/restaurant/orders/' + id + '/payments', payment).then(unwrap<RestaurantOrder>),

  /** Pays the bill in one step: several methods, the rest on khata when `closeOnCredit`. */
  checkout: (id: string, body: { payments: CheckoutPart[]; closeOnCredit?: boolean; customerId?: string; managerPin?: string }) =>
    apiClient.post('/restaurant/orders/' + id + '/checkout', body).then(unwrap<RestaurantOrder>),

  addItems: (id: string, items: OrderItem[], sendToKitchen?: boolean) =>
    apiClient.post('/restaurant/orders/' + id + '/items', { items, ...(sendToKitchen && { sendToKitchen }) }).then(unwrap<RestaurantOrder>),

  voidItem: (id: string, itemId: string, body: { reason: string; quantity?: number; managerPin?: string }) =>
    apiClient.post('/restaurant/orders/' + id + '/items/' + itemId + '/void', body).then(unwrap<RestaurantOrder>),

  sendToKitchen: (id: string) =>
    apiClient.post('/restaurant/orders/' + id + '/kitchen').then(unwrap<{ kots: any[]; order: RestaurantOrder }>),

  printBill: (id: string) =>
    apiClient.post('/restaurant/orders/' + id + '/bill').then(unwrap<RestaurantOrder>),

  moveTable: (id: string, tableId: string) =>
    apiClient.post('/restaurant/orders/' + id + '/move', { tableId }).then(unwrap<RestaurantOrder>),

  merge: (id: string, fromOrderId: string) =>
    apiClient.post('/restaurant/orders/' + id + '/merge', { fromOrderId }).then(unwrap<RestaurantOrder>),

  splitItems: (id: string, lines: Array<{ itemId: string; quantity?: number }>) =>
    apiClient.post('/restaurant/orders/' + id + '/split-items', { lines }).then(unwrap<{ parent: RestaurantOrder; child: RestaurantOrder }>),

  removeItem: (id: string, itemId: string) =>
    apiClient.delete('/restaurant/orders/' + id + '/items/' + itemId).then(unwrap),

  splitBill: (id: string, splits: { paidBy: string; amount: number; paymentMethod: string }[], managerPin?: string) =>
    apiClient.post('/restaurant/orders/' + id + '/split-bill', { splits, ...(managerPin && { managerPin }) }).then(unwrap<RestaurantOrder>),
};
