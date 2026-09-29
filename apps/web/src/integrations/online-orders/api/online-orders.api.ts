import { apiClient } from '@core/api/client';

/** Backend kabhi {data:{data:X}} kabhi {data:X} deta hai */
function unwrap<T>(r: any): T {
  if (r?.data?.data !== undefined) return r.data.data as T;
  if (r?.data !== undefined) return r.data as T;
  return r as T;
}

export type OnlineOrderStatus =
  | 'PENDING' | 'ACCEPTING' | 'CONFIRMED' | 'PREPARING' | 'READY'
  | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED' | 'REJECTED' | 'RETURNED';

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

export interface CustomerRisk {
  level: 'NEW' | 'TRUSTED' | 'OK' | 'WATCH' | 'HIGH';
  label: string;
  reason: string;
  total: number; delivered: number; returned: number; cancelled: number; open: number; spent: number;
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
  courierCode?: string | null;
  courierLabel?: string | null;
  courierSite?: string | null;
  returnedAt?: string | null;
  returnReason?: string | null;
  codSettledAt?: string | null;
  codSettlementRef?: string | null;
  courierBookedAt?: string | null;
  courierLabelUrl?: string | null;
  courierStatus?: CourierState | 'BOOKING' | null;
  courierStatusAt?: string | null;
  courierBooked?: boolean;
  courierTrail?: { label: string; state: CourierState; history: { label: string; at?: string | null }[]; at: string } | null;
  risk?: CustomerRisk | null;
  confirmation?: { result: 'CONFIRMED' | 'NO_ANSWER' | 'REFUSED'; at: string; attempts: number; note?: string | null } | null;
  autoBookError?: string | null;
  isCod: boolean;
  isTest: boolean;
  platform: string;
  nextStatus: OnlineOrderStatus | null;
  integration?: { id: string; type: string; displayName: string };
}

export type CourierState =
  | 'BOOKED' | 'PICKED_UP' | 'IN_TRANSIT' | 'OUT_FOR_DELIVERY' | 'ATTEMPTED'
  | 'DELIVERED' | 'RETURNING' | 'RETURNED' | 'CANCELLED' | 'UNKNOWN';

export interface CourierSettings {
  pickupAddressCode?: string | null;
  originCityId?: string | null;
  defaultWeightKg?: number | null;
  bookingNote?: string | null;
  serviceType?: string | null;
  [key: string]: string | number | boolean | null | undefined;
}

export interface CourierCredentialField {
  key: string; label: string; placeholder?: string; secret?: boolean; optional?: boolean; help?: string;
  options?: { value: string; label: string }[];
}
export interface CourierSettingField {
  key: string; label: string; help?: string; placeholder?: string;
  type: 'text' | 'number' | 'pickup' | 'origin-city' | 'service' | 'select';
  options?: { value: string; label: string }[];
  required?: boolean;
}

export interface CourierStats {
  booked30: number; active: number; awaitingPickup: number; attempted: number;
  dispatched30: number; delivered30: number; returned30: number; rtoRate: number;
  codPending: number; codPendingValue: number;
}

export interface CourierAccount {
  code: string;
  name: string;
  site: string | null;
  mode: 'api' | 'manual';
  color: string;
  connected: boolean;
  active: boolean;
  maskedKey: string | null;
  connectedAt: string | null;
  lastTestedAt: string | null;
  lastSyncAt: string | null;
  lastError: string | null;
  settings: CourierSettings | null;
  missingSettings: string[];
  stats: CourierStats;
  booked30: number;
  connect: null | {
    credentials: CourierCredentialField[];
    settings: CourierSettingField[];
    portalUrl: string;
    steps: string[];
    labelKind: 'pdf' | 'link' | 'none';
    features: { cancel: boolean; label: boolean; settlement: boolean; portal?: boolean };
  };
}

export interface CourierShipment {
  id: string; externalOrderNumber?: string | null; externalOrderId: string; customerName: string; customerPhone?: string | null;
  customerCity?: string | null; total: number; orderStatus: OnlineOrderStatus; paymentStatus: string; trackingNumber?: string | null;
  courierStatus?: CourierState | 'BOOKING' | null; courierStatusAt?: string | null; courierBookedAt?: string | null;
  dispatchedAt?: string | null; deliveredAt?: string | null; returnedAt?: string | null; codSettledAt?: string | null;
  courierLabel: string | null; viaApi: boolean;
  pieces: number; customerAddress?: string | null; acceptedAt?: string | null;
}

export interface PortalParcel {
  id: string; trackingNumber: string; bookedAt: string; state: CourierState; statusLabel: string | null;
  codAmount: number; city: string | null; customerName: string | null; customerPhone: string | null; orderRef: string | null;
  order: { id: string; number: string; status: OnlineOrderStatus; paymentStatus: string } | null;
}

export interface PickupAddress { code: string; address: string; city?: string | null }
export interface CourierCity { id: string; name: string }

export interface CodCourier {
  code: string; name: string;
  inTransit: number; inTransitValue: number;
  withCourier: number; withCourierValue: number;
  settledMonth: number; settledMonthValue: number;
  dispatched30: number; returned30: number; rtoRate: number;
}
export interface CodSummary {
  totals: {
    inTransit: number; inTransitValue: number; withCourier: number; withCourierValue: number;
    settledMonth: number; settledMonthValue: number; rtoRate: number; returned30: number; dispatched30: number;
  };
  couriers: CodCourier[];
  withCourier: Array<{
    id: string; externalOrderNumber?: string | null; externalOrderId: string; customerName: string; customerCity?: string | null;
    total: number; courier: string | null; trackingNumber?: string | null; deliveredAt?: string | null; daysWaiting: number | null;
    integration?: { type: string; displayName: string };
  }>;
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
  pushPrice?: boolean;
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

  setStatus: (id: string, body: { status: string; reason?: string; trackingNumber?: string; courierName?: string; courierCode?: string }) =>
    apiClient.post(`/online-orders/${id}/status`, body).then((r) => unwrap<OnlineOrder>(r)),

  cancel: (id: string, reason?: string) =>
    apiClient.post(`/online-orders/${id}/cancel`, { reason }).then((r) => unwrap<OnlineOrder>(r)),

  bulk: (action: 'accept' | 'next' | 'cancel' | 'confirm', ids: string[], reason?: string) =>
    apiClient.post('/online-orders/bulk', { action, ids, reason })
      .then((r) => unwrap<{ done: number; failed: number; results: { id: string; ok: boolean; error?: string }[] }>(r)),
  setConfirmation: (id: string, result: 'CONFIRMED' | 'NO_ANSWER' | 'REFUSED', note?: string) =>
    apiClient.post(`/online-orders/${id}/confirmation`, { result, note }).then((r) => unwrap<OnlineOrder>(r)),
  markReturned: (id: string, reason?: string) =>
    apiClient.post(`/online-orders/${id}/returned`, { reason }).then((r) => unwrap<OnlineOrder>(r)),

  codSummary: () => apiClient.get('/online-orders/cod-summary').then((r) => unwrap<CodSummary>(r)),

  settleCod: (orderIds: string[], reference?: string) =>
    apiClient.post('/online-orders/cod/settle', { orderIds, reference }).then((r) => unwrap<{ settled: number }>(r)),

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
export const couriersApi = {
  list: () => apiClient.get('/online-store/couriers').then((r) => unwrap<CourierAccount[]>(r)),
  connect: (code: string, body: { credentials: Record<string, string>; settings?: CourierSettings }) =>
    apiClient.post(`/online-store/couriers/${code}/connect`, body)
      .then((r) => unwrap<{ ok: true; cities: number; pickupAddresses: PickupAddress[]; settings: CourierSettings }>(r)),
  test: (code: string) =>
    apiClient.post(`/online-store/couriers/${code}/test`).then((r) => unwrap<{ ok: true; cities: number; pickupAddresses: PickupAddress[] }>(r)),
  update: (code: string, body: { settings?: CourierSettings; active?: boolean }) =>
    apiClient.patch(`/online-store/couriers/${code}`, body).then((r) => unwrap<{ ok: true; settings: CourierSettings }>(r)),
  disconnect: (code: string) => apiClient.delete(`/online-store/couriers/${code}`).then((r) => unwrap<{ ok: true }>(r)),
  options: (code: string) =>
    apiClient.get(`/online-store/couriers/${code}/options`)
      .then((r) => unwrap<{ cities: CourierCity[]; pickupAddresses: PickupAddress[]; services: { code: string; name: string }[] }>(r)),
  shipments: (code: string, q: { filter?: string; search?: string; limit?: number; offset?: number }) =>
    apiClient.get(`/online-store/couriers/${code}/shipments`, { params: q }).then((r) => unwrap<{ total: number; rows: CourierShipment[] }>(r)),
  bulkBook: (code: string, body: { orderIds: string[]; weightKg?: number; serviceType?: string }) =>
    apiClient.post(`/online-store/couriers/${code}/bulk-book`, body)
      .then((r) => unwrap<{ booked: number; failed: number; results: { orderId: string; ok: boolean; trackingNumber?: string; error?: string }[] }>(r)),
  portalParcels: (code: string, q: { filter?: string; search?: string; limit?: number; offset?: number }) =>
    apiClient.get(`/online-store/couriers/${code}/portal-parcels`, { params: q }).then((r) => unwrap<{ total: number; rows: PortalParcel[] }>(r)),
  /** Kai CN ka label — naye tab me */
  openLabels: async (code: string, trackingNumbers: string[]) => {
    const tab = window.open('', '_blank');
    try {
      const r = await apiClient.post(`/online-store/couriers/${code}/labels`, { trackingNumbers }, { responseType: 'blob' });
      const blob: Blob = r.data;
      if (blob.type.includes('pdf')) {
        const url = URL.createObjectURL(blob);
        if (tab) tab.location.href = url; else window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
        return;
      }
      const json = JSON.parse(await blob.text());
      const url = json?.data?.url ?? json?.url;
      if (!url) throw new Error('Label nahi mila');
      if (tab) tab.location.href = url; else window.open(url, '_blank', 'noopener');
    } catch (e: any) {
      tab?.close();
      const data = e?.response?.data;
      if (data instanceof Blob) { try { e.response.data = JSON.parse(await data.text()); } catch { /* jaisa hai */ } }
      throw e;
    }
  },
  sync: (code: string) =>
    apiClient.post(`/online-store/couriers/${code}/sync`).then((r) => unwrap<{ ok: true; lastSyncAt: string | null; lastError: string | null }>(r)),

  book: (orderId: string, body: { courier: string; cityId?: string; weightKg?: number; pieces?: number; codAmount?: number; notes?: string; serviceType?: string }) =>
    apiClient.post(`/online-orders/${orderId}/courier/book`, body)
      .then((r) => unwrap<{ ok: true; trackingNumber: string; labelKind: 'pdf' | 'link' }>(r)),
  cancel: (orderId: string) => apiClient.post(`/online-orders/${orderId}/courier/cancel`).then((r) => unwrap<{ ok: true }>(r)),
  refresh: (orderId: string) =>
    apiClient.post(`/online-orders/${orderId}/courier/refresh`)
      .then((r) => unwrap<{ ok: true; status: CourierState; label: string | null; history: { label: string; at?: string | null }[] }>(r)),
  /** PostEx: PDF blob. Leopards: {url} JSON. Dono ko naye tab me kholo. */
  openLabel: async (orderId: string) => {
    // Popup blocker: tab pehle kholo (click ke waqt), phir URL do
    const tab = window.open('', '_blank');
    try {
      const r = await apiClient.get(`/online-orders/${orderId}/courier/label`, { responseType: 'blob' });
      const blob: Blob = r.data;
      if (blob.type.includes('pdf')) {
        const url = URL.createObjectURL(blob);
        if (tab) tab.location.href = url; else window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
        return;
      }
      const json = JSON.parse(await blob.text());
      const url = json?.data?.url ?? json?.url;
      if (!url) throw new Error('Label nahi mila');
      if (tab) tab.location.href = url; else window.open(url, '_blank', 'noopener');
    } catch (e: any) {
      tab?.close();
      // Error bhi blob me aata hai — message nikalo
      const data = e?.response?.data;
      if (data instanceof Blob) {
        try { e.response.data = JSON.parse(await data.text()); } catch { /* jaisa hai */ }
      }
      throw e;
    }
  },
};

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
