/**
 * Restaurant endpoints (same paths and shapes as apps/web/src/industries/restaurant/api):
 * orders, kitchen tickets, tables, the menu with add-ons, happy hours,
 * delivery and riders, kitchen stations, recipes and the dashboard.
 */

import { apiClient } from '@/core/api/client';
import type { KotStatus, OrderMode, OrderStatus, TableStatus } from '@nafaa/core/restaurant';

export type { KotStatus, OrderMode, OrderStatus, TableStatus };

const get = <T>(path: string, params?: object) => apiClient.get<T>(path, { params }).then((r) => r.data);
const post = <T>(path: string, body?: object) => apiClient.post<T>(path, body ?? {}).then((r) => r.data);
const patch = <T>(path: string, body?: object) => apiClient.patch<T>(path, body ?? {}).then((r) => r.data);
const del = <T>(path: string) => apiClient.delete<T>(path).then((r) => r.data);

// ── Orders ─────────────────────────────────────────────────────

export interface OrderItemModifier { modifierOptionId: string; quantity?: number; notes?: string }

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
  product?: { id?: string; name?: string; variants?: Array<{ id: string; name: string }> } | null;
  total?: number;
  modifierTotal?: number;
}

export interface Kot {
  id: string;
  orderId: string;
  kotNumber: string;
  station?: string | null;
  status: KotStatus;
  itemIds: string[];
  itemsSnapshot: unknown;
  notes?: string | null;
  priority?: string | null;
  order?: {
    id: string; orderNumber: string; mode: OrderMode; status: OrderStatus; numberOfGuests?: number | null; customerName?: string | null;
    specialRequests?: string | null; createdAt: string; estimatedPrepTime?: number | null; token?: number | null;
    table?: { tableNumber: string; tableName?: string | null; section?: string | null } | null;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface RestaurantOrder {
  id: string;
  orderNumber: string;
  mode: OrderMode;
  status: OrderStatus;
  tableId?: string | null;
  customerId?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  numberOfGuests?: number | null;
  specialRequests?: string | null;
  waiterId?: string | null;
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
  placedAt?: string | null;
  readyAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  deliveryAddress?: string | null;
  deliveryNotes?: string | null;
  isSplitBill: boolean;
  parentOrderId?: string | null;
  saleId?: string | null;
  riderId?: string | null;
  token?: number | null;
  waiter?: { id: string; fullName: string } | null;
  waiterName?: string | null;
  sale?: { id: string; saleNumber: string; status: string; total?: number; creditAmount: number; refundedAmount?: number } | null;
  splitOrders?: Array<{ id: string; orderNumber: string; total: number; status: OrderStatus; saleId?: string | null }>;
  parentOrder?: { id: string; orderNumber: string; status: OrderStatus } | null;
  items: OrderItem[];
  table?: { id?: string; tableNumber: string; tableName?: string | null; section?: string | null } | null;
  delivery?: { riderId?: string | null; status: string; rider?: { id: string; name: string; phone: string } | null } | null;
  kots?: Kot[];
  payments?: Array<{ id: string; paymentMethod: string; amount: number; paidBy?: string | null }>;
  createdAt: string;
  updatedAt: string;
}

export interface OrderCharges { serviceChargePct?: number; taxPct?: number; discount?: number; deliveryFee?: number; packagingFee?: number; tip?: number }
export type CheckoutPart = { method: string; amount: number; reference?: string | null; paidBy?: string };

export interface OrderPageQuery { search?: string; status?: string; mode?: string; tableId?: string; waiterId?: string; from?: string; to?: string; sort?: string; page?: number; limit?: number }

export interface OrderPageStats {
  all: number; open: number; openAmount: number; kitchen: number; ready: number; billPrinted: number;
  completed: number; completedAmount: number; cancelled: number; cancelledAmount: number; averageBill: number; voidedBills: number;
  byMode: Array<{ mode: OrderMode; count: number; amount: number }>;
}
export interface OrderPage { items: RestaurantOrder[]; total: number; page: number; limit: number; stats: OrderPageStats }

interface GroupRow { key: string; label: string; bills: number; amount: number }
export interface DayClose {
  date: string;
  figures: { bills: number; net: number; gross: number; refunds: number; cashIn: number; credit: number; discount: number; service: number };
  groupedTotal: number;
  tips: number;
  byMode: GroupRow[];
  byWaiter: GroupRow[];
  byTable: GroupRow[];
  openOrders: Array<{ id: string; orderNumber: string; mode: OrderMode; status: OrderStatus; total: number; paidAmount: number; due: number; createdAt: string; customerName?: string | null; table?: { tableNumber: string } | null }>;
  openAmount: number;
  voids: { count: number; amount: number; cookedAmount: number; items: Array<{ id: string; quantity: number; total: number; returnReason?: string | null; product?: { name: string } | null; order: { id: string; orderNumber: string } }> };
  cancelled: { count: number; amount: number; orders: Array<{ id: string; orderNumber: string; total: number; cancellationReason?: string | null }> };
  riderCash: Array<{ riderId: string; name: string; phone: string; orders: number; amount: number }>;
}

export type NewOrder = Partial<Omit<RestaurantOrder, 'items'>> & { items: OrderItem[]; sendToKitchen?: boolean };

export const ordersApi = {
  create: (data: NewOrder) => post<RestaurantOrder>('/restaurant/orders', data),
  list: (params?: { status?: string; mode?: string; tableId?: string; from?: string; to?: string; search?: string; saleId?: string; open?: boolean; waiterId?: string }) =>
    get<RestaurantOrder[]>('/restaurant/orders', params),
  page: (params: OrderPageQuery) => get<OrderPage>('/restaurant/orders/page', params),
  dayClose: (date?: string) => get<DayClose>('/restaurant/orders/day-close', date ? { date } : {}),
  getOne: (id: string) => get<RestaurantOrder>(`/restaurant/orders/${id}`),
  update: (id: string, data: OrderCharges & { numberOfGuests?: number; waiterId?: string; customerId?: string; customerName?: string; customerPhone?: string; specialRequests?: string; deliveryAddress?: string; deliveryNotes?: string }) =>
    patch<RestaurantOrder>(`/restaurant/orders/${id}`, data),
  updateStatus: (id: string, status: OrderStatus, opts?: { notes?: string; cancellationReason?: string; managerPin?: string }) =>
    patch<RestaurantOrder>(`/restaurant/orders/${id}/status`, { status, ...opts }),
  checkout: (id: string, body: { payments: CheckoutPart[]; closeOnCredit?: boolean; customerId?: string; managerPin?: string }) =>
    post<RestaurantOrder>(`/restaurant/orders/${id}/checkout`, body),
  addItems: (id: string, items: OrderItem[], sendToKitchen?: boolean) =>
    post<RestaurantOrder>(`/restaurant/orders/${id}/items`, { items, ...(sendToKitchen && { sendToKitchen }) }),
  voidItem: (id: string, itemId: string, body: { reason: string; quantity?: number; managerPin?: string }) =>
    post<RestaurantOrder>(`/restaurant/orders/${id}/items/${itemId}/void`, body),
  sendToKitchen: (id: string) => post<{ kots: Kot[]; order: RestaurantOrder }>(`/restaurant/orders/${id}/kitchen`),
  printBill: (id: string) => post<RestaurantOrder>(`/restaurant/orders/${id}/bill`),
  moveTable: (id: string, tableId: string) => post<RestaurantOrder>(`/restaurant/orders/${id}/move`, { tableId }),
  merge: (id: string, fromOrderId: string) => post<RestaurantOrder>(`/restaurant/orders/${id}/merge`, { fromOrderId }),
  splitItems: (id: string, lines: Array<{ itemId: string; quantity?: number }>) =>
    post<{ parent: RestaurantOrder; child: RestaurantOrder }>(`/restaurant/orders/${id}/split-items`, { lines }),
};

export const kotApi = {
  list: (params?: { status?: string; station?: string; orderId?: string; active?: boolean }) => get<Kot[]>('/restaurant/kot', params),
  updateStatus: (id: string, status: KotStatus) => patch<Kot>(`/restaurant/kot/${id}/status`, { status }),
};

// ── Tables ─────────────────────────────────────────────────────

export interface RestaurantTable {
  id: string;
  tableNumber: string;
  tableName?: string | null;
  capacity: number;
  minCapacity?: number;
  maxCapacity?: number;
  section?: string | null;
  floor?: string | null;
  shape?: string | null;
  status: TableStatus;
  isReservable: boolean;
  isSmokingAllowed?: boolean;
  isAcRoom?: boolean;
  isFamilyArea?: boolean;
  isVip?: boolean;
  minOrderAmount?: number | null;
  occupiedAt?: string | null;
  reservedFor?: string | null;
  reservedByName?: string | null;
  reservedByPhone?: string | null;
  reservationNote?: string | null;
  notes?: string | null;
  isActive?: boolean;
}

export interface FloorTable extends RestaurantTable {
  liveStatus: TableStatus;
  orders: Array<{ id: string; orderNumber: string; status: OrderStatus; total: number; paidAmount: number; parentOrderId?: string | null }>;
  currentOrder: { id: string; orderNumber: string; status: string; createdAt: string } | null;
  runningBill: number;
  guests: number | null;
  waiterName: string | null;
  billPrinted: boolean;
  unsent: number;
  cooking: number;
  ready: number;
}

export interface Floor {
  tables: FloorTable[];
  sections: string[];
  stats: { total: number; available: number; occupied: number; reserved: number; cleaning: number; outOfService: number; billPrinted: number; guests: number; runningBill: number; ready: number };
}

export interface TableInput {
  tableNumber: string; tableName?: string; capacity: number; section?: string; isReservable?: boolean; isVip?: boolean;
  isAcRoom?: boolean; isFamilyArea?: boolean; isSmokingAllowed?: boolean; minOrderAmount?: number; notes?: string;
}

export const tablesApi = {
  floor: () => get<Floor>('/restaurant/tables/floor'),
  create: (data: TableInput) => post<RestaurantTable>('/restaurant/tables', data),
  update: (id: string, data: Partial<TableInput>) => patch<RestaurantTable>(`/restaurant/tables/${id}`, data),
  changeStatus: (id: string, status: TableStatus) => post<RestaurantTable>(`/restaurant/tables/${id}/status`, { status }),
  reserve: (id: string, data: { reservedByName: string; reservedByPhone?: string; reservedFor: string; reservationNote?: string; numberOfGuests?: number }) =>
    post<RestaurantTable>(`/restaurant/tables/${id}/reserve`, data),
  cancelReservation: (id: string) => post<RestaurantTable>(`/restaurant/tables/${id}/cancel-reservation`),
  remove: (id: string) => del<unknown>(`/restaurant/tables/${id}`),
};

// ── Menu ───────────────────────────────────────────────────────

export type SpiceLevel = 'NONE' | 'MILD' | 'MEDIUM' | 'HOT' | 'EXTRA_HOT';
export type DietaryTag = 'VEGETARIAN' | 'VEGAN' | 'HALAL' | 'GLUTEN_FREE' | 'DAIRY_FREE' | 'NUT_FREE' | 'SPICY' | 'CONTAINS_EGG' | 'CONTAINS_SEAFOOD' | 'BEEF' | 'CHICKEN' | 'MUTTON';

export interface RawModifierGroup {
  id: string; name: string; type?: string; isRequired?: boolean; isActive?: boolean; minSelections?: number; maxSelections?: number;
  options?: Array<{ id: string; name: string; priceAdjustment?: number | string; isDefault?: boolean; isActive?: boolean }>;
}

export interface RestaurantMenuItem {
  id: string;
  productId: string;
  prepTimeMinutes?: number | null;
  cookingInstructions?: string | null;
  chefSpecial: boolean;
  bestSeller: boolean;
  isSpicy: boolean;
  spiceLevel?: SpiceLevel | null;
  calories?: number | null;
  servingSize?: string | null;
  servesPeople?: number | null;
  dietaryTags: DietaryTag[];
  allergenInfo?: string | null;
  displayOrder: number;
  isAvailable: boolean;
  availableFrom?: string | null;
  availableTo?: string | null;
  availableDays: number[];
  imageUrl?: string | null;
  tagLine?: string | null;
  totalOrdered: number;
  servingNow?: boolean;
  offHere?: boolean;
  offUntil?: string | null;
  product?: {
    id: string; name: string; sku?: string | null; price: number | string; unit?: string; costPrice?: number | string;
    images?: Array<{ url: string }>; category?: { id: string; name: string; color?: string | null } | null;
    variants?: Array<{ id: string; name: string; price?: number | string | null }>;
  } | null;
  modifiers?: Array<{ modifierGroupId: string; displayOrder: number; modifierGroup?: RawModifierGroup }>;
}

export interface MenuProfileInput {
  productId: string; prepTimeMinutes?: number; cookingInstructions?: string; chefSpecial?: boolean; bestSeller?: boolean; isSpicy?: boolean;
  spiceLevel?: SpiceLevel; calories?: number; servingSize?: string; servesPeople?: number; dietaryTags?: DietaryTag[]; allergenInfo?: string;
  displayOrder?: number; isAvailable?: boolean; availableFrom?: string; availableTo?: string; availableDays?: number[]; imageUrl?: string; tagLine?: string;
}

export const menuItemsApi = {
  list: (params?: { available?: boolean; bestSeller?: boolean; chefSpecial?: boolean; search?: string; serving?: boolean }) =>
    get<RestaurantMenuItem[]>('/restaurant/menu-items', params),
  upsert: (data: MenuProfileInput) => post<RestaurantMenuItem>('/restaurant/menu-items', data),
  byProduct: (productId: string) => get<RestaurantMenuItem | null>(`/restaurant/menu-items/by-product/${productId}`),
  attachModifiers: (id: string, modifierGroupIds: string[]) => post<unknown>(`/restaurant/menu-items/${id}/modifiers`, { modifierGroupIds }),
  setAvailable: (id: string, available: boolean) => post<RestaurantMenuItem>(`/restaurant/menu-items/${id}/availability`, { available }),
  setAvailableMany: (menuItemIds: string[], available: boolean) => post<{ updated: number }>('/restaurant/menu-items/availability', { menuItemIds, available }),
  setBranch: (menuItemIds: string[], available: boolean, until?: string | null) =>
    post<{ updated: number; branches: number; until: string | null }>('/restaurant/menu-items/branch-availability', { menuItemIds, available, ...(until !== undefined && { until }) }),
  addToMenu: (productIds: string[]) => post<{ added: number }>('/restaurant/menu-items/add-to-menu', { productIds }),
  remove: (id: string) => del<unknown>(`/restaurant/menu-items/${id}`),
};

export interface HappyQuote {
  lines: Array<{ productId: string; quantity: number; unitPrice: number; discount: number; ruleId: string | null; ruleName: string | null }>;
  discount: number;
  rules: Array<{ id: string; name: string; saved: number }>;
}

export const happyQuote = (items: Array<{ productId: string; quantity: number; variantId?: string }>, mode?: OrderMode) =>
  get<HappyQuote>('/restaurant/happy-hours/quote', { items: items.map((i) => `${i.productId}:${i.quantity}${i.variantId ? `:${i.variantId}` : ''}`).join(','), mode });

// ── Delivery and riders ────────────────────────────────────────

export type RiderStatus = 'ACTIVE' | 'BUSY' | 'OFFLINE' | 'ON_BREAK' | 'INACTIVE';
export interface Rider {
  id: string; name: string; phone: string; cnic?: string | null; vehicleType?: string | null; vehicleNumber?: string | null; status: RiderStatus;
  isEmployee: boolean; commissionType?: string | null; commissionValue: number; baseSalary: number; totalDeliveries: number; avgRating?: number | null;
  isActive: boolean; notes?: string | null; activeTrips?: number; cashDue?: number;
}

export const ridersApi = {
  list: (params?: { status?: string; active?: boolean }) => get<Rider[]>('/restaurant/riders', params),
};

export const deliveryApi = {
  assign: (orderId: string, data: { riderId: string; estimatedMinutes?: number; deliveryFee?: number; riderCommission?: number }) =>
    post<unknown>(`/restaurant/delivery/assign/${orderId}`, data),
};

// ── Dashboard ──────────────────────────────────────────────────

export const restaurantDashboardApi = {
  overview: () => get<Record<string, unknown>>('/restaurant/dashboard/overview'),
  ordersByHour: () => get<Array<{ hour: number; orders?: number; count?: number; revenue?: number; amount?: number }>>('/restaurant/dashboard/orders-by-hour'),
  kitchenPerformance: () => get<Record<string, unknown>>('/restaurant/dashboard/kitchen-performance'),
};
