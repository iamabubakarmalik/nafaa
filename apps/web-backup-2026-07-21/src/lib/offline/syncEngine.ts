import { apiClient } from '@/api/client';
import { db, setMeta, getMeta, type PendingSale, type SyncQueueItem } from './db';
import { toast } from 'sonner';

let isSyncing = false;
let uploadInterval: ReturnType<typeof setInterval> | null = null;
let downloadInterval: ReturnType<typeof setInterval> | null = null;
let onlineHandler: (() => void) | null = null;
let offlineHandler: (() => void) | null = null;
let visibilityHandler: (() => void) | null = null;

const listeners = new Set<(status: SyncStatus) => void>();

// ═══ CONFIG ═══
const UPLOAD_INTERVAL_MS   = 45 * 1000;      // upload pending changes every 45s
const DOWNLOAD_INTERVAL_MS = 10 * 60 * 1000; // background download every 10 min
const FIRST_SYNC_DELAY_MS  = 3000;
const MIN_DOWNLOAD_GAP_MS  = 30 * 1000;      // don't re-download within 30 sec
const MAX_RETRIES          = 5;

let lastDownloadAt = 0;

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

export function subscribeSyncStatus(cb: (status: SyncStatus) => void): () => void {
  listeners.add(cb);
  cb({ ...currentStatus });
  return () => { listeners.delete(cb); };
}

async function refreshStatus() {
  const [pendingSales, pendingQueue, lastSync] = await Promise.all([
    db.pendingSales.where('status').anyOf('pending', 'failed').count(),
    db.syncQueue.where('status').anyOf('pending', 'failed').count(),
    getMeta<number>('lastFullSync'),
  ]);

  currentStatus = { ...currentStatus, pendingSales, pendingQueue, lastSync };
  notifyListeners();
}

/**
 * SMART DOWNLOAD — upserts records, doesn't clear cache.
 * Removes only items that no longer exist on server (via ID diff).
 */
export async function downloadAllData(force = false): Promise<{ success: boolean; error?: string }> {
  // Prevent concurrent downloads
  if (currentStatus.isSyncing) {
    return { success: true };
  }
  // Throttle: skip if just downloaded (unless forced)
  if (!force && Date.now() - lastDownloadAt < MIN_DOWNLOAD_GAP_MS) {
    return { success: true };
  }

  try {
    currentStatus.isSyncing = true;
    notifyListeners();

    // ─── PRODUCTS ────────────────────────────────────────
    const productsRes = await apiClient.get('/products', {
      params: { page: 1, limit: 5000, isActive: 'true' },
    });
    const products = productsRes.data?.data?.items || [];
    const now = Date.now();

    if (products.length > 0) {
      const serverIds = new Set<string>(products.map((p: any) => p.id));

      await db.transaction('rw', db.products, async () => {
        // Upsert each product (preserves any local-only fields you might add)
        await db.products.bulkPut(
          products.map((p: any) => ({ ...p, _syncedAt: now })),
        );
        // Delete rows that don't exist on server anymore
        const allLocalIds = await db.products.toCollection().primaryKeys();
        const toDelete = (allLocalIds as string[]).filter((id) => !serverIds.has(id));
        if (toDelete.length > 0) await db.products.bulkDelete(toDelete);
      });
    }

    // ─── CUSTOMERS ────────────────────────────────────────
    const customersRes = await apiClient.get('/customers', {
      params: { page: 1, limit: 5000 },
    });
    const customers = customersRes.data?.data?.items || [];

    if (customers.length > 0) {
      const serverIds = new Set<string>(customers.map((c: any) => c.id));

      await db.transaction('rw', db.customers, async () => {
        await db.customers.bulkPut(
          customers.map((c: any) => ({ ...c, _syncedAt: now })),
        );
        // Only delete non-dirty local customers not on server
        const localCustomers = await db.customers.toArray();
        const toDelete = localCustomers
          .filter((c) => !serverIds.has(c.id) && !c._localDirty && !c.id.startsWith('temp_'))
          .map((c) => c.id);
        if (toDelete.length > 0) await db.customers.bulkDelete(toDelete);
      });
    }

    // ─── LOOKUPS ─────────────────────────────────────────
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
        ...categories.map((c: any) => ({ id: c.id, type: 'category' as const, name: c.name, color: c.color, _syncedAt: now })),
        ...brands.map((b: any) => ({ id: b.id, type: 'brand' as const, name: b.name, _syncedAt: now })),
        ...tags.map((t: any) => ({ id: t.id, type: 'tag' as const, name: t.name, color: t.color, _syncedAt: now })),
      ]);
    });

    // Carpet cache (best-effort, non-blocking)
    import('./offlineCarpet')
      .then(({ downloadCarpetData }) => downloadCarpetData())
      .catch(() => {});

    await setMeta('lastFullSync', now);
    lastDownloadAt = now;
    currentStatus.lastSync = now;
    currentStatus.lastError = null;

    console.log(`[sync] ✅ Downloaded — ${products.length} products, ${customers.length} customers`);
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

/**
 * Upload pending changes — sales + generic queue
 */
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
    if (sale.retryCount >= MAX_RETRIES) continue;

    try {
      await db.pendingSales.update(sale.id, { status: 'syncing', lastTriedAt: Date.now() });

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
    } catch (error: any) {
      failed++;
      const msg = error?.response?.data?.message || error?.message || 'Unknown error';
      await db.pendingSales.update(sale.id, {
        status: 'failed',
        syncError: msg,
        retryCount: sale.retryCount + 1,
      });
    }
  }

  const queueItems = await db.syncQueue
    .where('status')
    .anyOf('pending', 'failed')
    .sortBy('createdAt');

  for (const item of queueItems) {
    if (item.retryCount >= MAX_RETRIES) continue;

    try {
      await db.syncQueue.update(item.id, { status: 'syncing' });
      await apiClient.request({ method: item.method, url: item.endpoint, data: item.payload });
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

/**
 * Full sync — upload then download. Silent by default.
 */
export async function fullSync(silent = false, force = false): Promise<void> {
  if (isSyncing) {
    if (!silent) toast.info('Sync already in progress');
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
    await downloadAllData(force);

    if (!silent && (uploadResult.salesSynced > 0 || uploadResult.queueSynced > 0)) {
      toast.success(
        `Synced: ${uploadResult.salesSynced} sales, ${uploadResult.queueSynced} changes`,
        { duration: 2500 },
      );
    } else if (!silent) {
      toast.success('Sync complete', { duration: 1500 });
    }
  } finally {
    isSyncing = false;
    currentStatus.isSyncing = false;
    await refreshStatus();
  }
}

function setupAutoSync() {
  // Online / offline events
  onlineHandler = () => {
    console.log('[sync] Connection restored');
    toast.info('🌐 Wapis connect ho gaye', { duration: 2000 });
    setTimeout(() => fullSync(true, true), 1000);
  };
  offlineHandler = () => {
    console.log('[sync] Offline');
    toast.warning('📡 Offline — sales queue mein save hongi', { duration: 3000 });
  };
  window.addEventListener('online', onlineHandler);
  window.addEventListener('offline', offlineHandler);

  // Sync when tab becomes visible (user came back)
  visibilityHandler = () => {
    if (document.visibilityState === 'visible' && navigator.onLine && !isSyncing) {
      // Only upload pending — DO NOT re-download
      const gap = Date.now() - (currentStatus.lastSync || 0);
      if (gap > 5 * 60 * 1000) {
        uploadPendingChanges().catch(() => {});
      }
    }
  };
  document.addEventListener('visibilitychange', visibilityHandler);

  // Upload pending every 45s (fast, only if any pending)
  uploadInterval = setInterval(async () => {
    if (!navigator.onLine || isSyncing) return;
    const pendingCount = await db.pendingSales.where('status').anyOf('pending', 'failed').count();
    const queueCount = await db.syncQueue.where('status').anyOf('pending', 'failed').count();
    if (pendingCount + queueCount > 0) {
      uploadPendingChanges().catch(() => {});
    }
  }, UPLOAD_INTERVAL_MS);

  // Background download every 15 min (was 5 min — too aggressive)
  downloadInterval = setInterval(() => {
    if (navigator.onLine && !isSyncing && document.visibilityState === 'visible') {
      downloadAllData(false).catch(() => {});
    }
  }, DOWNLOAD_INTERVAL_MS);
}

let initialized = false;

export function initSyncEngine() {
  if (initialized) {
    console.log('[sync] Already initialized — skipping');
    return;
  }
  initialized = true;

  console.log('[sync] Initializing...');
  setupAutoSync();
  refreshStatus();

  if (navigator.onLine) {
    setTimeout(() => fullSync(true, true), FIRST_SYNC_DELAY_MS);
  }
}

export function stopSyncEngine() {
  if (uploadInterval) clearInterval(uploadInterval);
  if (downloadInterval) clearInterval(downloadInterval);
  if (onlineHandler) window.removeEventListener('online', onlineHandler);
  if (offlineHandler) window.removeEventListener('offline', offlineHandler);
  if (visibilityHandler) document.removeEventListener('visibilitychange', visibilityHandler);
  uploadInterval = null;
  downloadInterval = null;
  onlineHandler = null;
  offlineHandler = null;
  visibilityHandler = null;
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
    setTimeout(() => uploadPendingChanges().catch(() => {}), 500);
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
    setTimeout(() => uploadPendingChanges().catch(() => {}), 500);
  }
}
