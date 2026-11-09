/**
 * Online store data shapes as the API sends them (online orders, couriers,
 * COD, selling costs, scanning, online products). Same shapes the web uses.
 */

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
  level: 'NEW' | 'TRUSTED' | 'OK' | 'WATCH' | 'HIGH' | 'BLOCKED';
  label: string;
  reason: string;
  duplicateOpen?: number;
  total: number; delivered: number; returned: number; cancelled: number; open: number; spent: number;
  /** Every reason behind the level, most serious first. */
  reasons?: string[];
}

export interface OnlineOrder {
  id: string;
  integrationId: string;
  /** Kis branch ka order (multi-branch) */
  shopId?: string | null;
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
    /** Order kis Token / branch code se aaya (multi-branch) */
    route?: string;
    shippingMethod?: string;
    paymentTitle?: string;
    autoAcceptError?: string;
    cancelRequested?: boolean;
    cancelRequestReason?: string;
    internalNotes?: { id: string; text: string; at: string; byName?: string | null }[];
    tags?: string[];
    edits?: { at: string; changes: Record<string, { from: string | null; to: string | null }> }[];
    blocked?: { reason?: string | null; at: string };
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
  /** Advance received, COD still to collect, and who keeps the delivery charge (older API: absent). */
  money?: OrderMoney;
}

export type DeliveryMode = 'CUSTOMER' | 'FREE' | 'RIDER';
export interface OrderMoney {
  advance: number; codDue: number; deliveryMode: DeliveryMode; deliveryFee: number;
  /** The website's delivery charge, also when the shop made it free on this order. */
  originalFee?: number;
}
export type AdvanceMethod = 'JAZZCASH' | 'EASYPAISA' | 'BANK' | 'CASH' | 'OTHER';

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

export interface ChannelForm {
  enabled: boolean; key: string | null; deliveryFee: number; freeAbove: number | null; onlyInStock: boolean; message: string | null;
  productIds: string[] | null; formUrl: string | null; embedCode: string | null; buttonCode: string;
  accent: string | null; logoUrl: string | null; showPhone: boolean; coupons: FormCoupon[];
}
export interface FormCoupon { code: string; type: 'PERCENT' | 'FLAT'; value: number; minOrder: number | null; maxUses: number | null; uses: number; active: boolean }

export interface OnlineCustomer {
  key: string; name: string; phone: string; city: string | null; orders: number; delivered: number; returned: number; cancelled: number;
  spent: number; avgOrder: number; firstAt: string; lastAt: string; daysSince: number; channels: string[]; blocked: boolean; segments: string[];
}
export interface CustomersResult {
  counts: Record<string, number>;
  totals: { customers: number; spent: number; repeatRate: number };
  total: number;
  rows: OnlineCustomer[];
}

export interface BlockEntry { key: string; phone: string; name: string | null; reason: string | null; at: string }

type Rated = { dispatched: number; delivered: number; returned: number; rtoRate: number; deliveryRate: number };
/**
 * Online sales for a period of business days. `value` counts every order
 * received; `netValue` and every chart's `value` leave out cancelled,
 * rejected and returned orders.
 */
export interface OnlineReport {
  range: { from: string; to: string };
  totals: {
    orders: number; value: number; netOrders: number; netValue: number; accepted: number; dispatched: number; delivered: number;
    deliveredValue: number; returned: number; returnedValue: number; cancelled: number; pending: number; avgOrderValue: number;
    rtoRate: number; cancelRate: number; deliveryRate: number; avgAcceptMinutes: number | null; avgDeliveryDays: number | null;
    customers: number; repeatCustomers: number;
  };
  previous: { from: string; to: string; orders: number; netValue: number; delivered: number; rtoRate: number };
  payment: { cod: { orders: number; value: number; collected: number; pending: number }; prepaid: { orders: number; value: number } };
  byStatus: Record<string, number>;
  byDay: { day: string; orders: number; value: number; delivered: number; returned: number }[];
  byHour: { hour: number; orders: number; value: number }[];
  byWeekday: { day: number; orders: number; value: number }[];
  byChannel: ({ name: string; type: string; orders: number; value: number } & Rated)[];
  byCity: ({ city: string; orders: number; value: number } & Rated)[];
  riskyCities: ({ city: string; orders: number; value: number } & Rated)[];
  byCourier: ({ code: string; name: string } & Rated)[];
  topProducts: { name: string; qty: number; value: number }[];
  topCustomers: { name: string; phone: string; city: string | null; orders: number; value: number }[];
  biggest: { id: string; number: string; customerName: string; total: number } | null;
  codAging: { label: string; count: number; value: number }[];
}

export interface CodSettlement {
  ref: string | null; day: string; count: number; value: number; couriers: string[];
  orders: { id: string; number: string; customerName: string; courier: string; trackingNumber: string | null; total: number }[];
}
export interface CodReturn {
  id: string; number: string; customerName: string; customerCity: string | null; courier: string; trackingNumber: string | null;
  total: number; reason: string | null; returnedAt: string; daysOut: number | null;
}
export interface CodHistory {
  range: { from: string; to: string };
  totals: { settled: number; settledValue: number; returned: number; returnedValue: number };
  settlements: CodSettlement[];
  returns: CodReturn[];
}

export interface CodCourier {
  code: string; name: string;
  inTransit: number; inTransitValue: number;
  withCourier: number; withCourierValue: number;
  settledMonth: number; settledMonthValue: number;
  dispatched30: number; returned30: number; rtoRate: number;
  /** Money with the courier by days since delivery (see `ageLabels`). */
  age?: number[];
}
export interface CodSummary {
  totals: {
    inTransit: number; inTransitValue: number; withCourier: number; withCourierValue: number;
    settledMonth: number; settledMonthValue: number; rtoRate: number; returned30: number; dispatched30: number;
    age?: number[];
  };
  ageLabels?: string[];
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
  /** Selling costs (saved or estimated from the rate card). */
  sellingCosts?: OrderCosts;
  /** True profit; left out for users who may not see cost. */
  profit?: OrderProfit;
  costPosting?: { on: boolean; postedAt: string | null; expenseNumber: string | null };
  /** The shop asks risky customers for an advance: this much (pct of the total). */
  riskAdvice?: { pct: number; amount: number } | null;
}

export interface OrderAlertRow {
  id: string; externalOrderNumber?: string | null; externalOrderId: string; customerName: string; receivedAt: string; orderStatus: OnlineOrderStatus;
}

export interface OnlineOrdersList {
  items: OnlineOrder[];
  total: number;
  counts: Record<string, number>;
  /** Status counts inside from/to; null when no dates were sent. */
  rangeCounts: Record<string, number> | null;
  stats: { todayOrders: number; todayValue: number; codDueCount: number; codDueValue: number };
  alerts: {
    staleMinutes: number;
    stalePending: { count: number; oldest: OrderAlertRow[] };
    cancelRequests: { count: number; latest: OrderAlertRow[] };
  };
}

export interface OrderListQuery {
  status?: string; integrationId?: string; search?: string; payment?: 'COD_DUE'; limit?: number; offset?: number;
  /** Business-day keys; both needed. */
  from?: string; to?: string;
  pay?: 'COD' | 'PAID';
  /** Customer confirmation; NONE = not asked yet. */
  confirm?: 'CONFIRMED' | 'NO_ANSWER' | 'REFUSED' | 'NONE';
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
  deliveryFeeMode?: 'SHOP' | 'RIDER';
  pushPrice?: boolean;
  statusWebhookUrl: string | null;
  requireSignature: boolean;
  shopifySecret: string | null;
  platform: 'custom' | 'woocommerce' | 'shopify' | 'wordpress' | null;
  siteUrl: string | null;
}

export type WebsiteType = 'CUSTOM_WEBSITE' | 'WOOCOMMERCE' | 'SHOPIFY' | 'DARAZ';

export type ShopifyMode = 'app' | 'token' | 'client';
export interface ShopifyCustomBody {
  shop?: string; token?: string; apiSecret?: string; clientId?: string; clientSecret?: string; displayName?: string; shopId?: string;
}
export interface ShopifyCheckItem { key: string; ok: boolean; warn?: boolean; title: string; detail: string; fix?: string }
export interface ShopifyCheckResult { ok: boolean; mode: ShopifyMode | null; checks: ShopifyCheckItem[] }

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
    indolj?: null | { connected: boolean; connectedAt: string | null; baseUrl: string | null };
    branchCodes?: Array<{ code: string; kind?: 'token' | 'code' | 'merchant'; label?: string; firstSeen: string | null; sample: string | null; shopId: string | null }>;
    shopify?: null | {
      connected: boolean; needsReinstall?: boolean; shop: string | null; connectedAt: string | null; locationName: string | null;
      /** 'app' = Nafaa app install; 'token' / 'client' = merchant's own app (manual). */
      mode?: ShopifyMode | null; scopes?: string[]; clientId?: string | null; hasApiSecret?: boolean;
      /** 'shopify' = installed from the App Store, the connection is paid through Shopify App Pricing. */
      billing?: 'direct' | 'shopify'; planActive?: boolean;
    };
    daraz?: null | {
      connected: boolean; configured: boolean; account: string | null; sellerId: string | null; shortCode: string | null;
      connectedAt: string | null; expiresAt: string | null; refreshExpiresAt: string | null; error: string | null; ordersSyncedAt: string | null;
    };
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
    /** Branch chuni ho to poore channel (sab branches) ke kul orders */
    allBranchesOrders?: number | null;
  };
  logs: Array<{ id: string; kind: 'IN' | 'OUT'; label: string; ok: boolean; error?: string | null; at: string }>;
  /** 2+ branches ho to har branch ke orders */
  branches?: Array<{ shopId: string | null; name: string; total: number; pending: number; today: number; isDefault: boolean }> | null;
  health?: { failed24h: number; lastError: { message: string | null; at: string } | null };
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
  kind: 'woocommerce' | 'shopify' | 'indolj' | null;
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

export interface PayGatewayAccount {
  code: string; name: string; color: string; methods: string[]; fees: string; portalUrl: string; sandboxUrl: string | null; steps: string[];
  credentials: { key: string; label: string; placeholder?: string; secret?: boolean; optional?: boolean; help?: string }[];
  connected: boolean; active: boolean; env: 'sandbox' | 'live' | null; connectedAt: string | null; testedAt: string | null; maskedKey: string | null;
}
export interface OrderPaymentLink {
  ref: string; provider: string; amount: number; kind: 'FULL' | 'ADVANCE'; status: 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED';
  createdAt: string; paidAt?: string | null; url?: string;
  /** Hand-recorded advance (provider "MANUAL"): how it came and the transaction / slip number. */
  method?: AdvanceMethod; reference?: string | null;
}


export const COST_KINDS = ['courierCharge', 'codFee', 'gatewayFee', 'packagingCost', 'rtoCost'] as const;
export type CostKind = (typeof COST_KINDS)[number];
export type CostSource = 'API' | 'STATEMENT' | 'MANUAL' | 'POSTED' | 'ESTIMATE' | 'NONE';
export interface CostLine { value: number; source: CostSource }
export type OrderCosts = Record<CostKind, CostLine> & { total: number; estimated: boolean; courierMissing: boolean };
export interface OrderProfit { sale: number; cost: number; deliveryCollected: number; sellingCosts: number; profit: number; margin: number | null }

export interface CourierRate { base: number; baseKg: number; perKg: number; cities: Array<{ city: string; base: number }>; codPct: number; codFixed: number; rtoPct: number }
export interface CostSettings {
  postExpenses: boolean;
  packaging: { default: number; byChannel: Record<string, number> };
  couriers: Record<string, CourierRate>;
  gateways: Record<string, { pct: number; fixed: number }>;
  chosen: boolean;
}
export interface CostSettingsView {
  settings: CostSettings;
  channels: Array<{ id: string; type: string; displayName: string; platform: string | null }>;
  couriers: Array<{ code: string; name: string }>;
}

type Agg = { orders: number; sale: number; cost?: number; deliveryCollected: number; profit?: number; margin?: number | null; estimated: number; sellingCosts: number } & Record<CostKind, number>;
export interface ProfitReport {
  range: { from: string; to: string };
  posting: boolean;
  missingRates: Array<{ code: string; name: string }>;
  totals: Agg;
  byChannel: Array<Agg & { name: string; type: string }>;
  byCourier: Array<Agg & { code: string; name: string }>;
  byCity: Array<Agg & { city: string }>;
  byProduct: Array<Agg & { name: string; qty: number }>;
}

export const STATEMENT_FIELDS = ['cn', 'orderRef', 'amount', 'charge', 'codFee', 'tax', 'net', 'status'] as const;
export type StatementField = (typeof STATEMENT_FIELDS)[number];
export type ColumnMap = Partial<Record<StatementField, number>>;
export interface ReconcileMatch {
  orderId: string; number: string; customerName: string; city: string | null; cn: string | null; by: 'CN' | 'ORDER'; line: number;
  expected: number; received: number; diff: number; ok: boolean; charge: number; codFee: number; net: number | null; status: string | null;
  settled: boolean; returned: boolean; orderStatus: string;
}
export interface ReconcileResult {
  headers: string[]; detected: ColumnMap; mapping: ColumnMap; needs: string[]; rows: number;
  courier?: { code: string; name: string } | null;
  hasCharges?: boolean; hasCodFee?: boolean;
  matched?: ReconcileMatch[];
  unknown?: Array<{ line: number; cn: string | null; orderRef: string | null; amount: number; charge: number; status: string | null }>;
  missing?: Array<{ orderId: string; number: string; cn: string | null; customerName: string; city: string | null; expected: number; deliveredAt: string | null; days: number | null }>;
  totals?: { statement: number; charges: number; matchedExpected: number; matchedReceived: number; missingValue: number; unknownValue: number };
}

export type RuleTrigger = 'OFF' | 'ACCEPT' | 'READY';
export interface CourierRule {
  id: string; cities: string[]; codMin: number | null; codMax: number | null; risks: string[]; channelIds: string[];
  action: 'BOOK' | 'ASK'; courier: string | null;
}
export interface CourierRules { trigger: RuleTrigger; rules: CourierRule[]; fallback: string | null; holdRisky: boolean }
export interface CourierRulesView {
  rules: CourierRules; saved: boolean;
  couriers: Array<{ code: string; name: string; api: boolean; connected: boolean }>;
}
export interface CourierSuggest {
  city: string | null; basis: 'CITY' | 'ALL'; sample: number;
  couriers: Array<{ code: string; name: string; sent: number; delivered: number; returned: number; successRate: number | null; avgCharge: number | null; score: number; best: boolean }>;
}

export interface ScanLine { index: number; name: string; variant: string | null; quantity: number; image: string | null; codes: string[]; matched: boolean }
export interface ScanOrder {
  id: string; number: string; orderStatus: string; paymentStatus: string; customerName: string; customerCity: string | null; total: number;
  courierCode: string | null; courierLabel: string | null; trackingNumber: string | null; courierBooked: boolean; shopId: string | null;
  packed: { at: string; by: string } | null;
  rtoReceived: { at: string; damaged: Array<{ index: number; qty: number }>; failed: string[] } | null;
  lines: ScanLine[];
  canPack: boolean; packProblem: string | null; canReturn: boolean; returnProblem: string | null;
}
export interface RiskSettings { askAdvance: boolean; advancePct: number }


export type PriceRuleMode = 'NONE' | 'PERCENT' | 'FIXED';
export type PriceRounding = 'NONE' | 'NEAREST_10' | 'END_9';
export interface PriceRule { mode: PriceRuleMode; value: number; rounding: PriceRounding }

export type ChannelType = 'WOOCOMMERCE' | 'SHOPIFY' | 'DARAZ' | 'CUSTOM_WEBSITE';
/** How the channel works with products; Indolj and developer-built sites are both CUSTOM_WEBSITE. */
export type ChannelMode = 'woocommerce' | 'shopify' | 'daraz' | 'indolj' | 'website';

export interface OnlineChannel {
  id: string;
  type: ChannelType;
  name: string;
  siteUrl: string | null;
  platform: string | null;
  mode: ChannelMode;
  /** Nafaa sends stock and prices (Woo, Shopify, Daraz). */
  canPush: boolean;
  /** Nafaa can read the channel's product list (not a developer-built site). */
  canFetch: boolean;
  /** The channel keeps stock (Indolj does not). */
  tracksStock: boolean;
  live: boolean;
  paused: boolean;
  shopId: string | null;
  shopName: string | null;
  pushPrice: boolean;
  priceRule: PriceRule;
  stockBuffer: number;
  /** Nafaa sends stock to this channel (off = nothing goes out). */
  pushStock: boolean;
  /** Exact SKU/barcode matches are linked by themselves. */
  autoLink: boolean;
  priceSource: 'WEBSITE' | 'NAFAA';
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  linked?: number;
  failed?: number;
}

export interface LinkedCell {
  linked: true;
  mappingId: string;
  externalTitle: string | null;
  externalSku: string | null;
  /** Price Nafaa sets on the channel (link price, else the rule). */
  price: number;
  override: number | null;
  /** Last price seen on the channel. */
  channelPrice: number | null;
  priceDiffers: boolean;
  /** Stock sent to the channel (after the buffer); null when the channel has no branch. */
  stock: number | null;
  nafaaStock: number;
  /** null where nothing is pushed (custom website, Indolj). */
  status: 'PENDING' | 'SYNCING' | 'SUCCESS' | 'FAILED' | 'SKIPPED' | null;
  error: string | null;
  lastSyncedAt: string | null;
  /** Shown and sold on the channel; false = draft / hidden (older API: absent). */
  listed?: boolean;
  /** Own units for this channel; null = the channel's stock mode. */
  allocQty?: number | null;
  compareAtPrice?: number | null;
}
export interface OpenCell { linked: false; price: number; stock: number | null; nafaaStock: number }
export type GridCell = LinkedCell | OpenCell;

export interface GridRow { variantId: string | null; label: string | null; sku: string | null; price: number; cells: Record<string, GridCell> }
export interface GridItem {
  productId: string; name: string; sku: string | null; image: string | null; hasVariants: boolean; price: number;
  rows: GridRow[];
  /** channelId → link made without a size (to fix) */
  sizeLess: Record<string, string>;
}

export type GridFilter = 'all' | 'linked' | 'unlinked' | 'errors' | 'price' | 'out' | 'unlisted';
export interface GridQuery { page: number; limit?: number; search?: string; filter?: GridFilter; channelId?: string }
export interface GridPage { channels: OnlineChannel[]; items: GridItem[]; total: number; page: number; pages: number; limit: number }
export type GridSummary = Record<GridFilter, number>;

export interface RemoteView {
  externalProductId: string; externalVariantId: string | null; title: string; variantTitle: string | null; hasVariants: boolean;
  sku: string | null; price: number; stock: number | null; image: string | null;
}
export interface SuggestionRow extends RemoteView {
  match: { productId: string; variantId: string | null; kind: 'sku' | 'name' | 'fuzzy'; score: number; name: string; variantName: string | null; sku: string | null; price: number };
}
export interface UnmatchedGroup {
  externalProductId: string; title: string; image: string | null; hasVariants: boolean; anyLinked: boolean; canImport: boolean; variants: RemoteView[];
}
export interface Suggestions {
  canFetch: boolean;
  remoteError: string | null;
  fetchedAt: string | null;
  stats: { products: number; variants: number; linked: number; sure: number; maybe: number; unmatched: number };
  sure: SuggestionRow[];
  maybe: SuggestionRow[];
  unmatched: UnmatchedGroup[];
}

/** One line of the Masle panel, with the fix it offers. */
export interface Issue {
  id: string;
  channelId: string;
  tone: 'danger' | 'warning' | 'info';
  kind: 'reconnect' | 'fix-size-less' | 'errors' | 'link-sure' | 'link';
  text: string;
  detail?: string | null;
  count?: number;
}

