/**
 * Shared types for the offline engine. Nothing in engine/ imports React
 * Native, so the same code runs in the app (expo-sqlite, axios) and in the
 * Node test harness (node:sqlite, fetch).
 */

export type SqlValue = string | number | null;

/** Minimal async SQL interface (expo-sqlite in the app, node:sqlite in tests). */
export interface Db {
  exec(sql: string): Promise<void>;
  run(sql: string, params?: SqlValue[]): Promise<void>;
  all<T>(sql: string, params?: SqlValue[]): Promise<T[]>;
  first<T>(sql: string, params?: SqlValue[]): Promise<T | null>;
  /**
   * Runs `fn` in one transaction; rolls back when it throws. Use the handle
   * passed to `fn` inside: other callers wait until the transaction ends, so
   * their writes never land in it by accident.
   */
  tx(fn: (t: Db) => Promise<void>): Promise<void>;
  /** Runs one statement for many rows (prepared once). Call inside tx for speed. */
  many(sql: string, rows: SqlValue[][]): Promise<void>;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface HttpRequest {
  method: HttpMethod;
  path: string;
  body?: unknown;
  params?: Record<string, string | number | undefined>;
  /** Sent as the Idempotency-Key header. */
  idempotencyKey?: string;
  /** Overrides the active branch header for this request. */
  shopId?: string | null;
  timeoutMs?: number;
}

export interface HttpResponse<T = unknown> {
  status: number;
  /** The unwrapped `data` of the `{ success, data }` envelope. */
  data: T;
  replayed: boolean;
}

/**
 * Thrown by transports for every non-2xx answer. `status` 0 means the server
 * was not reached (no internet, timeout, DNS).
 */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export interface Http {
  request<T = unknown>(req: HttpRequest): Promise<HttpResponse<T>>;
}

/** Plain-text translator; the app passes the i18n `t`, tests a passthrough. */
export type Translate = (text: string, params?: Record<string, string | number | null | undefined>) => string;

export interface EngineConfig {
  db: Db;
  http: Http;
  uuid: () => string;
  now?: () => number;
  t?: Translate;
  /** Who is signed in; outbox rows of another business or user wait untouched. */
  session: () => { tenantId: string; userId: string; shopId: string | null; role?: string; permissions?: string[] } | null;
  /** Called after local data changed (screens refresh). */
  onChange?: (what: ChangeKind) => void;
  log?: (msg: string, extra?: unknown) => void;
}

export type ChangeKind = 'products' | 'stock' | 'customers' | 'sales' | 'outbox' | 'issues' | 'meta' | 'status' | 'synced';

/* ───────────── mirrored rows ───────────── */

export type PriceTier = 'RETAIL' | 'WHOLESALE' | 'CREDIT';

export interface VariantRow {
  id: string;
  productId: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  color: string | null;
  size: string | null;
  unit: string | null;
  price: number;
  costPrice: number | null;
  wholesalePrice: number | null;
  creditPrice: number | null;
  lowStockAlert: number | null;
  imageUrl: string | null;
}

export interface PackRow {
  id: string;
  productId: string;
  variantId: string | null;
  unitName: string;
  unitLabel: string | null;
  conversionRate: number;
  isBase: boolean;
  isDefault: boolean;
  price: number;
  costPrice: number | null;
  wholesalePrice: number | null;
  creditPrice: number | null;
  mrpPrice: number | null;
  barcode: string | null;
  sku: string | null;
}

export interface ProductRow {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  unit: string;
  productType: string | null;
  price: number;
  costPrice: number | null;
  wholesalePrice: number | null;
  creditPrice: number | null;
  taxRate: number;
  lowStockAlert: number;
  hasVariants: boolean;
  isRawMaterial: boolean;
  expiryTracked: boolean;
  isActive: boolean;
  isFeatured: boolean;
  categoryId: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  brandId: string | null;
  brandName: string | null;
  imageUrl: string | null;
  updatedAt: string | null;
  /** Made on this phone and not on the server yet. */
  pendingCreate: boolean;
  /** Has edits waiting in the outbox. */
  pendingEdit: boolean;
  /** Stock in the active branch, pending sales already taken off. Null when the branch keeps no stock row. */
  stock: number | null;
}

export interface ProductDetail extends ProductRow {
  variants: Array<VariantRow & { stock: number | null }>;
  packs: PackRow[];
}

export interface BarcodeHit {
  product: ProductDetail;
  variantId: string | null;
  pack: PackRow | null;
  /** What matched: product barcode or SKU, a variant's, or a pack's. */
  via: 'product' | 'variant' | 'pack';
}

export interface CustomerRow {
  id: string;
  name: string;
  businessName: string | null;
  phone: string | null;
  email: string | null;
  cnic: string | null;
  address: string | null;
  city: string | null;
  area: string | null;
  shopId: string | null;
  priceTier: PriceTier | null;
  creditLimit: number | null;
  creditDays: number | null;
  /** Khata balance with pending offline bills and payments applied (positive = customer owes). */
  balance: number | null;
  /** Balance as the server last reported it. */
  serverBalance: number | null;
  loyaltyPoints: number;
  totalSpent: number;
  isVip: boolean;
  isActive: boolean;
  oldestDueAt: string | null;
  pendingCreate: boolean;
  pendingEdit: boolean;
}

export interface SaleLine {
  id?: string;
  productId: string | null;
  variantId: string | null;
  name: string;
  variantName?: string | null;
  unit?: string | null;
  unitName?: string | null;
  unitQty?: number | null;
  quantity: number;
  returnedQty?: number;
  price: number;
  total: number;
}

export interface SaleRow {
  /** Server id, or the local id while the bill waits for sync. */
  id: string;
  saleNumber: string;
  shopId: string | null;
  customerId: string | null;
  customerName: string | null;
  subtotal: number;
  discount: number;
  total: number;
  paidAmount: number;
  changeAmount: number;
  creditAmount: number;
  paymentMethod: string;
  payments: Array<{ method: string; amount: number; reference?: string | null }>;
  status: string;
  soldAt: string;
  items: SaleLine[];
  /** Waiting in the outbox (made offline or not confirmed yet). */
  pending: boolean;
  /** Outbox operation that sends this bill. */
  opId: string | null;
  /** Set when the server's total differed from the phone's. */
  note: string | null;
}

/* ───────────── outbox ───────────── */

export type OpStatus = 'pending' | 'sending' | 'done' | 'issue' | 'cancelled';

export type IssueCode =
  | 'stock'        // not enough stock on the server
  | 'not_found'    // product, customer or bill no longer on the server
  | 'permission'   // the user may not do this
  | 'pin'          // a manager PIN is needed
  | 'limit'        // credit limit, discount limit or a shop rule
  | 'invalid'      // the server refused the data
  | 'duplicate'    // already exists (same phone, same name)
  | 'waiting'      // an earlier change it depends on has an issue
  | 'unknown';

export interface OutboxItem {
  id: string;
  seq: number;
  kind: OpKind;
  method: HttpMethod;
  path: string;
  body: unknown;
  title: string;
  amount: number | null;
  status: OpStatus;
  attempts: number;
  nextAttemptAt: number;
  lastStatus: number | null;
  issue: IssueCode | null;
  /** Server text (already in the user's language when it came through the app client). */
  serverMessage: string | null;
  /** Plain explanation for the Sync issues list. */
  explanation: string | null;
  dependsOn: string[];
  createdAt: number;
  doneAt: number | null;
  /** Temp id this operation creates (customer, product, sale, register). */
  tempId: string | null;
  /** Server answer once done. */
  result: unknown;
  shopId: string | null;
}

export type OpKind =
  | 'sale.create'
  | 'sale.void'
  | 'sale.return'
  | 'customer.create'
  | 'customer.update'
  | 'khata.payment'
  | 'khata.udhaar'
  | 'expense.create'
  | 'income.create'
  | 'stock.adjust'
  | 'stock.damage'
  | 'purchase.create'
  | 'product.create'
  | 'product.update'
  | 'attendance.checkIn'
  | 'attendance.checkOut'
  | 'register.open'
  | 'register.close'
  | 'register.cash';

export interface SyncNote {
  id: number;
  opId: string;
  text: string;
  createdAt: number;
  seen: boolean;
}

export type SyncState = 'online' | 'offline' | 'syncing' | 'issues';

export interface SyncProgress {
  step: 'manifest' | 'products' | 'stock' | 'customers' | 'sales' | 'cleanup' | 'upload' | 'done';
  done: number;
  total: number;
}
