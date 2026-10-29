/**
 * Shapes of the distribution booker API (apps/api/src/modules/distribution/API.md §10)
 * and of the rows the booker app keeps offline.
 */

import type { SchemeRule } from '../../../lib/distribution/scheme-resolver';

export type ID = string;
export type MoneyMethod = 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'JAZZCASH' | 'EASYPAISA';
export type VisitOutcome = 'ORDER' | 'NO_ORDER' | 'CLOSED' | 'RECOVERY_ONLY';
export type CreditMode = 'WARN_THEN_PIN' | 'BLOCK' | 'OFF';

export interface DistributionSettings {
  enabled: boolean;
  creditMode: CreditMode;
  requireCheckIn: boolean;
  checkInRadiusM: number;
  orderPrefix: string;
  loadSheetPrefix: string;
  recoveryNeedsVerify: boolean;
  defaultPriceListId: ID | null;
  defaultShopId: ID | null;
  updatedAt: string | null;
}

export interface ManifestRoute {
  id: ID;
  name: string;
  code: string | null;
  area: string | null;
  shopId: ID | null;
  visitDays: number[];
  dueToday: boolean;
  updatedAt: string;
}

export interface ManifestPriceList {
  id: ID;
  name: string;
  code: string | null;
  basedOn: string;
  adjustPct: number;
  isDefault: boolean;
  updatedAt: string;
  itemCount: number;
}

export interface Manifest {
  serverTime: string;
  today: string;
  weekday: number;
  timezone: string;
  me: {
    id: ID;
    fullName: string;
    email: string;
    phone: string | null;
    canOverridePrice: boolean;
    canCollect: boolean;
    canSeeBalance: boolean;
    canSeeCustomers: boolean;
    canSeeProducts: boolean;
  };
  settings: DistributionSettings;
  routes: ManifestRoute[];
  shops: { id: ID; name: string; type: string }[];
  priceLists: ManifestPriceList[];
  schemes: SchemeRule[];
  noOrderReasons: { code: string; label: string }[];
  counts: { customers: number; products: number };
  pageSize: number;
}

export interface Page<T> {
  entity: string;
  serverTime: string;
  items: T[];
  nextCursor: string | null;
}

export interface BootCustomer {
  id: ID;
  name: string;
  businessName: string | null;
  phone: string | null;
  address: string | null;
  area: string | null;
  city: string | null;
  routeId: ID | null;
  routeSeq: number | null;
  priceListId: ID | null;
  priceTier: string | null;
  latitude: number | null;
  longitude: number | null;
  ntn: string | null;
  strn: string | null;
  licenseNo: string | null;
  licenseExpiry: string | null;
  creditDays: number | null;
  creditLimit?: number;
  balance?: number;
  oldestDueAt?: string | null;
  isActive: boolean;
  updatedAt: string;
}

export interface BootPack {
  id: ID;
  variantId: ID | null;
  unitName: string;
  conversionRate: number;
  price: number;
  wholesalePrice: number | null;
  creditPrice: number | null;
  barcode: string | null;
  isDefault: boolean;
}

export interface BootVariant {
  id: ID;
  name: string;
  price: number;
  wholesalePrice: number | null;
  creditPrice: number | null;
}

export interface BootProduct {
  id: ID;
  name: string;
  sku: string | null;
  barcode: string | null;
  unit: string | null;
  price: number;
  wholesalePrice: number | null;
  creditPrice: number | null;
  brandId: ID | null;
  categoryId: ID | null;
  brandName: string | null;
  categoryName: string | null;
  imageUrl: string | null;
  taxRate: number | null;
  isActive: boolean;
  updatedAt: string;
  variants: BootVariant[];
  units: BootPack[];
  stock: { shopId: ID; variantId: ID | null; qty: number }[];
}

export interface BootPriceListItem {
  id: ID;
  productId: ID;
  variantId: ID | null;
  unitId: ID | null;
  price: number;
  minQty: number | null;
}

export type PriceListPage = Page<BootPriceListItem> & { priceListId: ID; listUpdatedAt: string };

/* ───────────── sync payloads (only documented fields) ───────────── */

export interface OrderLinePayload {
  productId: ID;
  variantId?: ID;
  unitId?: ID;
  qty: number;
  price?: number;
  discount?: number;
}

export interface OrderPayload {
  clientRef: string;
  customerId: ID;
  routeId?: ID;
  items: OrderLinePayload[];
  bookedAt?: string;
  latitude?: number;
  longitude?: number;
  gpsAccuracy?: number;
  deliveryDate?: string;
  note?: string;
}

export interface VisitPayload {
  clientRef: string;
  customerId: ID;
  routeId?: ID;
  checkInAt?: string;
  checkOutAt?: string;
  latitude?: number;
  longitude?: number;
  accuracyM?: number;
  outcome: VisitOutcome;
  noOrderReason?: string;
  note?: string;
  salesOrderClientRef?: string;
}

export interface CollectionPayload {
  clientRef: string;
  customerId: ID;
  amount: number;
  method?: MoneyMethod;
  reference?: string;
  note?: string;
  collectedAt?: string;
  latitude?: number;
  longitude?: number;
}

export type SyncStatus = 'ok' | 'duplicate' | 'conflict' | 'error';

export interface SyncResult {
  kind: 'order' | 'visit' | 'collection';
  clientRef: string | null;
  status: SyncStatus;
  id?: ID;
  number?: string;
  reason?: string;
  warnings?: string[];
  total?: number;
  orderStatus?: string;
}

export interface SyncResponse {
  serverTime: string;
  results: SyncResult[];
  counts: Record<SyncStatus, number>;
}

export interface DaySummary {
  date: string;
  routes: { id: ID; name: string }[];
  planned: number;
  visited: number;
  productive: number;
  strikeRate: number;
  orders: { count: number; value: number; lines: number };
  noOrder: { reason: string; label: string; count: number }[];
  collections: { count: number; amount: number; cash: number; pending: number };
  notVisited: { id: ID; name: string; routeId: ID | null }[];
}

/* ───────────── offline rows ───────────── */

/** PENDING waits to be sent; SYNCED is saved on the server; CONFLICT will never be accepted as it is. */
export type QueueStatus = 'PENDING' | 'SYNCED' | 'CONFLICT';

export interface CustomerRow {
  id: ID;
  name: string;
  businessName: string | null;
  phone: string | null;
  address: string | null;
  area: string | null;
  city: string | null;
  routeId: ID | null;
  routeSeq: number | null;
  priceListId: ID | null;
  priceTier: string | null;
  latitude: number | null;
  longitude: number | null;
  balance: number | null;
  creditLimit: number | null;
  creditDays: number | null;
  oldestDueAt: string | null;
}

export interface QueuedOrderRow {
  clientRef: string;
  customerId: ID;
  dayKey: string;
  payload: string;
  localTotal: number;
  lineCount: number;
  status: QueueStatus;
  serverId: string | null;
  number: string | null;
  serverTotal: number | null;
  orderStatus: string | null;
  warnings: string | null;
  reason: string | null;
  attempts: number;
  createdAt: string;
  syncedAt: string | null;
}

export interface QueuedVisitRow {
  clientRef: string;
  customerId: ID;
  dayKey: string;
  outcome: VisitOutcome;
  noOrderReason: string | null;
  orderClientRef: string | null;
  distanceM: number | null;
  payload: string;
  status: QueueStatus;
  serverId: string | null;
  warnings: string | null;
  reason: string | null;
  attempts: number;
  createdAt: string;
}

export interface QueuedCollectionRow {
  clientRef: string;
  customerId: ID;
  dayKey: string;
  amount: number;
  method: MoneyMethod;
  payload: string;
  status: QueueStatus;
  serverId: string | null;
  reason: string | null;
  attempts: number;
  createdAt: string;
}

export interface SyncIssueRow {
  id: number;
  kind: 'order' | 'visit' | 'collection';
  clientRef: string;
  customerId: ID | null;
  title: string;
  reason: string;
  createdAt: string;
}

export interface CheckInRow {
  customerId: ID;
  dayKey: string;
  at: string;
  latitude: number | null;
  longitude: number | null;
  accuracyM: number | null;
  distanceM: number | null;
  far: number;
}
