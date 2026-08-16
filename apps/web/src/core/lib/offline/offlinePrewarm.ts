import { apiClient } from '@core/api/client';
import { db, setMeta } from './db';

/* ════════════════════════════════════════════════════════════
   PREWARM — SAB critical data pehle se cache karo
   ────────────────────────────────────────────────────────────
   • Login ke baad chalti hai (background)
   • Har 15 min pe refresh
   • User ne page khola ho ya nahi — data cached hoga
   ══════════════════════════════════════════════════════════── */

interface PrewarmResult {
  success: string[];
  failed: string[];
  totalMs: number;
}

const isNetFail = (e: any): boolean => {
  const s = e?.response?.status;
  return !s || s === 0 || s === 408 || s >= 502;
};

async function prewarmSales(): Promise<void> {
  const res = await apiClient.get('/sales', { params: { limit: 200 } });
  const sales = res.data?.data ?? res.data ?? [];
  await setMeta('cached-sales', Array.isArray(sales) ? sales : (sales.items || []));
}

async function prewarmSalesSummary(): Promise<void> {
  const res = await apiClient.get('/sales/summary');
  await setMeta('cached-sales-summary', res.data?.data ?? res.data);
}

async function prewarmDashboard(): Promise<void> {
  try {
    const res = await apiClient.get('/dashboard/overview');
    await setMeta('cached-dashboard-overview', res.data?.data ?? res.data);
  } catch {}
  try {
    const res = await apiClient.get('/dashboard');
    await setMeta('cached-dashboard', res.data?.data ?? res.data);
  } catch {}
}

async function prewarmKhataLedgers(): Promise<void> {
  const customers = await db.customers.toArray();
  const withCredit = customers.filter((c: any) => c.balance > 0).slice(0, 100);
  const ledgers: Record<string, any> = {};

  for (let i = 0; i < withCredit.length; i += 5) {
    const batch = withCredit.slice(i, i + 5);
    await Promise.all(
      batch.map(async (c: any) => {
        try {
          const res = await apiClient.get(`/customers/${c.id}/ledger`);
          ledgers[c.id] = res.data?.data ?? res.data;
        } catch {}
      }),
    );
  }
  await setMeta('cached-khata-ledgers', ledgers);
}

async function prewarmSettings(): Promise<void> {
  const res = await apiClient.get('/settings');
  await setMeta('tenant-settings-cache', res.data?.data ?? res.data);
}

async function prewarmProfitReport(): Promise<void> {
  try {
    const res = await apiClient.get('/reports/profit');
    await setMeta('cached-profit-report', res.data?.data ?? res.data);
  } catch {}
}

async function prewarmStockReport(): Promise<void> {
  try {
    const res = await apiClient.get('/reports/stock');
    await setMeta('cached-stock-report', res.data?.data ?? res.data);
  } catch {}
}

async function prewarmSuppliers(): Promise<void> {
  try {
    const res = await apiClient.get('/suppliers');
    const list = res.data?.data ?? res.data;
    await setMeta('cached-suppliers', Array.isArray(list) ? list : (list?.items || []));
  } catch {}
}

async function prewarmPurchases(): Promise<void> {
  try {
    const res = await apiClient.get('/purchases');
    const list = res.data?.data ?? res.data;
    await setMeta('cached-purchases', Array.isArray(list) ? list : (list?.items || []));
  } catch {}
}

async function prewarmStaff(): Promise<void> {
  try {
    const res = await apiClient.get('/staff');
    const list = res.data?.data ?? res.data;
    await setMeta('cached-staff', Array.isArray(list) ? list : (list?.items || []));
  } catch {}
}

async function prewarmShops(): Promise<void> {
  try {
    const res = await apiClient.get('/shops');
    const list = res.data?.data ?? res.data;
    await setMeta('cached-shops', Array.isArray(list) ? list : (list?.items || []));
  } catch {}
}

async function prewarmNotifications(): Promise<void> {
  try {
    const res = await apiClient.get('/notifications', { params: { limit: 50 } });
    await setMeta('cached-notifications', res.data?.data ?? res.data);
  } catch {}
}

const TASKS: Array<{ name: string; fn: () => Promise<void> }> = [
  { name: 'sales',          fn: prewarmSales },
  { name: 'salesSummary',   fn: prewarmSalesSummary },
  { name: 'dashboard',      fn: prewarmDashboard },
  { name: 'settings',       fn: prewarmSettings },
  { name: 'khataLedgers',   fn: prewarmKhataLedgers },
  { name: 'profitReport',   fn: prewarmProfitReport },
  { name: 'stockReport',    fn: prewarmStockReport },
  { name: 'suppliers',      fn: prewarmSuppliers },
  { name: 'purchases',      fn: prewarmPurchases },
  { name: 'staff',          fn: prewarmStaff },
  { name: 'shops',          fn: prewarmShops },
  { name: 'notifications',  fn: prewarmNotifications },
];

let inProgress = false;
let lastRunAt = 0;
const MIN_GAP_MS = 60 * 1000; // 1 min

export async function prewarmAllData(force = false): Promise<PrewarmResult> {
  if (!navigator.onLine) return { success: [], failed: ['offline'], totalMs: 0 };
  if (inProgress) return { success: [], failed: ['in-progress'], totalMs: 0 };
  if (!force && Date.now() - lastRunAt < MIN_GAP_MS) {
    return { success: [], failed: ['throttled'], totalMs: 0 };
  }

  inProgress = true;
  const t0 = Date.now();
  const success: string[] = [];
  const failed: string[] = [];

  try {
    // Run in parallel batches of 4 for perf
    for (let i = 0; i < TASKS.length; i += 4) {
      const batch = TASKS.slice(i, i + 4);
      const results = await Promise.allSettled(batch.map((t) => t.fn()));
      results.forEach((r, idx) => {
        const task = batch[idx];
        if (r.status === 'fulfilled') success.push(task.name);
        else if (isNetFail(r.reason)) failed.push(`${task.name}(net)`);
        else failed.push(`${task.name}(${r.reason?.response?.status || 'err'})`);
      });
    }
    lastRunAt = Date.now();
    await setMeta('lastPrewarm', lastRunAt);
    console.log(`[prewarm] ✓ ${success.length}/${TASKS.length} in ${Date.now() - t0}ms`);
  } finally {
    inProgress = false;
  }
  return { success, failed, totalMs: Date.now() - t0 };
}

/** Helper to read cached data anywhere */
export async function getCached<T>(key: string, fallback?: T): Promise<T | null> {
  const { getMeta } = await import('./db');
  const val = await getMeta<T>(key);
  return val ?? (fallback ?? null);
}
