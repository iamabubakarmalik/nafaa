import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, Cloud, CloudOff, RefreshCw, Trash2, AlertTriangle, CheckCircle2,
  Package, Users, Receipt, Layers, Wifi, Download, Upload, RotateCcw,
  HardDrive, XCircle, Search, X, Calendar, GraduationCap, Zap, Info,
  Printer, FileSpreadsheet, ShoppingCart, Tag as TagIcon, Building2,
  Clock, Filter, TrendingUp, Database, DollarSign,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import { toast } from 'sonner';
import { useOfflineStatus } from '@core/hooks/useOfflineStatus';
import { fullSync, uploadPendingChanges, resetFailedItems } from '@core/lib/offline/syncEngine';
import { db, clearAllOfflineData } from '@core/lib/offline/db';
import { forceRefreshProducts } from '@core/lib/offline/offlineProducts';
import { exportBackup, importBackup } from '@core/lib/offline/offlineBackup';
import { getDeviceId } from '@core/lib/offline/offlineDevice';
import { loadFullHistory, getDataSnapshot, type HistoryEvent } from '@core/lib/offline/offlineHistory';
import { Button } from '@core/ui/Button';
import { useAuthStore } from '@core/stores/auth.store';

/* ═════════════════════════════════════════════════════════════
   NAFAA SYNC CENTER — GLOBAL FULL BEST v3
   ─────────────────────────────────────────────────────────────
   🌍 Full history — sales, products, customers, categories, etc
   🌙 Dark mode complete
   🎓 Teacher modal — "offline sync kya hai" universal
   ⌨️  / = search • R = refresh • Esc = teacher band
   📅 Category filters • 🖨️ Print/PDF perfect
   ═════════════════════════════════════════════════════════════ */

const formatDate = (v: number | string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' })
    .format(typeof v === 'number' ? new Date(v) : new Date(v));

const formatDateShort = (v: number | string) =>
  new Intl.DateTimeFormat('en-PK', { month: 'short', day: 'numeric' })
    .format(typeof v === 'number' ? new Date(v) : new Date(v));

const formatPKR = (n: number) => `Rs ${n.toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;

const categoryConfig: Record<string, { label: string; light: string; dark: string; icon: any; color: string; emoji: string }> = {
  sale: {
    label: 'Sales', emoji: '💰',
    light: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    dark: 'dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40',
    icon: ShoppingCart, color: '#10b981',
  },
  product: {
    label: 'Products', emoji: '📦',
    light: 'bg-blue-100 text-blue-700 border-blue-200',
    dark: 'dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/40',
    icon: Package, color: '#3b82f6',
  },
  customer: {
    label: 'Customers', emoji: '👥',
    light: 'bg-violet-100 text-violet-700 border-violet-200',
    dark: 'dark:bg-violet-500/20 dark:text-violet-300 dark:border-violet-500/40',
    icon: Users, color: '#8b5cf6',
  },
  expense: {
    label: 'Expenses', emoji: '💸',
    light: 'bg-orange-100 text-orange-700 border-orange-200',
    dark: 'dark:bg-orange-500/20 dark:text-orange-300 dark:border-orange-500/40',
    icon: Receipt, color: '#f97316',
  },
  lookup: {
    label: 'Categories/Brands', emoji: '🏷️',
    light: 'bg-slate-100 text-slate-700 border-slate-200',
    dark: 'dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600',
    icon: TagIcon, color: '#64748b',
  },
  other: {
    label: 'Other', emoji: '⚙️',
    light: 'bg-slate-100 text-slate-700 border-slate-200',
    dark: 'dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600',
    icon: Database, color: '#94a3b8',
  },
};

const statusConfig: Record<string, { label: string; light: string; dark: string; emoji: string }> = {
  pending: {
    label: 'Pending', emoji: '⏳',
    light: 'bg-amber-100 text-amber-700 border-amber-200',
    dark: 'dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40',
  },
  syncing: {
    label: 'Syncing', emoji: '🔄',
    light: 'bg-blue-100 text-blue-700 border-blue-200',
    dark: 'dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/40',
  },
  synced: {
    label: 'Synced', emoji: '✅',
    light: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    dark: 'dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40',
  },
  failed: {
    label: 'Failed', emoji: '❌',
    light: 'bg-rose-100 text-rose-700 border-rose-200',
    dark: 'dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/40',
  },
};

type DateFilter = 'all' | 'today' | 'yesterday' | 'week' | 'month';
type CategoryFilter = 'all' | 'sale' | 'product' | 'customer' | 'expense' | 'lookup';
type StatusFilter = 'all' | 'pending' | 'syncing' | 'synced' | 'failed';

const DATE_PRESETS: { v: DateFilter; l: string }[] = [
  { v: 'today', l: 'Aaj' },
  { v: 'yesterday', l: 'Kal' },
  { v: 'week', l: '7 Din' },
  { v: 'month', l: '30 Din' },
  { v: 'all', l: 'Sab' },
];

interface Snapshot {
  products: number; customers: number; expenses: number;
  categories: number; brands: number; tags: number; expCats: number; shops: number;
  pendingSales: number; queueItems: number; hasPending: boolean;
}

export default function SyncCenterPage() {
  const tenantName = useAuthStore((s) => s.tenant?.name);
  const shopName = useAuthStore((s) => s.user?.assignedShop?.name);
  const searchRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const status = useOfflineStatus();
  const [history, setHistory] = useState<HistoryEvent[]>([]);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [storage, setStorage] = useState<{ usage: number; quota: number } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [showTeacher, setShowTeacher] = useState(false);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('week');

  const refreshAll = async () => {
    const [h, snap] = await Promise.all([loadFullHistory(), getDataSnapshot()]);
    setHistory(h);
    setSnapshot(snap);
    try {
      const est = await (navigator as any).storage?.estimate?.();
      if (est) setStorage({ usage: est.usage || 0, quota: est.quota || 0 });
    } catch {}
  };

  useEffect(() => {
    refreshAll();
    const interval = setInterval(refreshAll, 3000);
    return () => clearInterval(interval);
  }, []);

  const filtered = useMemo(() => {
    let result = [...history];
    const q = search.toLowerCase().trim();
    if (q) {
      result = result.filter((e) =>
        e.title.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        (e.error || '').toLowerCase().includes(q),
      );
    }
    if (categoryFilter !== 'all') result = result.filter((e) => e.category === categoryFilter);
    if (statusFilter !== 'all') result = result.filter((e) => e.status === statusFilter);
    if (dateFilter !== 'all') {
      const now = new Date();
      let cutoff = new Date();
      let end: Date | null = null;
      if (dateFilter === 'today') {
        cutoff.setHours(0, 0, 0, 0);
      } else if (dateFilter === 'yesterday') {
        cutoff.setDate(now.getDate() - 1);
        cutoff.setHours(0, 0, 0, 0);
        end = new Date(cutoff); end.setHours(23, 59, 59, 999);
      } else if (dateFilter === 'week') {
        cutoff.setDate(now.getDate() - 7);
      } else if (dateFilter === 'month') {
        cutoff.setMonth(now.getMonth() - 1);
      }
      result = result.filter((e) => {
        if (end) return e.createdAt >= cutoff.getTime() && e.createdAt <= end.getTime();
        return e.createdAt >= cutoff.getTime();
      });
    }
    return result;
  }, [history, search, categoryFilter, statusFilter, dateFilter]);

  const stats = useMemo(() => {
    const today = new Date().setHours(0, 0, 0, 0);
    const todayEvents = history.filter((e) => e.createdAt >= today);
    const totalAmount = filtered.reduce((s, e) => s + (e.amount || 0), 0);
    return {
      total: history.length,
      filtered: filtered.length,
      today: todayEvents.length,
      pending: history.filter((e) => e.status === 'pending').length,
      failed: history.filter((e) => e.status === 'failed').length,
      synced: history.filter((e) => e.status === 'synced').length,
      totalAmount,
    };
  }, [history, filtered]);

  // 7-day trend
  const trendData = useMemo(() => {
    const buckets: Record<string, { date: string; label: string; sales: number; other: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const key = d.toISOString().slice(0, 10);
      buckets[key] = { date: key, label: formatDateShort(d.getTime()), sales: 0, other: 0 };
    }
    for (const e of history) {
      const key = new Date(e.createdAt).toISOString().slice(0, 10);
      if (buckets[key]) {
        if (e.category === 'sale') buckets[key].sales += 1;
        else buckets[key].other += 1;
      }
    }
    return Object.values(buckets);
  }, [history]);

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of history) {
      map.set(e.category, (map.get(e.category) || 0) + 1);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([cat, count]) => ({
        name: categoryConfig[cat]?.label || cat,
        value: count,
        color: categoryConfig[cat]?.color || '#64748b',
      }));
  }, [history]);

  const categoryCounts = useMemo(() => {
    const m: Record<string, number> = { all: history.length };
    history.forEach((e) => { m[e.category] = (m[e.category] || 0) + 1; });
    return m;
  }, [history]);

  const statusCounts = useMemo(() => {
    const m: Record<string, number> = { all: history.length };
    history.forEach((e) => { m[e.status] = (m[e.status] || 0) + 1; });
    return m;
  }, [history]);

  const storagePct = storage && storage.quota > 0 ? Math.round((storage.usage / storage.quota) * 100) : 0;

  /* Actions */
  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try { await fn(); } finally { setBusy(null); await refreshAll(); }
  };

  const handleForceSync = () => run('sync', () => fullSync(false, true));
  const handleRefreshProducts = () => run('products', async () => {
    await forceRefreshProducts();
    toast.success('Products refresh ho gaye');
  });
  const handleUploadOnly = () => run('upload', async () => {
    const r = await uploadPendingChanges();
    toast.success(`${r.salesSynced} sales + ${r.queueSynced} changes upload ho gaye`);
  });
  const handleResetFailed = () => run('reset', async () => {
    const n = await resetFailedItems();
    if (n > 0) {
      toast.success(`${n} failed items dobara queue me`);
      await uploadPendingChanges();
    } else toast.info('Koi failed item nahi');
  });
  const handleExportBackup = () => run('backup', async () => {
    await exportBackup();
    toast.success('Backup download ho gaya');
  });
  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm('Backup restore karne se current data merge ho jayega. Continue?')) return;
    await run('restore', async () => {
      const r = await importBackup(file);
      toast.success(`${r.restored} records restore ho gaye`);
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  const handleClearCache = async () => {
    if (snapshot?.hasPending) {
      toast.error('Pehle pending changes sync karo, phir cache clear karo');
      return;
    }
    if (!confirm('Poora offline cache clear kar dein? Pehle backup download karein.')) return;
    await run('clear', async () => {
      await clearAllOfflineData();
      toast.success('Cache clear ho gayi');
      await fullSync(true, true);
    });
  };
  const handleDeleteEvent = async (e: HistoryEvent) => {
    if (!confirm('Ye event delete kar dein?')) return;
    if (e.id.startsWith('sale_')) {
      await db.pendingSales.delete(e.id.replace('sale_', ''));
    } else if (e.id.startsWith('q_')) {
      await db.syncQueue.delete(e.id.replace('q_', ''));
    }
    toast.success('Event hataa diya');
    await refreshAll();
  };

  const exportCSV = () => {
    if (filtered.length === 0) return;
    const summary = [
      [`Sync History — ${tenantName || 'Nafaa'}`],
      [`Shop: ${shopName || 'All'}  •  Generated: ${new Date().toLocaleString('en-PK')}`],
      [`Total: ${filtered.length}  •  Synced: ${stats.synced}  •  Pending: ${stats.pending}  •  Failed: ${stats.failed}`],
      [''],
    ];
    const headers = ['Date', 'Category', 'Title', 'Description', 'Amount', 'Status', 'Error'];
    const rows = filtered.map((e) => [
      new Date(e.createdAt).toLocaleString('en-PK'),
      categoryConfig[e.category]?.label || e.category,
      e.title,
      e.description,
      e.amount ? formatPKR(e.amount) : '',
      statusConfig[e.status]?.label || e.status,
      e.error || '',
    ]);
    const csv = [...summary, headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sync-history-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* Keyboard shortcuts */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showTeacher) return setShowTeacher(false);
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key.toLowerCase() === 'r') { e.preventDefault(); refreshAll(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showTeacher]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = showTeacher ? 'hidden' : prev;
    return () => { document.body.style.overflow = prev; };
  }, [showTeacher]);

  const hasFilters = !!search || categoryFilter !== 'all' || statusFilter !== 'all' || dateFilter !== 'week';
  const clearFilters = () => {
    setSearch(''); setCategoryFilter('all'); setStatusFilter('all'); setDateFilter('week');
  };
  const printDate = new Date().toLocaleString('en-PK', { dateStyle: 'full', timeStyle: 'short' });

  return (
    <div className="space-y-4 sm:space-y-5 pb-10 print:space-y-3">
      {showTeacher && <SyncTeacher onClose={() => setShowTeacher(false)} />}

      {/* PRINT HEADER */}
      <div className="hidden print:block">
        <div className="border-b-4 border-blue-600 pb-3 mb-4">
          <h1 className="text-2xl font-black text-slate-900 leading-tight">
            ☁️ {tenantName || 'My Store'} — Sync History
          </h1>
          <p className="text-xs text-slate-600 font-semibold mt-1">
            {shopName ? `Shop: ${shopName}  •  ` : ''}Device: {getDeviceId()}  •  {filtered.length} events
          </p>
          <p className="text-xs text-slate-500 mt-0.5">Generated: {printDate}</p>
        </div>
      </div>

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-950 via-blue-900 to-cyan-700 dark:from-slate-950 dark:via-blue-950 dark:to-cyan-900 text-white p-4 sm:p-6 shadow-2xl print:hidden">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-blue-400/25 blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl pointer-events-none" />

        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-3 py-1 text-[11px] font-extrabold border border-white/25 uppercase tracking-widest shadow-lg">
              {status.isOnline ? (
                <><Wifi className="h-3.5 w-3.5 text-emerald-300" /> Online</>
              ) : (
                <><CloudOff className="h-3.5 w-3.5 text-amber-300" /> Offline</>
              )}
              <span className="opacity-40">•</span>
              <span className="text-cyan-200 font-mono">📱 {getDeviceId()}</span>
              {shopName && (
                <>
                  <span className="opacity-40">•</span>
                  <span className="text-cyan-200">🏪 {shopName}</span>
                </>
              )}
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-tight">☁️ Sync Center</h1>
            <p className="mt-1.5 text-xs sm:text-sm text-white/90 font-semibold">
              <strong className="text-cyan-200">{stats.total}</strong> total events
              <span className="opacity-50 mx-1.5">•</span>
              <strong className="text-emerald-300">{stats.synced}</strong> synced
              <span className="opacity-50 mx-1.5">•</span>
              <strong className="text-amber-300">{stats.pending}</strong> pending
              {stats.failed > 0 && (
                <>
                  <span className="opacity-50 mx-1.5">•</span>
                  <strong className="text-rose-300">{stats.failed}</strong> failed
                </>
              )}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap items-center shrink-0">
            <button
              onClick={() => setShowTeacher(true)}
              className="h-11 px-3 rounded-xl bg-amber-400/90 hover:bg-amber-400 text-slate-900 text-xs font-extrabold inline-flex items-center gap-1.5 shadow-lg transition"
              title="Kaise kaam karta hai?"
            >
              <GraduationCap className="h-4 w-4" /> <span className="hidden sm:inline">Guide</span>
            </button>
            <button
              onClick={handleForceSync}
              disabled={busy !== null || !status.isOnline}
              className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur-md disabled:opacity-50 transition"
            >
              <RefreshCw className={`h-4 w-4 ${busy === 'sync' || status.isSyncing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Full Sync</span>
            </button>
            <button
              onClick={() => window.print()}
              className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur-md transition"
            >
              <Printer className="h-4 w-4" /> <span className="hidden sm:inline">Print</span>
            </button>
            <button
              onClick={exportCSV}
              disabled={filtered.length === 0}
              className="h-11 px-3 rounded-xl bg-white text-slate-900 hover:bg-slate-100 text-xs font-extrabold inline-flex items-center gap-1.5 shadow-2xl transition disabled:opacity-50"
            >
              <FileSpreadsheet className="h-4 w-4" /> <span className="hidden sm:inline">CSV</span>
            </button>
          </div>
        </div>

        {/* Sync progress bar */}
        {status.progress && status.progress.total > 0 && (
          <div className="relative mt-4 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 p-3">
            <div className="flex justify-between text-[11px] font-extrabold text-white mb-1.5">
              <span className="inline-flex items-center gap-1.5">
                <RefreshCw className="h-3 w-3 animate-spin" /> Syncing…
              </span>
              <span>{status.progress.done} / {status.progress.total}</span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-all duration-300"
                style={{ width: `${Math.round((status.progress.done / status.progress.total) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Last sync + storage */}
        {(status.lastSync || storage) && (
          <div className="relative mt-3 flex flex-wrap gap-2 items-center text-[11px] font-bold">
            {status.lastSync && (
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/20 px-2.5 py-1 backdrop-blur-md">
                <Clock className="h-3 w-3 text-cyan-300" />
                Last sync: {formatDate(status.lastSync)}
              </div>
            )}
            {storage && (
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/20 px-2.5 py-1 backdrop-blur-md">
                <HardDrive className="h-3 w-3 text-cyan-300" />
                {(storage.usage / 1024 / 1024).toFixed(1)} MB / {(storage.quota / 1024 / 1024 / 1024).toFixed(1)} GB ({storagePct}%)
              </div>
            )}
          </div>
        )}

        {/* Keyboard hints */}
        <div className="relative mt-3 hidden sm:flex flex-wrap gap-1.5 text-[10px] font-bold items-center">
          <Kbd>/</Kbd><span className="text-white/60">Search</span>
          <span className="text-white/30 mx-1">•</span>
          <Kbd>R</Kbd><span className="text-white/60">Refresh</span>
        </div>
      </section>

      {/* ═══ FAILED ALERT ═══ */}
      {stats.failed > 0 && (
        <section className="rounded-2xl p-5 border-2 border-rose-300 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-500/10 flex items-start gap-3 print:hidden">
          <div className="h-10 w-10 rounded-2xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-lg">
            <XCircle className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-extrabold text-rose-900 dark:text-rose-100">{stats.failed} items sync fail ho gaye</h3>
            <p className="text-sm text-rose-700 dark:text-rose-300 mt-1 font-semibold">
              Stock conflict, deleted record, ya network issue. Retry karo ya table me dekh ke delete karo.
            </p>
          </div>
          <button
            onClick={handleResetFailed}
            disabled={busy !== null || !status.isOnline}
            className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-sm font-extrabold transition shrink-0 shadow-lg"
          >
            <RotateCcw className={`w-4 h-4 ${busy === 'reset' ? 'animate-spin' : ''}`} />
            Retry All
          </button>
        </section>
      )}

      {/* ═══ PENDING ALERT (no failed) ═══ */}
      {snapshot && (snapshot.pendingSales > 0 || snapshot.queueItems > 0) && stats.failed === 0 && (
        <section className="rounded-2xl p-5 border-2 border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 flex items-start gap-3 print:hidden">
          <div className="h-10 w-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-lg">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-extrabold text-amber-900 dark:text-amber-100">
              {snapshot.pendingSales + snapshot.queueItems} pending changes
            </h3>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1 font-semibold">
              {snapshot.pendingSales > 0 && `${snapshot.pendingSales} sales`}
              {snapshot.pendingSales > 0 && snapshot.queueItems > 0 && ' + '}
              {snapshot.queueItems > 0 && `${snapshot.queueItems} other changes`}
              {' — internet aane par khud sync hongi'}
            </p>
          </div>
          <button
            onClick={handleUploadOnly}
            disabled={busy !== null || !status.isOnline}
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-sm font-extrabold transition shrink-0 shadow-lg"
          >
            <RefreshCw className={`w-4 h-4 ${busy === 'upload' ? 'animate-spin' : ''}`} />
            Upload Now
          </button>
        </section>
      )}

      {/* ═══ KPIs ═══ */}
      <section className="grid grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-3">
        <Kpi icon={Calendar} tone="blue" label="Aaj" value={stats.today} sub="Events today" />
        <Kpi icon={CheckCircle2} tone="emerald" label="Synced" value={stats.synced} sub="Server pe uploaded" />
        <Kpi
          icon={Clock} tone="amber"
          label="Pending" value={stats.pending}
          sub={stats.pending > 0 ? '⏳ Sync ka intezaar' : 'Sab up-to-date'}
        />
        <Kpi
          icon={XCircle} tone="rose"
          label="Failed" value={stats.failed}
          sub={stats.failed > 0 ? '⚠️ Manual review chahiye' : 'Koi failure nahi'}
          isNegative={stats.failed > 0}
        />
      </section>

      {/* ═══ DATA SNAPSHOT ═══ */}
      {snapshot && (
        <section className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm p-5 print:hidden">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Database className="h-4 w-4 text-blue-600" />
                Offline Data Snapshot
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                Ye sab kuch aap ke device pe cached hai — offline chalega
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            <SnapCard icon={Package} label="Products" value={snapshot.products} color="blue" />
            <SnapCard icon={Users} label="Customers" value={snapshot.customers} color="violet" />
            <SnapCard icon={Receipt} label="Expenses" value={snapshot.expenses} color="orange" />
            <SnapCard icon={TagIcon} label="Categories" value={snapshot.categories} color="emerald" />
            <SnapCard icon={Building2} label="Brands" value={snapshot.brands} color="cyan" />
            <SnapCard icon={Layers} label="Tags" value={snapshot.tags} color="pink" />
            <SnapCard icon={DollarSign} label="Exp. Cats" value={snapshot.expCats} color="amber" />
            <SnapCard icon={Building2} label="Shops" value={snapshot.shops} color="slate" />
          </div>
        </section>
      )}

      {/* ═══ CHARTS ═══ */}
      {history.length > 0 && (
        <section className="grid lg:grid-cols-[1.5fr_1fr] gap-4 print:hidden">
          <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">7-Din Activity Trend</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Sales vs Other events daily</p>
              </div>
              <TrendingUp className="h-5 w-5 text-blue-500" />
            </div>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="otherGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:opacity-20" />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '2px solid #e2e8f0' }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="sales" name="Sales" stroke="#10b981" fill="url(#salesGrad)" strokeWidth={2.5} />
                  <Area type="monotone" dataKey="other" name="Other" stroke="#3b82f6" fill="url(#otherGrad)" strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Category Breakdown</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Event types split</p>
              </div>
              <Filter className="h-5 w-5 text-violet-500" />
            </div>
            {categoryBreakdown.length > 0 ? (
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryBreakdown}
                      cx="50%" cy="45%" outerRadius={85} innerRadius={42}
                      dataKey="value"
                      label={(entry: any) => `${entry.value}`}
                      labelLine={false}
                    >
                      {categoryBreakdown.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 10, paddingTop: 12 }} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[260px] flex items-center justify-center text-sm text-slate-500 dark:text-slate-400 font-semibold">
                Koi data nahi
              </div>
            )}
          </div>
        </section>
      )}

      {/* ═══ ACTIONS BAR ═══ */}
      <section className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm p-5 print:hidden">
        <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
          <Zap className="h-4 w-4 text-blue-600" /> Quick Actions
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          <ActionBtn
            icon={RefreshCw} label="Refresh Products"
            onClick={handleRefreshProducts}
            disabled={busy !== null || !status.isOnline}
            loading={busy === 'products'}
            color="blue"
          />
          <ActionBtn
            icon={Download} label="Download Backup"
            onClick={handleExportBackup}
            disabled={busy !== null}
            loading={busy === 'backup'}
            color="emerald"
          />
          <ActionBtn
            icon={Upload} label="Restore Backup"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy !== null}
            loading={busy === 'restore'}
            color="violet"
          />
          <ActionBtn
            icon={RotateCcw} label="Retry Failed"
            onClick={handleResetFailed}
            disabled={busy !== null || !status.isOnline || stats.failed === 0}
            loading={busy === 'reset'}
            color="amber"
          />
          <ActionBtn
            icon={Trash2} label="Clear Cache"
            onClick={handleClearCache}
            disabled={busy !== null || (snapshot?.hasPending ?? false)}
            loading={busy === 'clear'}
            color="rose"
          />
        </div>
        <input ref={fileInputRef} type="file" accept=".json,application/json" className="hidden" onChange={handleImportBackup} />
      </section>

      {/* ═══ TOOLBAR ═══ */}
      <section className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm p-4 space-y-3 print:hidden">
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search history — sale, product, customer, error... (/ shortcut)"
              className="h-12 w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-11 pr-10 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500/30 transition"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center">
                <X className="h-4 w-4 text-slate-400" />
              </button>
            )}
          </div>
        </div>

        {/* Date presets */}
        <div className="flex gap-2 flex-wrap items-center">
          <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 items-center">
            <Calendar className="h-3.5 w-3.5 text-slate-400 ml-1.5 shrink-0" />
            {DATE_PRESETS.map((o) => (
              <button
                key={o.v}
                onClick={() => setDateFilter(o.v)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold transition whitespace-nowrap ${
                  dateFilter === o.v ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {o.l}
              </button>
            ))}
          </div>

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="text-xs font-extrabold text-rose-600 dark:text-rose-400 hover:text-rose-700 inline-flex items-center gap-1 transition"
            >
              <X className="h-3 w-3" /> Filters clear
            </button>
          )}

          <div className="ml-auto text-xs font-extrabold text-slate-500 dark:text-slate-400 tabular-nums">
            {filtered.length} / {history.length} events
          </div>
        </div>

        {/* Category pills */}
        <div className="flex gap-1.5 flex-wrap items-center">
          <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest mr-1">Type:</span>
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition ${
              categoryFilter === 'all' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Sab <span className={`ml-1 tabular-nums ${categoryFilter === 'all' ? 'opacity-70' : 'text-slate-400 dark:text-slate-500'}`}>{categoryCounts.all}</span>
          </button>
          {(Object.entries(categoryConfig) as [string, any][]).map(([key, cfg]) => {
            const count = categoryCounts[key] || 0;
            if (count === 0) return null;
            const active = categoryFilter === key;
            return (
              <button
                key={key}
                onClick={() => setCategoryFilter(key as CategoryFilter)}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition inline-flex items-center gap-1 border ${
                  active ? `${cfg.light} ${cfg.dark} shadow-sm ring-2` : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <span>{cfg.emoji}</span>
                {cfg.label}
                <span className={`ml-0.5 tabular-nums ${active ? 'opacity-70' : 'text-slate-400 dark:text-slate-500'}`}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* Status pills */}
        <div className="flex gap-1.5 flex-wrap items-center">
          <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest mr-1">Status:</span>
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition ${
              statusFilter === 'all' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Sab
          </button>
          {(Object.entries(statusConfig) as [string, any][]).map(([key, cfg]) => {
            const count = statusCounts[key] || 0;
            if (count === 0) return null;
            const active = statusFilter === key;
            return (
              <button
                key={key}
                onClick={() => setStatusFilter(key as StatusFilter)}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition inline-flex items-center gap-1 border ${
                  active ? `${cfg.light} ${cfg.dark} shadow-sm ring-2` : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <span>{cfg.emoji}</span>
                {cfg.label}
                <span className={`ml-0.5 tabular-nums ${active ? 'opacity-70' : 'text-slate-400 dark:text-slate-500'}`}>{count}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ═══ HISTORY TABLE ═══ */}
      <section className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden print:border-0 print:rounded-none print:shadow-none">
        <div className="px-5 sm:px-6 py-4 border-b-2 border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2 print:hidden">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Full History</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
              {filtered.length} events • Sales + Products + Customers + Categories sab
            </p>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-12 sm:p-16 text-center">
            <div className="mx-auto h-16 w-16 rounded-3xl bg-gradient-to-br from-blue-100 to-cyan-200 dark:from-blue-500/20 dark:to-cyan-500/20 flex items-center justify-center">
              <Activity className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h4 className="mt-4 text-lg font-extrabold text-slate-900 dark:text-white">
              {hasFilters ? 'Filter me kuch nahi mila' : 'Koi sync event nahi'}
            </h4>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 font-semibold max-w-md mx-auto">
              {hasFilters
                ? 'Date range badhao ya filters clear karo'
                : 'Jab bhi aap offline sale karo ya koi change hoga, yahan record hoga'}
            </p>
            {hasFilters && (
              <Button variant="secondary" className="mt-4 font-extrabold" onClick={clearFilters}>
                <X className="h-4 w-4" /> Filters Clear
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm print:text-[10px]">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b-2 border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="text-left px-4 py-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">Type</th>
                  <th className="text-left px-4 py-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">Title / Details</th>
                  <th className="text-right px-4 py-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">Amount</th>
                  <th className="text-left px-4 py-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">Status</th>
                  <th className="text-left px-4 py-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">Date</th>
                  <th className="text-right px-4 py-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 print:hidden">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((e) => {
                  const catCfg = categoryConfig[e.category] || categoryConfig.other;
                  const statCfg = statusConfig[e.status] || statusConfig.pending;
                  const Icon = catCfg.icon;
                  return (
                    <tr key={e.id} className="hover:bg-blue-50/40 dark:hover:bg-blue-500/5 transition">
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-extrabold border ${catCfg.light} ${catCfg.dark}`}>
                          <Icon className="h-3 w-3" />
                          {catCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-extrabold text-slate-900 dark:text-white">{e.title}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5">{e.description}</div>
                        {e.error && (
                          <div className="mt-1 text-[10px] text-rose-600 dark:text-rose-400 font-bold bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 rounded px-1.5 py-0.5 inline-block">
                            ⚠️ {e.error}
                            {e.retryCount && e.retryCount > 0 && ` (${e.retryCount} tries)`}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {e.amount ? (
                          <span className="font-extrabold text-slate-900 dark:text-white tabular-nums">{formatPKR(e.amount)}</span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-extrabold border ${statCfg.light} ${statCfg.dark}`}>
                          <span>{statCfg.emoji}</span>
                          {statCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs font-semibold whitespace-nowrap">
                        {formatDate(e.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right print:hidden">
                        {(e.status === 'pending' || e.status === 'failed') && (
                          <button
                            onClick={() => handleDeleteEvent(e)}
                            className="h-8 w-8 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 inline-flex items-center justify-center transition"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {status.lastError && (
        <div className="bg-rose-50 dark:bg-rose-500/10 border-2 border-rose-200 dark:border-rose-500/40 rounded-2xl p-4 text-sm text-rose-700 dark:text-rose-300 font-semibold flex items-start gap-2 print:hidden">
          <Info className="h-4 w-4 shrink-0 mt-0.5" />
          <div><strong>Last error:</strong> {status.lastError}</div>
        </div>
      )}

      {/* PRINT CSS */}
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 10mm 8mm; }
          html, body {
            background: white !important; color: #0f172a !important;
            print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important;
          }
          .dark body, .dark { background: white !important; color: #0f172a !important; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          section, div { box-shadow: none !important; }
          [class*="fixed"] { display: none !important; }
          html, body, #root { height: auto !important; min-height: 0 !important; overflow: visible !important; }
          [class*="sidebar"], [class*="topbar"], nav[class*="fixed"] { display: none !important; }
          table { font-size: 9px !important; border-collapse: collapse !important; width: 100% !important; }
          thead { display: table-header-group !important; }
          thead th { background: #0ea5e9 !important; color: white !important; padding: 5px 4px !important; font-size: 8px !important; font-weight: 800 !important; border: 1px solid #0284c7 !important; }
          tbody tr { page-break-inside: avoid !important; }
          tbody td { padding: 5px 4px !important; border: 1px solid #e2e8f0 !important; color: #0f172a !important; }
          tbody tr:nth-child(even) td { background: #f8fafc !important; }
          [data-sonner-toaster], [data-sonner-toast], [class*="Toaster"] { display: none !important; visibility: hidden !important; }
        }
      `}</style>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   TEACHER MODAL
   ═════════════════════════════════════════════════════════════ */
function SyncTeacher({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-blue-300 dark:border-blue-500/40 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3 border-b-2 border-blue-200 dark:border-blue-500/30 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-500/15 dark:to-cyan-500/15 flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-extrabold text-blue-900 dark:text-blue-200 flex items-center gap-2">
            <GraduationCap className="h-5 w-5" /> Sync Center — Guide
          </h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-relaxed">
            Ye <strong>offline sync ka control room</strong> hai — yahan aap dekh sakte ho
            ke device pe kya kya <strong>save hai</strong>, kya server pe <strong>chala gaya</strong>,
            aur kya <strong>abhi tak pending</strong> hai.
          </p>

          <div className="rounded-2xl border-2 border-blue-200 dark:border-blue-500/30 bg-blue-50/60 dark:bg-blue-500/5 p-4 space-y-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-blue-700 dark:text-blue-300 mb-1">
              📋 4 Status
            </div>
            <TypeRow emoji="⏳" label="Pending" color="text-amber-700 dark:text-amber-400" desc="Save ho gaya, sync ka intezaar" />
            <TypeRow emoji="🔄" label="Syncing" color="text-blue-700 dark:text-blue-400" desc="Abhi upload ho raha hai" />
            <TypeRow emoji="✅" label="Synced" color="text-emerald-700 dark:text-emerald-400" desc="Server pe pahunch gaya" />
            <TypeRow emoji="❌" label="Failed" color="text-rose-700 dark:text-rose-400" desc="Kuch masla — retry ya delete" />
          </div>

          <div className="rounded-2xl border-2 border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-500/5 p-4 space-y-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-emerald-700 dark:text-emerald-300 mb-1">
              💾 Data Snapshot Kya Hai?
            </div>
            <p>Aap ke device pe cached data ki gainti — ye sab <strong>net ke baghair bhi chalega</strong>:</p>
            <ul className="list-disc pl-4 space-y-0.5">
              <li>Products, Customers, Expenses</li>
              <li>Categories, Brands, Tags</li>
              <li>Shops, Expense Categories</li>
            </ul>
          </div>

          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3 space-y-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <TipRow><strong>Full Sync</strong> — sab pending upload karo phir latest data download karo</TipRow>
            <TipRow><strong>Download Backup</strong> — poora offline data JSON me — weekly recommend</TipRow>
            <TipRow><strong>Retry Failed</strong> — jo items fail hue unko dobara try karo</TipRow>
            <TipRow><strong>Clear Cache</strong> — sab local data delete (pending hone par disabled)</TipRow>
            <TipRow><strong>⌨️ /</strong> — search &nbsp;•&nbsp; <strong>R</strong> — refresh</TipRow>
          </div>

          <div className="rounded-xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/40 p-3 text-xs font-semibold text-amber-900 dark:text-amber-200">
            💡 <strong>Sab automatic hai</strong> — jab net aayega, pending items khud upload hongi.
            Aap ko bas Failed items pe nazar rakhni hai — wo aksar stock conflict ki wajah se hote hain.
          </div>

          <Button
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 font-extrabold shadow-lg shadow-blue-500/40 h-12"
            onClick={onClose}
          >
            <CheckCircle2 className="h-4 w-4" /> Samajh Gaya!
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ═════════════════════════════════════════════════════════════ */
function TypeRow({ emoji, label, color, desc }: { emoji: string; label: string; color: string; desc: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg bg-white dark:bg-slate-800 border border-blue-100 dark:border-blue-500/20 p-2">
      <span className="text-base shrink-0">{emoji}</span>
      <div className="min-w-0 flex-1">
        <div className={`text-xs font-extrabold ${color}`}>{label}</div>
        <div className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold">{desc}</div>
      </div>
    </div>
  );
}

function TipRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="px-1.5 py-0.5 rounded bg-white/15 border border-white/25 text-white font-mono font-bold shadow-sm">
      {children}
    </kbd>
  );
}

function Kpi({ icon: Icon, label, value, sub, tone, isPositive, isNegative }: any) {
  const tones: Record<string, string> = {
    blue: 'from-blue-500 to-blue-700 shadow-blue-500/40',
    emerald: 'from-emerald-500 to-emerald-700 shadow-emerald-500/40',
    amber: 'from-amber-500 to-orange-600 shadow-amber-500/40',
    rose: 'from-rose-500 to-rose-700 shadow-rose-500/40',
  };
  return (
    <div className={[
      'rounded-2xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 p-3 sm:p-4 shadow-sm transition-all',
      isPositive ? 'border-emerald-300 dark:border-emerald-500/40' : isNegative ? 'border-rose-300 dark:border-rose-500/40' : 'border-slate-200 dark:border-slate-800',
    ].join(' ')}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-extrabold">{label}</div>
          <div className="mt-1.5 text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums truncate">{value}</div>
          {sub && <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-0.5 truncate">{sub}</div>}
        </div>
        <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-lg shrink-0`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function SnapCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    blue: 'from-blue-500 to-blue-600',
    violet: 'from-violet-500 to-violet-600',
    orange: 'from-orange-500 to-orange-600',
    emerald: 'from-emerald-500 to-emerald-600',
    cyan: 'from-cyan-500 to-cyan-600',
    pink: 'from-pink-500 to-pink-600',
    amber: 'from-amber-500 to-amber-600',
    slate: 'from-slate-500 to-slate-600',
  };
  return (
    <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3 hover:shadow-sm transition">
      <div className={`h-8 w-8 rounded-lg bg-gradient-to-br ${colors[color]} text-white flex items-center justify-center mb-2 shadow-sm`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="text-lg font-extrabold text-slate-900 dark:text-white tabular-nums">{value.toLocaleString()}</div>
      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">{label}</div>
    </div>
  );
}

function ActionBtn({ icon: Icon, label, onClick, disabled, loading, color }: {
  icon: any; label: string; onClick: () => void; disabled?: boolean; loading?: boolean;
  color: 'blue' | 'emerald' | 'violet' | 'amber' | 'rose';
}) {
  const colors = {
    blue: 'border-blue-200 dark:border-blue-500/40 hover:bg-blue-50 dark:hover:bg-blue-500/10 text-blue-700 dark:text-blue-300',
    emerald: 'border-emerald-200 dark:border-emerald-500/40 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    violet: 'border-violet-200 dark:border-violet-500/40 hover:bg-violet-50 dark:hover:bg-violet-500/10 text-violet-700 dark:text-violet-300',
    amber: 'border-amber-200 dark:border-amber-500/40 hover:bg-amber-50 dark:hover:bg-amber-500/10 text-amber-700 dark:text-amber-300',
    rose: 'border-rose-200 dark:border-rose-500/40 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-rose-700 dark:text-rose-300',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`h-14 rounded-xl border-2 bg-white dark:bg-slate-800 font-extrabold text-xs transition-all inline-flex flex-col items-center justify-center gap-1 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed ${colors[color]}`}
    >
      <Icon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
      <span>{label}</span>
    </button>
  );
}
