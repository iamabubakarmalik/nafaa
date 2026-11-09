/**
 * Orders board, dispatch desk and commerce growth API for the app: direct
 * status moves, team tools, full edit, manual orders and message parsing,
 * courier booking with rate compare, labels, dispatch scan, abandoned carts,
 * payment health, the profit statement, the team queue and WhatsApp
 * templates. Same endpoints as the web (integrations/online-orders/api:
 * order-board, dispatch, growth).
 */

import { apiClient } from '@/core/api/client';
import type { AdvanceMethod, OnlineOrder, OnlineOrderDetail, OnlineOrdersList, OrderListQuery, ProfitReport } from '@nafaa/core/online-store';

const unwrap = <T,>(r: { data: unknown }): T => {
  const d = r.data as { data?: unknown } | null;
  return (d && typeof d === 'object' && 'data' in d && d.data !== undefined && !Array.isArray(d) ? d.data : d) as T;
};
const get = <T,>(url: string, params?: object) => apiClient.get(url, { params }).then((r) => unwrap<T>(r));
const post = <T,>(url: string, body?: unknown, timeout?: number) => apiClient.post(url, body ?? {}, timeout ? { timeout } : undefined).then((r) => unwrap<T>(r));
const put = <T,>(url: string, body?: unknown) => apiClient.put(url, body ?? {}).then((r) => unwrap<T>(r));

/* ───────────── board ───────────── */

export type BoardStatus =
  | 'NEW' | 'PAY_PENDING' | 'ON_HOLD' | 'NO_STOCK' | 'CUSTOMER_QUERY' | 'CONFIRMED' | 'PACKED' | 'PACKED_NOT_SENT'
  | 'DISPATCHED' | 'DELIVERED' | 'RETURNED' | 'CANCELLED' | 'CLAIM' | 'ISSUE' | `custom:${string}`;

export interface CourierEvent { at: string | null; status: string; text: string; city?: string; rider?: { name?: string; phone?: string } }

/** Order fields the board adds on top of the shared type. */
export interface BoardFields {
  stage?: string | null;
  assignedToId?: string | null;
  assigneeName?: string | null;
  followUpAt?: string | null;
  followUpNote?: string | null;
  deletedAt?: string | null;
  replacementOfId?: string | null;
  weightKg?: number | null;
  board?: string;
  courierTrail?: (NonNullable<OnlineOrder['courierTrail']> & { events?: CourierEvent[] }) | null;
}
export type BoardOrder = OnlineOrder & BoardFields;
export type BoardOrderDetail = OnlineOrderDetail & BoardFields & { canSyncEdit?: boolean };

export interface CustomStage { key: string; label: string; color: string }
export type BoardList = Omit<OnlineOrdersList, 'items'> & { items: BoardOrder[]; boardCounts?: Record<string, number>; customStages?: CustomStage[] };
export type BoardQuery = OrderListQuery & { board?: string; city?: string; courierCode?: string; assignedTo?: string; stage?: string; tag?: string; payment?: 'COD_DUE' };

export interface MoveBody { to: BoardStatus; reason?: string; trackingNumber?: string; courierCode?: string; force?: boolean }
export interface BulkResult { id: string; ok: boolean; error?: string; code?: string }
export type BulkToolAction = 'assign' | 'follow-up' | 'tag' | 'delete' | 'restore' | 'stage';
export interface BulkToolBody { userId?: string | null; at?: string | null; note?: string; tags?: string[]; stage?: string | null; reason?: string }

export type OrderSource = 'MANUAL' | 'WHATSAPP' | 'INSTAGRAM' | 'FACEBOOK' | 'PHONE' | 'TIKTOK';
export interface EditItem { productId?: string | null; variantId?: string | null; name: string; sku?: string; variant?: string; quantity: number; price: number; image?: string }
export interface EditFullBody {
  items: EditItem[]; discount?: number; deliveryFee?: number; customerName?: string; customerPhone?: string; customerAddress?: string;
  customerCity?: string; notes?: string; weightKg?: number | null; syncToChannel?: boolean;
}
export interface SyncResult { channel: string; ok: boolean; message: string }
export interface ManualOrderBody {
  source: OrderSource; target: string;
  customer: { name: string; phone: string; address?: string; city?: string };
  items: Array<{ productId: string; variantId?: string | null; quantity: number; price: number }>;
  discount?: number; deliveryFee?: number; isCod: boolean; advance?: { amount: number; method: AdvanceMethod };
  weightKg?: number; notes?: string; replacementOf?: string; accept?: boolean;
}
export interface ManualOrderResult {
  order: OnlineOrder; accepted: boolean; acceptError?: string | null; acceptCode?: string | null; advanceError?: string | null; sync?: SyncResult | null;
}
export interface ParsedOrder {
  customerName: string | null; phone: string | null; address: string | null; city: string | null;
  items: Array<{ text: string; quantity: number; price?: number | null; match?: { productId: string; variantId: string | null; name: string; price: number } | null }>;
  codAmount?: number | null;
}

const results = (r: { data: unknown }) => ({ results: unwrap<{ results?: BulkResult[] }>(r)?.results ?? [] });

export const boardApi = {
  list: (q: BoardQuery) => get<BoardList>('/online-orders', q),
  detail: (id: string) => get<BoardOrderDetail>(`/online-orders/${id}`),
  move: (id: string, body: MoveBody) => post<BoardOrder>(`/online-orders/${id}/move`, body, 60_000),
  bulkMove: (ids: string[], to: BoardStatus, reason?: string) => apiClient.post('/online-orders/bulk-move', { ids, to, reason }, { timeout: 120_000 }).then(results),
  bulkTool: (action: BulkToolAction, ids: string[], body: BulkToolBody = {}) => apiClient.post('/online-orders/bulk', { action, ids, ...body }, { timeout: 120_000 }).then(results),
  stages: () => get<CustomStage[]>('/online-orders/stages').then((s) => s ?? []).catch(() => [] as CustomStage[]),
  assign: (id: string, userId: string | null) => post<BoardOrder>(`/online-orders/${id}/assign`, { userId }),
  followUp: (id: string, at: string | null, note?: string) => post<BoardOrder>(`/online-orders/${id}/follow-up`, { at, note }),
  editFull: (id: string, body: EditFullBody) => post<{ order: OnlineOrder; sync: SyncResult | null }>(`/online-orders/${id}/edit-full`, body, 60_000),
  createManual: (body: ManualOrderBody) => post<ManualOrderResult>('/online-orders/manual', body, 60_000),
  parse: (text: string) => post<ParsedOrder>('/online-orders/parse', { text }),
};

/** Error code the API sends with a 4xx (UNMATCHED_ITEMS, NEEDS_FORCE, ...). */
export function errorCode(err: unknown): string | null {
  const d = (err as { response?: { data?: any } })?.response?.data; // eslint-disable-line @typescript-eslint/no-explicit-any
  const code = d?.code ?? d?.error?.code ?? d?.data?.code ?? d?.message?.code;
  return typeof code === 'string' ? code : null;
}

/* ───────────── dispatch ───────────── */

export type AfterBook = 'NONE' | 'PACKED' | 'DISPATCHED';
export interface DispatchSettings { afterBook: AfterBook; labelSize: '4x6' | 'A4' }
export interface RateRow {
  code: string; name: string | null; charge: number | null; codFee: number; expected: number | null; priced: number;
  rtoRate: number | null; basis: 'CITY' | 'ALL' | 'NONE'; bestFor: number;
}
export interface RatesResult {
  orders: number; ready: number; couriers: RateRow[]; pick: string | null;
  auto: { byCourier: Record<string, number>; ask: number } | null; rateCardMissing: string[];
}
export interface BookResultRow { id: string; ok: boolean; courier?: string; trackingNumber?: string; moved?: string | null; moveError?: string; error?: string }
export interface Label {
  id: string; number: string; barcode: string; trackingNumber: string | null; courierCode: string | null; courierName: string | null;
  courierLabelUrl: string | null; customerName: string; customerPhone: string; address: string; city: string; lines: string[]; moreItems: number;
  pieces: number; weightKg: number | null; cod: number; prepaid: boolean; notes: string | null;
}
export interface LabelsResult { size: '4x6' | 'A4'; from: { name: string; phone: string; address: string }; labels: Label[] }
export type ScanCode = 'NOT_ACCEPTED' | 'NOT_PACKED' | 'ALREADY_SENT' | 'DELIVERED' | 'RETURNED' | 'CANCELLED' | 'DELETED';
export interface DispatchScanResult {
  ok: boolean; code: ScanCode | null; message: string | null; noCn?: boolean;
  order: { id: string; number: string; customerName: string; customerCity: string | null; trackingNumber: string | null; courierCode: string | null; courierLabel: string | null; cod: number; orderStatus: string };
}

export const dispatchApi = {
  settings: () => get<DispatchSettings>('/online-orders/dispatch/settings'),
  rates: (orderIds: string[], weightKg?: number) => post<RatesResult>('/online-orders/dispatch/rates', { orderIds, weightKg }, 60_000),
  book: (body: { orderIds: string[]; courier: string; weightKg?: number; pieces?: number; after?: AfterBook }) =>
    post<{ booked: number; failed: number; results: BookResultRow[] }>('/online-orders/dispatch/book', body, 180_000),
  labels: (ids: string[]) => post<LabelsResult>('/online-orders/dispatch/labels', { ids }, 60_000),
  scan: (code: string, force?: boolean) => post<DispatchScanResult>('/online-orders/dispatch/scan', { code, force }),
};

/* ───────────── growth ───────────── */

export type CartStatus = 'ALL' | 'OPEN' | 'CONTACTED' | 'RECOVERED';
export interface AbandonedCart {
  id: string; source: 'SHOPIFY' | 'WEBSITE'; channel: string | null; name: string | null; customerName: string | null; customerPhone: string | null;
  customerCity: string | null; items: Array<{ name: string; quantity: number; price: number; variant: string | null }>; total: number;
  recoveryUrl: string | null; abandonedAt: string; contactedAt: string | null; contactCount: number; recoveredAt: string | null;
  recoveredValue: number | null; recoveredOrderId: string | null; recoveredOrderNo: string | null;
}
export interface AbandonedList {
  days: number;
  stats: { carts: number; value: number; contacted: number; recovered: number; recoveredValue: number; recoveredAfterContact: number; rate: number };
  sources: { shopify: Array<{ id: string; name: string; connected: boolean }>; woocommerce: Array<{ id: string; name: string }>; website: Array<{ id: string; name: string }> };
  items: AbandonedCart[];
}

export type AgeKey = 'd0_7' | 'd8_14' | 'd15_30' | 'd30p';
export type ForecastKey = 'overdue' | 'thisWeek' | 'later';
export interface PaymentHealth {
  range: { from: string; to: string };
  cod: {
    outstanding: number; inTransit: number; withCourier: number; ages: Record<AgeKey, number>;
    byCourier: Array<{ code: string; name: string; inTransit: number; withCourier: number; count: number; ages: Record<AgeKey, number>; settleDays: number; forecast: Record<ForecastKey, number> }>;
  };
  forecast: Record<ForecastKey, number>;
  mix: { cod: { count: number; value: number; share: number }; prepaid: { count: number; value: number; share: number } };
  advance: { value: number; orders: number };
  links: {
    created: number; paid: number; failed: number; expired: number; pending: number; paidValue: number; failedValue: number;
    failures: Array<{ orderId: string; number: string; customerName: string; provider: string; amount: number; status: string; at: string }>;
  };
  losses: { rtoCount: number; rtoGoods: number; rtoCost: number; refunds: number; refundCount: number };
}

export interface Waterfall {
  sales: number; productCost: number; ads: number; courier: number; returns: number; otherExpenses: number; grossProfit: number; net: number; margin: number | null;
}
export interface ProfitOrderRow {
  id: string; number: string; receivedAt: string; channel: string; courier: string | null; city: string | null;
  status: string; sale: number; cost: number; sellingCosts: number; profit: number; margin: number | null; estimated: boolean;
}
export interface ProfitStatement {
  range: { from: string; to: string };
  withExpenses: boolean;
  waterfall: Waterfall;
  cash: { received: number; codOutstanding: number };
  ads: { total: number; byPlatform: Array<{ platform: string; amount: number }> };
  expenses: Array<{ category: string; amount: number }>;
  missingRates: ProfitReport['missingRates'];
  orders: ProfitOrderRow[];
  totals: ProfitReport['totals'];
  byChannel: Array<ProfitReport['byChannel'][number] & { id: string | null; ads: number; afterAds: number }>;
  byCourier: ProfitReport['byCourier'];
  byCity: ProfitReport['byCity'];
  byProduct: ProfitReport['byProduct'];
}

export interface TeamQueue {
  staff: Array<{ userId: string; name: string; active: boolean; open: number; followUpsDue: number; doneToday: number }>;
  unassigned: number;
  me: string;
}

export type WaTemplateKey = 'confirm' | 'address' | 'advance' | 'dispatched' | 'delivered' | 'cart';
export interface WaTemplates { keys: WaTemplateKey[]; templates: Partial<Record<WaTemplateKey, string>> }

export const commerceApi = {
  abandoned: (q: { status?: CartStatus; search?: string; days?: number }) =>
    get<AbandonedList>('/online-orders/abandoned', { ...q, status: q.status === 'ALL' ? undefined : q.status }),
  syncAbandoned: () => post<Array<{ channel: string; ok: boolean; count: number; error?: string }>>('/online-orders/abandoned/sync', undefined, 120_000),
  contacted: (id: string, undo = false) => post<{ id: string; contactedAt: string | null; contactCount: number }>(`/online-orders/abandoned/${id}/contacted`, { undo }),
  paymentHealth: (q: { from?: string; to?: string }) => get<PaymentHealth>('/online-orders/payment-health', q),
  profit: (q: { from?: string; to?: string; integrationId?: string; expenses?: '0' | '1' }) => get<ProfitStatement>('/online-orders/profit', q),
  team: () => get<TeamQueue>('/online-orders/team'),
  waTemplates: () => get<WaTemplates>('/online-orders/wa-templates'),
  saveWaTemplates: (templates: Partial<Record<WaTemplateKey, string>>) => put<WaTemplates>('/online-orders/wa-templates', { templates }),
};
