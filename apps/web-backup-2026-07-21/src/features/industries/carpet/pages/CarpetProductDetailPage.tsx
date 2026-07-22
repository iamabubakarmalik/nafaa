import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Edit3, Plus, Layers, Scissors, Ruler, Package,
  DollarSign, TrendingUp, MapPin, Palette, Star, Eye, EyeOff,
  Sparkles, BarChart3, ChevronRight, ExternalLink, AlertTriangle,
  Receipt, Calendar, ImageIcon, Printer, Trash2, RotateCcw,
  ShoppingCart, Wallet, Hash, Tag,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { formatPKR, formatPKRFull } from '@/lib/format';
import { productsApi } from '@/api/products.api';
import { productVariantsApi } from '@/api/product-variants.api';
import { productImagesApi } from '@/api/product-images.api';
import { salesApi } from '@/api/sales.api';
import { carpetRollsApi } from '../api/carpet-rolls.api';
import { healOrphanCarpetRolls } from '../api/carpet-wizard.api';
import { carpetCutPiecesApi } from '../api/carpet-cut-pieces.api';
import { AddRollModal } from '../components/AddRollModal';

export default function CarpetProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showAddRoll, setShowAddRoll] = useState(false);
  const [addRollVariant, setAddRollVariant] = useState<string | undefined>();

  // ─── Fetch product + related data ────────────────────
  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productsApi.getOne(id!),
    enabled: !!id,
  });

  const { data: variants = [] } = useQuery({
    queryKey: ['product-variants', id],
    queryFn: () => productVariantsApi.list(id!),
    enabled: !!id,
  });

  const { data: images = [] } = useQuery({
    queryKey: ['product-images', id],
    queryFn: () => productImagesApi.list(id!),
    enabled: !!id,
  });

  const { data: rollsData } = useQuery({
    queryKey: ['carpet-rolls-for-product', id],
    queryFn: () => carpetRollsApi.list({ productId: id, limit: 200 }),
    enabled: !!id,
  });
  const rolls = rollsData?.items ?? [];

  const { data: cutPiecesData } = useQuery({
    queryKey: ['carpet-cut-pieces-for-product', id],
    queryFn: () => carpetCutPiecesApi.list({ productId: id, limit: 200 }),
    enabled: !!id,
  });
  const cutPieces = cutPiecesData?.items ?? [];

  const { data: allSales = [] } = useQuery({
    queryKey: ['sales-list-for-product'],
    queryFn: () => salesApi.list(),
    enabled: !!id,
  });

  const salesForProduct = useMemo(() => {
    if (!id) return [];
    return allSales
      .filter((s) => s.items.some((it) => it.product?.id === id))
      .slice(0, 20);
  }, [allSales, id]);

  // ─── One-time heal for orphan rolls ─────────────────
  // Old products (pre-fix) may have rolls with variantId=null
  // even though variants exist. Silently reassign on mount so
  // the "No variant" bucket stops appearing.
  const healedRef = useRef(false);
  useEffect(() => {
    if (!id || healedRef.current) return;
    if (variants.length === 0 || rolls.length === 0) return;
    const hasOrphans = rolls.some((r: any) => !r.variantId && r.status === 'ACTIVE');
    if (!hasOrphans) return;
    healedRef.current = true;
    healOrphanCarpetRolls(id).then((n) => {
      if (n > 0) {
        queryClient.invalidateQueries({ queryKey: ['carpet-rolls-for-product', id] });
      }
    });
  }, [id, variants.length, rolls.length, queryClient]);

  const removeMutation = useMutation({
    mutationFn: () => productsApi.remove(id!),
    onSuccess: (data: any) => {
      toast.success(data?.softDeleted ? 'Product deactivated' : 'Product deleted');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      navigate('/carpet-rolls');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Delete failed'),
  });

  // ─── Aggregated stats ────────────────────────────────
  const stats = useMemo(() => {
    const activeRolls = rolls.filter((r) => r.status === 'ACTIVE');
    const rollSqft = activeRolls.reduce((a, r) => a + Number(r.remainingSqft || 0), 0);
    const rollLength = activeRolls.reduce((a, r) => a + Number(r.remainingLengthFt || 0), 0);
    const rollValue = activeRolls.reduce(
      (a, r) => a + Number(r.remainingSqft || 0) * Number(r.salePricePerSqft || 0), 0,
    );
    const rollCost = activeRolls.reduce(
      (a, r) => a + Number(r.remainingSqft || 0) * Number(r.costPerSqft || 0), 0,
    );

    const availPieces = cutPieces.filter((p) => p.status === 'AVAILABLE');
    const pieceSqft = availPieces.reduce((a, p) => a + Number(p.totalSqft || 0), 0);
    const pieceValue = availPieces.reduce((a, p) => a + Number(p.salePrice || 0), 0);
    const pieceCost = availPieces.reduce((a, p) => a + Number(p.costAmount || 0), 0);

    // Sales aggregate
    const soldItems = allSales.flatMap((s) =>
      s.items.filter((it) => it.product?.id === id).map((it) => ({ ...it, sale: s })),
    );
    const totalSold = soldItems.reduce((a, it) => a + Number(it.quantity || 0), 0);
    const totalRevenue = soldItems.reduce((a, it) => a + Number(it.total || 0), 0);
    const totalOrders = new Set(soldItems.map((it) => it.sale.id)).size;

    return {
      activeRollCount: activeRolls.length,
      totalRollCount: rolls.length,
      rollSqft, rollLength, rollValue, rollCost,
      availPieceCount: availPieces.length,
      totalPieceCount: cutPieces.length,
      pieceSqft, pieceValue, pieceCost,
      totalSqft: rollSqft + pieceSqft,
      totalStockValue: rollValue + pieceValue,
      totalStockCost: rollCost + pieceCost,
      totalSold, totalRevenue, totalOrders,
    };
  }, [rolls, cutPieces, allSales, id]);

  // ─── Per-variant breakdown ───────────────────────────
  const variantBreakdown = useMemo(() => {
    // "No variant" bucket
    const buckets = new Map<string | null, {
      variantId: string | null;
      variantName: string;
      colorHex?: string | null;
      designCode?: string | null;
      rollCount: number;
      rollSqft: number;
      pieceCount: number;
      pieceSqft: number;
      totalSqft: number;
      stockValue: number;
    }>();

    // Seed with all variants (so even zero-stock ones show)
    for (const v of variants) {
      buckets.set(v.id, {
        variantId: v.id,
        variantName: v.name,
        colorHex: v.colorHex,
        designCode: v.size,
        rollCount: 0, rollSqft: 0,
        pieceCount: 0, pieceSqft: 0,
        totalSqft: 0, stockValue: 0,
      });
    }
    if (rolls.some((r) => !r.variantId) || cutPieces.some((p) => !p.variantId)) {
      buckets.set(null, {
        variantId: null,
        variantName: 'No variant',
        rollCount: 0, rollSqft: 0,
        pieceCount: 0, pieceSqft: 0,
        totalSqft: 0, stockValue: 0,
      });
    }

    for (const r of rolls) {
      if (r.status !== 'ACTIVE') continue;
      const b = buckets.get(r.variantId ?? null);
      if (!b) continue;
      b.rollCount++;
      b.rollSqft += Number(r.remainingSqft || 0);
      b.stockValue += Number(r.remainingSqft || 0) * Number(r.salePricePerSqft || 0);
    }
    for (const p of cutPieces) {
      if (p.status !== 'AVAILABLE') continue;
      const b = buckets.get(p.variantId ?? null);
      if (!b) continue;
      b.pieceCount++;
      b.pieceSqft += Number(p.totalSqft || 0);
      b.stockValue += Number(p.salePrice || 0);
    }
    for (const b of buckets.values()) {
      b.totalSqft = b.rollSqft + b.pieceSqft;
    }
    return Array.from(buckets.values());
  }, [variants, rolls, cutPieces]);

  if (isLoading || !product) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-12 w-12 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8">
      {showAddRoll && id && (
        <AddRollModal
          preselectedProductId={id}
          preselectedVariantId={addRollVariant}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['carpet-rolls-for-product', id] });
            queryClient.invalidateQueries({ queryKey: ['carpet-rolls'] });
            queryClient.invalidateQueries({ queryKey: ['carpet-rolls-summary'] });
          }}
          onClose={() => { setShowAddRoll(false); setAddRollVariant(undefined); }}
        />
      )}

      {/* ─── Back nav ─── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          onClick={() => navigate('/carpet-rolls')}
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-emerald-600 font-bold transition"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Carpet Rolls
        </button>
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            to={`/carpet-products/${id}/edit`}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-50 border-2 border-blue-200 hover:bg-blue-100 text-blue-700 text-sm font-extrabold transition"
          >
            <Edit3 className="h-4 w-4" /> Edit Product
          </Link>
          <Link
            to="/catalog"
            target="_blank"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 border-2 border-emerald-200 hover:bg-emerald-100 text-emerald-700 text-sm font-extrabold transition"
          >
            <ExternalLink className="h-4 w-4" /> View in Catalog
          </Link>
          <button
            onClick={() => {
              if (confirm(`Delete "${product.name}"?`)) removeMutation.mutate();
            }}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-50 border-2 border-rose-200 hover:bg-rose-100 text-rose-700 text-sm font-extrabold transition"
          >
            <Trash2 className="h-4 w-4" /> Delete
          </button>
        </div>
      </div>

      {/* ═══════════════ HERO HEADER ═══════════════ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-900 to-emerald-700 text-white shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-amber-400/15 blur-3xl" />

        <div className="relative grid lg:grid-cols-[280px_1fr] gap-6 p-6">
          {/* Image */}
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-white/10 backdrop-blur border-2 border-white/20 shrink-0">
            {images[0]?.url ? (
              <img
                src={images[0].url}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/50">
                <ImageIcon className="h-16 w-16" />
              </div>
            )}
            {product.isFeatured && (
              <div className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-amber-500 text-white text-[10px] font-extrabold shadow-lg inline-flex items-center gap-1">
                <Star className="h-3 w-3 fill-white" /> FEATURED
              </div>
            )}
            {!product.isActive && (
              <div className="absolute inset-x-0 bottom-0 py-1.5 bg-rose-600 text-white text-center text-xs font-extrabold">
                INACTIVE
              </div>
            )}
          </div>

          {/* Info */}
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Layers className="h-3.5 w-3.5 text-amber-300" />
              Carpet Product
              {product.category && (
                <>
                  <span className="text-white/40">•</span>
                  <span>{product.category.name}</span>
                </>
              )}
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">
              {product.name}
            </h1>
            {product.shortDescription && (
              <p className="mt-2 text-sm text-white/85 max-w-2xl">{product.shortDescription}</p>
            )}

            <div className="mt-3 flex items-center gap-3 flex-wrap text-xs">
              {product.sku && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/10 backdrop-blur font-mono">
                  <Hash className="h-3 w-3" /> {product.sku}
                </span>
              )}
              {product.barcode && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/10 backdrop-blur font-mono">
                  {product.barcode}
                </span>
              )}
              {product.brand && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-500/30 border border-violet-300/40 font-bold">
                  <Tag className="h-3 w-3" /> {product.brand.name}
                </span>
              )}
            </div>

            {/* KPI strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
              <HeroStat icon={Layers} label="Active Rolls" value={stats.activeRollCount} sub={`${stats.rollSqft.toFixed(0)} sqft`} tone="emerald" />
              <HeroStat icon={Scissors} label="Cut Pieces" value={stats.availPieceCount} sub={`${stats.pieceSqft.toFixed(0)} sqft`} tone="violet" />
              <HeroStat icon={Package} label="Total Sqft" value={stats.totalSqft.toFixed(0)} sub={`across ${variants.length} variant${variants.length !== 1 ? 's' : ''}`} tone="blue" />
              <HeroStat icon={TrendingUp} label="Stock Value" value={formatPKRFull(stats.totalStockValue)} sub={`Cost: ${formatPKRFull(stats.totalStockCost)}`} tone="amber" />
            </div>

            {/* Prices */}
            <div className="mt-5 flex items-center gap-4 flex-wrap">
              <div>
                <div className="text-[10px] uppercase font-extrabold text-white/70 tracking-wider">Sale price</div>
                <div className="text-3xl font-extrabold tabular-nums leading-none mt-1">
                  {formatPKRFull(product.price)}
                  <span className="text-sm font-bold text-white/70 ml-1">/ {product.unit}</span>
                </div>
              </div>
              {product.costPrice > 0 && (
                <div>
                  <div className="text-[10px] uppercase font-extrabold text-white/70 tracking-wider">Cost</div>
                  <div className="text-xl font-extrabold tabular-nums text-white/80 leading-none mt-1">
                    {formatPKRFull(product.costPrice)}
                  </div>
                </div>
              )}
              {product.wholesalePrice && (
                <div>
                  <div className="text-[10px] uppercase font-extrabold text-white/70 tracking-wider">Wholesale</div>
                  <div className="text-xl font-extrabold tabular-nums text-amber-300 leading-none mt-1">
                    {formatPKRFull(product.wholesalePrice)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ QUICK ACTIONS ═══════════════ */}
      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <QuickAction
          icon={Plus}
          title="Add Roll"
          desc="Add new physical roll"
          onClick={() => { setAddRollVariant(undefined); setShowAddRoll(true); }}
          tone="emerald"
        />
        <Link to="/carpet-cut-pieces" className="rounded-2xl bg-white border-2 border-slate-200 hover:border-violet-400 hover:shadow-md p-4 flex items-center gap-3 transition group">
          <div className="h-11 w-11 rounded-xl bg-violet-100 group-hover:bg-violet-600 group-hover:text-white text-violet-700 flex items-center justify-center transition">
            <Scissors className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-extrabold text-slate-900 text-sm">Cut Pieces</div>
            <div className="text-[10px] text-slate-500 font-semibold">Leftover / centre pieces</div>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </Link>
        <Link to={`/carpet-rolls?productId=${id}`} className="rounded-2xl bg-white border-2 border-slate-200 hover:border-blue-400 hover:shadow-md p-4 flex items-center gap-3 transition group">
          <div className="h-11 w-11 rounded-xl bg-blue-100 group-hover:bg-blue-600 group-hover:text-white text-blue-700 flex items-center justify-center transition">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-extrabold text-slate-900 text-sm">All Rolls</div>
            <div className="text-[10px] text-slate-500 font-semibold">Filter by this product</div>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </Link>
        <Link to="/pos" className="rounded-2xl bg-white border-2 border-slate-200 hover:border-amber-400 hover:shadow-md p-4 flex items-center gap-3 transition group">
          <div className="h-11 w-11 rounded-xl bg-amber-100 group-hover:bg-amber-600 group-hover:text-white text-amber-700 flex items-center justify-center transition">
            <ShoppingCart className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-extrabold text-slate-900 text-sm">Go to POS</div>
            <div className="text-[10px] text-slate-500 font-semibold">Sell this product</div>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </Link>
      </section>

      {/* ═══════════════ VARIANT BREAKDOWN ═══════════════ */}
      {variantBreakdown.length > 0 && (
        <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b-2 border-slate-100 bg-gradient-to-r from-emerald-50/50 to-white flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 text-white flex items-center justify-center shadow-md">
                <Palette className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg leading-tight">
                  Variant Breakdown
                </h3>
                <p className="text-xs text-slate-500 font-semibold">
                  {variantBreakdown.length} color{variantBreakdown.length !== 1 ? 's' : ''} • per-variant stock
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {variantBreakdown.map((b) => (
              <div
                key={b.variantId ?? 'none'}
                className={[
                  'rounded-2xl border-2 p-3',
                  b.totalSqft > 0
                    ? 'border-emerald-200 bg-emerald-50/30'
                    : 'border-slate-200 bg-slate-50/50',
                ].join(' ')}
              >
                <div className="flex items-start gap-3">
                  {b.colorHex ? (
                    <div
                      className="h-11 w-11 rounded-xl border-2 border-white shadow-md shrink-0"
                      style={{ backgroundColor: b.colorHex }}
                    />
                  ) : (
                    <div className="h-11 w-11 rounded-xl bg-slate-200 text-slate-500 flex items-center justify-center shrink-0">
                      <Palette className="h-5 w-5" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-slate-900 text-sm truncate">
                      {b.variantName}
                    </div>
                    {b.designCode && (
                      <div className="text-[10px] font-mono text-slate-500">{b.designCode}</div>
                    )}
                  </div>
                  {b.variantId && (
                    <button
                      onClick={() => {
                        setAddRollVariant(b.variantId ?? undefined);
                        setShowAddRoll(true);
                      }}
                      className="h-7 w-7 rounded-lg bg-emerald-100 hover:bg-emerald-600 hover:text-white text-emerald-700 flex items-center justify-center transition"
                      title="Add roll for this variant"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div className="rounded-lg bg-white border border-slate-200 p-2">
                    <div className="text-[9px] uppercase font-extrabold text-emerald-700 flex items-center gap-0.5">
                      <Layers className="h-2.5 w-2.5" /> Rolls
                    </div>
                    <div className="text-base font-extrabold text-slate-900 tabular-nums">
                      {b.rollCount}
                    </div>
                    {b.rollSqft > 0 && (
                      <div className="text-[10px] text-emerald-700 font-bold">
                        {b.rollSqft.toFixed(0)} sqft
                      </div>
                    )}
                  </div>
                  <div className="rounded-lg bg-white border border-slate-200 p-2">
                    <div className="text-[9px] uppercase font-extrabold text-violet-700 flex items-center gap-0.5">
                      <Scissors className="h-2.5 w-2.5" /> Pieces
                    </div>
                    <div className="text-base font-extrabold text-slate-900 tabular-nums">
                      {b.pieceCount}
                    </div>
                    {b.pieceSqft > 0 && (
                      <div className="text-[10px] text-violet-700 font-bold">
                        {b.pieceSqft.toFixed(0)} sqft
                      </div>
                    )}
                  </div>
                </div>

                {b.totalSqft > 0 && (
                  <div className="mt-3 pt-2 border-t border-slate-200 flex items-baseline justify-between">
                    <div className="text-[10px] uppercase font-extrabold text-slate-600">Value</div>
                    <div className="text-sm font-extrabold text-emerald-700 tabular-nums">
                      {formatPKRFull(b.stockValue)}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ═══════════════ ROLLS LIST ═══════════════ */}
      <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b-2 border-slate-100 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center shadow-md">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg leading-tight">Rolls Inventory</h3>
              <p className="text-xs text-slate-500 font-semibold">
                {stats.activeRollCount} active • {stats.totalRollCount} total
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => { setAddRollVariant(undefined); setShowAddRoll(true); }}
              className="bg-gradient-to-r from-emerald-600 to-emerald-700"
            >
              <Plus className="h-4 w-4" /> Add Roll
            </Button>
          </div>
        </div>

        {rolls.length === 0 ? (
          <div className="p-10 text-center">
            <Layers className="h-12 w-12 text-slate-300 mx-auto mb-2" />
            <div className="font-extrabold text-slate-700">No rolls yet</div>
            <p className="text-sm text-slate-500 mt-1">Add first roll to start tracking</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-3 py-2 text-left text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Roll #</th>
                  <th className="px-3 py-2 text-left text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Variant</th>
                  <th className="px-3 py-2 text-center text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Size</th>
                  <th className="px-3 py-2 text-right text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Remaining</th>
                  <th className="px-3 py-2 text-right text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Sale/sqft</th>
                  <th className="px-3 py-2 text-left text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Rack</th>
                  <th className="px-3 py-2 text-center text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Status</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rolls.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50">
                    <td className="px-3 py-2 font-mono font-extrabold text-emerald-700 text-xs">
                      {r.rollNumber}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {r.variant ? (
                        <div className="flex items-center gap-1.5">
                          {r.variant.colorHex && (
                            <span className="h-2.5 w-2.5 rounded-full border border-slate-300" style={{ backgroundColor: r.variant.colorHex }} />
                          )}
                          <span className="font-bold">{r.variant.name}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center text-[11px] font-bold text-slate-700">
                      {Number(r.widthFt)}ft × {Number(r.remainingLengthFt)}ft
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="font-extrabold text-emerald-700 tabular-nums">
                        {Number(r.remainingSqft).toFixed(1)} sqft
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right text-xs font-extrabold text-emerald-700">
                      {formatPKR(r.salePricePerSqft)}
                    </td>
                    <td className="px-3 py-2 text-[10px] text-slate-600 font-bold">
                      {r.rackNumber || '—'}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={[
                        'px-1.5 py-0.5 rounded-full text-[9px] font-extrabold',
                        r.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' :
                        r.status === 'FINISHED' ? 'bg-slate-100 text-slate-600' :
                        r.status === 'DAMAGED' ? 'bg-rose-100 text-rose-700' :
                        'bg-amber-100 text-amber-700',
                      ].join(' ')}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Link
                        to={`/carpet-rolls/${r.id}`}
                        className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-700 hover:underline"
                      >
                        View <ChevronRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ═══════════════ CUT PIECES ═══════════════ */}
      {cutPieces.length > 0 && (
        <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b-2 border-slate-100 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 text-white flex items-center justify-center shadow-md">
              <Scissors className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg leading-tight">Cut Pieces</h3>
              <p className="text-xs text-slate-500 font-semibold">
                {stats.availPieceCount} available • {stats.totalPieceCount} total
              </p>
            </div>
          </div>

          <div className="p-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {cutPieces.slice(0, 12).map((p) => (
              <div key={p.id} className="rounded-xl border-2 border-slate-200 p-3 hover:border-violet-400 transition">
                <div className="flex items-center justify-between">
                  <div className="font-mono font-extrabold text-sm text-violet-700">{p.pieceCode}</div>
                  <span className={[
                    'px-1.5 py-0.5 rounded-full text-[9px] font-extrabold',
                    p.status === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-700' :
                    p.status === 'SOLD' ? 'bg-violet-100 text-violet-700' :
                    'bg-slate-100 text-slate-600',
                  ].join(' ')}>
                    {p.status}
                  </span>
                </div>
                <div className="mt-2 text-[11px] text-slate-600 font-bold">
                  {p.widthFt}ft × {p.lengthFt}ft = {Number(p.totalSqft).toFixed(1)} sqft
                </div>
                <div className="mt-1.5 flex items-baseline justify-between">
                  <div className="text-base font-extrabold text-emerald-700 tabular-nums">
                    {formatPKRFull(p.salePrice)}
                  </div>
                  {p.variant && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-violet-700">
                      {p.variant.colorHex && (
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.variant.colorHex }} />
                      )}
                      {p.variant.name}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {cutPieces.length > 12 && (
            <div className="border-t border-slate-100 p-3 text-center">
              <Link
                to="/carpet-cut-pieces"
                className="text-xs font-extrabold text-violet-700 hover:underline inline-flex items-center gap-1"
              >
                View all {cutPieces.length} cut pieces <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          )}
        </section>
      )}

      {/* ═══════════════ SALES HISTORY ═══════════════ */}
      <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b-2 border-slate-100 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg leading-tight">Sales History</h3>
              <p className="text-xs text-slate-500 font-semibold">
                {stats.totalOrders} orders • {stats.totalSold.toFixed(0)} {product.unit} sold
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase font-extrabold text-slate-500">Revenue</div>
            <div className="text-lg font-extrabold text-emerald-700 tabular-nums">
              {formatPKRFull(stats.totalRevenue)}
            </div>
          </div>
        </div>

        {salesForProduct.length === 0 ? (
          <div className="p-10 text-center">
            <Receipt className="h-12 w-12 text-slate-300 mx-auto mb-2" />
            <div className="font-extrabold text-slate-700">Abhi tak koi sale nahi</div>
            <p className="text-sm text-slate-500 mt-1">POS se sale karte hi yahan aayegi</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {salesForProduct.map((s) => {
              const productLines = s.items.filter((it) => it.product?.id === id);
              const qtyForProduct = productLines.reduce((a, it) => a + Number(it.quantity || 0), 0);
              const revenueForProduct = productLines.reduce((a, it) => a + Number(it.total || 0), 0);
              return (
                <Link
                  key={s.id}
                  to={`/sales/${s.id}/receipt`}
                  className="block px-5 py-3 hover:bg-slate-50/50 transition"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="font-mono font-extrabold text-sm text-slate-900">
                          {s.saleNumber}
                        </div>
                        <span className="text-[10px] text-slate-500 font-bold">
                          {new Date(s.soldAt).toLocaleDateString('en-PK', {
                            day: '2-digit', month: 'short', year: 'numeric',
                          })}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 font-semibold mt-0.5">
                        {s.customer?.name || 'Walk-in'} • {qtyForProduct.toFixed(1)} {product.unit}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-extrabold text-emerald-700 tabular-nums">
                        {formatPKRFull(revenueForProduct)}
                      </div>
                      {s.creditAmount > 0 && (
                        <div className="text-[10px] text-amber-700 font-extrabold">
                          Udhaar: {formatPKR(s.creditAmount)}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────

function HeroStat({
  icon: Icon, label, value, sub, tone,
}: { icon: any; label: string; value: string | number; sub?: string; tone: string }) {
  const tones: Record<string, string> = {
    emerald: 'from-emerald-400/30 to-emerald-600/20 border-emerald-300/40',
    blue: 'from-blue-400/30 to-blue-600/20 border-blue-300/40',
    violet: 'from-violet-400/30 to-violet-600/20 border-violet-300/40',
    amber: 'from-amber-400/30 to-amber-600/20 border-amber-300/40',
  };
  return (
    <div className={`rounded-xl bg-gradient-to-br ${tones[tone]} backdrop-blur border p-3`}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="h-3 w-3 opacity-80" />
        <div className="text-[9px] uppercase tracking-wider font-extrabold opacity-90">{label}</div>
      </div>
      <div className="text-xl font-extrabold text-white tabular-nums leading-none">{value}</div>
      {sub && <div className="text-[10px] font-bold text-white/70 mt-0.5">{sub}</div>}
    </div>
  );
}

function QuickAction({
  icon: Icon, title, desc, onClick, tone,
}: { icon: any; title: string; desc: string; onClick: () => void; tone: string }) {
  const tones: Record<string, string> = {
    emerald: 'bg-emerald-100 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white',
  };
  return (
    <button
      onClick={onClick}
      className="rounded-2xl bg-white border-2 border-slate-200 hover:border-emerald-400 hover:shadow-md p-4 flex items-center gap-3 transition group text-left"
    >
      <div className={`h-11 w-11 rounded-xl flex items-center justify-center transition ${tones[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-extrabold text-slate-900 text-sm">{title}</div>
        <div className="text-[10px] text-slate-500 font-semibold">{desc}</div>
      </div>
      <ChevronRight className="h-4 w-4 text-slate-400" />
    </button>
  );
}
