import { apiClient } from '@core/api/client';
import { db, setMeta, getMeta, type PendingSale, type SyncQueueItem, isTempId } from './db';
import { toast } from 'sonner';

let isSyncing = false;
let uploadInterval: ReturnType<typeof setInterval> | null = null;
let downloadInterval: ReturnType<typeof setInterval> | null = null;
let onlineHandler: (() => void) | null = null;
let offlineHandler: (() => void) | null = null;
let visibilityHandler: (() => void) | null = null;
let swMessageHandler: ((e: MessageEvent) => void) | null = null;

const listeners = new Set<(status: SyncStatus) => void>();

const UPLOAD_INTERVAL_MS   = 45 * 1000;
const DOWNLOAD_INTERVAL_MS = 10 * 60 * 1000;
const FIRST_SYNC_DELAY_MS  = 3000;
const MIN_DOWNLOAD_GAP_MS  = 30 * 1000;
const MAX_RETRIES          = 5;

let lastDownloadAt = 0;

export interface SyncStatus {
  isSyncing: boolean;
  lastSync: number | null;
  pendingSales: number;
  pendingQueue: number;
  failedTotal: number;
  lastError: string | null;
  progress: { done: number; total: number } | null;
}

let currentStatus: SyncStatus = {
  isSyncing: false, lastSync: null, pendingSales: 0, pendingQueue: 0,
  failedTotal: 0, lastError: null, progress: null,
};

function notifyListeners() { listeners.forEach((cb) => cb({ ...currentStatus })); }

export function subscribeSyncStatus(cb: (status: SyncStatus) => void): () => void {
  listeners.add(cb);
  cb({ ...currentStatus });
  return () => { listeners.delete(cb); };
}

async function refreshStatus() {
  const [pendingSales, pendingQueue, failedSales, failedQueue, lastSync] = await Promise.all([
    db.pendingSales.where('status').anyOf('pending', 'failed').count(),
    db.syncQueue.where('status').anyOf('pending', 'failed').count(),
    db.pendingSales.where('status').equals('failed').count(),
    db.syncQueue.where('status').equals('failed').count(),
    getMeta<number>('lastFullSync'),
  ]);
  currentStatus = {
    ...currentStatus, pendingSales, pendingQueue,
    failedTotal: failedSales + failedQueue, lastSync,
  };
  notifyListeners();
}

async function registerBackgroundSync(): Promise<void> {
  try {
    const reg = await navigator.serviceWorker?.ready;
    await (reg as any)?.sync?.register('nafaa-pending-sync');
  } catch {}
}

const tempIdMap = new Map<string, string>();

function resolveTempIds(input: any): any {
  if (typeof input === 'string') {
    for (const [temp, real] of tempIdMap.entries()) {
      if (input.includes(temp)) return input.split(temp).join(real);
    }
    return input;
  }
  if (Array.isArray(input)) return input.map(resolveTempIds);
  if (input && typeof input === 'object') {
    const out: any = {};
    for (const k of Object.keys(input)) out[k] = resolveTempIds(input[k]);
    return out;
  }
  return input;
}

function isHarmlessError(msg: string): boolean {
  const m = (msg || '').toLowerCase();
  // Ye errors offline sync ke liye harmless hain — success maano
  return (
    m.includes('session.delete') ||
    m.includes('no record was found for a delete') ||
    m.includes('required but not found') ||
    m.includes('already logged out')
  );
}

function isPermanentFailure(msg: string): boolean {
  const m = (msg || '').toLowerCase();
  return m.includes('stock') || m.includes('insufficient') || m.includes('not found') ||
    m.includes('deleted') || m.includes('already exists') || m.includes('duplicate');
}

export async function downloadAllData(force = false): Promise<{ success: boolean; error?: string }> {
  if (currentStatus.isSyncing) return { success: true };
  if (!force && Date.now() - lastDownloadAt < MIN_DOWNLOAD_GAP_MS) return { success: true };

  try {
    currentStatus.isSyncing = true;
    notifyListeners();

    const productsRes = await apiClient.get('/products', { params: { page: 1, limit: 5000, isActive: 'true' } });
    const products = productsRes.data?.data?.items || [];
    const now = Date.now();

    if (products.length > 0) {
      const serverIds = new Set<string>(products.map((p: any) => p.id));
      await db.transaction('rw', db.products, async () => {
        for (const p of products) {
          const existing = await db.products.get(p.id);
          if (existing?._localDirty && !existing?._tempId) continue;
          await db.products.put({ ...p, _syncedAt: now });
        }
        const allLocalIds = await db.products.toCollection().primaryKeys();
        const toDelete = (allLocalIds as string[]).filter((id) => !serverIds.has(id) && !isTempId(id));
        if (toDelete.length > 0) await db.products.bulkDelete(toDelete);
      });
    }

    const customersRes = await apiClient.get('/customers', { params: { page: 1, limit: 5000 } });
    const customers = customersRes.data?.data?.items || [];
    if (customers.length > 0) {
      const serverIds = new Set<string>(customers.map((c: any) => c.id));
      await db.transaction('rw', db.customers, async () => {
        for (const c of customers) {
          const existing = await db.customers.get(c.id);
          if (existing?._localDirty && !existing?._tempId) continue;
          await db.customers.put({ ...c, _syncedAt: now });
        }
        const localCustomers = await db.customers.toArray();
        const toDelete = localCustomers
          .filter((c) => !serverIds.has(c.id) && !c._localDirty && !isTempId(c.id))
          .map((c) => c.id);
        if (toDelete.length > 0) await db.customers.bulkDelete(toDelete);
      });
    }

    const [categoriesRes, brandsRes, tagsRes, expenseCatsRes, shopsRes] = await Promise.all([
      apiClient.get('/categories').catch(() => ({ data: { data: [] } })),
      apiClient.get('/brands').catch(() => ({ data: { data: [] } })),
      apiClient.get('/tags').catch(() => ({ data: { data: [] } })),
      apiClient.get('/expense-categories').catch(() => ({ data: { data: [] } })),
      apiClient.get('/shops').catch(() => ({ data: { data: [] } })),
    ]);

    const categories = categoriesRes.data?.data || [];
    const brands = brandsRes.data?.data || [];
    const tags = tagsRes.data?.data || [];
    const expCats = expenseCatsRes.data?.data || [];
    const shops = shopsRes.data?.data || [];

    await db.transaction('rw', db.lookups, async () => {
      await db.lookups.clear();
      await db.lookups.bulkAdd([
        ...categories.map((c: any) => ({ id: c.id, type: 'category' as const, name: c.name, color: c.color, _syncedAt: now })),
        ...brands.map((b: any) => ({ id: b.id, type: 'brand' as const, name: b.name, _syncedAt: now })),
        ...tags.map((t: any) => ({ id: t.id, type: 'tag' as const, name: t.name, color: t.color, _syncedAt: now })),
        ...expCats.map((c: any) => ({ id: c.id, type: 'expenseCategory' as const, name: c.name, color: c.color, icon: c.icon, _syncedAt: now })),
        ...shops.map((s: any) => ({ id: s.id, type: 'shop' as const, name: s.name, extra: { address: s.address, phone: s.phone }, _syncedAt: now })),
      ]);
    });

    try {
      const settingsRes = await apiClient.get('/settings');
      await setMeta('tenant-settings-cache', settingsRes.data?.data || settingsRes.data);
    } catch {}

    import('./offlineCarpet').then(({ downloadCarpetData }) => downloadCarpetData()).catch(() => {});

    await setMeta('lastFullSync', now);
    lastDownloadAt = now;
    currentStatus.lastSync = now;
    currentStatus.lastError = null;

    console.log(`[sync] ✅ Downloaded — ${products.length} products, ${customers.length} customers`);

    import('./offlinePrewarm').then(({ prewarmAllData }) => prewarmAllData().catch(() => {}));

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

export async function uploadPendingChanges(): Promise<{ salesSynced: number; queueSynced: number; failed: number; }> {
  let salesSynced = 0;
  let queueSynced = 0;
  let failed = 0;

  const queueItems = await db.syncQueue.where('status').anyOf('pending', 'failed').sortBy('createdAt');
  const pendingSalesList = await db.pendingSales.where('status').anyOf('pending', 'failed').sortBy('createdAt');

  const total = queueItems.length + pendingSalesList.length;
  let done = 0;
  if (total > 0) {
    currentStatus.progress = { done: 0, total };
    notifyListeners();
  }
  const tick = () => {
    done++;
    currentStatus.progress = { done, total };
    notifyListeners();
  };

  for (const item of queueItems) {
    if (item.retryCount >= MAX_RETRIES) { tick(); continue; }

    try {
      await db.syncQueue.update(item.id, { status: 'syncing' });

      const endpoint = resolveTempIds(item.endpoint);
      const payload = resolveTempIds(item.payload);

      const res = await apiClient.request({ method: item.method, url: endpoint, data: payload });
      const responseData = res.data?.data ?? res.data;

      if (item.tempId && responseData?.id) {
        const realId = responseData.id;
        tempIdMap.set(item.tempId, realId);

        if (item.type === 'CREATE_PRODUCT') {
          const local = await db.products.get(item.tempId);
          if (local) {
            await db.products.delete(item.tempId);
            await db.products.put({ ...local, ...responseData, _syncedAt: Date.now(), _localDirty: false, _tempId: false } as any);
          }
        } else if (item.type === 'CREATE_CUSTOMER') {
          const local = await db.customers.get(item.tempId);
          if (local) {
            await db.customers.delete(item.tempId);
            await db.customers.put({ ...local, ...responseData, _syncedAt: Date.now(), _localDirty: false, _tempId: false } as any);
          }
        } else if (item.type === 'CREATE_EXPENSE') {
          const local = await db.expenses.get(item.tempId);
          if (local) {
            await db.expenses.delete(item.tempId);
            await db.expenses.put({ ...local, ...responseData, _syncedAt: Date.now(), _localDirty: false, _tempId: false } as any);
          }
        }

        const affectedSales = await db.pendingSales.where('status').anyOf('pending', 'failed').toArray();
        for (const s of affectedSales) {
          let touched = false;
          if (s.customerId === item.tempId) { s.customerId = realId; touched = true; }
          for (const line of s.items) {
            if (line.productId === item.tempId) { line.productId = realId; touched = true; }
          }
          if (touched) await db.pendingSales.put(s);
        }
      } else if (item.type === 'UPDATE_PRODUCT' || item.type === 'UPDATE_CUSTOMER') {
        if (responseData?.id) {
          if (item.type === 'UPDATE_PRODUCT') {
            await db.products.put({ ...responseData, _syncedAt: Date.now(), _localDirty: false } as any);
          } else {
            await db.customers.put({ ...responseData, _syncedAt: Date.now(), _localDirty: false } as any);
          }
        }
      } else if (item.type === 'DELETE_PRODUCT') {
        const m = endpoint.match(/\/products\/([^?/]+)/);
        if (m) await db.products.delete(m[1]);
      } else if (item.type === 'DELETE_CUSTOMER') {
        const m = endpoint.match(/\/customers\/([^?/]+)/);
        if (m) await db.customers.delete(m[1]);
      } else if (item.type === 'DELETE_EXPENSE') {
        const m = endpoint.match(/\/expenses\/([^?/]+)/);
        if (m) await db.expenses.delete(m[1]);
      }

      await db.syncQueue.update(item.id, { status: 'synced' });
      queueSynced++;
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Unknown error';

      // Harmless errors (session delete etc) → success maano, error hide
      if (isHarmlessError(msg)) {
        await db.syncQueue.update(item.id, { status: 'synced', syncError: undefined });
        queueSynced++;
        tick();
        continue;
      }

      failed++;
      const permanent = isPermanentFailure(msg);
      await db.syncQueue.update(item.id, {
        status: 'failed',
        syncError: permanent ? `⚠️ ${msg} — manual review chahiye` : msg,
        retryCount: permanent ? MAX_RETRIES : item.retryCount + 1,
      });
    }
    tick();
  }

  for (const sale of pendingSalesList) {
    if (sale.retryCount >= MAX_RETRIES) { tick(); continue; }

    try {
      await db.pendingSales.update(sale.id, { status: 'syncing', lastTriedAt: Date.now() });

      const hasTemp = sale.items.some((it) => isTempId(it.productId)) ||
        (sale.customerId && isTempId(sale.customerId));
      if (hasTemp) {
        await db.pendingSales.update(sale.id, {
          status: 'failed',
          syncError: 'Waiting — pehle linked product/customer sync hoga',
          retryCount: sale.retryCount + 1,
        });
        failed++;
        tick();
        continue;
      }

      const res = await apiClient.post('/sales', {
        shopId: sale.shopId, customerId: sale.customerId,
        paymentMethod: sale.paymentMethod, paidAmount: sale.paidAmount,
        discount: sale.discount, serviceCharges: sale.serviceChargesBreakdown,
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
      if (isPermanentFailure(msg)) {
        await db.pendingSales.update(sale.id, {
          status: 'failed',
          syncError: `⚠️ STOCK CONFLICT: ${msg} — /sync pe review karein`,
          retryCount: MAX_RETRIES,
        });
        toast.error(`Sale ${sale.saleNumber} sync nahi hui`, {
          description: 'Stock conflict — Sync Center me review karein',
          duration: 8000,
        });
      } else {
        await db.pendingSales.update(sale.id, {
          status: 'failed', syncError: msg, retryCount: sale.retryCount + 1,
        });
      }
    }
    tick();
  }

  tempIdMap.clear();
  currentStatus.progress = null;

  await cleanupSynced();
  await refreshStatus();

  return { salesSynced, queueSynced, failed };
}

async function cleanupSynced() {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  await db.pendingSales.where('status').equals('synced').and((s) => s.createdAt < weekAgo).delete();
  await db.syncQueue.where('status').equals('synced').and((s) => s.createdAt < weekAgo).delete();
}

export async function resetFailedItems(): Promise<number> {
  const s = await db.pendingSales.where('status').equals('failed')
    .modify({ status: 'pending', retryCount: 0, syncError: undefined });
  const q = await db.syncQueue.where('status').equals('failed')
    .modify({ status: 'pending', retryCount: 0, syncError: undefined });
  await refreshStatus();
  return s + q;
}

export async function fullSync(silent = false, force = false): Promise<void> {
  if (isSyncing) { if (!silent) toast.info('Sync already in progress'); return; }
  if (!navigator.onLine) { if (!silent) toast.error('Offline — cannot sync'); return; }

  isSyncing = true;
  currentStatus.isSyncing = true;
  notifyListeners();

  try {
    const uploadResult = await uploadPendingChanges();
    await downloadAllData(force);

    if (!silent && (uploadResult.salesSynced > 0 || uploadResult.queueSynced > 0)) {
      toast.success(`Synced: ${uploadResult.salesSynced} sales, ${uploadResult.queueSynced} changes`, { duration: 2500 });
    } else if (!silent) {
      toast.success('Sync complete', { duration: 1500 });
    }
  } finally {
    isSyncing = false;
    currentStatus.isSyncing = false;
    currentStatus.progress = null;
    await refreshStatus();
  }
}

function setupAutoSync() {
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

  visibilityHandler = () => {
    if (document.visibilityState === 'visible' && navigator.onLine && !isSyncing) {
      const gap = Date.now() - (currentStatus.lastSync || 0);
      if (gap > 5 * 60 * 1000) uploadPendingChanges().catch(() => {});
    }
  };
  document.addEventListener('visibilitychange', visibilityHandler);

  if ('serviceWorker' in navigator) {
    swMessageHandler = (e: MessageEvent) => {
      if ((e.data as any)?.type === 'NAFAA_SYNC_NOW' && navigator.onLine) {
        fullSync(true, true).catch(() => {});
      }
    };
    navigator.serviceWorker.addEventListener('message', swMessageHandler);
  }

  uploadInterval = setInterval(async () => {
    if (!navigator.onLine || isSyncing) return;
    const pendingCount = await db.pendingSales.where('status').anyOf('pending', 'failed').count();
    const queueCount = await db.syncQueue.where('status').anyOf('pending', 'failed').count();
    if (pendingCount + queueCount > 0) uploadPendingChanges().catch(() => {});
  }, UPLOAD_INTERVAL_MS);

  downloadInterval = setInterval(() => {
    if (navigator.onLine && !isSyncing && document.visibilityState === 'visible') {
      downloadAllData(false).catch(() => {});
    }
  }, DOWNLOAD_INTERVAL_MS);
}

let initialized = false;

export function initSyncEngine() {
  if (initialized) return;
  initialized = true;
  console.log('[sync] Initializing...');
  setupAutoSync();
  refreshStatus();
  if (navigator.onLine) setTimeout(() => fullSync(true, true), FIRST_SYNC_DELAY_MS);
}

export function stopSyncEngine() {
  if (uploadInterval) clearInterval(uploadInterval);
  if (downloadInterval) clearInterval(downloadInterval);
  if (onlineHandler) window.removeEventListener('online', onlineHandler);
  if (offlineHandler) window.removeEventListener('offline', offlineHandler);
  if (visibilityHandler) document.removeEventListener('visibilitychange', visibilityHandler);
  if (swMessageHandler && 'serviceWorker' in navigator) {
    navigator.serviceWorker.removeEventListener('message', swMessageHandler);
  }
  uploadInterval = null; downloadInterval = null;
  onlineHandler = null; offlineHandler = null; visibilityHandler = null;
  swMessageHandler = null;
  initialized = false;
}

export async function queuePendingSale(
  sale: Omit<PendingSale, 'status' | 'retryCount' | 'createdAt'>,
): Promise<PendingSale> {
  const fullSale: PendingSale = { ...sale, createdAt: Date.now(), status: 'pending', retryCount: 0 };
  await db.pendingSales.add(fullSale);
  await refreshStatus();
  void registerBackgroundSync();
  if (navigator.onLine) setTimeout(() => uploadPendingChanges().catch(() => {}), 500);
  return fullSale;
}

export async function queueGenericMutation(
  item: Omit<SyncQueueItem, 'id' | 'status' | 'retryCount' | 'createdAt'>,
): Promise<void> {
  const id = `q_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  await db.syncQueue.add({ ...item, id, createdAt: Date.now(), status: 'pending', retryCount: 0 });
  await refreshStatus();
  void registerBackgroundSync();
  if (navigator.onLine) setTimeout(() => uploadPendingChanges().catch(() => {}), 500);
}
