import { useMemo, useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Edit3, ShoppingBag, Layers, Boxes, Package, PackageX,
  DollarSign, TrendingUp, Star, ChevronRight, ExternalLink,
  Receipt, ShoppingCart, Hash, Tag, Trash2, Barcode, Calendar,
  AlertTriangle, Image as ImageIcon, ArrowRightLeft, History,
  BarChart3, Info, Plus, RotateCcw, Sparkles, CheckCircle2, XCircle,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { toast } from 'sonner';
import { Button } from '@core/ui/Button';
import { formatPKR, formatPKRFull } from '@core/lib/format';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { productVariantsApi } from '@modules/inventory/products/api/product-variants.api';
import { productBatchesApi } from '@modules/inventory/products/api/product-batches.api';
import { productImagesApi } from '@modules/inventory/products/api/product-images.api';
import { salesApi } from '@modules/sales/sales/api/sales.api';
import { stockMovementsApi } from '@modules/inventory/stock-movements/api/stock-movements.api';
import { productUnitsApi } from '../api/product-units.api';
import { QuickStockModal } from '../components/QuickStockModal';

import { PrivacyToggle, useCostHidden } from '@core/ui/HiddenValue';

type Tab = 'overview' | 'units' | 'variants' | 'batches' | 'sales' | 'log';

export default function RetailProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const hideCost = useCostHidden();

  const [tab, setTab] = useState<Tab>('overview');
  // Refetch variants/units/batches when their tab opens
  useEffect(() => {
    if (!id) return;
    if (tab === 'variants') refetchVariants();
  }, [tab, id]);
  const [imgIndex, setImgIndex] = useState(0);
  const [showStock, setShowStock] = useState(false);
  const [convFrom, setConvFrom] = useState<string>('');
  const [convQty, setConvQty] = useState<number | ''>(1);

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productsApi.getOne(id!),
    enabled: !!id,
  });

  const { data: variants = [], refetch: refetchVariants } = useQuery({
    queryKey: ['product-variants', id],
    queryFn: () => productVariantsApi.list(id!),
    enabled: !!id,
    refetchOnMount: 'always',
    staleTime: 0,
  });

  const { data: images = [] } = useQuery({
    queryKey: ['product-images', id],
    queryFn: () => productImagesApi.list(id!),
    enabled: !!id,
  });

  const { data: units = [] } = useQuery({
    queryKey: ['product-units', id],
    queryFn: () => productUnitsApi.byProduct(id!),
    enabled: !!id,
  });

  const { data: batches = [] } = useQuery({
    queryKey: ['product-batches', id],
    queryFn: () => productBatchesApi.list(id!),
    enabled: !!id,
  });

  const { data: allSales = [] } = useQuery({
    queryKey: ['sales-list-for-product'],
    queryFn: () => salesApi.list(),
    enabled: !!id,
  });

  const { data: movementsRaw } = useQuery({
    queryKey: ['stock-movements-for-product', id],
    queryFn: () => (stockMovementsApi as any).list({ productId: id }).catch(() => []),
    enabled: !!id,
    retry: false,
  });
  const movements: any[] = useMemo(() => {
    const raw: any = movementsRaw;
    const arr = Array.isArray(raw) ? raw : (raw?.items ?? []);
    return arr.filter((m: any) => !m.productId || m.productId === id).slice(0, 40);
  }, [movementsRaw, id]);

  const { data: relatedRaw } = useQuery({
    queryKey: ['related-products', product?.categoryId],
    queryFn: () => productsApi.list({ page: 1, limit: 200 } as any),
    enabled: !!product?.categoryId,
  });
  const related: any[] = useMemo(() => {
    const arr: any[] = (relatedRaw as any)?.items ?? [];
    return arr.filter((p) => p.id !== id && p.categoryId === product?.categoryId).slice(0, 6);
  }, [relatedRaw, id, product?.categoryId]);

  /* ─── Derived ─── */
  const soldLines = useMemo(() => {
    if (!id) return [];
    return (allSales as any[]).flatMap((s) =>
      s.items.filter((it: any) => it.product.id === id).map((it: any) => ({ ...it, sale: s })),
    );
  }, [allSales, id]);

  const salesForProduct = useMemo(() => {
    if (!id) return [];
    return (allSales as any[])
      .filter((s) => s.items.some((it: any) => it.product.id === id))
      .sort((a, b) => new Date(b.soldAt).getTime() - new Date(a.soldAt).getTime())
      .slice(0, 30);
  }, [allSales, id]);

  const stats = useMemo(() => {
    const stock = Number(product?.stock || 0);
    const price = Number(product?.price || 0);
    const cost = Number(product?.costPrice || 0);
    const alert = Number(product?.lowStockAlert ?? 5);

    const totalSold = soldLines.reduce((a, it) => a + Number(it.quantity || 0), 0);
    const totalRevenue = soldLines.reduce((a, it) => a + Number(it.total || 0), 0);
    const totalCogs = soldLines.reduce((a, it) => a + Number(it.costPrice || 0) * Number(it.quantity || 0), 0);
    const orders = new Set(soldLines.map((it) => it.sale.id)).size;

    const expiringSoon = (batches as any[]).filter((b) => {
      if (!b.expiryDate) return false;
      const d = (new Date(b.expiryDate).getTime() - Date.now()) / 86400000;
      return d > 0 && d <= 30;
    }).length;
    const expired = (batches as any[]).filter((b) => b.expiryDate && new Date(b.expiryDate).getTime() < Date.now()).length;

    // 30-day velocity
    const cutoff = Date.now() - 30 * 86400000;
    const sold30 = soldLines
      .filter((it) => new Date(it.sale.soldAt).getTime() >= cutoff)
      .reduce((a, it) => a + Number(it.quantity || 0), 0);
    const perDay = sold30 / 30;
    const daysLeft = perDay > 0 ? Math.floor(stock / perDay) : null;

    const isOut = stock <= 0;
    const isLow = !isOut && stock <= alert;
    const suggestedReorder = Math.max(Math.ceil(perDay * 30) - stock, isOut || isLow ? Math.max(alert * 3, 10) : 0);

    return {
      stock, price, cost, alert, isOut, isLow,
      stockValue: stock * price,
      stockCost: stock * cost,
      margin: price > 0 ? ((price - cost) / price) * 100 : 0,
      profitPerUnit: price - cost,
      totalSold, totalRevenue, totalProfit: totalRevenue - totalCogs, orders,
      unitCount: (units as any[]).length,
      variantCount: (variants as any[]).length,
      batchCount: (batches as any[]).length,
      variantStock: (variants as any[]).reduce((a, v) => a + Number(v.stock || 0), 0),
      expiringSoon, expired,
      sold30, perDay, daysLeft, suggestedReorder,
    };
  }, [product, soldLines, units, variants, batches]);

  const chartData = useMemo(() => {
    const buckets: Record<string, { label: string; revenue: number; qty: number }> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const key = d.toISOString().slice(0, 10);
      buckets[key] = { label: `${d.getDate()}/${d.getMonth() + 1}`, revenue: 0, qty: 0 };
    }
    for (const it of soldLines) {
      const key = new Date(it.sale.soldAt).toISOString().slice(0, 10);
      if (buckets[key]) {
        buckets[key].revenue += Number(it.total || 0);
        buckets[key].qty += Number(it.quantity || 0);
      }
    }
    return Object.values(buckets);
  }, [soldLines]);

  const removeMutation = useMutation({
    mutationFn: () => productsApi.remove(id!),
    onSuccess: (data: any) => {
      toast.success(data?.softDeleted ? 'Product band ho gaya' : 'Product delete ho gaya');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['retail-products'] });
      navigate('/products');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Delete nahi hua'),
  });

  /* ─── Unit converter ─── */
  const allUnitOptions = useMemo(() => {
    const base = { key: 'base', name: product?.unit || 'pcs', rate: 1, price: Number(product?.price || 0) };
    const rest = (units as any[]).map((u) => ({
      key: u.id, name: u.unitName, rate: Number(u.conversionRate || 1), price: Number(u.price || 0),
    }));
    const seen = new Set([base.name.toLowerCase()]);
    const merged = [base];
    for (const r of rest) {
      if (!seen.has(r.name.toLowerCase())) { merged.push(r); seen.add(r.name.toLowerCase()); }
    }
    return merged;
  }, [units, product]);

  const activeConv = allUnitOptions.find((u) => u.key === convFrom) || allUnitOptions[0];
  const convBaseQty = Number(convQty || 0) * (activeConv?.rate || 1);

  if (isLoading || !product) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-12 w-12 rounded-full border-4 border-sky-200 border-t-sky-600 animate-spin" />
      </div>
    );
  }

  const gallery: any[] = (images as any[]).length ? (images as any[]) : (product.images ?? []);

  const TABS: { id: Tab; label: string; count?: number; icon: any }[] = [
    { id: 'overview', label: 'Overview', icon: Info },
    { id: 'units', label: 'Units', count: stats.unitCount, icon: Layers },
    { id: 'variants', label: 'Variants', count: stats.variantCount, icon: Boxes },
    { id: 'batches', label: 'Batches', count: stats.batchCount, icon: Calendar },
    { id: 'sales', label: 'Sales', count: salesForProduct.length, icon: Receipt },
    { id: 'log', label: 'Stock Log', count: movements.length, icon: History },
  ];

  return (
    <div className="space-y-5 pb-10">
      {showStock && <QuickStockModal product={product} onClose={() => setShowStock(false)} />}

      {/* ═══ TOP BAR ═══ */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button onClick={() => navigate('/products')} className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-sky-600 font-bold">
          <ArrowLeft className="h-4 w-4" /> Sab Products
        </button>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowStock(true)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-extrabold shadow-sm"
          >
            <Plus className="h-4 w-4" /> Stock Add
          </button>
          <Link to={`/retail-products/${id}/edit`} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-sky-50 border-2 border-sky-200 hover:bg-sky-100 text-sky-700 text-sm font-extrabold">
            <Edit3 className="h-4 w-4" /> Edit
          </Link>
          <Link to="/pos" className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border-2 border-slate-200 hover:border-sky-300 text-slate-700 text-sm font-extrabold">
            <ShoppingCart className="h-4 w-4" /> POS
          </Link>
          <PrivacyToggle compact />
          <Link to="/retail/barcode-labels" state={{ productIds: [id] }} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border-2 border-slate-200 hover:border-blue-300 text-slate-700 text-sm font-extrabold">
            <Barcode className="h-4 w-4" /> Label
          </Link>
          <button
            onClick={() => { if (confirm(`"${product.name}" delete karein?`)) removeMutation.mutate(); }}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-50 border-2 border-rose-200 hover:bg-rose-100 text-rose-700 text-sm font-extrabold"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-sky-900 to-cyan-700 text-white shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-sky-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-cyan-400/15 blur-3xl" />

        <div className="relative grid lg:grid-cols-[280px_1fr] gap-6 p-6">
          <div className="space-y-2">
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-white/10 backdrop-blur border-2 border-white/20">
              {gallery[imgIndex]?.url ? (
                <img src={gallery[imgIndex].url} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/50"><ImageIcon className="h-16 w-16" /></div>
              )}
              {product.isFeatured && (
                <div className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-amber-500 text-white text-[10px] font-extrabold shadow-lg inline-flex items-center gap-1">
                  <Star className="h-3 w-3 fill-white" /> FEATURED
                </div>
              )}
              {!product.isActive && (
                <div className="absolute inset-x-0 bottom-0 py-1.5 bg-rose-600 text-center text-xs font-extrabold">BAND HAI</div>
              )}
            </div>
            {gallery.length > 1 && (
              <div className="grid grid-cols-5 gap-1.5">
                {gallery.slice(0, 5).map((img: any, i: number) => (
                  <button
                    key={img.id ?? i}
                    onClick={() => setImgIndex(i)}
                    className={['aspect-square rounded-lg overflow-hidden border-2 transition', imgIndex === i ? 'border-white' : 'border-white/20 opacity-70 hover:opacity-100'].join(' ')}
                  >
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <ShoppingBag className="h-3.5 w-3.5 text-amber-300" /> Retail Product
              {product.category && (<><span className="text-white/40">•</span><span>{product.category.name}</span></>)}
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">{product.name}</h1>
            {(product.shortDescription || product.description) && (
              <p className="mt-2 text-sm text-white/85 max-w-2xl line-clamp-2">
                {product.shortDescription || product.description}
              </p>
            )}

            <div className="mt-3 flex items-center gap-2 flex-wrap text-xs">
              {product.sku && <Chip icon={Hash}>{product.sku}</Chip>}
              {product.barcode && <Chip icon={Barcode}>{product.barcode}</Chip>}
              {product.brand && <Chip icon={Tag} tone="violet">{product.brand.name}</Chip>}
              {product.isActive ? <Chip icon={CheckCircle2} tone="emerald">Active</Chip> : <Chip icon={XCircle} tone="rose">Band</Chip>}
            </div>

            {/* Price block */}
            <div className="mt-5 flex items-end gap-5 flex-wrap">
              <div>
                <div className="text-[10px] uppercase font-extrabold text-white/70 tracking-wider">Sale Rate</div>
                <div className="text-4xl font-extrabold tabular-nums leading-none mt-1">
                  {formatPKRFull(product.price)}
                  <span className="text-sm font-bold text-white/70 ml-1">/ {product.unit}</span>
                </div>
              </div>
              {!hideCost && Number(product.costPrice || 0) > 0 && (
                <div>
                  <div className="text-[10px] uppercase font-extrabold text-white/70 tracking-wider">Cost</div>
                  <div className="text-xl font-extrabold tabular-nums text-white/80 leading-none mt-1">{formatPKRFull(product.costPrice)}</div>
                </div>
              )}
              {product.wholesalePrice ? (
                <div>
                  <div className="text-[10px] uppercase font-extrabold text-white/70 tracking-wider">Wholesale</div>
                  <div className="text-xl font-extrabold tabular-nums text-amber-300 leading-none mt-1">{formatPKRFull(product.wholesalePrice)}</div>
                </div>
              ) : null}
              {!hideCost && stats.profitPerUnit !== 0 && (
                <div className={['rounded-xl px-3 py-2 backdrop-blur border', stats.profitPerUnit >= 0 ? 'bg-emerald-400/20 border-emerald-300/40' : 'bg-rose-400/20 border-rose-300/40'].join(' ')}>
                  <div className="text-[10px] uppercase font-extrabold text-white/80 tracking-wider">Profit / {product.unit}</div>
                  <div className="text-lg font-extrabold tabular-nums leading-none mt-0.5">
                    {formatPKRFull(stats.profitPerUnit)} <span className="text-xs opacity-80">({stats.margin.toFixed(0)}%)</span>
                  </div>
                </div>
              )}
            </div>

            {/* Stat tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
              <HeroStat icon={Package} label="Stock" value={`${stats.stock}`} sub={product.unit}
                tone={stats.isOut ? 'rose' : stats.isLow ? 'amber' : 'sky'} />
              <HeroStat icon={DollarSign} label="Stock Value" value={formatPKR(stats.stockValue)} sub={hideCost ? "•••" : `cost ${formatPKR(stats.stockCost)}`} tone="emerald" />
              <HeroStat icon={TrendingUp} label="Bika" value={stats.totalSold} sub={`${stats.orders} orders`} tone="violet" />
              <HeroStat icon={Receipt} label="Revenue" value={formatPKR(stats.totalRevenue)} sub={hideCost ? "•••" : `profit ${formatPKR(stats.totalProfit)}`} tone="amber" />
            </div>
          </div>
        </div>
      </section>

      {/* ═══ ALERTS ═══ */}
      {(stats.isOut || stats.isLow || stats.suggestedReorder > 0 || stats.expired > 0) && (
        <section className="grid md:grid-cols-2 gap-3">
          {(stats.isOut || stats.isLow) && (
            <AlertCard
              tone={stats.isOut ? 'rose' : 'amber'}
              icon={stats.isOut ? PackageX : AlertTriangle}
              title={stats.isOut ? 'Stock khatam ho gaya' : `Sirf ${stats.stock} ${product.unit} bache hain`}
              body={stats.daysLeft !== null
                ? `Roz ka average ${stats.perDay.toFixed(1)} ${product.unit} — takreeban ${stats.daysLeft} din chalega.`
                : 'Low stock alert level: ' + stats.alert}
              action={{ label: 'Stock Add Karo', onClick: () => setShowStock(true) }}
            />
          )}
          {stats.suggestedReorder > 0 && (
            <AlertCard
              tone="sky"
              icon={RotateCcw}
              title={`Reorder suggestion: ${stats.suggestedReorder} ${product.unit}`}
              body={`Pichle 30 din me ${stats.sold30} ${product.unit} bika. 1 mahine ka stock rakhne ke liye itna order karein${hideCost ? "." : ` (approx cost ${formatPKR(stats.suggestedReorder * stats.cost)}).`}`}
              action={{ label: 'Purchase banao', to: '/purchases' }}
            />
          )}
          {stats.expired > 0 && (
            <AlertCard
              tone="rose"
              icon={Calendar}
              title={`${stats.expired} batch expire ho chuke hain`}
              body="Inhe stock se nikaal dein warna galat maal bik sakta hai."
              action={{ label: 'Batches dekho', onClick: () => setTab('batches') }}
            />
          )}
          {stats.expiringSoon > 0 && (
            <AlertCard
              tone="amber"
              icon={Calendar}
              title={`${stats.expiringSoon} batch 30 din me expire honge`}
              body="Discount laga kar jaldi bech dein."
              action={{ label: 'Batches dekho', onClick: () => setTab('batches') }}
            />
          )}
        </section>
      )}

      {/* ═══ TABS ═══ */}
      <section className="rounded-2xl bg-white border-2 border-slate-200 shadow-sm p-2 overflow-x-auto">
        <div className="flex gap-1.5 min-w-max">
          {TABS.map((t) => {
            const active = tab === t.id;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={[
                  'px-4 py-2.5 rounded-xl text-sm font-extrabold inline-flex items-center gap-2 transition',
                  active ? 'bg-gradient-to-br from-sky-600 to-cyan-700 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100',
                ].join(' ')}
              >
                <Icon className="h-4 w-4" />
                {t.label}
                {t.count !== undefined && (
                  <span className={['px-1.5 rounded-full text-[10px] font-extrabold', active ? 'bg-white/25' : 'bg-slate-200 text-slate-700'].join(' ')}>
                    {t.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* ═══ OVERVIEW ═══ */}
      {tab === 'overview' && (
        <div className="space-y-5">
          <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg leading-tight">Pichle 30 Din ki Sale</h3>
                <p className="text-xs text-slate-500 font-semibold">
                  {stats.sold30} {product.unit} bika • roz ka average {stats.perDay.toFixed(1)} {product.unit}
                </p>
              </div>
            </div>
            {chartData.some((d) => d.revenue > 0) ? (
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="rpGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="label" stroke="#64748b" fontSize={10} interval={4} />
                    <YAxis stroke="#64748b" fontSize={10} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: any) => formatPKR(Number(v))} contentStyle={{ borderRadius: 12, border: '2px solid #e2e8f0' }} />
                    <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#0ea5e9" strokeWidth={2.5} fill="url(#rpGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[200px] flex flex-col items-center justify-center gap-2">
                <Receipt className="h-10 w-10 text-slate-300" />
                <p className="text-sm font-extrabold text-slate-700">Pichle 30 din me koi sale nahi</p>
              </div>
            )}
          </section>

          {/* Unit converter */}
          <section className="rounded-3xl bg-gradient-to-br from-sky-50 to-white border-2 border-sky-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-700 text-white flex items-center justify-center shadow-md">
                <ArrowRightLeft className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg leading-tight">Unit Calculator</h3>
                <p className="text-xs text-slate-500 font-semibold">Kitne me kitna banega — foran check karein</p>
              </div>
            </div>

            <div className="grid sm:grid-cols-[120px_1fr] gap-3">
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-600 mb-1">Quantity</label>
                <input
                  type="number" min={0} value={convQty}
                  onChange={(e) => setConvQty(e.target.value === '' ? '' : Number(e.target.value))}
                  className="h-12 w-full rounded-xl border-2 border-sky-300 bg-white px-3 text-center text-xl font-extrabold tabular-nums focus:outline-none focus:border-sky-600"
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-600 mb-1">Unit</label>
                <div className="flex flex-wrap gap-1.5">
                  {allUnitOptions.map((u) => (
                    <button
                      key={u.key}
                      onClick={() => setConvFrom(u.key)}
                      className={[
                        'px-3 h-12 rounded-xl border-2 text-sm font-extrabold capitalize transition',
                        (activeConv?.key === u.key)
                          ? 'border-sky-600 bg-sky-600 text-white shadow-md'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-sky-400',
                      ].join(' ')}
                    >
                      {u.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white border-2 border-slate-200 p-4 grid sm:grid-cols-3 gap-3">
              <ConvCell label="Base quantity" value={`${convBaseQty.toFixed(2)} ${product.unit}`} tone="sky" />
              <ConvCell label="Kitne paise banenge" value={formatPKRFull(Number(convQty || 0) * (activeConv?.price || 0))} tone="emerald" />
              <ConvCell
                label="Stock me se bacha"
                value={`${Math.max(stats.stock - convBaseQty, 0).toFixed(2)} ${product.unit}`}
                tone={convBaseQty > stats.stock ? 'rose' : 'slate'}
              />
            </div>
            {convBaseQty > stats.stock && (
              <div className="rounded-xl bg-rose-50 border-2 border-rose-200 p-2.5 text-xs font-extrabold text-rose-800 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" /> Itna stock nahi hai (sirf {stats.stock} {product.unit})
              </div>
            )}
          </section>

          {/* Quick links */}
          <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <QuickLink to="/retail/product-units" icon={Layers} title="Units Manage" desc="Dozen / carton rates" tone="sky" />
            <QuickLink to="/retail/combos" icon={ShoppingBag} title="Combos" desc="Bundle deals" tone="violet" />
            <QuickLink to="/retail/quick-keys" icon={Zap2} title="Quick Keys" desc="POS shortcut" tone="amber" />
            <QuickLink to="/retail/reorder" icon={RotateCcw} title="Reorder Rules" desc="Auto alerts" tone="emerald" />
          </section>

          {/* Related */}
          {related.length > 0 && (
            <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b-2 border-slate-100 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 text-white flex items-center justify-center shadow-md">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-lg leading-tight">Isi Category ke Products</h3>
                  <p className="text-xs text-slate-500 font-semibold">{product.category?.name}</p>
                </div>
              </div>
              <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {related.map((r) => (
                  <Link key={r.id} to={`/retail-products/${r.id}`} className="group rounded-xl border-2 border-slate-200 hover:border-sky-400 hover:shadow-md overflow-hidden transition">
                    <div className="aspect-square bg-slate-100 overflow-hidden">
                      {r.images?.[0]?.url ? (
                        <img src={r.images[0].url} alt="" loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><Package className="h-6 w-6 text-slate-300" /></div>
                      )}
                    </div>
                    <div className="p-2">
                      <div className="text-[11px] font-extrabold text-slate-900 line-clamp-2 leading-tight min-h-[1.8rem]">{r.name}</div>
                      <div className="text-xs font-extrabold text-emerald-700 tabular-nums mt-0.5">{formatPKR(r.price)}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* ═══ UNITS ═══ */}
      {tab === 'units' && (
        <Panel icon={Layers} title="Multi-Unit Pricing" desc={`${stats.unitCount} units configured`} tone="sky"
          empty={(units as any[]).length === 0}
          emptyText="Koi extra unit nahi — sirf base unit se sale hoti hai"
          emptyAction={<Link to={`/retail-products/${id}/edit`}><Button className="bg-gradient-to-r from-sky-600 to-cyan-700"><Plus className="h-4 w-4" /> Units Add Karo</Button></Link>}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b-2 border-slate-200">
                <tr>
                  <Th2>Unit</Th2>
                  <Th2>Conversion</Th2>
                  {!hideCost && <Th2 className="text-right">Cost</Th2>}
                  <Th2 className="text-right">Sale</Th2>
                  <Th2 className="text-right">Wholesale</Th2>
                  {!hideCost && <Th2 className="text-right">Profit</Th2>}
                  <Th2>Barcode</Th2>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(units as any[]).map((u) => {
                  const profit = Number(u.price || 0) - Number(u.costPrice || 0);
                  return (
                    <tr key={u.id} className={u.isBase ? 'bg-emerald-50/40' : 'hover:bg-slate-50/60'}>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          {u.isBase && <Star className="h-3.5 w-3.5 text-emerald-600 fill-emerald-600" />}
                          <span className="font-extrabold text-slate-900 capitalize">{u.unitName}</span>
                          {u.isBase && <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-white text-[9px] font-extrabold">BASE</span>}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-xs font-bold text-slate-600">
                        1 {u.unitName} = <strong className="text-slate-900">{u.conversionRate}</strong> {product.unit}
                      </td>
                      {!hideCost && <td className="px-3 py-2.5 text-right text-xs font-bold text-slate-600 tabular-nums">{formatPKR(u.costPrice || 0)}</td>}
                      <td className="px-3 py-2.5 text-right font-extrabold text-emerald-700 tabular-nums">{formatPKR(u.price || 0)}</td>
                      <td className="px-3 py-2.5 text-right text-xs font-bold text-violet-700 tabular-nums">{u.wholesalePrice ? formatPKR(u.wholesalePrice) : '—'}</td>
                      {!hideCost && <td className={['px-3 py-2.5 text-right font-extrabold tabular-nums text-xs', profit >= 0 ? 'text-emerald-700' : 'text-rose-700'].join(' ')}>
                        {formatPKR(profit)}
                      </td>}
                      <td className="px-3 py-2.5 text-[10px] font-mono text-slate-600">{u.barcode || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {/* ═══ VARIANTS ═══ */}
      {tab === 'variants' && (
        <Panel icon={Boxes} title="Variants" desc={`${stats.variantCount} variants • total stock ${stats.variantStock}`} tone="violet"
          empty={(variants as any[]).length === 0}
          emptyText="Koi variant nahi — simple single product hai"
          emptyAction={<Link to={`/retail-products/${id}/edit`}><Button variant="secondary"><Plus className="h-4 w-4" /> Variants Add Karo</Button></Link>}
        >
          <div className="p-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(variants as any[]).map((v) => {
              const vStock = Number(v.stock || 0);
              const vLow = vStock > 0 && vStock <= Number(v.lowStockAlert ?? 5);
              return (
                <div key={v.id} className={['rounded-2xl border-2 p-3', vStock <= 0 ? 'border-rose-200 bg-rose-50/40' : vLow ? 'border-amber-200 bg-amber-50/40' : 'border-slate-200 bg-white'].join(' ')}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-extrabold text-slate-900 text-sm truncate">{v.name}</div>
                      <div className="text-[10px] font-mono text-slate-500 mt-0.5">{v.sku || v.barcode || '—'}</div>
                    </div>
                    {v.colorHex && <span className="h-5 w-5 rounded-full border-2 border-white shadow shrink-0" style={{ backgroundColor: v.colorHex }} />}
                  </div>
                  <div className="mt-2 flex items-end justify-between">
                    <div className="text-base font-extrabold text-emerald-700 tabular-nums">{formatPKRFull(v.price)}</div>
                    <div className={['text-sm font-extrabold tabular-nums', vStock <= 0 ? 'text-rose-700' : vLow ? 'text-amber-700' : 'text-slate-700'].join(' ')}>
                      {vStock} <span className="text-[10px] font-bold text-slate-500">{product.unit}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      {/* ═══ BATCHES ═══ */}
      {tab === 'batches' && (
        <Panel icon={Calendar} title="Batches / Expiry" desc={`${stats.batchCount} batches • ${stats.expiringSoon} expiring soon • ${stats.expired} expired`} tone="amber"
          empty={(batches as any[]).length === 0}
          emptyText="Batch tracking off hai — expiry wale maal ke liye on karein"
          emptyAction={<Link to={`/retail-products/${id}/edit`}><Button variant="secondary"><Plus className="h-4 w-4" /> Batches Add Karo</Button></Link>}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b-2 border-slate-200">
                <tr>
                  <Th2>Batch #</Th2><Th2>Mfg</Th2><Th2>Expiry</Th2>
                  <Th2 className="text-right">Qty</Th2>{!hideCost && <Th2 className="text-right">Cost</Th2>}<Th2 className="text-center">Status</Th2>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[...(batches as any[])].sort((a, b) => new Date(a.expiryDate || 0).getTime() - new Date(b.expiryDate || 0).getTime()).map((b) => {
                  const days = b.expiryDate ? (new Date(b.expiryDate).getTime() - Date.now()) / 86400000 : null;
                  const expired = days !== null && days < 0;
                  const soon = days !== null && days >= 0 && days <= 30;
                  return (
                    <tr key={b.id} className={expired ? 'bg-rose-50/50' : soon ? 'bg-amber-50/40' : 'hover:bg-slate-50/60'}>
                      <td className="px-3 py-2.5 font-mono font-extrabold text-slate-900 text-xs">{b.batchNumber}</td>
                      <td className="px-3 py-2.5 text-xs font-semibold">{b.manufactureDate ? new Date(b.manufactureDate).toLocaleDateString('en-PK') : '—'}</td>
                      <td className="px-3 py-2.5 text-xs font-extrabold">
                        {b.expiryDate ? new Date(b.expiryDate).toLocaleDateString('en-PK') : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-right font-extrabold tabular-nums">{b.quantity}</td>
                      {!hideCost && <td className="px-3 py-2.5 text-right text-xs font-bold text-slate-700 tabular-nums">{formatPKR(b.costPrice || 0)}</td>}
                      <td className="px-3 py-2.5 text-center">
                        {expired ? <Pill2 tone="rose">Expired</Pill2>
                          : soon ? <Pill2 tone="amber">{Math.floor(days!)} din</Pill2>
                          : <Pill2 tone="emerald">OK</Pill2>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {/* ═══ SALES ═══ */}
      {tab === 'sales' && (
        <Panel icon={Receipt} title="Sales History" desc={`${salesForProduct.length} recent • ${stats.totalSold} ${product.unit} bika`} tone="emerald"
          empty={salesForProduct.length === 0} emptyText="Abhi tak koi sale nahi hui">
          <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
            {salesForProduct.map((s: any) => {
              const lines = s.items.filter((it: any) => it.product.id === id);
              const qty = lines.reduce((a: number, it: any) => a + Number(it.quantity || 0), 0);
              const rev = lines.reduce((a: number, it: any) => a + Number(it.total || 0), 0);
              return (
                <Link key={s.id} to={`/sales/${s.id}/receipt`} className="block px-5 py-3 hover:bg-sky-50/40 transition">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-extrabold text-sm text-slate-900">{s.saleNumber}</span>
                        <span className="text-[10px] text-slate-500 font-bold">
                          {new Date(s.soldAt).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                        {s.creditAmount > 0 && <Pill2 tone="amber">Udhaar</Pill2>}
                      </div>
                      <div className="text-xs text-slate-600 font-semibold mt-0.5">
                        {s.customer?.name || 'Walk-in'} • {qty} {product.unit}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-extrabold text-emerald-700 tabular-nums">{formatPKRFull(rev)}</div>
                      <div className="text-[10px] text-slate-500 font-bold">of {formatPKR(s.total)}</div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-300 shrink-0" />
                  </div>
                </Link>
              );
            })}
          </div>
        </Panel>
      )}

      {/* ═══ STOCK LOG ═══ */}
      {tab === 'log' && (
        <Panel icon={History} title="Stock Movement Log" desc={`${movements.length} entries`} tone="slate"
          empty={movements.length === 0} emptyText="Koi stock movement record nahi mila">
          <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
            {movements.map((m: any, i: number) => {
              const qty = Number(m.quantity ?? m.qty ?? 0);
              const isIn = qty > 0 || String(m.type || '').includes('IN') || String(m.type || '').includes('PURCHASE');
              return (
                <div key={m.id ?? i} className="px-5 py-3 flex items-center gap-3 hover:bg-slate-50/60">
                  <div className={['h-9 w-9 rounded-xl flex items-center justify-center shrink-0', isIn ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'].join(' ')}>
                    {isIn ? <Plus className="h-4 w-4" /> : <PackageX className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-extrabold text-slate-900 text-sm">{String(m.type || 'MOVEMENT').replace(/_/g, ' ')}</div>
                    <div className="text-[11px] text-slate-500 font-semibold truncate">
                      {m.note || m.reason || m.reference || '—'}
                      {m.createdAt && ` • ${new Date(m.createdAt).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })}`}
                    </div>
                  </div>
                  <div className={['font-extrabold tabular-nums shrink-0', isIn ? 'text-emerald-700' : 'text-rose-700'].join(' ')}>
                    {isIn && qty > 0 ? '+' : ''}{qty} <span className="text-[10px] font-bold text-slate-500">{product.unit}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      )}
    </div>
  );
}

/* ══════════ helpers ══════════ */

function Zap2(props: any) { return <Sparkles {...props} />; }

function Chip({ icon: Icon, children, tone = 'default' }: any) {
  const tones: Record<string, string> = {
    default: 'bg-white/10',
    violet: 'bg-violet-500/30 border border-violet-300/40',
    emerald: 'bg-emerald-500/30 border border-emerald-300/40',
    rose: 'bg-rose-500/30 border border-rose-300/40',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md backdrop-blur font-bold ${tones[tone]}`}>
      <Icon className="h-3 w-3" /> {children}
    </span>
  );
}

function HeroStat({ icon: Icon, label, value, sub, tone }: any) {
  const tones: Record<string, string> = {
    emerald: 'from-emerald-400/30 to-emerald-600/20 border-emerald-300/40',
    sky: 'from-sky-400/30 to-sky-600/20 border-sky-300/40',
    violet: 'from-violet-400/30 to-violet-600/20 border-violet-300/40',
    amber: 'from-amber-400/30 to-amber-600/20 border-amber-300/40',
    rose: 'from-rose-400/40 to-rose-600/25 border-rose-300/50',
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

function AlertCard({ tone, icon: Icon, title, body, action }: any) {
  const tones: Record<string, string> = {
    rose: 'from-rose-50 to-white border-rose-300 text-rose-900',
    amber: 'from-amber-50 to-white border-amber-300 text-amber-900',
    sky: 'from-sky-50 to-white border-sky-300 text-sky-900',
  };
  const btn: Record<string, string> = {
    rose: 'bg-rose-600 hover:bg-rose-700',
    amber: 'bg-amber-600 hover:bg-amber-700',
    sky: 'bg-sky-600 hover:bg-sky-700',
  };
  return (
    <div className={`rounded-2xl bg-gradient-to-br border-2 p-4 flex items-start gap-3 ${tones[tone]}`}>
      <div className={`h-10 w-10 rounded-xl text-white flex items-center justify-center shadow-md shrink-0 ${btn[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-extrabold text-sm">{title}</h3>
        <p className="text-xs font-semibold opacity-90 mt-0.5 leading-relaxed">{body}</p>
        {action && (
          action.to ? (
            <Link to={action.to} className={`mt-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-white text-xs font-extrabold ${btn[tone]}`}>
              {action.label} <ChevronRight className="h-3 w-3" />
            </Link>
          ) : (
            <button onClick={action.onClick} className={`mt-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-white text-xs font-extrabold ${btn[tone]}`}>
              {action.label} <ChevronRight className="h-3 w-3" />
            </button>
          )
        )}
      </div>
    </div>
  );
}

function Panel({ icon: Icon, title, desc, tone, children, empty, emptyText, emptyAction }: any) {
  const tones: Record<string, string> = {
    sky: 'from-sky-500 to-cyan-700',
    violet: 'from-violet-500 to-purple-700',
    amber: 'from-amber-500 to-orange-600',
    emerald: 'from-emerald-500 to-teal-600',
    slate: 'from-slate-500 to-slate-700',
  };
  return (
    <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b-2 border-slate-100 flex items-center gap-3">
        <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-md`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-extrabold text-slate-900 text-lg leading-tight">{title}</h3>
          <p className="text-xs text-slate-500 font-semibold">{desc}</p>
        </div>
      </div>
      {empty ? (
        <div className="p-12 text-center">
          <Icon className="h-12 w-12 text-slate-300 mx-auto mb-2" />
          <div className="font-extrabold text-slate-700">{emptyText}</div>
          {emptyAction && <div className="mt-4 flex justify-center">{emptyAction}</div>}
        </div>
      ) : children}
    </section>
  );
}

function Th2({ children, className = '' }: any) {
  return <th className={`px-3 py-3 text-left text-[10px] font-extrabold uppercase tracking-wider text-slate-700 ${className}`}>{children}</th>;
}

function Pill2({ tone, children }: any) {
  const tones: Record<string, string> = {
    emerald: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
    rose: 'bg-rose-100 text-rose-700',
  };
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${tones[tone]}`}>{children}</span>;
}

function ConvCell({ label, value, tone }: any) {
  const tones: Record<string, string> = {
    sky: 'text-sky-700', emerald: 'text-emerald-700', rose: 'text-rose-700', slate: 'text-slate-700',
  };
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500">{label}</div>
      <div className={['text-xl font-extrabold tabular-nums mt-0.5', tones[tone]].join(' ')}>{value}</div>
    </div>
  );
}

function QuickLink({ to, icon: Icon, title, desc, tone }: any) {
  const tones: Record<string, string> = {
    sky: 'bg-sky-100 text-sky-700 group-hover:bg-sky-600',
    violet: 'bg-violet-100 text-violet-700 group-hover:bg-violet-600',
    amber: 'bg-amber-100 text-amber-700 group-hover:bg-amber-600',
    emerald: 'bg-emerald-100 text-emerald-700 group-hover:bg-emerald-600',
  };
  return (
    <Link to={to} className="rounded-2xl bg-white border-2 border-slate-200 hover:border-sky-400 hover:shadow-md p-4 flex items-center gap-3 transition group">
      <div className={`h-11 w-11 rounded-xl flex items-center justify-center transition group-hover:text-white ${tones[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-extrabold text-slate-900 text-sm">{title}</div>
        <div className="text-[10px] text-slate-500 font-semibold">{desc}</div>
      </div>
      <ChevronRight className="h-4 w-4 text-slate-400" />
    </Link>
  );
}
