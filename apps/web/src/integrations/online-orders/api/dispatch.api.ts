/**
 * Dispatch desk API: bulk booking with rate compare, labels, loadsheets,
 * cancel booking, dispatch scan, re-dispatch, claims, the dispatch report,
 * the COD (CPR) audit and Pakistan Post.
 */

import { apiClient } from '@core/api/client';
import { unwrap, type OnlineOrder } from './online-orders.api';

export type AfterBook = 'NONE' | 'PACKED' | 'DISPATCHED';

export interface DispatchSettings {
  afterBook: AfterBook;
  labelSize: '4x6' | 'A4';
  returnName: string;
  returnPhone: string;
  returnAddress: string;
  shop: { name: string; phone: string; address: string };
}

export interface RateRow {
  code: string;
  name: string | null;
  /** Rate card price for all picked orders; null = no rate card. */
  charge: number | null;
  codFee: number;
  expected: number | null;
  priced: number;
  rtoRate: number | null;
  basis: 'CITY' | 'ALL' | 'NONE';
  bestFor: number;
}

export interface RatesResult {
  orders: number;
  ready: number;
  couriers: RateRow[];
  pick: string | null;
  auto: { byCourier: Record<string, number>; ask: number } | null;
  rateCardMissing: string[];
}

export interface BookResultRow { id: string; ok: boolean; courier?: string; trackingNumber?: string; moved?: string | null; moveError?: string; error?: string }

export interface Label {
  id: string;
  number: string;
  barcode: string;
  trackingNumber: string | null;
  courierCode: string | null;
  courierName: string | null;
  courierLabelUrl: string | null;
  customerName: string;
  customerPhone: string;
  address: string;
  city: string;
  lines: string[];
  moreItems: number;
  pieces: number;
  weightKg: number | null;
  cod: number;
  prepaid: boolean;
  notes: string | null;
}

export interface LabelsResult { size: '4x6' | 'A4'; from: { name: string; phone: string; address: string }; labels: Label[] }

export interface LoadsheetRow {
  orderId: string; number: string; trackingNumber: string; courierCode: string; customerName: string; city: string | null; cod: number; pieces: number; weightKg: number | null;
}
export interface LoadsheetGroup {
  courierCode: string;
  courierName: string | null;
  rows: LoadsheetRow[];
  totals: { parcels: number; pieces: number; weightKg: number; cod: number };
  canSubmit: boolean;
  submitted: Array<{ id: string; at: string; parcels: number; source: string; externalRef: string | null; apiError: string | null }>;
}

export type ScanCode = 'NOT_ACCEPTED' | 'NOT_PACKED' | 'ALREADY_SENT' | 'DELIVERED' | 'RETURNED' | 'CANCELLED' | 'DELETED';
export interface ScanResult {
  ok: boolean;
  code: ScanCode | null;
  message: string | null;
  noCn?: boolean;
  order: { id: string; number: string; customerName: string; customerCity: string | null; trackingNumber: string | null; courierCode: string | null; courierLabel: string | null; cod: number; orderStatus: string };
}

export type ReportTab = 'all' | 'open' | 'delivered' | 'returns' | 'rto_wh' | 'pending_rto' | 'ofd' | 'issue' | 'stuck' | 'claims' | 'redispatched' | 'replacement' | 'cancelled';
export interface DispatchReportRow {
  id: string; number: string; customerName: string; customerPhone: string | null; city: string | null; courierCode: string | null; courierName: string | null;
  trackingNumber: string | null; orderStatus: string; courierStatus: string | null; lastEvent: string | null; dispatchedAt: string; deliveredAt: string | null;
  returnedAt: string | null; settled: boolean; total: number; cod: number; day: string; tabs: ReportTab[];
}
export interface DispatchReport {
  from: string; to: string;
  totals: {
    dispatched: number; delivered: number; returned: number; inProcess: number; rtoInWarehouse: number; cancelled: number;
    claims: number; deliveredCod: number; redispatched: number; replacement: number; successRate: number | null;
  };
  tabCounts: Record<ReportTab, number>;
  daily: Array<{ day: string; dispatched: number; delivered: number; returned: number }>;
  couriers: Array<{ code: string; name: string | null; dispatched: number; delivered: number; returned: number; inProcess: number; cancelled: number; deliveredCod: number; successRate: number | null }>;
  rows: DispatchReportRow[];
  capped: boolean;
}

export interface CodAuditRow {
  id: string; number: string; customerName: string; city: string | null; courierCode: string | null; courierName: string | null; trackingNumber: string | null;
  deliveredAt: string | null; paid: boolean; settlementRef: string | null; cod: number; received: number | null; deducted: number | null;
  expectedNet: number; short: number; overCharge: number; waitingDays: number | null; inStatement: boolean;
}
export interface CodAudit {
  from: string; to: string;
  totals: {
    parcels: number; cod: number; expectedNet: number; received: number; short: number; shortCount: number; overCharge: number; overChargeCount: number;
    unpaid: number; unpaidValue: number; notInStatement: number; late: number; rateCardMissing: string[];
  };
  couriers: Array<{ code: string; name: string | null; parcels: number; cod: number; expectedNet: number; received: number; short: number; overCharge: number; unpaid: number; unpaidValue: number }>;
  rows: CodAuditRow[];
}

export interface PostOrder {
  id: string; number: string; customerName: string; customerPhone: string | null; address: string | null; city: string | null;
  cod: number; total: number; orderStatus: string; article: string | null; weightKg: number | null; items: string; trackUrl: string | null; dispatchedAt: string | null;
}

type Bulk<T = { id: string; ok: boolean; error?: string }> = { done: number; failed: number; results: T[] };

export const dispatchApi = {
  settings: () => apiClient.get('/online-orders/dispatch/settings').then((r) => unwrap<DispatchSettings>(r)),
  saveSettings: (body: Partial<DispatchSettings>) => apiClient.put('/online-orders/dispatch/settings', body).then((r) => unwrap<DispatchSettings>(r)),
  rates: (orderIds: string[], weightKg?: number) => apiClient.post('/online-orders/dispatch/rates', { orderIds, weightKg }).then((r) => unwrap<RatesResult>(r)),
  book: (body: { orderIds: string[]; courier: string; weightKg?: number; pieces?: number; after?: AfterBook }) =>
    apiClient.post('/online-orders/dispatch/book', body).then((r) => unwrap<{ booked: number; failed: number; results: BookResultRow[] }>(r)),
  cancel: (ids: string[], local?: boolean, note?: string) =>
    apiClient.post('/online-orders/dispatch/cancel', { ids, local, note }).then((r) => unwrap<Bulk<{ id: string; ok: boolean; via?: 'API' | 'LOCAL'; error?: string }>>(r)),
  labels: (ids: string[]) => apiClient.post('/online-orders/dispatch/labels', { ids }).then((r) => unwrap<LabelsResult>(r)),
  loadsheet: (day?: string) => apiClient.get('/online-orders/dispatch/loadsheet', { params: { day } }).then((r) => unwrap<{ day: string; sheets: LoadsheetGroup[] }>(r)),
  submitLoadsheet: (body: { day: string; courier: string }) =>
    apiClient.post('/online-orders/dispatch/loadsheet', body)
      .then((r) => unwrap<{ id: string; parcels: number; externalRef: string | null; apiError: string | null; url: string | null; pdfBase64: string | null }>(r)),
  scan: (code: string, force?: boolean) => apiClient.post('/online-orders/dispatch/scan', { code, force }).then((r) => unwrap<ScanResult>(r)),
  report: (q: { from: string; to: string; courier?: string; integrationId?: string }) =>
    apiClient.get('/online-orders/dispatch/report', { params: q }).then((r) => unwrap<DispatchReport>(r)),
  codAudit: (q: { from: string; to: string; courier?: string }) => apiClient.get('/online-orders/dispatch/cod-audit', { params: q }).then((r) => unwrap<CodAudit>(r)),
  postOffice: () => apiClient.get('/online-orders/dispatch/post-office').then((r) => unwrap<{ toBook: PostOrder[]; sent: PostOrder[]; candidates: PostOrder[] }>(r)),
  markPost: (ids: string[], on = true) => apiClient.post('/online-orders/dispatch/post-office/mark', { ids, on }).then((r) => unwrap<{ updated: number; skipped: number }>(r)),
  articles: (items: Array<{ id: string; article: string }>, dispatch: boolean) =>
    apiClient.post('/online-orders/dispatch/post-office/articles', { items, dispatch }).then((r) => unwrap<Bulk>(r)),
  redispatch: (id: string, body: { courier: string; trackingNumber?: string; book?: boolean; note?: string }) =>
    apiClient.post(`/online-orders/dispatch/${id}/redispatch`, body).then((r) => unwrap<OnlineOrder>(r)),
  claim: (id: string, body: { status: 'OPEN' | 'WON' | 'LOST' | 'NONE'; amount?: number; note?: string }) =>
    apiClient.post(`/online-orders/dispatch/${id}/claim`, body).then((r) => unwrap<OnlineOrder>(r)),
};

/** Opens a base64 PDF from the API in a new tab. */
export function openPdfBase64(b64: string) {
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export const pakPostTrackUrl = (article: string) => `https://ep.gov.pk/emtts/EPTrack_Live.aspx?ArticleIDz=${encodeURIComponent(article)}`;
