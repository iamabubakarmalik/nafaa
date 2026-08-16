import { apiClient } from '@core/api/client';
import { db, setMeta, getMeta } from './db';

/* ═══════════════════════════════════════════════════════════
   PREWARM — SAB critical data pehle se cache karo
   ─────────────────────────────────────────────────────────
   Triggers:
   • App boot (8s after)                → prewarmAllData()
   • Login success                     → prewarmAllData(force=true) — HERE'S THE FIX
   • Every sync                        → prewarmAllData()
   • Every 15 min (background)         → prewarmAllData()
   • Every hour (heavy refresh)        → prewarmAllData(force=true)
   ═══════════════════════════════════════════════════════════ */

interface PrewarmResult {
  success: string[];
  failed: string[];
  totalMs: number;
  fromLogin?: boolean;
}

const isNetFail = (e: any): boolean => {
  const s = e?.response?.status;
  return !s || s === 0 || s === 408 || s >= 502;
};

// Wrap API call with error tolerance
async function safeCache(key: string, url: string, params?: any): Promise<void> {
  try {
    const res = await apiClient.get(url, { params });
    const data = res.data?.data ?? res.data;
    await setMeta(key, Array.isArray(data) ? data : (data?.items ? data.items : data));
  } catch (e) {
    if (isNetFail(e)) throw e; // Propagate net errors so we count as failed
    // Business errors (403/404) — just skip silently
  }
}

async function prewarmSales(): Promise<void> {
  await safeCache('cached-sales', '/sales', { limit: 500 });
}

async function prewarmSalesSummary(): Promise<void> {
  await safeCache('cached-sales-summary', '/sales/summary');
}

async function prewarmDashboard(): Promise<void> {
  await Promise.allSettled([
    safeCache('cached-dashboard-overview', '/dashboard/overview'),
    safeCache('cached-dashboard', '/dashboard'),
    safeCache('cached-dashboard-stats', '/dashboard/stats'),
  ]);
}

async function prewarmKhataLedgers(): Promise<void> {
  const customers = await db.customers.toArray();
  const withCredit = customers.filter((c: any) => c.balance > 0).slice(0, 200);
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

async function prewarmCustomerStats(): Promise<void> {
  await safeCache('cached-customer-stats', '/customers/stats');
}

async function prewarmSettings(): Promise<void> {
  await safeCache('tenant-settings-cache', '/settings');
}

async function prewarmProfitReport(): Promise<void> {
  await Promise.allSettled([
    safeCache('cached-profit-report', '/reports/profit'),
    safeCache('cached-profit-today', '/reports/profit/today'),
    safeCache('cached-profit-month', '/reports/profit/month'),
  ]);
}

async function prewarmStockReport(): Promise<void> {
  await Promise.allSettled([
    safeCache('cached-stock-report', '/reports/stock'),
    safeCache('cached-low-stock', '/products/low-stock'),
  ]);
}

async function prewarmSuppliers(): Promise<void> {
  await safeCache('cached-suppliers', '/suppliers');
}

async function prewarmPurchases(): Promise<void> {
  await safeCache('cached-purchases', '/purchases', { limit: 200 });
}

async function prewarmStaff(): Promise<void> {
  await safeCache('cached-staff', '/staff');
}

async function prewarmShops(): Promise<void> {
  await safeCache('cached-shops', '/shops');
}

async function prewarmNotifications(): Promise<void> {
  await safeCache('cached-notifications', '/notifications', { limit: 100 });
}

async function prewarmExpenseSummary(): Promise<void> {
  await safeCache('cached-expense-summary', '/expenses/summary');
}

async function prewarmCategories(): Promise<void> {
  await Promise.allSettled([
    safeCache('cached-categories', '/categories'),
    safeCache('cached-brands', '/brands'),
    safeCache('cached-tags', '/tags'),
    safeCache('cached-expense-categories', '/expense-categories'),
  ]);
}

// Industry-specific caches (best-effort)
async function prewarmIndustryData(): Promise<void> {
  await Promise.allSettled([
    safeCache('cached-carpet-rolls', '/carpet/rolls', { limit: 1000, inStockOnly: true }),
    safeCache('cached-carpet-cut-pieces', '/carpet/cut-pieces', { limit: 500, status: 'AVAILABLE' }),
    safeCache('cached-restaurant-tables', '/restaurant/tables'),
    safeCache('cached-restaurant-modifiers', '/restaurant/modifiers'),
    safeCache('cached-mobile-imei', '/mobile/imei', { limit: 500 }),
    safeCache('cached-gym-members', '/gym/members'),
    safeCache('cached-clinic-appointments', '/clinic/appointments'),
    safeCache('cached-hotel-rooms', '/hotel/rooms'),
    safeCache('cached-salon-services', '/salon/services'),
  ]);
}

const TASKS: Array<{ name: string; fn: () => Promise<void> }> = [
  { name: 'sales',           fn: prewarmSales },
  { name: 'salesSummary',    fn: prewarmSalesSummary },
  { name: 'dashboard',       fn: prewarmDashboard },
  { name: 'settings',        fn: prewarmSettings },
  { name: 'categories',      fn: prewarmCategories },
  { name: 'khataLedgers',    fn: prewarmKhataLedgers },
  { name: 'customerStats',   fn: prewarmCustomerStats },
  { name: 'profitReport',    fn: prewarmProfitReport },
  { name: 'stockReport',     fn: prewarmStockReport },
  { name: 'suppliers',       fn: prewarmSuppliers },
  { name: 'purchases',       fn: prewarmPurchases },
  { name: 'staff',           fn: prewarmStaff },
  { name: 'shops',           fn: prewarmShops },
  { name: 'notifications',   fn: prewarmNotifications },
  { name: 'expenseSummary',  fn: prewarmExpenseSummary },
  { name: 'industryData',    fn: prewarmIndustryData },
];

let inProgress = false;
let lastRunAt = 0;
const MIN_GAP_MS = 60 * 1000; // 1 min throttle (bypassed by force=true)

export async function prewarmAllData(force = false): Promise<PrewarmResult> {
  if (!navigator.onLine) {
    return { success: [], failed: ['offline'], totalMs: 0 };
  }
  if (inProgress) {
    return { success: [], failed: ['in-progress'], totalMs: 0 };
  }
  if (!force && Date.now() - lastRunAt < MIN_GAP_MS) {
    return { success: [], failed: ['throttled'], totalMs: 0 };
  }

  inProgress = true;
  const t0 = Date.now();
  const success: string[] = [];
  const failed: string[] = [];

  try {
    console.log(`[prewarm] Starting${force ? ' (forced)' : ''}...`);

    // Run in parallel batches of 4 for performance
    for (let i = 0; i < TASKS.length; i += 4) {
      const batch = TASKS.slice(i, i + 4);
      const results = await Promise.allSettled(batch.map((t) => t.fn()));
      results.forEach((r, idx) => {
        const task = batch[idx];
        if (r.status === 'fulfilled') {
          success.push(task.name);
        } else {
          if (isNetFail(r.reason)) failed.push(`${task.name}(net)`);
          else failed.push(`${task.name}(${r.reason?.response?.status || 'err'})`);
        }
      });
    }
    lastRunAt = Date.now();
    await setMeta('lastPrewarm', lastRunAt);
    console.log(`[prewarm] ✅ ${success.length}/${TASKS.length} in ${Date.now() - t0}ms`);
  } finally {
    inProgress = false;
  }
  return { success, failed, totalMs: Date.now() - t0 };
}

/**
 * Called after successful login — forces full prewarm regardless of throttle
 */
export async function prewarmAfterLogin(): Promise<PrewarmResult> {
  console.log('[prewarm] Login trigger — forcing full prewarm');
  // Reset throttle so it always runs
  lastRunAt = 0;
  return prewarmAllData(true);
}

/** Get cached data anywhere in the app */
export async function getCached<T>(key: string, fallback?: T): Promise<T | null> {
  const val = await getMeta<T>(key);
  return val ?? (fallback ?? null);
}

/** Reset throttle (used on force refresh) */
export function resetPrewarmThrottle(): void {
  lastRunAt = 0;
}
