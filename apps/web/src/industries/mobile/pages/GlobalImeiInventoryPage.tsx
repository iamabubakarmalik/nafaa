// src/industries/mobile/pages/GlobalImeiInventoryPage.tsx
import { useMemo, useState, useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Smartphone, Search, Download, RefreshCw, ShieldCheck,
  Package, CheckCircle2, ExternalLink, Trash2, ScanLine,
  GraduationCap, X, Keyboard, Printer, AlertOctagon,
  AlertTriangle, Clock, Shield, XCircle, DollarSign,
  Plus, ArrowLeft, Store, Layers,
} from 'lucide-react';
import { Button } from '@core/ui/Button';
import { formatPKR } from '@core/lib/format';
import { toast } from 'sonner';
import {
  imeiApi,
  type PtaStatus,
  type ImeiStatus,
  PTA_STATUS_LABELS,
  PTA_STATUS_COLORS,
} from '../api/imei.api';
import { PtaStatusBadge } from '../components/PtaStatusBadge';
import { BulkImeiAddModal } from '../components/BulkImeiAddModal';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { shopsApi } from '@modules/organization/shops/api/shops.api';
import { useAuthStore } from '@core/stores/auth.store';

/* ═════════════════════════════════════════════════════════════
   NAFAA IMEI INVENTORY — ek hi page, do kaam
   ─────────────────────────────────────────────────────────────
   /imei-inventory        → poori dukan ke saare device
   /products/:id/imei     → sirf us product ke device
   Pehle ye do alag pages the — ab ek hi, is liye har feature
   (teacher, print, bulk select, shop filter) dono jagah milta hai.
   🌙 Dark mode complete
   🎓 Teacher — "IMEI inventory kaise use karein"
   🛡️ PTA breakdown — clickable filter chips
   ☑️ Bulk select — delete + CSV export
   ⌨️  / search focus • Esc close
   🖨️ Print report (A4 landscape)
   📊 Hero live stats
   ═════════════════════════════════════════════════════════════ */

type StatusFilter = 'ALL' | ImeiStatus;
type PtaFilter = 'ALL' | PtaStatus;

const PTA_ICONS: Record<PtaStatus, any> = {
  APPROVED: CheckCircle2,
  NON_PTA: AlertOctagon,
  PATCH: AlertTriangle,
  PENDING: Clock,
  EXEMPT: Shield,
};

const STATUS_ICONS: Record<string, any> = {
  IN_STOCK: CheckCircle2,
  SOLD: Package,
  RETURNED: RefreshCw,
  DAMAGED: XCircle,
  RESERVED: Clock,
  LOST: AlertOctagon,
};

export default function GlobalImeiInventoryPage() {
  // `:id` mile to sirf usi product ke IMEI — warna poori dukan
  const { id: scopedProductId } = useParams();
  const isScoped = Boolean(scopedProductId);

  const queryClient = useQueryClient();
  const tenantName = useAuthStore((s) => s.tenant?.name);
  const shopName = useAuthStore((s) => s.user?.assignedShop?.name);
  const searchRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('IN_STOCK');
  const [ptaFilter, setPtaFilter] = useState<PtaFilter>('ALL');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showTeacher, setShowTeacher] = useState(false);
  const [shopFilter, setShopFilter] = useState<string>('ALL');
  const [showBulkAdd, setShowBulkAdd] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 200);
    return () => clearTimeout(t);
  }, [search]);

  const { data: stats, refetch: refetchStats, isRefetching } = useQuery({
    queryKey: ['imei-global-stats'],
    queryFn: imeiApi.stats,
  });

  /* Scoped mode: product ka naam/price header me dikhane ke liye */
  const { data: product } = useQuery({
    queryKey: ['product', scopedProductId],
    queryFn: () => productsApi.getOne(scopedProductId!),
    enabled: isScoped,
  });

  const { data: shops = [] } = useQuery({
    queryKey: ['shops'],
    queryFn: () => shopsApi.list(),
  });

  const { data: listData, isLoading, refetch } = useQuery({
    queryKey: ['imei-global-list', statusFilter, ptaFilter, shopFilter, scopedProductId],
    queryFn: () =>
      imeiApi.listAll({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        ptaStatus: ptaFilter === 'ALL' ? undefined : ptaFilter,
        shopId: shopFilter === 'ALL' ? undefined : shopFilter,
        productId: scopedProductId,
        limit: 500,
      }),
  });

  const imeis = listData?.items ?? [];

  const filtered = useMemo(() => {
    const q = debouncedSearch.toLowerCase();
    if (!q) return imeis;
    return imeis.filter((i: any) =>
      i.imei1?.includes(q) ||
      i.imei2?.includes(q) ||
      i.serialNumber?.toLowerCase().includes(q) ||
      i.color?.toLowerCase().includes(q) ||
      i.product?.name?.toLowerCase().includes(q) ||
      i.product?.brand?.name?.toLowerCase().includes(q),
    );
  }, [imeis, debouncedSearch]);

  const ptaBreakdown = useMemo(() => {
    const map: Record<PtaStatus, number> = { APPROVED: 0, NON_PTA: 0, PATCH: 0, PENDING: 0, EXEMPT: 0 };
    stats?.byPta?.forEach((p: any) => { map[p.ptaStatus as PtaStatus] = p.count; });
    return map;
  }, [stats]);

  const recalcMutation = useMutation({
    mutationFn: imeiApi.recalcStocks,
    onSuccess: (data) => {
      toast.success(`✓ ${data.message} — ${data.productsUpdated} products, ${data.variantsUpdated} variants`);
      queryClient.invalidateQueries({ queryKey: ['imei-global-stats'] });
      queryClient.invalidateQueries({ queryKey: ['imei-global-list'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products-for-pos'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Recalc fail hua'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => imeiApi.remove(id),
    onSuccess: () => {
      toast.success('✓ IMEI delete ho gaya');
      queryClient.invalidateQueries({ queryKey: ['imei-global-list'] });
      queryClient.invalidateQueries({ queryKey: ['imei-global-stats'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Delete fail hua'),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await Promise.allSettled(ids.map((id) => imeiApi.remove(id)));
      return {
        ok: res.filter((r) => r.status === 'fulfilled').length,
        fail: res.length - res.filter((r) => r.status === 'fulfilled').length,
      };
    },
    onSuccess: ({ ok, fail }) => {
      if (ok) toast.success(`✓ ${ok} IMEIs delete ho gaye`);
      if (fail) toast.error(`${fail} fail huay (SOLD IMEIs delete nahi ho saktin)`);
      setSelected(new Set());
      queryClient.invalidateQueries({ queryKey: ['imei-global-list'] });
      queryClient.invalidateQueries({ queryKey: ['imei-global-stats'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: () => toast.error('Bulk delete fail'),
  });

  const exportCSV = (rows: any[]) => {
    if (rows.length === 0) return toast.error('Koi data nahi');
    const summary = [
      [`IMEI Inventory Report — ${tenantName || 'Nafaa'}`],
      [`Shop: ${shopName || 'All'}  •  Generated: ${new Date().toLocaleString('en-PK')}  •  Total: ${rows.length}`],
      [''],
    ];
    const headers = ['IMEI 1', 'IMEI 2', 'Serial', 'Product', 'Brand', 'Variant', 'Color', 'Status', 'PTA', 'PTA Tax', 'Cost', 'Warranty', 'Date'];
    const body = rows.map((i: any) => [
      i.imei1, i.imei2 || '', i.serialNumber || '',
      i.product?.name || '', i.product?.brand?.name || '',
      i.variant?.name || '', i.color || '',
      i.status, i.ptaStatus || '', Number(i.ptaTaxPaid || 0).toFixed(2),
      Number(i.costPrice || 0).toFixed(2),
      i.warrantyMonths ? `${i.warrantyMonths}m` : '',
      new Date(i.createdAt).toLocaleString('en-PK'),
    ]);
    const csv = [...summary, headers, ...body]
      .map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `imei-inventory-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${rows.length} IMEIs export ho gaye`);
  };

  const handlePrint = () => window.print();
  const printDate = new Date().toLocaleString('en-PK', { dateStyle: 'full', timeStyle: 'short' });

  /* ─── Selection ─── */
  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };
  const toggleAllVisible = () => {
    const allSelected = filtered.every((i: any) => selected.has(i.id));
    setSelected(allSelected ? new Set() : new Set(filtered.map((i: any) => i.id)));
  };

  /* ─── Keyboard shortcuts ─── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName;
      if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === 'Escape') {
        if (showTeacher) setShowTeacher(false);
        else if (search) setSearch('');
        else if (selected.size > 0) setSelected(new Set());
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showTeacher, search, selected]);

  const hasFilters = !!search || statusFilter !== 'IN_STOCK' || ptaFilter !== 'ALL' || shopFilter !== 'ALL';
  const clearFilters = () => { setSearch(''); setStatusFilter('ALL'); setPtaFilter('ALL'); setShopFilter('ALL'); };

  const activeShops = useMemo(() => (shops as any[]).filter((sh) => sh.isActive !== false), [shops]);

  return (
    <div className="space-y-4 sm:space-y-5 pb-10 print:space-y-0">
      {showTeacher && (
        <ImeiTeacher onClose={() => setShowTeacher(false)} />
      )}

      {/* Bulk add sirf scoped mode me — kis product ka device, ye pata hona zaroori hai */}
      {showBulkAdd && product && (
        <BulkImeiAddModal
          productId={product.id}
          productName={product.name}
          defaultCostPrice={product.costPrice || 0}
          onSuccess={() => {
            setShowBulkAdd(false);
            queryClient.invalidateQueries({
              predicate: (q) => {
                const k = String(q.queryKey?.[0] ?? '');
                return [
                  'imei-global-list', 'imei-global-stats', 'imei-stats', 'imei-list',
                  'imei-product-list', 'mobile-pos-catalog', 'mobile-low-stock',
                  'mobile-stock-aging', 'products', 'mobile-products', 'product',
                ].includes(k) || k.startsWith('mobile-reports');
              },
            });
          }}
          onClose={() => setShowBulkAdd(false)}
        />
      )}

      {/* ═══ PRINT-ONLY HEADER ═══ */}
      <div className="hidden print:block">
        <div className="flex items-center justify-between border-b-4 border-blue-600 pb-3 mb-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 leading-tight">
              📱 {tenantName || 'My Store'} — IMEI Inventory Report
            </h1>
            <p className="text-xs text-slate-600 font-semibold mt-1">
              {shopName ? `Shop: ${shopName}  •  ` : ''}{filtered.length} IMEIs
              {statusFilter !== 'ALL' ? `  •  ${statusFilter.replace('_', ' ')}` : ''}
              {ptaFilter !== 'ALL' ? `  •  PTA: ${PTA_STATUS_LABELS[ptaFilter]}` : ''}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">Generated: {printDate}</p>
          </div>
        </div>
      </div>

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-950 via-blue-900 to-indigo-700 dark:from-slate-950 dark:via-blue-950 dark:to-indigo-900 text-white p-4 sm:p-6 shadow-2xl print:hidden">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-blue-400/25 blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-indigo-400/20 blur-3xl pointer-events-none" />

        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-3 py-1 text-[11px] font-extrabold border border-white/25 uppercase tracking-widest shadow-lg">
              <Smartphone className="h-3.5 w-3.5 text-amber-300" /> Mobile Industry
              {shopName && (<><span className="opacity-40">•</span><span className="text-emerald-200">🏪 {shopName}</span></>)}
            </div>
            {isScoped && (
              <Link to={`/mobile-products/${scopedProductId}`}
                className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-extrabold text-white/80 hover:text-white transition">
                <ArrowLeft className="h-3.5 w-3.5" /> Wapis product par
              </Link>
            )}
            <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-tight">
              {isScoped
                ? <>📇 {product?.name ?? 'Product'} <span className="text-white/70 text-lg sm:text-xl">ki IMEIs</span></>
                : '📇 IMEI Inventory'}
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-white/90 font-semibold">
              {isScoped
                ? 'Is product ke saare device — search, filter, manage'
                : 'Saare products ki IMEIs ek jagah — search, filter, manage'}
              {stats && (
                <>
                  <span className="opacity-50 mx-1.5">•</span>
                  <strong className="text-blue-200">{stats.total}</strong> total
                  <span className="opacity-50 mx-1.5">•</span>
                  <strong className="text-emerald-300">{stats.inStock}</strong> in-stock
                </>
              )}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap items-center shrink-0">
            <button
              onClick={() => setShowTeacher(true)}
              className="h-11 px-3 rounded-xl bg-amber-400/90 hover:bg-amber-400 text-slate-900 text-xs font-extrabold inline-flex items-center gap-1.5 shadow-lg transition"
            >
              <GraduationCap className="h-4 w-4" /> <span className="hidden sm:inline">Guide</span>
            </button>
            <a
              href="https://dirbs.pta.gov.pk"
              target="_blank"
              rel="noopener noreferrer"
              className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur-md transition"
            >
              <ExternalLink className="h-4 w-4" /> <span className="hidden sm:inline">DIRBS PTA</span>
            </a>
            <button
              onClick={() => { refetch(); refetchStats(); }}
              disabled={isRefetching}
              className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur-md disabled:opacity-50 transition"
            >
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={handlePrint}
              className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur-md transition"
            >
              <Printer className="h-4 w-4" /> <span className="hidden sm:inline">Print</span>
            </button>
            <Button
              onClick={() => {
                if (confirm('Saare product stocks ko IMEI counts se recalculate karein? Ye "Out of stock" ghalti fix karta hai.')) {
                  recalcMutation.mutate();
                }
              }}
              loading={recalcMutation.isPending}
              variant="outline"
              className="font-extrabold bg-white/15 border-white/25 text-white hover:bg-white/25"
            >
              <RefreshCw className="h-4 w-4" /> <span className="hidden sm:inline">Recalc Stock</span>
            </Button>
            {isScoped ? (
              <Button
                onClick={() => setShowBulkAdd(true)}
                disabled={!product}
                className="bg-white text-blue-900 hover:bg-slate-100 font-extrabold shadow-2xl"
              >
                <Plus className="h-4 w-4" /> IMEI Add Karo
              </Button>
            ) : (
              <Link to="/products">
                <Button className="bg-white text-blue-900 hover:bg-slate-100 font-extrabold shadow-2xl">
                  <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Product chuno</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              </Link>
            )}
          </div>
        </div>

        <div className="relative mt-3 hidden sm:flex flex-wrap gap-1.5 text-[10px] font-bold items-center">
          <Kbd>/</Kbd><span className="text-white/60">Search</span>
          <span className="text-white/30 mx-1">•</span>
          <Kbd>Esc</Kbd><span className="text-white/60">Clear / band</span>
        </div>
      </section>

      {/* ═══ KPIs ═══ */}
      {stats && (
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 print:hidden">
          <Kpi icon={Smartphone} label="Total IMEIs" value={stats.total} tone="blue" />
          <Kpi icon={CheckCircle2} label="In Stock" value={stats.inStock} tone="emerald" />
          <Kpi icon={Package} label="Sold" value={stats.sold} tone="violet" />
          <Kpi icon={DollarSign} label="Stock Value" value={formatPKR(stats.stockValue ?? 0)} tone="amber" isText />
        </section>
      )}

      {/* ═══ PTA BREAKDOWN — clickable ═══ */}
      {stats && (
        <section className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-emerald-500/10 dark:via-slate-900 dark:to-blue-500/10 border-2 border-emerald-200 dark:border-emerald-500/40 p-4 sm:p-5 print:hidden">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
            <h3 className="font-extrabold text-emerald-900 dark:text-emerald-200 text-sm">PTA Status (In-Stock IMEIs)</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {(['APPROVED', 'NON_PTA', 'PATCH', 'PENDING', 'EXEMPT'] as PtaStatus[]).map((status) => {
              const count = ptaBreakdown[status];
              const active = ptaFilter === status;
              const colors = PTA_STATUS_COLORS[status];
              const Icon = PTA_ICONS[status];
              return (
                <button
                  key={status}
                  onClick={() => setPtaFilter(active ? 'ALL' : status)}
                  className={`rounded-xl border-2 p-3 text-left transition active:scale-[0.98] ${
                    active
                      ? `${colors.bg} ${colors.border} shadow-md ring-2 ring-offset-1 dark:ring-offset-slate-900 ring-emerald-400`
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-500/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Icon className={`h-4 w-4 ${colors.text}`} />
                    <span className={`text-2xl font-extrabold tabular-nums ${count > 0 ? colors.text : 'text-slate-300 dark:text-slate-600'}`}>
                      {count}
                    </span>
                  </div>
                  <div className={`text-[10px] uppercase tracking-wider font-extrabold mt-1 ${colors.text}`}>
                    {PTA_STATUS_LABELS[status]}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* ═══ STATUS CHIPS ═══ */}
      <section className="flex gap-1.5 overflow-x-auto pb-1 print:hidden">
        {(['ALL', 'IN_STOCK', 'SOLD', 'RETURNED', 'DAMAGED', 'RESERVED', 'LOST'] as StatusFilter[]).map((s) => {
          const active = statusFilter === s;
          const Icon = s === 'ALL' ? Smartphone : STATUS_ICONS[s];
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`shrink-0 inline-flex items-center gap-1 px-3 h-10 rounded-xl text-xs font-extrabold transition border-2 ${
                active
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-blue-300'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {s === 'ALL' ? `Sab (${stats?.total ?? 0})` : s.replace('_', ' ')}
            </button>
          );
        })}
      </section>

      {/* ═══ SHOP CHIPS — ab har device apni shop se juda hai ═══ */}
      {activeShops.length > 1 && (
        <section className="flex gap-1.5 overflow-x-auto pb-1 print:hidden items-center">
          <span className="shrink-0 text-[10px] uppercase font-extrabold text-slate-500 dark:text-slate-400 tracking-wider inline-flex items-center gap-1 pr-1">
            <Store className="h-3 w-3" /> Shop
          </span>
          <button
            onClick={() => setShopFilter('ALL')}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold transition border-2 ${
              shopFilter === 'ALL'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent shadow-sm'
                : 'border-transparent bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Sab shops
          </button>
          {activeShops.map((sh: any) => (
            <button
              key={sh.id}
              onClick={() => setShopFilter(sh.id)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold transition border-2 inline-flex items-center gap-1 ${
                shopFilter === sh.id
                  ? 'bg-blue-600 text-white border-transparent shadow-sm'
                  : 'border-transparent bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <Store className="h-3 w-3" /> {sh.name}
            </button>
          ))}
        </section>
      )}

      {/* ═══ SEARCH + EXPORT ═══ */}
      <section className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-black/20 p-3.5 print:hidden">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <ScanLine className="h-4 w-4 text-blue-600 dark:text-blue-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Scan ya search IMEI / product / brand / serial... (/ shortcut)"
              className="h-11 w-full rounded-xl border-2 border-blue-200 dark:border-blue-500/40 bg-blue-50/30 dark:bg-blue-500/5 pl-9 pr-9 text-sm font-mono text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 transition"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 h-6 w-6 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center transition">
                <X className="h-3.5 w-3.5 text-slate-400" />
              </button>
            )}
          </div>
          {hasFilters && (
            <button onClick={clearFilters} className="text-xs font-extrabold text-rose-600 dark:text-rose-400 hover:text-rose-700 inline-flex items-center gap-1 transition">
              <X className="h-3 w-3" /> Clear
            </button>
          )}
          {filtered.length > 0 && (
            <button
              onClick={() => exportCSV(filtered)}
              className="h-11 px-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-500/50 bg-white dark:bg-slate-800 text-xs font-extrabold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 transition"
            >
              <Download className="h-3.5 w-3.5" /> CSV ({filtered.length})
            </button>
          )}
          <div className="ml-auto text-xs font-extrabold text-slate-500 dark:text-slate-400 tabular-nums">
            {filtered.length} IMEIs
          </div>
        </div>
      </section>

      {/* ═══ BULK BAR ═══ */}
      {selected.size > 0 && (
        <section className="sticky top-2 z-20 rounded-2xl bg-slate-950 dark:bg-slate-900 text-white shadow-2xl border border-white/20 p-3 flex items-center gap-2 flex-wrap print:hidden">
          <div className="font-extrabold text-sm px-2"><span className="text-blue-300">{selected.size}</span> selected</div>
          <button
            onClick={() => exportCSV(imeis.filter((i: any) => selected.has(i.id)))}
            className="px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-xs font-extrabold inline-flex items-center gap-1 transition"
          >
            <Download className="h-3.5 w-3.5" /> Export
          </button>
          <button
            onClick={() => {
              if (confirm(`${selected.size} IMEIs delete karein? SOLD IMEIs delete nahi hongi.`)) {
                bulkDeleteMutation.mutate(Array.from(selected));
              }
            }}
            disabled={bulkDeleteMutation.isPending}
            className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-extrabold inline-flex items-center gap-1 transition disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
          <button onClick={() => setSelected(new Set())} className="ml-auto px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-extrabold transition">
            Clear
          </button>
        </section>
      )}

      {/* ═══ IMEI LIST ═══ */}
      <section className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-black/20 overflow-hidden print:border-0 print:rounded-none print:shadow-none">
        {isLoading ? (
          <div className="p-6 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-24 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 sm:p-16 text-center">
            <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-700 mx-auto flex items-center justify-center shadow-lg shadow-blue-500/40">
              <Smartphone className="h-10 w-10 text-white" />
            </div>
            <h3 className="mt-4 text-lg font-extrabold text-slate-900 dark:text-white">
              {hasFilters ? 'Koi matching IMEI nahi' : 'Abhi koi IMEI nahi'}
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 font-semibold max-w-md mx-auto">
              {hasFilters
                ? 'Filters badal ke dekho ya search clear karo'
                : 'IMEIs product page se add hoti hain (Product wizard → IMEI Tracking step)'}
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
                <Link to="/mobile-products/new">
                  <Button className="bg-gradient-to-r from-blue-600 to-indigo-700 font-extrabold shadow-lg shadow-blue-500/40">
                    <Smartphone className="h-4 w-4" /> Naya Phone Add Karo
                  </Button>
                </Link>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Select all row — screen only */}
            <div className="px-4 py-2.5 border-b-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center gap-2 print:hidden">
              <input
                type="checkbox"
                checked={filtered.length > 0 && filtered.every((i: any) => selected.has(i.id))}
                onChange={toggleAllVisible}
                className="h-4 w-4 rounded accent-blue-600"
              />
              <span className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400">Sab select karo</span>
            </div>

            <div className="divide-y-2 divide-slate-100 dark:divide-slate-800">
              {filtered.map((imei: any) => {
                const StatusIcon = STATUS_ICONS[imei.status] ?? Package;
                return (
                  <div key={imei.id} className={`p-4 hover:bg-blue-50/40 dark:hover:bg-blue-500/5 transition ${selected.has(imei.id) ? 'bg-blue-50/60 dark:bg-blue-500/10' : ''}`}>
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <input
                          type="checkbox"
                          checked={selected.has(imei.id)}
                          onChange={() => toggleOne(imei.id)}
                          className="h-4 w-4 rounded accent-blue-600 mt-1 shrink-0 print:hidden"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-mono font-extrabold text-slate-900 dark:text-white text-sm">
                              {imei.imei1}
                            </span>
                            <PtaStatusBadge
                              status={(imei.ptaStatus || 'PENDING') as PtaStatus}
                              size="sm"
                              taxPaid={imei.ptaTaxPaid}
                            />
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold inline-flex items-center gap-1 ${
                              imei.status === 'IN_STOCK' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' :
                              imei.status === 'SOLD' ? 'bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300' :
                              imei.status === 'RETURNED' ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300' :
                              'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                            }`}>
                              <StatusIcon className="h-2.5 w-2.5" /> {imei.status}
                            </span>
                            {imei.color && (
                              <span className="px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 text-[10px] font-extrabold">
                                {imei.color}
                              </span>
                            )}
                          </div>

                          <Link
                            to={`/mobile-products/${imei.productId}/edit`}
                            className="font-extrabold text-slate-900 dark:text-white hover:text-blue-700 dark:hover:text-blue-400 inline-flex items-center gap-1 text-sm transition"
                          >
                            <Package className="h-3.5 w-3.5" />
                            {imei.product?.name || 'Unknown product'}
                            {imei.product?.brand?.name && (
                              <span className="text-xs text-violet-700 dark:text-violet-400 font-bold"> · {imei.product.brand.name}</span>
                            )}
                            {imei.variant?.name && (
                              <span className="text-xs text-slate-500 dark:text-slate-400"> — {imei.variant.name}</span>
                            )}
                          </Link>

                          {imei.imei2 && (
                            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">IMEI 2: {imei.imei2}</div>
                          )}
                          {imei.serialNumber && (
                            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">Serial: {imei.serialNumber}</div>
                          )}

                          <div className="mt-2 flex items-center gap-3 flex-wrap text-xs text-slate-500 dark:text-slate-400">
                            <span>Cost: <strong className="text-slate-700 dark:text-slate-200">{formatPKR(imei.costPrice || 0)}</strong></span>
                            {imei.ptaTaxPaid > 0 && (
                              <span className="text-emerald-700 dark:text-emerald-400 font-bold">+ Tax: {formatPKR(imei.ptaTaxPaid)}</span>
                            )}
                            {imei.warrantyMonths > 0 && <span>Warranty: {imei.warrantyMonths}m</span>}
                            {imei.warrantyExpiry && (
                              <span>Till: {new Date(imei.warrantyExpiry).toLocaleDateString('en-PK')}</span>
                            )}
                            {imei.soldAt && (
                              <span className="text-violet-700 dark:text-violet-400 font-bold">
                                Sold: {new Date(imei.soldAt).toLocaleDateString('en-PK')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 print:hidden">
                        <Link
                          to={`/imei-inventory/${imei.productId}`}
                          className="h-9 px-2.5 rounded-lg border-2 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-extrabold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1 transition"
                        >
                          <ExternalLink className="h-3 w-3" /> Product IMEIs
                        </Link>
                        {imei.status !== 'SOLD' && (
                          <button
                            onClick={() => {
                              if (confirm(`IMEI ${imei.imei1} delete karein?`)) deleteMutation.mutate(imei.id);
                            }}
                            className="h-9 w-9 rounded-lg bg-rose-50 dark:bg-rose-500/15 hover:bg-rose-100 dark:hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 inline-flex items-center justify-center transition"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
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
          section, div { box-shadow: none !important; }
          [class*="fixed"] { display: none !important; }
          html, body, #root { height: auto !important; min-height: 0 !important; overflow: visible !important; }
          [class*="sidebar"], [class*="topbar"], nav { display: none !important; }
          [data-sonner-toaster], [data-sonner-toast] { display: none !important; visibility: hidden !important; }
        }
      `}</style>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   TEACHER — IMEI inventory guide
   ═════════════════════════════════════════════════════════════ */
function ImeiTeacher({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-blue-300 dark:border-blue-500/40 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3 border-b-2 border-blue-200 dark:border-blue-500/30 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-500/15 dark:to-indigo-500/15 flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-extrabold text-blue-900 dark:text-blue-200 flex items-center gap-2">
            <GraduationCap className="h-5 w-5" /> IMEI Inventory — Guide
          </h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-relaxed">
            Ye page <strong>saare products ki IMEIs</strong> ek jagah dikhata hai — jis phone ka bhi IMEI ho, yahan mil jayegi.
            Yahan se search, filter, delete sab hota hai.
          </p>

          <div className="rounded-2xl border-2 border-blue-200 dark:border-blue-500/30 bg-blue-50/60 dark:bg-blue-500/5 p-4 space-y-2.5">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-blue-700 dark:text-blue-300">
              🛡️ PTA Status kya hai?
            </div>
            <div className="space-y-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <GuideRow emoji="✅" title="Approved" desc="PTA se register — bilkul theek, bik sakta hai" />
              <GuideRow emoji="🔧" title="Patch" desc="Local network patch se chal raha — kabhi issue ho sakta" />
              <GuideRow emoji="⏳" title="Pending" desc="Register ho raha hai — verify jaldi karein" />
              <GuideRow emoji="❌" title="Non-PTA" desc="Register nahi — POS me sell block ho sakta hai" />
              <GuideRow emoji="📋" title="Exempt" desc="Special case — tax se azad" />
            </div>
          </div>

          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border-2 border-emerald-200 dark:border-emerald-500/40 p-3 text-xs font-semibold text-emerald-900 dark:text-emerald-200">
            💡 <strong>"Out of stock" ghalti?</strong> — Header ka <strong>Recalc Stock</strong> button
            saare products ka stock IMEI counts se recalculate kar deta hai.
          </div>

          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3 space-y-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <TipRow><strong>⌨️ / dabao</strong> — search box pe jump, ya barcode scan karo</TipRow>
            <TipRow><strong>PTA chip pe click</strong> — us status ke IMEIs filter ho jayenge</TipRow>
            <TipRow><strong>Checkbox se select</strong> — bulk export ya delete</TipRow>
            <TipRow><strong>SOLD IMEIs delete nahi hoti</strong> — sale history preserve rehti hai</TipRow>
          </div>

          <Button
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 font-extrabold shadow-lg shadow-blue-500/40 h-12"
            onClick={onClose}
          >
            <CheckCircle2 className="h-4 w-4" /> Samajh Gaya!
          </Button>
        </div>
      </div>
    </div>
  );
}

function GuideRow({ emoji, title, desc }: { emoji: string; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-500/30 p-2.5">
      <span className="text-lg shrink-0">{emoji}</span>
      <div className="min-w-0 flex-1">
        <div className="font-extrabold text-slate-900 dark:text-white text-xs">{title}</div>
        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">{desc}</div>
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

/* ══════════ KPI CARD ══════════ */
function Kpi({ icon: Icon, label, value, tone, isText }: any) {
  const tones: Record<string, string> = {
    blue: 'from-blue-500 to-indigo-700 shadow-blue-500/40',
    emerald: 'from-emerald-500 to-emerald-700 shadow-emerald-500/40',
    violet: 'from-violet-500 to-fuchsia-600 shadow-violet-500/40',
    amber: 'from-amber-500 to-orange-600 shadow-amber-500/40',
  };
  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-black/20 p-3 sm:p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-extrabold">{label}</div>
          <div className={`mt-1.5 font-extrabold text-slate-900 dark:text-white tabular-nums truncate ${isText ? 'text-lg' : 'text-xl sm:text-2xl'}`}>
            {value}
          </div>
        </div>
        <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-lg shrink-0`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
