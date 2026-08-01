import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Edit3, Boxes, Package, PackageX, DollarSign, TrendingUp,
  Star, ChevronRight, Home, Wifi, Receipt, ShoppingCart, Hash, Tag,
  Trash2, Barcode, Calendar, AlertTriangle, History, Sparkles, BarChart3,
  Info, Plus, CheckCircle2, XCircle, Shield, Award, Battery, Monitor,
  Ruler, Zap, Palette, HardHat, Truck, Wrench, FileSignature,
  Snowflake, Wind, ExternalLink, CreditCard, Flame, Droplets,
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
import { applianceProductsApi } from '../api/products.api';
import { applianceBrandsApi } from '../api/brands.api';
import { applianceSerialApi } from '../api/serial-tracking.api';
import { installationsApi } from '../api/installations.api';
import { PrivacyToggle, useCostHidden } from '@core/ui/HiddenValue';

type Tab = 'overview' | 'specs' | 'warranty' | 'variants' | 'serials' | 'sales' | 'installations' | 'log';

export default function ApplianceProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const hideCost = useCostHidden();

  const [tab, setTab] = useState<Tab>('overview');
  const [imgIndex, setImgIndex] = useState(0);

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productsApi.getOne(id!),
    enabled: !!id,
  });

  const { data: profile } = useQuery({
    queryKey: ['appliance-profile', id],
    queryFn: () => applianceProductsApi.byProduct(id!),
    enabled: !!id,
  });

  const { data: brand } = useQuery({
    queryKey: ['appliance-brand', profile?.brandId],
    queryFn: () => applianceBrandsApi.getOne(profile!.brandId!),
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

  const { data: serials = [] } = useQuery({
    queryKey: ['product-appliance-serials', id],
    queryFn: () => applianceSerialApi.list({ productId: id! }),
    enabled: !!id,
  });

  const { data: allSales = [] } = useQuery({
    queryKey: ['sales-list-for-product'],
    queryFn: () => salesApi.list(),
    enabled: !!id,
  });

  const { data: allInstalls = [] } = useQuery({
    queryKey: ['installations-list'],
    queryFn: () => installationsApi.list(),
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

  const installsForProduct = useMemo(() => {
    return (allInstalls as any[])
      .filter((i) => i.productId === id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 30);
  }, [allInstalls, id]);

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

    const isOut = stock <= 0;
    const isLow = !isOut && stock <= alert;

    const serialInStock = serials.filter((s: any) => s.status === 'IN_STOCK').length;
    const serialSold = serials.filter((s: any) => s.status === 'SOLD').length;
    const pendingInstalls = installsForProduct.filter((i: any) => ['PENDING', 'SCHEDULED', 'ASSIGNED'].includes(i.status)).length;
    const completedInstalls = installsForProduct.filter((i: any) => i.status === 'COMPLETED').length;

    return {
      stock, price, cost, alert, isOut, isLow,
      stockValue: stock * price,
      stockCost: stock * cost,
      margin: price > 0 ? ((price - cost) / price) * 100 : 0,
      profitPerUnit: price - cost,
      totalSold, totalRevenue, totalProfit: totalRevenue - totalCogs, orders,
      variantCount: (variants as any[]).length,
      variantStock: (variants as any[]).reduce((a, v) => a + Number(v.stock || 0), 0),
      sold30, perDay, daysLeft,
      serialCount: serials.length,
      serialInStock, serialSold,
      installCount: installsForProduct.length,
      pendingInstalls, completedInstalls,
    };
  }, [product, soldLines, variants, serials, installsForProduct]);

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
      queryClient.invalidateQueries({ queryKey: ['appliances-products-list'] });
      navigate('/appliance-products');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Delete failed'),
  });

  if (isLoading || !product) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-12 w-12 rounded-full border-4 border-cyan-200 border-t-cyan-600 animate-spin" />
      </div>
    );
  }

  const gallery: any[] = (images as any[]).length ? (images as any[]) : (product.images ?? []);

  const TABS: { id: Tab; label: string; count?: number; icon: any }[] = [
    { id: 'overview', label: 'Overview', icon: Info },
    { id: 'specs', label: 'Specifications', icon: Sparkles },
    { id: 'warranty', label: 'Warranty & Install', icon: Shield },
    { id: 'variants', label: 'Variants', count: stats.variantCount, icon: Boxes },
    { id: 'serials', label: 'Serials', count: stats.serialCount, icon: Barcode },
    { id: 'installations', label: 'Installations', count: stats.installCount, icon: HardHat },
    { id: 'sales', label: 'Sales', count: salesForProduct.length, icon: Receipt },
    { id: 'log', label: 'Stock Log', count: movements.length, icon: History },
  ];

  return (
    <div className="space-y-5 pb-10">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button onClick={() => navigate('/appliance-products')} className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-cyan-600 font-bold">
          <ArrowLeft className="h-4 w-4" /> All Products
        </button>
        <div className="flex items-center gap-2 flex-wrap">
          <Link to={`/appliance-products/${id}/edit`} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-cyan-50 border-2 border-cyan-200 hover:bg-cyan-100 text-cyan-700 text-sm font-extrabold">
            <Edit3 className="h-4 w-4" /> Edit
          </Link>
          <Link to="/pos" className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border-2 border-slate-200 hover:border-cyan-300 text-slate-700 text-sm font-extrabold">
            <ShoppingCart className="h-4 w-4" /> POS
          </Link>
          <PrivacyToggle compact />
          <button
            onClick={() => { if (confirm(`Delete "${product.name}"?`)) removeMutation.mutate(); }}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-50 border-2 border-rose-200 hover:bg-rose-100 text-rose-700 text-sm font-extrabold"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-cyan-900 to-teal-700 text-white shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-teal-400/15 blur-3xl" />

        <div className="relative grid lg:grid-cols-[280px_1fr] gap-6 p-6">
          <div className="space-y-2">
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-white/10 backdrop-blur border-2 border-white/20">
              {gallery[imgIndex]?.url ? (
                <img src={gallery[imgIndex].url} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/50"><Home className="h-16 w-16" /></div>
              )}
              {profile?.isFeatured && (
                <div className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-amber-500 text-white text-[10px] font-extrabold shadow-lg inline-flex items-center gap-1">
                  <Star className="h-3 w-3 fill-white" /> FEATURED
                </div>
              )}
              {profile?.isInverter && (
                <div className="absolute top-3 left-3 px-2 py-1 rounded-lg bg-blue-600 text-white text-[10px] font-extrabold shadow-lg inline-flex items-center gap-1">
                  <Zap className="h-3 w-3" /> INVERTER
                </div>
              )}
              {profile?.energyRating && profile.energyRating !== 'NOT_RATED' && (
                <div className="absolute bottom-3 left-3 px-2 py-1 rounded-lg bg-emerald-500 text-white text-[10px] font-extrabold shadow-lg">
                  ⚡ {profile.energyRating.replace(/_/g, ' ')}
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
                    className={['aspect-square rounded-lg overflow-hidden border-2 transition', imgIndex === i ? 'border-white' : 'border-white/20 opacity-70 hover:opacity-100'].join(' ')}>
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Home className="h-3.5 w-3.5 text-amber-300" /> Appliances
              {profile?.categoryType && (<><span className="text-white/40">•</span><span>{profile.categoryType.replace(/_/g, ' ')}</span></>)}
              {brand && (<><span className="text-white/40">•</span><span>{brand.name}</span></>)}
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">{product.name}</h1>
            {product.description && (
              <p className="mt-2 text-sm text-white/85 max-w-2xl line-clamp-2">{product.description}</p>
            )}

            <div className="mt-3 flex items-center gap-2 flex-wrap text-xs">
              {profile?.modelNumber && <Chip icon={Hash}>Model: {profile.modelNumber}</Chip>}
              {profile?.modelYear && <Chip icon={Calendar}>{profile.modelYear}</Chip>}
              {product.sku && <Chip icon={Hash}>SKU: {product.sku}</Chip>}
              {profile?.capacity && <Chip icon={Package} tone="cyan">Capacity: {profile.capacity}</Chip>}
              {profile?.colorName && (
                <Chip icon={Palette} tone="violet">
                  {profile.colorHex && <span className="h-2.5 w-2.5 rounded-full inline-block mr-1" style={{ backgroundColor: profile.colorHex }} />}
                  {profile.colorName}
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
              {profile?.emiStartingFrom ? (
                <div className="rounded-xl px-3 py-2 backdrop-blur border bg-cyan-400/20 border-cyan-300/40">
                  <div className="text-[10px] uppercase font-extrabold text-white/80 tracking-wider inline-flex items-center gap-1">
                    <CreditCard className="h-2.5 w-2.5" /> EMI from
                  </div>
                  <div className="text-lg font-extrabold tabular-nums leading-none mt-0.5">{formatPKRFull(profile.emiStartingFrom)}/mo</div>
                </div>
              ) : null}
              {!hideCost && stats.profitPerUnit !== 0 && (
                <div className={['rounded-xl px-3 py-2 backdrop-blur border', stats.profitPerUnit >= 0 ? 'bg-emerald-400/20 border-emerald-300/40' : 'bg-rose-400/20 border-rose-300/40'].join(' ')}>
                  <div className="text-[10px] uppercase font-extrabold text-white/80 tracking-wider">Profit / unit</div>
                  <div className="text-lg font-extrabold tabular-nums leading-none mt-0.5">
                    {formatPKRFull(stats.profitPerUnit)} <span className="text-xs opacity-80">({stats.margin.toFixed(0)}%)</span>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
              <HeroStat icon={Package} label="Stock" value={String(stats.stock)} sub="pcs"
                tone={stats.isOut ? 'rose' : stats.isLow ? 'amber' : 'cyan'} />
              <HeroStat icon={DollarSign} label="Stock Value" value={formatPKR(stats.stockValue)} sub={hideCost ? '•••' : `cost ${formatPKR(stats.stockCost)}`} tone="emerald" />
              <HeroStat icon={HardHat} label="Installs" value={String(stats.installCount)} sub={`${stats.pendingInstalls} pending`} tone="amber" />
              <HeroStat icon={Barcode} label="Serials" value={String(stats.serialCount)} sub={`${stats.serialInStock} in stock`} tone="violet" />
            </div>
          </div>
        </div>
      </section>

      {/* Alerts */}
      {(stats.isOut || stats.isLow) && (
        <section className="rounded-3xl border-2 bg-gradient-to-br p-4 flex items-start gap-3 from-amber-50 to-white border-amber-300 text-amber-900">
          <div className="h-11 w-11 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-md">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-extrabold text-sm">
              {stats.isOut ? 'Stock khatam ho gaya hai' : `Sirf ${stats.stock} pcs bache hain`}
            </h3>
            <p className="text-xs font-semibold opacity-90 mt-0.5">
              {stats.daysLeft !== null
                ? `30-day avg ${stats.perDay.toFixed(1)}/day — approx ${stats.daysLeft} din chalega.`
                : `Alert threshold: ${stats.alert}`}
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
                className={['px-4 py-2.5 rounded-xl text-sm font-extrabold inline-flex items-center gap-2 transition',
                  active ? 'bg-gradient-to-br from-cyan-600 to-teal-700 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'].join(' ')}>
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
                      <linearGradient id="detailGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0891b2" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="#0891b2" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="label" stroke="#64748b" fontSize={10} interval={4} />
                    <YAxis stroke="#64748b" fontSize={10} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: any) => formatPKR(Number(v))} contentStyle={{ borderRadius: 12, border: '2px solid #e2e8f0' }} />
                    <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#0891b2" strokeWidth={2.5} fill="url(#detailGrad)" />
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

          <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <QuickLink to="/appliances/installations" icon={HardHat} title="Installations" desc="Schedule mgmt" tone="amber" />
            <QuickLink to="/appliances/service-requests" icon={Wrench} title="Service" desc="Repair requests" tone="rose" />
            <QuickLink to="/appliances/amc-contracts" icon={FileSignature} title="AMC" desc="Contracts" tone="violet" />
            <QuickLink to="/appliances/deliveries" icon={Truck} title="Deliveries" desc="Heavy items" tone="blue" />
          </section>

          {brand && (
            <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 text-white flex items-center justify-center shadow-md">
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900">Brand: {brand.name}</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {brand.authorizedDealer && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[9px] font-extrabold uppercase">Authorized Dealer</span>
                    )}
                    {brand.countryOfOrigin && (
                      <span className="text-[10px] text-slate-500 font-bold">📍 {brand.countryOfOrigin}</span>
                    )}
                  </div>
                </div>
              </div>
              {(brand.serviceCenter || brand.serviceContact || brand.serviceEmail) && (
                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100">
                  {brand.serviceCenter && <MiniField label="Service Center" value={brand.serviceCenter} />}
                  {brand.serviceContact && <MiniField label="Phone" value={brand.serviceContact} />}
                  {brand.serviceEmail && <MiniField label="Email" value={brand.serviceEmail} />}
                </div>
              )}
            </section>
          )}
        </div>
      )}

      {/* SPECS */}
      {tab === 'specs' && (
        <Panel icon={Sparkles} title="Specifications" desc="All technical details" tone="cyan"
          empty={!profile} emptyText="No specs added yet"
          emptyAction={<Link to={`/appliance-products/${id}/edit`}><Button className="bg-cyan-600"><Edit3 className="h-4 w-4" /> Add Specs</Button></Link>}>
          {profile && (
            <div className="p-5 space-y-5">
              {(profile.capacity || profile.powerConsumption || profile.voltage) && (
                <SpecSection icon={Ruler} title="General" tone="slate">
                  {profile.capacity && <SpecRow label="Capacity" value={profile.capacity} />}
                  {profile.powerConsumption && <SpecRow label="Power Consumption" value={profile.powerConsumption} />}
                  {profile.voltage && <SpecRow label="Voltage" value={profile.voltage} />}
                  {profile.frequency && <SpecRow label="Frequency" value={profile.frequency} />}
                  {profile.weightKg && <SpecRow label="Weight" value={`${profile.weightKg} kg`} />}
                  {profile.dimensions && <SpecRow label="Dimensions" value={profile.dimensions} />}
                </SpecSection>
              )}

              {(profile.energyRating !== 'NOT_RATED' || profile.isInverter || profile.isEnergyStar) && (
                <SpecSection icon={Zap} title="Energy Efficiency" tone="emerald">
                  {profile.energyRating && profile.energyRating !== 'NOT_RATED' && (
                    <SpecRow label="Rating" value={profile.energyRating.replace(/_/g, ' ')} />
                  )}
                  {profile.isInverter && <SpecRow label="Inverter" value="✓ Yes" />}
                  {profile.isEnergyStar && <SpecRow label="Energy Star" value="✓ Yes" />}
                </SpecSection>
              )}

              {(profile.acTonnage || profile.coolingCapacity) && (
                <SpecSection icon={Snowflake} title="Air Conditioner" tone="sky">
                  {profile.acTonnage && <SpecRow label="Tonnage" value={profile.acTonnage} />}
                  {profile.acType && <SpecRow label="Type" value={profile.acType} />}
                  {profile.coolingCapacity && <SpecRow label="Cooling Capacity" value={profile.coolingCapacity} />}
                  {profile.refrigerantType && <SpecRow label="Refrigerant" value={profile.refrigerantType} />}
                </SpecSection>
              )}

              {(profile.fridgeCapacityLiters || profile.refrigeratorType) && (
                <SpecSection icon={Package} title="Refrigerator" tone="blue">
                  {profile.fridgeCapacityLiters && <SpecRow label="Capacity" value={`${profile.fridgeCapacityLiters} L`} />}
                  {profile.refrigeratorType && <SpecRow label="Type" value={profile.refrigeratorType} />}
                  {profile.doorCount && <SpecRow label="Doors" value={String(profile.doorCount)} />}
                  {profile.compressorType && <SpecRow label="Compressor" value={profile.compressorType} />}
                </SpecSection>
              )}

              {(profile.washingCapacityKg || profile.washingType) && (
                <SpecSection icon={Wind} title="Washing Machine" tone="violet">
                  {profile.washingCapacityKg && <SpecRow label="Capacity" value={`${profile.washingCapacityKg} kg`} />}
                  {profile.washingType && <SpecRow label="Type" value={profile.washingType} />}
                  {profile.rpm && <SpecRow label="Spin Speed" value={`${profile.rpm} RPM`} />}
                </SpecSection>
              )}

              {(profile.screenSizeInch || profile.displayType) && (
                <SpecSection icon={Monitor} title="TV Display" tone="purple">
                  {profile.screenSizeInch && <SpecRow label="Screen Size" value={`${profile.screenSizeInch}"`} />}
                  {profile.displayType && <SpecRow label="Display Type" value={profile.displayType} />}
                  {profile.resolution && <SpecRow label="Resolution" value={profile.resolution} />}
                  {profile.smartOS && <SpecRow label="Smart OS" value={profile.smartOS} />}
                </SpecSection>
              )}

              {profile.features?.length > 0 && (
                <SpecSection icon={Sparkles} title="Features" tone="amber">
                  <div className="flex flex-wrap gap-1.5">
                    {profile.features.map((f: string) => (
                      <span key={f} className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 text-xs font-extrabold">{f}</span>
                    ))}
                  </div>
                </SpecSection>
              )}

              {profile.smartFeatures?.length > 0 && (
                <SpecSection icon={Wifi} title="Smart Features" tone="blue">
                  <div className="flex flex-wrap gap-1.5">
                    {profile.smartFeatures.map((f: string) => (
                      <span key={f} className="px-2.5 py-1 rounded-lg bg-blue-100 text-blue-800 text-xs font-extrabold">{f}</span>
                    ))}
                  </div>
                </SpecSection>
              )}

              {profile.safetyFeatures?.length > 0 && (
                <SpecSection icon={Shield} title="Safety Features" tone="rose">
                  <div className="flex flex-wrap gap-1.5">
                    {profile.safetyFeatures.map((f: string) => (
                      <span key={f} className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 text-xs font-extrabold">{f}</span>
                    ))}
                  </div>
                </SpecSection>
              )}
            </div>
          )}
        </Panel>
      )}

      {/* WARRANTY */}
      {tab === 'warranty' && (
        <Panel icon={Shield} title="Warranty & Installation" desc="Coverage & install requirements" tone="cyan"
          empty={!profile} emptyText="No warranty info yet">
          {profile && (
            <div className="p-5 space-y-5">
              <div className="rounded-2xl bg-gradient-to-br from-cyan-50 to-teal-50 border-2 border-cyan-200 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <Shield className="h-6 w-6 text-cyan-700" />
                  <h3 className="font-extrabold text-cyan-900 text-lg">Warranty</h3>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <InfoBox label="Main Warranty" value={profile.warrantyMonths ? `${profile.warrantyMonths} months` : 'Not specified'} tone="cyan" />
                  <InfoBox label="Type" value={profile.warrantyType || 'Not set'} tone="violet" />
                  {profile.compressorWarrantyMonths ? (
                    <InfoBox label="Compressor Warranty"
                      value={profile.compressorWarrantyMonths >= 999 ? 'Lifetime' : `${profile.compressorWarrantyMonths} months`}
                      tone="blue" />
                  ) : null}
                  {profile.motorWarrantyMonths ? (
                    <InfoBox label="Motor Warranty" value={`${profile.motorWarrantyMonths} months`} tone="emerald" />
                  ) : null}
                </div>
              </div>

              <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-white border-2 border-amber-200 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <HardHat className="h-6 w-6 text-amber-700" />
                  <h3 className="font-extrabold text-amber-900 text-lg">Installation</h3>
                </div>
                {profile.requiresInstallation ? (
                  <>
                    <div className="grid sm:grid-cols-2 gap-3 mb-3">
                      <InfoBox label="Installation Charge" value={profile.installationCharge > 0 ? formatPKR(profile.installationCharge) : 'Free/Not set'} tone="amber" />
                      {profile.installationTimeHours ? (
                        <InfoBox label="Time Required" value={`${profile.installationTimeHours} hours`} tone="orange" />
                      ) : null}
                      <InfoBox label="Covered in Price?" value={profile.installationCovered ? '✓ Yes' : '✗ No'}
                        tone={profile.installationCovered ? 'emerald' : 'slate'} />
                    </div>
                    <div className="text-xs uppercase font-extrabold text-amber-800 mb-2">Required Connections</div>
                    <div className="flex flex-wrap gap-2">
                      {profile.requiresElectrician && <Badge icon={Zap} label="Electrician" tone="amber" />}
                      {profile.requiresPlumbing && <Badge icon={Droplets} label="Plumbing" tone="blue" />}
                      {profile.requiresGasConnection && <Badge icon={Flame} label="Gas Line" tone="orange" />}
                    </div>
                  </>
                ) : (
                  <div className="text-sm font-bold text-slate-600">No installation required</div>
                )}
              </div>

              <div className="rounded-2xl bg-white border-2 border-slate-200 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <Truck className="h-6 w-6 text-blue-700" />
                  <h3 className="font-extrabold text-slate-900">Delivery</h3>
                </div>
                <div className="grid sm:grid-cols-3 gap-3">
                  <InfoBox label="Free Delivery" value={profile.freeDelivery ? '✓ Yes' : '✗ No'} tone={profile.freeDelivery ? 'emerald' : 'slate'} />
                  {profile.deliveryChargePerKm ? (
                    <InfoBox label="Charge per km" value={formatPKR(profile.deliveryChargePerKm)} tone="blue" />
                  ) : null}
                  <InfoBox label="Large Vehicle Needed" value={profile.requiresLargeVehicle ? '✓ Yes' : '✗ No'}
                    tone={profile.requiresLargeVehicle ? 'amber' : 'slate'} />
                </div>
              </div>

              {profile.boxContents?.length > 0 && (
                <div className="rounded-2xl bg-white border-2 border-slate-200 p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <Package className="h-6 w-6 text-amber-700" />
                    <h3 className="font-extrabold text-slate-900">📦 What's in the Box</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {profile.boxContents.map((item: string, i: number) => (
                      <div key={i} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border-2 border-amber-200 text-sm font-extrabold text-amber-900">
                        <CheckCircle2 className="h-4 w-4 text-amber-700" />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Panel>
      )}

      {/* VARIANTS */}
      {tab === 'variants' && (
        <Panel icon={Boxes} title="Variants" desc={`${stats.variantCount} variants • total stock ${stats.variantStock}`} tone="violet"
          empty={(variants as any[]).length === 0}
          emptyText="No variants — single SKU product"
          emptyAction={<Link to={`/appliance-products/${id}/edit`}><Button variant="secondary"><Plus className="h-4 w-4" /> Add Variants</Button></Link>}>
          <div className="p-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(variants as any[]).map((v) => {
              const vStock = Number(v.stock || 0);
              const vLow = vStock > 0 && vStock <= Number(v.lowStockAlert ?? 3);
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
                      {vStock} <span className="text-[10px] font-bold text-slate-500">pcs</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      {/* SERIALS */}
      {tab === 'serials' && (
        <Panel icon={Barcode} title="Serial Tracking" desc={`${stats.serialCount} total • ${stats.serialInStock} in stock • ${stats.serialSold} sold`} tone="amber"
          empty={serials.length === 0}
          emptyText="No serials tracked"
          emptyAction={<Link to={`/appliance-products/${id}/edit`}><Button variant="secondary"><Plus className="h-4 w-4" /> Add Serials</Button></Link>}>
          <div className="p-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b-2 border-slate-200">
                  <tr>
                    <Th2>Serial #</Th2>
                    <Th2>Model / Batch</Th2>
                    <Th2 className="text-center">Status</Th2>
                    <Th2 className="text-center">Install</Th2>
                    <Th2 className="text-center">Warranty</Th2>
                    <Th2 className="text-right">Purchase</Th2>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {serials.map((s: any) => {
                    const statusColors: Record<string, string> = {
                      IN_STOCK: 'bg-emerald-100 text-emerald-700',
                      SOLD: 'bg-blue-100 text-blue-700',
                      RESERVED: 'bg-amber-100 text-amber-700',
                      RETURNED: 'bg-violet-100 text-violet-700',
                      DEFECTIVE: 'bg-rose-100 text-rose-700',
                    };
                    const installColors: Record<string, string> = {
                      PENDING: 'bg-slate-100 text-slate-700',
                      SCHEDULED: 'bg-amber-100 text-amber-700',
                      ASSIGNED: 'bg-blue-100 text-blue-700',
                      COMPLETED: 'bg-emerald-100 text-emerald-700',
                      CANCELLED: 'bg-rose-100 text-rose-700',
                    };
                    return (
                      <tr key={s.id} className="hover:bg-slate-50/60">
                        <td className="px-3 py-2.5 font-mono font-extrabold text-slate-900 text-xs">{s.serialNumber}</td>
                        <td className="px-3 py-2.5">
                          <div className="text-xs font-mono text-slate-700">{s.modelNumber || '—'}</div>
                          {s.batchNumber && <div className="text-[10px] text-slate-500 font-bold">Batch: {s.batchNumber}</div>}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${statusColors[s.status] || 'bg-slate-100'}`}>
                            {s.status}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${installColors[s.installationStatus] || 'bg-slate-100'}`}>
                            {s.installationStatus}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {s.warrantyEndDate ? (
                            <span className={['text-[10px] font-extrabold', new Date(s.warrantyEndDate) > new Date() ? 'text-emerald-700' : 'text-rose-700'].join(' ')}>
                              {new Date(s.warrantyEndDate).toLocaleDateString('en-PK')}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-3 py-2.5 text-right text-xs font-bold text-slate-700 tabular-nums">
                          {s.purchasePrice ? formatPKR(s.purchasePrice) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </Panel>
      )}

      {/* INSTALLATIONS */}
      {tab === 'installations' && (
        <Panel icon={HardHat} title="Installation History" desc={`${installsForProduct.length} installations • ${stats.pendingInstalls} pending • ${stats.completedInstalls} completed`} tone="amber"
          empty={installsForProduct.length === 0}
          emptyText="No installations for this product yet">
          <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
            {installsForProduct.map((inst: any) => {
              const statusColors: Record<string, string> = {
                PENDING: 'bg-slate-100 text-slate-700',
                SCHEDULED: 'bg-amber-100 text-amber-700',
                ASSIGNED: 'bg-blue-100 text-blue-700',
                IN_PROGRESS: 'bg-cyan-100 text-cyan-700',
                COMPLETED: 'bg-emerald-100 text-emerald-700',
                CANCELLED: 'bg-rose-100 text-rose-700',
              };
              return (
                <div key={inst.id} className="px-5 py-3 flex items-center gap-3 hover:bg-amber-50/40">
                  <div className="h-10 w-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                    <HardHat className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-extrabold text-sm text-slate-900">{inst.installationNumber}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${statusColors[inst.status] || 'bg-slate-100'}`}>
                        {inst.status}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-slate-700 mt-0.5 truncate">
                      {inst.customerName} • 📞 {inst.customerPhone}
                    </div>
                    {inst.scheduledDate && (
                      <div className="text-[10px] text-slate-500 font-bold">
                        📅 {new Date(inst.scheduledDate).toLocaleDateString('en-PK')}
                        {inst.scheduledTimeSlot && ` • ${inst.scheduledTimeSlot}`}
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    {inst.technicianName && (
                      <div className="text-[10px] font-extrabold text-violet-700">{inst.technicianName}</div>
                    )}
                    {inst.totalCharge > 0 && (
                      <div className="text-sm font-extrabold text-emerald-700 tabular-nums">{formatPKR(inst.totalCharge)}</div>
                    )}
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
                <Link key={s.id} to={`/sales/${s.id}/receipt`} className="block px-5 py-3 hover:bg-cyan-50/40 transition">
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
          empty={movements.length === 0} emptyText="No movements">
          <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
            {movements.map((m: any, i: number) => {
              const qty = Number(m.quantity ?? m.qty ?? 0);
              const isIn = qty > 0 || String(m.type || '').includes('IN');
              return (
                <div key={m.id ?? i} className="px-5 py-3 flex items-center gap-3 hover:bg-slate-50/60">
                  <div className={['h-9 w-9 rounded-xl flex items-center justify-center shrink-0', isIn ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'].join(' ')}>
                    {isIn ? <Plus className="h-4 w-4" /> : <PackageX className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-extrabold text-slate-900 text-sm">{String(m.type || 'MOVEMENT').replace(/_/g, ' ')}</div>
                    <div className="text-[11px] text-slate-500 font-semibold truncate">
                      {m.note || m.reason || '—'}
                      {m.createdAt && ` • ${new Date(m.createdAt).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })}`}
                    </div>
                  </div>
                  <div className={['font-extrabold tabular-nums shrink-0', isIn ? 'text-emerald-700' : 'text-rose-700'].join(' ')}>
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
    amber: 'bg-amber-500/30 border border-amber-300/40',
    cyan: 'bg-cyan-500/30 border border-cyan-300/40',
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
    cyan: 'from-cyan-400/30 to-cyan-600/20 border-cyan-300/40',
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
    cyan: 'from-cyan-500 to-teal-700',
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

function SpecSection({ icon: Icon, title, tone, children }: any) {
  const tones: Record<string, string> = {
    emerald: 'from-emerald-500 to-teal-700 bg-emerald-50 border-emerald-200',
    cyan: 'from-cyan-500 to-teal-700 bg-cyan-50 border-cyan-200',
    blue: 'from-blue-500 to-cyan-700 bg-blue-50 border-blue-200',
    violet: 'from-violet-500 to-purple-700 bg-violet-50 border-violet-200',
    amber: 'from-amber-500 to-orange-600 bg-amber-50 border-amber-200',
    sky: 'from-sky-500 to-blue-700 bg-sky-50 border-sky-200',
    rose: 'from-rose-500 to-red-700 bg-rose-50 border-rose-200',
    purple: 'from-purple-500 to-fuchsia-700 bg-purple-50 border-purple-200',
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
    cyan: 'bg-cyan-50 border-cyan-200 text-cyan-800',
    blue: 'bg-blue-50 border-blue-200 text-blue-800',
    violet: 'bg-violet-50 border-violet-200 text-violet-800',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    amber: 'bg-amber-50 border-amber-200 text-amber-800',
    orange: 'bg-orange-50 border-orange-200 text-orange-800',
    slate: 'bg-slate-50 border-slate-200 text-slate-800',
  };
  return (
    <div className={`rounded-xl border-2 p-3 ${tones[tone]}`}>
      <div className="text-[10px] uppercase font-extrabold opacity-75">{label}</div>
      <div className="text-lg font-extrabold mt-0.5">{value}</div>
    </div>
  );
}

function MiniField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase font-extrabold text-slate-500">{label}</div>
      <div className="text-sm font-bold text-slate-900 truncate">{value}</div>
    </div>
  );
}

function Badge({ icon: Icon, label, tone }: any) {
  const tones: Record<string, string> = {
    amber: 'bg-amber-100 text-amber-800 border-amber-300',
    blue: 'bg-blue-100 text-blue-800 border-blue-300',
    orange: 'bg-orange-100 text-orange-800 border-orange-300',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border-2 text-xs font-extrabold ${tones[tone]}`}>
      <Icon className="h-3.5 w-3.5" /> {label}
    </span>
  );
}

function Th2({ children, className = '' }: any) {
  return <th className={`px-3 py-3 text-left text-[10px] font-extrabold uppercase tracking-wider text-slate-700 ${className}`}>{children}</th>;
}

function QuickLink({ to, icon: Icon, title, desc, tone }: any) {
  const tones: Record<string, string> = {
    amber: 'bg-amber-100 text-amber-700 group-hover:bg-amber-600',
    rose: 'bg-rose-100 text-rose-700 group-hover:bg-rose-600',
    violet: 'bg-violet-100 text-violet-700 group-hover:bg-violet-600',
    blue: 'bg-blue-100 text-blue-700 group-hover:bg-blue-600',
  };
  return (
    <Link to={to} className="rounded-2xl bg-white border-2 border-slate-200 hover:border-cyan-400 hover:shadow-md p-4 flex items-center gap-3 transition group">
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
