import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Edit3, Gem, Scale, Diamond, ShieldCheck, Award,
  Star, TrendingUp, Hash, DollarSign, Receipt, ShoppingCart,
  Trash2, ChevronRight, ExternalLink, User, RefreshCw, Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatPKR, formatPKRFull } from '@core/lib/format';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { productImagesApi } from '@modules/inventory/products/api/product-images.api';
import { salesApi } from '@modules/sales/sales/api/sales.api';
import { jewelryProductsApi } from '../api/products.api';
import { metalRatesApi } from '../api/metal-rates.api';

export default function JewelryItemDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productsApi.getOne(id!),
    enabled: !!id,
  });

  const { data: profile } = useQuery({
    queryKey: ['jewelry-profile', id],
    queryFn: () => jewelryProductsApi.byProduct(id!),
    enabled: !!id,
  });

  const { data: images = [] } = useQuery({
    queryKey: ['product-images', id],
    queryFn: () => productImagesApi.list(id!),
    enabled: !!id,
  });

  const { data: currentPrice } = useQuery({
    queryKey: ['jewelry-current-price', profile?.id],
    queryFn: () => jewelryProductsApi.currentPrice(profile!.id),
    enabled: !!profile?.id,
  });

  const { data: rates = [] } = useQuery({
    queryKey: ['metal-rates-current'],
    queryFn: () => metalRatesApi.current(),
  });

  const { data: allSales = [] } = useQuery({
    queryKey: ['sales-list-for-product'],
    queryFn: () => salesApi.list(),
    enabled: !!id,
  });

  const salesForProduct = useMemo(() => {
    if (!id) return [];
    return allSales.filter((s) => s.items.some((it) => it.product.id === id)).slice(0, 20);
  }, [allSales, id]);

  const removeMutation = useMutation({
    mutationFn: () => productsApi.remove(id!),
    onSuccess: (data: any) => {
      toast.success(data?.softDeleted ? 'Item deactivated' : 'Item deleted');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      navigate('/jewelry/products');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Delete failed'),
  });

  const stats = useMemo(() => {
    const soldItems = allSales.flatMap((s) =>
      s.items.filter((it) => it.product.id === id).map((it) => ({ ...it, sale: s })),
    );
    const totalSold = soldItems.reduce((a, it) => a + Number(it.quantity || 0), 0);
    const totalRevenue = soldItems.reduce((a, it) => a + Number(it.total || 0), 0);
    const totalOrders = new Set(soldItems.map((it) => it.sale.id)).size;
    return { totalSold, totalRevenue, totalOrders };
  }, [allSales, id]);

  const rateNow = useMemo(() => {
    if (!profile) return 0;
    return rates.find((r) => r.metalType === profile.metalType && r.purity === profile.purity)?.ratePerGram ?? 0;
  }, [rates, profile]);

  if (isLoading || !product) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-12 w-12 rounded-full border-4 border-amber-200 border-t-amber-600 animate-spin" />
      </div>
    );
  }

  const purityLabel = profile?.purity.replace('KARAT_', '').replace('SILVER_', 'S') + 'K';

  return (
    <div className="space-y-5 pb-8">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button onClick={() => navigate('/jewelry/products')}
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-amber-600 font-bold">
          <ArrowLeft className="h-4 w-4" /> Back to Catalog
        </button>
        <div className="flex items-center gap-2 flex-wrap">
          <Link to={`/jewelry-items/${id}/edit`}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border-2 border-amber-200 hover:bg-amber-100 text-amber-700 text-sm font-extrabold">
            <Edit3 className="h-4 w-4" /> Edit Item
          </Link>
          <Link to="/catalog" target="_blank"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 border-2 border-emerald-200 hover:bg-emerald-100 text-emerald-700 text-sm font-extrabold">
            <ExternalLink className="h-4 w-4" /> Catalog
          </Link>
          <button onClick={() => { if (confirm(`Delete "${product.name}"?`)) removeMutation.mutate(); }}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-50 border-2 border-rose-200 hover:bg-rose-100 text-rose-700 text-sm font-extrabold">
            <Trash2 className="h-4 w-4" /> Delete
          </button>
        </div>
      </div>

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-amber-900 to-yellow-700 text-white shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-yellow-400/15 blur-3xl" />
        <div className="relative grid lg:grid-cols-[280px_1fr] gap-6 p-6">
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-white/10 backdrop-blur border-2 border-white/20">
            {images[0]?.url ? (
              <img src={images[0].url} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/50 text-6xl">💎</div>
            )}
            <div className="absolute top-3 right-3 flex flex-col gap-1">
              {profile?.isBridalCollection && (
                <span className="px-2 py-0.5 rounded-md bg-rose-500 text-white text-[10px] font-extrabold shadow">👰 BRIDAL</span>
              )}
              {profile?.isBestSeller && (
                <span className="px-2 py-0.5 rounded-md bg-emerald-500 text-white text-[10px] font-extrabold shadow">🏆 BEST</span>
              )}
              {profile?.hallmarkNumber && (
                <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-extrabold shadow inline-flex items-center gap-0.5">
                  <ShieldCheck className="h-2.5 w-2.5" /> HALLMARK
                </span>
              )}
              {profile?.isCertified && (
                <span className="px-2 py-0.5 rounded-md bg-blue-500 text-white text-[10px] font-extrabold shadow inline-flex items-center gap-0.5">
                  <Award className="h-2.5 w-2.5" /> CERTIFIED
                </span>
              )}
            </div>
          </div>

          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Gem className="h-3.5 w-3.5 text-amber-300" />
              Jewelry Item
              {profile && (<><span className="text-white/40">•</span><span>{profile.category.replace('_', ' ')}</span></>)}
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">{product.name}</h1>
            {profile && (
              <div className="mt-2 text-lg font-extrabold text-amber-300">
                {profile.metalType.replace('_', ' ')} {purityLabel}
                {profile.style && ` • ${profile.style}`}
              </div>
            )}

            <div className="mt-3 flex items-center gap-3 flex-wrap text-xs">
              {profile?.itemCode && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/10 backdrop-blur font-mono">
                  <Hash className="h-3 w-3" /> {profile.itemCode}
                </span>
              )}
              {profile?.hallmarkNumber && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/30 border border-emerald-300/40 font-mono font-bold">
                  <ShieldCheck className="h-3 w-3" /> {profile.hallmarkNumber}
                </span>
              )}
            </div>

            {profile && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
                <HeroStat icon={Scale} label="Net" value={profile.netWeight.toFixed(2) + 'g'} tone="amber" />
                <HeroStat icon={Scale} label="Gross" value={profile.grossWeight.toFixed(2) + 'g'} tone="emerald" />
                {profile.hasStones && profile.stoneCaret ? (
                  <HeroStat icon={Diamond} label="Stones" value={profile.stoneCaret.toFixed(2) + 'ct'} sub={`${profile.stoneCount} stones`} tone="cyan" />
                ) : (
                  <HeroStat icon={Receipt} label="Sold" value={stats.totalSold} tone="cyan" />
                )}
                <HeroStat icon={TrendingUp} label="Revenue" value={formatPKR(stats.totalRevenue)} sub={`${stats.totalOrders} orders`} tone="rose" />
              </div>
            )}

            <div className="mt-5 flex items-center gap-4 flex-wrap">
              <div>
                <div className="text-[10px] uppercase font-extrabold text-white/70">Est. Price</div>
                <div className="text-3xl font-extrabold tabular-nums leading-none mt-1">{formatPKRFull(product.price)}</div>
              </div>
              {currentPrice?.total && currentPrice.total !== product.price && (
                <div>
                  <div className="text-[10px] uppercase font-extrabold text-emerald-300">Live Price</div>
                  <div className="text-2xl font-extrabold text-emerald-300 tabular-nums leading-none mt-1">
                    {formatPKRFull(currentPrice.total)}
                  </div>
                </div>
              )}
              {rateNow > 0 && (
                <div>
                  <div className="text-[10px] uppercase font-extrabold text-white/70">Metal Rate</div>
                  <div className="text-xl font-extrabold tabular-nums text-white/80 leading-none mt-1">
                    Rs {rateNow.toLocaleString()}/g
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Link to="/jewelry/sales/new" className="rounded-2xl bg-white border-2 border-slate-200 hover:border-amber-400 hover:shadow-md p-4 flex items-center gap-3 group">
          <div className="h-11 w-11 rounded-xl bg-amber-100 group-hover:bg-amber-600 group-hover:text-white text-amber-700 flex items-center justify-center transition">
            <ShoppingCart className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-extrabold text-slate-900 text-sm">New Sale</div>
            <div className="text-[10px] text-slate-500 font-semibold">Sell this item</div>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </Link>
        <Link to="/jewelry/metal-rates" className="rounded-2xl bg-white border-2 border-slate-200 hover:border-yellow-400 hover:shadow-md p-4 flex items-center gap-3 group">
          <div className="h-11 w-11 rounded-xl bg-yellow-100 group-hover:bg-yellow-600 group-hover:text-white text-yellow-700 flex items-center justify-center transition">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-extrabold text-slate-900 text-sm">Update Rates</div>
            <div className="text-[10px] text-slate-500 font-semibold">Metal live rates</div>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </Link>
        <Link to="/jewelry/custom-orders" className="rounded-2xl bg-white border-2 border-slate-200 hover:border-rose-400 hover:shadow-md p-4 flex items-center gap-3 group">
          <div className="h-11 w-11 rounded-xl bg-rose-100 group-hover:bg-rose-600 group-hover:text-white text-rose-700 flex items-center justify-center transition">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-extrabold text-slate-900 text-sm">Custom Orders</div>
            <div className="text-[10px] text-slate-500 font-semibold">Bespoke workflow</div>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </Link>
        <Link to="/jewelry/exchanges" className="rounded-2xl bg-white border-2 border-slate-200 hover:border-violet-400 hover:shadow-md p-4 flex items-center gap-3 group">
          <div className="h-11 w-11 rounded-xl bg-violet-100 group-hover:bg-violet-600 group-hover:text-white text-violet-700 flex items-center justify-center transition">
            <RefreshCw className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-extrabold text-slate-900 text-sm">Exchanges</div>
            <div className="text-[10px] text-slate-500 font-semibold">Old gold exchange</div>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </Link>
      </section>

      {currentPrice && (
        <section className="rounded-3xl bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-amber-300 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-700 text-white flex items-center justify-center shadow-md">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-amber-900 text-lg">Live Price Breakdown</h3>
              <p className="text-xs text-amber-700 font-semibold">Rate: Rs {rateNow.toLocaleString()}/g</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <BreakdownRow label="Metal Value" value={formatPKRFull(currentPrice.metalValue ?? 0)} />
            <BreakdownRow label="Making" value={formatPKRFull(currentPrice.makingCharge ?? 0)} />
            <BreakdownRow label="Wastage" value={formatPKRFull(currentPrice.wastageValue ?? 0)} />
            <BreakdownRow label="Stones + Other" value={formatPKRFull((currentPrice.stoneValue ?? 0) + (currentPrice.polishCharge ?? 0) + (currentPrice.hallmarkCharge ?? 0))} />
          </div>
          <div className="mt-4 pt-4 border-t-2 border-amber-300 flex items-center justify-between">
            <span className="text-lg font-extrabold text-amber-900">TOTAL (Live)</span>
            <span className="text-3xl font-extrabold text-emerald-700 tabular-nums">{formatPKRFull(currentPrice.total ?? 0)}</span>
          </div>
        </section>
      )}

      {profile && profile.gemstones && profile.gemstones.length > 0 && (
        <section className="rounded-3xl bg-white border-2 border-cyan-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b-2 border-cyan-100 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-700 text-white flex items-center justify-center shadow-md">
              <Diamond className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg">Gemstones ({profile.gemstones.length})</h3>
              <p className="text-xs text-slate-500 font-semibold">Detailed stone breakdown</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-3 py-2 text-left text-[10px] font-extrabold uppercase text-slate-700">Type</th>
                  <th className="px-3 py-2 text-right text-[10px] font-extrabold uppercase text-slate-700">Count</th>
                  <th className="px-3 py-2 text-right text-[10px] font-extrabold uppercase text-slate-700">Carat</th>
                  <th className="px-3 py-2 text-left text-[10px] font-extrabold uppercase text-slate-700">Color</th>
                  <th className="px-3 py-2 text-left text-[10px] font-extrabold uppercase text-slate-700">Clarity</th>
                  <th className="px-3 py-2 text-right text-[10px] font-extrabold uppercase text-slate-700">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {profile.gemstones.map((g: any, i: number) => (
                  <tr key={i} className="hover:bg-slate-50/50">
                    <td className="px-3 py-2 font-extrabold text-slate-900">{g.type}</td>
                    <td className="px-3 py-2 text-right font-bold tabular-nums">{g.count}</td>
                    <td className="px-3 py-2 text-right font-extrabold text-cyan-700 tabular-nums">{g.caret?.toFixed(3) ?? '—'} ct</td>
                    <td className="px-3 py-2 text-xs font-semibold">{g.color ?? '—'}</td>
                    <td className="px-3 py-2 text-xs font-semibold">{g.clarity ?? '—'}</td>
                    <td className="px-3 py-2 text-right font-extrabold text-emerald-700 tabular-nums">
                      {g.totalValue ? formatPKR(g.totalValue) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {profile && (profile.isBuyBackEligible || profile.isReturnable) && (
        <section className="rounded-2xl bg-emerald-50 border-2 border-emerald-200 p-5">
          <h3 className="font-extrabold text-emerald-900 flex items-center gap-2 mb-3">
            <RefreshCw className="h-4 w-4" />
            Customer Assurance
          </h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {profile.isBuyBackEligible && (
              <div className="rounded-xl bg-white border border-emerald-200 p-3">
                <div className="text-xs font-extrabold text-emerald-700 uppercase">Buyback Guarantee</div>
                <div className="text-2xl font-extrabold text-emerald-900 mt-1">{profile.buyBackPct}%</div>
                <div className="text-[10px] text-slate-600 font-semibold">of sale price</div>
              </div>
            )}
            {profile.isReturnable && (
              <div className="rounded-xl bg-white border border-emerald-200 p-3">
                <div className="text-xs font-extrabold text-emerald-700 uppercase">Return Policy</div>
                <div className="text-2xl font-extrabold text-emerald-900 mt-1">{profile.returnDays} Days</div>
                <div className="text-[10px] text-slate-600 font-semibold">Full refund window</div>
              </div>
            )}
          </div>
        </section>
      )}

      <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b-2 border-slate-100 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md">
            <Receipt className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-lg">Sales History</h3>
            <p className="text-xs text-slate-500 font-semibold">{salesForProduct.length} recent orders</p>
          </div>
        </div>
        {salesForProduct.length === 0 ? (
          <div className="p-10 text-center">
            <Receipt className="h-12 w-12 text-slate-300 mx-auto mb-2" />
            <div className="font-extrabold text-slate-700">Abhi tak koi sale nahi</div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {salesForProduct.map((s) => {
              const productLines = s.items.filter((it) => it.product.id === id);
              const qty = productLines.reduce((a, it) => a + Number(it.quantity || 0), 0);
              const revenue = productLines.reduce((a, it) => a + Number(it.total || 0), 0);
              return (
                <Link key={s.id} to={`/sales/${s.id}/receipt`} className="block px-5 py-3 hover:bg-slate-50/50">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="font-mono font-extrabold text-sm text-slate-900">{s.saleNumber}</div>
                        <span className="text-[10px] text-slate-500 font-bold">
                          {new Date(s.soldAt).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 font-semibold mt-0.5">
                        {s.customer?.name || 'Walk-in'} • {qty} pcs
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-extrabold text-emerald-700 tabular-nums">{formatPKRFull(revenue)}</div>
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

function HeroStat({ icon: Icon, label, value, sub, tone }: any) {
  const tones: Record<string, string> = {
    emerald: 'from-emerald-400/30 to-emerald-600/20 border-emerald-300/40',
    amber: 'from-amber-400/30 to-amber-600/20 border-amber-300/40',
    cyan: 'from-cyan-400/30 to-cyan-600/20 border-cyan-300/40',
    rose: 'from-rose-400/30 to-rose-600/20 border-rose-300/40',
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

function BreakdownRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white border border-amber-200 p-3">
      <div className="text-[10px] uppercase font-extrabold text-amber-700">{label}</div>
      <div className="text-lg font-extrabold text-slate-900 tabular-nums mt-1">{value}</div>
    </div>
  );
}
