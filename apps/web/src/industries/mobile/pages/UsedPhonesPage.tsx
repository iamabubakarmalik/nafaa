// apps/web/src/industries/mobile/pages/UsedPhonesPage.tsx
import { useState, useMemo, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  RefreshCw, Plus, Search, Smartphone, Star, TrendingUp,
  Package, AlertCircle, CheckCircle2, Wrench, ShoppingBag, XCircle,
  Trash2, Download, Sparkles, GraduationCap, ArrowRight,
  Clock, Trophy, X, BadgeDollarSign, ReceiptText,
  WifiOff, FileText, Eye, MessageCircle, BarChart3, List, Calendar,
} from 'lucide-react';
import { Button } from '@core/ui/Button';
import { formatPKR } from '@core/lib/format';
import { toast } from 'sonner';
import {
  usedPhonesApi,
  type UsedPhoneStatus,
  type UsedPhoneCondition,
  STATUS_LABELS,
  STATUS_COLORS,
  CONDITION_LABELS,
  CONDITION_COLORS,
} from '../api/used-phones.api';
import { UsedPhoneTradeInModal } from '../components/UsedPhoneTradeInModal';
import { UsedPhoneDetailsModal, TradeInReceipt } from '../components/UsedPhoneDetailsModal';
import { PtaStatusBadge } from '../components/PtaStatusBadge';
import { useAuthStore } from '@core/stores/auth.store';
import { PTA_STATUS_LABELS, type PtaStatus } from '../api/imei.api';

/* ═════════════════════════════════════════════════════════════
   NAFAA USED PHONES — TRADE-IN • FULL BEST v5
   ─────────────────────────────────────────────────────────────
   🖨️ Receipt DIRECT overlay (koi route navigation nahi — fixed)
   ✅ PTA filter real values (NON_PTA + PATCH + EXEMPT)
   👁️ Details modal • 📊 Analytics (date range)
   💬 WhatsApp • 🧾 Report print • 📡 Offline-aware
   🎓 Teacher • ⏳ Aging alerts • 🌙 Dark perfect
   ═════════════════════════════════════════════════════════════ */

type StatusFilter = 'ALL' | UsedPhoneStatus;
type PtaFilter = 'ALL' | PtaStatus;
type ViewMode = 'list' | 'analytics';

const STATUS_ICONS: Record<UsedPhoneStatus, any> = {
  PENDING_INSPECTION: AlertCircle,
  IN_STOCK: CheckCircle2,
  REPAIRING: Wrench,
  SOLD: ShoppingBag,
  RETURNED: RefreshCw,
  DISCARDED: XCircle,
};

const AGING_HOURS = 24;
const HOUR = 36e5;

const STATUS_BAR_COLORS: Record<UsedPhoneStatus, string> = {
  PENDING_INSPECTION: '#f59e0b',
  IN_STOCK: '#10b981',
  REPAIRING: '#3b82f6',
  SOLD: '#8b5cf6',
  RETURNED: '#f97316',
  DISCARDED: '#64748b',
};

const PTA_FILTER_OPTIONS: { v: PtaFilter; l: string }[] = [
  { v: 'ALL', l: '🛡️ PTA — Sab' },
  { v: 'APPROVED', l: '✅ PTA Approved' },
  { v: 'PATCH', l: '🔧 Patched' },
  { v: 'PENDING', l: '⏳ Pending' },
  { v: 'NON_PTA', l: '❌ Non-PTA' },
  { v: 'EXEMPT', l: '📋 Exempt' },
];

function useOnlineStatus() {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  return online;
}

/** PK phone → wa.me format (03xx → 923xx) */
export function toWhatsAppNumber(phone: string): string {
  let d = (phone || '').replace(/\D/g, '');
  if (d.startsWith('0')) d = '92' + d.slice(1);
  if (d.startsWith('3')) d = '92' + d;
  return d;
}

/** Trade-in confirmation message */
export function buildTradeInMsg(p: any, shopName?: string): string {
  return [
    `*${shopName || 'Nafaa Mobile'}* 📱`,
    `*Trade-In Confirmation*`,
    '─────────────────',
    `Code: *${p.usedPhoneCode}*`,
    `Phone: ${p.brand} ${p.model}${p.storage ? ` ${p.storage}` : ''}${p.color ? ` (${p.color})` : ''}`,
    `IMEI: ${p.imei1}`,
    `Condition: ${CONDITION_LABELS[p.condition as UsedPhoneCondition] ?? p.condition}`,
    `PTA: ${PTA_STATUS_LABELS[p.ptaStatus as PtaStatus] ?? p.ptaStatus}`,
    '─────────────────',
    `Buyback Amount: *${formatPKR(p.buybackPrice)}*`,
    `Date: ${new Date(p.receivedAt).toLocaleString('en-PK')}`,
    '',
    'Ye receipt aap ke trade-in ka saboot hai. Mehfooz rakhein. ✅',
    '_Powered by Nafaa POS_',
  ].join('\n');
}

export default function UsedPhonesPage() {
  const queryClient = useQueryClient();
  const tenantName = useAuthStore((s) => s.tenant?.name);
  const shopName = useAuthStore((s) => s.user?.assignedShop?.name);
  const isOnline = useOnlineStatus();

  const [view, setView] = useState<ViewMode>('list');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [conditionFilter, setConditionFilter] = useState<UsedPhoneCondition | 'ALL'>('ALL');
  const [ptaFilter, setPtaFilter] = useState<PtaFilter>('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTeacher, setShowTeacher] = useState(false);
  const [detailsPhone, setDetailsPhone] = useState<any | null>(null);
  const [receiptPhone, setReceiptPhone] = useState<any | null>(null);

  // Analytics date range — default: is mahine
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));

  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 200);
    return () => clearTimeout(t);
  }, [search]);

  const { data: stats } = useQuery({
    queryKey: ['used-phones-stats'],
    queryFn: usedPhonesApi.stats,
    placeholderData: keepPreviousData,
  });

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['used-phones', statusFilter, conditionFilter],
    queryFn: () =>
      usedPhonesApi.list({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        condition: conditionFilter === 'ALL' ? undefined : conditionFilter,
        limit: 500,
      }),
    placeholderData: keepPreviousData,
  });

  const phones = data?.items ?? [];

  const filtered = useMemo(() => {
    let list = phones;
    if (ptaFilter !== 'ALL') list = list.filter((p) => p.ptaStatus === ptaFilter);
    const q = debouncedSearch.toLowerCase();
    if (!q) return list;
    return list.filter(
      (p) =>
        p.usedPhoneCode.toLowerCase().includes(q) ||
        p.imei1.includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.model.toLowerCase().includes(q) ||
        (p.fromCustomerName || '').toLowerCase().includes(q) ||
        (p.fromCustomerPhone || '').includes(q),
    );
  }, [phones, debouncedSearch, ptaFilter]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['used-phones'] });
    queryClient.invalidateQueries({ queryKey: ['used-phones-stats'] });
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => usedPhonesApi.remove(id),
    onSuccess: () => { toast.success('Trade-in delete ho gaya'); setDetailsPhone(null); invalidate(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Delete fail hua'),
  });

  const markInStockMutation = useMutation({
    mutationFn: (id: string) => usedPhonesApi.markInStock(id),
    onSuccess: () => { toast.success('✓ In-stock mark ho gaya — ab bik sakta hai'); invalidate(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Fail hua'),
  });

  const statusCounts = useMemo(() => {
    const counts: Record<UsedPhoneStatus, number> = {
      PENDING_INSPECTION: 0, IN_STOCK: 0, REPAIRING: 0, SOLD: 0, RETURNED: 0, DISCARDED: 0,
    };
    stats?.byStatus.forEach((s) => { counts[s.status] = s.count; });
    return counts;
  }, [stats]);

  const agingPending = useMemo(() => {
    const now = Date.now();
    return phones.filter((p) =>
      p.status === 'PENDING_INSPECTION' &&
      (now - new Date(p.receivedAt).getTime()) / HOUR >= AGING_HOURS,
    );
  }, [phones]);

  const topBrand = useMemo(() => {
    const map = new Map<string, number>();
    phones.forEach((p) => map.set(p.brand, (map.get(p.brand) || 0) + 1));
    const arr = [...map.entries()].sort((a, b) => b[1] - a[1]);
    return arr[0] ? { name: arr[0][0], count: arr[0][1] } : null;
  }, [phones]);

  const bestDeal = useMemo(() => {
    const inStock = phones.filter((p) => p.status === 'IN_STOCK');
    if (inStock.length === 0) return null;
    return inStock.reduce((best, p) => {
      const profit = Number(p.resalePrice) - Number(p.totalCost);
      return profit > Number(best.resalePrice) - Number(best.totalCost) ? p : best;
    });
  }, [phones]);

  /* ═══ ANALYTICS — custom date range ═══ */
  const analytics = useMemo(() => {
    const from = new Date(dateFrom); from.setHours(0, 0, 0, 0);
    const to = new Date(dateTo); to.setHours(23, 59, 59, 999);
    const inRange = phones.filter((p) => {
      const d = new Date(p.receivedAt);
      return d >= from && d <= to;
    });
    const sold = inRange.filter((p) => p.status === 'SOLD');
    const totalBuyback = inRange.reduce((s, p) => s + Number(p.buybackPrice || 0), 0);
    const totalRefurbish = inRange.reduce((s, p) => s + Number(p.refurbishCost || 0), 0);
    const totalResale = sold.reduce((s, p) => s + Number(p.finalSoldPrice || p.resalePrice || 0), 0);
    const totalProfit = sold.reduce((s, p) => s + (Number(p.finalSoldPrice || p.resalePrice || 0) - Number(p.totalCost || 0)), 0);
    const expectedProfit = inRange
      .filter((p) => p.status === 'IN_STOCK')
      .reduce((s, p) => s + (Number(p.resalePrice || 0) - Number(p.totalCost || 0)), 0);

    const brandMap = new Map<string, { count: number; spent: number; profit: number }>();
    inRange.forEach((p) => {
      const b = brandMap.get(p.brand) || { count: 0, spent: 0, profit: 0 };
      b.count++;
      b.spent += Number(p.buybackPrice || 0);
      if (p.status === 'SOLD') b.profit += Number(p.finalSoldPrice || p.resalePrice || 0) - Number(p.totalCost || 0);
      brandMap.set(p.brand, b);
    });
    const byBrand = [...brandMap.entries()].sort((a, b) => b[1].count - a[1].count);

    const statusMap = new Map<UsedPhoneStatus, number>();
    inRange.forEach((p) => statusMap.set(p.status, (statusMap.get(p.status) || 0) + 1));
    const byStatus = [...statusMap.entries()].sort((a, b) => b[1] - a[1]);

    const avgProfit = sold.length > 0 ? totalProfit / sold.length : 0;

    return { inRange, sold, totalBuyback, totalRefurbish, totalResale, totalProfit, expectedProfit, byBrand, byStatus, avgProfit };
  }, [phones, dateFrom, dateTo]);

  const setDatePreset = (preset: 'today' | 'week' | 'month' | 'year' | 'all') => {
    const now = new Date();
    const to = now.toISOString().slice(0, 10);
    let from = to;
    if (preset === 'today') from = to;
    else if (preset === 'week') { const d = new Date(now); d.setDate(d.getDate() - 7); from = d.toISOString().slice(0, 10); }
    else if (preset === 'month') { const d = new Date(now); d.setDate(1); from = d.toISOString().slice(0, 10); }
    else if (preset === 'year') { const d = new Date(now); d.setMonth(0, 1); from = d.toISOString().slice(0, 10); }
    else { from = '2020-01-01'; }
    setDateFrom(from); setDateTo(to);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === 'Escape') {
        if (receiptPhone) setReceiptPhone(null);
        else if (showTeacher) setShowTeacher(false);
        else if (detailsPhone) setDetailsPhone(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showTeacher, detailsPhone, receiptPhone]);

  /* Scroll lock jab koi overlay khula ho */
  useEffect(() => {
    const anyOpen = !!(detailsPhone || receiptPhone || showTeacher || showAddModal);
    const prev = document.body.style.overflow;
    document.body.style.overflow = anyOpen ? 'hidden' : prev;
    return () => { document.body.style.overflow = prev; };
  }, [detailsPhone, receiptPhone, showTeacher, showAddModal]);

  /* CSV */
  const exportCSV = () => {
    if (filtered.length === 0) return toast.error('Koi data nahi');
    const summary = [
      [`Used Phones Report — ${tenantName || 'Nafaa'}`],
      [`Shop: ${shopName || 'All'}  •  Generated: ${new Date().toLocaleString('en-PK')}`],
      [`Total: ${filtered.length}  •  In Stock: ${statusCounts.IN_STOCK}  •  Pending: ${statusCounts.PENDING_INSPECTION}`],
      [''],
    ];
    const headers = ['Code', 'IMEI', 'Brand', 'Model', 'Condition', 'PTA', 'Status', 'Buyback', 'Refurbish', 'Total Cost', 'Resale', 'Customer', 'Phone', 'Date'];
    const rows = filtered.map((p) => [
      p.usedPhoneCode, p.imei1, p.brand, p.model, p.condition, p.ptaStatus, p.status,
      Number(p.buybackPrice).toFixed(2), Number(p.refurbishCost).toFixed(2),
      Number(p.totalCost).toFixed(2), Number(p.resalePrice).toFixed(2),
      p.fromCustomerName || '', p.fromCustomerPhone || '',
      new Date(p.receivedAt).toLocaleString('en-PK'),
    ]);
    const csv = [...summary, headers, ...rows]
      .map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `used-phones-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV download ho gaya');
  };

  const sendWhatsApp = (p: any) => {
    if (!p.fromCustomerPhone) return toast.error('Customer ka phone number nahi hai');
    window.open(`https://wa.me/${toWhatsAppNumber(p.fromCustomerPhone)}?text=${encodeURIComponent(buildTradeInMsg(p, tenantName || shopName))}`, '_blank');
    toast.success('WhatsApp khul raha hai...');
  };

  const handlePrint = () => window.print();
  const printDate = new Date().toLocaleString('en-PK', { dateStyle: 'full', timeStyle: 'short' });

  const hasFilters = !!search || statusFilter !== 'ALL' || conditionFilter !== 'ALL' || ptaFilter !== 'ALL';
  const clearFilters = () => { setSearch(''); setStatusFilter('ALL'); setConditionFilter('ALL'); setPtaFilter('ALL'); };

  return (
    <div className="space-y-4 sm:space-y-5 pb-8 print:space-y-0">
      {/* ═══ PRINT-ONLY: FULL REPORT TABLE ═══ */}
      {!receiptPhone && (
        <div className="hidden print:block">
        <div className="border-b-4 border-violet-600 pb-3 mb-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-slate-900 leading-tight">
                📱 {tenantName || 'My Store'} — Used Phones Report
              </h1>
              <p className="text-xs text-slate-600 font-semibold mt-1">
                {shopName ? `Shop: ${shopName}  •  ` : ''}{filtered.length} phones
                {statusFilter !== 'ALL' ? `  •  Status: ${STATUS_LABELS[statusFilter]}` : ''}
                {conditionFilter !== 'ALL' ? `  •  Condition: ${CONDITION_LABELS[conditionFilter]}` : ''}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">Generated: {printDate}</p>
            </div>
            {stats && (
              <div className="text-right text-xs font-bold text-slate-700 space-y-0.5 shrink-0">
                <div>In Stock: {statusCounts.IN_STOCK} ({formatPKR(stats.inStockResaleValue)})</div>
                <div>Sold: {stats.totalSold}</div>
                <div>Total Profit: <span className="text-emerald-700">{formatPKR(stats.totalProfit)}</span></div>
              </div>
            )}
          </div>
        </div>

        <table className="w-full text-[10px]" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Code', 'Phone', 'IMEI', 'Cond.', 'PTA', 'Status', 'Cost', 'Resale/Sold', 'Profit', 'Customer', 'Date'].map((h) => (
                <th key={h} className="text-left px-1.5 py-1.5 font-extrabold text-white" style={{ background: '#7c3aed', border: '1px solid #6d28d9', fontSize: 8 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, idx) => {
              const profit = (Number(p.finalSoldPrice) || Number(p.resalePrice)) - Number(p.totalCost);
              return (
                <tr key={p.id} style={{ background: idx % 2 ? '#faf5ff' : '#fff', pageBreakInside: 'avoid' }}>
                  <td className="px-1.5 py-1.5 font-mono font-bold" style={{ border: '1px solid #e2e8f0' }}>{p.usedPhoneCode}</td>
                  <td className="px-1.5 py-1.5 font-bold" style={{ border: '1px solid #e2e8f0' }}>{p.brand} {p.model}{p.storage ? ` ${p.storage}` : ''}</td>
                  <td className="px-1.5 py-1.5 font-mono" style={{ border: '1px solid #e2e8f0' }}>{p.imei1}</td>
                  <td className="px-1.5 py-1.5" style={{ border: '1px solid #e2e8f0' }}>{CONDITION_LABELS[p.condition as UsedPhoneCondition] ?? p.condition}</td>
                  <td className="px-1.5 py-1.5" style={{ border: '1px solid #e2e8f0' }}>{PTA_STATUS_LABELS[p.ptaStatus as PtaStatus] ?? p.ptaStatus}</td>
                  <td className="px-1.5 py-1.5" style={{ border: '1px solid #e2e8f0' }}>{STATUS_LABELS[p.status as UsedPhoneStatus] ?? p.status}</td>
                  <td className="px-1.5 py-1.5 tabular-nums" style={{ border: '1px solid #e2e8f0' }}>{formatPKR(p.totalCost)}</td>
                  <td className="px-1.5 py-1.5 tabular-nums font-bold" style={{ border: '1px solid #e2e8f0' }}>{formatPKR(p.finalSoldPrice || p.resalePrice)}</td>
                  <td className="px-1.5 py-1.5 tabular-nums font-bold" style={{ border: '1px solid #e2e8f0', color: profit >= 0 ? '#047857' : '#be123c' }}>{formatPKR(profit)}</td>
                  <td className="px-1.5 py-1.5" style={{ border: '1px solid #e2e8f0' }}>{p.fromCustomerName || '—'}</td>
                  <td className="px-1.5 py-1.5" style={{ border: '1px solid #e2e8f0' }}>{new Date(p.receivedAt).toLocaleDateString('en-PK')}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="mt-3 pt-2 text-center text-[9px] text-slate-500 font-semibold" style={{ borderTop: '2px solid #7c3aed' }}>
          ✦ Powered by <b>Nafaa POS</b> ✦
        </div>
      </div>
      )}

      {/* ═══ OFFLINE BANNER ═══ */}
      {!isOnline && (
        <div className="rounded-2xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-300 dark:border-amber-500/40 p-3 flex items-center gap-3 print:hidden">
          <WifiOff className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
          <div className="text-xs font-semibold text-amber-900 dark:text-amber-200">
            <strong>Offline mode</strong> — cached data dikh raha hai. Receipt print, WhatsApp aur CSV phir bhi kaam karengi. ✓
          </div>
        </div>
      )}

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-950 via-violet-900 to-fuchsia-700 dark:from-slate-950 dark:via-violet-950 dark:to-fuchsia-900 text-white p-4 sm:p-6 shadow-2xl print:hidden">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-violet-400/25 blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-fuchsia-400/20 blur-3xl pointer-events-none" />

        <div className="relative flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-3 py-1 text-[11px] font-extrabold border border-white/25 uppercase tracking-widest shadow-lg">
              <Smartphone className="h-3.5 w-3.5 text-fuchsia-300" /> Mobile Industry
              {shopName && (<><span className="opacity-40">•</span><span className="text-emerald-200">🏪 {shopName}</span></>)}
              {!isOnline && (<><span className="opacity-40">•</span><span className="inline-flex items-center gap-1 text-amber-300"><WifiOff className="h-3 w-3" /> Offline</span></>)}
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-tight">
              🔄 Used Phones — Trade-In
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-white/90 font-semibold">
              <strong className="text-emerald-300">{statusCounts.IN_STOCK}</strong> in stock
              <span className="opacity-50 mx-1.5">•</span>
              <strong className="text-amber-300">{statusCounts.PENDING_INSPECTION}</strong> pending
              {agingPending.length > 0 && (<><span className="opacity-50 mx-1.5">•</span><strong className="text-rose-300">⏳ {agingPending.length} 24h+ purane</strong></>)}
              {stats && stats.totalProfit != null && (<><span className="opacity-50 mx-1.5">•</span>Profit <strong className="text-emerald-300">{formatPKR(stats.totalProfit)}</strong></>)}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap items-center shrink-0">
            <button onClick={() => setShowTeacher(true)} className="h-11 px-3 rounded-xl bg-amber-400/90 hover:bg-amber-400 text-slate-900 text-xs font-extrabold inline-flex items-center gap-1.5 shadow-lg transition" title="Guide">
              <GraduationCap className="h-4 w-4" />
              <span className="hidden sm:inline">Guide</span>
            </button>
            <button onClick={() => refetch()} disabled={isRefetching} className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur-md disabled:opacity-50 transition">
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button onClick={exportCSV} disabled={filtered.length === 0} className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur-md disabled:opacity-50 transition" title="CSV report">
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">CSV</span>
            </button>
            <button onClick={handlePrint} disabled={filtered.length === 0} className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur-md disabled:opacity-50 transition" title="Poori list ka print">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Report</span>
            </button>
            <Button onClick={() => setShowAddModal(true)} className="bg-white text-violet-900 hover:bg-slate-100 font-extrabold shadow-2xl">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Naya Trade-In</span>
              <span className="sm:hidden">Naya</span>
            </Button>
          </div>
        </div>

        {/* View toggle */}
        <div className="relative mt-4 inline-flex rounded-xl bg-white/10 border border-white/20 backdrop-blur-md p-1">
          <button
            onClick={() => setView('list')}
            className={`inline-flex items-center gap-1.5 px-4 h-9 rounded-lg text-xs font-extrabold transition ${view === 'list' ? 'bg-white text-slate-900 shadow-lg' : 'text-white/70 hover:text-white'}`}
          >
            <List className="h-3.5 w-3.5" /> List
          </button>
          <button
            onClick={() => setView('analytics')}
            className={`inline-flex items-center gap-1.5 px-4 h-9 rounded-lg text-xs font-extrabold transition ${view === 'analytics' ? 'bg-white text-slate-900 shadow-lg' : 'text-white/70 hover:text-white'}`}
          >
            <BarChart3 className="h-3.5 w-3.5" /> Analytics
          </button>
        </div>

        {(topBrand || bestDeal) && phones.length > 0 && view === 'list' && (
          <div className="relative mt-3 flex flex-wrap gap-2">
            {topBrand && (
              <div className="inline-flex items-center gap-2 rounded-xl bg-white/10 border border-white/20 backdrop-blur-md px-3 py-2 text-xs font-extrabold">
                <Trophy className="h-4 w-4 text-amber-300" />
                <span className="text-white/70">Sab se zyada:</span>
                <span>{topBrand.name}</span>
                <span className="text-amber-300 tabular-nums">×{topBrand.count}</span>
              </div>
            )}
            {bestDeal && (
              <div className="inline-flex items-center gap-2 rounded-xl bg-white/10 border border-white/20 backdrop-blur-md px-3 py-2 text-xs font-extrabold">
                <BadgeDollarSign className="h-4 w-4 text-emerald-300" />
                <span className="text-white/70">Best deal:</span>
                <span className="truncate max-w-[160px]">{bestDeal.brand} {bestDeal.model}</span>
                <span className="text-emerald-300 tabular-nums">+{formatPKR(Number(bestDeal.resalePrice) - Number(bestDeal.totalCost))}</span>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ═══ TEACHER ═══ */}
      {showTeacher && (
        <TradeInTeacher
          hasPhones={phones.length > 0}
          onClose={() => setShowTeacher(false)}
          onStart={() => { setShowTeacher(false); setShowAddModal(true); }}
        />
      )}

      {/* ═══ DETAILS MODAL ═══ */}
      {detailsPhone && (
        <UsedPhoneDetailsModal
          phone={detailsPhone}
          shopName={tenantName || shopName}
          onClose={() => setDetailsPhone(null)}
          onUpdated={() => { invalidate(); }}
          onDeleted={() => { setDetailsPhone(null); invalidate(); }}
        />
      )}

      {/* ═══ RECEIPT — DIRECT overlay, koi navigation nahi ═══ */}
      {receiptPhone && (
        <TradeInReceipt phone={receiptPhone} onClose={() => setReceiptPhone(null)} />
      )}

      {/* ═══ AGING ALERT ═══ */}
      {agingPending.length > 0 && view === 'list' && (
        <section className="rounded-2xl border-2 border-rose-300 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-500/10 p-3 sm:p-4 print:hidden">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 text-white flex items-center justify-center shadow-lg shadow-rose-500/40 shrink-0">
              <Clock className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-extrabold text-sm text-rose-900 dark:text-rose-200">
                ⏳ {agingPending.length} phone{agingPending.length > 1 ? 's' : ''} 24+ ghante se inspection ka intezaar mein!
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {agingPending.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setDetailsPhone(p)}
                    className="inline-flex items-center gap-1 rounded-lg bg-white dark:bg-slate-800 border border-rose-300 dark:border-rose-500/40 px-2 py-1 text-[11px] font-extrabold text-rose-800 dark:text-rose-300 hover:border-rose-500 transition"
                  >
                    {p.brand} {p.model}
                    <span className="text-rose-500 dark:text-rose-400 font-mono">{p.usedPhoneCode}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ══════════════════ LIST VIEW ══════════════════ */}
      {view === 'list' && (
        <>
          {stats && (
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 print:hidden">
              <Kpi label="In Stock" value={statusCounts.IN_STOCK} sub="Bikne ke liye ready" icon={Package} tone="emerald" />
              <Kpi label="Stock Value" value={formatPKR(stats.inStockResaleValue)} sub="Resale ke hisaab se" icon={TrendingUp} tone="blue" />
              <Kpi label="Total Sold" value={stats.totalSold} sub="Ab tak bike" icon={ShoppingBag} tone="violet" />
              <Kpi label="Total Profit" value={formatPKR(stats.totalProfit)} sub="Trade-in kamaai" icon={Sparkles} tone="amber" />
            </section>
          )}

          <section className="flex gap-1.5 overflow-x-auto pb-1 print:hidden">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`shrink-0 px-3 h-10 rounded-xl text-xs font-extrabold transition border-2 ${statusFilter === 'ALL' ? 'bg-violet-600 text-white border-violet-600 shadow-md' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-violet-300'}`}
            >
              Sab <span className="tabular-nums opacity-70">({phones.length})</span>
            </button>
            {(['PENDING_INSPECTION', 'IN_STOCK', 'REPAIRING', 'SOLD', 'RETURNED', 'DISCARDED'] as UsedPhoneStatus[]).map((status) => {
              const Icon = STATUS_ICONS[status];
              const active = statusFilter === status;
              const count = statusCounts[status];
              if (count === 0 && statusFilter !== status) return null;
              const colors = STATUS_COLORS[status];
              return (
                <button
                  key={status}
                  onClick={() => setStatusFilter(active ? 'ALL' : status)}
                  className={`shrink-0 inline-flex items-center gap-1 px-3 h-10 rounded-xl text-xs font-extrabold border-2 transition ${active ? `${colors.bg} ${colors.text} border-current shadow-md` : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-violet-300'}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {STATUS_LABELS[status]}
                  <span className="tabular-nums opacity-70">({count})</span>
                </button>
              );
            })}
          </section>

          <section className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm p-4 print:hidden">
            <div className="flex gap-2 flex-wrap items-center">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  ref={searchRef}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Code / IMEI / brand / model / customer... (/ shortcut)"
                  className="h-12 w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-11 pr-10 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:focus:ring-violet-500/30 transition"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center">
                    <X className="h-4 w-4 text-slate-400" />
                  </button>
                )}
              </div>

              <select value={conditionFilter} onChange={(e) => setConditionFilter(e.target.value as UsedPhoneCondition | 'ALL')} className="h-12 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs font-extrabold text-slate-900 dark:text-white focus:outline-none focus:border-violet-500 transition">
                <option value="ALL">⭐ Sab Conditions</option>
                {(['EXCELLENT', 'VERY_GOOD', 'GOOD', 'FAIR', 'POOR'] as UsedPhoneCondition[]).map((c) => (
                  <option key={c} value={c}>{CONDITION_LABELS[c]}</option>
                ))}
              </select>

              <select value={ptaFilter} onChange={(e) => setPtaFilter(e.target.value as PtaFilter)} className="h-12 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs font-extrabold text-slate-900 dark:text-white focus:outline-none focus:border-violet-500 transition">
                {PTA_FILTER_OPTIONS.map((o) => (
                  <option key={o.v} value={o.v}>{o.l}</option>
                ))}
              </select>

              {hasFilters && (
                <button onClick={clearFilters} className="text-xs font-extrabold text-rose-600 dark:text-rose-400 hover:text-rose-700 inline-flex items-center gap-1">
                  <X className="h-3 w-3" /> Clear
                </button>
              )}

              <div className="ml-auto text-xs font-extrabold text-slate-500 dark:text-slate-400 tabular-nums">
                {filtered.length} phones
              </div>
            </div>
          </section>

          <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden print:hidden">
            {isLoading ? (
              <div className="p-4 space-y-2">
                {[1, 2, 3].map((i) => <div key={i} className="h-28 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-12 sm:p-16 text-center">
                <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-violet-500 to-fuchsia-700 mx-auto flex items-center justify-center shadow-lg shadow-violet-500/40">
                  <Smartphone className="h-10 w-10 text-white" />
                </div>
                <h3 className="mt-4 text-lg font-extrabold text-slate-900 dark:text-white">
                  {hasFilters ? 'Is filter mein koi phone nahi' : 'Abhi koi trade-in nahi 📱'}
                </h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 font-semibold max-w-md mx-auto">
                  {hasFilters ? 'Filters badal ke dekho ya search clear karo' : 'Customer ka purana phone lo, inspect karo, resale price lagao — aur profit kamao'}
                </p>
                {hasFilters ? (
                  <Button variant="secondary" className="mt-4 font-extrabold" onClick={clearFilters}>
                    <X className="h-4 w-4" /> Filters Clear Karo
                  </Button>
                ) : (
                  <div className="mt-4 flex gap-2 justify-center flex-wrap">
                    <Button variant="secondary" className="font-extrabold" onClick={() => setShowTeacher(true)}>
                      <GraduationCap className="h-4 w-4" /> Pehle Seekh Lo
                    </Button>
                    <Button className="bg-gradient-to-r from-violet-600 to-fuchsia-700 hover:from-violet-700 hover:to-fuchsia-800 font-extrabold shadow-lg shadow-violet-500/40" onClick={() => setShowAddModal(true)}>
                      <Plus className="h-4 w-4" /> Pehla Trade-In
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="divide-y-2 divide-slate-100 dark:divide-slate-800">
                {filtered.map((phone) => (
                  <PhoneRow
                    key={phone.id}
                    phone={phone}
                    onDetails={() => setDetailsPhone(phone)}
                    onWhatsApp={() => sendWhatsApp(phone)}
                    onPrintReceipt={() => setReceiptPhone(phone)}
                    onMarkInStock={() => {
                      if (confirm(`"${phone.brand} ${phone.model}" in-stock mark karein?`)) markInStockMutation.mutate(phone.id);
                    }}
                    onDelete={() => {
                      if (confirm(`"${phone.usedPhoneCode}" delete karein?`)) deleteMutation.mutate(phone.id);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ══════════════════ ANALYTICS VIEW ══════════════════ */}
      {view === 'analytics' && (
        <div className="space-y-4 print:hidden">
          <section className="rounded-2xl bg-white dark:bg-slate-900/80 border-2 border-slate-200 dark:border-slate-800 shadow-sm p-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Calendar className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              <span className="text-sm font-extrabold text-slate-900 dark:text-white">Date Range:</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-10 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-violet-500"
              />
              <span className="text-slate-400 font-bold">→</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-10 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-violet-500"
              />
              <div className="flex gap-1 flex-wrap">
                {([['today', 'Aaj'], ['week', '7 Din'], ['month', 'Mahina'], ['year', 'Saal'], ['all', 'Sab']] as const).map(([p, l]) => (
                  <button key={p} onClick={() => setDatePreset(p)} className="px-2.5 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-violet-100 dark:hover:bg-violet-500/20 text-[11px] font-extrabold text-slate-700 dark:text-slate-300 transition">
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            <Kpi label="Trade-Ins Liye" value={analytics.inRange.length} sub={`${dateFrom} → ${dateTo}`} icon={Smartphone} tone="violet" />
            <Kpi label="Total Lagaya" value={formatPKR(analytics.totalBuyback + analytics.totalRefurbish)} sub={`Buyback ${formatPKR(analytics.totalBuyback)} + repair ${formatPKR(analytics.totalRefurbish)}`} icon={TrendingUp} tone="blue" />
            <Kpi label="Bike (Sold)" value={analytics.sold.length} sub={`${formatPKR(analytics.totalResale)} ki sale`} icon={ShoppingBag} tone="emerald" />
            <Kpi label="Profit (Sold)" value={formatPKR(analytics.totalProfit)} sub={analytics.sold.length > 0 ? `Avg ${formatPKR(analytics.avgProfit)} / phone` : 'Koi sale nahi'} icon={Sparkles} tone="amber" />
          </section>

          {analytics.expectedProfit > 0 && (
            <div className="rounded-2xl border-2 border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10 p-3 text-xs font-extrabold text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
              <BadgeDollarSign className="h-4 w-4 shrink-0" />
              Stock mein pare phones ka expected profit: {formatPKR(analytics.expectedProfit)} — ye ane wali kamaai hai! 🚀
            </div>
          )}

          <div className="grid lg:grid-cols-2 gap-4">
            <section className="rounded-2xl bg-white dark:bg-slate-900/80 border-2 border-slate-200 dark:border-slate-800 shadow-sm p-5">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-500" /> Brand Breakdown
              </h3>
              {analytics.byBrand.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold">Is range mein koi trade-in nahi</p>
              ) : (
                <div className="space-y-2.5">
                  {analytics.byBrand.map(([brand, d]) => {
                    const max = analytics.byBrand[0][1].count;
                    return (
                      <div key={brand}>
                        <div className="flex items-center justify-between text-xs font-extrabold mb-1">
                          <span className="text-slate-900 dark:text-white">{brand}</span>
                          <span className="text-slate-500 dark:text-slate-400 tabular-nums">
                            {d.count} phones • {formatPKR(d.spent)} lagaya{d.profit !== 0 && <span className="text-emerald-600 dark:text-emerald-400"> • +{formatPKR(d.profit)}</span>}
                          </span>
                        </div>
                        <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all" style={{ width: `${(d.count / max) * 100}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="rounded-2xl bg-white dark:bg-slate-900/80 border-2 border-slate-200 dark:border-slate-800 shadow-sm p-5">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-violet-500" /> Status Breakdown
              </h3>
              {analytics.byStatus.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold">Is range mein koi trade-in nahi</p>
              ) : (
                <div className="space-y-2.5">
                  {analytics.byStatus.map(([status, count]) => {
                    const max = analytics.byStatus[0][1];
                    const Icon = STATUS_ICONS[status];
                    return (
                      <div key={status}>
                        <div className="flex items-center justify-between text-xs font-extrabold mb-1">
                          <span className="text-slate-900 dark:text-white inline-flex items-center gap-1.5">
                            <Icon className="h-3.5 w-3.5" style={{ color: STATUS_BAR_COLORS[status] }} />
                            {STATUS_LABELS[status]}
                          </span>
                          <span className="text-slate-500 dark:text-slate-400 tabular-nums">{count}</span>
                        </div>
                        <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${(count / max) * 100}%`, background: STATUS_BAR_COLORS[status] }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          <section className="rounded-2xl bg-white dark:bg-slate-900/80 border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b-2 border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Is Range ke Trade-Ins ({analytics.inRange.length})</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Kisi bhi row pe click karo — poori details khulegi</p>
            </div>
            {analytics.inRange.length === 0 ? (
              <p className="p-8 text-center text-sm text-slate-500 dark:text-slate-400 font-semibold">Is date range mein koi record nahi — range badal ke dekho</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {analytics.inRange.map((p) => {
                  const profit = (Number(p.finalSoldPrice) || Number(p.resalePrice)) - Number(p.totalCost);
                  const colors = STATUS_COLORS[p.status as UsedPhoneStatus];
                  return (
                    <button
                      key={p.id}
                      onClick={() => setDetailsPhone(p)}
                      className="w-full px-4 sm:px-5 py-3 flex items-center gap-3 hover:bg-violet-50/50 dark:hover:bg-violet-500/5 transition text-left"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-extrabold text-xs text-violet-700 dark:text-violet-300">{p.usedPhoneCode}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold ${colors.bg} ${colors.text}`}>{STATUS_LABELS[p.status as UsedPhoneStatus]}</span>
                        </div>
                        <div className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5">{p.brand} {p.model}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                          {new Date(p.receivedAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                          {p.fromCustomerName && ` • ${p.fromCustomerName}`}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-extrabold text-slate-900 dark:text-white tabular-nums">{formatPKR(p.finalSoldPrice || p.resalePrice)}</div>
                        <div className={`text-[10px] font-extrabold tabular-nums ${profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          {profit >= 0 ? '+' : ''}{formatPKR(profit)}
                        </div>
                      </div>
                      <Eye className="h-4 w-4 text-slate-400 shrink-0" />
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {showAddModal && (
        <UsedPhoneTradeInModal onClose={() => { setShowAddModal(false); invalidate(); }} />
      )}

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
          section, div { box-shadow: none !important; }
          [class*="fixed"]:not(.ti-print-shell) { display: none !important; }
          [class*="sticky"] { display: none !important; }
          html, body, #root { height: auto !important; min-height: 0 !important; overflow: visible !important; }
          [class*="sidebar"], [class*="topbar"], nav { display: none !important; }
          thead { display: table-header-group !important; }
          tr { page-break-inside: avoid !important; }
          [data-sonner-toaster], [data-sonner-toast] { display: none !important; visibility: hidden !important; }
        }
      `}</style>
    </div>
  );
}

/* ═══ PHONE ROW ═══ */
function PhoneRow({ phone, onDetails, onWhatsApp, onPrintReceipt, onMarkInStock, onDelete }: {
  phone: any;
  onDetails: () => void;
  onWhatsApp: () => void;
  onPrintReceipt: () => void;
  onMarkInStock: () => void;
  onDelete: () => void;
}) {
  const status = phone.status as UsedPhoneStatus;
  const condition = phone.condition as UsedPhoneCondition;
  const StatusIcon = STATUS_ICONS[status];
  const statusColors = STATUS_COLORS[status];
  const conditionColors = CONDITION_COLORS[condition];
  const profit = (Number(phone.finalSoldPrice) || Number(phone.resalePrice)) - Number(phone.totalCost);
  const marginPct = Number(phone.totalCost) > 0 ? (profit / Number(phone.totalCost)) * 100 : 0;

  const ageHours = (Date.now() - new Date(phone.receivedAt).getTime()) / HOUR;
  const isAging = status === 'PENDING_INSPECTION' && ageHours >= AGING_HOURS;
  const ageLabel = ageHours >= 24 ? `${Math.floor(ageHours / 24)} din` : `${Math.floor(ageHours)}h`;

  return (
    <div
      className={`p-4 hover:bg-violet-50/40 dark:hover:bg-violet-500/5 transition cursor-pointer ${isAging ? 'bg-rose-50/50 dark:bg-rose-500/5' : ''}`}
      onClick={onDetails}
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className={[
            'h-12 w-12 rounded-xl flex items-center justify-center shrink-0 shadow-md',
            status === 'IN_STOCK' ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-emerald-500/40'
            : status === 'SOLD' ? 'bg-gradient-to-br from-violet-500 to-purple-700 text-white shadow-violet-500/40'
            : 'bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300',
          ].join(' ')}>
            <Smartphone className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-mono font-extrabold text-sm text-violet-700 dark:text-violet-300">{phone.usedPhoneCode}</span>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider inline-flex items-center gap-1 ${statusColors.bg} ${statusColors.text}`}>
                <StatusIcon className="h-2.5 w-2.5" />
                {STATUS_LABELS[status]}
              </span>
              <span className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold border ${conditionColors.bg} ${conditionColors.text} ${conditionColors.border}`}>
                <Star className="h-2.5 w-2.5 inline mr-0.5 fill-current" />
                {CONDITION_LABELS[condition]}
              </span>
              <PtaStatusBadge status={phone.ptaStatus as PtaStatus} size="sm" />
              {isAging && (
                <span className="px-2 py-0.5 rounded-md text-[9px] font-extrabold bg-rose-600 text-white uppercase tracking-wider inline-flex items-center gap-1 animate-pulse">
                  <Clock className="h-2.5 w-2.5" /> {ageLabel} pending
                </span>
              )}
            </div>

            <div className="mt-1 font-extrabold text-slate-900 dark:text-white text-sm">
              {phone.brand} {phone.model}
              {phone.storage && <span className="text-slate-500 dark:text-slate-400 font-bold"> · {phone.storage}</span>}
              {phone.color && <span className="text-violet-700 dark:text-violet-400 font-bold"> · {phone.color}</span>}
              {phone.modelYear && <span className="text-slate-500 dark:text-slate-400 font-bold"> · {phone.modelYear}</span>}
            </div>

            <div className="mt-1 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-bold flex-wrap">
              <span className="font-mono">IMEI: {phone.imei1}</span>
              {phone.fromCustomerName && (
                <>
                  <span className="text-slate-300 dark:text-slate-600">•</span>
                  <span>From: <strong className="text-slate-700 dark:text-slate-200">{phone.fromCustomerName}</strong>
                    {phone.fromCustomerPhone && <span className="font-mono"> {phone.fromCustomerPhone}</span>}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="text-right shrink-0" onClick={(e) => e.stopPropagation()}>
          <div className="text-lg font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums leading-none">
            {formatPKR(phone.finalSoldPrice || phone.resalePrice)}
          </div>
          <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
            Cost: {formatPKR(phone.totalCost)}
            {phone.refurbishCost > 0 && <span className="text-orange-600 dark:text-orange-400"> (+{formatPKR(phone.refurbishCost)} repair)</span>}
          </div>
          <div className={`text-[11px] font-extrabold tabular-nums ${profit >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
            {status === 'SOLD' ? '💰 Profit' : '📈 Expected'}: {formatPKR(profit)}
            <span className="opacity-70 ml-1">({marginPct.toFixed(0)}%)</span>
          </div>

          <div className="mt-2 flex gap-1 justify-end flex-wrap">
            <button
              onClick={onDetails}
              title="Details + Edit"
              className="h-9 px-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-extrabold inline-flex items-center gap-1 transition"
            >
              <Eye className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Details</span>
            </button>
            {phone.fromCustomerPhone && (
              <button
                onClick={onWhatsApp}
                title="Customer ko WhatsApp confirmation bhejo"
                className="h-9 w-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 hover:bg-emerald-100 dark:hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 flex items-center justify-center transition"
              >
                <MessageCircle className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              onClick={onPrintReceipt}
              title="Receipt print"
              className={`h-9 px-2.5 rounded-xl text-xs font-extrabold inline-flex items-center gap-1 transition ${
                status === 'SOLD'
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/30'
                  : 'bg-blue-50 dark:bg-blue-500/15 hover:bg-blue-100 dark:hover:bg-blue-500/25 text-blue-700 dark:text-blue-400'
              }`}
            >
              <ReceiptText className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Receipt</span>
            </button>
            {status === 'PENDING_INSPECTION' && (
              <button onClick={onMarkInStock} className="h-9 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold inline-flex items-center gap-1 shadow-md shadow-emerald-500/30 transition">
                <CheckCircle2 className="h-3.5 w-3.5" /> In-Stock
              </button>
            )}
            {status !== 'SOLD' && (
              <button onClick={onDelete} title="Delete" className="h-9 w-9 rounded-xl bg-rose-50 dark:bg-rose-500/15 hover:bg-rose-100 dark:hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 flex items-center justify-center transition">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══ TEACHER ═══ */
function TradeInTeacher({ hasPhones, onClose, onStart }: {
  hasPhones: boolean; onClose: () => void; onStart: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-violet-300 dark:border-violet-500/40 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3 border-b-2 border-violet-200 dark:border-violet-500/30 bg-gradient-to-r from-violet-50 to-fuchsia-50 dark:from-violet-500/15 dark:to-fuchsia-500/15 flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-extrabold text-violet-900 dark:text-violet-200 flex items-center gap-2">
            <GraduationCap className="h-5 w-5" /> Trade-In Kaise Kaam Karta Hai?
          </h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-relaxed">
            Customer ka <strong>purana phone</strong> khareed lo (buyback), thora <strong>repair</strong> karwao agar zaroorat ho,
            phir <strong>naye daam pe becho</strong> — beech ka farq aap ka <strong>profit</strong>! 💰
          </p>

          <div className="rounded-2xl border-2 border-violet-200 dark:border-violet-500/30 bg-violet-50/60 dark:bg-violet-500/5 p-4 space-y-3">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-violet-700 dark:text-violet-300">📱 Misal: iPhone 11 Trade-In</div>
            <div className="flex items-center gap-2 flex-wrap">
              <FlowBox emoji="🤝" label="Buyback" value="Rs 45,000" sub="customer ko diye" />
              <ArrowRight className="h-4 w-4 text-violet-500 shrink-0" />
              <FlowBox emoji="🔧" label="Repair" value="+ Rs 2,000" sub="battery change" />
              <ArrowRight className="h-4 w-4 text-violet-500 shrink-0" />
              <FlowBox emoji="💵" label="Resale" value="Rs 55,000" sub="naye customer ko" highlight />
            </div>
            <div className="rounded-xl bg-emerald-100 dark:bg-emerald-500/15 border-2 border-emerald-300 dark:border-emerald-500/40 p-2.5 text-center">
              <span className="text-sm font-extrabold text-emerald-800 dark:text-emerald-300">💰 Profit: Rs 8,000 <span className="opacity-70">(55,000 − 47,000)</span></span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <TeacherStep emoji="📝" title="Trade-In" desc="IMEI + condition + customer + buyback" />
            <TeacherStep emoji="🔍" title="Inspect" desc="Check karo → 'In-Stock' mark karo" />
            <TeacherStep emoji="💰" title="Becho" desc="Sell karo → receipt print do" />
          </div>

          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3 space-y-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <TeacherTip><strong>Row pe click</strong> = poori details + edit + WhatsApp + receipt sab ek jagah</TeacherTip>
            <TeacherTip><strong>🖨️ Receipt</strong> button se seedha print overlay khulti hai — kahin navigate nahi hota</TeacherTip>
            <TeacherTip><strong>💬 WhatsApp</strong> button se customer ko confirmation msg jata hai (IMEI proof)</TeacherTip>
            <TeacherTip><strong>📊 Analytics</strong> tab mein custom date range — kab kitna liya, kitna kamaya</TeacherTip>
            <TeacherTip><strong>IMEI lazmi</strong> likho — chori ka phone aaye to record hoga</TeacherTip>
            <TeacherTip><strong>⏳ 24h+ pending</strong> phones pe red alert — inspection mat bhoolo</TeacherTip>
          </div>

          <Button className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-700 hover:from-violet-700 hover:to-fuchsia-800 font-extrabold shadow-lg shadow-violet-500/40 h-12" onClick={onStart}>
            <Smartphone className="h-4 w-4" />
            {hasPhones ? 'Samajh Gaya — Naya Trade-In!' : 'Samajh Gaya — Pehla Trade-In!'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function FlowBox({ emoji, label, value, sub, highlight }: {
  emoji: string; label: string; value: string; sub: string; highlight?: boolean;
}) {
  return (
    <div className={`rounded-xl border-2 px-3 py-2 text-center min-w-[90px] ${highlight ? 'border-emerald-500 bg-white dark:bg-slate-800 shadow-md' : 'border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/60'}`}>
      <div className="text-xl">{emoji}</div>
      <div className="text-[10px] font-extrabold text-slate-900 dark:text-white uppercase">{label}</div>
      <div className={`text-xs font-extrabold tabular-nums ${highlight ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}`}>{value}</div>
      <div className="text-[9px] font-bold text-slate-500 dark:text-slate-400">{sub}</div>
    </div>
  );
}

function TeacherStep({ emoji, title, desc }: { emoji: string; title: string; desc: string }) {
  return (
    <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-2.5">
      <div className="text-xl">{emoji}</div>
      <div className="text-[11px] font-extrabold text-slate-900 dark:text-white mt-1">{title}</div>
      <div className="text-[9px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">{desc}</div>
    </div>
  );
}

function TeacherTip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  );
}

function Kpi({ label, value, sub, icon: Icon, tone }: any) {
  const tones: Record<string, string> = {
    emerald: 'from-emerald-500 to-teal-600 shadow-emerald-500/40',
    blue:    'from-blue-500 to-blue-700 shadow-blue-500/40',
    violet:  'from-violet-500 to-fuchsia-600 shadow-violet-500/40',
    amber:   'from-amber-500 to-orange-600 shadow-amber-500/40',
  };
  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 p-3 sm:p-4 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-extrabold">{label}</div>
          <div className="mt-1.5 text-lg sm:text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums truncate">{value}</div>
          {sub && <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-0.5 truncate" title={sub}>{sub}</div>}
        </div>
        <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-lg shrink-0`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
