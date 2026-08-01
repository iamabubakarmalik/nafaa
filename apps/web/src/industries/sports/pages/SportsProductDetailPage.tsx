import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Edit3, Boxes, Package, PackageX, DollarSign, TrendingUp,
  Star, ChevronRight, Dumbbell, Receipt, ShoppingCart, Hash,
  Tag, Trash2, AlertTriangle, History, Sparkles, BarChart3, Info,
  Plus, Users, Shield, Award, Trophy, CheckCircle2, XCircle,
  Palette, FileText,
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { toast } from 'sonner';
import { Button } from '@core/ui/Button';
import { formatPKR, formatPKRFull } from '@core/lib/format';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { productVariantsApi } from '@modules/inventory/products/api/product-variants.api';
import { productImagesApi } from '@modules/inventory/products/api/product-images.api';
import { salesApi } from '@modules/sales/sales/api/sales.api';
import { stockMovementsApi } from '@modules/inventory/stock-movements/api/stock-movements.api';
import { sportsProductsApi } from '../api/products.api';
import { sportsBrandsApi } from '../api/brands.api';
import { PrivacyToggle, useCostHidden } from '@core/ui/HiddenValue';

type Tab = 'overview' | 'specs' | 'team' | 'variants' | 'sales' | 'log';

export default function SportsProductDetailPage() {
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
    queryKey: ['sports-profile', id],
    queryFn: () => sportsProductsApi.byProduct(id!),
    enabled: !!id,
  });

  const { data: brand } = useQuery({
    queryKey: ['sports-brand', profile?.brandId],
    queryFn: () => sportsBrandsApi.getOne(profile!.brandId!),
    enabled: !!profile?.brandId,
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
    const alert = Number(product?.lowStockAlert ?? 3);
    const totalSold = soldLines.reduce((a, it) => a + Number(it.quantity || 0), 0);
    const totalRevenue = soldLines.reduce((a, it) => a + Number(it.total || 0), 0);
    const totalCogs = soldLines.reduce((a, it) => a + Number(it.costPrice || 0) * Number(it.quantity || 0), 0);
    const orders = new Set(soldLines.map((it) => it.sale.id)).size;
    const cutoff = Date.now() - 30 * 86400000;
    const sold30 = soldLines.filter((it) => new Date(it.sale.soldAt).getTime() >= cutoff)
      .reduce((a, it) => a + Number(it.quantity || 0), 0);
    const perDay = sold30 / 30;
    return {
      stock, price, cost, alert,
      isOut: stock <= 0, isLow: stock > 0 && stock <= alert,
      stockValue: stock * price, stockCost: stock * cost,
      margin: price > 0 ? ((price - cost) / price) * 100 : 0,
      profitPerUnit: price - cost,
      totalSold, totalRevenue, totalProfit: totalRevenue - totalCogs, orders,
      variantCount: (variants as any[]).length,
      variantStock: (variants as any[]).reduce((a, v) => a + Number(v.stock || 0), 0),
      sold30, perDay,
      daysLeft: perDay > 0 ? Math.floor(stock / perDay) : null,
    };
  }, [product, soldLines, variants]);

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
      toast.success(data?.softDeleted ? 'Product deactivated' : 'Product deleted');
      qc.invalidateQueries({ queryKey: ['sports-products-list'] });
      navigate('/sports-products');
    },
  });

  if (isLoading || !product) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-12 w-12 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin" />
      </div>
    );
  }

  const gallery: any[] = (images as any[]).length ? (images as any[]) : (product.images ?? []);

  const TABS: { id: Tab; label: string; count?: number; icon: any; hidden?: boolean }[] = [
    { id: 'overview', label: 'Overview', icon: Info },
    { id: 'specs', label: 'Specs', icon: Sparkles },
    { id: 'team', label: 'Team & Warranty', icon: Users, hidden: !profile?.isTeamOrderable && !profile?.warrantyMonths },
    { id: 'variants', label: 'Variants', count: stats.variantCount, icon: Boxes },
    { id: 'sales', label: 'Sales', count: salesForProduct.length, icon: Receipt },
    { id: 'log', label: 'Stock Log', count: movements.length, icon: History },
  ];

  return (
    <div className="space-y-5 pb-10">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button onClick={() => navigate('/sports-products')} className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-emerald-600 font-bold">
          <ArrowLeft className="h-4 w-4" /> All Products
        </button>
        <div className="flex items-center gap-2 flex-wrap">
          <Link to={`/sports-products/${id}/edit`} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 border-2 border-emerald-200 hover:bg-emerald-100 text-emerald-700 text-sm font-extrabold">
            <Edit3 className="h-4 w-4" /> Edit
          </Link>
          <Link to="/pos" className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border-2 border-slate-200 hover:border-emerald-300 text-slate-700 text-sm font-extrabold">
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
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-900 to-teal-700 text-white shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="relative grid lg:grid-cols-[280px_1fr] gap-6 p-6">
          <div className="space-y-2">
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-white/10 backdrop-blur border-2 border-white/20">
              {gallery[imgIndex]?.url ? (
                <img src={gallery[imgIndex].url} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/50"><Dumbbell className="h-16 w-16" /></div>
              )}
              {profile?.isProfessional && (
                <div className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-blue-500 text-white text-[10px] font-extrabold shadow-lg inline-flex items-center gap-1">
                  <Trophy className="h-3 w-3" /> PRO GRADE
                </div>
              )}
              {profile?.isFeatured && !profile?.isProfessional && (
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
              {profile?.isTeamOrderable && (
                <div className="absolute bottom-3 left-3 px-2 py-1 rounded-lg bg-violet-600 text-white text-[10px] font-extrabold shadow-lg inline-flex items-center gap-1">
                  <Users className="h-3 w-3" /> TEAM
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
              <Dumbbell className="h-3.5 w-3.5 text-amber-300" /> Sports
              {profile?.sport && (<><span className="text-white/40">•</span><span>{profile.sport}</span></>)}
              {brand && (<><span className="text-white/40">•</span><span>{brand.name}</span></>)}
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">{product.name}</h1>
            {product.description && (
              <p className="mt-2 text-sm text-white/85 max-w-2xl line-clamp-2">{product.description}</p>
            )}

            <div className="mt-3 flex items-center gap-2 flex-wrap text-xs">
              {product.sku && <Chip icon={Hash}>SKU: {product.sku}</Chip>}
              {product.barcode && <Chip icon={Hash}>{product.barcode}</Chip>}
              {profile?.categoryType && <Chip icon={Tag}>{profile.categoryType.replace(/_/g, ' ')}</Chip>}
              {profile?.ageGroup && profile.ageGroup !== 'UNIVERSAL' && <Chip icon={Users}>{profile.ageGroup}</Chip>}
              {profile?.color && (
                <Chip icon={Palette} tone="violet">
                  {profile.colorHex && <span className="h-2.5 w-2.5 rounded-full inline-block mr-1" style={{ backgroundColor: profile.colorHex }} />}
                  {profile.color}
                </Chip>
              )}
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
              {profile?.teamPrice ? (
                <div>
                  <div className="text-[10px] uppercase font-extrabold text-white/70 tracking-wider">Team Price</div>
                  <div className="text-xl font-extrabold tabular-nums text-emerald-300 leading-none mt-1">{formatPKRFull(profile.teamPrice)}</div>
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
              <HeroStat icon={Package} label="Stock" value={String(stats.stock)} sub="pieces" tone={stats.isOut ? 'rose' : stats.isLow ? 'amber' : 'blue'} />
              <HeroStat icon={DollarSign} label="Stock Value" value={formatPKR(stats.stockValue)} sub={hideCost ? '•••' : `cost ${formatPKR(stats.stockCost)}`} tone="emerald" />
              <HeroStat icon={TrendingUp} label="Total Sold" value={String(stats.totalSold)} sub={`${stats.orders} orders`} tone="violet" />
              <HeroStat icon={Boxes} label="Variants" value={String(stats.variantCount)} sub={`${stats.variantStock} in stock`} tone="amber" />
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
              {stats.isOut ? 'Out of stock' : `Only ${stats.stock} pieces left`}
            </h3>
            <p className="text-xs font-semibold opacity-90 mt-0.5">
              {stats.daysLeft !== null ? `30-day avg ${stats.perDay.toFixed(1)}/day — approx ${stats.daysLeft} days of stock` : `Alert threshold: ${stats.alert}`}
            </p>
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
                  active ? 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}>
                <Icon className="h-4 w-4" />
                {t.label}
                {t.count !== undefined && (
                  <span className={`px-1.5 rounded-full text-[10px] font-extrabold ${active ? 'bg-white/25' : 'bg-slate-200 text-slate-700'}`}>{t.count}</span>
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
                  {stats.sold30} pcs sold • avg {stats.perDay.toFixed(1)}/day
                </p>
              </div>
            </div>
            {chartData.some((d) => d.revenue > 0) ? (
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="sportsDetailGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="label" stroke="#64748b" fontSize={10} interval={4} />
                    <YAxis stroke="#64748b" fontSize={10} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: any) => formatPKR(Number(v))} contentStyle={{ borderRadius: 12, border: '2px solid #e2e8f0' }} />
                    <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#10b981" strokeWidth={2.5} fill="url(#sportsDetailGrad)" />
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

          {product.description && (
            <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-slate-500 to-slate-700 text-white flex items-center justify-center shadow-md">
                  <FileText className="h-5 w-5" />
                </div>
                <h3 className="font-extrabold text-slate-900">Description</h3>
              </div>
              <p className="text-sm text-slate-700 font-semibold whitespace-pre-line">{product.description}</p>
            </section>
          )}

          {profile?.careInstructions && (
            <section className="rounded-3xl bg-blue-50 border-2 border-blue-200 shadow-sm p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-700 text-white flex items-center justify-center shadow-md">
                  <Shield className="h-5 w-5" />
                </div>
                <h3 className="font-extrabold text-blue-900">Care Instructions</h3>
              </div>
              <p className="text-sm text-blue-900 font-semibold whitespace-pre-line">{profile.careInstructions}</p>
            </section>
          )}
        </div>
      )}

      {/* SPECS */}
      {tab === 'specs' && (
        <Panel icon={Sparkles} title="Product Specifications" desc="Category-specific details" tone="emerald"
          empty={!profile} emptyText="No specs added yet">
          {profile && (
            <div className="p-5 space-y-5">
              {(profile.batWood || profile.batGrade || profile.batSize || profile.handleType || profile.batWeightGrams) && (
                <SpecSection icon={Award} title="Cricket Bat Specs" tone="emerald">
                  {profile.batWood && <SpecRow label="Wood" value={profile.batWood} />}
                  {profile.batGrade && <SpecRow label="Grade" value={profile.batGrade} />}
                  {profile.batSize && <SpecRow label="Size" value={profile.batSize} />}
                  {profile.batWeightGrams && <SpecRow label="Weight" value={`${profile.batWeightGrams} grams`} />}
                  {profile.handleType && <SpecRow label="Handle" value={profile.handleType} />}
                </SpecSection>
              )}

              {(profile.ballType || profile.ballWeight || profile.ballMaterial) && (
                <SpecSection icon={Sparkles} title="Ball Specs" tone="blue">
                  {profile.ballType && <SpecRow label="Type" value={profile.ballType} />}
                  {profile.ballWeight && <SpecRow label="Weight" value={profile.ballWeight} />}
                  {profile.ballCircumference && <SpecRow label="Circumference" value={profile.ballCircumference} />}
                  {profile.ballMaterial && <SpecRow label="Material" value={profile.ballMaterial} />}
                </SpecSection>
              )}

              {(profile.size || profile.material || profile.fit) && (
                <SpecSection icon={Tag} title="Apparel Specs" tone="violet">
                  {profile.size && <SpecRow label="Size" value={profile.size} />}
                  {profile.material && <SpecRow label="Material" value={profile.material} />}
                  {profile.fit && <SpecRow label="Fit" value={profile.fit} />}
                  {profile.hasCustomization && <SpecRow label="Customization" value="✓ Name & Number Printing Available" />}
                </SpecSection>
              )}

              {(profile.shoeSize || profile.soleType) && (
                <SpecSection icon={Package} title="Shoe Specs" tone="amber">
                  {profile.shoeSize && <SpecRow label="Size (UK)" value={profile.shoeSize} />}
                  {profile.soleType && <SpecRow label="Sole" value={profile.soleType} />}
                  {profile.studType && <SpecRow label="Stud Type" value={profile.studType} />}
                </SpecSection>
              )}

              {(profile.weight || profile.dimensions || profile.powerRating) && (
                <SpecSection icon={Dumbbell} title="Gym Equipment Specs" tone="rose">
                  {profile.weight && <SpecRow label="Weight" value={profile.weight} />}
                  {profile.maxUserWeight && <SpecRow label="Max User Weight" value={profile.maxUserWeight} />}
                  {profile.dimensions && <SpecRow label="Dimensions" value={profile.dimensions} />}
                  {profile.powerRating && <SpecRow label="Power" value={profile.powerRating} />}
                  {profile.motorType && <SpecRow label="Motor" value={profile.motorType} />}
                  {profile.material2 && <SpecRow label="Material" value={profile.material2} />}
                  {profile.foldable && <SpecRow label="Foldable" value="✓ Yes — space-saving" />}
                </SpecSection>
              )}

              {profile.certifications?.length > 0 && (
                <SpecSection icon={CheckCircle2} title="Certifications" tone="emerald">
                  <div className="flex flex-wrap gap-2">
                    {profile.certifications.map((c) => (
                      <span key={c} className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-extrabold">{c}</span>
                    ))}
                  </div>
                </SpecSection>
              )}

              {(profile.countryOfMake || profile.ageGroup || profile.genderTarget) && (
                <SpecSection icon={Info} title="Additional Info" tone="slate">
                  {profile.countryOfMake && <SpecRow label="Made in" value={profile.countryOfMake} />}
                  {profile.ageGroup && <SpecRow label="Age Group" value={profile.ageGroup} />}
                  {profile.genderTarget && <SpecRow label="Target" value={profile.genderTarget} />}
                </SpecSection>
              )}
            </div>
          )}
        </Panel>
      )}

      {/* TEAM & WARRANTY */}
      {tab === 'team' && (
        <div className="space-y-4">
          {profile?.isTeamOrderable && (
            <Panel icon={Users} title="Team Order Settings" desc="Bulk order configuration" tone="emerald">
              <div className="p-5 space-y-4">
                <div className="grid sm:grid-cols-3 gap-3">
                  <InfoBox label="Min Team Order" value={`${profile.minTeamOrder || '—'} pcs`} tone="emerald" />
                  <InfoBox label="Bulk Discount" value={`${profile.bulkDiscountPct || 0}%`} tone="amber" />
                  <InfoBox label="Team Price" value={profile.teamPrice ? formatPKRFull(profile.teamPrice) : '—'} tone="blue" />
                </div>

                {profile.customizationOptions?.length > 0 && (
                  <div>
                    <div className="text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-2">Available Customizations</div>
                    <div className="flex flex-wrap gap-2">
                      {profile.customizationOptions.map((o) => (
                        <span key={o} className="px-3 py-1.5 rounded-lg bg-violet-100 text-violet-800 text-xs font-extrabold border-2 border-violet-200">
                          {o}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Panel>
          )}

          {profile?.warrantyMonths ? (
            <Panel icon={Shield} title="Warranty" desc="Product warranty coverage" tone="blue">
              <div className="p-5">
                <div className="grid sm:grid-cols-2 gap-3">
                  <InfoBox label="Duration" value={`${profile.warrantyMonths} months`} tone="blue" />
                  {profile.warrantyType && <InfoBox label="Type" value={profile.warrantyType} tone="violet" />}
                </div>
              </div>
            </Panel>
          ) : null}
        </div>
      )}

      {/* VARIANTS */}
      {tab === 'variants' && (
        <Panel icon={Boxes} title="Variants" desc={`${stats.variantCount} variants • total ${stats.variantStock} pcs`} tone="violet"
          empty={(variants as any[]).length === 0}
          emptyText="Single SKU product"
          emptyAction={<Link to={`/sports-products/${id}/edit`}><Button variant="secondary"><Plus className="h-4 w-4" /> Add Variants</Button></Link>}>
          <div className="p-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(variants as any[]).map((v) => {
              const vStock = Number(v.stock || 0);
              const vLow = vStock > 0 && vStock <= Number(v.lowStockAlert ?? 3);
              return (
                <div key={v.id} className={`rounded-2xl border-2 p-3 ${vStock <= 0 ? 'border-rose-200 bg-rose-50/40' : vLow ? 'border-amber-200 bg-amber-50/40' : 'border-slate-200 bg-white'}`}>
                  <div className="font-extrabold text-slate-900 text-sm truncate">{v.name}</div>
                  <div className="text-[10px] font-mono text-slate-500 mt-0.5">{v.sku || v.barcode || '—'}</div>
                  <div className="mt-2 flex items-end justify-between">
                    <div className="text-base font-extrabold text-emerald-700 tabular-nums">{formatPKRFull(v.price)}</div>
                    <div className={`text-sm font-extrabold tabular-nums ${vStock <= 0 ? 'text-rose-700' : vLow ? 'text-amber-700' : 'text-slate-700'}`}>
                      {vStock} <span className="text-[10px] font-bold text-slate-500">pcs</span>
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
                <Link key={s.id} to={`/sales/${s.id}/receipt`} className="block px-5 py-3 hover:bg-emerald-50/40 transition">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-extrabold text-sm text-slate-900">{s.saleNumber}</span>
                        <span className="text-[10px] text-slate-500 font-bold">
                          {new Date(s.soldAt).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 font-semibold mt-0.5">
                        {s.customer?.name || 'Walk-in'} • {qty} pcs
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
                    {isIn && qty > 0 ? '+' : ''}{qty} <span className="text-[10px] font-bold text-slate-500">pcs</span>
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

function Panel({ icon: Icon, title, desc, tone, children, empty, emptyText, emptyAction }: any) {
  const tones: Record<string, string> = {
    emerald: 'from-emerald-500 to-teal-700',
    violet: 'from-violet-500 to-purple-700',
    blue: 'from-blue-500 to-cyan-700',
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

function SpecSection({ icon: Icon, title, tone, children }: any) {
  const tones: Record<string, string> = {
    emerald: 'from-emerald-500 to-teal-700 bg-emerald-50 border-emerald-200',
    blue: 'from-blue-500 to-cyan-700 bg-blue-50 border-blue-200',
    violet: 'from-violet-500 to-purple-700 bg-violet-50 border-violet-200',
    amber: 'from-amber-500 to-orange-600 bg-amber-50 border-amber-200',
    rose: 'from-rose-500 to-red-700 bg-rose-50 border-rose-200',
    slate: 'from-slate-500 to-slate-700 bg-slate-50 border-slate-200',
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
    blue: 'bg-blue-50 border-blue-200 text-blue-800',
    violet: 'bg-violet-50 border-violet-200 text-violet-800',
    amber: 'bg-amber-50 border-amber-200 text-amber-800',
  };
  return (
    <div className={`rounded-xl border-2 p-3 ${tones[tone]}`}>
      <div className="text-[10px] uppercase font-extrabold opacity-75">{label}</div>
      <div className="text-lg font-extrabold mt-0.5">{value}</div>
    </div>
  );
}
