import { apiClient } from '@core/api/client';

/** Backend kabhi {data:{data:X}} kabhi {data:X} deta hai */
function unwrap<T>(r: any): T {
  if (r?.data?.data !== undefined) return r.data.data as T;
  if (r?.data !== undefined) return r.data as T;
  return r as T;
}

export type OnlineOrderStatus =
  | 'PENDING' | 'ACCEPTING' | 'CONFIRMED' | 'PREPARING' | 'READY'
  | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED' | 'REJECTED';

export interface OnlineOrderItem {
  name: string;
  sku?: string;
  externalProductId?: string;
  variant?: string;
  quantity: number;
  price: number;
  image?: string;
  productId?: string;
}

export interface OnlineOrder {
  id: string;
  integrationId: string;
  externalOrderId: string;
  externalOrderNumber?: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  customerCity?: string;
  customerLat?: number;
  customerLng?: number;
  items: OnlineOrderItem[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  paymentMethod?: string;
  paymentStatus: string;
  orderStatus: OnlineOrderStatus;
  nafaaSaleId?: string | null;
  notes?: string;
  metadata: {
    platform?: string;
    shippingMethod?: string;
    paymentTitle?: string;
    autoAcceptError?: string;
    cancelRequested?: boolean;
    cancelRequestReason?: string;
  };
  receivedAt: string;
  acceptedAt?: string;
  dispatchedAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
  paymentReceivedAt?: string;
  courierName?: string;
  trackingNumber?: string;
  isCod: boolean;
  isTest: boolean;
  platform: string;
  nextStatus: OnlineOrderStatus | null;
  integration?: { id: string; type: string; displayName: string };
}

export interface OrderLine extends OnlineOrderItem {
  index: number;
  lineTotal: number;
  match: null | {
    productId: string;
    variantId: string | null;
    name: string;
    sku?: string;
    nafaaPrice: number;
    image: string | null;
    stock: number;
    enough: boolean;
    via: string;
  };
}

export interface OnlineOrderDetail extends OnlineOrder {
  lines: OrderLine[];
  autoPrint: boolean;
  fulfilShopId: string | null;
  sale: null | {
    id: string;
    saleNumber: string;
    total: number;
    status: string;
    soldAt: string;
    shop?: { id: string; name: string };
  };
}

export interface OnlineOrdersList {
  items: OnlineOrder[];
  total: number;
  counts: Record<string, number>;
  stats: { todayOrders: number; todayValue: number; codDueCount: number; codDueValue: number };
}

export interface LiveOrders {
  pendingCount: number;
  latest: Array<{
    id: string;
    externalOrderId: string;
    externalOrderNumber?: string;
    customerName: string;
    customerCity?: string;
    total: number;
    itemCount: number;
    paymentMethod?: string;
    receivedAt: string;
    metadata?: { test?: boolean; platform?: string };
    integration?: { type: string; displayName: string };
  }>;
}

export interface AcceptResult {
  order: OnlineOrder;
  sale: { id: string; saleNumber: string; total: number };
  autoPrint: boolean;
}

export interface WebsiteConfig {
  autoAccept: boolean;
  autoPrint: boolean;
  shopId: string | null;
  priceSource: 'WEBSITE' | 'NAFAA';
  statusWebhookUrl: string | null;
  requireSignature: boolean;
  shopifySecret: string | null;
  platform: 'custom' | 'woocommerce' | 'shopify' | 'wordpress' | null;
  siteUrl: string | null;
}

export type WebsiteType = 'CUSTOM_WEBSITE' | 'WOOCOMMERCE' | 'SHOPIFY';

/** Websites hamare API tak pahunch sakti hain? (WooCommerce ek-click ko https chahiye) */
export interface PublicApi { url: string; reachable: boolean; reason: string | null; fix: string | null }

export interface SalesChannel {
  id: string;
  type: WebsiteType | 'DARAZ' | 'FOODPANDA' | string;
  displayName: string;
  platform: 'custom' | 'woocommerce' | 'shopify' | 'wordpress' | null;
  siteUrl: string | null;
  isWebsite: boolean;
  live: boolean;
  status: string;
  oneClick: boolean;
  receiving: boolean;
  pendingOrders: number;
  lastOrderAt: string | null;
}

export interface WebsiteOverview {
  connected: boolean;
  integration: null | {
    id: string;
    displayName: string;
    status: string;
    isActive: boolean;
    apiKey: string;
    webhookSecret: string;
    webhookVerified: boolean;
    totalOrdersSynced: number;
    totalProductsSynced: number;
    createdAt: string;
    type: WebsiteType;
    lastSyncAt?: string | null;
    config: WebsiteConfig;
    woo: null | { connected: boolean; connectedAt: string | null; permissions: string | null };
    shopify?: null | { connected: boolean; needsReinstall?: boolean; shop: string | null; connectedAt: string | null; locationName: string | null };
  };
  publicApi?: PublicApi;
  urls: {
    base: string;
    orders: string;
    hook: string | null;
    products: string;
    stock: string;
    verify: string;
    pluginZip: string;
  };
  stats: null | {
    totalOrders: number;
    pendingOrders: number;
    todayOrders: number;
    lastOrderAt: string | null;
    lastOrderNumber: string | null;
    productLinks: number;
    lastSyncAt?: string | null;
  };
  logs: Array<{ id: string; kind: 'IN' | 'OUT'; label: string; ok: boolean; error?: string | null; at: string }>;
}

export interface ExportProduct {
  id: string;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  description?: string | null;
  shortDescription?: string | null;
  price: number;
  unit: string;
  category: string | null;
  images: string[];
  stock: number;
  inStock: boolean;
  variants: Array<{ id: string; name: string; sku?: string | null; price: number; stock: number; size?: string; color?: string }>;
}

export interface CatalogLink {
  mappingId: string; productId: string; variantId: string | null; name: string; variantName: string | null;
  sku: string | null; price: number; stock: number; image: string | null; inactive: boolean;
}
export interface CatalogSuggestion {
  productId: string; variantId: string | null; name: string; variantName: string | null; reason: 'sku' | 'name';
}
export interface CatalogVariant {
  externalVariantId: string | null; title: string; sku: string | null; barcode: string | null;
  price: number; stock: number | null; image: string | null;
  link: CatalogLink | null; suggestion: CatalogSuggestion | null;
}
export interface CatalogProduct {
  externalProductId: string; title: string; image: string | null; status: string; hasVariants: boolean;
  variants: CatalogVariant[];
}
export interface ChannelCatalog {
  kind: 'woocommerce' | 'shopify' | null;
  canFetch: boolean;
  remoteError: string | null;
  fetchedAt: string;
  stats: { products: number; variants: number; linked: number; suggested: number; unlinked: number; nafaaUnlisted: number; orphans: number };
  products: CatalogProduct[];
  orphans: { mappingId: string; externalProductId: string | null; externalVariantId: string | null; externalTitle: string | null; name: string; variantName: string | null }[];
  links: { mappingId: string; externalProductId: string | null; externalVariantId: string | null; externalSku: string | null; externalTitle: string | null; name: string; variantName: string | null; stock: number }[];
}
export interface UnlistedProduct {
  id: string; name: string; sku: string | null; price: number; image: string | null; category: string | null;
  variants: { id: string; name: string; sku: string | null; price: number }[]; stock: number;
}
export interface LinkInput {
  externalProductId: string; externalVariantId?: string | null; productId: string; variantId?: string | null;
  externalTitle?: string | null; externalImage?: string | null; externalSku?: string | null;
}

export interface ImportResult {
  imported: number;
  updated: number;
  failed: number;
  total: number;
  errors: { name: string; error: string }[];
}

export const onlineOrdersApi = {
  list: (params: { status?: string; integrationId?: string; search?: string; payment?: 'COD_DUE'; limit?: number; offset?: number }) =>
    apiClient.get('/online-orders', { params }).then((r) => unwrap<OnlineOrdersList>(r)),

  live: () => apiClient.get('/online-orders/live').then((r) => unwrap<LiveOrders>(r)),

  detail: (id: string) => apiClient.get(`/online-orders/${id}`).then((r) => unwrap<OnlineOrderDetail>(r)),

  accept: (id: string, body: { matches?: Record<string, { productId: string; variantId?: string | null }>; shopId?: string } = {}) =>
    apiClient.post(`/online-orders/${id}/accept`, body).then((r) => unwrap<AcceptResult>(r)),

  setStatus: (id: string, body: { status: string; reason?: string; trackingNumber?: string; courierName?: string }) =>
    apiClient.post(`/online-orders/${id}/status`, body).then((r) => unwrap<OnlineOrder>(r)),

  cancel: (id: string, reason?: string) =>
    apiClient.post(`/online-orders/${id}/cancel`, { reason }).then((r) => unwrap<OnlineOrder>(r)),

  paymentReceived: (id: string) =>
    apiClient.post(`/online-orders/${id}/payment-received`).then((r) => unwrap<OnlineOrder>(r)),

  // ═══ Sales channels (har website / store) ═══
  channels: () => apiClient.get('/online-store/channels').then((r) => unwrap<SalesChannel[]>(r)),

  createChannel: (body: { type: WebsiteType; displayName?: string; shopId?: string; siteUrl?: string }) =>
    apiClient.post('/online-store/channels', body).then((r) => unwrap<WebsiteOverview>(r)),

  channel: (id: string) => apiClient.get(`/online-store/channels/${id}`).then((r) => unwrap<WebsiteOverview>(r)),

  updateChannel: (id: string, body: Partial<WebsiteConfig> & { displayName?: string }) =>
    apiClient.patch(`/online-store/channels/${id}/settings`, body).then((r) => unwrap<WebsiteOverview>(r)),

  rotateKeys: (id: string) => apiClient.post(`/online-store/channels/${id}/rotate-keys`).then((r) => unwrap<WebsiteOverview>(r)),

  pause: (id: string) => apiClient.post(`/online-store/channels/${id}/pause`).then((r) => unwrap<WebsiteOverview>(r)),

  resume: (id: string) => apiClient.post(`/online-store/channels/${id}/resume`).then((r) => unwrap<WebsiteOverview>(r)),

  removeChannel: (id: string) =>
    apiClient.delete(`/online-store/channels/${id}`).then((r) => unwrap<{ success: boolean; archived: boolean }>(r)),

  testOrder: (id: string) =>
    apiClient.post(`/online-store/channels/${id}/test-order`).then((r) => unwrap<{ success: boolean; message: string; channelOrderId: string }>(r)),

  testStatusWebhook: (id: string) =>
    apiClient.post(`/online-store/channels/${id}/test-status-webhook`).then((r) => unwrap<{ ok: boolean; error?: string }>(r)),

  exportProducts: (id: string, shopId?: string) =>
    apiClient.get(`/online-store/channels/${id}/export-products`, { params: shopId ? { shopId } : {} }).then((r) => unwrap<ExportProduct[]>(r)),

  importProducts: (id: string, body: { products: any[]; updatePrice?: boolean; updateStock?: boolean; shopId?: string }) =>
    apiClient.post(`/online-store/channels/${id}/import-products`, body).then((r) => unwrap<ImportResult>(r)),

  // ═══ Products linking (variant tak) ═══
  catalog: (id: string, refresh = false) =>
    apiClient.get(`/online-store/channels/${id}/catalog`, { params: refresh ? { refresh: 1 } : {} }).then((r) => unwrap<ChannelCatalog>(r)),

  unlisted: (id: string, search?: string) =>
    apiClient.get(`/online-store/channels/${id}/catalog/unlisted`, { params: search ? { search } : {} }).then((r) => unwrap<UnlistedProduct[]>(r)),

  saveLinks: (id: string, links: LinkInput[]) =>
    apiClient.post(`/online-store/channels/${id}/links`, { links }).then((r) => unwrap<{ saved: number; errors: string[] }>(r)),

  removeLink: (id: string, mappingId: string) =>
    apiClient.delete(`/online-store/channels/${id}/links/${mappingId}`).then((r) => unwrap<{ success: boolean }>(r)),

  importSelected: (id: string, externalProductIds: string[]) =>
    apiClient.post(`/online-store/channels/${id}/catalog/import`, { externalProductIds })
      .then((r) => unwrap<{ created: number; linkedExisting: number; failed: number; errors: string[] }>(r)),

  exportSelected: (id: string, productIds: string[]) =>
    apiClient.post(`/online-store/channels/${id}/catalog/export`, { productIds })
      .then((r) => unwrap<{ created: number; updated: number; failed: number; total: number; errors: string[] }>(r)),

  shopifyLookup: (shop: string) =>
    apiClient.get('/online-store/channels/shopify/lookup', { params: { shop } })
      .then((r) => unwrap<{ shop: string; channelId: string | null; connected: boolean }>(r)),

  // ═══ WooCommerce ek click ═══
  wooStart: (body: { siteUrl: string; displayName?: string; shopId?: string; channelId?: string }) =>
    apiClient
      .post('/online-store/channels/woocommerce/start', { ...body, returnOrigin: window.location.origin })
      .then((r) => unwrap<{ channelId: string; authUrl: string | null; siteUrl: string; needsHttps: boolean; reason: string | null; fix: string | null }>(r)),

  capabilities: () =>
    apiClient.get('/online-store/channels/capabilities').then((r) => unwrap<{ publicApi: PublicApi; shopifyOAuth: boolean }>(r)),

  // ═══ Shopify ek click ═══
  shopifyStart: (body: { shop: string; displayName?: string; shopId?: string; channelId?: string }) =>
    apiClient
      .post('/online-store/channels/shopify/start', { ...body, returnOrigin: window.location.origin })
      .then((r) => unwrap<{ channelId: string; authUrl: string | null; needsHttps: boolean; reason: string | null; fix: string | null }>(r)),

  shopifyRepair: (id: string) =>
    apiClient.post(`/online-store/channels/${id}/shopify/repair`).then((r) => unwrap<{ ok: boolean; installed: number }>(r)),

  shopifySyncStock: (id: string) =>
    apiClient.post(`/online-store/channels/${id}/shopify/sync-stock`).then((r) => unwrap<{ updated: number; checked: number; missing: number }>(r)),

  shopifyImport: (id: string, body: { updatePrice?: boolean; updateStock?: boolean }) =>
    apiClient.post(`/online-store/channels/${id}/shopify/import-products`, body).then((r) => unwrap<ImportResult>(r)),

  shopifyExport: (id: string, body: { updatePrice?: boolean }) =>
    apiClient
      .post(`/online-store/channels/${id}/shopify/export-products`, body)
      .then((r) => unwrap<{ created: number; updated: number; failed: number; total: number; errors: string[] }>(r)),

  wooKeys: (id: string, body: { consumerKey: string; consumerSecret: string; siteUrl?: string }) =>
    apiClient.post(`/online-store/channels/${id}/woocommerce/keys`, body).then((r) => unwrap<WebsiteOverview>(r)),

  wooRepair: (id: string) =>
    apiClient.post(`/online-store/channels/${id}/woocommerce/repair`).then((r) => unwrap<{ ok: boolean; installed: number }>(r)),

  wooSyncStock: (id: string) =>
    apiClient.post(`/online-store/channels/${id}/woocommerce/sync-stock`).then((r) => unwrap<{ updated: number; checked: number; missing: number }>(r)),

  wooImport: (id: string, body: { updatePrice?: boolean; updateStock?: boolean }) =>
    apiClient.post(`/online-store/channels/${id}/woocommerce/import-products`, body).then((r) => unwrap<ImportResult>(r)),

  wooExport: (id: string, body: { updatePrice?: boolean }) =>
    apiClient
      .post(`/online-store/channels/${id}/woocommerce/export-products`, body)
      .then((r) => unwrap<{ created: number; updated: number; failed: number; total: number; errors: string[] }>(r)),
};

/** Backend ke error ka asli paigham (NestJS kai shaklon me deta hai) */
export function apiErrorMessage(err: any, fallback = 'Kuch ghalat ho gaya'): string {
  const d = err?.response?.data;
  const m = d?.message ?? d?.error?.message ?? d?.data?.message ?? err?.message;
  if (Array.isArray(m)) return m.join(', ');
  return typeof m === 'string' && m ? m : fallback;
}

/** Accept par "ye items match nahi hue" wala jawab */
export function unmatchedFromError(err: any): { index: number; name: string; sku?: string; variant?: string }[] | null {
  const d = err?.response?.data;
  const list = d?.unmatched ?? d?.error?.unmatched ?? d?.data?.unmatched ?? d?.message?.unmatched ?? d?.details?.unmatched;
  if (Array.isArray(list)) return list;
  const code = d?.code ?? d?.error?.code ?? d?.data?.code;
  return code === 'UNMATCHED_ITEMS' ? [] : null;
}
