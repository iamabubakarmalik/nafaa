/**
 * Clients for the orders board: direct status moves, custom stages, team
 * assignment, follow-ups, soft delete, combine/split, full edit with channel
 * sync, manual orders, WhatsApp text parsing and Excel import.
 * The list itself stays in online-orders.api.ts (`onlineOrdersApi.list`).
 */

import { apiClient } from '@core/api/client';
import { unwrap, type AdvanceMethod, type OnlineOrder } from './online-orders.api';

/** Stored stage flags (null = none). Custom stages are `custom:<key>`. */
export type OrderStage = 'PAY_PENDING' | 'ON_HOLD' | 'NO_STOCK' | 'CUSTOMER_QUERY' | 'PACKED_NOT_SENT' | 'CLAIM' | 'ISSUE' | `custom:${string}`;

/** Statuses the merchant can move an order to. */
export type BoardStatus =
  | 'NEW' | 'PAY_PENDING' | 'ON_HOLD' | 'NO_STOCK' | 'CUSTOMER_QUERY' | 'CONFIRMED' | 'PACKED' | 'PACKED_NOT_SENT'
  | 'DISPATCHED' | 'DELIVERED' | 'RETURNED' | 'CANCELLED' | 'CLAIM' | 'ISSUE' | `custom:${string}`;

export interface MoveBody {
  to: BoardStatus;
  reason?: string;
  trackingNumber?: string;
  courierCode?: string;
  /** Confirms a move the server warned about (e.g. back from a dispatched order). */
  force?: boolean;
}

export interface BulkResult { id: string; ok: boolean; error?: string; code?: string }

export interface CustomStage { key: string; label: string; color: string }

export type OrderSource = 'MANUAL' | 'WHATSAPP' | 'INSTAGRAM' | 'FACEBOOK' | 'PHONE' | 'TIKTOK';

export interface EditItem {
  productId?: string | null;
  variantId?: string | null;
  name: string;
  sku?: string;
  variant?: string;
  quantity: number;
  price: number;
  image?: string;
}

export interface EditFullBody {
  items: EditItem[];
  discount?: number;
  deliveryFee?: number;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  customerCity?: string;
  notes?: string;
  weightKg?: number | null;
  syncToChannel?: boolean;
}

export interface SyncResult { channel: string; ok: boolean; message: string }

export interface ManualOrderBody {
  source: OrderSource;
  /** 'NAFAA' or a Shopify integration id (create there too). */
  target: string;
  customer: { name: string; phone: string; address?: string; city?: string };
  items: Array<{ productId: string; variantId?: string | null; quantity: number; price: number }>;
  discount?: number;
  deliveryFee?: number;
  isCod: boolean;
  advance?: { amount: number; method: AdvanceMethod };
  weightKg?: number;
  notes?: string;
  replacementOf?: string;
  accept?: boolean;
}

export interface ParsedOrder {
  customerName: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  items: Array<{ text: string; quantity: number; price?: number | null; match?: { productId: string; variantId: string | null; name: string; price: number } | null }>;
  codAmount?: number | null;
}

/** One Excel row, already read on the client. */
export interface ImportRow {
  name: string; phone: string; address?: string; city?: string;
  product?: string; sku?: string; qty?: number; price?: number; cod?: number; notes?: string;
}
export interface ImportRowResult { row: number; ok: boolean; orderId?: string; number?: string; error?: string }

export interface ManualOrderResult {
  order: OnlineOrder;
  accepted: boolean;
  acceptError?: string | null;
  acceptCode?: string | null;
  advanceError?: string | null;
  sync?: SyncResult | null;
}

export interface DuplicateGroups {
  count: number;
  groups: Array<{ phone: string; customerName: string; orders: Array<Pick<OnlineOrder, 'id' | 'externalOrderNumber' | 'customerName' | 'customerPhone' | 'customerCity' | 'total' | 'orderStatus' | 'stage' | 'receivedAt'> & { hasBill: boolean }> }>;
}

export type BulkToolAction = 'assign' | 'follow-up' | 'tag' | 'delete' | 'restore' | 'stage';
export interface BulkToolBody {
  userId?: string | null;
  at?: string | null;
  note?: string;
  tags?: string[];
  stage?: string | null;
  reason?: string;
}

const results = (r: unknown) => {
  const d = unwrap<{ results?: BulkResult[] }>(r);
  return { results: d?.results ?? [] };
};

export const orderBoardApi = {
  move: (id: string, body: MoveBody) =>
    apiClient.post(`/online-orders/${id}/move`, body).then((r) => unwrap<OnlineOrder>(r)),
  bulkMove: (ids: string[], to: BoardStatus, reason?: string) =>
    apiClient.post('/online-orders/bulk-move', { ids, to, reason }).then(results),
  /** assign / follow-up / tag / delete / restore / stage on many orders. */
  bulkTool: (action: BulkToolAction, ids: string[], body: BulkToolBody = {}) =>
    apiClient.post('/online-orders/bulk', { action, ids, ...body }).then(results),

  stages: () => apiClient.get('/online-orders/stages').then((r) => unwrap<CustomStage[]>(r) ?? []),
  saveStages: (stages: CustomStage[]) => apiClient.put('/online-orders/stages', { stages }).then((r) => unwrap<CustomStage[]>(r)),

  assign: (id: string, userId: string | null) =>
    apiClient.post(`/online-orders/${id}/assign`, { userId }).then((r) => unwrap<OnlineOrder>(r)),
  followUp: (id: string, at: string | null, note?: string) =>
    apiClient.post(`/online-orders/${id}/follow-up`, { at, note }).then((r) => unwrap<OnlineOrder>(r)),

  remove: (id: string) => apiClient.delete(`/online-orders/${id}`).then((r) => unwrap<OnlineOrder>(r)),
  restore: (id: string) => apiClient.post(`/online-orders/${id}/restore`).then((r) => unwrap<OnlineOrder>(r)),
  removePermanent: (id: string) => apiClient.delete(`/online-orders/${id}/permanent`).then((r) => unwrap<{ ok: true }>(r)),

  combine: (ids: string[]) => apiClient.post('/online-orders/combine', { ids }).then((r) => unwrap<{ order: OnlineOrder; merged: string[] }>(r)),
  duplicates: () => apiClient.get('/online-orders/duplicates').then((r) => unwrap<DuplicateGroups>(r)),
  split: (id: string, itemIndexes: number[]) =>
    apiClient.post(`/online-orders/${id}/split`, { itemIndexes }).then((r) => unwrap<{ order: OnlineOrder; newOrder: OnlineOrder }>(r)),

  editFull: (id: string, body: EditFullBody) =>
    apiClient.post(`/online-orders/${id}/edit-full`, body).then((r) => unwrap<{ order: OnlineOrder; sync: SyncResult | null }>(r)),

  createManual: (body: ManualOrderBody) =>
    apiClient.post('/online-orders/manual', body).then((r) => unwrap<ManualOrderResult>(r)),
  parse: (text: string) => apiClient.post('/online-orders/parse', { text }).then((r) => unwrap<ParsedOrder>(r)),
  importRows: (rows: ImportRow[]) =>
    apiClient.post('/online-orders/import', { rows }).then((r) => unwrap<{ created: number; failed: number; results: ImportRowResult[] }>(r)),
};

/** Error code the API sends with a 4xx (UNMATCHED_ITEMS, CONFIRM_FORCE, ...). */
export function errorCode(err: unknown): string | null {
  const d = (err as { response?: { data?: any } })?.response?.data;
  const code = d?.code ?? d?.error?.code ?? d?.data?.code ?? d?.message?.code;
  return typeof code === 'string' ? code : null;
}
