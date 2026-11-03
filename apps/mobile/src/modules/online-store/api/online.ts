/**
 * Online store API for the app: orders, couriers, COD, selling costs,
 * scanning, online products, channels, customers, block list, reports,
 * ads and the price calculator. Same endpoints as the web
 * (apps/web/src/integrations/online-orders/api, modules/growth/api).
 */

import { apiClient } from '@/core/api/client';
import type {
  AcceptResult, AdvanceMethod, BlockEntry, ChannelCatalog, CodHistory, CodSummary, ColumnMap, CostKind, CostSettings, CostSettingsView,
  CourierAccount, CourierCity, CourierRules, CourierRulesView, CourierSettings, CourierShipment, CourierState, CourierSuggest, CustomersResult,
  DeliveryMode, GridFilter, GridPage, GridQuery, GridSummary, Issue, LinkInput, LiveOrders, OnlineChannel, OnlineOrder, OnlineOrderDetail,
  OnlineOrdersList, OnlineReport, OrderCosts, OrderListQuery, OrderPaymentLink, OrderProfit, PayGatewayAccount, PickupAddress, PortalParcel,
  PriceRule, ProfitReport, ReconcileResult, RiskSettings, SalesChannel, ScanOrder, Suggestions,
} from '@nafaa/core/online-store';

/** The API sometimes nests the payload once more ({ data: X }). */
const unwrap = <T,>(r: { data: unknown }): T => {
  const d = r.data as { data?: unknown } | null;
  return (d && typeof d === 'object' && 'data' in d && d.data !== undefined && !Array.isArray(d) ? d.data : d) as T;
};
const get = <T,>(url: string, params?: object) => apiClient.get(url, { params }).then((r) => unwrap<T>(r));
const post = <T,>(url: string, body?: unknown, timeout?: number) => apiClient.post(url, body ?? {}, timeout ? { timeout } : undefined).then((r) => unwrap<T>(r));
const put = <T,>(url: string, body?: unknown) => apiClient.put(url, body ?? {}).then((r) => unwrap<T>(r));
const patch = <T,>(url: string, body?: unknown) => apiClient.patch(url, body ?? {}).then((r) => unwrap<T>(r));
const del = <T,>(url: string) => apiClient.delete(url).then((r) => unwrap<T>(r));

export const ordersApi = {
  list: (q: OrderListQuery) => get<OnlineOrdersList>('/online-orders', q),
  live: () => get<LiveOrders>('/online-orders/live'),
  detail: (id: string) => get<OnlineOrderDetail>(`/online-orders/${id}`),
  accept: (id: string, body: { matches?: Record<string, { productId: string; variantId?: string | null }>; shopId?: string } = {}) =>
    post<AcceptResult>(`/online-orders/${id}/accept`, body),
  setStatus: (id: string, body: { status: string; reason?: string; trackingNumber?: string; courierName?: string; courierCode?: string }) =>
    post<OnlineOrder>(`/online-orders/${id}/status`, body),
  cancel: (id: string, reason?: string) => post<OnlineOrder>(`/online-orders/${id}/cancel`, { reason }),
  bulk: (action: 'accept' | 'next' | 'cancel' | 'confirm', ids: string[], reason?: string) =>
    post<{ done: number; failed: number; results: { id: string; ok: boolean; error?: string }[] }>('/online-orders/bulk', { action, ids, reason }, 120_000),
  report: (q: { from?: string; to?: string; integrationId?: string }) => get<OnlineReport>('/online-orders/report', q),
  editOrder: (id: string, body: { customerName?: string; customerPhone?: string; customerAddress?: string; customerCity?: string; notes?: string }) =>
    post<{ ok: true; changed: number }>(`/online-orders/${id}/edit`, body),
  moveBranch: (id: string, body: { shopId: string; remember?: boolean }) =>
    post<{ ok: true; shopId: string; shopName: string; remembered: boolean }>(`/online-orders/${id}/branch`, body),
  addNote: (id: string, text: string) => post<{ ok: true }>(`/online-orders/${id}/notes`, { text }),
  setTags: (id: string, tags: string[]) => post<{ ok: true; tags: string[] }>(`/online-orders/${id}/tags`, { tags }),
  customers: (q: { segment?: string; search?: string; limit?: number; offset?: number }) => get<CustomersResult>('/online-orders/customers', q),
  blocklist: () => get<BlockEntry[]>('/online-store/blocklist'),
  block: (body: { phone: string; name?: string; reason?: string }) => post<{ ok: true }>('/online-store/blocklist', body),
  unblock: (phone: string) => del<{ ok: true }>(`/online-store/blocklist/${encodeURIComponent(phone)}`),
  setConfirmation: (id: string, result: 'CONFIRMED' | 'NO_ANSWER' | 'REFUSED', note?: string) =>
    post<OnlineOrder>(`/online-orders/${id}/confirmation`, { result, note }),
  markReturned: (id: string, reason?: string) => post<OnlineOrder>(`/online-orders/${id}/returned`, { reason }),
  codSummary: () => get<CodSummary>('/online-orders/cod-summary'),
  codHistory: (q: { from?: string; to?: string }) => get<CodHistory>('/online-orders/cod/history', q),
  settleCod: (orderIds: string[], reference?: string) => post<{ settled: number }>('/online-orders/cod/settle', { orderIds, reference }),
  paymentReceived: (id: string) => post<OnlineOrder>(`/online-orders/${id}/payment-received`),
  addAdvance: (id: string, body: { amount: number; method: AdvanceMethod; reference?: string }) => post<OnlineOrder>(`/online-orders/${id}/advance`, body),
  removeAdvance: (id: string, ref: string) => del<OnlineOrder>(`/online-orders/${id}/advance/${encodeURIComponent(ref)}`),
  channels: () => get<SalesChannel[]>('/online-store/channels'),
  pause: (id: string) => post<unknown>(`/online-store/channels/${id}/pause`),
  resume: (id: string) => post<unknown>(`/online-store/channels/${id}/resume`),
  testOrder: (id: string) => post<{ success: boolean; message: string; channelOrderId: string }>(`/online-store/channels/${id}/test-order`),
  catalog: (id: string, refresh = false) => get<ChannelCatalog>(`/online-store/channels/${id}/catalog`, refresh ? { refresh: 1 } : {}),
  exportSelected: (id: string, productIds: string[]) =>
    post<{ created: number; updated: number; failed: number; total: number; errors: string[] }>(`/online-store/channels/${id}/catalog/export`, { productIds }, 180_000),
};

export const couriersApi = {
  list: () => get<CourierAccount[]>('/online-store/couriers'),
  connect: (code: string, body: { credentials: Record<string, string>; settings?: CourierSettings }) =>
    post<{ ok: true; cities: number; pickupAddresses: PickupAddress[]; settings: CourierSettings }>(`/online-store/couriers/${code}/connect`, body, 60_000),
  test: (code: string) => post<{ ok: true; cities: number; pickupAddresses: PickupAddress[] }>(`/online-store/couriers/${code}/test`),
  update: (code: string, body: { settings?: CourierSettings; active?: boolean }) => patch<{ ok: true; settings: CourierSettings }>(`/online-store/couriers/${code}`, body),
  disconnect: (code: string) => del<{ ok: true }>(`/online-store/couriers/${code}`),
  options: (code: string) => get<{ cities: CourierCity[]; pickupAddresses: PickupAddress[]; services: { code: string; name: string }[] }>(`/online-store/couriers/${code}/options`),
  shipments: (code: string, q: { filter?: string; search?: string; limit?: number; offset?: number }) =>
    get<{ total: number; rows: CourierShipment[] }>(`/online-store/couriers/${code}/shipments`, q),
  bulkBook: (code: string, body: { orderIds: string[]; weightKg?: number; serviceType?: string }) =>
    post<{ booked: number; failed: number; results: { orderId: string; ok: boolean; trackingNumber?: string; error?: string }[] }>(`/online-store/couriers/${code}/bulk-book`, body, 180_000),
  portalParcels: (code: string, q: { filter?: string; search?: string; limit?: number; offset?: number }) =>
    get<{ total: number; rows: PortalParcel[] }>(`/online-store/couriers/${code}/portal-parcels`, q),
  sync: (code: string) => post<{ ok: true; lastSyncAt: string | null; lastError: string | null }>(`/online-store/couriers/${code}/sync`, undefined, 120_000),
  book: (orderId: string, body: { courier: string; cityId?: string; weightKg?: number; pieces?: number; codAmount?: number; notes?: string; serviceType?: string }) =>
    post<{ ok: true; trackingNumber: string; labelKind: 'pdf' | 'link' }>(`/online-orders/${orderId}/courier/book`, body, 60_000),
  cancel: (orderId: string) => post<{ ok: true }>(`/online-orders/${orderId}/courier/cancel`),
  refresh: (orderId: string) =>
    post<{ ok: true; status: CourierState; label: string | null; history: { label: string; at?: string | null }[] }>(`/online-orders/${orderId}/courier/refresh`),
};

export const paymentsApi = {
  accounts: () => get<PayGatewayAccount[]>('/online-store/payments'),
  createLink: (orderId: string, body: { provider: string; amount?: number }) => post<OrderPaymentLink & { url: string }>(`/online-orders/${orderId}/payment-link`, body),
};

export const moneyApi = {
  costSettings: () => get<CostSettingsView>('/online-orders/costs/settings'),
  saveCostSettings: (body: Partial<CostSettings>) => put<{ settings: CostSettings }>('/online-orders/costs/settings', body),
  setCosts: (id: string, body: Partial<Record<CostKind, number | null>>) => post<{ costs: OrderCosts; profit?: OrderProfit }>(`/online-orders/${id}/costs`, body),
  profitReport: (q: { from?: string; to?: string; integrationId?: string }) => get<ProfitReport>('/online-orders/report/profit', q),
  reconcile: (body: { headers: string[]; rows: unknown[][]; mapping?: ColumnMap; courier?: string }) => post<ReconcileResult>('/online-orders/cod/reconcile', body, 120_000),
  settleStatement: (body: { reference?: string; withCharges?: boolean; items: Array<{ orderId: string; received: number; charge?: number | null; codFee?: number | null }> }) =>
    post<{ settled: number; charged: number; skipped: number }>('/online-orders/cod/reconcile/settle', body, 120_000),
  courierRules: () => get<CourierRulesView>('/online-orders/courier-rules'),
  saveCourierRules: (body: CourierRules) => put<CourierRulesView>('/online-orders/courier-rules', body),
  courierSuggest: (id: string) => get<CourierSuggest>(`/online-orders/${id}/courier-suggest`),
  setDelivery: (id: string, mode: DeliveryMode) => post<OnlineOrder>(`/online-orders/${id}/delivery`, { mode }),
};

export const scanApi = {
  lookup: (code: string) => get<ScanOrder>('/online-orders/scan', { code }),
  packed: (id: string, counts: Record<number, number>, manual: number[]) => post<{ ok: true; order: ScanOrder }>(`/online-orders/${id}/packed`, { counts, manual }),
  rtoReceive: (id: string, damaged: Record<number, number>, reason?: string) =>
    post<{ ok: true; restocked: number; damaged: number; failed: string[]; rtoCost: number; order: ScanOrder }>(`/online-orders/${id}/rto-receive`, { damaged, reason }),
  riskSettings: () => get<RiskSettings>('/online-orders/risk/settings'),
  saveRiskSettings: (body: Partial<RiskSettings>) => put<RiskSettings>('/online-orders/risk/settings', body),
};

export const productsApi = {
  channels: () => get<{ channels: OnlineChannel[]; sellable: number }>('/online-products/channels'),
  grid: (q: GridQuery) => get<GridPage>('/online-products/grid', q),
  summary: (channelId?: string) => get<GridSummary>('/online-products/summary', channelId ? { channelId } : {}),
  suggestions: (channelId: string, refresh = false) =>
    apiClient.get(`/online-products/channels/${channelId}/suggestions`, { params: refresh ? { refresh: 1 } : {}, timeout: 180_000 }).then((r) => unwrap<Suggestions>(r)),
  link: (channelId: string, links: LinkInput[]) => post<{ saved: number; errors: string[] }>(`/online-products/channels/${channelId}/links`, { links }),
  importItems: (channelId: string, externalProductIds: string[]) =>
    post<{ created: number; linkedExisting: number; failed: number; errors: string[] }>(`/online-products/channels/${channelId}/import`, { externalProductIds }, 180_000),
  settings: (channelId: string, body: { priceRule?: PriceRule; pushPrice?: boolean; stockBuffer?: number; pushStock?: boolean; autoLink?: boolean }) =>
    put<OnlineChannel>(`/online-products/channels/${channelId}/settings`, body),
  syncChannel: (channelId: string) => post<{ prices: number; error: string | null }>(`/online-products/channels/${channelId}/sync`, undefined, 180_000),
  syncProduct: (productId: string) =>
    post<{ results: Array<{ channelId: string; name: string; ok: boolean; error: string | null }> }>(`/online-products/items/${productId}/sync`, undefined, 120_000),
  setPrice: (mappingId: string, priceOverride: number | null) => put<{ success: boolean }>(`/online-products/links/${mappingId}/price`, { priceOverride }),
  issues: () => get<{ issues: Issue[] }>('/online-products/issues'),
  linkSure: (channelId: string) => post<{ saved: number; errors: string[] }>(`/online-products/channels/${channelId}/link-sure`, undefined, 180_000),
  fixSizeLess: (channelId: string) => post<{ removed: number }>(`/online-products/channels/${channelId}/fix-size-less`),
  unlink: (mappingId: string) => del<{ success: boolean }>(`/online-products/links/${mappingId}`),
};

export type { GridFilter };

/** Short text of an API error (NestJS sends it in a few shapes). */
export function apiErrorMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: unknown; error?: { message?: unknown }; data?: { message?: unknown } } }; message?: string };
  const d = e?.response?.data;
  const m = d?.message ?? d?.error?.message ?? d?.data?.message ?? e?.message;
  if (Array.isArray(m)) return m.join(', ');
  return typeof m === 'string' && m ? m : fallback;
}

/** Accept answered "these items are not linked to products". */
export function unmatchedFromError(err: unknown): unknown[] | null {
  const d = (err as { response?: { data?: Record<string, any> } })?.response?.data;
  const list = d?.unmatched ?? d?.error?.unmatched ?? d?.data?.unmatched ?? d?.message?.unmatched ?? d?.details?.unmatched;
  if (Array.isArray(list)) return list;
  const code = d?.code ?? d?.error?.code ?? d?.data?.code;
  return code === 'UNMATCHED_ITEMS' ? [] : null;
}

export const statusOf = (err: unknown) => (err as { response?: { status?: number } })?.response?.status;
