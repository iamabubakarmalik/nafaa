/**
 * Wholesale & distribution API client. One file for the whole module: the
 * settings switch, orders, load sheets and settlement, collections and
 * recoveries, reports and print data, plus the setup screens (price lists,
 * routes, schemes). Shapes follow apps/api/src/modules/distribution/API.md.
 */

import { apiClient } from '@core/api/client';

const unwrap = <T,>(r: any): T => (r?.data?.data !== undefined ? r.data.data : r?.data !== undefined ? r.data : r) as T;

export const DIST_KEY = 'distribution';

export function distError(e: unknown, fallback = 'Kaam nahi hua, dobara koshish karein') {
  const err = e as { response?: { data?: { message?: string | string[] } }; message?: string };
  const m = err?.response?.data?.message;
  return (Array.isArray(m) ? m[0] : m) || err?.message || fallback;
}

/* ───────────────────────── shared types ───────────────────────── */

export type ID = string;
export type DayKey = string;
export type MoneyMethod = 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'JAZZCASH' | 'EASYPAISA';
export type OrderStatus = 'BOOKED' | 'APPROVED' | 'INVOICING' | 'INVOICED' | 'LOADED' | 'DELIVERED' | 'PARTIAL' | 'RETURNED' | 'CANCELLED';
export type LoadSheetStatus = 'OPEN' | 'DISPATCHED' | 'SETTLED' | 'CANCELLED';
export type DeliveryOutcome = 'DELIVERED' | 'PARTIAL' | 'RETURNED';
export type CollectionKind = 'INVOICE_CASH' | 'RECOVERY';
export type CollectionStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';
export type CreditMode = 'WARN_THEN_PIN' | 'BLOCK' | 'OFF';
export type SchemeType = 'FREE_QTY' | 'PERCENT_OFF' | 'AMOUNT_PER_UNIT' | 'SLAB';
export type ListBase = 'PRICE' | 'WHOLESALE' | 'COST';

export interface CustomerCard {
  id: ID; name: string; businessName: string | null; phone: string | null; address: string | null; area: string | null; city: string | null;
  balance: number; creditLimit: number; creditDays: number | null; routeId: ID | null; routeSeq: number | null; priceListId: ID | null;
  latitude: number | null; longitude: number | null; ntn: string | null; strn: string | null; isActive: boolean;
}

export interface ItemResult { id: ID; ok: boolean; status?: string | null; error?: string }

/* ───────────────────────── settings ───────────────────────── */

export interface DistributionSettings {
  enabled: boolean; creditMode: CreditMode; requireCheckIn: boolean; checkInRadiusM: number;
  orderPrefix: string; loadSheetPrefix: string; recoveryNeedsVerify: boolean;
  defaultPriceListId: ID | null; defaultShopId: ID | null; updatedAt: string | null;
}
export interface SettingsResponse {
  settings: DistributionSettings;
  access: { enabled: boolean; planAllows: boolean; planName: string | null };
  meta: {
    orderStatuses: OrderStatus[]; loadSheetStatuses: LoadSheetStatus[]; deliveryOutcomes: DeliveryOutcome[];
    collectionStatuses: CollectionStatus[]; visitOutcomes: string[];
    noOrderReasons: { code: string; label: string }[];
    creditModes: CreditMode[]; schemeTypes: SchemeType[]; listBases: ListBase[];
  };
}

/* ───────────────────────── routes ───────────────────────── */

export interface Route {
  id: ID; name: string; code: string | null; area: string | null; shopId: ID | null; visitDays: number[];
  bookerId: ID | null; deliveryUserId: ID | null; isActive: boolean; sortOrder: number;
  customerCount?: number; bookerName?: string | null; deliveryUserName?: string | null; shopName?: string | null;
  createdAt: string; updatedAt: string;
}

/* ───────────────────────── orders ───────────────────────── */

export interface OrderLine { productId: ID; variantId?: ID | null; unitId?: ID | null; qty: number; price?: number | null; discount?: number | null }
export interface CreateOrder {
  clientRef?: string; customerId: ID; routeId?: ID; shopId?: ID; bookedById?: ID; items: OrderLine[];
  deliveryDate?: DayKey; note?: string;
}
export interface UpdateOrder { items?: OrderLine[]; shopId?: ID; deliveryDate?: DayKey | ''; note?: string }
export interface ListOrders {
  status?: string; routeId?: ID; bookedById?: ID; customerId?: ID; loadSheetId?: ID; shopId?: ID;
  from?: DayKey; to?: DayKey; search?: string; unloaded?: boolean; page?: number; limit?: number;
}

export interface OrderItem {
  id: ID; productId: ID; variantId: ID | null; unitId: ID | null; unitName: string | null; conversionRate: number;
  qty: number; baseQty: number; price: number; schemeDiscount: number; discount: number; total: number;
  schemeId: ID | null; schemeNote: string | null; freeBaseQty: number; freeProductId: ID | null;
  saleItemId: ID | null; freeSaleItemId: ID | null; deliveredBaseQty: number | null; deliveredFreeQty: number | null; sortOrder: number;
  productName: string | null; sku: string | null; baseUnit: string; variantName: string | null; freeProductName: string | null;
}
export interface Order {
  id: ID; orderNumber: string; clientRef: string | null; customerId: ID; routeId: ID | null; shopId: ID | null;
  bookedById: ID; priceListId: ID | null; status: OrderStatus;
  subtotal: number; schemeDiscount: number; discount: number; taxAmount: number; total: number;
  bookedAt: string; latitude: number | null; longitude: number | null; gpsAccuracy: number | null; deliveryDate: string | null; note: string | null;
  creditWarning: string | null; approvedById: ID | null; approvedAt: string | null;
  invoiceError: string | null; cancelReason: string | null; cancelledAt: string | null;
  saleId: ID | null; invoicedAt: string | null; loadSheetId: ID | null;
  deliveryStatus: DeliveryOutcome | null; deliveredAt: string | null; cashCollected: number; returnsValue: number; returnId: ID | null; returnReason: string | null;
  createdAt: string; updatedAt: string;
}
export interface OrderRow extends Order {
  itemCount: number; customer: CustomerCard | null; bookedByName: string | null; routeName: string | null; saleNumber: string | null; loadSheetNumber: string | null;
}
export interface OrderDetail extends Order {
  items: OrderItem[]; customer: CustomerCard | null; bookedByName: string | null; approvedByName: string | null;
  routeName: string | null; shopName: string | null; saleNumber: string | null; loadSheetNumber: string | null;
}
export interface OrderList { total: number; page: number; limit: number; totalValue: number; orders: OrderRow[] }

export interface PricedLine {
  index: number; productId: ID; variantId: ID | null; unitId: ID | null; unitName: string | null; conversionRate: number; qty: number; baseQty: number;
  price: number; priceSource: 'LIST_ITEM' | 'LIST_RULE' | 'TIER' | 'OVERRIDE'; listPrice: number; gross: number; schemeDiscount: number; discount: number; total: number;
  schemeId: ID | null; schemeNote: string | null; freeBaseQty: number; freeProductId: ID | null; retailPrice: number; taxRate: number;
}
export interface OrderPreview {
  lines: PricedLine[]; subtotal: number; schemeDiscount: number; discount: number; total: number; warnings: string[]; priceListId: ID | null;
  credit: { overLimit: boolean; overdue: boolean; dueDays: number | null; message: string | null } | null; customer: CustomerCard;
}
export interface InvoiceRun {
  results: { id: ID; orderNumber: string | null; ok: boolean; status: string | null; saleId?: ID; saleNumber?: string; error?: string; needsPin?: boolean }[];
  invoiced: number; failed: number; needsPin: boolean;
}

/* ───────────────────────── load sheets ───────────────────────── */

export interface LoadSheet {
  id: ID; number: string; date: string; shopId: ID | null; routeId: ID | null; deliveryUserId: ID | null; driverName: string | null; vehicleNo: string | null;
  status: LoadSheetStatus; invoiceCount: number; totalValue: number;
  expectedCash: number; collectedCash: number; recoveryCash: number; handedIn: number | null; returnsValue: number;
  shortAmount: number; note: string | null; dispatchedAt: string | null; settledById: ID | null; settledAt: string | null; createdById: ID; createdAt: string; updatedAt: string;
  deliveryUserName?: string | null; settledByName?: string | null; shopName?: string | null; routeName?: string | null;
}
export interface GoodsRow {
  productId: ID; variantId: ID | null; name: string | null; sku: string | null; variantName: string | null; baseUnit: string; baseQty: number;
  packName: string | null; packSize: number | null; packs: number; loose: number; text: string; value?: number;
}
export type SheetOrder = Order & { itemCount: number; customer: CustomerCard | null; bookedByName: string | null; routeName: string | null; saleNumber: string | null };
export interface LoadSheetDetail extends LoadSheet {
  createdByName: string | null;
  orders: SheetOrder[];
  goods: GoodsRow[];
  freeGoods: GoodsRow[];
  goodsTotals: { lines: number; baseQty: number; packs: number; value: number; freeBaseQty: number };
}
export interface CreateLoadSheet { orderIds: ID[]; date?: DayKey; deliveryUserId?: ID; driverName?: string; vehicleNo?: string; routeId?: ID; note?: string }

export interface SettleItem {
  id: ID; productId: ID; productName: string | null; baseUnit: string; unitName: string | null; conversionRate: number; qty: number; baseQty: number; total: number;
  netPerBase: number; freeBaseQty: number; freeProductId: ID | null; freeProductName: string | null; deliveredBaseQty: number | null; deliveredFreeQty: number | null;
}
export interface SettleOrderRow {
  id: ID; orderNumber: string; saleId: ID | null; saleNumber: string | null; customer: CustomerCard | null; total: number; status: OrderStatus;
  deliveryStatus: DeliveryOutcome | null; cashCollected: number; returnsValue: number; settled: boolean; items: SettleItem[];
  /** What the delivery man sent from his phone for this invoice; the office checks it here. */
  report: DeliveryReport | null;
}
export interface DeliveryReport {
  id: ID; outcome: DeliveryOutcome; lines: { orderItemId: ID; returnBaseQty?: number; returnFreeQty?: number; damaged?: boolean }[];
  cashCollected: number; method: MoneyMethod; returnReason: string | null; note: string | null; reportedAt: string;
  reportedById: ID; reportedByName: string | null; latitude: number | null; longitude: number | null; status: 'PENDING' | 'USED' | 'CHANGED';
}
export interface DeliveryReportSummary {
  invoices: number; reported: number; pending: number; delivered: number; partial: number; returned: number;
  cash: number; otherMoney: number; reportedByName: string | null; lastReportedAt: string;
}
export interface DeliveryStaff { id: ID; fullName: string; role: string; phone: string | null }
export interface SettlementPreview {
  sheet: Omit<LoadSheetDetail, 'orders'>;
  orders: SettleOrderRow[];
  collections: (DistCollection & { collectedByName?: string | null })[];
  deliveryReport: DeliveryReportSummary | null;
  money: { invoiceCollected: number; recoveries: number; recoveriesPending: number; expectedCash: number; handedIn: number | null; short: number | null };
}
export interface SettleBody {
  orders: {
    orderId: ID; outcome: DeliveryOutcome;
    lines?: { orderItemId: ID; returnBaseQty?: number; returnFreeQty?: number; damaged?: boolean }[];
    cashCollected?: number; method?: MoneyMethod; returnReason?: string;
  }[];
  recoveries?: { customerId: ID; amount: number; method?: MoneyMethod; reference?: string }[];
  handedIn?: number; verifyRecoveries?: boolean; managerPin?: string; note?: string;
}
export interface SettleResult {
  results: { orderId: ID; orderNumber: string; ok: boolean; status?: string; returnsValue?: number; error?: string }[];
  recoveries: { customerId: ID; ok: boolean; id?: ID; status?: string; error?: string }[];
  sheet: LoadSheetDetail;
}

/* ───────────────────────── collections ───────────────────────── */

export interface DistCollection {
  id: ID; customerId: ID; loadSheetId: ID | null; saleId: ID | null; salesOrderId: ID | null; kind: CollectionKind; amount: number; method: MoneyMethod;
  reference: string | null; note: string | null; status: CollectionStatus; ledgerId: ID | null; shopId: ID | null;
  collectedById: ID; collectedAt: string; verifiedById: ID | null; verifiedAt: string | null; rejectReason: string | null; clientRef: string | null;
  createdAt: string; updatedAt: string;
}
export type CollectionRow = DistCollection & { customer: CustomerCard | null; collectedByName: string | null; verifiedByName: string | null; saleNumber: string | null };
export interface CollectionList {
  total: number; page: number; limit: number;
  totals: Partial<Record<CollectionStatus, { count: number; amount: number }>>;
  collections: CollectionRow[];
}
export interface CreateCollection { clientRef?: string; customerId: ID; amount: number; method?: MoneyMethod; reference?: string; note?: string; saleId?: ID; loadSheetId?: ID }

export interface Ageing { d0_7: number; d8_15: number; d16_30: number; d31_60: number; d60_plus: number }
export interface RecoveryRow {
  customer: CustomerCard; balance: number; ageing: Ageing; oldestDueAt: string | null; dueDays: number | null; creditDays: number | null; overdue: boolean;
  lastPaymentAt: string | null; lastPaymentAmount: number | null; pendingCollected: number; routeName?: string | null;
}
export interface Recoveries {
  total: number; page: number; limit: number;
  totals: { customers: number; balance: number; pending: number; overdueCustomers: number; overdueBalance: number; ageing: Ageing };
  customers: RecoveryRow[];
}
export interface RecoverySheet {
  kind: 'recovery-sheet'; business: { shopName: string | null; shopPhone: string | null; shopAddress: string | null } | null; date: DayKey;
  route: { id: ID; name: string; code: string | null; area: string | null; bookerName: string | null; deliveryUserName: string | null };
  rows: RecoveryRow[]; totals: { customers: number; balance: number; overdue: number; pending: number };
}

/* ───────────────────────── reports, dashboard, print ───────────────────────── */

export interface Dashboard {
  date: DayKey;
  today: { orders: number; value: number; visits: number; productiveVisits: number };
  waiting: {
    toApprove: { count: number; value: number }; approvedNotInvoiced: { count: number; value: number }; invoiceProblems: number;
    toLoad: { count: number; value: number }; onVans: { count: number; value: number };
    openSheets: Partial<Record<'OPEN' | 'DISPATCHED', { count: number; value: number }>>; collectionsToVerify: { count: number; amount: number };
  };
  receivable: { customers: number; amount: number };
}
export interface DsrRow {
  bookerId: ID; bookerName: string; routes: string[]; planned: number; visited: number; productive: number; strikeRate: number; orders: number; value: number;
  lines: number; linesPerCall: number; dropSize: number; schemeDiscount: number; outOfRangeCheckIns: number;
  noOrder: { reason: string; label: string; count: number }[]; collected: number; collectedPending: number;
  firstActivityHour: number | null; lastActivityHour: number | null;
}
export interface Dsr {
  date: DayKey; weekday: number; bookers: DsrRow[];
  totals: { planned: number; visited: number; productive: number; strikeRate: number; orders: number; value: number; lines: number; collected: number };
}
export interface DistSummary {
  from: DayKey; to: DayKey;
  booked: { orders: number; value: number; cancelled: number };
  invoiced: { invoices: number; value: number; delivered: number; partial: number; returned: number; notSettled: number; returnsValue: number; cashAtDelivery: number; schemeDiscount: number };
  recoveries: { verified: number; verifiedCount: number; pending: number; pendingCount: number };
  byRoute: { routeId: ID | null; routeName: string | null; invoices: number; value: number; returns: number; cash: number }[];
  byBooker: { bookerId: ID; bookerName: string | null; invoices: number; value: number; returns: number; cash: number }[];
  topProducts: { productId: ID; name: string; baseUnit: string; baseQty: number; value: number }[];
  bySchemes: { schemeId: ID; name: string; type: SchemeType; isClaimable: boolean; lines: number; discount: number; freeBaseQty: number; freeCost?: number }[];
}

export interface PrintBusiness {
  name: string | null; legalName: string | null; address: string | null; city: string | null; phone: string | null; email: string | null;
  logoUrl: string | null; footer: string | null; ntn: string | null; strn: string | null;
}
export interface PrintInvoice {
  orderId: ID; orderNumber: string; saleId: ID | null; invoiceNumber: string | null; date: string; bookedAt: string; deliveryDate: string | null; status: string;
  customer: (CustomerCard & { licenseNo: string | null; licenseExpiry: string | null; cnic: string | null }) | null; bookedByName: string | null; routeName: string | null;
  lines: { no: number; productId: ID; name: string; sku: string | null; unitName: string | null; conversionRate: number; qty: number; baseQty: number;
    rate: number; gross: number; schemeDiscount: number; discount: number; net: number; schemeNote: string | null; taxRate: number; taxIncluded: number }[];
  free: { productId: ID; name: string; baseQty: number; text: string; schemeNote: string | null }[];
  totals: { gross: number; schemeDiscount: number; discount: number; total: number; taxIncluded: number; paid: number; returned: number;
    previousBalance: number | null; balanceAfterInvoice: number | null };
  note: string | null;
}
export interface InvoicePrint { kind: 'invoice-a4'; business: PrintBusiness; invoices: PrintInvoice[] }
export interface LoadSheetPrint { kind: 'load-sheet'; business: PrintBusiness; sheet: LoadSheetDetail; invoices?: PrintInvoice[] }

/* ───────────────────────── booker data (office order grid) ───────────────────────── */

export interface BootProduct {
  id: ID; name: string; sku: string | null; barcode: string | null; unit: string; price: number; wholesalePrice: number | null; creditPrice: number | null;
  brandName: string | null; categoryName: string | null; imageUrl: string | null; taxRate: number; isActive: boolean;
  variants: { id: ID; name: string; price: number; wholesalePrice: number | null; creditPrice: number | null }[];
  units: { id: ID; variantId: ID | null; unitName: string; conversionRate: number; price: number | null; wholesalePrice: number | null; creditPrice: number | null; barcode: string | null; isDefault: boolean }[];
  stock: { shopId: ID; variantId: ID | null; qty: number }[];
}
export interface BootCustomer {
  id: ID; name: string; businessName: string | null; phone: string | null; address: string | null; area: string | null; city: string | null;
  routeId: ID | null; routeSeq: number | null; priceListId: ID | null; creditDays: number | null; creditLimit?: number; balance?: number;
  oldestDueAt?: string | null; isActive: boolean;
}
interface Page<T> { items: T[]; nextCursor: string | null }

async function allPages<T>(entity: 'products' | 'customers'): Promise<T[]> {
  const out: T[] = [];
  let cursor: string | null = null;
  for (let i = 0; i < 50; i++) {
    const r: Page<T> = await apiClient.get('/distribution/booker/bootstrap', { params: { entity, all: true, limit: 1000, ...(cursor ? { cursor } : {}) } }).then(unwrap<Page<T>>);
    out.push(...r.items);
    if (!r.nextCursor) break;
    cursor = r.nextCursor;
  }
  return out;
}

/* ───────────────────────── calls ───────────────────────── */

export const distributionApi = {
  settings: () => apiClient.get('/distribution/settings').then(unwrap<SettingsResponse>),
  dashboard: () => apiClient.get('/distribution/dashboard').then(unwrap<Dashboard>),

  routes: (params?: { bookerId?: ID; active?: boolean }) => apiClient.get('/distribution/routes', { params }).then(unwrap<Route[]>),

  orders: (params: ListOrders) => apiClient.get('/distribution/orders', { params }).then(unwrap<OrderList>),
  order: (id: ID) => apiClient.get('/distribution/orders/' + id).then(unwrap<OrderDetail>),
  createOrder: (body: CreateOrder) => apiClient.post('/distribution/orders', body).then(unwrap<{ order: OrderDetail; duplicate: boolean; warnings: string[] }>),
  updateOrder: (id: ID, body: UpdateOrder) => apiClient.patch('/distribution/orders/' + id, body).then(unwrap<{ order: OrderDetail; warnings: string[] }>),
  previewOrder: (body: { customerId: ID; items: OrderLine[] }) => apiClient.post('/distribution/orders/preview', body).then(unwrap<OrderPreview>),
  approve: (ids: ID[], managerPin?: string) =>
    apiClient.post('/distribution/orders/approve', { ids, ...(managerPin ? { managerPin } : {}) }, { timeout: 180_000 }).then(unwrap<InvoiceRun>),
  invoice: (ids: ID[], managerPin?: string) =>
    apiClient.post('/distribution/orders/invoice', { ids, ...(managerPin ? { managerPin } : {}) }, { timeout: 180_000 }).then(unwrap<InvoiceRun>),
  cancel: (ids: ID[], reason?: string) =>
    apiClient.post('/distribution/orders/cancel', { ids, ...(reason ? { reason } : {}) }).then(unwrap<{ results: (ItemResult & { orderNumber: string })[] }>),
  printInvoices: (ids: ID[]) => apiClient.get('/distribution/orders/print', { params: { ids: ids.join(',') } }).then(unwrap<InvoicePrint>),

  loadSheets: (params: { status?: string; from?: DayKey; to?: DayKey; page?: number; limit?: number }) =>
    apiClient.get('/distribution/load-sheets', { params }).then(unwrap<{ total: number; page: number; limit: number; sheets: LoadSheet[] }>),
  loadSheet: (id: ID) => apiClient.get('/distribution/load-sheets/' + id).then(unwrap<LoadSheetDetail>),
  createLoadSheet: (body: CreateLoadSheet) => apiClient.post('/distribution/load-sheets', body).then(unwrap<LoadSheetDetail>),
  updateLoadSheet: (id: ID, body: { deliveryUserId?: ID | null; driverName?: string; vehicleNo?: string; note?: string }) =>
    apiClient.patch('/distribution/load-sheets/' + id, body).then(unwrap<LoadSheetDetail>),
  addToSheet: (id: ID, orderIds: ID[]) => apiClient.post(`/distribution/load-sheets/${id}/orders`, { orderIds }).then(unwrap<LoadSheetDetail>),
  removeFromSheet: (id: ID, orderId: ID) => apiClient.delete(`/distribution/load-sheets/${id}/orders/${orderId}`).then(unwrap<LoadSheetDetail>),
  dispatch: (id: ID) => apiClient.post(`/distribution/load-sheets/${id}/dispatch`).then(unwrap<LoadSheetDetail>),
  cancelSheet: (id: ID) => apiClient.post(`/distribution/load-sheets/${id}/cancel`).then(unwrap<LoadSheetDetail>),
  printLoadSheet: (id: ID, invoices = true) =>
    apiClient.get(`/distribution/load-sheets/${id}/print`, { params: invoices ? {} : { invoices: 0 } }).then(unwrap<LoadSheetPrint>),
  deliveryStaff: () => apiClient.get('/distribution/delivery/staff').then(unwrap<DeliveryStaff[]>),
  settlement: (id: ID) => apiClient.get(`/distribution/load-sheets/${id}/settlement`).then(unwrap<SettlementPreview>),
  settle: (id: ID, body: SettleBody) => apiClient.post(`/distribution/load-sheets/${id}/settle`, body, { timeout: 180_000 }).then(unwrap<SettleResult>),

  collections: (params: { status?: string; kind?: string; customerId?: ID; routeId?: ID; collectedById?: ID; loadSheetId?: ID; from?: DayKey; to?: DayKey; page?: number; limit?: number }) =>
    apiClient.get('/distribution/collections', { params }).then(unwrap<CollectionList>),
  collect: (body: CreateCollection) => apiClient.post('/distribution/collections', body).then(unwrap<{ collection: DistCollection; duplicate: boolean }>),
  verify: (ids: ID[]) => apiClient.post('/distribution/collections/verify', { ids }).then(unwrap<{ results: ItemResult[]; verified: number }>),
  reject: (ids: ID[], reason?: string) =>
    apiClient.post('/distribution/collections/reject', { ids, ...(reason ? { reason } : {}) }).then(unwrap<{ results: ItemResult[]; rejected: number }>),
  recoveries: (params: { routeId?: ID; overdueOnly?: boolean; search?: string; page?: number; limit?: number }) =>
    apiClient.get('/distribution/collections/recoveries', { params }).then(unwrap<Recoveries>),
  recoverySheet: (routeId: ID, date?: DayKey) =>
    apiClient.get('/distribution/collections/recovery-sheet', { params: { routeId, ...(date ? { date } : {}) } }).then(unwrap<RecoverySheet>),

  dsr: (params: { date?: DayKey; bookerId?: ID; routeId?: ID }) => apiClient.get('/distribution/reports/dsr', { params }).then(unwrap<Dsr>),
  summary: (params: { from?: DayKey; to?: DayKey; routeId?: ID; bookerId?: ID }) => apiClient.get('/distribution/reports/summary', { params }).then(unwrap<DistSummary>),

  bootProducts: () => allPages<BootProduct>('products'),
  bootCustomers: () => allPages<BootCustomer>('customers'),
};

/* ───────────────────────── setup: price lists, routes, schemes, presets ───────────────────────── */

export type UpdateSettings = Partial<Omit<DistributionSettings, 'updatedAt'>>;

export interface Preset { key: 'ORDER_BOOKER' | 'DELIVERY' | 'DISTRIBUTION_MANAGER'; label: string; role: 'STAFF' | 'MANAGER'; description: string; permissions: string[] }

export interface SavePriceList { name: string; code?: string; basedOn?: ListBase; adjustPct?: number; isDefault?: boolean; isActive?: boolean; note?: string }
export interface PriceList {
  id: ID; name: string; code: string | null; basedOn: ListBase; adjustPct: number; isDefault: boolean; isActive: boolean; note: string | null;
  createdAt: string; updatedAt: string; itemCount?: number; customerCount?: number;
}
export interface PriceListItemInput { productId: ID; variantId?: ID | null; unitId?: ID | null; price: number; minQty?: number | null }
export interface PriceListItemRow extends PriceListItemInput { id: ID; productName: string | null; variantName: string | null; unitName: string; conversionRate: number }
export interface PriceImportRow { code?: string; name?: string; unitName?: string; price: number; minQty?: number }
export interface PriceImportResult { saved: number; removed: number; matched: number; unmatched: { row: number; reason: string }[] }
export interface PriceGridRow { unitId: ID | null; unitName: string; conversionRate: number; retail: number; wholesale: number | null; cost?: number; listPrice: number | null; rulePrice: number }
export interface PriceGrid {
  total: number; page: number; limit: number; list: PriceList;
  products: { productId: ID; name: string; sku: string | null; baseUnit: string; rows: PriceGridRow[] }[];
}
export interface ResolvedPrice { productId: ID; variantId: ID | null; unitId: ID | null; unitName: string; conversionRate: number; price: number; perBase: number; source: 'LIST_ITEM' | 'LIST_RULE' | 'TIER' }
export interface Resolve { priceListId: ID | null; priceListName: string | null; tier: 'RETAIL' | 'WHOLESALE' | 'CREDIT' | null; items: ResolvedPrice[]; schemes: Scheme[] }

export interface SaveRoute { name: string; code?: string; area?: string; shopId?: ID | null; visitDays?: number[]; bookerId?: ID | null; deliveryUserId?: ID | null; isActive?: boolean; sortOrder?: number }
export type RouteDetail = Route & { customers: CustomerCard[] };
export interface RouteDay {
  date: DayKey; weekday: number;
  routes: { id: ID; name: string; code: string | null; area: string | null; shopId: ID | null; bookerId: ID | null; bookerName: string | null;
    deliveryUserId: ID | null; deliveryUserName: string | null; customers: number; visited: number; orders: number; orderValue: number }[];
}

export interface SchemeSlab { minQty: number; percent?: number; amountPerUnit?: number; freeQty?: number }
export interface SaveScheme {
  name: string; type: SchemeType; supplierId?: ID | null;
  productIds?: ID[]; brandIds?: ID[]; categoryIds?: ID[]; priceListIds?: ID[];
  buyQty?: number; buyUnitName?: string | null; freeQty?: number; freeProductId?: ID | null; value?: number;
  slabs?: SchemeSlab[]; minOrderValue?: number | null; startsAt?: string | null; endsAt?: string | null;
  isClaimable?: boolean; isActive?: boolean; note?: string;
}
export interface Scheme extends Omit<SaveScheme, 'slabs'> {
  id: ID; createdAt: string; updatedAt: string; slabs: SchemeSlab[] | null;
  productIds: ID[]; brandIds: ID[]; categoryIds: ID[]; priceListIds: ID[];
}
export type SchemeRow = Scheme & { live: boolean; productNames: (string | null)[]; freeProductName: string | null; supplierName: string | null };
export interface SchemeResult { schemeId: ID | null; schemeName: string | null; note: string | null; discount: number; freeBaseQty: number; freeProductId: ID | null }
export interface SchemePreviewLine { productId: ID; variantId?: ID | null; baseQty: number; unitPrice: number }

export const distSetupApi = {
  updateSettings: (body: UpdateSettings) => apiClient.put('/distribution/settings', body).then(unwrap<SettingsResponse>),
  presets: () => apiClient.get('/distribution/presets').then(unwrap<{ presets: Preset[]; bookerRequired: string[] }>),

  priceLists: () => apiClient.get('/distribution/price-lists').then(unwrap<PriceList[]>),
  createPriceList: (body: SavePriceList) => apiClient.post('/distribution/price-lists', body).then(unwrap<PriceList>),
  updatePriceList: (id: ID, body: Partial<SavePriceList>) => apiClient.patch('/distribution/price-lists/' + id, body).then(unwrap<PriceList>),
  deletePriceList: (id: ID) => apiClient.delete('/distribution/price-lists/' + id).then(unwrap<{ deleted: boolean; deactivated: boolean; customers: number }>),
  priceGrid: (id: ID, params: { search?: string; categoryId?: ID; brandId?: ID; page?: number; limit?: number }) =>
    apiClient.get(`/distribution/price-lists/${id}/grid`, { params }).then(unwrap<PriceGrid>),
  priceItems: (id: ID, params: { search?: string; page?: number; limit?: number }) =>
    apiClient.get(`/distribution/price-lists/${id}/items`, { params }).then(unwrap<{ total: number; page: number; limit: number; items: PriceListItemRow[] }>),
  savePriceItems: (id: ID, items: PriceListItemInput[]) =>
    apiClient.put(`/distribution/price-lists/${id}/items`, { items }, { timeout: 120_000 }).then(unwrap<{ saved: number; removed: number }>),
  removePriceItems: (id: ID, ids: ID[]) => apiClient.post(`/distribution/price-lists/${id}/items/remove`, { ids }).then(unwrap<{ removed: number }>),
  importPrices: (id: ID, rows: PriceImportRow[]) =>
    apiClient.post(`/distribution/price-lists/${id}/import`, { rows }, { timeout: 180_000 }).then(unwrap<PriceImportResult>),
  resolve: (params: { customerId?: ID; priceListId?: ID; productIds: ID[] }) =>
    apiClient.get('/distribution/price-lists/resolve', { params: { ...params, productIds: params.productIds.join(',') } }).then(unwrap<Resolve>),

  routeDay: (params: { date?: DayKey; bookerId?: ID }) => apiClient.get('/distribution/routes/day', { params }).then(unwrap<RouteDay>),
  route: (id: ID) => apiClient.get('/distribution/routes/' + id).then(unwrap<RouteDetail>),
  createRoute: (body: SaveRoute) => apiClient.post('/distribution/routes', body).then(unwrap<Route>),
  updateRoute: (id: ID, body: Partial<SaveRoute>) => apiClient.patch('/distribution/routes/' + id, body).then(unwrap<Route>),
  deleteRoute: (id: ID) => apiClient.delete('/distribution/routes/' + id).then(unwrap<{ deleted: boolean; deactivated: boolean; customersFreed: number }>),
  setRouteCustomers: (id: ID, customerIds: ID[], replace = false) =>
    apiClient.post(`/distribution/routes/${id}/customers`, { customerIds, replace }).then(unwrap<RouteDetail>),
  removeRouteCustomer: (id: ID, customerId: ID) => apiClient.delete(`/distribution/routes/${id}/customers/${customerId}`).then(unwrap<{ removed: true }>),

  schemes: (status?: 'live' | 'inactive') => apiClient.get('/distribution/schemes', { params: status ? { status } : {} }).then(unwrap<SchemeRow[]>),
  scheme: (id: ID) => apiClient.get('/distribution/schemes/' + id).then(unwrap<Scheme>),
  createScheme: (body: SaveScheme) => apiClient.post('/distribution/schemes', body).then(unwrap<Scheme>),
  updateScheme: (id: ID, body: Partial<SaveScheme>) => apiClient.patch('/distribution/schemes/' + id, body).then(unwrap<Scheme>),
  deleteScheme: (id: ID) => apiClient.delete('/distribution/schemes/' + id).then(unwrap<{ deleted: boolean; deactivated: boolean }>),
  schemePreview: (body: { customerId?: ID; lines: SchemePreviewLine[] }) =>
    apiClient.post('/distribution/schemes/preview', body).then(unwrap<{ priceListId: ID | null; lines: SchemeResult[] }>),

  /** Distribution fields of one customer (price list, route, visit order); online only. */
  patchCustomer: (id: ID, body: CustomerDistFields) => apiClient.patch('/customers/' + id, body).then(unwrap<CustomerCard>),
};

/** Optional customer fields added for distribution; an empty string or null clears one. */
export interface CustomerDistFields {
  priceListId?: ID | null; routeId?: ID | null; routeSeq?: number | null; creditDays?: number | null;
  businessName?: string; strn?: string; licenseNo?: string; licenseExpiry?: DayKey | null;
  latitude?: number | null; longitude?: number | null;
}
