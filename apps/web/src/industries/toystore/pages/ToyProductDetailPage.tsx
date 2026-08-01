import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Edit3, Boxes, Package, PackageX, DollarSign, TrendingUp,
  Star, ChevronRight, Baby, Receipt, ShoppingCart, Hash,
  Tag, Trash2, AlertTriangle, History, Sparkles, GraduationCap,
  BarChart3, Info, Plus, Cake, Gift, ShieldCheck, ShieldAlert,
  Battery, Radio, Users, Palette, Ruler, Video, FileText,
  CheckCircle2, XCircle, Award, Heart,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { toast } from 'sonner';
import { Button } from '@core/ui/Button';
import { formatPKR, formatPKRFull } from '@core/lib/format';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { productVariantsApi } from '@modules/inventory/products/api/product-variants.api';
import { productImagesApi } from '@modules/inventory/products/api/product-images.api';
import { salesApi } from '@modules/sales/sales/api/sales.api';
import { stockMovementsApi } from '@modules/inventory/stock-movements/api/stock-movements.api';
import { toyProductsApi } from '../api/products.api';
import { PrivacyToggle, useCostHidden } from '@core/ui/HiddenValue';

type Tab = 'overview' | 'details' | 'safety' | 'variants' | 'sales' | 'log';

const AGE_LABELS: Record<string, string> = {
  NEWBORN_0_6M: '0-6 Months', INFANT_6_12M: '6-12 Months',
  TODDLER_1_2Y: '1-2 Years', TODDLER_2_3Y: '2-3 Years',
  PRESCHOOL_3_5Y: '3-5 Years', KIDS_5_8Y: '5-8 Years',
  KIDS_8_12Y: '8-12 Years', TWEEN_12_14Y: '12-14 Years',
  TEEN_14_PLUS: '14+ Years', ALL_AGES: 'All Ages',
};

export default function ToyProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const hideCost = useCostHidden();

  const [tab, setTab] = useState<Tab>('overview');
  const [imgIndex, setImgIndex] = useState(0);

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productsApi.getOne(id!),
    enabled: !!id,
  });

  const { data: profile } = useQuery({
    queryKey: ['toy-profile', id],
    queryFn: () => toyProductsApi.byProduct(id!),
    enabled: !!id,
  });

  const { data: variants = [] } = useQuery({
    queryKey: ['product-variants', id],
    queryFn: () => productVariantsApi.list(id!),
    enabled: !!id,
    staleTime: 0,
  });

  const { data: images = [] } = useQuery({
    queryKey: ['product-images', id],
    queryFn: () => productImagesApi.list(id!),
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

  const soldLines = useMemo(() => {
    if (!id) return [];
    return (allSales as any[]).flatMap((s) =>
      s.items.filter((it: any) => it.product.id === id).map((it: any) => ({ ...it, sale: s }))
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
    const orders = new Set(soldLines.map((it) => it.sale.id)).size;

    const cutoff = Date.now() - 30 * 86400000;
    const sold30 = soldLines
      .filter((it) => new Date(it.sale.soldAt).getTime() >= cutoff)
      .reduce((a, it) => a + Number(it.quantity || 0), 0);
    const perDay = sold30 / 30;
    const daysLeft = perDay > 0 ? Math.floor(stock / perDay) : null;

    // Safety Score
    const safetyScore = profile ? [
      profile.isNonToxic, profile.isBpaFree, profile.isPhthalateFree,
      !profile.chokingHazard, (profile.safetyCertifications ?? []).length > 0,
    ].filter(Boolean).length : 0;
    const safetyPct = Math.round((safetyScore / 5) * 100);

    return {
      stock, price, cost, alert,
      isOut: stock <= 0,
      isLow: stock > 0 && stock <= alert,
      stockValue: stock * price,
      stockCost: stock * cost,
      margin: price > 0 ? ((price - cost) / price) * 100 : 0,
      profitPerUnit: price - cost,
      totalSold, totalRevenue, orders,
      variantCount: (variants as any[]).length,
      variantStock: (variants as any[]).reduce((a, v) => a + Number(v.stock || 0), 0),
      sold30, perDay, daysLeft,
      safetyPct,
    };
  }, [product, soldLines, variants, profile]);

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
      toast.success(data?.softDeleted ? 'Toy deactivated' : 'Toy deleted');
      qc.invalidateQueries({ queryKey: ['toy-products-list'] });
      navigate('/toy-products');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Delete failed'),
  });

  if (isLoading || !product) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-12 w-12 rounded-full border-4 border-pink-200 border-t-pink-600 animate-spin" />
      </div>
    );
  }

  const gallery: any[] = (images as any[]).length ? (images as any[]) : (product.images ?? []);

  const TABS: { id: Tab; label: string; count?: number; icon: any }[] = [
    { id: 'overview', label: 'Overview', icon: Info },
    { id: 'details', label: 'Details', icon: Sparkles },
    { id: 'safety', label: 'Safety', icon: ShieldCheck },
    { id: 'variants', label: 'Variants', count: stats.variantCount, icon: Boxes },
    { id: 'sales', label: 'Sales', count: salesForProduct.length, icon: Receipt },
    { id: 'log', label: 'Stock Log', count: movements.length, icon: History },
  ];

  return (
    <div className="space-y-5 pb-10">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button onClick={() => navigate('/toy-products')} className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-pink-600 font-bold">
          <ArrowLeft className="h-4 w-4" /> All Toys
        </button>
        <div className="flex items-center gap-2 flex-wrap">
          <Link to={`/toy-products/${id}/edit`} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-pink-50 border-2 border-pink-200 hover:bg-pink-100 text-pink-700 text-sm font-extrabold">
            <Edit3 className="h-4 w-4" /> Edit
          </Link>
          <Link to="/pos" className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border-2 border-slate-200 hover:border-pink-300 text-slate-700 text-sm font-extrabold">
            <ShoppingCart className="h-4 w-4" /> POS
          </Link>
          <PrivacyToggle compact />
          <button onClick={() => { if (confirm(`Delete "${product.name}"?`)) removeMutation.mutate(); }}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-50 border-2 border-rose-200 hover:bg-rose-100 text-rose-700 text-sm font-extrabold">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-pink-900 to-rose-700 text-white shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-pink-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-rose-400/15 blur-3xl" />

        <div className="relative grid lg:grid-cols-[280px_1fr] gap-6 p-6">
          <div className="space-y-2">
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-white/10 backdrop-blur border-2 border-white/20">
              {gallery[imgIndex]?.url ? (
                <img src={gallery[imgIndex].url} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/50"><Baby className="h-16 w-16" /></div>
              )}
              {profile?.isFeatured && (
                <div className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-amber-500 text-white text-[10px] font-extrabold shadow-lg inline-flex items-center gap-1">
                  <Star className="h-3 w-3 fill-white" /> FEATURED
                </div>
              )}
              {profile?.isBestSeller && (
                <div className="absolute top-12 right-3 px-2 py-1 rounded-lg bg-orange-600 text-white text-[10px] font-extrabold shadow-lg inline-flex items-center gap-1">
                  <Award className="h-3 w-3 fill-white" /> BESTSELLER
                </div>
              )}
              {profile?.isNewArrival && (
                <div className="absolute top-3 left-3 px-2 py-1 rounded-lg bg-emerald-500 text-white text-[10px] font-extrabold shadow-lg">
                  🆕 NEW
                </div>
              )}
              {profile?.isBirthdayGift && (
                <div className="absolute bottom-3 left-3 px-2 py-1 rounded-lg bg-pink-600 text-white text-[10px] font-extrabold shadow-lg inline-flex items-center gap-1">
                  <Cake className="h-3 w-3" /> BIRTHDAY GIFT
                </div>
              )}
              {profile?.chokingHazard && (
                <div className="absolute bottom-3 right-3 px-2 py-1 rounded-lg bg-rose-600 text-white text-[10px] font-extrabold shadow-lg inline-flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> HAZARD
                </div>
              )}
              {!product.isActive && (
                <div className="absolute inset-x-0 bottom-0 py-1.5 bg-rose-600 text-center text-xs font-extrabold">DEACTIVATED</div>
              )}
            </div>
            {gallery.length > 1 && (
              <div className="grid grid-cols-5 gap-1.5">
                {gallery.slice(0, 5).map((img: any, i: number) => (
                  <button key={img.id ?? i} onClick={() => setImgIndex(i)}
                    className={`aspect-square rounded-lg overflow-hidden border-2 transition ${imgIndex === i ? 'border-white' : 'border-white/20 opacity-70 hover:opacity-100'}`}>
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Baby className="h-3.5 w-3.5 text-amber-300" /> Toy
              {profile?.ageGroup && (<><span className="text-white/40">•</span><span>{AGE_LABELS[profile.ageGroup]}</span></>)}
              {profile?.categoryType && (<><span className="text-white/40">•</span><span>{profile.categoryType.replace(/_/g, ' ')}</span></>)}
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">{product.name}</h1>
            {product.description && (
              <p className="mt-2 text-sm text-white/85 max-w-2xl line-clamp-2">{product.description}</p>
            )}

            <div className="mt-3 flex items-center gap-2 flex-wrap text-xs">
              {profile?.brand && <Chip icon={Award}>{profile.brand}</Chip>}
              {profile?.characterFranchise && <Chip icon={Star}>{profile.characterFranchise}</Chip>}
              {product.sku && <Chip icon={Hash}>SKU: {product.sku}</Chip>}
              {profile?.genderTarget && <Chip icon={Users} tone="violet">{profile.genderTarget}</Chip>}
              {profile?.isEducational && <Chip icon={GraduationCap} tone="emerald">Educational</Chip>}
              {product.isActive ? <Chip icon={CheckCircle2} tone="emerald">Active</Chip> : <Chip icon={XCircle} tone="rose">Off</Chip>}
            </div>

            <div className="mt-5 flex items-end gap-5 flex-wrap">
              <div>
                <div className="text-[10px] uppercase font-extrabold text-white/70 tracking-wider">Retail Price</div>
                <div className="text-4xl font-extrabold tabular-nums leading-none mt-1">{formatPKRFull(product.price)}</div>
              </div>
              {!hideCost && Number(product.costPrice || 0) > 0 && (
                <div>
                  <div className="text-[10px] uppercase font-extrabold text-white/70 tracking-wider">Cost</div>
                  <div className="text-xl font-extrabold tabular-nums text-white/80 leading-none mt-1">{formatPKRFull(product.costPrice)}</div>
                </div>
              )}
              {profile?.mrp ? (
                <div>
                  <div className="text-[10px] uppercase font-extrabold text-white/70 tracking-wider">MRP</div>
                  <div className="text-xl font-extrabold tabular-nums text-amber-300 leading-none mt-1 line-through">{formatPKRFull(profile.mrp)}</div>
                </div>
              ) : null}
              {!hideCost && stats.profitPerUnit !== 0 && (
                <div className={`rounded-xl px-3 py-2 backdrop-blur border ${stats.profitPerUnit >= 0 ? 'bg-emerald-400/20 border-emerald-300/40' : 'bg-rose-400/20 border-rose-300/40'}`}>
                  <div className="text-[10px] uppercase font-extrabold text-white/80 tracking-wider">Profit / unit</div>
                  <div className="text-lg font-extrabold tabular-nums leading-none mt-0.5">
                    {formatPKRFull(stats.profitPerUnit)} <span className="text-xs opacity-80">({stats.margin.toFixed(0)}%)</span>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
              <HeroStat icon={Package} label="Stock" value={String(stats.stock)} sub="units"
                tone={stats.isOut ? 'rose' : stats.isLow ? 'amber' : 'blue'} />
              <HeroStat icon={DollarSign} label="Stock Value" value={formatPKR(stats.stockValue)} sub={hideCost ? '•••' : `cost ${formatPKR(stats.stockCost)}`} tone="emerald" />
              <HeroStat icon={TrendingUp} label="Total Sold" value={String(stats.totalSold)} sub={`${stats.orders} orders`} tone="pink" />
              <HeroStat icon={ShieldCheck} label="Safety Score" value={`${stats.safetyPct}%`}
                sub={stats.safetyPct >= 80 ? 'Excellent' : stats.safetyPct >= 50 ? 'Good' : 'Needs work'}
                tone={stats.safetyPct >= 80 ? 'emerald' : stats.safetyPct >= 50 ? 'amber' : 'rose'} />
            </div>
          </div>
        </div>
      </section>

      {(stats.isOut || stats.isLow) && (
        <section className="rounded-3xl border-2 bg-gradient-to-br p-4 flex items-start gap-3 from-amber-50 to-white border-amber-300 text-amber-900">
          <div className="h-11 w-11 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-md">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-extrabold text-sm">
              {stats.isOut ? 'Out of stock' : `Only ${stats.stock} units left`}
            </h3>
            <p className="text-xs font-semibold opacity-90 mt-0.5">
              {stats.daysLeft !== null
                ? `30-day avg ${stats.perDay.toFixed(1)}/day — approx ${stats.daysLeft} days of stock`
                : `Alert threshold: ${stats.alert}`}
            </p>
          </div>
        </section>
      )}

      {profile?.chokingHazard && (
        <section className="rounded-3xl bg-gradient-to-br from-rose-50 to-red-50 border-2 border-rose-300 p-4 flex items-start gap-3">
          <div className="h-11 w-11 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-md">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-extrabold text-sm text-rose-900">⚠️ Choking Hazard</h3>
            <p className="text-xs font-semibold text-rose-800 mt-0.5">
              This toy contains small parts. Not suitable for children under 3 years. Always sell with warning.
            </p>
          </div>
        </section>
      )}

      {/* Tabs */}
      <section className="rounded-2xl bg-white border-2 border-slate-200 shadow-sm p-2 overflow-x-auto">
        <div className="flex gap-1.5 min-w-max">
          {TABS.map((t) => {
            const active = tab === t.id;
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`px-4 py-2.5 rounded-xl text-sm font-extrabold inline-flex items-center gap-2 transition ${
                  active ? 'bg-gradient-to-br from-pink-600 to-rose-700 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}>
                <Icon className="h-4 w-4" />
                {t.label}
                {t.count !== undefined && (
                  <span className={`px-1.5 rounded-full text-[10px] font-extrabold ${active ? 'bg-white/25' : 'bg-slate-200 text-slate-700'}`}>
                    {t.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* OVERVIEW */}
      {tab === 'overview' && (
        <div className="space-y-5">
          <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg leading-tight">Last 30 Days Sales</h3>
                <p className="text-xs text-slate-500 font-semibold">
                  {stats.sold30} units sold • avg {stats.perDay.toFixed(1)}/day
                </p>
              </div>
            </div>
            {chartData.some((d) => d.revenue > 0) ? (
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="toyDetailGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ec4899" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="#ec4899" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="label" stroke="#64748b" fontSize={10} interval={4} />
                    <YAxis stroke="#64748b" fontSize={10} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: any) => formatPKR(Number(v))} contentStyle={{ borderRadius: 12, border: '2px solid #e2e8f0' }} />
                    <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#ec4899" strokeWidth={2.5} fill="url(#toyDetailGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[200px] flex flex-col items-center justify-center gap-2">
                <Receipt className="h-10 w-10 text-slate-300" />
                <p className="text-sm font-extrabold text-slate-700">No sales in last 30 days</p>
              </div>
            )}
          </section>

          {profile?.videoUrl && (
            <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-rose-500 to-red-700 text-white flex items-center justify-center shadow-md">
                  <Video className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900">Product Video</h3>
                  <p className="text-xs text-slate-500 font-semibold">Watch demo</p>
                </div>
                <a href={profile.videoUrl} target="_blank" rel="noreferrer"
                  className="ml-auto inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-700 text-xs font-extrabold">
                  Watch on YouTube
                </a>
              </div>
            </section>
          )}
        </div>
      )}

      {/* DETAILS */}
      {tab === 'details' && (
        <Panel icon={Sparkles} title="Toy Details" desc="Educational, physical, and play features" tone="pink"
          empty={!profile} emptyText="No detail info yet">
          {profile && (
            <div className="p-5 space-y-5">
              {profile.isEducational && (
                <SpecSection icon={GraduationCap} title="Educational Value" tone="violet">
                  {profile.learningAreas?.length > 0 && (
                    <div>
                      <div className="text-[10px] uppercase font-extrabold text-slate-500 mb-1.5">Learning Areas</div>
                      <div className="flex flex-wrap gap-1.5">
                        {profile.learningAreas.map((la: string) => (
                          <span key={la} className="px-2.5 py-1 rounded-lg bg-violet-100 text-violet-800 text-xs font-extrabold">{la}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {profile.developmentSkills?.length > 0 && (
                    <div className="mt-2">
                      <div className="text-[10px] uppercase font-extrabold text-slate-500 mb-1.5">Development Skills</div>
                      <div className="flex flex-wrap gap-1.5">
                        {profile.developmentSkills.map((s: string) => (
                          <span key={s} className="px-2.5 py-1 rounded-lg bg-pink-100 text-pink-800 text-xs font-extrabold">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <InfoBox label="Montessori" value={profile.isMontessoriApproved ? '✓ Approved' : '—'} tone={profile.isMontessoriApproved ? 'emerald' : 'slate'} />
                    <InfoBox label="Waldorf" value={profile.isWaldorfApproved ? '✓ Approved' : '—'} tone={profile.isWaldorfApproved ? 'emerald' : 'slate'} />
                  </div>
                </SpecSection>
              )}

              {(profile.material || profile.colorName || profile.dimensions) && (
                <SpecSection icon={Palette} title="Material & Physical" tone="violet">
                  {profile.material && <SpecRow label="Primary Material" value={profile.material} />}
                  {profile.materialsUsed?.length > 0 && (
                    <div>
                      <div className="text-[10px] uppercase font-extrabold text-slate-500 mb-1">All Materials</div>
                      <div className="flex flex-wrap gap-1">
                        {profile.materialsUsed.map((m: string) => (
                          <span key={m} className="px-2 py-0.5 rounded-md bg-violet-100 text-violet-700 text-[10px] font-extrabold">{m}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {profile.colorName && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600 font-semibold">Color</span>
                      <span className="font-extrabold text-slate-900 inline-flex items-center gap-2">
                        {profile.colorHex && <span className="h-4 w-4 rounded-full border-2 border-slate-200" style={{ backgroundColor: profile.colorHex }} />}
                        {profile.colorName}
                      </span>
                    </div>
                  )}
                  {profile.dimensions && <SpecRow label="Dimensions" value={profile.dimensions} />}
                  {profile.weightGrams && <SpecRow label="Weight" value={`${profile.weightGrams} g`} />}
                  {profile.numberOfPieces && <SpecRow label="Pieces" value={String(profile.numberOfPieces)} />}
                </SpecSection>
              )}

              {profile.requiresBatteries && (
                <SpecSection icon={Battery} title="Battery" tone="amber">
                  <InfoBox label="Batteries Included" value={profile.batteriesIncluded ? '✓ Yes' : '⚠️ No — upsell!'} tone={profile.batteriesIncluded ? 'emerald' : 'amber'} />
                  {profile.batteryType && <SpecRow label="Type" value={profile.batteryType} />}
                  {profile.batteryQuantity && <SpecRow label="Quantity" value={String(profile.batteryQuantity)} />}
                </SpecSection>
              )}

              {profile.isRemoteControlled && (
                <SpecSection icon={Radio} title="Remote Control" tone="blue">
                  {profile.rcRange && <SpecRow label="Range" value={profile.rcRange} />}
                  {profile.rcFrequency && <SpecRow label="Frequency" value={profile.rcFrequency} />}
                  {profile.rcChargingTime && <SpecRow label="Charging Time" value={profile.rcChargingTime} />}
                  {profile.rcRunTime && <SpecRow label="Run Time" value={profile.rcRunTime} />}
                </SpecSection>
              )}

              {(profile.playerCount || profile.playDurationMinutes) && (
                <SpecSection icon={Users} title="Play Experience" tone="emerald">
                  {profile.playerCount && <SpecRow label="Players" value={profile.playerCount} />}
                  {profile.playDurationMinutes && <SpecRow label="Duration" value={`${profile.playDurationMinutes} min`} />}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {profile.hasSound && <Feat label="🔊 Sound" />}
                    {profile.hasLights && <Feat label="💡 Lights" />}
                    {profile.hasMotor && <Feat label="⚙️ Motor" />}
                    {profile.isMultiplayer && <Feat label="👥 Multiplayer" />}
                    {profile.isCollectible && <Feat label="💎 Collectible" />}
                  </div>
                </SpecSection>
              )}

              {profile.languagesSupported?.length > 0 && (
                <SpecSection icon={FileText} title="Languages" tone="rose">
                  <div className="flex flex-wrap gap-1.5">
                    {profile.languagesSupported.map((l: string) => (
                      <span key={l} className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 text-xs font-extrabold">{l}</span>
                    ))}
                  </div>
                </SpecSection>
              )}
            </div>
          )}
        </Panel>
      )}

      {/* SAFETY */}
      {tab === 'safety' && (
        <Panel icon={ShieldCheck} title="Safety & Certifications" desc="Compliance and hazard flags" tone="emerald">
          <div className="p-5 space-y-5">
            {/* Safety Score */}
            <div className={`rounded-2xl border-2 p-5 ${
              stats.safetyPct >= 80 ? 'bg-emerald-50 border-emerald-300' :
              stats.safetyPct >= 50 ? 'bg-amber-50 border-amber-300' : 'bg-rose-50 border-rose-300'}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className={`h-6 w-6 ${
                    stats.safetyPct >= 80 ? 'text-emerald-700' :
                    stats.safetyPct >= 50 ? 'text-amber-700' : 'text-rose-700'}`} />
                  <h3 className="font-extrabold text-lg">Safety Score</h3>
                </div>
                <div className={`text-4xl font-extrabold tabular-nums ${
                  stats.safetyPct >= 80 ? 'text-emerald-700' :
                  stats.safetyPct >= 50 ? 'text-amber-700' : 'text-rose-700'}`}>
                  {stats.safetyPct}%
                </div>
              </div>
              <div className="h-3 rounded-full bg-white/70 overflow-hidden">
                <div className={`h-full transition-all ${
                  stats.safetyPct >= 80 ? 'bg-emerald-500' :
                  stats.safetyPct >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                  style={{ width: `${stats.safetyPct}%` }} />
              </div>
            </div>

            {(profile?.safetyCertifications?.length ?? 0) > 0 && profile && (
              <SpecSection icon={Award} title="Certifications" tone="emerald">
                <div className="grid sm:grid-cols-2 gap-2">
                  {profile.safetyCertifications.map((c: string) => (
                    <div key={c} className="inline-flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border-2 border-emerald-200">
                      <CheckCircle2 className="h-5 w-5 text-emerald-700" />
                      <span className="font-extrabold text-emerald-900">{c}</span>
                    </div>
                  ))}
                </div>
              </SpecSection>
            )}

            <SpecSection icon={ShieldCheck} title="Material Safety" tone="blue">
              <div className="grid grid-cols-3 gap-2">
                <SafetyBadge label="Non-toxic" ok={profile?.isNonToxic} />
                <SafetyBadge label="BPA-Free" ok={profile?.isBpaFree} />
                <SafetyBadge label="Phthalate-Free" ok={profile?.isPhthalateFree} />
              </div>
            </SpecSection>

            {(profile?.chokingHazard || profile?.smallPartsWarning) && (
              <SpecSection icon={AlertTriangle} title="Hazards" tone="rose">
                {profile.chokingHazard && (
                  <div className="rounded-xl bg-rose-100 border-2 border-rose-300 p-3">
                    <div className="font-extrabold text-rose-900 text-sm">⚠️ Choking Hazard</div>
                    <div className="text-xs text-rose-700 font-semibold mt-0.5">Small parts — not for children under 3</div>
                  </div>
                )}
                {profile.smallPartsWarning && (
                  <div className="rounded-xl bg-amber-100 border-2 border-amber-300 p-3">
                    <div className="font-extrabold text-amber-900 text-sm">Small Parts Warning</div>
                    <div className="text-xs text-amber-700 font-semibold mt-0.5">Requires adult supervision</div>
                  </div>
                )}
              </SpecSection>
            )}

            {(profile?.safetyWarnings?.length ?? 0) > 0 && profile && (
              <SpecSection icon={Info} title="Warnings" tone="amber">
                <div className="space-y-1.5">
                  {profile.safetyWarnings.map((w: string, i: number) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 border border-amber-200 text-xs font-extrabold text-amber-900">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                      {w}
                    </div>
                  ))}
                </div>
              </SpecSection>
            )}
          </div>
        </Panel>
      )}

      {/* VARIANTS */}
      {tab === 'variants' && (
        <Panel icon={Boxes} title="Variants" desc={`${stats.variantCount} variants • ${stats.variantStock} units`} tone="pink"
          empty={(variants as any[]).length === 0}
          emptyText="No variants — single edition"
          emptyAction={<Link to={`/toy-products/${id}/edit`}><Button variant="secondary"><Plus className="h-4 w-4" /> Add Variants</Button></Link>}>
          <div className="p-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(variants as any[]).map((v) => {
              const vStock = Number(v.stock || 0);
              const vLow = vStock > 0 && vStock <= Number(v.lowStockAlert ?? 5);
              return (
                <div key={v.id} className={`rounded-2xl border-2 p-3 ${vStock <= 0 ? 'border-rose-200 bg-rose-50/40' : vLow ? 'border-amber-200 bg-amber-50/40' : 'border-slate-200 bg-white'}`}>
                  <div className="font-extrabold text-slate-900 text-sm truncate">{v.name}</div>
                  <div className="text-[10px] font-mono text-slate-500 mt-0.5">{v.sku || v.barcode || '—'}</div>
                  <div className="mt-2 flex items-end justify-between">
                    <div className="text-base font-extrabold text-emerald-700 tabular-nums">{formatPKRFull(v.price)}</div>
                    <div className={`text-sm font-extrabold tabular-nums ${vStock <= 0 ? 'text-rose-700' : vLow ? 'text-amber-700' : 'text-slate-700'}`}>
                      {vStock} <span className="text-[10px] font-bold text-slate-500">units</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      {/* SALES */}
      {tab === 'sales' && (
        <Panel icon={Receipt} title="Sales History" desc={`${salesForProduct.length} recent • ${stats.totalSold} sold`} tone="emerald"
          empty={salesForProduct.length === 0} emptyText="No sales yet">
          <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
            {salesForProduct.map((s: any) => {
              const lines = s.items.filter((it: any) => it.product.id === id);
              const qty = lines.reduce((a: number, it: any) => a + Number(it.quantity || 0), 0);
              const rev = lines.reduce((a: number, it: any) => a + Number(it.total || 0), 0);
              return (
                <Link key={s.id} to={`/sales/${s.id}/receipt`} className="block px-5 py-3 hover:bg-pink-50/40 transition">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-extrabold text-sm text-slate-900">{s.saleNumber}</span>
                        <span className="text-[10px] text-slate-500 font-bold">
                          {new Date(s.soldAt).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 font-semibold mt-0.5">
                        {s.customer?.name || 'Walk-in'} • {qty} units
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-extrabold text-emerald-700 tabular-nums">{formatPKRFull(rev)}</div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-300 shrink-0" />
                  </div>
                </Link>
              );
            })}
          </div>
        </Panel>
      )}

      {/* LOG */}
      {tab === 'log' && (
        <Panel icon={History} title="Stock Movement Log" desc={`${movements.length} entries`} tone="slate"
          empty={movements.length === 0} emptyText="No movements yet">
          <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
            {movements.map((m: any, i: number) => {
              const qty = Number(m.quantity ?? m.qty ?? 0);
              const isIn = qty > 0 || String(m.type || '').includes('IN');
              return (
                <div key={m.id ?? i} className="px-5 py-3 flex items-center gap-3 hover:bg-slate-50/60">
                  <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${isIn ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                    {isIn ? <Plus className="h-4 w-4" /> : <PackageX className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-extrabold text-slate-900 text-sm">{String(m.type || 'MOVEMENT').replace(/_/g, ' ')}</div>
                    <div className="text-[11px] text-slate-500 font-semibold truncate">
                      {m.note || m.reason || '—'}
                      {m.createdAt && ` • ${new Date(m.createdAt).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })}`}
                    </div>
                  </div>
                  <div className={`font-extrabold tabular-nums shrink-0 ${isIn ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {isIn && qty > 0 ? '+' : ''}{qty} <span className="text-[10px] font-bold text-slate-500">units</span>
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
    blue: 'from-blue-400/30 to-blue-600/20 border-blue-300/40',
    pink: 'from-pink-400/30 to-pink-600/20 border-pink-300/40',
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

function Panel({ icon: Icon, title, desc, tone, children, empty, emptyText, emptyAction }: any) {
  const tones: Record<string, string> = {
    pink: 'from-pink-500 to-rose-700',
    emerald: 'from-emerald-500 to-teal-600',
    slate: 'from-slate-500 to-slate-700',
  };
  return (
    <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b-2 border-slate-100 flex items-center gap-3">
        <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${tones[tone] || tones.pink} text-white flex items-center justify-center shadow-md`}>
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

function SpecSection({ icon: Icon, title, tone, children }: any) {
  const tones: Record<string, string> = {
    violet: 'from-violet-500 to-purple-700 bg-violet-50 border-violet-200',
    blue: 'from-blue-500 to-cyan-700 bg-blue-50 border-blue-200',
    emerald: 'from-emerald-500 to-teal-700 bg-emerald-50 border-emerald-200',
    amber: 'from-amber-500 to-orange-600 bg-amber-50 border-amber-200',
    rose: 'from-rose-500 to-red-700 bg-rose-50 border-rose-200',
    pink: 'from-pink-500 to-rose-700 bg-pink-50 border-pink-200',
  };
  const parts = tones[tone].split(' ');
  return (
    <div className={`rounded-2xl border-2 ${parts.slice(3).join(' ')} p-4`}>
      <div className="flex items-center gap-2 mb-3">
        <div className={`h-8 w-8 rounded-lg bg-gradient-to-br ${parts[0]} ${parts[1]} text-white flex items-center justify-center shadow`}>
          <Icon className="h-4 w-4" />
        </div>
        <h4 className="font-extrabold text-slate-900 text-sm">{title}</h4>
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-600 font-semibold">{label}</span>
      <span className="font-extrabold text-slate-900">{value}</span>
    </div>
  );
}

function InfoBox({ label, value, tone }: any) {
  const tones: Record<string, string> = {
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    amber: 'bg-amber-50 border-amber-200 text-amber-800',
    slate: 'bg-slate-50 border-slate-200 text-slate-800',
  };
  return (
    <div className={`rounded-xl border-2 p-3 ${tones[tone]}`}>
      <div className="text-[10px] uppercase font-extrabold opacity-75">{label}</div>
      <div className="text-lg font-extrabold mt-0.5">{value}</div>
    </div>
  );
}

function SafetyBadge({ label, ok }: { label: string; ok?: boolean }) {
  return (
    <div className={`rounded-xl border-2 p-3 text-center ${ok ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
      <div className="text-2xl mb-1">{ok ? '✓' : '—'}</div>
      <div className="text-xs font-extrabold">{label}</div>
    </div>
  );
}

function Feat({ label }: { label: string }) {
  return <span className="px-2 py-0.5 rounded-md bg-white border border-emerald-200 text-emerald-700 text-[10px] font-extrabold">{label}</span>;
}
