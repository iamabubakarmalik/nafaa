import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Edit3, Boxes, Package, PackageX, DollarSign, TrendingUp,
  Star, ChevronRight, Gamepad2, Wifi, Receipt, ShoppingCart, Hash,
  Tag, Trash2, Calendar, AlertTriangle, History, Sparkles,
  BarChart3, Info, Plus, Timer, Award, HardDrive, Cpu, Monitor,
  Users, Globe, Video, Rocket, Package as PackageIcon,
  CheckCircle2, XCircle, ExternalLink, Play,
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
import { gamingProductsApi } from '../api/products.api';
import { gamingRentalsApi } from '../api/rentals.api';
import { PrivacyToggle, useCostHidden } from '@core/ui/HiddenValue';

type Tab = 'overview' | 'details' | 'rental' | 'editions' | 'sales' | 'rentals' | 'log';

export default function GamingProductDetailPage() {
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
    queryKey: ['gaming-profile', id],
    queryFn: () => gamingProductsApi.byProduct(id!),
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

  const { data: rentalHistory = [] } = useQuery({
    queryKey: ['product-rentals', id],
    queryFn: () => gamingRentalsApi.list({ search: product?.name }),
    enabled: !!product && profile?.isRentable,
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
    const sold30 = soldLines
      .filter((it) => new Date(it.sale.soldAt).getTime() >= cutoff)
      .reduce((a, it) => a + Number(it.quantity || 0), 0);
    const perDay = sold30 / 30;
    const daysLeft = perDay > 0 ? Math.floor(stock / perDay) : null;

    return {
      stock, price, cost, alert,
      isOut: stock <= 0,
      isLow: stock > 0 && stock <= alert,
      stockValue: stock * price,
      stockCost: stock * cost,
      margin: price > 0 ? ((price - cost) / price) * 100 : 0,
      profitPerUnit: price - cost,
      totalSold, totalRevenue, totalProfit: totalRevenue - totalCogs, orders,
      variantCount: (variants as any[]).length,
      variantStock: (variants as any[]).reduce((a, v) => a + Number(v.stock || 0), 0),
      sold30, perDay, daysLeft,
      totalRented: (rentalHistory as any[]).length,
      activeRentals: (rentalHistory as any[]).filter((r) => r.status === 'ACTIVE' || r.status === 'OVERDUE').length,
    };
  }, [product, soldLines, variants, rentalHistory]);

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
      qc.invalidateQueries({ queryKey: ['gaming-products-list'] });
      navigate('/gaming-products');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Delete failed'),
  });

  if (isLoading || !product) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-12 w-12 rounded-full border-4 border-violet-200 border-t-violet-600 animate-spin" />
      </div>
    );
  }

  const gallery: any[] = (images as any[]).length ? (images as any[]) : (product.images ?? []);
  if (profile?.screenshots?.length && !gallery.length) {
    profile.screenshots.forEach((url: string) => gallery.push({ url }));
  }

  const TABS: { id: Tab; label: string; count?: number; icon: any; hidden?: boolean }[] = [
    { id: 'overview', label: 'Overview', icon: Info },
    { id: 'details', label: 'Details', icon: Sparkles },
    { id: 'rental', label: 'Rental Info', icon: Timer, hidden: !profile?.isRentable && !profile?.isPreOrder },
    { id: 'editions', label: 'Editions', count: stats.variantCount, icon: Boxes },
    { id: 'sales', label: 'Sales', count: salesForProduct.length, icon: Receipt },
    { id: 'rentals', label: 'Rental History', count: stats.totalRented, icon: PackageIcon, hidden: !profile?.isRentable },
    { id: 'log', label: 'Stock Log', count: movements.length, icon: History },
  ];

  return (
    <div className="space-y-5 pb-10">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button onClick={() => navigate('/gaming-products')} className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-violet-600 font-bold">
          <ArrowLeft className="h-4 w-4" /> All Products
        </button>
        <div className="flex items-center gap-2 flex-wrap">
          <Link to={`/gaming-products/${id}/edit`} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-violet-50 border-2 border-violet-200 hover:bg-violet-100 text-violet-700 text-sm font-extrabold">
            <Edit3 className="h-4 w-4" /> Edit
          </Link>
          <Link to="/pos" className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border-2 border-slate-200 hover:border-violet-300 text-slate-700 text-sm font-extrabold">
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
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-violet-900 to-fuchsia-700 text-white shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-fuchsia-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-violet-400/15 blur-3xl" />

        <div className="relative grid lg:grid-cols-[280px_1fr] gap-6 p-6">
          <div className="space-y-2">
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-white/10 backdrop-blur border-2 border-white/20">
              {gallery[imgIndex]?.url ? (
                <img src={gallery[imgIndex].url} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/50"><Gamepad2 className="h-16 w-16" /></div>
              )}
              {profile?.isPreOrder && (
                <div className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-amber-500 text-white text-[10px] font-extrabold shadow-lg inline-flex items-center gap-1">
                  <Rocket className="h-3 w-3" /> PRE-ORDER
                </div>
              )}
              {profile?.isFeatured && !profile?.isPreOrder && (
                <div className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-amber-500 text-white text-[10px] font-extrabold shadow-lg inline-flex items-center gap-1">
                  <Star className="h-3 w-3 fill-white" /> FEATURED
                </div>
              )}
              {profile?.isBestSeller && (
                <div className="absolute top-12 right-3 px-2 py-1 rounded-lg bg-orange-600 text-white text-[10px] font-extrabold shadow-lg inline-flex items-center gap-1">
                  <Award className="h-3 w-3 fill-white" /> BESTSELLER
                </div>
              )}
              {profile?.isNewRelease && (
                <div className="absolute top-3 left-3 px-2 py-1 rounded-lg bg-emerald-500 text-white text-[10px] font-extrabold shadow-lg">
                  🆕 NEW
                </div>
              )}
              {profile?.isRentable && (
                <div className="absolute bottom-3 left-3 px-2 py-1 rounded-lg bg-violet-600 text-white text-[10px] font-extrabold shadow-lg inline-flex items-center gap-1">
                  <Timer className="h-3 w-3" /> RENTABLE
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
              <Gamepad2 className="h-3.5 w-3.5 text-amber-300" /> Gaming
              {profile?.platform && (<><span className="text-white/40">•</span><span>{profile.platform.replace(/_/g, ' ')}</span></>)}
              {profile?.categoryType && (<><span className="text-white/40">•</span><span>{profile.categoryType.replace(/_/g, ' ')}</span></>)}
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">{product.name}</h1>
            {product.description && (
              <p className="mt-2 text-sm text-white/85 max-w-2xl line-clamp-2">{product.description}</p>
            )}

            <div className="mt-3 flex items-center gap-2 flex-wrap text-xs">
              {profile?.publisher && <Chip icon={Award}>{profile.publisher}</Chip>}
              {product.sku && <Chip icon={Hash}>SKU: {product.sku}</Chip>}
              {product.barcode && <Chip icon={Hash}>{product.barcode}</Chip>}
              {profile?.conditionType && profile.conditionType !== 'NEW_SEALED' && (
                <Chip icon={Tag} tone="amber">{profile.conditionType.replace(/_/g, ' ')}</Chip>
              )}
              {profile?.ageRating && <Chip icon={Users} tone="rose">{profile.ageRating}</Chip>}
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
              {profile?.usedPrice ? (
                <div>
                  <div className="text-[10px] uppercase font-extrabold text-white/70 tracking-wider">Pre-owned</div>
                  <div className="text-xl font-extrabold tabular-nums text-amber-300 leading-none mt-1">{formatPKRFull(profile.usedPrice)}</div>
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

            {profile?.isRentable && (
              <div className="mt-4 rounded-2xl bg-white/10 backdrop-blur border border-white/20 p-3">
                <div className="text-[10px] uppercase font-extrabold text-white/80 tracking-wider inline-flex items-center gap-1">
                  <Timer className="h-3 w-3" /> Rental rates
                </div>
                <div className="mt-1 flex items-center gap-4 flex-wrap">
                  {profile.rentalPricePerHour && (
                    <span className="text-lg font-extrabold text-white tabular-nums">{formatPKRFull(profile.rentalPricePerHour)}<span className="text-xs opacity-70">/hr</span></span>
                  )}
                  {profile.rentalPricePerDay && (
                    <span className="text-lg font-extrabold text-emerald-300 tabular-nums">{formatPKRFull(profile.rentalPricePerDay)}<span className="text-xs opacity-70">/day</span></span>
                  )}
                  {profile.rentalDeposit && (
                    <span className="text-sm font-extrabold text-amber-300">Deposit {formatPKRFull(profile.rentalDeposit)}</span>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
              <HeroStat icon={Package} label="Stock" value={String(stats.stock)} sub="units"
                tone={stats.isOut ? 'rose' : stats.isLow ? 'amber' : 'blue'} />
              <HeroStat icon={DollarSign} label="Stock Value" value={formatPKR(stats.stockValue)} sub={hideCost ? '•••' : `cost ${formatPKR(stats.stockCost)}`} tone="emerald" />
              <HeroStat icon={TrendingUp} label="Total Sold" value={String(stats.totalSold)} sub={`${stats.orders} orders`} tone="violet" />
              <HeroStat icon={Timer} label="Rented Out" value={String(stats.totalRented)} sub={`${stats.activeRentals} active`} tone="amber" />
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

      {profile?.isPreOrder && profile.preOrderReleaseDate && (
        <section className="rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 p-4 flex items-start gap-3">
          <div className="h-11 w-11 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-md">
            <Rocket className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-extrabold text-sm text-amber-900">Pre-order — releases on {new Date(profile.preOrderReleaseDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' })}</h3>
            <p className="text-xs font-semibold text-amber-800 mt-0.5">
              {(() => {
                const days = Math.ceil((new Date(profile.preOrderReleaseDate).getTime() - Date.now()) / 86400000);
                return days > 0 ? `${days} days to release` : 'Release date has passed — mark as released';
              })()}
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
                  active ? 'bg-gradient-to-br from-violet-600 to-fuchsia-700 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}>
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
                      <linearGradient id="gamingDetailGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="label" stroke="#64748b" fontSize={10} interval={4} />
                    <YAxis stroke="#64748b" fontSize={10} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: any) => formatPKR(Number(v))} contentStyle={{ borderRadius: 12, border: '2px solid #e2e8f0' }} />
                    <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#8b5cf6" strokeWidth={2.5} fill="url(#gamingDetailGrad)" />
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

          {profile?.trailerUrl && (
            <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-rose-500 to-red-700 text-white flex items-center justify-center shadow-md">
                  <Video className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900">Official Trailer</h3>
                  <p className="text-xs text-slate-500 font-semibold">Watch on YouTube</p>
                </div>
                <a href={profile.trailerUrl} target="_blank" rel="noreferrer"
                  className="ml-auto inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-700 text-xs font-extrabold">
                  <Play className="h-3 w-3" /> Watch <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </section>
          )}

          <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <QuickLink to="/gaming/rentals" icon={PackageIcon} title="Rentals" desc="All active" tone="violet" />
            <QuickLink to="/gaming/tournaments" icon={Award} title="Tournaments" desc="Events" tone="rose" />
            <QuickLink to="/gaming/cafe" icon={Timer} title="Cafe Live" desc="Sessions" tone="emerald" />
            <QuickLink to="/gaming/stations" icon={Monitor} title="Stations" desc="Manage" tone="blue" />
          </section>
        </div>
      )}

      {/* DETAILS */}
      {tab === 'details' && (
        <Panel icon={Sparkles} title="Product Details" desc="Genre, hardware, compatibility" tone="violet"
          empty={!profile} emptyText="No detail info yet"
          emptyAction={<Link to={`/gaming-products/${id}/edit`}><Button className="bg-violet-600"><Edit3 className="h-4 w-4" /> Add Details</Button></Link>}>
          {profile && (
            <div className="p-5 space-y-5">
              {(profile.publisher || profile.developer || profile.releaseDate || profile.gameFileSize) && (
                <SpecSection icon={Gamepad2} title="Game Info" tone="violet">
                  {profile.publisher && <SpecRow label="Publisher" value={profile.publisher} />}
                  {profile.developer && <SpecRow label="Developer" value={profile.developer} />}
                  {profile.releaseDate && <SpecRow label="Release Date" value={new Date(profile.releaseDate).toLocaleDateString('en-PK')} />}
                  {profile.gameFileSize && <SpecRow label="File Size" value={profile.gameFileSize} />}
                </SpecSection>
              )}

              {profile.genre?.length > 0 && (
                <SpecSection icon={Tag} title="Genres" tone="fuchsia">
                  <div className="flex flex-wrap gap-1.5">
                    {profile.genre.map((g) => (
                      <span key={g} className="px-2.5 py-1 rounded-lg bg-fuchsia-100 text-fuchsia-800 text-xs font-extrabold">{g}</span>
                    ))}
                  </div>
                </SpecSection>
              )}

              {(profile.playerCount || profile.ageRating || profile.onlineMultiplayer || profile.requiresInternet) && (
                <SpecSection icon={Users} title="Players & Rating" tone="amber">
                  {profile.playerCount && <SpecRow label="Players" value={profile.playerCount} />}
                  {profile.ageRating && <SpecRow label="Age Rating" value={profile.ageRating} />}
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <InfoBox label="Online Multiplayer" value={profile.onlineMultiplayer ? '✓ Yes' : '✗ No'} tone={profile.onlineMultiplayer ? 'emerald' : 'slate'} />
                    <InfoBox label="Always Online" value={profile.requiresInternet ? '✓ Yes' : '✗ No'} tone={profile.requiresInternet ? 'amber' : 'slate'} />
                  </div>
                </SpecSection>
              )}

              {(profile.region || profile.language?.length > 0) && (
                <SpecSection icon={Globe} title="Region & Language" tone="sky">
                  {profile.region && <SpecRow label="Region" value={profile.region} />}
                  {profile.language?.length > 0 && (
                    <div>
                      <div className="text-[10px] uppercase font-extrabold text-slate-500 mb-1.5">Languages</div>
                      <div className="flex flex-wrap gap-1.5">
                        {profile.language.map((l) => (
                          <span key={l} className="px-2.5 py-1 rounded-lg bg-sky-100 text-sky-800 text-xs font-extrabold">{l}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </SpecSection>
              )}

              {(profile.storageCapacity || profile.memoryRam || profile.processor || profile.graphicsCard) && (
                <SpecSection icon={HardDrive} title="Hardware" tone="blue">
                  {profile.storageCapacity && <SpecRow label="Storage" value={profile.storageCapacity} />}
                  {profile.memoryRam && <SpecRow label="Memory / RAM" value={profile.memoryRam} />}
                  {profile.processor && <SpecRow label="Processor" value={profile.processor} />}
                  {profile.graphicsCard && <SpecRow label="Graphics" value={profile.graphicsCard} />}
                  {profile.displaySpec && <SpecRow label="Display" value={profile.displaySpec} />}
                  {profile.numberOfControllers > 0 && <SpecRow label="Controllers" value={String(profile.numberOfControllers)} />}
                </SpecSection>
              )}

              {(profile.gpuModel || profile.cpuModel || profile.ramSpec || profile.formFactor || profile.socket) && (
                <SpecSection icon={Cpu} title="PC Component" tone="emerald">
                  {profile.gpuModel && <SpecRow label="GPU" value={profile.gpuModel} />}
                  {profile.cpuModel && <SpecRow label="CPU" value={profile.cpuModel} />}
                  {profile.ramSpec && <SpecRow label="RAM Spec" value={profile.ramSpec} />}
                  {profile.formFactor && <SpecRow label="Form Factor" value={profile.formFactor} />}
                  {profile.socket && <SpecRow label="Socket" value={profile.socket} />}
                  {profile.chipset && <SpecRow label="Chipset" value={profile.chipset} />}
                  {profile.power && <SpecRow label="Power" value={profile.power} />}
                </SpecSection>
              )}

              {profile.includedAccessories?.length > 0 && (
                <SpecSection icon={PackageIcon} title="Box Contents" tone="amber">
                  <div className="flex flex-wrap gap-2">
                    {profile.includedAccessories.map((a, i) => (
                      <div key={i} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border-2 border-amber-200 text-sm font-extrabold text-amber-900">
                        <CheckCircle2 className="h-4 w-4 text-amber-700" />
                        {a}
                      </div>
                    ))}
                  </div>
                </SpecSection>
              )}
            </div>
          )}
        </Panel>
      )}

      {/* RENTAL INFO */}
      {tab === 'rental' && (
        <Panel icon={Timer} title="Rental Configuration" desc="Rates, deposit and pre-order" tone="violet">
          <div className="p-5 space-y-5">
            {profile?.isRentable && (
              <div className="rounded-2xl bg-gradient-to-br from-violet-50 to-fuchsia-50 border-2 border-violet-200 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <Timer className="h-6 w-6 text-violet-700" />
                  <h3 className="font-extrabold text-violet-900 text-lg">Rental Rates</h3>
                </div>
                <div className="grid sm:grid-cols-3 gap-3">
                  {profile.rentalPricePerHour && (
                    <InfoBox label="Per Hour" value={formatPKRFull(profile.rentalPricePerHour)} tone="violet" />
                  )}
                  {profile.rentalPricePerDay && (
                    <InfoBox label="Per Day" value={formatPKRFull(profile.rentalPricePerDay)} tone="emerald" />
                  )}
                  {profile.rentalDeposit && (
                    <InfoBox label="Security Deposit" value={formatPKRFull(profile.rentalDeposit)} tone="amber" />
                  )}
                </div>
                {profile.rentalPricePerDay && (
                  <div className="mt-3 pt-3 border-t border-violet-200 grid grid-cols-3 gap-2">
                    <MiniPreview label="3 days" value={formatPKRFull(profile.rentalPricePerDay * 3)} />
                    <MiniPreview label="1 week" value={formatPKRFull(profile.rentalPricePerDay * 7)} />
                    <MiniPreview label="1 month" value={formatPKRFull(profile.rentalPricePerDay * 30)} />
                  </div>
                )}
              </div>
            )}

            {profile?.isPreOrder && (
              <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <Rocket className="h-6 w-6 text-amber-700" />
                  <h3 className="font-extrabold text-amber-900 text-lg">Pre-order Details</h3>
                </div>
                <InfoBox label="Release Date"
                  value={profile.preOrderReleaseDate
                    ? new Date(profile.preOrderReleaseDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' })
                    : 'Not set'}
                  tone="amber" />
              </div>
            )}
          </div>
        </Panel>
      )}

      {/* EDITIONS */}
      {tab === 'editions' && (
        <Panel icon={Boxes} title="Editions" desc={`${stats.variantCount} editions • total ${stats.variantStock} units`} tone="fuchsia"
          empty={(variants as any[]).length === 0}
          emptyText="No editions — single edition product"
          emptyAction={<Link to={`/gaming-products/${id}/edit`}><Button variant="secondary"><Plus className="h-4 w-4" /> Add Editions</Button></Link>}>
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
                <Link key={s.id} to={`/sales/${s.id}/receipt`} className="block px-5 py-3 hover:bg-violet-50/40 transition">
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

      {/* RENTALS */}
      {tab === 'rentals' && (
        <Panel icon={PackageIcon} title="Rental History" desc={`${stats.totalRented} rentals • ${stats.activeRentals} active`} tone="violet"
          empty={(rentalHistory as any[]).length === 0} emptyText="No rentals yet">
          <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
            {(rentalHistory as any[]).slice(0, 30).map((r: any) => (
              <Link key={r.id} to="/gaming/rentals" className="block px-5 py-3 hover:bg-violet-50/40 transition">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-extrabold text-sm text-slate-900">{r.rentalNumber}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                        r.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' :
                        r.status === 'OVERDUE' ? 'bg-rose-100 text-rose-700' :
                        r.status === 'RETURNED' ? 'bg-blue-100 text-blue-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>{r.status}</span>
                    </div>
                    <div className="text-xs text-slate-600 font-semibold mt-0.5">
                      {r.customerName} • {r.daysRented} days
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-extrabold text-violet-700 tabular-nums">{formatPKR(r.totalPrice)}</div>
                    <div className="text-[10px] font-bold text-slate-500">
                      {new Date(r.rentalStartDate).toLocaleDateString('en-PK', { day: '2-digit', month: 'short' })}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
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
    amber: 'bg-amber-500/30 border border-amber-300/40',
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
    violet: 'from-violet-500 to-fuchsia-700',
    fuchsia: 'from-fuchsia-500 to-pink-700',
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

function SpecSection({ icon: Icon, title, tone, children }: any) {
  const tones: Record<string, string> = {
    violet: 'from-violet-500 to-fuchsia-700 bg-violet-50 border-violet-200',
    fuchsia: 'from-fuchsia-500 to-pink-700 bg-fuchsia-50 border-fuchsia-200',
    emerald: 'from-emerald-500 to-teal-700 bg-emerald-50 border-emerald-200',
    blue: 'from-blue-500 to-cyan-700 bg-blue-50 border-blue-200',
    amber: 'from-amber-500 to-orange-600 bg-amber-50 border-amber-200',
    sky: 'from-sky-500 to-blue-700 bg-sky-50 border-sky-200',
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
    violet: 'bg-violet-50 border-violet-200 text-violet-800',
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

function MiniPreview({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white border border-violet-200 p-2 text-center">
      <div className="text-[9px] uppercase font-extrabold text-violet-600">{label}</div>
      <div className="text-sm font-extrabold text-slate-900 tabular-nums mt-0.5">{value}</div>
    </div>
  );
}

function QuickLink({ to, icon: Icon, title, desc, tone }: any) {
  const tones: Record<string, string> = {
    violet: 'bg-violet-100 text-violet-700 group-hover:bg-violet-600',
    rose: 'bg-rose-100 text-rose-700 group-hover:bg-rose-600',
    emerald: 'bg-emerald-100 text-emerald-700 group-hover:bg-emerald-600',
    blue: 'bg-blue-100 text-blue-700 group-hover:bg-blue-600',
  };
  return (
    <Link to={to} className="rounded-2xl bg-white border-2 border-slate-200 hover:border-violet-400 hover:shadow-md p-4 flex items-center gap-3 transition group">
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
