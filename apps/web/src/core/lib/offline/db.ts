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
}

export interface OfflineLookup {
  id: string;
  type: 'category' | 'brand' | 'tag';
  name: string;
  color?: string;
  _syncedAt: number;
}

export interface PendingSale {
  id: string;
  shopId: string;
  customerId?: string;
  paymentMethod: 'CASH' | 'JAZZCASH' | 'EASYPAISA' | 'BANK' | 'CREDIT' | 'OTHER' | 'CARD' | 'BANK_TRANSFER';
  paidAmount: number;
  discount: number;
  items: Array<{
    productId: string;
    variantId?: string;
    imeiId?: string;
    quantity: number;
    priceOverride?: number;
    lineDiscount?: number;
    useWholesale?: boolean;
    note?: string;
  }>;
  total: number;
  subtotal: number;
  createdAt: number;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  syncError?: string;
  retryCount: number;
  lastTriedAt?: number;
  serverSaleId?: string;
  serverSaleNumber?: string;
}

export interface SyncQueueItem {
  id: string;
  type: 'CREATE_CUSTOMER' | 'UPDATE_CUSTOMER' | 'UPDATE_PRODUCT_STOCK' | 'CREATE_LEDGER' | 'OTHER';
  payload: any;
  endpoint: string;
  method: 'POST' | 'PATCH' | 'PUT' | 'DELETE';
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
  lookups!: Table<OfflineLookup, string>;
  pendingSales!: Table<PendingSale, string>;
  syncQueue!: Table<SyncQueueItem, string>;
  meta!: Table<SyncMeta, string>;

  constructor() {
    super('NafaaOfflineDB');

    this.version(1).stores({
      products: 'id, name, sku, barcode, categoryId, brandId, isActive, _syncedAt',
      customers: 'id, name, phone, balance, isActive, _syncedAt',
      lookups: 'id, type, name',
      pendingSales: 'id, status, createdAt, customerId, [status+createdAt]',
      syncQueue: 'id, type, status, createdAt, [status+createdAt]',
      meta: 'key',
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
    db.lookups.clear(),
    db.pendingSales.clear(),
    db.syncQueue.clear(),
    db.meta.clear(),
  ]);
}

export async function getStorageStats() {
  const [products, customers, lookups, pendingSales, queueItems] = await Promise.all([
    db.products.count(),
    db.customers.count(),
    db.lookups.count(),
    db.pendingSales.where('status').anyOf('pending', 'failed').count(),
    db.syncQueue.where('status').anyOf('pending', 'failed').count(),
  ]);

  const lastSync = await getMeta<number>('lastFullSync');

  return {
    products,
    customers,
    lookups,
    pendingSales,
    queueItems,
    lastSync,
    hasPendingChanges: pendingSales > 0 || queueItems > 0,
  };
}
