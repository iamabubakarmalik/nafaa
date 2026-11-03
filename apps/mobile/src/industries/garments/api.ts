/**
 * Garments endpoints (same paths and shapes as apps/web/src/industries/garments/api):
 * stitching orders, alterations, holds, instalment plans, exchanges, measurements,
 * collections, size charts and the garment product profile. Desk screens need the
 * server and show the last saved data offline.
 */

import { apiClient } from '@/core/api/client';
import { withManagerPin } from '@/core/security/ManagerPin';
import { t } from '@/core/i18n';
import type { AlterationStatus, TailoringStatus } from '@nafaa/core/industries/garments';

export type { AlterationStatus, TailoringStatus };
export type PayMethod = 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'JAZZCASH' | 'EASYPAISA' | string;
export type Priority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

const get = <T>(path: string, params?: object) => apiClient.get<T>(path, { params }).then((r) => r.data);
const post = <T>(path: string, body?: object) => apiClient.post<T>(path, body ?? {}).then((r) => r.data);
const patch = <T>(path: string, body?: object) => apiClient.patch<T>(path, body ?? {}).then((r) => r.data);
const del = <T>(path: string) => apiClient.delete<T>(path).then((r) => r.data);

/* ───────────── products ───────────── */

export interface GarmentMeta {
  productId: string; gender?: string | null; categoryType?: string | null; season: string; collectionId?: string | null;
  fabricType?: string | null; styleCode?: string | null; isReadyMade: boolean; isStitchable: boolean; isFabricOnly: boolean;
  isNewArrival: boolean; isBestSeller: boolean; isOnSale: boolean;
}
export interface GarmentProfile {
  id: string; productId: string; collectionId?: string; sizeChartId?: string; gender?: string; categoryType?: string; season: string;
  fabricType?: string; workType: string; styleCode?: string; careInstructions?: string;
  isReadyMade: boolean; isStitchable: boolean; isFabricOnly: boolean; allowAlteration: boolean; allowReservation: boolean; allowLayaway: boolean;
  isNewArrival: boolean; isFeatured: boolean; isBestSeller: boolean; isOnSale: boolean;
}
interface SizeGridVariant {
  id: string; name: string; barcode?: string | null; sku?: string | null; price: number; isActive: boolean;
  size?: string | null; colorName?: string | null; colorHex?: string | null; lowStockAlert: number;
  stock: number; allStock: number; sold30: number; reserved: number;
  byShop: Array<{ shopId: string; name: string; stock: number }>;
}
export interface SizeGrid { productId: string; name: string; sizes: string[]; colors: string[]; shops: Array<{ id: string; name: string }>; variants: SizeGridVariant[] }
export interface ReorderGroup {
  productId: string; name: string; sold30: number;
  sizes: Array<{ variantId: string; name: string; size?: string | null; colorName?: string | null; stock: number; alert: number; sold30: number; suggest: number }>;
}
export interface HeldItem { productId: string; variantId: string | null; stock: number; reserved: number }

export const garmentProductsApi = {
  upsert: (data: Partial<GarmentProfile> & { productId: string }) => post<GarmentProfile>('/garments/products', data),
  byProduct: (productId: string) => get<GarmentProfile | null>('/garments/products/by-product/' + productId),
  meta: () => get<{ items: GarmentMeta[]; collections: Array<{ id: string; name: string; isActive: boolean }> }>('/garments/products/meta'),
  sizeGrid: (productId: string) => get<SizeGrid>(`/garments/products/${productId}/size-grid`),
  reorder: (limit = 50) => get<{ items: ReorderGroup[]; products: number; pieces: number }>('/garments/products/reorder', { limit }),
  saveVariantProfiles: (productId: string, items: Array<{ variantId: string; size?: string; colorName?: string; colorHex?: string; displayOrder?: number }>) =>
    post<{ saved: number }>(`/garments/products/${productId}/variant-profiles`, { items }),
  splitVariantStock: (productId: string) => post<{ moved: number; reason?: string }>(`/garments/products/${productId}/variant-stock-split`),
  overview: () => get<GarmentsOverview>('/garments/dashboard/overview'),
};

export interface GarmentsOverview {
  totals?: { totalCollections: number; activeCollections: number; totalMeasurements: number; newArrivals: number; bestSellers: number; onSaleCount: number };
  pending?: { tailoring: number; alterations: number; reservations: number; layaway: number };
  today?: {
    tailoringDue: number; tailoringLate: number; tailoringReady: number; tailoringTrial: number; alterationsDue: number; alterationsLate: number;
    alterationsReady: number; toCollect: number; advanceHeld: number; holdsEndingToday: number; layawayOverdue: number;
  };
  tailoringRevenue?: { total: number; paid: number; count: number };
  upcomingDeliveries?: Array<{ id: string; orderNumber: string; customerName?: string | null; priority?: string | null; promisedDate?: string | null; total?: number | string | null }>;
  upcomingAlterations?: Array<{ id: string; ticketNumber: string; customerName?: string | null; garmentDescription?: string | null; promisedDate?: string | null }>;
  bySeason?: Array<{ season: string; _count: { _all: number } }>;
  byGender?: Array<{ gender: string; _count: { _all: number } }>;
}

/* ───────────── tailoring ───────────── */

export type TailoringView = 'active' | 'today' | 'tomorrow' | 'late' | 'trial' | 'ready' | 'unpaid' | 'done' | 'all';
export interface TailoringItem {
  id: string; garmentName: string; categoryType?: string | null; quantity: number; fabricName?: string | null; fabricMeters?: number | null;
  fabricCost: number; stitchingCost: number; embroideryCost: number; accessoryCost: number; total: number; size?: string | null; colorName?: string | null;
  designNotes?: string | null; fabricProductId?: string | null; fabricVariantId?: string | null;
}
export interface TailoringOrder {
  id: string; orderNumber: string; customerId?: string | null; customerName?: string | null; customerPhone?: string | null; customerNotes?: string | null;
  orderStatus: TailoringStatus; priority: Priority; paymentStatus: string; tailorId?: string | null; tailorName?: string | null;
  orderDate: string; promisedDate?: string | null; readyDate?: string | null; deliveredAt?: string | null; cancellationReason?: string | null;
  measurementProfileId?: string | null; subtotal: number; discount: number; total: number; paidAmount: number; designInstructions?: string | null; internalNotes?: string | null;
  items: TailoringItem[];
  payments?: Array<{ id: string; amount: number; paymentMethod: string; reference?: string | null; paidAt: string }>;
  customer?: { id: string; name: string; phone?: string | null; balance: number } | null;
  measurementProfile?: (Record<string, unknown> & { id: string; profileName: string; unit: 'INCH' | 'CM' }) | null;
  bill?: { id: string; saleNumber: string; total: number } | null;
}
export interface TailoringItemInput {
  garmentName: string; categoryType?: string; quantity: number; fabricMeters?: number; fabricCost?: number; stitchingCost?: number;
  embroideryCost?: number; accessoryCost?: number; size?: string; colorName?: string; designNotes?: string;
  fabricProductId?: string; fabricVariantId?: string;
}
export interface TailoringInput {
  customerId?: string; customerName?: string; customerPhone?: string; customerNotes?: string; measurementProfileId?: string; priority?: Priority;
  tailorId?: string; promisedDate?: string; discount?: number; designInstructions?: string; internalNotes?: string;
  status?: 'DRAFT' | 'QUOTED' | 'CONFIRMED'; advanceAmount?: number; advanceMethod?: PayMethod; items: TailoringItemInput[];
}
export interface TailoringQuery { view?: TailoringView; page?: number; limit?: number; search?: string; priority?: string; tailorId?: string; sort?: 'due' | 'recent' | 'amount' }
export interface TailoringPage {
  items: TailoringOrder[]; total: number; page: number; pages: number; counts: Record<TailoringView, number>;
  totals: { value: number; due: number; advance: number } | null;
}
export interface TailoringSummary {
  open: { count: number; value: number; due: number; advance: number; today: number; late: number; trial: number; ready: number; urgent: number; unpaid: number };
  period: {
    booked: number; bookedValue: number; cancelled: number; delivered: number; deliveredValue: number; onTimePct: number | null; avgDays: number | null;
    garments: Array<{ key: string; pieces: number; value: number }>; tailors: Array<{ id: string; name: string; orders: number; value: number }>;
  };
}
export const tailoringApi = {
  create: (data: TailoringInput) => post<TailoringOrder>('/garments/tailoring', data),
  update: (id: string, data: Partial<Omit<TailoringInput, 'status' | 'advanceAmount' | 'advanceMethod'>>) => patch<TailoringOrder>('/garments/tailoring/' + id, data),
  page: (q: TailoringQuery) => get<TailoringPage>('/garments/tailoring/page', q),
  summary: (params?: { from?: string; to?: string }) => get<TailoringSummary>('/garments/tailoring/summary', params),
  getOne: (id: string) => get<TailoringOrder>('/garments/tailoring/' + id),
  updateStatus: (id: string, status: TailoringStatus, opts?: { notes?: string; cancellationReason?: string; paidNow?: number; paymentMethod?: PayMethod }) =>
    patch<TailoringOrder>('/garments/tailoring/' + id + '/status', { status, ...opts }),
  addPayment: (id: string, data: { amount: number; paymentMethod: PayMethod; reference?: string; notes?: string }) =>
    post<TailoringOrder>('/garments/tailoring/' + id + '/payments', data),
};

/* ───────────── alterations ───────────── */

export type AlterationView = 'active' | 'today' | 'late' | 'ready' | 'unpaid' | 'done' | 'all';
export interface AlterationTicket {
  id: string; ticketNumber: string; customerId?: string | null; saleId?: string | null; customerName?: string | null; customerPhone?: string | null;
  garmentDescription: string; alterationType: string; alterationDetails?: string | null; status: AlterationStatus; priority: Priority;
  receivedAt: string; promisedDate?: string | null; tailorId?: string | null; tailorName?: string | null; charges: number; paidAmount: number;
  paymentStatus: string; notes?: string | null; bill?: { id: string; saleNumber: string; total: number } | null;
}
export interface AlterationInput {
  customerId?: string; customerName?: string; customerPhone?: string; garmentDescription: string; alterationType: string; alterationDetails?: string;
  priority?: Priority; promisedDate?: string; tailorId?: string; charges?: number; notes?: string; advanceAmount?: number; advanceMethod?: PayMethod;
}
export interface AlterationPage {
  items: AlterationTicket[]; total: number; page: number; pages: number; counts: Record<AlterationView, number>; totals: { value: number; due: number } | null;
}
export interface AlterationSummary {
  open: { count: number; value: number; due: number; today: number; late: number; ready: number };
  period: { received: number; delivered: number; value: number; free: number; fromOwnSales: number; onTimePct: number | null; types: Array<{ type: string; count: number; value: number }> };
}
export const alterationsApi = {
  create: (data: AlterationInput) => post<AlterationTicket>('/garments/alterations', data),
  page: (q: { view?: AlterationView; page?: number; limit?: number; search?: string }) => get<AlterationPage>('/garments/alterations/page', q),
  summary: () => get<AlterationSummary>('/garments/alterations/summary'),
  updateStatus: (id: string, status: AlterationStatus, opts?: { paidNow?: number; paymentMethod?: PayMethod; reason?: string }) =>
    post<AlterationTicket>('/garments/alterations/' + id + '/status', { status, ...opts }),
  payment: (id: string, amount: number, paymentMethod: PayMethod) => post<AlterationTicket>('/garments/alterations/' + id + '/payment', { amount, paymentMethod }),
};

/* ───────────── holds ───────────── */

export type ReservationView = 'active' | 'today' | 'expired' | 'sold' | 'cancelled' | 'all';
export interface Reservation {
  id: string; reservationNumber: string; customerId?: string | null; productId: string; variantId?: string | null; productName?: string | null;
  customerName?: string | null; customerPhone?: string | null; quantity: number; unitPrice: number; depositAmount: number; total: number; balance: number;
  status: 'ACTIVE' | 'CONVERTED_TO_SALE' | 'EXPIRED' | 'CANCELLED'; reservedAt: string; expiresAt: string; notes?: string | null; bill?: { id: string; saleNumber: string } | null;
}
export interface ReservationInput {
  customerId?: string; customerName?: string; customerPhone?: string; productId: string; variantId?: string; quantity?: number; unitPrice?: number;
  depositAmount?: number; paymentMethod?: PayMethod; holdDays?: number; notes?: string;
}
export interface ReservationPage {
  items: Reservation[]; total: number; page: number; pages: number; counts: Record<ReservationView, number>; totals: { pieces: number; value: number; deposits: number };
}
export const reservationsApi = {
  create: (data: ReservationInput) => post<Reservation>('/garments/reservations', data),
  page: (q: { view?: ReservationView; page?: number; limit?: number; search?: string }) => get<ReservationPage>('/garments/reservations/page', q),
  held: () => get<{ items: HeldItem[] }>('/garments/reservations/held'),
  sell: (id: string, data: { paidNow?: number; paymentMethod?: PayMethod }) => post<Reservation>('/garments/reservations/' + id + '/sell', data),
  extend: (id: string, days: number) => post<Reservation>('/garments/reservations/' + id + '/extend', { days }),
  cancel: (id: string, reason?: string) => post<Reservation>('/garments/reservations/' + id + '/cancel', { reason }),
};

/* ───────────── instalment plans ───────────── */

export type LayawayView = 'active' | 'overdue' | 'week' | 'completed' | 'cancelled' | 'all';
export interface LayawayPlan {
  id: string; planNumber: string; customerId?: string | null; customerName?: string | null; customerPhone?: string | null; productId?: string | null;
  productName?: string | null; totalAmount: number; depositAmount: number; paidAmount: number; remainingAmount: number; installmentCount: number;
  installmentAmount: number; frequency: string; startDate: string; nextDueDate?: string | null; status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'DEFAULTED' | 'REFUNDED';
  notes?: string | null; bill?: { id: string; saleNumber: string } | null;
  installments: Array<{ id: string; installmentNo: number; dueDate: string; amount: number; paidAmount: number; status: string }>;
}
export interface LayawayInput {
  customerId?: string; customerName?: string; customerPhone?: string; productId?: string; variantId?: string; totalAmount: number; depositAmount?: number;
  installmentCount: number; frequency?: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY'; startDate?: string; notes?: string; paymentMethod?: PayMethod;
}
export interface LayawayPage {
  items: LayawayPlan[]; total: number; page: number; pages: number; counts: Record<LayawayView, number>; totals: { remaining: number; paid: number; value: number };
}
export const layawayApi = {
  create: (data: LayawayInput) => post<LayawayPlan>('/garments/layaway', data),
  page: (q: { view?: LayawayView; page?: number; limit?: number; search?: string }) => get<LayawayPage>('/garments/layaway/page', q),
  pay: (id: string, data: { amount: number; paymentMethod: PayMethod }) => post<LayawayPlan>('/garments/layaway/' + id + '/pay', data),
  complete: (id: string) => post<LayawayPlan>('/garments/layaway/' + id + '/complete'),
  cancel: (id: string, reason?: string) => post<LayawayPlan>('/garments/layaway/' + id + '/cancel', { reason }),
};

/* ───────────── exchange ───────────── */

export interface ExchangeLine {
  saleItemId: string; productId: string; variantId: string | null; name: string; variantName: string | null; unit: string;
  quantity: number; returnable: number; unitRefund: number;
}
export interface ExchangePreview {
  sale: { id: string; saleNumber: string; soldAt: string; total: number; creditAmount: number; status: string; customer: { id: string; name: string; phone: string | null } | null; shop: { id: string; name: string } | null };
  exchangeDays: number; days: number; late: boolean; needsPin: boolean; lines: ExchangeLine[];
}
export interface ExchangeInput {
  saleId: string; returnItems: Array<{ saleItemId: string; quantity: number; restock?: boolean }>;
  items: Array<{ productId: string; variantId?: string; quantity: number }>; paymentMethod?: PayMethod; reason?: string;
}
export interface ExchangeResult {
  returnId: string; returnNumber: string; refundAmount: number; khataAmount: number; credit: number; paidNow: number; days: number; late: boolean;
  sale: { id: string; saleNumber: string; total: number; paidAmount: number; changeAmount: number; creditAmount: number };
}
export const exchangeApi = {
  preview: (saleId: string) => get<ExchangePreview>('/garments/returns/exchange/' + saleId),
  /** Asks for the owner's or a manager's PIN when the server wants one, then sends again. */
  create: (data: ExchangeInput) => withManagerPin(t('Exchange'), (managerPin) => post<ExchangeResult>('/garments/returns/exchange', { ...data, managerPin }), 'refund'),
};

/* ───────────── measurements ───────────── */

export const MEASURE_FIELDS = [
  'neck', 'shoulder', 'chest', 'bust', 'waist', 'hip', 'armhole', 'bicep', 'wrist', 'sleeveLength',
  'shirtLength', 'kurtaLength', 'daman', 'trouserLength', 'shalwarLength', 'shalwarBottom', 'inseam', 'thigh', 'knee', 'bottom',
] as const;
export type MeasureField = (typeof MEASURE_FIELDS)[number];
export type MeasurementProfile = { [K in MeasureField]?: number | null } & {
  id: string; customerId: string; profileName: string; gender?: string | null; unit: 'INCH' | 'CM'; postureNotes?: string | null;
  fittingNotes?: string | null; measuredAt: string; isDefault: boolean; customer?: { id: string; name: string; phone?: string | null } | null;
};
export type MeasurementInput = { [K in MeasureField]?: number } & {
  customerId: string; profileName?: string; gender?: string; unit?: 'INCH' | 'CM'; postureNotes?: string; fittingNotes?: string; isDefault?: boolean;
};
export interface MeasurementPage { items: MeasurementProfile[]; total: number; page: number; pages: number; stats: { customers: number; recent: number } }
export const measurementsApi = {
  create: (data: MeasurementInput) => post<MeasurementProfile>('/garments/measurements', data),
  page: (q: { page: number; limit?: number; search?: string; gender?: string }) => get<MeasurementPage>('/garments/measurements', q),
  byCustomer: (customerId: string) => get<MeasurementProfile[]>('/garments/measurements/by-customer/' + customerId),
  update: (id: string, data: MeasurementInput) => patch<MeasurementProfile>('/garments/measurements/' + id, data),
  remove: (id: string) => del<MeasurementProfile>('/garments/measurements/' + id),
};

/* ───────────── collections ───────────── */

export interface GarmentCollection {
  id: string; name: string; code?: string | null; description?: string | null; season: string; year?: number | null; launchDate?: string | null;
  endDate?: string | null; isFeatured: boolean; isActive: boolean; salePercent?: number | null; productCount?: number;
}
export interface CollectionProduct { id: string; name: string; sku?: string | null; price: number; stock: number; isActive: boolean; isOnSale: boolean; regularPrice: number | null }
export interface CollectionInput { name: string; code?: string; description?: string; season?: string; year?: number; launchDate?: string; endDate?: string; isFeatured?: boolean; isActive?: boolean }
export interface CollectionSaleResult { salePercent: number | null; products: number; changed: number; keptByHand: number; branchPriced: number; repeated: boolean }
export interface CollectionStats { days: number; items: Array<{ collectionId: string; products: number; onSale: number; stock: number; stockValue: number; soldQty: number; soldValue: number }> }
export const collectionsApi = {
  create: (data: CollectionInput) => post<GarmentCollection>('/garments/collections', data),
  list: (params?: { season?: string; active?: boolean; search?: string }) => get<GarmentCollection[]>('/garments/collections', params),
  stats: (days = 30) => get<CollectionStats>('/garments/collections/stats', { days }),
  getOne: (id: string) => get<GarmentCollection & { products: CollectionProduct[] }>('/garments/collections/' + id),
  update: (id: string, data: CollectionInput) => patch<GarmentCollection>('/garments/collections/' + id, data),
  setSale: (id: string, percent: number | null) => post<CollectionSaleResult>('/garments/collections/' + id + '/sale', { percent }),
  addProducts: (id: string, productIds: string[]) => post<{ added: number }>('/garments/collections/' + id + '/products', { productIds }),
  removeProducts: (id: string, productIds: string[]) => post<{ removed: number }>('/garments/collections/' + id + '/products/remove', { productIds }),
  remove: (id: string) => del<GarmentCollection>('/garments/collections/' + id),
};

/* ───────────── size charts ───────────── */

export type SizeRow = { size: string } & Record<string, string | number>;
export interface SizeChart {
  id: string; name: string; categoryType?: string | null; gender?: string | null; unit: 'INCH' | 'CM'; description?: string | null;
  rows: SizeRow[]; isDefault: boolean; isActive: boolean; productCount?: number;
}
export interface SizeChartInput { name: string; categoryType?: string; gender?: string; unit: 'INCH' | 'CM'; description?: string; rows: SizeRow[]; isDefault?: boolean; isActive?: boolean }
export const sizeChartsApi = {
  create: (data: SizeChartInput) => post<SizeChart>('/garments/size-charts', data),
  list: (params?: { categoryType?: string; gender?: string; active?: boolean }) => get<SizeChart[]>('/garments/size-charts', params),
  update: (id: string, data: SizeChartInput) => patch<SizeChart>('/garments/size-charts/' + id, data),
  remove: (id: string) => del<SizeChart>('/garments/size-charts/' + id),
};
