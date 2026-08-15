import { useMemo, useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle, Package, ShoppingBag, ArrowRight, Search, X,
  RefreshCw, Edit3, Layers, TrendingDown,
  FileSpreadsheet, FileText, Hash, XCircle, CheckCircle2, BarChart3,
  MessageCircle, Send, Copy, ChevronDown, Info, GraduationCap,
  Printer, Boxes, Smartphone, ClipboardList, Zap, Timer,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell,
} from 'recharts';
import { toast } from 'sonner';
import { stockReportApi } from '@modules/inventory/stock-report/api/stock-report.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { useIndustryStockPresets } from '@industries/_shared/presets';
import { useAuthStore } from '@core/stores/auth.store';
import { QuickStockModal } from '../components/QuickStockModal';

/* ═════════════════════════════════════════════════════════════
   NAFAA RETAIL LOW STOCK — FULL BEST v3
   ─────────────────────────────────────────────────────────────
   🎯 Urgency sorting — jo sab se pehle khatam hoga, woh upar
   📋 Bulk WhatsApp order list — 1 click = poori shopping list
   💬 Per-product supplier reminder templates (industry presets)
   ⚡ QuickStockModal — row se foran stock add
   🎓 Teacher modal • 🌙 Dark mode • 🖨️ Print/CSV
   ═════════════════════════════════════════════════════════════ */

const formatQty = (qty: number) => qty.toFixed(qty % 1 === 0 ? 0 : 2);

type Filter = 'all' | 'critical' | 'warning';
type SortKey = 'urgency' | 'stock-asc' | 'value' | 'name';

const industryConfig: Record<string, { label: string; icon: any; color: string; bg: string; darkBg: string }> = {
  STANDARD:     { label: 'Standard', icon: Package,    color: '#64748b', bg: 'bg-slate-100 text-slate-700',   darkBg: 'dark:bg-slate-500/20 dark:text-slate-300' },
  CARPET:       { label: 'Carpet',   icon: Layers,     color: '#10b981', bg: 'bg-emerald-100 text-emerald-700', darkBg: 'dark:bg-emerald-500/20 dark:text-emerald-300' },
  MOBILE:       { label: 'Mobile',   icon: Smartphone, color: '#3b82f6', bg: 'bg-blue-100 text-blue-700',     darkBg: 'dark:bg-blue-500/20 dark:text-blue-300' },
  WEIGHT_BASED: { label: 'Weight',   icon: Hash,       color: '#f59e0b', bg: 'bg-amber-100 text-amber-700',   darkBg: 'dark:bg-amber-500/20 dark:text-amber-300' },
};

export default function RetailLowStockPage() {
  const industryStock = useIndustryStockPresets();
  const tenant = useAuthStore((s) => s.tenant);
  const shopName = useAuthStore((s) => s.user?.assignedShop?.name);
  const searchRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('urgency');
  const [reminderProduct, setReminderProduct] = useState<any>(null);
  const [stockModalRow, setStockModalRow] = useState<any>(null);
  const [showTeacher, setShowTeacher] = useState(false);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['low-stock-report'],
    queryFn: () => stockReportApi.generate({ stockStatus: 'all', isActive: true }),
  });

  const lowStockRows = useMemo(() => {
    if (!data?.rows) return [];
    return data.rows.filter(
      (r) => r.stockStatus === 'LOW_STOCK' || r.stockStatus === 'OUT_OF_STOCK',
    );
  }, [data]);

  const categories = useMemo(() => {
    const set = new Map<string, string>();
    for (const r of lowStockRows) if (r.category) set.set(r.category, r.category);
    return Array.from(set.values()).sort();
  }, [lowStockRows]);

  /* ─── Urgency score: stock/alert ratio (chhota = zyada urgent) ─── */
  const urgencyOf = (p: any) => {
    if (p.stock <= 0) return -1; // out = sab se upar
    const alert = Number(p.lowStockAlert || 5);
    return alert > 0 ? p.stock / alert : 99;
  };

  const filtered = useMemo(() => {
    let result = [...lowStockRows];
    const q = search.toLowerCase().trim();
    if (q) {
      result = result.filter((p) =>
        p.productName.toLowerCase().includes(q) ||
        (p.sku || '').toLowerCase().includes(q) ||
        (p.barcode || '').toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q) ||
        (p.brand || '').toLowerCase().includes(q),
      );
    }
    if (filter === 'critical') result = result.filter((p) => p.stockStatus === 'OUT_OF_STOCK');
    else if (filter === 'warning') result = result.filter((p) => p.stockStatus === 'LOW_STOCK');
    if (categoryFilter !== 'all') result = result.filter((p) => p.category === categoryFilter);

    result.sort((a, b) => {
      switch (sortKey) {
        case 'stock-asc': return a.stock - b.stock;
        case 'value': return b.retailValue - a.retailValue;
        case 'name': return a.productName.localeCompare(b.productName);
        default: return urgencyOf(a) - urgencyOf(b); // urgency
      }
    });
    return result;
  }, [lowStockRows, search, filter, categoryFilter, sortKey]);

  const stats = useMemo(() => {
    const critical = lowStockRows.filter((p) => p.stockStatus === 'OUT_OF_STOCK').length;
    const warning = lowStockRows.filter((p) => p.stockStatus === 'LOW_STOCK').length;
    const totalRetailValue = lowStockRows.reduce((s, p) => s + p.retailValue, 0);
    const totalCostValue = lowStockRows.reduce((s, p) => s + p.stockValue, 0);
    // Reorder ka andaza: har item ke liye suggested qty × cost
    const reorderCost = lowStockRows.reduce((s, p) => {
      const qty = Math.max(Number(p.lowStockAlert || 5) * 3, 10);
      const cost = p.stock > 0 ? p.stockValue / p.stock : 0;
      return s + qty * cost;
    }, 0);
    return { critical, warning, total: lowStockRows.length, totalRetailValue, totalCostValue, reorderCost };
  }, [lowStockRows]);

  const topLowChart = useMemo(() => {
    return [...filtered].sort((a, b) => urgencyOf(a) - urgencyOf(b)).slice(0, 10).map((r) => ({
      name: r.productName.length > 14 ? r.productName.slice(0, 14) + '…' : r.productName,
      stock: r.stock, alert: r.lowStockAlert,
    }));
  }, [filtered]);

  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of lowStockRows) {
      const k = r.category || 'Bina category';
      map.set(k, (map.get(k) || 0) + 1);
    }
    const palette = ['#f59e0b', '#ef4444', '#0ea5e9', '#10b981', '#8b5cf6', '#ec4899', '#64748b'];
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7)
      .map(([name, value], i) => ({ name, value, color: palette[i % palette.length] }));
  }, [lowStockRows]);

  /* ─── WhatsApp reminders ─── */
  const buildMsg = (product: any, templateId?: string) => {
    const template = industryStock.supplierReminders.find((r) => r.id === templateId)
      || industryStock.supplierReminders[0];
    if (!template) return null;
    const suggestedQty = Math.max(Number(product.lowStockAlert || 5) * 3, 10);
    return template.template({
      supplierName: 'sir',
      productName: product.productName,
      currentStock: formatQty(product.stock),
      unit: product.unit,
      quantityNeeded: `${suggestedQty} ${product.unit}`,
      shopName: tenant?.name || undefined,
    });
  };

  const sendSupplierReminder = (product: any, templateId?: string) => {
    const msg = buildMsg(product, templateId);
    if (!msg) return toast.error('Koi template nahi mila');
    navigator.clipboard.writeText(msg);
    toast.success('Reminder copied — WhatsApp me paste karo');
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    setReminderProduct(null);
  };

  const copyReminderOnly = (product: any, templateId: string) => {
    const msg = buildMsg(product, templateId);
    if (!msg) return;
    navigator.clipboard.writeText(msg);
    toast.success('Reminder copied');
  };

  /* ─── 📋 Bulk order list — poori shopping list ek click me ─── */
  const copyBulkOrderList = (wa = false) => {
    if (filtered.length === 0) return toast.error('Koi item nahi');
    const lines = filtered.map((p, i) => {
      const qty = Math.max(Number(p.lowStockAlert || 5) * 3, 10);
      return `${i + 1}. ${p.productName} — ${qty} ${p.unit}${p.stock <= 0 ? ' (KHATAM ⚠️)' : ` (abhi ${formatQty(p.stock)})`}`;
    });
    const msg = [
      `🛒 *ORDER LIST — ${tenant?.name || 'Meri Dukaan'}*`,
      `📅 ${new Date().toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}`,
      ``,
      ...lines,
      ``,
      `Total ${filtered.length} items — kal tak arrange kar dein, shukriya! 🙏`,
    ].join('\n');
    navigator.clipboard.writeText(msg);
    if (wa) {
      toast.success('Order list copied — WhatsApp khul raha hai');
      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    } else {
      toast.success(`${filtered.length} items ki order list copy ho gayi`);
    }
  };

  const exportCSV = () => {
    if (filtered.length === 0) return toast.error('Koi data nahi');
    const summary = [
      [`Low Stock Report — ${tenant?.name || 'Nafaa'}`],
      [`Shop: ${shopName || 'All'}  •  Generated: ${new Date().toLocaleString('en-PK')}`],
      [`Total: ${filtered.length}  •  Out: ${stats.critical}  •  Low: ${stats.warning}`],
      [''],
    ];
    const headers = ['Product', 'SKU', 'Category', 'Brand', 'Unit', 'Stock', 'Alert', 'Urgency %', 'Status', 'Suggested Order', 'Sale Price', 'Retail Value'];
    const rows = filtered.map((p) => {
      const qty = Math.max(Number(p.lowStockAlert || 5) * 3, 10);
      const urg = p.stock <= 0 ? 0 : Math.round((p.stock / Number(p.lowStockAlert || 5)) * 100);
      return [
        p.productName, p.sku || '', p.category || '', p.brand || '',
        p.unit, formatQty(p.stock), formatQty(p.lowStockAlert), urg + '%',
        p.stockStatus === 'OUT_OF_STOCK' ? 'Out of Stock' : 'Low Stock',
        `${qty} ${p.unit}`, p.salePrice.toFixed(2), p.retailValue.toFixed(2),
      ];
    });
    const csv = [...summary, headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `low-stock-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${filtered.length} items export ho gaye`);
  };

  /* ─── Reminder dropdown outside click close ─── */
  useEffect(() => {
    if (!reminderProduct) return;
    const close = () => setReminderProduct(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [reminderProduct]);

  /* ─── Keyboard: / = search, Esc = modals band ─── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName;
      if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === 'Escape') {
        if (showTeacher) setShowTeacher(false);
        else if (stockModalRow) setStockModalRow(null);
        else if (reminderProduct) setReminderProduct(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showTeacher, stockModalRow, reminderProduct]);

  const hasFilters = !!search || filter !== 'all' || categoryFilter !== 'all';
  const clearFilters = () => { setSearch(''); setFilter('all'); setCategoryFilter('all'); };
  const printDate = new Date().toLocaleString('en-PK', { dateStyle: 'full', timeStyle: 'short' });

  return (
    <div className="space-y-4 sm:space-y-5 pb-10 print:space-y-3">
      {/* QuickStock modal — row se foran stock */}
      {stockModalRow && (
        <QuickStockModal
          product={{
            id: stockModalRow.productId,
            name: stockModalRow.productName,
            stock: stockModalRow.stock,
            unit: stockModalRow.unit,
            price: stockModalRow.salePrice,
          }}
          onClose={() => { setStockModalRow(null); refetch(); }}
        />
      )}

      {showTeacher && <LowStockTeacher onClose={() => setShowTeacher(false)} />}

      {/* ═══ PRINT-ONLY HEADER ═══ */}
      <div className="hidden print:block">
        <div className="flex items-center justify-between border-b-4 border-amber-600 pb-3 mb-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 leading-tight">
              ⚠️ {tenant?.name || 'My Store'} — Low Stock Report
            </h1>
            <p className="text-xs text-slate-600 font-semibold mt-1">
              {shopName ? `Shop: ${shopName}  •  ` : ''}{filtered.length} items • {stats.critical} khatam • {stats.warning} kam
            </p>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase font-bold text-slate-500">Generated</div>
            <div className="text-xs font-bold text-slate-900">{printDate}</div>
          </div>
        </div>
      </div>

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-950 via-amber-900 to-rose-700 text-white p-4 sm:p-6 shadow-2xl print:hidden">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-amber-400/25 blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-rose-400/20 blur-3xl pointer-events-none" />

        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-3 py-1 text-[11px] font-extrabold border border-white/25 uppercase tracking-widest shadow-lg">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-300" /> Stock Alerts
              {shopName && (
                <>
                  <span className="opacity-40">•</span>
                  <span className="text-emerald-200">🏪 {shopName}</span>
                </>
              )}
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-tight">⚠️ Low Stock Alerts</h1>
            <p className="mt-1.5 text-xs sm:text-sm text-white/90 font-semibold">
              <strong className="text-rose-300">{stats.critical}</strong> khatam
              <span className="opacity-50 mx-1.5">•</span>
              <strong className="text-amber-300">{stats.warning}</strong> kam
              <span className="opacity-50 mx-1.5">•</span>
              Lost revenue risk <strong className="text-rose-300">{formatPKR(stats.totalRetailValue)}</strong>
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
              onClick={() => refetch()}
              disabled={isRefetching}
              className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur-md disabled:opacity-50 transition"
            >
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={() => window.print()}
              className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur-md transition"
            >
              <Printer className="h-4 w-4" /> <span className="hidden sm:inline">Print</span>
            </button>
            <button
              onClick={exportCSV}
              className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur-md transition"
            >
              <FileSpreadsheet className="h-4 w-4" /> <span className="hidden sm:inline">CSV</span>
            </button>
            <Link
              to="/purchases"
              className="h-11 px-4 rounded-xl bg-white text-slate-900 hover:bg-slate-100 text-xs font-extrabold inline-flex items-center gap-1.5 shadow-2xl transition"
            >
              <ShoppingBag className="h-4 w-4" /> Nayi Purchase
            </Link>
          </div>
        </div>

        {/* 📋 Bulk order strip */}
        {stats.total > 0 && (
          <div className="relative mt-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-3 flex items-center gap-3 flex-wrap">
            <div className="h-9 w-9 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shrink-0">
              <ClipboardList className="h-4.5 w-4.5 h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-extrabold text-sm">Supplier ko poori order list bhejo</div>
              <div className="text-[11px] text-white/75 font-semibold">
                {filtered.length} items • suggested quantities ke sath • 1 click copy
              </div>
            </div>
            <button
              onClick={() => copyBulkOrderList(false)}
              className="h-10 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 transition"
            >
              <Copy className="h-3.5 w-3.5" /> Copy List
            </button>
            <button
              onClick={() => copyBulkOrderList(true)}
              className="h-10 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-extrabold inline-flex items-center gap-1.5 shadow-lg shadow-emerald-500/40 transition"
            >
              <MessageCircle className="h-4 w-4" /> WhatsApp pe bhejo
            </button>
          </div>
        )}

        {/* Keyboard hints */}
        <div className="relative mt-3 hidden sm:flex flex-wrap gap-1.5 text-[10px] font-bold items-center">
          <Kbd>/</Kbd><span className="text-white/60">Search</span>
          <span className="text-white/30 mx-1">•</span>
          <Kbd>Esc</Kbd><span className="text-white/60">Band</span>
        </div>
      </section>

      {/* ═══ RESTOCK RULES (industry presets) ═══ */}
      {industryStock.restockRules.length > 0 && (
        <section className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 dark:from-amber-500/10 dark:via-orange-500/10 dark:to-rose-500/10 border-2 border-amber-300 dark:border-amber-500/40 p-4 shadow-sm print:hidden">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md shrink-0">
              <Info className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-amber-900 dark:text-amber-200 text-sm">
                {industryStock.industryEmoji} {industryStock.industryName} Restock Priority
              </h3>
              <p className="text-[11px] text-amber-800 dark:text-amber-300/80 font-bold">
                {industryStock.restockRules.length} urgency levels
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {industryStock.restockRules.map((rule) => (
              <div key={rule.label} className="rounded-xl bg-white dark:bg-slate-800/80 border-2 p-2.5" style={{ borderColor: `${rule.color}40` }}>
                <div className="flex items-center gap-2">
                  <span className="text-xl shrink-0">{rule.emoji}</span>
                  <div className="min-w-0">
                    <div className="text-[11px] font-extrabold" style={{ color: rule.color }}>{rule.label}</div>
                    <div className="text-[9px] text-slate-600 dark:text-slate-400 font-semibold line-clamp-2">{rule.description}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ═══ KPIs ═══ */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 print:hidden">
        <Kpi icon={XCircle} label="Out of Stock" value={stats.critical} sub="Foran order karo" tone="rose"
          onClick={() => setFilter('critical')} active={filter === 'critical'} />
        <Kpi icon={AlertTriangle} label="Low Stock" value={stats.warning} sub="Threshold se neeche" tone="amber"
          onClick={() => setFilter('warning')} active={filter === 'warning'} />
        <Kpi icon={TrendingDown} label="Lost Revenue Risk" value={formatPKR(stats.totalRetailValue)} sub={`Cost ${formatPKR(stats.totalCostValue)}`} tone="violet" />
        <Kpi icon={ShoppingBag} label="Reorder Andaza" value={formatPKR(stats.reorderCost)} sub="Suggested order cost" tone="emerald" />
      </section>

      {/* ═══ CHARTS ═══ */}
      {stats.total > 0 && (
        <section className="grid lg:grid-cols-[1.5fr_1fr] gap-4 print:hidden">
          <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-black/20 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Top 10 Urgent Items</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Stock vs alert threshold</p>
              </div>
              <BarChart3 className="h-5 w-5 text-amber-500" />
            </div>
            {topLowChart.length > 0 ? (
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topLowChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:opacity-20" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={10} angle={-15} textAnchor="end" height={70} />
                    <YAxis stroke="#64748b" fontSize={11} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: '2px solid #e2e8f0' }} />
                    <Bar dataKey="stock" name="Current Stock" fill="#ef4444" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="alert" name="Alert Level" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (<EmptyChart />)}
          </div>

          <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-black/20 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Category Breakdown</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Kaunsi category sab se zyada affected</p>
              </div>
              <Layers className="h-5 w-5 text-violet-500" />
            </div>
            {categoryBreakdown.length > 0 ? (
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryBreakdown} cx="50%" cy="45%" outerRadius={85} innerRadius={42}
                      dataKey="value" label={(entry: any) => `${entry.name} (${entry.value})`} labelLine={false} fontSize={10}>
                      {categoryBreakdown.map((entry, idx) => (<Cell key={`cell-${idx}`} fill={entry.color} />))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (<EmptyChart />)}
          </div>
        </section>
      )}

      {/* ═══ TOOLBAR ═══ */}
      <section className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-black/20 p-4 space-y-3 print:hidden">
        <div className="relative">
          <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Naam, SKU, barcode, category, brand... (/ shortcut)"
            className="h-12 w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-11 pr-10 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 dark:focus:ring-amber-500/30 transition"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center">
              <X className="h-4 w-4 text-slate-400" />
            </button>
          )}
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
            {([
              { v: 'all' as Filter, l: 'Sab', c: stats.total },
              { v: 'critical' as Filter, l: '🔴 Khatam', c: stats.critical },
              { v: 'warning' as Filter, l: '🟡 Kam', c: stats.warning },
            ]).map((o) => (
              <button
                key={o.v}
                onClick={() => setFilter(o.v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition ${
                  filter === o.v ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {o.l} <span className={`ml-0.5 tabular-nums ${filter === o.v ? 'text-white/70' : 'text-slate-400 dark:text-slate-500'}`}>{o.c}</span>
              </button>
            ))}
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-10 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 transition"
          >
            <option value="all">Sab Categories ({categories.length})</option>
            {categories.map((c) => (<option key={c} value={c}>{c}</option>))}
          </select>

          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="h-10 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 transition"
          >
            <option value="urgency">⚡ Sab se urgent pehle</option>
            <option value="stock-asc">Stock kam pehle</option>
            <option value="value">Value zyada pehle</option>
            <option value="name">A → Z</option>
          </select>

          {hasFilters && (
            <button onClick={clearFilters} className="text-xs font-extrabold text-rose-600 dark:text-rose-400 hover:text-rose-700 inline-flex items-center gap-1 transition">
              <X className="h-3 w-3" /> Filter hatao
            </button>
          )}

          <div className="ml-auto text-xs font-extrabold text-slate-500 dark:text-slate-400 tabular-nums">
            {filtered.length} alerts
          </div>
        </div>
      </section>

      {/* ═══ TABLE ═══ */}
      <section className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-black/20 overflow-hidden print:border-0 print:rounded-none print:shadow-none">
        <div className="px-5 py-4 border-b-2 border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 print:hidden">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Restock Chahiye</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
              {filtered.length} of {stats.total} • urgency order me
            </p>
          </div>
          {filtered.length > 0 && (
            <button
              onClick={() => copyBulkOrderList(true)}
              className="h-10 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold inline-flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition"
            >
              <MessageCircle className="h-4 w-4" /> <span className="hidden sm:inline">Order List</span>
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="p-6 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (<div key={i} className="h-16 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 sm:p-16 text-center">
            <div className="mx-auto h-20 w-20 rounded-3xl bg-gradient-to-br from-emerald-100 to-green-200 dark:from-emerald-500/20 dark:to-green-500/20 flex items-center justify-center">
              <CheckCircle2 className="h-9 w-9 text-emerald-700 dark:text-emerald-400" />
            </div>
            <h4 className="mt-4 text-lg font-extrabold text-slate-900 dark:text-white">
              {hasFilters ? 'Kuch nahi mila' : 'Sab products ka stock theek hai 🎉'}
            </h4>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 font-semibold">
              {hasFilters ? 'Filter change kar ke dekho' : 'Koi bhi product alert level se neeche nahi'}
            </p>
            {hasFilters && (
              <button onClick={clearFilters} className="mt-4 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-extrabold text-slate-700 dark:text-slate-200 transition">
                Filter hatao
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm print:text-[10px]">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-b-2 border-slate-200 dark:border-slate-700">
                <tr>
                  <Th>#</Th>
                  <Th>Product</Th>
                  <Th>Category / Brand</Th>
                  <Th className="text-right">Stock</Th>
                  <Th className="text-right">Alert</Th>
                  <Th className="text-center">Urgency</Th>
                  <Th className="text-right">Order Qty</Th>
                  <Th className="text-center">Status</Th>
                  <Th className="text-right print:hidden">Actions</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((p, idx) => {
                  const isCritical = p.stockStatus === 'OUT_OF_STOCK';
                  const urg = urgencyOf(p);
                  const urgPct = p.stock <= 0 ? 0 : Math.min(Math.round(urg * 100), 100);
                  const orderQty = Math.max(Number(p.lowStockAlert || 5) * 3, 10);
                  return (
                    <tr
                      key={p.productId}
                      className={[
                        'transition',
                        isCritical
                          ? 'bg-rose-50/40 dark:bg-rose-500/5 hover:bg-rose-50/60 dark:hover:bg-rose-500/10'
                          : 'bg-amber-50/40 dark:bg-amber-500/5 hover:bg-amber-50/60 dark:hover:bg-amber-500/10',
                      ].join(' ')}
                    >
                      <td className="px-3 py-3 text-[10px] font-extrabold text-slate-400 dark:text-slate-500 tabular-nums">{idx + 1}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700 print:hidden">
                            {p.primaryImage ? (
                              <img src={p.primaryImage} alt="" loading="lazy" className="h-full w-full object-cover" />
                            ) : (
                              <Package className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-extrabold text-slate-900 dark:text-white line-clamp-1">{p.productName}</div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{p.sku || p.barcode || '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-xs">
                        {p.category && (
                          <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                            {p.categoryColor && (<span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: p.categoryColor }} />)}
                            <span className="truncate">{p.category}</span>
                          </div>
                        )}
                        {p.brand && (<div className="text-[10px] font-bold text-violet-700 dark:text-violet-400 mt-0.5">{p.brand}</div>)}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <button
                          onClick={() => setStockModalRow(p)}
                          className="group inline-flex flex-col items-end print:hidden"
                          title="Click = stock add"
                        >
                          <span className={`font-extrabold text-lg tabular-nums ${isCritical ? 'text-rose-700 dark:text-rose-400' : 'text-amber-700 dark:text-amber-400'}`}>
                            {formatQty(p.stock)}
                          </span>
                          <span className="text-[9px] font-extrabold text-emerald-600 dark:text-emerald-400 opacity-0 group-hover:opacity-100 transition">+ Stock</span>
                        </button>
                        <span className="hidden print:inline font-extrabold">{formatQty(p.stock)}</span>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase print:hidden">{p.unit}</div>
                      </td>
                      <td className="px-3 py-3 text-right text-slate-700 dark:text-slate-300 font-bold tabular-nums text-xs">
                        {formatQty(p.lowStockAlert)} {p.unit}
                      </td>
                      <td className="px-3 py-3 text-center print:hidden">
                        <div className="inline-flex flex-col items-center gap-1 min-w-[64px]">
                          <div className="h-1.5 w-16 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${isCritical ? 'bg-rose-600' : urgPct < 50 ? 'bg-rose-500' : 'bg-amber-500'}`}
                              style={{ width: `${Math.max(urgPct, 4)}%` }}
                            />
                          </div>
                          <span className={`text-[9px] font-extrabold tabular-nums ${isCritical ? 'text-rose-700 dark:text-rose-400' : 'text-amber-700 dark:text-amber-400'}`}>
                            {isCritical ? '0%' : `${urgPct}%`}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span className="font-extrabold text-sky-700 dark:text-sky-400 tabular-nums text-xs">
                          {orderQty} <span className="text-[9px] text-slate-500 dark:text-slate-400">{p.unit}</span>
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        {isCritical ? <Pill tone="rose">KHATAM</Pill> : <Pill tone="amber">KAM</Pill>}
                      </td>
                      <td className="px-3 py-3 text-right print:hidden">
                        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          {/* WhatsApp reminder dropdown */}
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setReminderProduct(reminderProduct?.productId === p.productId ? null : p);
                              }}
                              className="inline-flex items-center gap-1 px-2 h-8 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-bold transition"
                              title="Supplier reminder"
                            >
                              <MessageCircle className="h-3 w-3" />
                              <ChevronDown className="h-2.5 w-2.5" />
                            </button>
                            {reminderProduct?.productId === p.productId && industryStock.supplierReminders.length > 0 && (
                              <div
                                className="absolute right-0 top-full mt-1 w-72 bg-white dark:bg-slate-900 border-2 border-green-200 dark:border-green-500/40 rounded-2xl shadow-2xl z-20 overflow-hidden"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="px-3 py-2 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-500/10 dark:to-emerald-500/10 border-b border-green-100 dark:border-green-500/30">
                                  <div className="text-xs font-extrabold text-green-900 dark:text-green-300">
                                    {industryStock.industryEmoji} {industryStock.industryName} Templates
                                  </div>
                                </div>
                                <div className="max-h-64 overflow-y-auto p-1 space-y-1">
                                  {industryStock.supplierReminders.map((r) => (
                                    <div key={r.id} className="rounded-lg border border-slate-200 dark:border-slate-700 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition">
                                      <div className="flex items-center justify-between gap-1">
                                        <div className="min-w-0 flex-1 flex items-center gap-1">
                                          <span className="text-sm">{r.emoji}</span>
                                          <span className="text-xs font-extrabold text-slate-900 dark:text-white truncate">{r.label}</span>
                                        </div>
                                        <div className="flex gap-1 shrink-0">
                                          <button
                                            onClick={() => copyReminderOnly(p, r.id)}
                                            className="h-6 w-6 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition"
                                            title="Copy"
                                          >
                                            <Copy className="h-3 w-3 text-slate-600 dark:text-slate-300" />
                                          </button>
                                          <button
                                            onClick={() => sendSupplierReminder(p, r.id)}
                                            className="h-6 w-6 rounded bg-green-600 hover:bg-green-700 text-white flex items-center justify-center transition"
                                            title="Send"
                                          >
                                            <Send className="h-3 w-3" />
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => setStockModalRow(p)}
                            title="Stock add"
                            className="h-8 w-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 hover:bg-emerald-100 dark:hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 flex items-center justify-center transition"
                          >
                            <Boxes className="h-3.5 w-3.5" />
                          </button>
                          <Link to={`/products/${p.productId}/edit`}>
                            <button className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-blue-500/20 hover:text-blue-700 dark:hover:text-blue-300 text-slate-600 dark:text-slate-300 flex items-center justify-center transition" title="Edit">
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                          </Link>
                          <Link to="/purchases">
                            <button className="inline-flex items-center gap-1 px-2 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition">
                              Restock <ArrowRight className="h-3 w-3" />
                            </button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ═══ PRINT CSS ═══ */}
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
          .print\\:inline { display: inline !important; }
          section, div { box-shadow: none !important; }
          .overflow-x-auto, .overflow-y-auto, .overflow-hidden, .overflow-auto {
            overflow: visible !important; max-height: none !important; height: auto !important;
          }
          main, aside, header, nav, [class*="max-h-"], [class*="fixed"] {
            max-height: none !important; height: auto !important; overflow: visible !important;
          }
          [class*="fixed"] { display: none !important; }
          html, body, #root, #__next { height: auto !important; min-height: 0 !important; overflow: visible !important; }
          [class*="sidebar"], [class*="topbar"], nav[class*="fixed"] { display: none !important; }
          table { font-size: 9px !important; border-collapse: collapse !important; width: 100% !important; page-break-inside: auto !important; }
          thead { display: table-header-group !important; }
          thead th { background: #d97706 !important; color: white !important; padding: 5px 4px !important; font-size: 8px !important; font-weight: 800 !important; border: 1px solid #b45309 !important; }
          tbody tr { page-break-inside: avoid !important; }
          tbody td { padding: 5px 4px !important; border: 1px solid #e2e8f0 !important; color: #0f172a !important; }
          tbody tr:nth-child(even) td { background: #f8fafc !important; }
          .text-rose-700, [class*="rose-400"] { color: #be123c !important; }
          .text-amber-700, [class*="amber-400"] { color: #b45309 !important; }
          [data-sonner-toaster], [data-sonner-toast], [class*="Toaster"] { display: none !important; visibility: hidden !important; }
        }
      `}</style>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   LOW STOCK TEACHER — "Ye page kaise use karein"
   ═════════════════════════════════════════════════════════════ */
function LowStockTeacher({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-amber-300 dark:border-amber-500/40 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3 border-b-2 border-amber-200 dark:border-amber-500/30 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-500/15 dark:to-orange-500/15 flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-extrabold text-amber-900 dark:text-amber-200 flex items-center gap-2">
            <GraduationCap className="h-5 w-5" /> Low Stock — Complete Guide
          </h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-relaxed">
            Ye page batata hai <strong>kaunsa maal khatam hone wala hai</strong> — taake customer aaye
            aur tumhare paas maal na ho, aisa kabhi na ho.
          </p>

          <div className="rounded-2xl border-2 border-amber-200 dark:border-amber-500/30 bg-amber-50/60 dark:bg-amber-500/5 p-4 space-y-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <TipRow><strong>⚡ Urgency bar</strong> — jitna % kam, utna jaldi khatam hoga. 🔴 0% = abhi khatam!</TipRow>
            <TipRow><strong>📋 Order List button</strong> — poori shopping list 1 click me copy → supplier ko WhatsApp</TipRow>
            <TipRow><strong>💬 Green button</strong> — single product ka ready-made reminder message</TipRow>
            <TipRow><strong>Stock number pe click</strong> — foran stock add kar do</TipRow>
            <TipRow><strong>Order Qty</strong> — suggested: alert level × 3 (kam se kam 10)</TipRow>
            <TipRow><strong>⌨️ / dabao</strong> — search pe jump &nbsp;•&nbsp; <strong>Esc</strong> — sab band</TipRow>
          </div>

          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3 text-xs font-semibold text-slate-700 dark:text-slate-200">
            💡 <strong>Roz ki aadat:</strong> Subah dukaan kholte waqt ye page kholo → Order List WhatsApp karo → shaam tak maal aa jayega. Stock kabhi khatam nahi hoga!
          </div>

          <Button
            className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 font-extrabold shadow-lg shadow-amber-500/40 h-12"
            onClick={onClose}
          >
            <CheckCircle2 className="h-4 w-4" /> Samajh Gaya!
          </Button>
        </div>
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

function Th({ children, className = '' }: any) {
  return (
    <th className={`px-3 py-3 text-left text-[10px] font-extrabold uppercase tracking-wider ${className}`}>
      {children}
    </th>
  );
}

function Pill({ tone, children }: any) {
  const tones: Record<string, string> = {
    rose: 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300',
    amber: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300',
  };
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${tones[tone]}`}>{children}</span>;
}

function Kpi({ icon: Icon, label, value, sub, tone, onClick, active }: any) {
  const tones: Record<string, string> = {
    rose: 'from-rose-500 to-rose-700 shadow-rose-500/40',
    amber: 'from-amber-500 to-orange-600 shadow-amber-500/40',
    violet: 'from-violet-500 to-purple-700 shadow-violet-500/40',
    emerald: 'from-emerald-500 to-teal-600 shadow-emerald-500/40',
  };
  const Comp: any = onClick ? 'button' : 'div';
  return (
    <Comp
      onClick={onClick}
      className={[
        'rounded-2xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 p-3 sm:p-4 shadow-sm dark:shadow-black/20 text-left w-full transition-all',
        onClick ? 'hover:-translate-y-0.5 hover:shadow-md cursor-pointer' : '',
        active
          ? 'border-amber-500 dark:border-amber-500/60 ring-2 ring-amber-200 dark:ring-amber-500/20'
          : 'border-slate-200 dark:border-slate-800',
      ].join(' ')}
    >
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
    </Comp>
  );
}

function EmptyChart() {
  return (
    <div className="h-[260px] flex items-center justify-center text-sm text-slate-500 dark:text-slate-400 font-semibold">
      Koi data nahi
    </div>
  );
}
