import { apiClient } from '@core/api/client';
import type { BakeryCategory, BakerySize, CakeShape, CakeFlavor, CreamType } from './products.api';

export type BakeryOrderStatus = 'DRAFT' | 'QUOTED' | 'CONFIRMED' | 'DEPOSIT_PAID' | 'IN_PRODUCTION'
  | 'BAKING' | 'DECORATING' | 'QUALITY_CHECK' | 'READY' | 'OUT_FOR_DELIVERY' | 'DELIVERED'
  | 'CANCELLED' | 'REFUNDED';

export type DeliveryType = 'SELF_PICKUP' | 'HOME_DELIVERY' | 'VENUE_DELIVERY' | 'COURIER' | 'DELIVERY' | 'PICKUP' | 'DINE_IN';

export interface CakeOrder {
  id: string;
  orderNumber: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  productId?: string;
  productName?: string;
  category: BakeryCategory;
  size: BakerySize;
  customWeightKg?: number;
  shape: CakeShape;
  customShapeDesc?: string;
  flavor: CakeFlavor;
  customFlavorDesc?: string;
  creamType?: CreamType;
  numberOrLetter?: string;
  numberOfTiers: number;
  tierDetails?: any;
  messageOnCake?: string;
  messageColor?: string;
  hasPhotoOnCake: boolean;
  photoUrl?: string;
  hasEdibleImage: boolean;
  designReferenceUrls: string[];
  designInstructions?: string;
  colorTheme?: string;
  primaryColor?: string;
  secondaryColor?: string;
  decorativeItems: string[];
  candlesRequired?: number;
  candleType?: string;
  cakeStand: boolean;
  cakeKnife: boolean;
  occasion: string;
  celebrantName?: string;
  celebrantAge?: number;
  eventDate?: string;
  eventTime?: string;
  eventVenue?: string;
  isEggless: boolean;
  isSugarFree: boolean;
  isVegan: boolean;
  allergies: string[];
  dietaryNotes?: string;
  deliveryType: DeliveryType;
  neededBy: string;
  deliveryDate?: string;
  deliveryTime?: string;
  deliveryAddress?: string;
  deliveryLandmark?: string;
  deliveryCharges: number;
  status: BakeryOrderStatus;
  productionStatus?: string;
  assignedBakerId?: string;
  assignedDecoratorId?: string;
  basePrice: number;
  customizationCharges: number;
  photoCakeCharges: number;
  taxAmount: number;
  discount: number;
  advanceRequired: number;
  advancePaid: number;
  /** Single-order reads only: part of the money received that is held on the customer's khata. */
  khataPaid?: number;
  total: number;
  paidAmount: number;
  paymentStatus: string;
  confirmedAt?: string;
  startedAt?: string;
  completedAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  customerRating?: number;
  customerFeedback?: string;
  finalPhotoUrls: string[];
  specialInstructions?: string;
  internalNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export type CakeOrderView = 'active' | 'today' | 'tomorrow' | 'late' | 'ready' | 'unpaid' | 'done' | 'all';

export interface CakeOrderQuery {
  view?: CakeOrderView;
  search?: string;
  from?: string;
  to?: string;
  deliveryType?: string;
  occasion?: string;
  sort?: 'due' | 'recent' | 'amount';
  page?: number;
  limit?: number;
}

export interface CakeOrderPage {
  items: CakeOrder[];
  total: number;
  page: number;
  pages: number;
  counts: Record<CakeOrderView, number>;
  /** Money of the whole open view; null for closed views. */
  totals: { value: number; due: number } | null;
}

export interface CountBucket { key: string; count: number; value: number }

export interface CakeOrderSummary {
  period: { from: string; to: string; grouping: 'day' | 'month' };
  open: { count: number; value: number; due: number; today: number; tomorrow: number; late: number; ready: number; unpaid: number; advanceShort: number };
  totals: { orders: number; value: number; collected: number; delivered: number; deliveredValue: number; cancelled: number; avgOrder: number; avgRating: number | null; rated: number };
  byDay: CountBucket[];
  byHour: Array<{ hour: number; count: number }>;
  byStatus: CountBucket[];
  byOccasion: CountBucket[];
  byFlavor: CountBucket[];
  bySize: CountBucket[];
  byDelivery: CountBucket[];
}

/** The sale made when an order was handed over. */
export interface OrderBill { id: string; saleNumber: string; total: number; paidAmount: number; soldAt: string; status: string }

/** How order money was paid, and whether it came with the delivery bill. */
export interface OrderPayOptions { method?: OrderPayMethod; withBill?: boolean }
export type OrderPayMethod = 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'JAZZCASH' | 'EASYPAISA';

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const cakeOrdersApi = {
  create: (data: any) => apiClient.post('/bakery/cake-orders', data).then(unwrap<CakeOrder>),
  update: (id: string, data: any) => apiClient.patch('/bakery/cake-orders/' + id, data).then(unwrap<CakeOrder>),
  /** `open: true` returns every order still to deliver. */
  list: (params?: any) => apiClient.get('/bakery/cake-orders', { params }).then(unwrap<CakeOrder[]>),
  page: (q: CakeOrderQuery) => apiClient.get('/bakery/cake-orders/page', { params: q }).then(unwrap<CakeOrderPage>),
  summary: (range?: { from?: string; to?: string }) => apiClient.get('/bakery/cake-orders/summary', { params: range }).then(unwrap<CakeOrderSummary>),
  bill: (id: string) => apiClient.get('/bakery/cake-orders/' + id + '/bill').then(unwrap<OrderBill | null>),
  upcoming: (days?: number) => apiClient.get('/bakery/cake-orders/upcoming', { params: { days } }).then(unwrap<CakeOrder[]>),
  calendar: (from: string, to: string) => apiClient.get('/bakery/cake-orders/calendar', { params: { from, to } }).then(unwrap<CakeOrder[]>),
  getOne: (id: string) => apiClient.get('/bakery/cake-orders/' + id).then(unwrap<CakeOrder>),
  updateStatus: (id: string, status: string, cancellationReason?: string) =>
    apiClient.patch('/bakery/cake-orders/' + id + '/status', { status, cancellationReason }).then(unwrap<CakeOrder>),
  /**
   * `expectedPaid` = paid amount the screen showed; the server refuses a repeat.
   * The money goes on the customer's khata as an advance, unless `withBill`
   * (taken with the delivery bill, which records it).
   */
  addPayment: (id: string, amount: number, expectedPaid?: number, opts?: OrderPayOptions) =>
    apiClient.post('/bakery/cake-orders/' + id + '/payment', { amount, expectedPaid, ...opts }).then(unwrap<CakeOrder>),
  assign: (id: string, bakerId: string, decoratorId?: string) =>
    apiClient.post('/bakery/cake-orders/' + id + '/assign', { bakerId, decoratorId }).then(unwrap<CakeOrder>),
  rate: (id: string, rating: number, feedback?: string, photoUrls?: string[]) =>
    apiClient.post('/bakery/cake-orders/' + id + '/rating', { rating, feedback, photoUrls }).then(unwrap<CakeOrder>),
};
