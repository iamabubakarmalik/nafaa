/** Online store (commerce) across all shops: overview, channels, catalog jobs, orders, couriers and platform controls. */

import { apiClient } from './client';

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;
const get = <T>(url: string, params?: Record<string, unknown>) => apiClient.get<{ data: T }>(url, { params }).then(unwrap);
const post = <T>(url: string, body?: unknown) => apiClient.post<{ data: T }>(url, body).then(unwrap);

export interface CommerceOverview {
  range: { from: string; to: string };
  channels: Array<{ kind: string; total: number; connected: number; paused: number; error: number; other: number }>;
  totals: {
    orders: number; gmv: number; delivered: number; returned: number; cancelled: number; dispatched: number; merchants: number;
    deliveryRate: number | null; rtoRate: number | null; aov: number;
  };
  daily: Array<{ day: string; orders: number; gmv: number }>;
  byKind: Array<{ kind: string; orders: number; gmv: number }>;
  topMerchants: Array<{ tenantId: string; name: string; orders: number; gmv: number; delivered: number; returned: number }>;
  manualSources: Array<{ source: string; orders: number }>;
  couriers: { accounts: Array<{ provider: string; active: number; inactive: number }>; used: Array<{ courier: string; orders: number; tenants: number }> };
  pausedTypes: string[];
}

export interface ShopifyPlan { billing: string; active?: boolean; name?: string | null; status?: string | null; test?: boolean; checkedAt?: string }

export interface CommerceChannelRow {
  id: string; tenantId: string; tenantName: string; tenantStatus: string; kind: string; type: string; name: string;
  status: string; isActive: boolean; lastSyncAt: string | null; lastSyncStatus: string | null; createdAt: string;
  siteUrl: string | null; shopifyPlan: ShopifyPlan | null; channelError: string | null;
  totalErrors: number; ordersTotal: number; lastOrderAt: string | null; links: number; pushFailures: number;
  syncErrors7d: number; webhookErrors7d: number; canPush: boolean; killSwitch: boolean;
}

export interface CatalogJobRow {
  id: string; kind: string; status: string; integrationId: string | null; total: number; done: number; failed: number; percent: number;
  errors: string[]; params: Record<string, unknown> | null; createdAt: string; startedAt: string | null; finishedAt: string | null;
  tenantId: string; tenantName: string | null; channel: { id: string; displayName: string; type: string } | null;
  cursor: number; heartbeatAt: string | null; stalled: boolean;
}

export interface CommerceChannelDetail {
  id: string; tenantId: string; type: string; kind: string; displayName: string; status: string; isActive: boolean;
  lastSyncAt: string | null; lastSyncStatus: string | null; totalOrdersSynced: number; totalErrors: number; webhookVerified: boolean; createdAt: string;
  tenant: { id: string; name: string; status: string; businessType: string | null } | null;
  canPush: boolean; canScan: boolean; killSwitch: boolean;
  settings: {
    siteUrl: string | null; platform: string | null; pushStock: boolean | null; pushPrice: boolean | null; pushContent: unknown; autoLink: boolean | null;
    stockMode: string | null; shopifyBilling: string | null; shopifyPlan: ShopifyPlan | null; channelError: string | null;
    lastScan: { at: string; items: number; open: number; sure: number; newUnlinked: number; autoLinked: number; error: string | null } | null;
  };
  counts: { links: number; linksByStatus: Record<string, number>; failedLinks: number; orders30d: number; lastOrderAt: string | null };
  syncLogs: Array<{ id: string; operation: string; direction: string; status: string; recordsProcessed: number; recordsSuccess: number; recordsFailed: number; errorMessage: string | null; startedAt: string; completedAt: string | null }>;
  webhookLogs: Array<{ id: string; source: string; event: string; method: string; responseStatus: number | null; processed: boolean; errorMessage: string | null; receivedAt: string }>;
  failedLinks: Array<{ id: string; productId: string; product: string | null; variant: string | null; sku: string | null; externalTitle: string | null; error: string | null; lastSyncedAt: string | null }>;
  jobs: Array<Omit<CatalogJobRow, 'tenantId' | 'tenantName' | 'channel' | 'cursor' | 'heartbeatAt' | 'stalled'>>;
}

export interface OnlineOrderRow {
  id: string; tenantId: string; tenantName: string | null; integrationId: string; externalOrderId: string; externalOrderNumber: string | null;
  customerName: string; customerPhone: string | null; customerCity: string | null; total: string | number; paymentMethod: string | null;
  paymentStatus: string; orderStatus: string; stage: string | null; nafaaSaleId: string | null; receivedAt: string;
  acceptedAt: string | null; dispatchedAt: string | null; deliveredAt: string | null; cancelledAt: string | null; returnedAt: string | null;
  courierName: string | null; courierCode: string | null; trackingNumber: string | null; courierStatus: string | null; courierBookedAt: string | null;
  deletedAt: string | null; integration: { id: string; type: string; displayName: string };
}

export interface OnlineOrderDetail extends OnlineOrderRow {
  customerAddress: string | null; items: unknown; subtotal: string | number; deliveryFee: string | number; discount: string | number;
  cancelReason: string | null; returnReason: string | null; courierLabelUrl: string | null; codSettledAt: string | null; codSettlementRef: string | null;
  tenant: { id: string; name: string } | null;
  sale: { id: string; saleNumber: string; status: string; total: number; createdAt: string } | null;
  shipment: { provider: string; trackingNumber: string; status: string; lastEvent: string | null; lastEventAt: string | null } | null;
  source: string | null; platform: string | null; autoBookError: string | null;
  timeline: Array<{ at?: string; type?: string; status?: string; note?: string; by?: string; [k: string]: unknown }>;
}

export interface StuckOrders {
  rules: { pendingHours: number; dispatchedDays: number; lookbackDays: number };
  counts: { pending: number; inTransit: number };
  byTenant: Array<{ tenantId: string; name: string; pending: number; inTransit: number }>;
  pending: OnlineOrderRow[];
  inTransit: OnlineOrderRow[];
}

export interface CourierAccountRow {
  id: string; tenantId: string; tenantName: string | null; provider: string; isActive: boolean; isSandbox: boolean;
  lastTestedAt: string | null; lastSyncAt: string | null; lastError: string | null; updatedAt: string; shipments: number;
}

export interface CommerceCouriers {
  accounts: CourierAccountRow[];
  rates: Array<{ courier: string; booked: number; failed: number; tenants: number; failureRate: number | null }>;
  recentErrors: Array<{ kind: 'account' | 'booking'; tenantId: string; tenantName: string | null; courier: string | null; error: string; at: string; orderId: string | null; number: string | null }>;
}

export interface CommerceControls {
  killSwitch: Record<string, boolean>;
  killSwitchNote: string | null;
  newShopDefaults: { autoLink: boolean; postOrderCosts: boolean; stockMode: 'all' | 'percent' | 'fixed' };
  catalogJobs: { chunkSize: Record<string, number>; delayMs: number | null };
  whatsappTemplates: Array<{ key: string; label: string; text: string }>;
  customStatuses: Array<{ key: string; label: string; color: string }>;
  comingSoon: Record<string, boolean>;
}

export interface CommerceControlsResponse {
  controls: CommerceControls;
  updatedAt: string | null;
  updatedBy: { fullName: string; email: string } | null;
  options: { channelTypes: string[]; modules: string[]; jobKinds: string[] };
}

export interface TenantCommerce {
  tenant: { id: string; name: string };
  channels: CommerceChannelRow[];
  orders: { total: number; last30d: number; byStatus30d: Record<string, number> };
  links: number;
  pushFailures: number;
  couriers: CourierAccountRow[];
  courierErrors: CommerceCouriers['recentErrors'];
  jobs: CatalogJobRow[];
}

/** Import fix per link: 'untrack' turns channel "Track quantity" off again; 'restore' sets Nafaa stock to the old channel number. */
export interface StockRecoveryRow {
  mappingId: string; productId: string; variantId: string | null; name: string; variantName: string | null;
  externalTitle: string | null; externalSku: string | null;
  action: 'untrack' | 'restore';
  nafaaStock: number; channelTracked: boolean | null; channelAvailable: number | null;
  importQty: number | null; importedAt: string | null; found: number | null;
  source: 'import-zero' | 'untracked-link' | 'first-push'; confidence: 'high' | 'low' | null;
  channelChangedAt: string | null; at: string | null; lastPushAt: string | null;
}
export interface StockRecoveryPreview { rows: StockRecoveryRow[]; checked: number; missing: number; note: string | null; readError: string | null }
export interface TenantStockRecovery { channels: Array<{ id: string; name: string; type: string; preview: StockRecoveryPreview }> }
export interface StockRecoveryApply { untracked: number; adjusted: number; skipped: number; errors: string[]; pushed: boolean }

export interface ChannelFilters { search?: string; kind?: string; status?: string; tenantId?: string; problems?: boolean; page?: number; limit?: number }

export const adminCommerceApi = {
  overview: (from?: string, to?: string) => get<CommerceOverview>('/admin/commerce/overview', { from, to }),
  channels: (f: ChannelFilters) =>
    get<{ items: CommerceChannelRow[]; meta: { page: number; limit: number; total: number } }>('/admin/commerce/channels', { ...f, problems: f.problems ? '1' : undefined }),
  channel: (id: string) => get<CommerceChannelDetail>(`/admin/commerce/channels/${id}`),
  channelAction: (id: string, action: 'pause' | 'resume' | 'rescan' | 'repush' | 'retry-failed') => post<any>(`/admin/commerce/channels/${id}/${action}`),
  jobs: (params: { status?: string; tenantId?: string; kind?: string }) =>
    get<{ counts: Record<string, number>; jobs: CatalogJobRow[] }>('/admin/commerce/jobs', params),
  cancelJob: (id: string) => post<any>(`/admin/commerce/jobs/${id}/cancel`),
  retryJob: (id: string) => post<{ job: { id: string }; existing: boolean }>(`/admin/commerce/jobs/${id}/retry`),
  searchOrders: (q: string) => get<{ orders: OnlineOrderRow[] }>('/admin/commerce/orders/search', { q }),
  stuckOrders: () => get<StuckOrders>('/admin/commerce/orders/stuck'),
  order: (id: string) => get<OnlineOrderDetail>(`/admin/commerce/orders/${id}`),
  couriers: (tenantId?: string) => get<CommerceCouriers>('/admin/commerce/couriers', { tenantId }),
  controls: () => get<CommerceControlsResponse>('/admin/commerce/controls'),
  saveControls: (c: CommerceControls) => apiClient.put<{ data: CommerceControlsResponse }>('/admin/commerce/controls', c).then(unwrap),
  tenant: (tenantId: string) => get<TenantCommerce>(`/admin/commerce/tenants/${tenantId}`),
  stockRecovery: (tenantId: string) => get<TenantStockRecovery>(`/admin/commerce/tenants/${tenantId}/stock-recovery`),
  applyStockRecovery: (tenantId: string, channelId: string, mappingIds: string[]) =>
    post<StockRecoveryApply>(`/admin/commerce/tenants/${tenantId}/stock-recovery/apply`, { channelId, mappingIds }),
};
