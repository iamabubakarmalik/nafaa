// apps/web/src/industries/retail/pages/RetailTransfersPage.tsx
import { useState, useMemo, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeftRight, Plus, Search, X, Building2, Package, Clock, Truck,
  CheckCircle2, XCircle, Calendar, Eye, AlertCircle, GraduationCap,
  Sparkles, Printer, FileSpreadsheet, RefreshCw, ArrowRight, Trash2,
  Minus, Send,
} from 'lucide-react';
import { Button } from '@core/ui/Button';
import { shopsApi } from '@modules/organization/shops/api/shops.api';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { transfersApi, type StockTransfer, type TransferStatus } from '@modules/inventory/transfers/api/transfers.api';
import { useAuthStore } from '@core/stores/auth.store';
import { toast } from 'sonner';

/* ═════════════════════════════════════════════════════════════
   NAFAA RETAIL STOCK TRANSFERS — FULL BEST
   ─────────────────────────────────────────────────────────────
   🛒 Grocery-focused — simple products only (no rolls/variants)
   ⚡ Fast flow: From → To → products → send
   👁️ Live stock preview per line (minus warning)
   📦 Receive / Cancel with confirm
   🎓 Teacher modal • ⌨️ / search • Esc band
   🌙 Dark mode complete • 🖨️ Print + CSV
   ═════════════════════════════════════════════════════════════ */

const formatDate = (v: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v));
const formatQty = (q: number) => q.toFixed(q % 1 === 0 ? 0 : 2);

const statusConfig: Record<TransferStatus, {
  label: string; emoji: string; icon: any;
  light: string; dark: string;
}> = {
  PENDING:    { label: 'Pending',    emoji: '⏳', icon: Clock,
    light: 'bg-amber-100 text-amber-700 border-amber-200',
    dark: 'dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40' },
  IN_TRANSIT: { label: 'Raste Mein', emoji: '🚚', icon: Truck,
    light: 'bg-blue-100 text-blue-700 border-blue-200',
    dark: 'dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/40' },
  RECEIVED:   { label: 'Mil Gaya',   emoji: '✅', icon: CheckCircle2,
    light: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    dark: 'dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40' },
  CANCELLED:  { label: 'Cancelled',  emoji: '❌', icon: XCircle,
    light: 'bg-rose-100 text-rose-700 border-rose-200',
    dark: 'dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/40' },
};

/** Grocery quick transfer purposes */
const QUICK_PURPOSES = [
  { emoji: '🏪', name: 'Dusri branch stock kam hai' },
  { emoji: '🔥', name: 'Wahan demand zyada hai' },
  { emoji: '📦', name: 'Naya stock divide karna' },
  { emoji: '↩️', name: 'Slow item wapas main shop' },
  { emoji: '🎉', name: 'Sale/offer ke liye bhejna' },
  { emoji: '🧹', name: 'Branch ka maal balance karna' },
];

interface CartLine {
  productId: string;
  productName: string;
  unit: string;
  available: number;   // source shop stock (best-effort)
  quantity: number;
}

export default function RetailTransfersPage() {
  const queryClient = useQueryClient();
  const currentShopId = useAuthStore((s) => s.currentShopId);
  const tenantName = useAuthStore((s) => s.tenant?.name);
  const shopName = useAuthStore((s) => s.user?.assignedShop?.name);
  const productSearchRef = useRef<HTMLInputElement>(null);

  /* ─── Page state ─── */
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TransferStatus | 'all'>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [viewTransfer, setViewTransfer] = useState<StockTransfer | null>(null);
  const [showTeacher, setShowTeacher] = useState(false);

  /* ─── Create form state ─── */
  const [fromShopId, setFromShopId] = useState('');
  const [toShopId, setToShopId] = useState('');
  const [notes, setNotes] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [productSearch, setProductSearch] = useState('');

  /* ─── Queries ─── */
  const { data: transfers = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['stock-transfers'],
    queryFn: () => transfersApi.list(),
  });

  const { data: shops = [] } = useQuery({
    queryKey: ['shops-selector'],
    queryFn: shopsApi.list,
  });

  const { data: productsData } = useQuery({
    queryKey: ['products-for-transfer'],
    queryFn: () => productsApi.list({ page: 1, limit: 1000 }),
    enabled: createOpen,
  });

  const products: any[] = productsData?.items ?? [];

  /* ─── Mutations ─── */
  const createMutation = useMutation({
    mutationFn: transfersApi.create,
    onSuccess: () => {
      toast.success('🚚 Transfer bhej diya!', { description: 'Stock raste mein — destination shop ko milega' });
      queryClient.invalidateQueries({ queryKey: ['stock-transfers'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['retail-products'] });
      resetForm();
      setCreateOpen(false);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Transfer create fail ho gaya'),
  });

  const receiveMutation = useMutation({
    mutationFn: transfersApi.receive,
    onSuccess: () => {
      toast.success('✅ Maal mil gaya!', { description: 'Stock destination shop me add ho gaya' });
      queryClient.invalidateQueries({ queryKey: ['stock-transfers'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['retail-products'] });
      setViewTransfer(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Receive fail ho gaya'),
  });

  const cancelMutation = useMutation({
    mutationFn: transfersApi.cancel,
    onSuccess: () => {
      toast.success('Transfer cancel ho gaya', { description: 'Stock source shop ko wapas mil gaya' });
      queryClient.invalidateQueries({ queryKey: ['stock-transfers'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['retail-products'] });
      setViewTransfer(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Cancel fail ho gaya'),
  });

  /* ─── Form helpers ─── */
  const resetForm = () => {
    setFromShopId(currentShopId || '');
    setToShopId('');
    setNotes('');
    setCart([]);
    setProductSearch('');
  };

  const openCreate = () => {
    resetForm();
    setCreateOpen(true);
  };

  const addProduct = (p: any) => {
    if (!fromShopId) {
      toast.error('Pehle "Kahan Se" shop select karo');
      return;
    }
    if (cart.find((i) => i.productId === p.id)) {
      toast.error('Ye product pehle se list me hai — qty change karo');
      return;
    }
    setCart((prev) => [
      ...prev,
      {
        productId: p.id,
        productName: p.name,
        unit: p.unit || 'pcs',
        available: Number(p.stock || 0),
        quantity: 1,
      },
    ]);
    setProductSearch('');
  };

  const updateQty = (productId: string, qty: number) => {
    if (Number.isNaN(qty)) return;
    setCart((prev) => prev.map((i) => (i.productId === productId ? { ...i, quantity: qty } : i)));
  };

  const removeLine = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  };

  const handleCreate = () => {
    if (!fromShopId) return toast.error('"Kahan Se" shop select karo');
    if (!toShopId) return toast.error('"Kahan Ko" shop select karo');
    if (fromShopId === toShopId) return toast.error('Ek hi shop me transfer nahi ho sakta');
    if (cart.length === 0) return toast.error('Kam se kam 1 product add karo');

    const invalid = cart.find((i) => !i.quantity || i.quantity <= 0);
    if (invalid) return toast.error(`${invalid.productName}: qty 0 se zyada honi chahiye`);

    const overStock = cart.find((i) => i.available > 0 && i.quantity > i.available);
    if (overStock) {
      return toast.error(
        `${overStock.productName}: stock sirf ${formatQty(overStock.available)} ${overStock.unit} hai`,
      );
    }

    createMutation.mutate({
      fromShopId,
      toShopId,
      notes: notes.trim() || undefined,
      items: cart.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
      })),
    });
  };

  /* ─── Derived data ─── */
  const filtered = useMemo(() => {
    let result = [...transfers];
    const q = search.toLowerCase().trim();
    if (q) {
      result = result.filter(
        (t) =>
          t.transferNumber.toLowerCase().includes(q) ||
          t.fromShop?.name?.toLowerCase().includes(q) ||
          t.toShop?.name?.toLowerCase().includes(q) ||
          t.items?.some((it: any) => it.product?.name?.toLowerCase().includes(q)),
      );
    }
    if (statusFilter !== 'all') result = result.filter((t) => t.status === statusFilter);
    return result;
  }, [transfers, search, statusFilter]);

  const stats = useMemo(() => ({
    total: transfers.length,
    pending: transfers.filter((t) => t.status === 'PENDING').length,
    inTransit: transfers.filter((t) => t.status === 'IN_TRANSIT').length,
    received: transfers.filter((t) => t.status === 'RECEIVED').length,
  }), [transfers]);

  const filteredProducts = useMemo(() => {
    const q = productSearch.toLowerCase().trim();
    if (!q) return [];
    return products
      .filter((p) =>
        p.name.toLowerCase().includes(q) ||
        (p.sku || '').toLowerCase().includes(q) ||
        (p.barcode || '').toLowerCase().includes(q),
      )
      .slice(0, 10);
  }, [products, productSearch]);

  const activeShops = shops.filter((s) => s.isActive);
  const toShops = activeShops.filter((s) => s.id !== fromShopId);
  const canSave = !!fromShopId && !!toShopId && cart.length > 0;

  /* ─── CSV ─── */
  const exportCSV = () => {
    if (filtered.length === 0) return toast.error('Koi data nahi');
    const summary = [
      [`Stock Transfers — ${tenantName || 'Nafaa'}`],
      [`Shop: ${shopName || 'All'}  •  Generated: ${new Date().toLocaleString('en-PK')}  •  Total: ${filtered.length}`],
      [''],
    ];
    const headers = ['Transfer #', 'From', 'To', 'Items', 'Status', 'Created', 'Received'];
    const rows = filtered.map((t) => [
      t.transferNumber,
      t.fromShop?.name || '',
      t.toShop?.name || '',
      t.items?.length || 0,
      statusConfig[t.status]?.label || t.status,
      new Date(t.createdAt).toLocaleString('en-PK'),
      t.receivedAt ? new Date(t.receivedAt).toLocaleString('en-PK') : '',
    ]);
    const csv = [...summary, headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock-transfers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${filtered.length} transfers export ho gaye`);
  };

  /* ─── Keyboard: / = search (modal open ho to product search), Esc = band ─── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showTeacher) { setShowTeacher(false); return; }
        if (viewTransfer) { setViewTransfer(null); return; }
        if (createOpen) { setCreateOpen(false); return; }
        return;
      }
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === '/' && createOpen) {
        e.preventDefault();
        productSearchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showTeacher, viewTransfer, createOpen]);

  /* ─── Scroll lock for modals ─── */
  const anyModal = showTeacher || !!viewTransfer || createOpen;
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = anyModal ? 'hidden' : prev;
    return () => { document.body.style.overflow = prev; };
  }, [anyModal]);

  const hasFilters = !!search || statusFilter !== 'all';

  return (
    <div className="space-y-4 sm:space-y-5 pb-10 print:space-y-3">
      {showTeacher && <TransferTeacher onClose={() => setShowTeacher(false)} />}

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-950 via-cyan-900 to-cyan-700 dark:from-slate-950 dark:via-cyan-950 dark:to-cyan-900 text-white p-4 sm:p-6 shadow-2xl print:hidden">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-cyan-400/25 blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-blue-400/20 blur-3xl pointer-events-none" />

        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-3 py-1 text-[11px] font-extrabold border border-white/25 uppercase tracking-widest shadow-lg">
              <ArrowLeftRight className="h-3.5 w-3.5 text-amber-300" /> Multi-Shop
              {shopName && (
                <>
                  <span className="opacity-40">•</span>
                  <span className="text-emerald-200">🏪 {shopName}</span>
                </>
              )}
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-tight">🚚 Stock Transfers</h1>
            <p className="mt-1.5 text-xs sm:text-sm text-white/90 font-semibold">
              Ek shop se dusri shop maal bhejo — poora record ke sath
              {stats.inTransit > 0 && (
                <>
                  <span className="opacity-50 mx-1.5">•</span>
                  <strong className="text-amber-300">{stats.inTransit}</strong> raste mein
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
            <Button
              onClick={openCreate}
              className="h-11 bg-white text-slate-900 hover:bg-slate-100 font-extrabold shadow-lg"
            >
              <Plus className="h-4 w-4" /> New Transfer
            </Button>
          </div>
        </div>
      </section>

      {/* ═══ KPIs ═══ */}
      <section className="grid grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-3 print:hidden">
        <Kpi icon={ArrowLeftRight} tone="cyan" label="Total" value={stats.total} sub="All transfers" />
        <Kpi icon={Clock} tone="amber" label="Pending" value={stats.pending} sub="Ready to send" />
        <Kpi icon={Truck} tone="blue" label="Raste Mein" value={stats.inTransit} sub="In transit" />
        <Kpi icon={CheckCircle2} tone="emerald" label="Mil Gaya" value={stats.received} sub="Received" />
      </section>

      {/* ═══ FILTER BAR ═══ */}
      <div className="rounded-2xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm p-3 sm:p-4 space-y-3 print:hidden">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-10 pr-10 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 dark:focus:ring-cyan-500/30 transition"
            placeholder="Search transfer #, shop ya product..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center">
              <X className="h-4 w-4 text-slate-400" />
            </button>
          )}
        </div>
        <div className="flex gap-1.5 flex-wrap items-center">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition border-2 ${
              statusFilter === 'all'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent shadow-sm'
                : 'border-transparent bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            Sab ({transfers.length})
          </button>
          {(Object.entries(statusConfig) as [TransferStatus, any][]).map(([key, cfg]) => {
            const count = transfers.filter((t) => t.status === key).length;
            return (
              <button
                key={key}
                onClick={() => setStatusFilter(statusFilter === key ? 'all' : key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition border-2 inline-flex items-center gap-1 ${
                  statusFilter === key
                    ? `${cfg.light} ${cfg.dark} shadow-sm`
                    : 'border-transparent bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {cfg.emoji} {cfg.label} <span className="tabular-nums opacity-70">({count})</span>
              </button>
            );
          })}
          {hasFilters && (
            <button
              onClick={() => { setSearch(''); setStatusFilter('all'); }}
              className="text-[11px] font-extrabold text-rose-600 dark:text-rose-400 inline-flex items-center gap-1 transition"
            >
              <X className="h-3 w-3" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* ═══ TRANSFER LIST ═══ */}
      <section className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b-2 border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Saare Transfers</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold tabular-nums">
              {filtered.length} of {transfers.length}
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="p-6 space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto h-16 w-16 rounded-3xl bg-gradient-to-br from-cyan-100 to-blue-200 dark:from-cyan-500/20 dark:to-blue-500/20 flex items-center justify-center">
              <ArrowLeftRight className="h-8 w-8 text-cyan-600 dark:text-cyan-400" />
            </div>
            <h4 className="mt-3 font-extrabold text-slate-900 dark:text-white">
              {hasFilters ? 'Kuch nahi mila' : 'Abhi koi transfer nahi'}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-semibold">
              {hasFilters ? 'Filter change karo' : '"New Transfer" se pehla transfer banao'}
            </p>
            {!hasFilters && (
              <Button onClick={openCreate} className="mt-4 bg-gradient-to-r from-cyan-600 to-blue-700 font-extrabold shadow-lg shadow-cyan-500/40">
                <Plus className="h-4 w-4" /> Pehla Transfer Banao
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map((t) => {
              const cfg = statusConfig[t.status];
              const Icon = cfg?.icon || Clock;
              return (
                <button
                  key={t.id}
                  onClick={() => setViewTransfer(t)}
                  className="w-full text-left px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-700 text-white flex items-center justify-center shadow-lg shadow-cyan-500/30 shrink-0">
                        <Truck className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-slate-900 dark:text-white font-mono text-sm">{t.transferNumber}</span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${cfg?.light} ${cfg?.dark}`}>
                            <Icon className="h-2.5 w-2.5" /> {cfg?.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 mt-1 font-bold flex-wrap">
                          <Building2 className="h-3 w-3 shrink-0" />
                          <span className="truncate">{t.fromShop?.name || '—'}</span>
                          <ArrowRight className="h-3 w-3 text-slate-400 shrink-0" />
                          <span className="truncate">{t.toShop?.name || '—'}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-2 flex-wrap font-semibold">
                          <span className="inline-flex items-center gap-0.5">
                            <Package className="h-2.5 w-2.5" /> {t.items?.length || 0} items
                          </span>
                          <span>•</span>
                          <span className="inline-flex items-center gap-0.5">
                            <Calendar className="h-2.5 w-2.5" /> {formatDate(t.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Eye className="h-5 w-5 text-slate-400 shrink-0" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* ═══ CREATE MODAL ═══ */}
      {createOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3"
          onClick={() => setCreateOpen(false)}
        >
          <div
            className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col border-2 border-cyan-200 dark:border-cyan-500/40"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 py-4 border-b-2 border-cyan-100 dark:border-cyan-500/30 bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-500/15 dark:to-blue-500/15 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-700 text-white flex items-center justify-center shadow-lg shadow-cyan-500/40 shrink-0">
                  <ArrowLeftRight className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-lg">Naya Transfer</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold">Ek shop se dusri shop maal bhejo</p>
                </div>
              </div>
              <button onClick={() => setCreateOpen(false)} className="h-9 w-9 rounded-xl hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
                <X className="h-5 w-5 text-slate-600 dark:text-slate-300" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* ① Shops */}
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                    ① Kahan Se? *
                  </label>
                  <select
                    value={fromShopId}
                    onChange={(e) => setFromShopId(e.target.value)}
                    className="h-12 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 transition"
                  >
                    <option value="">Source shop...</option>
                    {activeShops.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}{s.isMain ? ' (Main)' : ''}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                    ② Kahan Ko? *
                  </label>
                  <select
                    value={toShopId}
                    onChange={(e) => setToShopId(e.target.value)}
                    disabled={!fromShopId}
                    className="h-12 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    <option value="">Destination shop...</option>
                    {toShops.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}{s.isMain ? ' (Main)' : ''}</option>
                    ))}
                  </select>
                </div>
              </div>

              {!fromShopId && (
                <div className="rounded-xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/40 p-3 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                    <strong>Pehle "Kahan Se" select karo</strong> — phir products add karna shuru hoga
                  </div>
                </div>
              )}

              {/* ③ Product search */}
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  ③ Products Add Karo <span className="normal-case font-bold text-slate-400 dark:text-slate-500">(/ dabao)</span>
                </label>
                <div className="relative">
                  <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    ref={productSearchRef}
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Naam, SKU ya barcode..."
                    disabled={!fromShopId}
                    className="h-12 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-10 pr-10 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  />
                  {productSearch && (
                    <button onClick={() => setProductSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center">
                      <X className="h-4 w-4 text-slate-400" />
                    </button>
                  )}
                </div>
                {filteredProducts.length > 0 && (
                  <div className="mt-2 max-h-[220px] overflow-y-auto rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 divide-y divide-slate-100 dark:divide-slate-700 shadow-lg">
                    {filteredProducts.map((p) => {
                      const inCart = cart.some((i) => i.productId === p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => addProduct(p)}
                          disabled={inCart}
                          className="w-full px-3 py-2 text-left hover:bg-cyan-50 dark:hover:bg-cyan-500/10 transition flex items-center gap-2.5 disabled:opacity-50"
                        >
                          <div className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-slate-700 overflow-hidden flex items-center justify-center shrink-0">
                            {p.images?.[0]?.url ? (
                              <img src={p.images[0].url} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <Package className="h-4 w-4 text-slate-400" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-sm text-slate-900 dark:text-white truncate">{p.name}</div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                              {p.sku || '—'} • Stock: <span className={`font-bold tabular-nums ${Number(p.stock) > 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{formatQty(Number(p.stock || 0))} {p.unit}</span>
                            </div>
                          </div>
                          {inCart ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          ) : (
                            <Plus className="h-4 w-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Cart lines */}
              {cart.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 p-8 text-center">
                  <Package className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <p className="font-extrabold text-slate-700 dark:text-slate-200 text-sm">Abhi koi item nahi</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-semibold">Upar search karke products add karo</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-xs font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wider tabular-nums">
                    Items ({cart.length})
                  </div>
                  {cart.map((line) => {
                    const over = line.available > 0 && line.quantity > line.available;
                    const remaining = line.available - line.quantity;
                    return (
                      <div
                        key={line.productId}
                        className={`rounded-xl border-2 p-3 ${
                          over
                            ? 'border-rose-300 dark:border-rose-500/50 bg-rose-50 dark:bg-rose-500/10'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="font-extrabold text-sm text-slate-900 dark:text-white truncate">{line.productName}</div>
                            <div className="text-[11px] font-bold mt-0.5 tabular-nums">
                              <span className="text-slate-500 dark:text-slate-400">Stock: {formatQty(line.available)} {line.unit}</span>
                              {line.available > 0 && (
                                <span className={`ml-2 ${over ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                                  → baad me: {formatQty(remaining)}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => updateQty(line.productId, Math.max(0.01, line.quantity - 1))}
                              className="h-9 w-9 rounded-lg border-2 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center transition"
                            >
                              <Minus className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                            </button>
                            <input
                              type="number"
                              step="0.01"
                              inputMode="decimal"
                              min="0.01"
                              value={line.quantity}
                              onChange={(e) => updateQty(line.productId, Number(e.target.value))}
                              className="h-9 w-20 rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-center text-sm font-extrabold tabular-nums text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 transition"
                            />
                            <button
                              type="button"
                              onClick={() => updateQty(line.productId, line.quantity + 1)}
                              className="h-9 w-9 rounded-lg border-2 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center transition"
                            >
                              <Plus className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeLine(line.productId)}
                              className="h-9 w-9 rounded-lg border-2 border-rose-200 dark:border-rose-500/40 hover:bg-rose-50 dark:hover:bg-rose-500/10 flex items-center justify-center transition"
                            >
                              <Trash2 className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                            </button>
                          </div>
                        </div>
                        {over && (
                          <div className="mt-2 text-[11px] font-extrabold text-rose-700 dark:text-rose-300 flex items-center gap-1">
                            <AlertCircle className="h-3.5 w-3.5" /> Stock se zyada nahi bhej sakte!
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ④ Purpose */}
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  ④ Wajah / Note (optional)
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {QUICK_PURPOSES.map((p) => {
                    const label = `${p.emoji} ${p.name}`;
                    const active = notes === label;
                    return (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() => setNotes(active ? '' : label)}
                        className={`px-2.5 py-1.5 rounded-lg border-2 text-[11px] font-extrabold transition ${
                          active
                            ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-500/15 text-cyan-700 dark:text-cyan-300'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-cyan-300 dark:hover:border-cyan-500/50'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ya apni wajah likho..."
                  rows={2}
                  className="w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 resize-none transition"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between gap-3 shrink-0">
              <div className="text-xs text-slate-500 dark:text-slate-400 font-bold tabular-nums">
                {cart.length > 0 && `${cart.length} item${cart.length !== 1 ? 's' : ''}`}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCreateOpen(false)}
                  className="h-11 px-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm font-extrabold text-slate-700 dark:text-slate-200 transition"
                >
                  Cancel
                </button>
                <Button
                  onClick={handleCreate}
                  loading={createMutation.isPending}
                  disabled={!canSave}
                  className="bg-gradient-to-r from-cyan-600 to-blue-700 font-extrabold shadow-lg shadow-cyan-500/40"
                >
                  <Send className="h-4 w-4" /> Transfer Bhejo
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ VIEW MODAL ═══ */}
      {viewTransfer && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3"
          onClick={() => setViewTransfer(null)}
        >
          <div
            className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col border-2 border-cyan-200 dark:border-cyan-500/40"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 py-4 border-b-2 border-cyan-100 dark:border-cyan-500/30 bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-500/15 dark:to-blue-500/15 flex items-center justify-between shrink-0">
              <div className="min-w-0">
                <h3 className="font-extrabold text-slate-900 dark:text-white text-lg font-mono truncate">{viewTransfer.transferNumber}</h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 font-bold mt-0.5 flex items-center gap-1.5">
                  <span className="truncate">{viewTransfer.fromShop?.name}</span>
                  <ArrowRight className="h-3 w-3 shrink-0" />
                  <span className="truncate">{viewTransfer.toShop?.name}</span>
                </p>
              </div>
              <button onClick={() => setViewTransfer(null)} className="h-9 w-9 rounded-xl hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition shrink-0">
                <X className="h-5 w-5 text-slate-600 dark:text-slate-300" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3">
                  <div className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</div>
                  <div className="mt-1.5">
                    {(() => {
                      const cfg = statusConfig[viewTransfer.status];
                      const Icon = cfg.icon;
                      return (
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-extrabold border ${cfg.light} ${cfg.dark}`}>
                          <Icon className="h-3 w-3" /> {cfg.label}
                        </span>
                      );
                    })()}
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3">
                  <div className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Bheja Gaya</div>
                  <div className="mt-1.5 font-extrabold text-slate-900 dark:text-white text-xs">{formatDate(viewTransfer.createdAt)}</div>
                </div>
                {viewTransfer.receivedAt && (
                  <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/40 p-3">
                    <div className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Mila</div>
                    <div className="mt-1.5 font-extrabold text-emerald-900 dark:text-emerald-200 text-xs">{formatDate(viewTransfer.receivedAt)}</div>
                  </div>
                )}
                {viewTransfer.createdBy && (
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3">
                    <div className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Banaya</div>
                    <div className="mt-1.5 font-extrabold text-slate-900 dark:text-white text-xs truncate">{viewTransfer.createdBy.fullName}</div>
                  </div>
                )}
              </div>

              <div>
                <div className="text-xs font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2 tabular-nums">
                  Items ({viewTransfer.items.length})
                </div>
                <div className="space-y-1.5">
                  {viewTransfer.items.map((it: any) => (
                    <div
                      key={it.id}
                      className="rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 p-3 flex items-center gap-3"
                    >
                      <div className="h-9 w-9 rounded-lg bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 flex items-center justify-center shrink-0">
                        <Package className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-extrabold text-slate-900 dark:text-white text-sm truncate">{it.product.name}</div>
                        {it.notes && (
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 italic mt-0.5">{it.notes}</div>
                        )}
                      </div>
                      <div className="font-extrabold text-cyan-700 dark:text-cyan-300 tabular-nums shrink-0">
                        {formatQty(it.quantity)} <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">{it.product.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {viewTransfer.notes && (
                <div className="rounded-xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/40 p-3">
                  <div className="text-[10px] font-extrabold text-amber-800 dark:text-amber-300 uppercase tracking-wider mb-1">Wajah / Note</div>
                  <div className="text-sm font-semibold text-amber-900 dark:text-amber-200">{viewTransfer.notes}</div>
                </div>
              )}

              {viewTransfer.status === 'IN_TRANSIT' && (
                <div className="rounded-xl bg-blue-50 dark:bg-blue-500/10 border-2 border-blue-200 dark:border-blue-500/40 p-3 flex items-start gap-2">
                  <Truck className="h-4 w-4 text-blue-700 dark:text-blue-300 shrink-0 mt-0.5" />
                  <div className="text-xs font-semibold text-blue-900 dark:text-blue-200">
                    Maal raste mein hai. Jab <strong>{viewTransfer.toShop?.name}</strong> ko mil jaye to <strong>"Mil Gaya ✓"</strong> dabao — stock apne aap add ho jayega.
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-end gap-2 shrink-0">
              {viewTransfer.status === 'IN_TRANSIT' ? (
                <>
                  <button
                    onClick={() => {
                      if (confirm('Transfer cancel karna hai? Stock source shop ko wapas chala jayega.')) {
                        cancelMutation.mutate(viewTransfer.id);
                      }
                    }}
                    disabled={cancelMutation.isPending}
                    className="h-11 px-4 rounded-xl bg-rose-100 dark:bg-rose-500/15 hover:bg-rose-200 dark:hover:bg-rose-500/25 border-2 border-rose-200 dark:border-rose-500/40 text-rose-700 dark:text-rose-300 text-sm font-extrabold disabled:opacity-50 transition inline-flex items-center gap-1.5"
                  >
                    <XCircle className="h-4 w-4" /> Cancel
                  </button>
                  <Button
                    onClick={() => receiveMutation.mutate(viewTransfer.id)}
                    loading={receiveMutation.isPending}
                    className="bg-gradient-to-r from-emerald-600 to-teal-700 font-extrabold shadow-lg shadow-emerald-500/40"
                  >
                    <CheckCircle2 className="h-4 w-4" /> Mil Gaya ✓
                  </Button>
                </>
              ) : (
                <button
                  onClick={() => setViewTransfer(null)}
                  className="h-11 px-4 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-sm font-extrabold text-slate-700 dark:text-slate-200 transition"
                >
                  Band Karo
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ PRINT CSS ═══ */}
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 10mm 8mm; }
          html, body {
            background: white !important; color: #0f172a !important;
            print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important;
          }
          .dark body, .dark { background: white !important; color: #0f172a !important; }
          .print\\:hidden { display: none !important; }
          section, div { box-shadow: none !important; }
          [class*="fixed"] { display: none !important; }
          html, body, #root { height: auto !important; min-height: 0 !important; overflow: visible !important; }
          [class*="sidebar"], [class*="topbar"], nav[class*="fixed"] { display: none !important; }
          .divide-y > button, .divide-y > div { page-break-inside: avoid !important; }
          [data-sonner-toaster], [data-sonner-toast], [class*="Toaster"] { display: none !important; visibility: hidden !important; }
        }
      `}</style>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   TEACHER — "Transfer kya hai"
   ═════════════════════════════════════════════════════════════ */
function TransferTeacher({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-cyan-300 dark:border-cyan-500/40 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3 border-b-2 border-cyan-200 dark:border-cyan-500/30 bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-500/15 dark:to-blue-500/15 flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-extrabold text-cyan-900 dark:text-cyan-200 flex items-center gap-2">
            <GraduationCap className="h-5 w-5" /> Stock Transfer Kya Hai?
          </h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-relaxed">
            Jab maal <strong>ek shop se dusri shop</strong> jata hai, to use yahan record karo.
            Ye sale nahi hai — maal sirf <strong>jagah badalta hai</strong>, total stock wohi rehta hai.
          </p>

          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3.5">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Kaise Kaam Karta Hai</div>
            <div className="flex items-center justify-between gap-2 text-center">
              <FlowStep emoji="📝" label="Banao" />
              <ArrowRight className="h-4 w-4 text-slate-400 shrink-0" />
              <FlowStep emoji="🚚" label="Raste Mein" />
              <ArrowRight className="h-4 w-4 text-slate-400 shrink-0" />
              <FlowStep emoji="✅" label="Mil Gaya" />
            </div>
            <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 mt-2.5 leading-relaxed">
              "Mil Gaya ✓" dabate hi stock destination shop me <strong>apne aap</strong> add ho jata hai.
              Cancel karne par stock source shop ko wapas chala jata hai.
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3 space-y-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <TipRow><strong>👁️ Stock preview</strong> — har item ke neeche dikhta hai transfer ke baad kitna bachega</TipRow>
            <TipRow><strong>Stock se zyada nahi bhej sakte</strong> — system rok dega</TipRow>
            <TipRow><strong>⌨️ Shortcut</strong> — <span className="font-mono">/</span> dabao aur product search khul jayegi</TipRow>
            <TipRow><strong>Esc</strong> — koi bhi modal band kar deta hai</TipRow>
          </div>

          <div className="rounded-2xl border-2 border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 p-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-lg">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-emerald-900 dark:text-emerald-300">Golden Rule</h4>
                <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-200 mt-1 leading-relaxed">
                  Jo maal physically ek dukan se dusri dukan gaya, uska transfer record yahan zaroor hona chahiye.
                  Warna dono shops ka stock galat dikhayega.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full h-12 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-700 text-white font-extrabold shadow-lg shadow-cyan-500/30 hover:shadow-xl transition"
          >
            Samajh Gaya 👍
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   SMALL COMPONENTS
   ═════════════════════════════════════════════════════════════ */

function FlowStep({ emoji, label }: { emoji: string; label: string }) {
  return (
    <div className="flex-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 py-2 px-1">
      <div className="text-lg">{emoji}</div>
      <div className="text-[10px] font-extrabold text-slate-700 dark:text-slate-200 mt-0.5">{label}</div>
    </div>
  );
}

function TipRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
      <div className="leading-relaxed">{children}</div>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: any;
  label: string;
  value: string | number;
  sub: string;
  tone: 'cyan' | 'amber' | 'blue' | 'emerald';
}) {
  const toneMap = {
    cyan: {
      wrap: 'border-cyan-200 dark:border-cyan-500/30 bg-cyan-50 dark:bg-cyan-500/10',
      icon: 'from-cyan-500 to-blue-700 shadow-cyan-500/30',
      text: 'text-cyan-700 dark:text-cyan-300',
    },
    amber: {
      wrap: 'border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10',
      icon: 'from-amber-500 to-orange-700 shadow-amber-500/30',
      text: 'text-amber-700 dark:text-amber-300',
    },
    blue: {
      wrap: 'border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10',
      icon: 'from-blue-500 to-indigo-700 shadow-blue-500/30',
      text: 'text-blue-700 dark:text-blue-300',
    },
    emerald: {
      wrap: 'border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10',
      icon: 'from-emerald-500 to-teal-700 shadow-emerald-500/30',
      text: 'text-emerald-700 dark:text-emerald-300',
    },
  } as const;

  const c = toneMap[tone];

  return (
    <div className={`rounded-2xl border-2 p-3 sm:p-4 ${c.wrap}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {label}
          </div>
          <div className={`mt-1 text-xl sm:text-2xl font-extrabold tabular-nums ${c.text}`}>
            {value}
          </div>
          <div className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
            {sub}
          </div>
        </div>
        <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${c.icon} text-white flex items-center justify-center shadow-lg shrink-0`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
