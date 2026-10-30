/**
 * Distribution phase 2 API client: vans, market returns, principals and
 * claims, targets, the cheque register, visit analytics, the overbooking
 * check and the sales tax invoice. Shapes follow API.md §14.
 */

import { apiClient } from '@core/api/client';
import type { CustomerCard, ID, OrderDetail, OrderLine, PrintBusiness, PrintInvoice } from './distribution.api';

const unwrap = <T,>(r: any): T => (r?.data?.data !== undefined ? r.data.data : r?.data !== undefined ? r.data : r) as T;

export type FieldMethod = 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'JAZZCASH' | 'EASYPAISA' | 'CHEQUE';

/* ───────────── vans ───────────── */

export interface VanRow {
  id: ID; name: string; vehicleNo: string | null; shopId: ID; homeShopId: ID | null; salesmanId: ID | null; routeId: ID | null; isActive: boolean; note: string | null;
  salesmanName: string | null; homeShopName: string | null; routeName: string | null;
  stock: { lines: number; qty: number; value: number };
  session: { id: ID; dayKey: string; openedAt: string; sales: number; salesValue: number } | null;
}
export interface VanStockLine {
  productId: ID; variantId: ID | null; name: string | null; variantName: string | null; baseUnit: string; qty: number; free: number; text: string;
  price: number; wholesalePrice: number | null; value: number; units: { id: ID; unitName: string; conversionRate: number }[];
}
export interface VanMoney { invoices: number; salesValue: number; creditGiven: number; expectedCash: number; otherMoney: number; recoveries: number; pending: number }
export interface VanSession {
  id: ID; vanId: ID; vanName: string; dayKey: string; status: 'OPEN' | 'CLOSED'; salesmanId: ID | null; salesmanName: string | null;
  openedAt: string; openedByName: string | null; closedAt: string | null; closedByName: string | null;
  loadTransferIds: ID[]; unloadTransferId: ID | null; varianceRef: string | null;
  expectedCash: number; handedIn: number | null; shortAmount: number; note: string | null;
  money: VanMoney;
  invoices: { id: ID; orderNumber: string; saleId: ID | null; saleNumber: string | null; customerId: ID; customerName: string | null; total: number; cashCollected: number; bookedAt: string }[];
  returns: { id: ID; number: string; customerId: ID; customerName: string | null; totalValue: number; status: string }[];
  lines?: VanLine[] | null;
}
export interface VanDetail extends Omit<VanRow, 'stock' | 'session'> {
  shopName: string | null; stock: VanStockLine[]; stockValue: number; session: VanSession | null;
  recent: { id: ID; dayKey: string; closedAt: string | null; expectedCash: number; handedIn: number | null; shortAmount: number }[];
}
export interface VanLine {
  productId: ID; variantId: ID | null; name: string | null; baseUnit: string; opening: number; loaded: number; sold: number; returnsIn: number;
  writtenOff: number; other: number; expected: number; counted?: number; variance?: number; unloaded?: number; text?: string; cost?: number;
}
export interface SaveVan { name: string; vehicleNo?: string; homeShopId?: ID | null; salesmanId?: ID | null; routeId?: ID | null; isActive?: boolean; note?: string }
export interface VanLoadLine { productId: ID; variantId?: ID | null; unitId?: ID | null; qty: number }
export interface VanSell {
  clientRef?: string; customerId: ID; items: OrderLine[]; cashReceived?: number; method?: FieldMethod; bankName?: string; chequeNo?: string; chequeDate?: string;
  managerPin?: string; note?: string;
}
export interface VanClose { counts?: { productId: ID; variantId?: ID | null; counted: number }[]; handedIn?: number; unload?: boolean; verifyCollections?: boolean; note?: string }

/* ───────────── market returns ───────────── */

export type ReturnCondition = 'GOOD' | 'DAMAGED' | 'EXPIRED';
export type MarketReturnStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export interface MarketReturnLine {
  productId: ID; variantId?: ID | null; unitId?: ID | null; qty: number; condition: ReturnCondition; reason?: string; batchNo?: string; expiryDate?: string;
  rate?: number; claimable?: boolean; supplierId?: ID | null;
}
export interface CreateMarketReturn {
  clientRef?: string; customerId: ID; shopId?: ID; vanId?: ID; items: MarketReturnLine[]; note?: string; approve?: boolean; managerPin?: string;
}
export interface MarketReturnRow {
  id: ID; number: string; customerId: ID; routeId: ID | null; shopId: ID | null; vanSessionId: ID | null; collectedById: ID; collectedAt: string;
  status: MarketReturnStatus; totalValue: number; creditedAmount: number; approvedAt: string | null; rejectReason: string | null; note: string | null;
  itemCount: number; customer: CustomerCard | null; collectedByName: string | null; approvedByName: string | null; routeName: string | null; shopName: string | null;
}
export interface MarketReturnDetail extends Omit<MarketReturnRow, 'itemCount' | 'routeName'> {
  saleReturns: { id: ID; returnNumber: string; refundAmount: number; saleNumber: string }[];
  items: {
    id: ID; productId: ID; productName: string | null; sku: string | null; baseUnit: string; variantId: ID | null; unitName: string | null; conversionRate: number;
    qty: number; baseQty: number; rate: number; value: number; costValue: number; condition: ReturnCondition; reason: string | null; batchNo: string | null;
    expiryDate: string | null; claimable: boolean; supplierId: ID | null; supplierName: string | null; matchedQty: number; claimId: ID | null;
  }[];
}
export interface ReturnsList {
  total: number; page: number; limit: number;
  totals: Partial<Record<MarketReturnStatus, { count: number; value: number; credited: number }>>;
  returns: MarketReturnRow[];
}
export interface ApproveResult { results: { id: ID; number: string | null; ok: boolean; status?: string; credited?: number; error?: string; needsPin?: boolean }[]; approved: number; needsPin: boolean }

/* ───────────── principals and claims ───────────── */

export interface Principals {
  suppliers: { id: ID; name: string; phone: string | null; outstandingDue: number; brandIds: ID[]; brandNames: string[]; schemes: number; isPrincipal: boolean }[];
  brands: { id: ID; name: string; supplierId: ID | null }[];
}
export type ClaimStatus = 'DRAFT' | 'SUBMITTED' | 'RECEIVED' | 'CANCELLED';
export interface ClaimLine {
  kind: 'SCHEME' | 'RETURN'; refId: ID; docId: ID; docNumber: string; invoiceNumber: string | null; date: string; customerId: ID; customerName: string | null;
  productId: ID; productName: string | null; schemeId: ID | null; schemeName: string | null; qty: number; discount: number; freeQty: number;
  freeProductName: string | null; freeValue: number; condition: string | null; returnValue: number; total: number;
}
export interface PendingClaims {
  from: string; to: string; total: number;
  principals: { supplierId: ID; supplierName: string | null; schemeDiscount: number; freeGoodsValue: number; returnsValue: number; total: number; lines: number }[];
  openClaims: { count: number; total: number; received: number };
}
export interface ClaimRow {
  id: ID; number: string; supplierId: ID; supplierName: string | null; fromKey: string; toKey: string; status: ClaimStatus; schemeDiscount: number;
  freeGoodsValue: number; returnsValue: number; total: number; reference: string | null; submittedAt: string | null; receivedAmount: number;
  receivedAt: string | null; note: string | null; createdAt: string; balance: number;
}
export interface ClaimStatement {
  kind: 'claim-statement'; business: PrintBusiness;
  claim: ClaimRow & { lines: ClaimLine[]; createdByName: string | null; submittedByName: string | null };
  supplier: { id: ID; name: string; phone: string | null; address: string | null; ntn: string | null; contactPerson: string | null } | null;
  receipts: { id: ID; incomeNumber: string; amount: number; incomeDate: string; receivedVia: string }[];
}
export interface ReceiveClaim { amount: number; receivedVia: 'SUPPLIER_KHATA' | 'CASH_DRAWER' | 'ACCOUNT'; moneyAccountId?: ID; date?: string; note?: string }

/* ───────────── targets ───────────── */

export type TargetMetric = 'VALUE' | 'QTY';
export interface SaveTarget {
  period: string; userId?: ID | null; routeId?: ID | null; brandId?: ID | null; supplierId?: ID | null; metric: TargetMetric; target: number; unitName?: string | null; note?: string;
}
export interface TargetRow extends Required<Omit<SaveTarget, 'note'>> {
  id: ID; note: string | null; label: string; userName: string | null; routeName: string | null; brandName: string | null; supplierName: string | null;
  achieved: number; pct: number; expectedByNow: number; onTrack: boolean; remaining: number; perDayNeeded: number;
}
export interface TargetsList { period: string; today: string; pace: number; daysLeft: number; targets: TargetRow[] }

/* ───────────── cheques ───────────── */

export type ChequeStatus = 'RECEIVED' | 'DEPOSITED' | 'CLEARED' | 'BOUNCED' | 'CANCELLED';
export interface ChequeRow {
  id: ID; customerId: ID; collectionId: ID | null; bankName: string; chequeNo: string; chequeDate: string; amount: number; status: ChequeStatus;
  receivedAt: string; depositedAt: string | null; clearedAt: string | null; bouncedAt: string | null; bounceReason: string | null; note: string | null;
  customer: CustomerCard | null; receivedByName: string | null; collectionStatus: string | null; postDated: boolean; overdue: boolean;
}
export interface ChequeList {
  today: string; total: number; page: number; limit: number;
  totals: Partial<Record<ChequeStatus, { count: number; amount: number }>>;
  due: { today: { count: number; amount: number }; week: { count: number; amount: number } };
  cheques: ChequeRow[];
}

/* ───────────── reports and checks ───────────── */

export interface VisitRow {
  bookerId: ID; bookerName: string | null; date: string; routes: string[]; planned: number; visited: number; productive: number; unproductive: number;
  notVisited: number; strikeRate: number; coverage: number; orders: number; value: number; firstAt: string | null; lastAt: string | null;
  timeInMarketMin: number; avgVisitMin: number | null; longestGapMin: number; travelledKm: number;
  flags: { farFromShop: number; noGps: number; shopWithoutGps: number; poorAccuracy: number };
}
export interface VisitAnalytics {
  from: string; to: string; rows: VisitRow[];
  totals: { planned: number; visited: number; productive: number; unproductive: number; strikeRate: number; orders: number; value: number; farFromShop: number; noGps: number; travelledKm: number };
  flagged?: { id: ID; bookerId: ID; bookerName: string | null; checkInAt: string; outcome: string; customerId: ID; customerName: string | null; distanceM: number | null; accuracyM: number | null; reason: 'NO_GPS' | 'FAR' }[];
}
export interface StockCheck {
  lines: { shopId: ID; productId: ID; variantId: ID | null; name: string | null; baseUnit: string; need: number; stock: number; reservedByOthers: number; free: number; short: number; orderIds: ID[] }[];
  shortLines: number;
  orders: { id: ID; orderNumber: string; short: boolean; holding: boolean }[];
}
export interface TaxInvoice extends PrintInvoice {
  tax: {
    lines: { rate: number; valueExclTax: number; salesTax: number; valueInclTax: number }[];
    valueExclTax: number; salesTax: number; valueInclTax: number; buyerRegistered: boolean;
    fbr: { status: string; invoiceNumber: string | null; qrCode: string | null; verificationUrl: string | null } | null;
  };
}
export interface TaxInvoicePrint { kind: 'tax-invoice-a4'; business: PrintBusiness & { taxLabel: string; taxNumber: string | null }; invoices: TaxInvoice[] }

/* ───────────── calls ───────────── */

export const phase2Api = {
  vans: () => apiClient.get('/distribution/vans').then(unwrap<{ vans: VanRow[] }>),
  myVans: () => apiClient.get('/distribution/vans/mine').then(unwrap<{ vans: VanRow[] }>),
  van: (id: ID) => apiClient.get('/distribution/vans/' + id).then(unwrap<VanDetail>),
  createVan: (body: SaveVan) => apiClient.post('/distribution/vans', body).then(unwrap<VanDetail>),
  updateVan: (id: ID, body: Partial<SaveVan>) => apiClient.patch('/distribution/vans/' + id, body).then(unwrap<VanDetail>),
  openVan: (id: ID, body: { salesmanId?: ID; note?: string } = {}) => apiClient.post(`/distribution/vans/${id}/open`, body).then(unwrap<VanSession>),
  loadVan: (id: ID, items: VanLoadLine[], note?: string) =>
    apiClient.post(`/distribution/vans/${id}/load`, { items, ...(note && { note }) }).then(unwrap<{ transferId: ID; transferNumber: string; van: VanDetail }>),
  sellFromVan: (id: ID, body: VanSell) =>
    apiClient.post(`/distribution/vans/${id}/sell`, body).then(unwrap<{ order: OrderDetail; duplicate: boolean; invoice: { saleId: ID; saleNumber: string } | null; warnings: string[] }>),
  vanClosePreview: (id: ID) => apiClient.get(`/distribution/vans/${id}/close`).then(unwrap<{ session: VanSession; lines: VanLine[] }>),
  closeVan: (id: ID, body: VanClose) => apiClient.post(`/distribution/vans/${id}/close`, body).then(unwrap<VanSession>),
  vanSessions: (id: ID) => apiClient.get(`/distribution/vans/${id}/sessions`).then(unwrap<{ sessions: VanSession[] }>),
  vanSession: (sessionId: ID) => apiClient.get(`/distribution/vans/sessions/${sessionId}`).then(unwrap<VanSession>),

  returns: (params: { status?: string; customerId?: ID; routeId?: ID; from?: string; to?: string; page?: number; limit?: number }) =>
    apiClient.get('/distribution/returns', { params }).then(unwrap<ReturnsList>),
  marketReturn: (id: ID) => apiClient.get('/distribution/returns/' + id).then(unwrap<MarketReturnDetail>),
  createReturn: (body: CreateMarketReturn) => apiClient.post('/distribution/returns', body).then(unwrap<{ marketReturn: MarketReturnDetail; duplicate: boolean }>),
  previewReturn: (body: CreateMarketReturn) =>
    apiClient.post('/distribution/returns/preview', body).then(unwrap<{ lines: (MarketReturnLine & { productName: string | null; baseQty: number; rate: number; value: number; costValue: number })[]; total: number }>),
  approveReturns: (ids: ID[], managerPin?: string) => apiClient.post('/distribution/returns/approve', { ids, ...(managerPin && { managerPin }) }).then(unwrap<ApproveResult>),
  rejectReturns: (ids: ID[], reason?: string) => apiClient.post('/distribution/returns/reject', { ids, ...(reason && { reason }) }).then(unwrap<{ rejected: number }>),

  principals: () => apiClient.get('/distribution/principals').then(unwrap<Principals>),
  setPrincipalBrands: (supplierId: ID, brandIds: ID[]) => apiClient.put(`/distribution/principals/${supplierId}/brands`, { brandIds }).then(unwrap<Principals>),
  pendingClaims: (params: { from?: string; to?: string }) => apiClient.get('/distribution/claims/pending', { params }).then(unwrap<PendingClaims>),
  claimPreview: (params: { supplierId: ID; from?: string; to?: string }) =>
    apiClient.get('/distribution/claims/preview', { params }).then(unwrap<{ from: string; to: string; schemeDiscount: number; freeGoodsValue: number; returnsValue: number; total: number; lines: ClaimLine[] }>),
  claims: (params: { status?: string; supplierId?: ID } = {}) => apiClient.get('/distribution/claims', { params }).then(unwrap<{ claims: ClaimRow[] }>),
  claim: (id: ID) => apiClient.get('/distribution/claims/' + id).then(unwrap<ClaimStatement>),
  createClaim: (body: { supplierId: ID; from?: string; to?: string; note?: string }) => apiClient.post('/distribution/claims', body).then(unwrap<ClaimStatement>),
  submitClaim: (id: ID, body: { reference?: string; note?: string }) => apiClient.post(`/distribution/claims/${id}/submit`, body).then(unwrap<ClaimStatement>),
  receiveClaim: (id: ID, body: ReceiveClaim) => apiClient.post(`/distribution/claims/${id}/receive`, body).then(unwrap<ClaimStatement>),
  cancelClaim: (id: ID) => apiClient.post(`/distribution/claims/${id}/cancel`).then(unwrap<ClaimStatement>),

  targets: (params: { period?: string; userId?: ID } = {}) => apiClient.get('/distribution/targets', { params }).then(unwrap<TargetsList>),
  createTarget: (body: SaveTarget) => apiClient.post('/distribution/targets', body).then(unwrap<TargetRow>),
  updateTarget: (id: ID, body: Partial<SaveTarget>) => apiClient.patch('/distribution/targets/' + id, body).then(unwrap<TargetRow>),
  deleteTarget: (id: ID) => apiClient.delete('/distribution/targets/' + id).then(unwrap<{ deleted: boolean }>),
  copyTargets: (from: string, to: string) => apiClient.post('/distribution/targets/copy', { from, to }).then(unwrap<{ copied: number; skipped: number }>),

  cheques: (params: { status?: string; due?: 'today' | 'week' | 'later'; customerId?: ID; from?: string; to?: string; search?: string; page?: number; limit?: number }) =>
    apiClient.get('/distribution/cheques', { params }).then(unwrap<ChequeList>),
  depositCheque: (id: ID, body: { date?: string; moneyAccountId?: ID; note?: string } = {}) => apiClient.post(`/distribution/cheques/${id}/deposit`, body).then(unwrap<ChequeRow>),
  clearCheque: (id: ID, body: { date?: string; note?: string } = {}) => apiClient.post(`/distribution/cheques/${id}/clear`, body).then(unwrap<ChequeRow>),
  bounceCheque: (id: ID, reason?: string) => apiClient.post(`/distribution/cheques/${id}/bounce`, { ...(reason && { reason }) }).then(unwrap<ChequeRow>),
  cancelCheque: (id: ID, reason?: string) => apiClient.post(`/distribution/cheques/${id}/cancel`, { ...(reason && { reason }) }).then(unwrap<ChequeRow>),

  visits: (params: { from?: string; to?: string; bookerId?: ID; routeId?: ID; flags?: boolean }) =>
    apiClient.get('/distribution/reports/visits', { params }).then(unwrap<VisitAnalytics>),
  stockCheck: (ids: ID[]) => apiClient.get('/distribution/orders/stock-check', { params: { ids: ids.join(',') } }).then(unwrap<StockCheck>),
  printTaxInvoices: (ids: ID[]) => apiClient.get('/distribution/orders/print', { params: { ids: ids.join(','), tax: 1 } }).then(unwrap<TaxInvoicePrint>),
};

export const RETURN_CONDITION_LABEL: Record<ReturnCondition, string> = { GOOD: 'Theek (shelf par)', DAMAGED: 'Kharab', EXPIRED: 'Expiry' };
export const CHEQUE_STATUS_LABEL: Record<ChequeStatus, string> = { RECEIVED: 'Mila', DEPOSITED: 'Bank me jama', CLEARED: 'Clear', BOUNCED: 'Bounce', CANCELLED: 'Cancel' };
export const CLAIM_STATUS_LABEL: Record<ClaimStatus, string> = { DRAFT: 'Draft', SUBMITTED: 'Company ko diya', RECEIVED: 'Paisa mil gaya', CANCELLED: 'Cancel' };
