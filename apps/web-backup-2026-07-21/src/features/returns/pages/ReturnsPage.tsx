import { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  RotateCcw, Search, Package, X, Receipt, ArrowLeftRight, Calendar,
  ChevronRight,
} from 'lucide-react';
import { returnsApi } from '@/api/returns.api';
import { salesApi, type PaymentMethod } from '@/api/sales.api';
import { formatPKR } from '@/lib/format';
import { toast } from 'sonner';
import {
  CarpetReturnOptionsDialog,
  parseCarpetNoteClient,
  type CarpetReturnOptions,
} from '@/features/industries/carpet/components/CarpetReturnOptionsDialog';
import { SaleItemRow } from '../components/SaleItemRow';
import { ReturnCartPanel } from '../components/ReturnCartPanel';
import { ReturnHistoryTable } from '../components/ReturnHistoryTable';
import {
  type ReturnLine,
  CARPET_UNITS,
  formatDate,
} from '../components/return-types';

export default function ReturnsPage() {
  const queryClient = useQueryClient();

  // ─── State ─────────────────────────────────────────────────
  const [saleQuery, setSaleQuery] = useState('');
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [returnLines, setReturnLines] = useState<ReturnLine[]>([]);
  const [reason, setReason] = useState('');
  const [refundMethod, setRefundMethod] = useState<PaymentMethod>('CASH');
  const [notes, setNotes] = useState('');

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

  // ─── Handlers ──────────────────────────────────────────────
  const loadSale = (saleId: string) => {
    setSelectedSaleId(saleId);
    setReturnLines([]);
  };

  /**
   * Add line to return cart.
   * Standard items: direct add. Carpet items: open dialog first.
   */
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

  // ─── Stats ─────────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalRefunded = returns.reduce((s, r) => s + r.refundAmount, 0);
    const today = new Date().toDateString();
    const todayReturns = returns.filter(
      (r) => new Date(r.returnedAt).toDateString() === today,
    );
    return {
      totalReturns: returns.length,
      totalRefunded,
      todayReturns: todayReturns.length,
      todayRefunded: todayReturns.reduce((s, r) => s + r.refundAmount, 0),
    };
  }, [returns]);

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

      <div className="space-y-6">
        {/* HEADER */}
        <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-orange-900 to-orange-700 text-white p-6 shadow-2xl">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur">
              <RotateCcw className="h-3.5 w-3.5 text-amber-300" />
              Sales Returns & Refunds
            </div>
            <h2 className="mt-3 text-3xl font-extrabold">Returns Management</h2>
            <p className="mt-2 text-sm text-white/80">
              Customer maal wapas la sakta hai — carpet items pe cut piece auto-create hoga,
              standard items pe stock restore.
            </p>
          </div>
        </section>

        {/* STATS CARDS */}
        <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            label="Aaj ke Returns"
            value={stats.todayReturns}
            sub="Today's count"
            color="orange"
            icon={Calendar}
          />
          <StatCard
            label="Aaj ka Refund"
            value={formatPKR(stats.todayRefunded)}
            sub="Refunded today"
            color="rose"
            icon={RotateCcw}
          />
          <StatCard
            label="Total Returns"
            value={stats.totalReturns}
            sub="All time"
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

        {/* MAIN 2-COLUMN LAYOUT */}
        <section className="grid xl:grid-cols-2 gap-6">
          {/* LEFT — SALE PICKER */}
          <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center shadow">
                <Search className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Sale Search</h3>
                <p className="text-sm text-slate-500">Sale number ya customer name search karo</p>
              </div>
            </div>

            <div className="relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
                placeholder="NF-12345678 ya customer name..."
                value={saleQuery}
                onChange={(e) => setSaleQuery(e.target.value)}
              />
              {saleQuery && (
                <button
                  onClick={() => setSaleQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <X className="h-4 w-4 text-slate-400" />
                </button>
              )}
            </div>

            <div className="mt-4 max-h-[320px] overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-2xl">
              {filteredSales.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="h-12 w-12 rounded-2xl bg-slate-100 mx-auto flex items-center justify-center mb-2">
                    <Receipt className="h-5 w-5 text-slate-400" />
                  </div>
                  <p className="text-sm font-bold text-slate-700">No sales found</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {saleQuery ? 'Different search try karein' : 'POS se sales add karein'}
                  </p>
                </div>
              ) : (
                filteredSales.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => loadSale(s.id)}
                    className={`w-full px-5 py-3 text-left hover:bg-slate-50 transition group ${
                      selectedSaleId === s.id ? 'bg-orange-50 border-l-4 border-orange-500' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                        {(s.customer?.name || 'W').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm font-mono">
                            {s.saleNumber}
                          </span>
                          {s.status === 'PARTIALLY_RETURNED' && (
                            <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[9px] font-bold">
                              PARTIAL
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-600 truncate">
                          {s.customer?.name || 'Walk-in'}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {formatDate(s.soldAt)} • {s.items.length} items
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-extrabold text-slate-900 text-sm">
                          {formatPKR(s.total)}
                        </div>
                        <ChevronRight className="h-3 w-3 text-slate-300 ml-auto mt-1 group-hover:text-orange-500" />
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
                  <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Package className="h-4 w-4" />
                    Sale Items
                  </h4>
                  <span className="text-xs text-slate-500 font-bold">
                    {selectedSale.items.length} items
                  </span>
                </div>
                <div className="space-y-2 max-h-[320px] overflow-y-auto">
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
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// HELPER COMPONENT — Stat Card
// ═══════════════════════════════════════════════════════════

interface StatCardProps {
  label: string;
  value: string | number;
  sub: string;
  color: 'orange' | 'rose' | 'violet' | 'slate';
  icon: any;
}

function StatCard({ label, value, sub, color, icon: Icon }: StatCardProps) {
  const colorMap: Record<string, { text: string; iconBg: string; subText: string }> = {
    orange: {
      text: 'text-orange-700',
      iconBg: 'from-orange-500 to-orange-700 shadow-orange-500/30',
      subText: 'text-orange-600',
    },
    rose: {
      text: 'text-rose-700',
      iconBg: 'from-rose-500 to-rose-700 shadow-rose-500/30',
      subText: 'text-rose-600',
    },
    violet: {
      text: 'text-violet-700',
      iconBg: 'from-violet-500 to-violet-700 shadow-violet-500/30',
      subText: 'text-violet-600',
    },
    slate: {
      text: 'text-slate-900',
      iconBg: 'from-slate-700 to-slate-900',
      subText: 'text-slate-600',
    },
  };
  const c = colorMap[color];

  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">{label}</div>
          <div className={`mt-2 text-2xl font-extrabold ${c.text}`}>{value}</div>
          <div className={`text-xs ${c.subText} font-semibold mt-1`}>{sub}</div>
        </div>
        <div
          className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${c.iconBg} text-white flex items-center justify-center shadow-lg`}
        >
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
