import { useState, useMemo, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  RotateCcw, Search, Package, X, Receipt, ArrowLeftRight, Calendar,
  ChevronRight, GraduationCap, Printer, Download, CheckCircle2,
  AlertTriangle, Sparkles, TrendingDown, Zap,
} from 'lucide-react';
import { returnsApi } from '@modules/sales/returns/api/returns.api';
import { salesApi, type PaymentMethod } from '@modules/sales/sales/api/sales.api';
import { formatPKR } from '@core/lib/format';
import { toast } from 'sonner';
import {
  CarpetReturnOptionsDialog,
  parseCarpetNoteClient,
  type CarpetReturnOptions,
} from '@industries/carpet/components/CarpetReturnOptionsDialog';
import { SaleItemRow } from '../components/SaleItemRow';
import { ReturnCartPanel } from '../components/ReturnCartPanel';
import { ReturnHistoryTable } from '../components/ReturnHistoryTable';
import {
  type ReturnLine,
  CARPET_UNITS,
  formatDate,
} from '../components/return-types';
import { useAuthStore } from '@core/stores/auth.store';

/* ═════════════════════════════════════════════════════════════
   NAFAA RETURNS — GLOBAL FULL BEST v3
   ─────────────────────────────────────────────────────────────
   🌍 Universal — jeweler, tailor, mobile, carpet, electronics
   🌙 Dark mode complete
   🎓 Teacher modal — returns flow guide
   ⌨️  / = search • ↑↓ Enter = navigate sales • Esc = close
   🖨️ Print history • 📊 CSV export
   💡 Refund method sync with sale • Damage badge highlight
   📈 Refund rate % • Week comparison
   ═════════════════════════════════════════════════════════════ */

export default function ReturnsPage() {
  const queryClient = useQueryClient();
  const tenantName = useAuthStore((s) => s.tenant?.name);
  const shopName = useAuthStore((s) => s.user?.assignedShop?.name);
  const searchRef = useRef<HTMLInputElement>(null);

  // ─── State ─────────────────────────────────────────────────
  const [saleQuery, setSaleQuery] = useState('');
  const [saleHighlight, setSaleHighlight] = useState(0);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [returnLines, setReturnLines] = useState<ReturnLine[]>([]);
  const [reason, setReason] = useState('');
  const [refundMethod, setRefundMethod] = useState<PaymentMethod>('CASH');
  const [notes, setNotes] = useState('');
  const [showTeacher, setShowTeacher] = useState(false);

  // Carpet dialog state
  const [carpetDialogItem, setCarpetDialogItem] = useState<{
    saleItem: any;
    existingLineIndex?: number;
  } | null>(null);

  // ─── Queries ───────────────────────────────────────────────
  const { data: sales = [] } = useQuery({
    queryKey: ['sales-for-return'],
    queryFn: () => salesApi.list(),
  });

  const { data: returns = [], isLoading: returnsLoading } = useQuery({
    queryKey: ['returns'],
    queryFn: returnsApi.list,
  });

  const { data: selectedSale } = useQuery({
    queryKey: ['sale-detail-for-return', selectedSaleId],
    queryFn: () => salesApi.getOne(selectedSaleId!),
    enabled: !!selectedSaleId,
  });

  // Auto-sync refund method with selected sale's payment method
  useEffect(() => {
    if (selectedSale?.paymentMethod) {
      setRefundMethod(selectedSale.paymentMethod as PaymentMethod);
    }
  }, [selectedSale?.paymentMethod]);

  // ─── Mutations ─────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: returnsApi.create,
    onSuccess: (data: any) => {
      const cutPiecesCount = data.createdCutPieces?.length ?? 0;
      toast.success('Return processed successfully', {
        description:
          cutPiecesCount > 0
            ? `Refund done + ${cutPiecesCount} cut piece${cutPiecesCount !== 1 ? 's' : ''} created`
            : 'Stock wapas aa gaya aur refund record ho gaya',
      });
      setSelectedSaleId(null);
      setReturnLines([]);
      setReason('');
      setNotes('');
      queryClient.invalidateQueries({ queryKey: ['returns'] });
      queryClient.invalidateQueries({ queryKey: ['sales-for-return'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['carpet-rolls'] });
      queryClient.invalidateQueries({ queryKey: ['carpet-cut-pieces'] });
      queryClient.invalidateQueries({ queryKey: ['carpet-product-summary'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Return fail'),
  });

  // ─── Filters ───────────────────────────────────────────────
  const filteredSales = useMemo(() => {
    const q = saleQuery.toLowerCase().trim();
    let result = sales.filter((s) => s.status !== 'FULLY_RETURNED' && s.status !== 'VOIDED');
    if (q) {
      result = result.filter(
        (s) =>
          s.saleNumber.toLowerCase().includes(q) ||
          s.customer?.name.toLowerCase().includes(q) ||
          s.customer?.phone?.toLowerCase().includes(q),
      );
    }
    return result.slice(0, 15);
  }, [sales, saleQuery]);

  useEffect(() => setSaleHighlight(0), [saleQuery]);

  // ─── Handlers ──────────────────────────────────────────────
  const loadSale = (saleId: string) => {
    setSelectedSaleId(saleId);
    setReturnLines([]);
  };

  const addLine = (item: any) => {
    const remaining = item.quantity - (item.returnedQty || 0);
    if (remaining <= 0) {
      toast.error('Already fully returned');
      return;
    }
    if (returnLines.find((l) => l.saleItemId === item.id)) {
      toast.error('Already added');
      return;
    }

    const isCarpet = CARPET_UNITS.has(item.product.unit);

    if (isCarpet) {
      setCarpetDialogItem({ saleItem: item });
      return;
    }

    const variant = item.variantLink?.variant;
    setReturnLines((prev) => [
      ...prev,
      {
        saleItemId: item.id,
        productId: item.productId,
        productName: item.product.name,
        variantName: variant?.name,
        variantImage: variant?.imageUrl,
        variantColorHex: variant?.colorHex,
        unit: item.product.unit,
        price: item.price,
        maxQty: remaining,
        quantity: Math.min(1, remaining),
        note: item.note,
        isCarpet: false,
      },
    ]);
  };

  const handleCarpetConfirm = (options: CarpetReturnOptions) => {
    if (!carpetDialogItem) return;
    const { saleItem, existingLineIndex } = carpetDialogItem;

    const variant = saleItem.variantLink?.variant;
    const remaining = saleItem.quantity - (saleItem.returnedQty || 0);
    const carpetInfo = parseCarpetNoteClient(saleItem.note);

    const baseLine: ReturnLine = {
      saleItemId: saleItem.id,
      productId: saleItem.productId,
      productName: saleItem.product.name,
      variantName: variant?.name,
      variantImage: variant?.imageUrl,
      variantColorHex: variant?.colorHex,
      unit: saleItem.product.unit,
      price: saleItem.price,
      maxQty: remaining,
      quantity:
        existingLineIndex !== undefined
          ? returnLines[existingLineIndex].quantity
          : remaining,
      note: saleItem.note,
      isCarpet: true,
      carpetInfo,
      carpetOptions: options,
    };

    setReturnLines((prev) => {
      if (existingLineIndex !== undefined) {
        return prev.map((l, i) =>
          i === existingLineIndex ? { ...l, carpetOptions: options } : l,
        );
      }
      return [...prev, baseLine];
    });

    setCarpetDialogItem(null);

    toast.success(
      options.isDamaged
        ? '⚠️ Marked as damaged — cut piece will be DAMAGED'
        : options.createCutPiece
          ? '✓ Cut piece will be created'
          : '✓ Added without cut piece',
    );
  };

  const editCarpetLine = (lineIndex: number) => {
    const line = returnLines[lineIndex];
    if (!line.isCarpet || !selectedSale) return;
    const saleItem = selectedSale.items.find((i: any) => i.id === line.saleItemId);
    if (!saleItem) return;
    setCarpetDialogItem({ saleItem, existingLineIndex: lineIndex });
  };

  const updateQty = (saleItemId: string, newQty: number) => {
    setReturnLines((prev) =>
      prev.map((l) =>
        l.saleItemId === saleItemId
          ? { ...l, quantity: Math.max(0.01, Math.min(l.maxQty, newQty)) }
          : l,
      ),
    );
  };

  const removeLine = (saleItemId: string) => {
    setReturnLines((prev) => prev.filter((l) => l.saleItemId !== saleItemId));
  };

  const handleSubmit = () => {
    if (!selectedSaleId) return toast.error('Sale select karein');
    if (returnLines.length === 0) return toast.error('Items add karein');

    const unconfiguredCarpet = returnLines.find((l) => l.isCarpet && !l.carpetOptions);
    if (unconfiguredCarpet) {
      toast.error(`${unconfiguredCarpet.productName}: Carpet options configure karein`);
      return;
    }

    createMutation.mutate({
      saleId: selectedSaleId,
      reason: reason.trim() || undefined,
      refundMethod,
      notes: notes.trim() || undefined,
      items: returnLines.map((l) => ({
        saleItemId: l.saleItemId,
        quantity: l.quantity,
        ...(l.isCarpet && l.carpetOptions
          ? {
              createCutPiece: l.carpetOptions.createCutPiece,
              isDamaged: l.carpetOptions.isDamaged,
              cutPieceCondition: l.carpetOptions.cutPieceCondition,
              cutPieceWidthFt: l.carpetOptions.cutPieceWidthFt || undefined,
              cutPieceLengthFt: l.carpetOptions.cutPieceLengthFt || undefined,
              cutPieceNotes: l.carpetOptions.cutPieceNotes || undefined,
            }
          : {}),
      })),
    });
  };

  // ─── Stats — enhanced with week comparison & refund rate ───
  const stats = useMemo(() => {
    const totalRefunded = returns.reduce((s, r) => s + r.refundAmount, 0);
    const today = new Date().toDateString();
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const twoWeeksAgo = now - 14 * 24 * 60 * 60 * 1000;

    const todayReturns = returns.filter((r) => new Date(r.returnedAt).toDateString() === today);
    const thisWeek = returns.filter((r) => new Date(r.returnedAt).getTime() >= weekAgo);
    const lastWeek = returns.filter((r) => {
      const t = new Date(r.returnedAt).getTime();
      return t >= twoWeeksAgo && t < weekAgo;
    });

    const totalSales = sales.length;
    const refundRate = totalSales > 0 ? (returns.length / totalSales) * 100 : 0;

    const weekTrend = lastWeek.length > 0
      ? ((thisWeek.length - lastWeek.length) / lastWeek.length) * 100
      : 0;

    return {
      totalReturns: returns.length,
      totalRefunded,
      todayReturns: todayReturns.length,
      todayRefunded: todayReturns.reduce((s, r) => s + r.refundAmount, 0),
      thisWeekCount: thisWeek.length,
      thisWeekRefunded: thisWeek.reduce((s, r) => s + r.refundAmount, 0),
      weekTrend,
      refundRate,
    };
  }, [returns, sales]);

  // Cart totals
  const cartTotal = useMemo(
    () => returnLines.reduce((s, l) => s + l.price * l.quantity, 0),
    [returnLines],
  );
  const damagedCount = returnLines.filter((l) => l.isCarpet && l.carpetOptions?.isDamaged).length;

  // CSV export
  const exportCSV = () => {
    if (returns.length === 0) return toast.error('Koi returns nahi');
    const headers = ['Return #', 'Sale #', 'Customer', 'Refund', 'Method', 'Reason', 'Date'];
    const rows = returns.map((r: any) => [
      r.returnNumber || r.id,
      r.sale?.saleNumber || '',
      r.sale?.customer?.name || 'Walk-in',
      r.refundAmount.toFixed(2),
      r.refundMethod || '',
      r.reason || '',
      new Date(r.returnedAt).toLocaleString('en-PK'),
    ]);
    const summaryRows = [
      [`Returns Report — ${tenantName || 'My Store'}`],
      [`${shopName ? `Shop: ${shopName}  •  ` : ''}Generated: ${new Date().toLocaleString('en-PK')}`],
      [`Total returns: ${returns.length}  •  Refunded: ${stats.totalRefunded.toFixed(2)}  •  Refund rate: ${stats.refundRate.toFixed(1)}%`],
      [''],
    ];
    const csv = [...summaryRows, headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `returns-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${returns.length} returns exported`);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showTeacher) return setShowTeacher(false);
        if (carpetDialogItem) return; // dialog handles its own escape
      }
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (showTeacher || carpetDialogItem) return;

      if (e.key === '/') {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key.toLowerCase() === 'g') {
        e.preventDefault();
        setShowTeacher(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showTeacher, carpetDialogItem]);

  // Sales list keyboard nav
  const onSaleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!filteredSales.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSaleHighlight((h) => Math.min(h + 1, filteredSales.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSaleHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const s = filteredSales[saleHighlight];
      if (s) loadSale(s.id);
    }
  };

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = showTeacher ? 'hidden' : prev;
    return () => { document.body.style.overflow = prev; };
  }, [showTeacher]);

  return (
    <>
      {/* CARPET RETURN DIALOG */}
      {carpetDialogItem && (
        <CarpetReturnOptionsDialog
          carpetInfo={parseCarpetNoteClient(carpetDialogItem.saleItem.note)}
          productName={carpetDialogItem.saleItem.product.name}
          variantName={carpetDialogItem.saleItem.variantLink?.variant?.name}
          returnedSqft={
            carpetDialogItem.existingLineIndex !== undefined
              ? returnLines[carpetDialogItem.existingLineIndex].quantity
              : carpetDialogItem.saleItem.quantity -
                (carpetDialogItem.saleItem.returnedQty || 0)
          }
          pricePerSqft={carpetDialogItem.saleItem.price}
          initialOptions={
            carpetDialogItem.existingLineIndex !== undefined
              ? returnLines[carpetDialogItem.existingLineIndex].carpetOptions
              : undefined
          }
          onConfirm={handleCarpetConfirm}
          onClose={() => setCarpetDialogItem(null)}
        />
      )}

      {showTeacher && <ReturnsTeacher onClose={() => setShowTeacher(false)} />}

      <div className="space-y-5 pb-10 print:space-y-3">
        {/* ═══ PRINT HEADER ═══ */}
        <div className="hidden print:block">
          <div className="flex items-center justify-between border-b-4 border-orange-600 pb-3 mb-4">
            <div>
              <h1 className="text-2xl font-black text-slate-900 leading-tight">
                🔄 {tenantName || 'My Store'} — Returns Report
              </h1>
              <p className="text-xs text-slate-600 font-semibold mt-1">
                {shopName ? `${shopName}  •  ` : ''}{returns.length} returns • Refunded: {formatPKR(stats.totalRefunded)}
              </p>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase font-bold text-slate-500">Generated</div>
              <div className="text-xs font-bold text-slate-900">{new Date().toLocaleString('en-PK')}</div>
            </div>
          </div>
        </div>

        {/* ═══ HERO ═══ */}
        <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-950 via-orange-900 to-orange-700 dark:from-slate-950 dark:via-orange-950 dark:to-orange-900 text-white p-4 sm:p-6 shadow-2xl print:hidden">
          <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-orange-400/25 blur-3xl pointer-events-none animate-pulse" />
          <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-rose-400/20 blur-3xl pointer-events-none" />

          <div className="relative flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
            <div className="min-w-0 flex-1">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-3 py-1 text-[11px] font-extrabold border border-white/25 uppercase tracking-widest shadow-lg">
                <RotateCcw className="h-3.5 w-3.5 text-amber-300" /> Returns & Refunds
                {shopName && (
                  <>
                    <span className="opacity-40">•</span>
                    <span className="text-emerald-200">🏪 {shopName}</span>
                  </>
                )}
              </div>
              <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-tight">
                🔄 Returns Management
              </h1>
              <p className="mt-1.5 text-xs sm:text-sm text-white/90 font-semibold max-w-2xl">
                Customer maal wapas la sakta hai — carpet items pe cut piece auto-create hoga,
                standard items pe stock restore. Damaged items alag mark honge.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <button
                onClick={() => setShowTeacher(true)}
                className="h-11 px-3 rounded-xl bg-amber-400/90 hover:bg-amber-400 text-slate-900 text-xs font-extrabold inline-flex items-center gap-1.5 shadow-lg transition"
                title="Returns kaise karte hain?"
              >
                <GraduationCap className="h-4 w-4" /> <span className="hidden sm:inline">Guide</span>
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
                <Download className="h-4 w-4" /> <span className="hidden sm:inline">CSV</span>
              </button>
            </div>
          </div>

          <div className="relative mt-3 hidden sm:flex flex-wrap gap-1.5 text-[10px] font-bold items-center">
            <Kbd>/</Kbd><span className="text-white/60">Search sales</span>
            <span className="text-white/30 mx-1">•</span>
            <Kbd>↑</Kbd><Kbd>↓</Kbd><Kbd>Enter</Kbd><span className="text-white/60">Sale nav</span>
            <span className="text-white/30 mx-1">•</span>
            <Kbd>G</Kbd><span className="text-white/60">Guide</span>
          </div>
        </section>

        {/* ═══ STATS ═══ */}
        <section className="grid grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-3">
          <StatCard
            label="Aaj ke Returns"
            value={stats.todayReturns}
            sub={`Refund: ${formatPKR(stats.todayRefunded)}`}
            color="orange"
            icon={Calendar}
          />
          <StatCard
            label="Is Hafte"
            value={stats.thisWeekCount}
            sub={
              stats.weekTrend !== 0
                ? `${stats.weekTrend > 0 ? '↑' : '↓'} ${Math.abs(stats.weekTrend).toFixed(0)}% vs last week`
                : 'Refund ' + formatPKR(stats.thisWeekRefunded)
            }
            color="rose"
            icon={TrendingDown}
          />
          <StatCard
            label="Total Returns"
            value={stats.totalReturns}
            sub={`Refund rate: ${stats.refundRate.toFixed(1)}%`}
            color="violet"
            icon={ArrowLeftRight}
          />
          <StatCard
            label="Total Refunded"
            value={formatPKR(stats.totalRefunded)}
            sub="Lifetime refunds"
            color="slate"
            icon={Receipt}
          />
        </section>

        {/* ═══ MAIN 2-COLUMN ═══ */}
        <section className="grid xl:grid-cols-2 gap-5 print:hidden">
          {/* LEFT — SALE PICKER */}
          <div className="rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm p-5 sm:p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Search className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">Sale Search</h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">Sale number ya customer name search karo</p>
              </div>
              {selectedSaleId && (
                <button
                  onClick={() => { setSelectedSaleId(null); setReturnLines([]); }}
                  className="h-9 px-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-slate-600 dark:text-slate-300 hover:text-rose-600 text-xs font-extrabold inline-flex items-center gap-1 transition"
                  title="Clear selection"
                >
                  <X className="h-3 w-3" /> Clear
                </button>
              )}
            </div>

            <div className="relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchRef}
                className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-10 pr-10 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                placeholder="NF-12345678 ya customer name... (/ shortcut)"
                value={saleQuery}
                onChange={(e) => setSaleQuery(e.target.value)}
                onKeyDown={onSaleKey}
              />
              {saleQuery && (
                <button
                  onClick={() => setSaleQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center"
                >
                  <X className="h-4 w-4 text-slate-400" />
                </button>
              )}
            </div>

            <div className="mt-4 max-h-[320px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50/30 dark:bg-slate-800/30">
              {filteredSales.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-slate-800 mx-auto flex items-center justify-center mb-2">
                    <Receipt className="h-5 w-5 text-slate-400" />
                  </div>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No sales found</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {saleQuery ? 'Different search try karein' : 'POS se sales add karein'}
                  </p>
                </div>
              ) : (
                filteredSales.map((s, idx) => (
                  <button
                    key={s.id}
                    onClick={() => loadSale(s.id)}
                    onMouseEnter={() => setSaleHighlight(idx)}
                    className={`w-full px-4 py-3 text-left transition group ${
                      selectedSaleId === s.id
                        ? 'bg-orange-50 dark:bg-orange-500/15 border-l-4 border-orange-500'
                        : idx === saleHighlight
                          ? 'bg-slate-100 dark:bg-slate-800/60'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 flex items-center justify-center font-extrabold text-xs shrink-0">
                        {(s.customer?.name || 'W').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-slate-900 dark:text-white text-sm font-mono">
                            {s.saleNumber}
                          </span>
                          {s.status === 'PARTIALLY_RETURNED' && (
                            <span className="px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[9px] font-extrabold border border-amber-300 dark:border-amber-500/40">
                              PARTIAL
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-400 truncate font-semibold">
                          {s.customer?.name || 'Walk-in'}
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 font-bold">
                          {formatDate(s.soldAt)} • {s.items.length} items
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-extrabold text-slate-900 dark:text-white text-sm tabular-nums">
                          {formatPKR(s.total)}
                        </div>
                        <ChevronRight className={`h-3 w-3 ml-auto mt-1 transition ${
                          selectedSaleId === s.id
                            ? 'text-orange-500'
                            : 'text-slate-300 dark:text-slate-600 group-hover:text-orange-500'
                        }`} />
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Selected sale items */}
            {selectedSale && (
              <div className="mt-5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Package className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    Sale Items
                  </h4>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-extrabold">
                      {selectedSale.items.length} items
                    </span>
                    {returnLines.length > 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300 font-extrabold">
                        {returnLines.length} in cart
                      </span>
                    )}
                  </div>
                </div>
                <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                  {selectedSale.items.map((item: any) => (
                    <SaleItemRow
                      key={item.id}
                      item={item}
                      alreadyAdded={!!returnLines.find((l) => l.saleItemId === item.id)}
                      onAdd={() => addLine(item)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Cart preview badges */}
            {returnLines.length > 0 && (
              <div className="mt-4 rounded-2xl bg-gradient-to-br from-orange-50 to-rose-50 dark:from-orange-500/10 dark:to-rose-500/10 border-2 border-orange-300 dark:border-orange-500/40 p-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0">
                      <RotateCcw className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-extrabold text-orange-700 dark:text-orange-300">
                        Return cart me
                      </div>
                      <div className="text-sm font-extrabold text-slate-900 dark:text-white">
                        {returnLines.length} item{returnLines.length !== 1 ? 's' : ''} · {formatPKR(cartTotal)}
                        {damagedCount > 0 && (
                          <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-rose-500 text-white font-extrabold inline-flex items-center gap-1">
                            <AlertTriangle className="h-2.5 w-2.5" /> {damagedCount} damaged
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT — CART + CHECKOUT PANEL */}
          <ReturnCartPanel
            returnLines={returnLines}
            reason={reason}
            refundMethod={refundMethod}
            notes={notes}
            loading={createMutation.isPending}
            onReasonChange={setReason}
            onRefundMethodChange={setRefundMethod}
            onNotesChange={setNotes}
            onQuantityChange={updateQty}
            onRemoveLine={removeLine}
            onEditCarpetLine={editCarpetLine}
            onSubmit={handleSubmit}
          />
        </section>

        {/* HISTORY TABLE */}
        <ReturnHistoryTable returns={returns} loading={returnsLoading} />
      </div>

      {/* Print CSS */}
      <style>{`
        @media print {
          @page { size: A4; margin: 12mm 10mm; }
          html, body {
            background: white !important; color: #0f172a !important;
            print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important;
          }
          .dark body, .dark { background: white !important; color: #0f172a !important; }
          [class*="sidebar"], [class*="topbar"], nav[class*="fixed"] { display: none !important; }
          [data-sonner-toaster], [data-sonner-toast] { display: none !important; }
          a { color: inherit !important; text-decoration: none !important; }
        }
      `}</style>
    </>
  );
}

// ═════════════════════════════════════════════════════════════
// HELPERS
// ═════════════════════════════════════════════════════════════

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="px-1.5 py-0.5 rounded bg-white/15 border border-white/25 text-white font-mono font-bold shadow-sm text-[9px]">
      {children}
    </kbd>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  sub: string;
  color: 'orange' | 'rose' | 'violet' | 'slate';
  icon: any;
}

function StatCard({ label, value, sub, color, icon: Icon }: StatCardProps) {
  const colorMap: Record<string, { text: string; iconBg: string; subText: string; darkText: string; darkSub: string }> = {
    orange: {
      text: 'text-orange-700',
      darkText: 'dark:text-orange-300',
      iconBg: 'from-orange-500 to-orange-700 shadow-orange-500/40',
      subText: 'text-orange-600',
      darkSub: 'dark:text-orange-400',
    },
    rose: {
      text: 'text-rose-700',
      darkText: 'dark:text-rose-300',
      iconBg: 'from-rose-500 to-rose-700 shadow-rose-500/40',
      subText: 'text-rose-600',
      darkSub: 'dark:text-rose-400',
    },
    violet: {
      text: 'text-violet-700',
      darkText: 'dark:text-violet-300',
      iconBg: 'from-violet-500 to-violet-700 shadow-violet-500/40',
      subText: 'text-violet-600',
      darkSub: 'dark:text-violet-400',
    },
    slate: {
      text: 'text-slate-900',
      darkText: 'dark:text-white',
      iconBg: 'from-slate-700 to-slate-900 shadow-slate-500/40',
      subText: 'text-slate-600',
      darkSub: 'dark:text-slate-400',
    },
  };
  const c = colorMap[color];

  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-extrabold truncate">{label}</div>
          <div className={`mt-1.5 text-xl sm:text-2xl font-extrabold ${c.text} ${c.darkText} tabular-nums truncate`}>{value}</div>
          <div className={`text-[10px] ${c.subText} ${c.darkSub} font-bold mt-0.5 truncate`}>{sub}</div>
        </div>
        <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${c.iconBg} text-white flex items-center justify-center shadow-lg shrink-0`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function ReturnsTeacher({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-orange-300 dark:border-orange-500/40 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3 border-b-2 border-orange-200 dark:border-orange-500/30 bg-gradient-to-r from-orange-50 to-rose-50 dark:from-orange-500/15 dark:to-rose-500/15 flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-extrabold text-orange-900 dark:text-orange-200 flex items-center gap-2">
            <GraduationCap className="h-5 w-5" /> Returns — Complete Guide
          </h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-relaxed">
            <strong>Return = customer maal wapas laya, aap paisa wapis dete ho.</strong> Yeh 3 step
            process hai: <strong>Sale dhoondo → Items add karo → Refund process karo</strong>.
          </p>

          {/* Live misal */}
          <div className="rounded-2xl border-2 border-orange-200 dark:border-orange-500/30 bg-orange-50/60 dark:bg-orange-500/5 p-4 space-y-3">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-orange-700 dark:text-orange-300">
              📱 Misal: Mobile shop
            </div>
            <div className="space-y-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <div className="rounded-lg bg-white dark:bg-slate-800 border border-orange-200 dark:border-orange-500/30 p-2">
                <strong>Sale NF-12345:</strong> iPhone 15 Rs 3,50,000 (kal ki sale)
              </div>
              <div className="rounded-lg bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-300 dark:border-emerald-500/40 p-2 font-extrabold text-emerald-800 dark:text-emerald-300">
                ✅ Return process: Sale search → iPhone add karo → Reason likho → Refund method choose (usually same as sale) → Complete
              </div>
              <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-2 text-slate-600 dark:text-slate-400">
                → IMEI wapis stock me • customer ka udhaar wapis • sale status = "PARTIALLY_RETURNED"
              </div>
            </div>
          </div>

          {/* Carpet special */}
          <div className="rounded-2xl border-2 border-violet-200 dark:border-violet-500/30 bg-violet-50/60 dark:bg-violet-500/5 p-4">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-violet-700 dark:text-violet-300 mb-2">
              🧶 Carpet ki special handling
            </div>
            <div className="space-y-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <Tip><strong>Cut piece create hota hai</strong> — customer ne 5×8 ft laya, ab woh separate saleable piece ban ke inventory me</Tip>
              <Tip><strong>Damaged option</strong> — agar kata phata hai, damaged mark karo — badge red hoga, kam price</Tip>
              <Tip><strong>Custom width/length</strong> — dialog me actual size dalo, sqft auto-calculate</Tip>
            </div>
          </div>

          {/* Statuses */}
          <div className="rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 p-4">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-slate-600 dark:text-slate-400 mb-2">
              📊 Sale statuses returns me
            </div>
            <div className="space-y-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-200">
              <div>✅ <strong>COMPLETED</strong> — full return possible</div>
              <div>🟡 <strong>PARTIAL</strong> — kuch items return ho gaye, baaki ho sakte hain</div>
              <div>❌ <strong>FULLY_RETURNED</strong> — sab wapis, list me nahi aayegi</div>
              <div>🚫 <strong>VOIDED</strong> — sale cancel, return na ho sakti</div>
            </div>
          </div>

          <div className="rounded-2xl border-2 border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-500/5 p-4 space-y-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <Tip><strong>💰 Refund method auto-fill</strong> — jo method sale me use hua tha, wohi default</Tip>
            <Tip><strong>📈 Refund rate</strong> — total returns ÷ total sales × 100. 5% se zyada ho to product quality dekhein</Tip>
            <Tip><strong>📊 Week trend</strong> — is hafte last hafte se kitna zyada/kam</Tip>
            <Tip><strong>⌨️ / </strong>— search focus • <strong>↑↓ Enter</strong> — sale navigate</Tip>
          </div>

          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3 text-xs font-semibold text-slate-700 dark:text-slate-200">
            💡 <strong>Pro tip:</strong> Reason field me hamesha customer ka kehna likho — "phone heat hota hai",
            "size fit nahi" — analytics me pattern dikhega ke kaunsi products zyada return hoti hain.
          </div>

          <button
            onClick={onClose}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-orange-600 to-rose-700 hover:from-orange-700 hover:to-rose-800 text-white font-extrabold shadow-lg shadow-orange-500/40 inline-flex items-center justify-center gap-2 transition"
          >
            <CheckCircle2 className="h-4 w-4" /> Samajh Gaya!
          </button>
        </div>
      </div>
    </div>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <Zap className="h-3 w-3 text-amber-500 shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  );
}
