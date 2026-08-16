import Dexie, { type Table } from 'dexie';

export interface OfflineProduct {
  id: string;
  tenantId: string;
  categoryId?: string | null;
  brandId?: string | null;
  name: string;
  slug?: string | null;
  description?: string | null;
  shortDescription?: string | null;
  sku?: string | null;
  barcode?: string | null;
  unit: string;
  price: number;
  costPrice: number;
  wholesalePrice?: number | null;
  taxRate: number;
  stock: number;
  lowStockAlert: number;
  weight?: number | null;
  weightUnit?: string | null;
  dimensions?: string | null;
  hasVariants: boolean;
  expiryTracked: boolean;
  isActive: boolean;
  isFeatured: boolean;
  metaTitle?: string | null;
  metaDescription?: string | null;
  createdAt: string;
  updatedAt: string;
  category?: { id: string; name: string; color: string } | null;
  brand?: { id: string; name: string } | null;
  tags?: any[];
  images?: any[];
  variants?: any[];
  batches?: any[];
  _count?: { saleItems?: number; variants?: number; images?: number; batches?: number };
  _syncedAt: number;
  _localDirty?: boolean;
  _localDeleted?: boolean;
  _tempId?: boolean;
  _updatedAt?: string;
}

export interface OfflineCustomer {
  id: string;
  tenantId: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  cnic?: string | null;
  address?: string | null;
  city?: string | null;
  area?: string | null;
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | null;
  dateOfBirth?: string | null;
  avatarUrl?: string | null;
  notes?: string | null;
  creditLimit: number;
  balance: number;
  loyaltyPoints: number;
  totalSpent: number;
  isActive: boolean;
  isVip: boolean;
  createdAt: string;
  updatedAt: string;
  _syncedAt: number;
  _localDirty?: boolean;
  _localDeleted?: boolean;
  _tempId?: boolean;
}

export interface OfflineExpense {
  id: string;
  expenseNumber?: string;
  title: string;
  description?: string | null;
  amount: number;
  paymentMethod: string;
  status: 'PENDING' | 'PAID' | 'CANCELLED';
  expenseDate: string;
  categoryId?: string | null;
  category?: { id: string; name: string; color: string; icon?: string | null } | null;
  _syncedAt: number;
  _localDirty?: boolean;
  _localDeleted?: boolean;
  _tempId?: boolean;
}

export interface OfflineLookup {
  id: string;
  type: 'category' | 'brand' | 'tag' | 'expenseCategory' | 'shop';
  name: string;
  color?: string;
  icon?: string;
  extra?: any;
  _syncedAt: number;
}

/**
 * ── PendingSale — enriched with SNAPSHOT for offline receipt ──
 * Yani offline sale ka receipt bhi poora dikhe: product names, customer,
 * shop info — sab kuch cache se assemble ho.
 */
export interface PendingSaleItemSnapshot {
  productId: string;
  productName: string;
  sku?: string | null;
  barcode?: string | null;
  unit: string;
  variantId?: string;
  variantName?: string;
  imeiId?: string;
  imeiNumber?: string;
  quantity: number;
  unitPrice: number;      // effective price (after wholesale/override)
  lineTotal: number;
  lineDiscount?: number;
  note?: string;
  internalNote?: string;
}

export interface PendingSaleCustomerSnapshot {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  balance?: number;
}

export interface PendingSaleShopSnapshot {
  id: string;
  name?: string;
  address?: string | null;
  phone?: string | null;
}

export interface PendingSaleTenantSnapshot {
  id?: string;
  name?: string;
  currencySymbol?: string;
  settings?: any;
}

export interface PendingSale {
  id: string;
  saleNumber: string;              // OFFLINE-XXX (before sync)
  shopId: string;
  customerId?: string;
  paymentMethod: 'CASH' | 'JAZZCASH' | 'EASYPAISA' | 'BANK' | 'CREDIT' | 'OTHER' | 'CARD' | 'BANK_TRANSFER';
  paidAmount: number;
  discount: number;
  serviceCharges?: number;
  serviceChargesBreakdown?: any[] | null;

  // Raw items (for API replay)
  items: Array<{
    productId: string;
    variantId?: string;
    imeiId?: string;
    quantity: number;
    priceOverride?: number;
    lineDiscount?: number;
    useWholesale?: boolean;
    note?: string;
    internalNote?: string;
  }>;

  // Enriched snapshot (for offline receipt display)
  itemsSnapshot: PendingSaleItemSnapshot[];
  customerSnapshot?: PendingSaleCustomerSnapshot | null;
  shopSnapshot?: PendingSaleShopSnapshot | null;
  tenantSnapshot?: PendingSaleTenantSnapshot | null;

  subtotal: number;
  total: number;
  changeAmount: number;
  creditAmount: number;
  costOfGoods: number;
  soldAt: string;                  // ISO
  createdAt: number;               // ms epoch
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  syncError?: string;
  retryCount: number;
  lastTriedAt?: number;
  serverSaleId?: string;
  serverSaleNumber?: string;
}

export interface SyncQueueItem {
  id: string;
  type:
    | 'CREATE_CUSTOMER' | 'UPDATE_CUSTOMER' | 'DELETE_CUSTOMER' | 'PAYMENT_CUSTOMER'
    | 'CREATE_PRODUCT' | 'UPDATE_PRODUCT' | 'DELETE_PRODUCT' | 'TOGGLE_PRODUCT_ACTIVE' | 'TOGGLE_PRODUCT_FEATURED'
    | 'CREATE_EXPENSE' | 'DELETE_EXPENSE'
    | 'UPDATE_PRODUCT_STOCK' | 'CREATE_LEDGER' | 'OTHER';
  payload: any;
  endpoint: string;
  method: 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  // Local temp ID mapping (needed when endpoint has /:id and id is temp)
  tempId?: string;
  idField?: 'endpoint' | 'payload';
  createdAt: number;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  syncError?: string;
  retryCount: number;
}

export interface SyncMeta {
  key: string;
  value: any;
  updatedAt: number;
}

class NafaaOfflineDB extends Dexie {
  products!: Table<OfflineProduct, string>;
  customers!: Table<OfflineCustomer, string>;
  expenses!: Table<OfflineExpense, string>;
  lookups!: Table<OfflineLookup, string>;
  pendingSales!: Table<PendingSale, string>;
  syncQueue!: Table<SyncQueueItem, string>;
  meta!: Table<SyncMeta, string>;

  constructor() {
    super('NafaaOfflineDB');

    // v1 — original
    this.version(1).stores({
      products: 'id, name, sku, barcode, categoryId, brandId, isActive, _syncedAt',
      customers: 'id, name, phone, balance, isActive, _syncedAt',
      lookups: 'id, type, name',
      pendingSales: 'id, status, createdAt, customerId, [status+createdAt]',
      syncQueue: 'id, type, status, createdAt, [status+createdAt]',
      meta: 'key',
    });

    // v2 — add expenses + snapshot indexes
    this.version(2).stores({
      products: 'id, name, sku, barcode, categoryId, brandId, isActive, _localDeleted, _syncedAt',
      customers: 'id, name, phone, balance, isActive, _localDeleted, _syncedAt',
      expenses: 'id, expenseDate, categoryId, _localDeleted, _syncedAt',
      lookups: 'id, type, name',
      pendingSales: 'id, status, saleNumber, createdAt, customerId, [status+createdAt]',
      syncQueue: 'id, type, status, tempId, createdAt, [status+createdAt]',
      meta: 'key',
    }).upgrade(async (tx) => {
      // Backfill saleNumber on existing pending sales
      const sales = await tx.table('pendingSales').toArray();
      for (const s of sales) {
        if (!s.saleNumber) {
          s.saleNumber = `OFFLINE-${s.id.slice(-8).toUpperCase()}`;
          await tx.table('pendingSales').put(s);
        }
      }
    });
  }
}

export const db = new NafaaOfflineDB();

export async function getMeta<T>(key: string): Promise<T | null> {
  const entry = await db.meta.get(key);
  return entry ? (entry.value as T) : null;
}

export async function setMeta(key: string, value: any): Promise<void> {
  await db.meta.put({ key, value, updatedAt: Date.now() });
}

export async function clearAllOfflineData(): Promise<void> {
  await Promise.all([
    db.products.clear(),
    db.customers.clear(),
    db.expenses.clear(),
    db.lookups.clear(),
    db.pendingSales.clear(),
    db.syncQueue.clear(),
    db.meta.clear(),
  ]);
}

export async function getStorageStats() {
  const [products, customers, expenses, lookups, pendingSales, queueItems] = await Promise.all([
    db.products.count(),
    db.customers.count(),
    db.expenses.count(),
    db.lookups.count(),
    db.pendingSales.where('status').anyOf('pending', 'failed').count(),
    db.syncQueue.where('status').anyOf('pending', 'failed').count(),
  ]);

  const lastSync = await getMeta<number>('lastFullSync');

  return {
    products, customers, expenses, lookups, pendingSales, queueItems, lastSync,
    hasPendingChanges: pendingSales > 0 || queueItems > 0,
  };
}

/** Generate a local ID with prefix */
export function localId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/** Check if an ID is a local/temp ID (not yet synced) */
export function isTempId(id: string): boolean {
  return id.startsWith('temp_') || id.startsWith('local_');
}
