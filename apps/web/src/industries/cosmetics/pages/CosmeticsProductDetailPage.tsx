import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Edit3, Package, PackageX, DollarSign, TrendingUp,
  Star, Sparkles, Award, Palette, Heart, Wind, Calendar,
  Trash2, ShoppingCart, Info, CheckCircle2, XCircle, Trophy,
  Receipt, Clock, BarChart3, Layers, Crown, AlertTriangle,
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { toast } from 'sonner';
import { Button } from '@core/ui/Button';
import { formatPKR, formatPKRFull } from '@core/lib/format';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { productVariantsApi } from '@modules/inventory/products/api/product-variants.api';
import { salesApi } from '@modules/sales/sales/api/sales.api';
import { cosmeticsProductsApi } from '../api/products.api';
import { cosmeticsBatchesApi } from '../api/batches.api';
import { PrivacyToggle, useCostHidden } from '@core/ui/HiddenValue';

type Tab = 'overview' | 'ingredients' | 'fragrance' | 'certifications' | 'batches' | 'shades' | 'sales';

export default function CosmeticsProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const hideCost = useCostHidden();

  const [tab, setTab] = useState<Tab>('overview');

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productsApi.getOne(id!),
    enabled: !!id,
  });

  const { data: profile } = useQuery({
    queryKey: ['cosmetics-profile', id],
    queryFn: () => cosmeticsProductsApi.byProduct(id!),
    enabled: !!id,
  });

  const { data: variants = [] } = useQuery({
    queryKey: ['product-variants', id],
    queryFn: () => productVariantsApi.list(id!),
    enabled: !!id,
    staleTime: 0,
  });

  const { data: batches = [] } = useQuery({
    queryKey: ['cosmetics-batches-for-product', id],
    queryFn: () => cosmeticsBatchesApi.byProduct(id!),
    enabled: !!id && profile?.requiresBatchTracking,
  });

  const { data: allSales = [] } = useQuery({
    queryKey: ['sales-list-for-product'],
    queryFn: () => salesApi.list(),
    enabled: !!id,
  });

  const soldLines = useMemo(() => {
    if (!id) return [];
    return (allSales as any[]).flatMap((s) =>
      s.items.filter((it: any) => it.product.id === id).map((it: any) => ({ ...it, sale: s }))
    );
  }, [allSales, id]);

  const stats = useMemo(() => {
    const stock = Number(product?.stock || 0);
    const price = Number(product?.price || 0);
    const cost = Number(product?.costPrice || 0);
    const alert = Number(product?.lowStockAlert ?? 3);

    const totalSold = soldLines.reduce((a, it) => a + Number(it.quantity || 0), 0);
    const totalRevenue = soldLines.reduce((a, it) => a + Number(it.total || 0), 0);
    const orders = new Set(soldLines.map((it) => it.sale.id)).size;

    const now = new Date();
    const expiredBatches = (batches as any[]).filter((b) => b.expiryDate && new Date(b.expiryDate) < now).length;
    const expiringSoon = (batches as any[]).filter((b) => {
      if (!b.expiryDate) return false;
      const d = new Date(b.expiryDate);
      const days = Math.ceil((d.getTime() - now.getTime()) / 86400000);
      return days > 0 && days <= 30;
    }).length;

    const certCount = profile ? [
      profile.isHalalCertified, profile.isCrueltyFree, profile.isVegan, profile.isOrganic,
      profile.isHypoallergenic, profile.isFragranceFree, profile.isSulfateFree,
      profile.isParabenFree, profile.isNoncomedogenic, profile.isDermatologistTested,
    ].filter(Boolean).length : 0;

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
      batchCount: (batches as any[]).length,
      expiredBatches, expiringSoon,
      certCount,
    };
  }, [product, soldLines, variants, batches, profile]);

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
    onSuccess: () => {
      toast.success('Product deleted');
      qc.invalidateQueries({ queryKey: ['cosmetics-products-list'] });
      navigate('/cosmetics-products');
    },
  });

  if (isLoading || !product) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-12 w-12 rounded-full border-4 border-pink-200 border-t-pink-600 animate-spin" />
      </div>
    );
  }

  const TABS: { id: Tab; label: string; count?: number; icon: any; hidden?: boolean }[] = [
    { id: 'overview', label: 'Overview', icon: Info },
    { id: 'ingredients', label: 'Ingredients', icon: Heart },
    { id: 'fragrance', label: 'Fragrance', icon: Wind, hidden: !profile?.fragranceFamily && !profile?.topNotes?.length },
    { id: 'certifications', label: 'Certifications', count: stats.certCount, icon: Award },
    { id: 'batches', label: 'Batches', count: stats.batchCount, icon: Package, hidden: !profile?.requiresBatchTracking },
    { id: 'shades', label: 'Shades/Sizes', count: stats.variantCount, icon: Palette, hidden: stats.variantCount === 0 },
    { id: 'sales', label: 'Sales', count: soldLines.length, icon: Receipt },
  ];

  return (
    <div className="space-y-5 pb-10">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button onClick={() => navigate('/cosmetics-products')} className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-pink-600 font-bold">
          <ArrowLeft className="h-4 w-4" /> All Products
        </button>
        <div className="flex items-center gap-2 flex-wrap">
          <Link to={`/cosmetics-products/${id}/edit`} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-pink-50 border-2 border-pink-200 hover:bg-pink-100 text-pink-700 text-sm font-extrabold">
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
        <div className="relative grid lg:grid-cols-[280px_1fr] gap-6 p-6">
          <div className="space-y-2">
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-white/10 backdrop-blur border-2 border-white/20">
              {product.images?.[0]?.url ? (
                <img src={product.images[0].url} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/50">
                  <Sparkles className="h-16 w-16" />
                </div>
              )}
              {profile?.isLimitedEdition && (
                <div className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-purple-600 text-white text-[10px] font-extrabold shadow-lg inline-flex items-center gap-1">
                  <Crown className="h-3 w-3" /> LIMITED
                </div>
              )}
              {profile?.isViral && (
                <div className="absolute top-3 left-3 px-2 py-1 rounded-lg bg-rose-500 text-white text-[10px] font-extrabold shadow-lg">
                  🔥 VIRAL
                </div>
              )}
              {profile?.shadeHex && (
                <div className="absolute bottom-3 right-3 h-16 w-16 rounded-2xl border-4 border-white shadow-xl" style={{ backgroundColor: profile.shadeHex }} />
              )}
            </div>
          </div>

          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" /> Cosmetics
              {profile?.categoryType && (<><span className="text-white/40">•</span><span>{profile.categoryType.replace(/_/g, ' ')}</span></>)}
              {profile?.brand && (<><span className="text-white/40">•</span><span>{profile.brand.name}</span></>)}
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">{product.name}</h1>

            {(profile?.shadeName || profile?.shadeCode) && (
              <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 border border-white/20">
                {profile?.shadeHex && <span className="h-4 w-4 rounded-full border-2 border-white shadow" style={{ backgroundColor: profile.shadeHex }} />}
                <span className="text-sm font-extrabold">
                  {profile.shadeCode && <span className="font-mono opacity-80">{profile.shadeCode} · </span>}
                  {profile.shadeName}
                </span>
                {profile?.finish && <span className="text-xs opacity-80">· {profile.finish}</span>}
              </div>
            )}

            {product.description && (
              <p className="mt-3 text-sm text-white/85 max-w-2xl line-clamp-2">{product.description}</p>
            )}

            {/* Certifications badges */}
            {profile && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {profile.isHalalCertified && <CertBadge emoji="🕌" label="Halal" />}
                {profile.isCrueltyFree && <CertBadge emoji="🐰" label="Cruelty-Free" />}
                {profile.isVegan && <CertBadge emoji="🌱" label="Vegan" />}
                {profile.isOrganic && <CertBadge emoji="🌿" label="Organic" />}
                {profile.isDermatologistTested && <CertBadge emoji="👨‍⚕️" label="Derm Tested" />}
              </div>
            )}

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
                  <div className="text-xl font-extrabold tabular-nums text-amber-300 line-through leading-none mt-1">{formatPKRFull(profile.mrp)}</div>
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
              <HeroStat icon={Package} label="Stock" value={String(stats.stock)} sub={profile?.sizeDisplay || 'units'}
                tone={stats.isOut ? 'rose' : stats.isLow ? 'amber' : 'pink'} />
              <HeroStat icon={DollarSign} label="Stock Value" value={formatPKR(stats.stockValue)} sub="retail" tone="emerald" />
              <HeroStat icon={TrendingUp} label="Total Sold" value={String(stats.totalSold)} sub={`${stats.orders} orders`} tone="violet" />
              <HeroStat icon={Award} label="Certifications" value={String(stats.certCount)} sub="active" tone="teal" />
            </div>
          </div>
        </div>
      </section>

      {/* Alerts */}
      {(stats.isOut || stats.isLow || stats.expiredBatches > 0 || stats.expiringSoon > 0) && (
        <section className="rounded-3xl border-2 bg-gradient-to-br p-4 flex items-start gap-3 from-amber-50 to-white border-amber-300 text-amber-900">
          <div className="h-11 w-11 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-md">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="flex-1 space-y-1">
            {stats.isOut && <div className="font-extrabold text-sm">⚠️ Out of stock — restock urgently</div>}
            {stats.isLow && !stats.isOut && <div className="font-extrabold text-sm">Only {stats.stock} units left</div>}
            {stats.expiredBatches > 0 && <div className="font-extrabold text-sm">{stats.expiredBatches} batches expired — remove from shelves</div>}
            {stats.expiringSoon > 0 && <div className="font-extrabold text-sm">{stats.expiringSoon} batches expiring in 30 days</div>}
          </div>
        </section>
      )}

      {/* Tabs */}
      <section className="rounded-2xl bg-white border-2 border-slate-200 shadow-sm p-2 overflow-x-auto">
        <div className="flex gap-1.5 min-w-max">
          {TABS.filter((t) => !t.hidden).map((t) => {
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
        <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg">Last 30 Days Sales</h3>
              <p className="text-xs text-slate-500 font-semibold">
                {stats.totalSold} units total
              </p>
            </div>
          </div>
          {chartData.some((d) => d.revenue > 0) ? (
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="cosGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ec4899" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#ec4899" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={10} interval={4} />
                  <YAxis stroke="#64748b" fontSize={10} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: any) => formatPKR(Number(v))} contentStyle={{ borderRadius: 12 }} />
                  <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#ec4899" strokeWidth={2.5} fill="url(#cosGrad)" />
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
      )}

      {/* INGREDIENTS TAB */}
      {tab === 'ingredients' && profile && (
        <Panel icon={Heart} title="Ingredients & Skincare" desc="Skin match and formula details" tone="pink">
          <div className="p-5 space-y-5">
            {(profile.sizeMl || profile.sizeGrams || profile.sizeDisplay) && (
              <SpecRow label="Size" value={profile.sizeDisplay || `${profile.sizeMl || profile.sizeGrams} ${profile.sizeMl ? 'ml' : 'g'}`} />
            )}

            {profile.skinType?.length > 0 && (
              <div>
                <Lbl>Recommended Skin Types</Lbl>
                <div className="flex flex-wrap gap-1.5">
                  {profile.skinType.map((s) => (
                    <span key={s} className="px-2.5 py-1 rounded-lg bg-violet-100 text-violet-800 text-xs font-extrabold">{s.replace('_', ' ')}</span>
                  ))}
                </div>
              </div>
            )}

            {profile.skinTone?.length > 0 && (
              <div>
                <Lbl>Skin Tone Match</Lbl>
                <div className="flex flex-wrap gap-1.5">
                  {profile.skinTone.map((s) => (
                    <span key={s} className="px-2.5 py-1 rounded-lg bg-pink-100 text-pink-800 text-xs font-extrabold">{s}</span>
                  ))}
                </div>
              </div>
            )}

            {profile.skinConcerns?.length > 0 && (
              <div>
                <Lbl>Targets These Concerns</Lbl>
                <div className="flex flex-wrap gap-1.5">
                  {profile.skinConcerns.map((c) => (
                    <span key={c} className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 text-xs font-extrabold">{c}</span>
                  ))}
                </div>
              </div>
            )}

            {profile.keyIngredients?.length > 0 && (
              <div>
                <Lbl>Key Ingredients (Actives)</Lbl>
                <div className="flex flex-wrap gap-1.5">
                  {profile.keyIngredients.map((i) => (
                    <span key={i} className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-extrabold">{i}</span>
                  ))}
                </div>
              </div>
            )}

            {profile.spfRating && (
              <SpecRow label="SPF Rating" value={profile.spfRating} />
            )}

            {profile.benefits?.length > 0 && (
              <div>
                <Lbl>Key Benefits</Lbl>
                <div className="flex flex-wrap gap-1.5">
                  {profile.benefits.map((b) => (
                    <span key={b} className="px-2.5 py-1 rounded-lg bg-pink-50 border border-pink-200 text-pink-800 text-xs font-extrabold">{b}</span>
                  ))}
                </div>
              </div>
            )}

            {profile.howToUse && (
              <div className="rounded-2xl bg-sky-50 border-2 border-sky-200 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="h-5 w-5 text-sky-700" />
                  <h4 className="font-extrabold text-sky-900">How to Use</h4>
                </div>
                <p className="text-sm text-sky-800 font-semibold whitespace-pre-line">{profile.howToUse}</p>
              </div>
            )}

            {profile.fullIngredients && (
              <div>
                <Lbl>Full INCI List</Lbl>
                <div className="rounded-xl bg-slate-50 border-2 border-slate-200 p-3">
                  <p className="text-xs text-slate-700 font-mono leading-relaxed">{profile.fullIngredients}</p>
                </div>
              </div>
            )}

            {profile.warnings && (
              <div className="rounded-2xl bg-amber-50 border-2 border-amber-200 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-5 w-5 text-amber-700" />
                  <h4 className="font-extrabold text-amber-900">Warnings & Precautions</h4>
                </div>
                <p className="text-sm text-amber-800 font-semibold whitespace-pre-line">{profile.warnings}</p>
              </div>
            )}
          </div>
        </Panel>
      )}

      {/* FRAGRANCE TAB */}
      {tab === 'fragrance' && profile && (
        <Panel icon={Wind} title="Fragrance Notes" desc="Family, pyramid, and character" tone="violet">
          <div className="p-5 space-y-4">
            {profile.fragranceFamily && (
              <div className="rounded-2xl bg-violet-50 border-2 border-violet-200 p-4 text-center">
                <div className="text-[10px] uppercase font-extrabold text-violet-700">Family</div>
                <div className="text-2xl font-extrabold text-violet-900">{profile.fragranceFamily}</div>
              </div>
            )}

            {profile.topNotes?.length > 0 && (
              <div className="rounded-2xl bg-amber-50 border-2 border-amber-200 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">☀️</span>
                  <div>
                    <h4 className="font-extrabold text-amber-900">Top Notes</h4>
                    <p className="text-[10px] font-bold text-amber-700">First 15 minutes</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {profile.topNotes.map((n) => (
                    <span key={n} className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 text-xs font-extrabold border border-amber-300">{n}</span>
                  ))}
                </div>
              </div>
            )}

            {profile.middleNotes?.length > 0 && (
              <div className="rounded-2xl bg-pink-50 border-2 border-pink-200 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">🌸</span>
                  <div>
                    <h4 className="font-extrabold text-pink-900">Middle / Heart Notes</h4>
                    <p className="text-[10px] font-bold text-pink-700">1 to 4 hours</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {profile.middleNotes.map((n) => (
                    <span key={n} className="px-2.5 py-1 rounded-lg bg-pink-100 text-pink-900 text-xs font-extrabold border border-pink-300">{n}</span>
                  ))}
                </div>
              </div>
            )}

            {profile.baseNotes?.length > 0 && (
              <div className="rounded-2xl bg-orange-50 border-2 border-orange-200 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">🌳</span>
                  <div>
                    <h4 className="font-extrabold text-orange-900">Base Notes</h4>
                    <p className="text-[10px] font-bold text-orange-700">4+ hours, dry-down</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {profile.baseNotes.map((n) => (
                    <span key={n} className="px-2.5 py-1 rounded-lg bg-orange-100 text-orange-900 text-xs font-extrabold border border-orange-300">{n}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-3">
              {profile.longevityHours && (
                <div className="rounded-xl bg-slate-50 border-2 border-slate-200 p-3">
                  <div className="text-[10px] uppercase font-extrabold text-slate-600 flex items-center gap-1"><Clock className="h-3 w-3" /> Longevity</div>
                  <div className="text-lg font-extrabold text-slate-900">{profile.longevityHours}</div>
                </div>
              )}
              {profile.sillage && (
                <div className="rounded-xl bg-slate-50 border-2 border-slate-200 p-3">
                  <div className="text-[10px] uppercase font-extrabold text-slate-600">Sillage / Projection</div>
                  <div className="text-lg font-extrabold text-slate-900">{profile.sillage}</div>
                </div>
              )}
            </div>

            {profile.season?.length > 0 && (
              <div>
                <Lbl>Best Seasons</Lbl>
                <div className="flex flex-wrap gap-1.5">
                  {profile.season.map((s) => (
                    <span key={s} className="px-2.5 py-1 rounded-lg bg-sky-100 text-sky-800 text-xs font-extrabold">{s}</span>
                  ))}
                </div>
              </div>
            )}

            {profile.occasion?.length > 0 && (
              <div>
                <Lbl>Best Occasions</Lbl>
                <div className="flex flex-wrap gap-1.5">
                  {profile.occasion.map((o) => (
                    <span key={o} className="px-2.5 py-1 rounded-lg bg-pink-100 text-pink-800 text-xs font-extrabold">{o}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Panel>
      )}

      {/* CERTIFICATIONS TAB */}
      {tab === 'certifications' && profile && (
        <Panel icon={Award} title="Certifications & Claims" desc="Product safety and ethical labels" tone="emerald">
          <div className="p-5 grid sm:grid-cols-2 gap-3">
            <CertRow active={profile.isHalalCertified} emoji="🕌" label="Halal Certified" desc="Certified halal for Muslim consumers" />
            <CertRow active={profile.isCrueltyFree} emoji="🐰" label="Cruelty-Free" desc="Not tested on animals" />
            <CertRow active={profile.isVegan} emoji="🌱" label="Vegan" desc="No animal-derived ingredients" />
            <CertRow active={profile.isOrganic} emoji="🌿" label="Organic" desc="Certified organic ingredients" />
            <CertRow active={profile.isHypoallergenic} emoji="🛡️" label="Hypoallergenic" desc="Minimal allergy risk" />
            <CertRow active={profile.isFragranceFree} emoji="🚫" label="Fragrance-Free" desc="No added fragrance" />
            <CertRow active={profile.isSulfateFree} emoji="💧" label="Sulfate-Free" desc="No SLS/SLES" />
            <CertRow active={profile.isParabenFree} emoji="✅" label="Paraben-Free" desc="No parabens" />
            <CertRow active={profile.isNoncomedogenic} emoji="💠" label="Non-Comedogenic" desc="Won't clog pores" />
            <CertRow active={profile.isDermatologistTested} emoji="👨‍⚕️" label="Dermatologist Tested" desc="Skin doctor approved" />
          </div>
        </Panel>
      )}

      {/* BATCHES TAB */}
      {tab === 'batches' && (
        <Panel icon={Package} title="Batch Tracking" desc={`${stats.batchCount} batches • ${stats.expiredBatches} expired`} tone="amber"
          empty={batches.length === 0} emptyText="No batches recorded"
          emptyAction={<Link to="/cosmetics/batches"><Button className="bg-amber-600">Add Batch</Button></Link>}>
          <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
            {(batches as any[]).map((b) => {
              const now = new Date();
              const expDate = b.expiryDate ? new Date(b.expiryDate) : null;
              const isExpired = expDate && expDate < now;
              const daysToExpiry = expDate ? Math.ceil((expDate.getTime() - now.getTime()) / 86400000) : null;
              return (
                <div key={b.id} className={`px-5 py-3 flex items-center gap-3 ${isExpired ? 'bg-rose-50/40' : ''}`}>
                  <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${isExpired ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                    <Package className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-mono font-extrabold text-slate-900">{b.batchNumber}</div>
                    <div className="text-[10px] text-slate-500 font-bold">
                      {b.currentStock} / {b.quantity} units
                      {b.manufactureDate && ` • Mfg ${new Date(b.manufactureDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: '2-digit' })}`}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {expDate && (
                      <>
                        <div className={`text-sm font-extrabold tabular-nums ${isExpired ? 'text-rose-700' : daysToExpiry! <= 30 ? 'text-amber-700' : 'text-slate-700'}`}>
                          {isExpired ? 'EXPIRED' : `${daysToExpiry} days`}
                        </div>
                        <div className="text-[10px] font-bold text-slate-500">
                          {expDate.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: '2-digit' })}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      {/* SHADES TAB */}
      {tab === 'shades' && (
        <Panel icon={Palette} title="Shades / Sizes" desc={`${stats.variantCount} variants`} tone="pink">
          <div className="p-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(variants as any[]).map((v) => {
              const vStock = Number(v.stock || 0);
              const vLow = vStock > 0 && vStock <= Number(v.lowStockAlert ?? 3);
              return (
                <div key={v.id} className={`rounded-2xl border-2 p-3 ${vStock <= 0 ? 'border-rose-200 bg-rose-50/40' : vLow ? 'border-amber-200 bg-amber-50/40' : 'border-slate-200 bg-white'}`}>
                  <div className="flex items-center gap-2">
                    {v.imageUrl ? (
                      <img src={v.imageUrl} alt="" className="h-10 w-10 rounded-lg object-cover" />
                    ) : (
                      <div className="h-10 w-10 rounded-lg bg-pink-100 flex items-center justify-center">
                        <Palette className="h-5 w-5 text-pink-700" />
                      </div>
                    )}
                    <div className="font-extrabold text-slate-900 text-sm truncate flex-1">{v.name}</div>
                  </div>
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

      {/* SALES TAB */}
      {tab === 'sales' && (
        <Panel icon={Receipt} title="Sales History" desc={`${soldLines.length} lines • ${stats.totalSold} units sold`} tone="emerald"
          empty={soldLines.length === 0} emptyText="No sales yet">
          <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
            {soldLines.slice(0, 30).map((it: any) => (
              <Link key={it.id || it.sale.id} to={`/sales/${it.sale.id}/receipt`} className="block px-5 py-3 hover:bg-emerald-50/40 transition">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-extrabold text-sm">{it.sale.saleNumber}</span>
                      <span className="text-[10px] text-slate-500 font-bold">
                        {new Date(it.sale.soldAt).toLocaleDateString('en-PK', { day: '2-digit', month: 'short' })}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 font-semibold mt-0.5">
                      {it.sale.customer?.name || 'Walk-in'} • Qty {it.quantity}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-extrabold text-emerald-700 tabular-nums">{formatPKRFull(it.total)}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}

function HeroStat({ icon: Icon, label, value, sub, tone }: any) {
  const tones: Record<string, string> = {
    emerald: 'from-emerald-400/30 to-emerald-600/20 border-emerald-300/40',
    pink: 'from-pink-400/30 to-pink-600/20 border-pink-300/40',
    violet: 'from-violet-400/30 to-violet-600/20 border-violet-300/40',
    teal: 'from-teal-400/30 to-teal-600/20 border-teal-300/40',
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

function CertBadge({ emoji, label }: { emoji: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/30 backdrop-blur px-2 py-0.5 text-[10px] font-extrabold border border-emerald-300/40">
      {emoji} {label}
    </span>
  );
}

function CertRow({ active, emoji, label, desc }: any) {
  return (
    <div className={`rounded-xl border-2 p-3 flex items-center gap-3 ${active ? 'bg-emerald-50 border-emerald-300' : 'bg-slate-50 border-slate-200 opacity-50'}`}>
      <span className="text-2xl shrink-0">{emoji}</span>
      <div className="flex-1 min-w-0">
        <div className={`font-extrabold text-sm ${active ? 'text-emerald-900' : 'text-slate-500'}`}>{label}</div>
        <div className={`text-[10px] font-bold ${active ? 'text-emerald-700' : 'text-slate-400'}`}>{desc}</div>
      </div>
      {active ? <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" /> : <XCircle className="h-5 w-5 text-slate-300 shrink-0" />}
    </div>
  );
}

function Panel({ icon: Icon, title, desc, tone, children, empty, emptyText, emptyAction }: any) {
  const tones: Record<string, string> = {
    pink: 'from-pink-500 to-rose-700',
    violet: 'from-violet-500 to-purple-700',
    emerald: 'from-emerald-500 to-teal-700',
    amber: 'from-amber-500 to-orange-700',
  };
  return (
    <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b-2 border-slate-100 flex items-center gap-3">
        <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-md`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-extrabold text-slate-900 text-lg">{title}</h3>
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

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100">
      <span className="text-slate-600 font-semibold">{label}</span>
      <span className="font-extrabold text-slate-900">{value}</span>
    </div>
  );
}

function Lbl({ children }: any) {
  return <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">{children}</label>;
}
