/**
 * Stock operations API, same endpoints and shapes as the web: adjustments
 * (record, analytics, options, one line, many lines, physical count),
 * damage reports with approval, branch transfers, low stock and reorder,
 * stock movements, the stock report and batches by expiry.
 */

import type { AdjustmentType, ProfitEffect, ReasonCode } from '@nafaa/core/inventory';
import { apiClient } from '@/core/api/client';

const get = <T,>(url: string, params?: object) => apiClient.get<T>(url, { params }).then((r) => r.data);
const clean = (q: object) => Object.fromEntries(Object.entries(q).filter(([, v]) => v !== undefined && v !== '' && v !== 'all'));

interface ShopStamp { id: string; name: string }
interface Person { id: string; fullName: string }

/* ───────────── adjustments ───────────── */

export interface StockAdjustment {
  id: string; type: AdjustmentType; quantity: number; reason: string; reasonCode?: ReasonCode | null; profitEffect?: ProfitEffect | null;
  note?: string | null; createdAt: string; unitCost: number; value: number; groupRef?: string | null; systemQty?: number | null; countedQty?: number | null;
  product: { id: string; name: string; sku?: string | null; unit: string };
  variant?: { id: string; name: string; colorHex?: string | null } | null;
  carpetRoll?: { id: string; rollNumber: string } | null;
  imei?: { id: string; imei1: string } | null;
  createdBy?: Person | null;
  shop?: ShopStamp | null;
}

export interface AdjustmentQuery { from?: string; to?: string; type?: 'all' | AdjustmentType; reason?: string; search?: string; productId?: string; page?: number; limit?: number }

export interface AdjustmentList {
  items: StockAdjustment[]; total: number; page: number; pages: number;
  totals: {
    count: number; inValue: number; outValue: number; damageValue: number; lossValue: number; openingValue?: number; net: number;
    stockLoss?: number; stockGain?: number; correctionValue?: number; profitNet?: number;
  };
}

interface Bucket { key: string; count: number; value: number; qty: number }
export interface AdjustmentAnalytics {
  totals: { count: number; gained: number; lost: number; opening?: number; corrected?: number };
  byType: Bucket[]; byReason: Bucket[]; byPerson: Bucket[];
  trend: Array<{ key: string; in: number; out: number }>;
  topLosses: Array<{ name: string; unit: string; qty: number; value: number; count: number }>;
  days: number;
}

export interface AdjustmentBatchFields { batchId?: string; batchNumber?: string; expiryDate?: string; manufactureDate?: string }

export interface BatchAdjustmentPayload {
  shopId?: string; reason: string; reasonCode?: ReasonCode; note?: string;
  items: Array<AdjustmentBatchFields & {
    productId: string; variantId?: string; type: AdjustmentType; quantity: number; unitName?: string; conversionRate?: number; reason?: string; reasonCode?: ReasonCode;
  }>;
}

export interface StockCountResult { groupRef: string; checked: number; changed: number; gained: number; lost: number; net: number; correction?: boolean }

export const adjustmentsApi = {
  list: (q: AdjustmentQuery) => get<AdjustmentList>('/stock-adjustments', clean(q)),
  analytics: (q: Omit<AdjustmentQuery, 'page' | 'limit'>) => get<AdjustmentAnalytics>('/stock-adjustments/analytics', clean(q)),
  reasons: () => get<string[]>('/stock-adjustments/reasons'),
  batch: (payload: BatchAdjustmentPayload) => apiClient.post<{ groupRef: string; count: number; value: number }>('/stock-adjustments/batch', payload).then((r) => r.data),
  count: (payload: { shopId?: string; note?: string; correction?: boolean; items: Array<{ productId: string; variantId?: string; counted: number }> }) =>
    apiClient.post<StockCountResult>('/stock-adjustments/count', payload).then((r) => r.data),
};

/* ───────────── damage ───────────── */

export type DamageStatus = 'REPORTED' | 'APPROVED' | 'REJECTED' | 'WRITTEN_OFF';
export type DamageReasonCode = 'EXPIRY' | 'BREAKAGE' | 'SPOILAGE' | 'PEST_DAMAGE' | 'WATER_DAMAGE' | 'THEFT' | 'MISHANDLING' | 'MANUFACTURING_DEFECT' | 'OTHER';

export interface DamageLog {
  id: string; damageNumber: string; status: DamageStatus; quantity: number; unitCost: number; costImpact: number; salvageValue: number; netLoss: number;
  reason: string; reasonCode: DamageReasonCode; photos: string[]; notes?: string | null; rejectionReason?: string | null;
  createdAt: string; approvedAt?: string | null; rejectedAt?: string | null;
  product: { id: string; name: string; sku?: string | null; unit: string; category?: { id: string; name: string } | null; images?: Array<{ url: string }> };
  variant?: { id: string; name: string; colorHex?: string | null } | null;
  batch?: { id: string; batchNumber: string; expiryDate?: string | null } | null;
  unit?: { id: string; unitName: string; conversionRate: number } | null;
  reportedBy?: Person | null; decidedBy?: Person | null; shop?: ShopStamp | null;
}

export interface DamageQuery { from?: string; to?: string; status?: DamageStatus | 'all'; reasonCode?: DamageReasonCode | ''; search?: string; page?: number; limit?: number }
export interface DamageList { items: DamageLog[]; total: number; page: number; pages: number; totals: { reported: number; approved: number; rejected: number; pendingValue: number; lost: number } }
export interface DamageQueue { pending: number; pendingValue: number; aging: number; agingHours: number; oldestAt: string | null }
export interface DamageBucket { key: string; label: string; count: number; qty: number; value: number; pending: number }
export interface DamageAnalytics {
  totals: { count: number; approved: number; pending: number; rejected: number; lost: number; costImpact: number; salvage: number; pendingValue: number };
  byReason: DamageBucket[]; byProduct: Array<DamageBucket & { unit: string }>; byCategory: DamageBucket[]; byPerson: DamageBucket[];
  trend: Array<{ key: string; approved: number; pending: number; count: number }>;
}
export interface DamageOptions {
  product: { id: string; name: string; unit: string; stock: number; costPrice: number; hasVariants: boolean; expiryTracked: boolean; branchStock: number | null };
  variants: Array<{ id: string; name: string; stock: number; costPrice?: number | null; branchStock: number | null }>;
  units: Array<{ id: string; unitName: string; conversionRate: number; variantId?: string | null }>;
  batches: Array<{ id: string; batchNumber: string; expiryDate?: string | null; quantity: number; costPrice: number; variantId?: string | null }>;
  tracked: 'roll' | 'imei' | 'serial' | null;
}

export const damageApi = {
  list: (q: DamageQuery) => get<DamageList>('/retail/damage', clean(q)),
  queue: () => get<DamageQueue>('/retail/damage/queue'),
  analytics: (q: Omit<DamageQuery, 'page' | 'limit' | 'status'>) => get<DamageAnalytics>('/retail/damage/analytics', clean(q)),
  options: (productId: string) => get<DamageOptions>(`/retail/damage/options/${productId}`),
  approve: (id: string, notes?: string) => apiClient.post<DamageLog>(`/retail/damage/${id}/approve`, { notes }).then((r) => r.data),
  approveMany: (ids: string[], notes?: string) =>
    apiClient.post<{ approved: number; failed: Array<{ id: string; message: string }> }>('/retail/damage/approve-many', { ids, notes }).then((r) => r.data),
  reject: (id: string, reason?: string) => apiClient.post<DamageLog>(`/retail/damage/${id}/reject`, { reason }).then((r) => r.data),
};

/* ───────────── transfers ───────────── */

export type TransferStatus = 'PENDING' | 'IN_TRANSIT' | 'RECEIVED' | 'CANCELLED';
export interface StockTransferItem {
  id: string; quantity: number; receivedQty: number; unitCost: number; notes?: string | null;
  productId?: string | null; variantId?: string | null; carpetRollId?: string | null; imeiId?: string | null; usedPhoneId?: string | null; serialId?: string | null;
  product?: { id: string; name: string; unit: string; sku?: string | null; barcode?: string | null } | null;
  carpetRoll?: { id: string; rollNumber: string; widthFt: number; remainingLengthFt: number } | null;
  imei?: { id: string; imei1: string; color?: string | null } | null;
  usedPhone?: { id: string; usedPhoneCode: string; brand: string; model: string; storage?: string | null; color?: string | null } | null;
  serial?: { id: string; serialNumber: string; imei?: string | null } | null;
}
export interface StockTransfer {
  id: string; transferNumber: string; status: TransferStatus; notes?: string | null; value: number; fromShopId: string; toShopId: string;
  transferredAt?: string | null; receivedAt?: string | null; cancelledAt?: string | null; cancelReason?: string | null; createdAt: string;
  fromShop: { id: string; name: string; isMain?: boolean; address?: string | null; phone?: string | null };
  toShop: { id: string; name: string; isMain?: boolean; address?: string | null; phone?: string | null };
  createdBy?: Person | null; receivedBy?: Person | null; cancelledBy?: Person | null;
  items: StockTransferItem[];
}
export type TransferStatusFilter = 'all' | 'IN_TRANSIT' | 'RECEIVED' | 'CANCELLED';
export interface TransferQuery { from?: string; to?: string; status?: TransferStatusFilter; direction?: 'all' | 'in' | 'out'; shopId?: string; search?: string; page?: number; limit?: number }
export interface TransferList { items: StockTransfer[]; total: number; page: number; pages: number; totals: { count: number; inTransit: number; inTransitValue: number; received: number; cancelled: number; value: number } }
export interface TransferAnalytics {
  totals: { count: number; value: number; inTransit: number; received: number; cancelled: number; shortValue: number; avgHours: number | null };
  byStatus: Array<{ key: TransferStatus; count: number }>;
  routes: Array<{ from: string; to: string; count: number; value: number }>;
  trend: Array<{ key: string; value: number; count: number }>;
  topProducts: Array<{ name: string; unit: string; qty: number; value: number }>;
}

export const transfersApi = {
  list: (q: TransferQuery) => get<TransferList>('/transfers', clean(q)),
  analytics: (q: TransferQuery) => get<TransferAnalytics>('/transfers/analytics', clean(q)),
  getOne: (id: string) => get<StockTransfer>(`/transfers/${id}`),
  create: (payload: { fromShopId: string; toShopId: string; notes?: string; items: Array<{ productId?: string; variantId?: string; quantity: number; notes?: string; imeiId?: string; serialId?: string; usedPhoneId?: string; carpetRollId?: string }> }) =>
    apiClient.post<StockTransfer>('/transfers', payload).then((r) => r.data),
  receive: (id: string, payload: { notes?: string; items?: Array<{ itemId: string; receivedQty: number }> } = {}) =>
    apiClient.patch<StockTransfer>(`/transfers/${id}/receive`, payload).then((r) => r.data),
  cancel: (id: string, reason?: string) => apiClient.patch<StockTransfer>(`/transfers/${id}/cancel`, { reason: reason?.trim() || undefined }).then((r) => r.data),
};

/* ───────────── low stock ───────────── */

export type LowStatus = 'out' | 'low' | 'soon' | 'expiry' | 'registration' | 'season';
export type LowStatusFilter = 'all' | LowStatus | 'ordered' | 'ignored';
export type LowSort = 'urgency' | 'daysLeft' | 'value' | 'lost' | 'name' | 'stock';
export interface LowSettings { days: number; targetDays: number; soonDays: number; expiryDays: number }
export interface LowRow {
  key: string; productId: string; shopId: string; shopName: string; name: string; sku: string | null; barcode: string | null; unit: string; image: string | null;
  category: { id: string; name: string; color: string | null } | null;
  price: number; cost: number; stock: number; alert: number; alertFrom: 'branch' | 'product' | 'agri'; status: LowStatus; flags: LowStatus[];
  perDay: number; sold: number; daysLeft: number | null; target: number; suggestQty: number; onOrder: number;
  supplier: { id: string; name: string; phone: string | null } | null; lastCost: number; lastPurchasedAt: string | null; orderValue: number;
  outDays: number | null; lostPerDay: number; lostSales: number;
  expiry: { date: string; qty: number; expiredQty: number; batches: number } | null;
  made: boolean; group: string | null; detail: string | null; ignored: boolean;
  agri: { season: string | null; seasonNow: boolean; reg: { state: 'expired' | 'soon' | 'none'; days: number | null } | null } | null;
}
interface Facet { id: string; name?: string; color?: string | null; phone?: string | null; count: number; value: number }
export interface LowList {
  items: LowRow[]; total: number; page: number; pages: number; settings: LowSettings; counts: Record<LowStatusFilter, number>;
  totals: { orderValue: number; orderLines: number; madeLines: number; lostPerDay: number; lostSales: number; expiryValue: number; noSupplier: number };
  facets: { categories: Facet[]; suppliers: Facet[]; groups: Facet[]; shops: Facet[] };
}
export interface LowQuery extends Partial<LowSettings> {
  status?: LowStatusFilter; categoryId?: string; supplierId?: string; search?: string; sort?: LowSort; view?: 'alerts' | 'reorder'; page?: number; limit?: number;
}

export const lowStockApi = {
  list: (q: LowQuery) => get<LowList>('/inventory/low-stock', clean(q)),
  setAlert: (productId: string, alert: number, shopId: string) => apiClient.patch<{ alert: number }>(`/inventory/low-stock/${productId}/alert`, { alert, shopId }).then((r) => r.data),
  ignore: (productId: string, ignore: boolean, shopId: string) => apiClient.post<{ ignored: boolean }>(`/inventory/low-stock/${productId}/ignore`, { ignore, shopId }).then((r) => r.data),
};

/* ───────────── stock movements ───────────── */

export const MOVEMENT_TYPES = [
  'SALE_OUT', 'RETURN_IN', 'PURCHASE_IN', 'PURCHASE_RETURN', 'PRODUCTION_IN', 'PRODUCTION_OUT', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT',
  'DAMAGE', 'LOSS', 'TRANSFER_IN', 'TRANSFER_OUT', 'OPENING_BALANCE',
] as const;
export type StockMovementType = typeof MOVEMENT_TYPES[number];
export interface StockMovement {
  id: string; type: StockMovementType; quantity: number; balanceAfter: number; reference: string | null; note: string | null; createdAt: string;
  unitCost: number | null; value: number;
  product: { id: string; name: string; sku: string | null; unit: string; costPrice: number };
  shop: { id: string; name: string; isMain: boolean } | null; variant: { id: string; name: string } | null; createdBy: Person | null;
}
export interface MovementQuery { from?: string; to?: string; type?: string; direction?: 'all' | 'in' | 'out'; productId?: string; userId?: string; search?: string; page?: number; limit?: number }
export interface MovementList {
  items: StockMovement[]; total: number; page: number; pages: number;
  totals: { count: number; qtyIn: number; qtyOut: number; byType: Array<{ type: StockMovementType; count: number; qty: number }> };
}
export interface MovementAnalytics {
  totals: { count: number; valueIn: number; valueOut: number; net: number };
  byType: Array<{ type: StockMovementType; count: number; qty: number; value: number }>;
  trend: Array<{ key: string; in: number; out: number }>;
  topMovers: Array<{ name: string; unit: string; in: number; out: number; value: number }>;
  byPerson: Array<{ name: string; count: number; value: number }>;
}

export const movementsApi = {
  list: (q: MovementQuery) => get<MovementList>('/stock-movements', clean(q)),
  analytics: (q: MovementQuery) => get<MovementAnalytics>('/stock-movements/analytics', clean({ ...q, page: undefined, limit: undefined })),
  people: () => get<Array<{ id: string; fullName: string }>>('/stock-movements/people'),
};

/* ───────────── stock report ───────────── */

export type StockFlag = 'dead' | 'slow' | 'fast' | 'expiry' | 'expired' | 'blocked' | 'regSoon' | 'raw' | 'made' | 'fridge' | 'noCost' | 'negative' | 'inactive';
export type StockStatusFilter = 'all' | 'in' | 'low' | 'out' | 'dead' | 'slow' | 'fast' | 'expiry' | 'blocked' | 'raw' | 'made' | 'noCost' | 'negative' | 'inactive';
export type StockSort = 'value' | 'retail' | 'profit' | 'margin' | 'stock' | 'age' | 'sold' | 'revenue' | 'cover' | 'name';
export interface SoldFigures { qty: number; revenue: number; cost: number; profit: number }
export interface ShopStockPart { shopId: string; stock: number; cost: number; retail: number; alert: number; sold: number; revenue: number; name?: string }
export interface StockLine {
  productId: string; name: string; sku: string | null; barcode: string | null; unit: string; image: string | null;
  category: { id: string; name: string; color: string | null } | null; brand: { id: string; name: string } | null; supplier: { id: string; name: string } | null;
  price: number; cost?: number; stock: number; alert: number; valueAtCost?: number; retail: number; profit?: number; margin?: number;
  status: 'out' | 'low' | 'ok'; flags: StockFlag[]; sold: SoldFigures; prevSold: SoldFigures; perDay: number; cover: number | null;
  lastSoldAt: string | null; lastInAt: string | null; saleAge: number | null; stockAge: number | null;
  expiry: { date: string; qty: number; expiredQty: number; batches: number; cost: number } | null; active: boolean; shops?: ShopStockPart[];
}
export interface StockPeriod { from: string; to: string; days: number; deadDays: number; expiryDays: number; fastCover: number; slowCover: number }
interface ValueSlice { count: number; cost: number; retail: number }
export interface StockTotals {
  lines: number; stocked: number; units: number; cost: number; retail: number; profit: number; margin: number; sold: SoldFigures; prevSold: SoldFigures;
  coverDays: number | null; dead: ValueSlice; slow: ValueSlice; expiry: ValueSlice & { qty: number }; blocked: ValueSlice; noCost: number;
}
export interface StockFacet { id: string; name?: string; color?: string | null; count: number; retail: number; cost: number }
export interface StockList {
  items: StockLine[]; total: number; page: number; pages: number; counts: Record<StockStatusFilter, number>; totals: StockTotals;
  facets: { categories: StockFacet[]; brands: StockFacet[]; suppliers: StockFacet[]; groups: StockFacet[] }; period: StockPeriod;
  shops: Array<{ id: string; name: string; isMain: boolean }>;
}
export interface StockQuery { from?: string; to?: string; categoryId?: string; brandId?: string; supplierId?: string; group?: string; search?: string; deadDays?: number }
export interface StockBrief { productId: string; name: string; unit: string; stock: number; valueAtCost: number; retail: number; sold: number; revenue: number; cover: number | null }
export interface StockBreakdown { id: string; name: string; color: string | null; lines: number; units: number; cost: number; retail: number; revenue: number }
export interface StockAnalytics {
  period: StockPeriod; totals: StockTotals;
  status: Array<{ key: 'ok' | 'low' | 'out'; lines: number; cost: number; retail: number }>;
  byCategory: StockBreakdown[]; byBrand: StockBreakdown[]; bySupplier: StockBreakdown[];
  saleAge: Array<{ key: string; label: string; lines: number; cost: number; retail: number }>;
  topValue: StockBrief[]; fast: StockBrief[]; slow: StockBrief[]; dead: StockBrief[];
  expiry: { buckets: Array<{ key: string; label: string; batches: number; qty: number; cost: number }>; soonest: Array<{ productId: string; name: string; batchNumber: string; expiryDate: string; days: number; qty: number; cost: number }> };
  quality: { noCost: number; negative: number; inactive: number; devices: number; carpet: number };
}
export interface StockBranches {
  period: StockPeriod;
  shops: Array<{ shopId: string; name: string; isMain: boolean; lines: number; units: number; cost: number; retail: number; out: number; low: number; dead: { count: number; cost: number }; sold: { qty: number; revenue: number } }>;
  matrix: Array<{ productId: string; name: string; unit: string; stock: number; retail: number; shops: Array<{ shopId: string; stock: number; sold: number }> }>;
  moves: Array<{ productId: string; name: string; unit: string; from: string; to: string; qty: number; revenue: number }>;
}
export interface LedgerLine {
  productId: string; name: string; sku: string | null; unit: string; opening: number; closing: number; change: number; inQty: number; outQty: number;
  kinds: Record<string, number>; openingValue: { cost: number; retail: number }; closingValue: { cost: number; retail: number }; moved: boolean;
}
export interface StockLedger {
  period: StockPeriod; items: LedgerLine[]; total: number; page: number; pages: number;
  totals: { lines: number; moved: number; opening: { units: number; cost: number; retail: number }; closing: { units: number; cost: number; retail: number }; kinds: Array<{ key: string; qty: number; cost: number; retail: number }> };
}
export interface StockItem {
  period: StockPeriod;
  line: (StockLine & { shops: ShopStockPart[] }) | null;
  product: { id: string; name: string; unit: string } | null;
  variants: Array<{ id: string; name: string; stock: number; cost: number; retail: number }>;
  batches: Array<{ id: string; batchNumber: string; expiryDate: string | null; qty: number; cost: number; days: number | null; shop: string }>;
  moves: Array<{ id: string; type: string; quantity: number; balanceAfter: number; reference: string | null; note: string | null; createdAt: string; shop: string }>;
  monthly: Array<{ key: string; qty: number; revenue: number }>;
}

export const stockReportApi = {
  list: (q: StockQuery & { status?: StockStatusFilter; sort?: StockSort; page?: number; limit?: number }) => get<StockList>('/reports/stock/list', clean(q)),
  analytics: (q: StockQuery) => get<StockAnalytics>('/reports/stock/analytics', clean(q)),
  branches: (q: StockQuery) => get<StockBranches>('/reports/stock/branches', clean(q)),
  ledger: (q: StockQuery & { show?: 'all' | 'moved'; sort?: 'closing' | 'change' | 'in' | 'out' | 'name'; page?: number; limit?: number }) => get<StockLedger>('/reports/stock/ledger', clean(q)),
  item: (productId: string, q: Pick<StockQuery, 'from' | 'to' | 'deadDays'>) => get<StockItem>(`/reports/stock/item/${productId}`, clean(q)),
};
