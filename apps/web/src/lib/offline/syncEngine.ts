import { apiClient } from '@/api/client';
import { db, setMeta, getMeta, type PendingSale, type SyncQueueItem } from './db';
import { toast } from 'sonner';

let isSyncing = false;
let syncInterval: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<(status: SyncStatus) => void>();

export interface SyncStatus {
  isSyncing: boolean;
  lastSync: number | null;
  pendingSales: number;
  pendingQueue: number;
  lastError: string | null;
}

let currentStatus: SyncStatus = {
  isSyncing: false,
  lastSync: null,
  pendingSales: 0,
  pendingQueue: 0,
  lastError: null,
};

function notifyListeners() {
  listeners.forEach((cb) => cb({ ...currentStatus }));
}

/**
 * Subscribe to sync status updates.
 * Returns cleanup function that removes the listener.
 */
export function subscribeSyncStatus(cb: (status: SyncStatus) => void): () => void {
  listeners.add(cb);
  cb({ ...currentStatus });
  return () => {
    listeners.delete(cb);
  };
}

async function refreshStatus() {
  const [pendingSales, pendingQueue, lastSync] = await Promise.all([
    db.pendingSales.where('status').anyOf('pending', 'failed').count(),
    db.syncQueue.where('status').anyOf('pending', 'failed').count(),
    getMeta<number>('lastFullSync'),
  ]);

  currentStatus = {
    ...currentStatus,
    pendingSales,
    pendingQueue,
    lastSync,
  };
  notifyListeners();
}

export async function downloadAllData(): Promise<{ success: boolean; error?: string }> {
  try {
    currentStatus.isSyncing = true;
    notifyListeners();

    console.log('[sync] Starting full download...');

    const productsRes = await apiClient.get('/products', {
      params: { page: 1, limit: 5000, isActive: 'true' },
    });
    const products = productsRes.data?.data?.items || [];
    const now = Date.now();

    await db.transaction('rw', db.products, async () => {
      await db.products.clear();
      await db.products.bulkAdd(
        products.map((p: any) => ({
          ...p,
          _syncedAt: now,
        })),
      );
    });
    console.log(`[sync] Products: ${products.length}`);

    const customersRes = await apiClient.get('/customers', {
      params: { page: 1, limit: 5000 },
    });
    const customers = customersRes.data?.data?.items || [];

    await db.transaction('rw', db.customers, async () => {
      await db.customers.clear();
      await db.customers.bulkAdd(
        customers.map((c: any) => ({
          ...c,
          _syncedAt: now,
        })),
      );
    });
    console.log(`[sync] Customers: ${customers.length}`);

    const [categoriesRes, brandsRes, tagsRes] = await Promise.all([
      apiClient.get('/categories').catch(() => ({ data: { data: [] } })),
      apiClient.get('/brands').catch(() => ({ data: { data: [] } })),
      apiClient.get('/tags').catch(() => ({ data: { data: [] } })),
    ]);

    const categories = categoriesRes.data?.data || [];
    const brands = brandsRes.data?.data || [];
    const tags = tagsRes.data?.data || [];

    await db.transaction('rw', db.lookups, async () => {
      await db.lookups.clear();
      await db.lookups.bulkAdd([
        ...categories.map((c: any) => ({
          id: c.id,
          type: 'category' as const,
          name: c.name,
          color: c.color,
          _syncedAt: now,
        })),
        ...brands.map((b: any) => ({
          id: b.id,
          type: 'brand' as const,
          name: b.name,
          _syncedAt: now,
        })),
        ...tags.map((t: any) => ({
          id: t.id,
          type: 'tag' as const,
          name: t.name,
          color: t.color,
          _syncedAt: now,
        })),
      ]);
    });
    console.log(`[sync] Lookups: ${categories.length + brands.length + tags.length}`);

    // Cache carpet data (if applicable)
    try {
      const { downloadCarpetData } = await import('./offlineCarpet');
      await downloadCarpetData();
    } catch (e) {
      console.warn('[sync] Carpet cache failed:', e);
    }

    await setMeta('lastFullSync', now);
    currentStatus.lastSync = now;
    currentStatus.lastError = null;

    console.log('[sync] ✅ Full download complete');
    return { success: true };
  } catch (error: any) {
    const msg = error?.response?.data?.message || error?.message || 'Sync failed';
    console.error('[sync] ❌ Download failed:', msg);
    currentStatus.lastError = msg;
    return { success: false, error: msg };
  } finally {
    currentStatus.isSyncing = false;
    await refreshStatus();
  }
}

export async function uploadPendingChanges(): Promise<{
  salesSynced: number;
  queueSynced: number;
  failed: number;
}> {
  let salesSynced = 0;
  let queueSynced = 0;
  let failed = 0;

  const pendingSales = await db.pendingSales
    .where('status')
    .anyOf('pending', 'failed')
    .sortBy('createdAt');

  for (const sale of pendingSales) {
    if (sale.retryCount >= 5) {
      console.warn(`[sync] Skipping sale ${sale.id} — too many retries`);
      continue;
    }

    try {
      await db.pendingSales.update(sale.id, {
        status: 'syncing',
        lastTriedAt: Date.now(),
      });

      const res = await apiClient.post('/sales', {
        shopId: sale.shopId,
        customerId: sale.customerId,
        paymentMethod: sale.paymentMethod,
        paidAmount: sale.paidAmount,
        discount: sale.discount,
        items: sale.items,
      });

      const serverSale = res.data?.data;

      await db.pendingSales.update(sale.id, {
        status: 'synced',
        serverSaleId: serverSale?.id,
        serverSaleNumber: serverSale?.saleNumber,
      });

      salesSynced++;
      console.log(`[sync] Sale synced: ${serverSale?.saleNumber}`);
    } catch (error: any) {
      failed++;
      const msg = error?.response?.data?.message || error?.message || 'Unknown error';
      await db.pendingSales.update(sale.id, {
        status: 'failed',
        syncError: msg,
        retryCount: sale.retryCount + 1,
      });
      console.error(`[sync] Sale ${sale.id} failed:`, msg);
    }
  }

  const queueItems = await db.syncQueue
    .where('status')
    .anyOf('pending', 'failed')
    .sortBy('createdAt');

  for (const item of queueItems) {
    if (item.retryCount >= 5) continue;

    try {
      await db.syncQueue.update(item.id, { status: 'syncing' });

      await apiClient.request({
        method: item.method,
        url: item.endpoint,
        data: item.payload,
      });

      await db.syncQueue.update(item.id, { status: 'synced' });
      queueSynced++;
    } catch (error: any) {
      failed++;
      const msg = error?.response?.data?.message || error?.message || 'Unknown error';
      await db.syncQueue.update(item.id, {
        status: 'failed',
        syncError: msg,
        retryCount: item.retryCount + 1,
      });
    }
  }

  await cleanupSynced();
  await refreshStatus();

  return { salesSynced, queueSynced, failed };
}

async function cleanupSynced() {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  await db.pendingSales
    .where('status').equals('synced')
    .and((s) => s.createdAt < weekAgo)
    .delete();

  await db.syncQueue
    .where('status').equals('synced')
    .and((s) => s.createdAt < weekAgo)
    .delete();
}

export async function fullSync(silent = false): Promise<void> {
  if (isSyncing) {
    if (!silent) toast.info('Sync already in progress...');
    return;
  }
  if (!navigator.onLine) {
    if (!silent) toast.error('Offline — cannot sync');
    return;
  }

  isSyncing = true;
  currentStatus.isSyncing = true;
  notifyListeners();

  try {
    const uploadResult = await uploadPendingChanges();
    await downloadAllData();

    if (!silent && (uploadResult.salesSynced > 0 || uploadResult.queueSynced > 0)) {
      toast.success(
        `Synced: ${uploadResult.salesSynced} sales, ${uploadResult.queueSynced} changes`,
      );
    }
  } finally {
    isSyncing = false;
    currentStatus.isSyncing = false;
    await refreshStatus();
  }
}

function setupAutoSync() {
  window.addEventListener('online', () => {
    console.log('[sync] Connection restored — syncing...');
    toast.info('🌐 Connection restored — syncing...', { duration: 2000 });
    setTimeout(() => fullSync(true), 1000);
  });

  window.addEventListener('offline', () => {
    console.log('[sync] Gone offline');
    toast.warning('📡 You are offline — sales will sync when connected');
  });

  syncInterval = setInterval(() => {
    if (navigator.onLine && !isSyncing) {
      uploadPendingChanges().catch(() => {});
    }
  }, 30_000);

  setInterval(() => {
    if (navigator.onLine && !isSyncing) {
      downloadAllData().catch(() => {});
    }
  }, 5 * 60 * 1000);
}

let initialized = false;

export function initSyncEngine() {
  if (initialized) return;
  initialized = true;

  console.log('[sync] Initializing...');
  setupAutoSync();
  refreshStatus();

  if (navigator.onLine) {
    setTimeout(() => fullSync(true), 2000);
  }
}

export function stopSyncEngine() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
  initialized = false;
}

export async function queuePendingSale(
  sale: Omit<PendingSale, 'status' | 'retryCount' | 'createdAt'>,
): Promise<PendingSale> {
  const fullSale: PendingSale = {
    ...sale,
    createdAt: Date.now(),
    status: 'pending',
    retryCount: 0,
  };
  await db.pendingSales.add(fullSale);
  await refreshStatus();

  if (navigator.onLine) {
    setTimeout(() => uploadPendingChanges(), 500);
  }

  return fullSale;
}

export async function queueGenericMutation(
  item: Omit<SyncQueueItem, 'id' | 'status' | 'retryCount' | 'createdAt'>,
): Promise<void> {
  const id = `q_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  await db.syncQueue.add({
    ...item,
    id,
    createdAt: Date.now(),
    status: 'pending',
    retryCount: 0,
  });
  await refreshStatus();

  if (navigator.onLine) {
    setTimeout(() => uploadPendingChanges(), 500);
  }
}
