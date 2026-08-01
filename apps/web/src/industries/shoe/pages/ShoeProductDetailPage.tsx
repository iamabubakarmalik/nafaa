import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Edit3, Package, DollarSign, TrendingUp,
  Star, Footprints, Ruler, Award, Sparkles, Info,
  Trash2, MapPin, Palette, Shield, Heart, Trophy,
  CheckCircle2, XCircle, Receipt, History,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@core/ui/Button';
import { formatPKR, formatPKRFull } from '@core/lib/format';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { shoeProductsApi } from '../api/products.api';
import { shoeSizeVariantsApi } from '../api/size-variants.api';
import { PrivacyToggle, useCostHidden } from '@core/ui/HiddenValue';

type Tab = 'overview' | 'sizes' | 'details' | 'materials' | 'features' | 'log';

export default function ShoeProductDetailPage() {
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
    queryKey: ['shoe-profile', id],
    queryFn: () => shoeProductsApi.byProduct(id!),
    enabled: !!id,
  });

  const { data: sizeVariants = [] } = useQuery({
    queryKey: ['shoe-variants', id],
    queryFn: () => shoeSizeVariantsApi.byProduct(id!),
    enabled: !!id,
  });

  const stats = useMemo(() => {
    const stock = Number(product?.stock || 0);
    const price = Number(product?.price || 0);
    const cost = Number(product?.costPrice || 0);
    const totalSizes = (sizeVariants as any[]).length;
    const availableSizes = (sizeVariants as any[]).filter((v) => v.stock > 0).length;
    const outSizes = (sizeVariants as any[]).filter((v) => v.stock <= 0).length;
    const lowSizes = (sizeVariants as any[]).filter((v) => v.stock > 0 && v.stock <= v.lowStockAlert).length;
    const totalReserved = (sizeVariants as any[]).reduce((a, v) => a + Number(v.reservedStock || 0), 0);
    const totalSold = (sizeVariants as any[]).reduce((a, v) => a + Number(v.totalSold || 0), 0);
    return {
      stock, price, cost,
      stockValue: stock * price,
      stockCost: stock * cost,
      margin: price > 0 ? ((price - cost) / price) * 100 : 0,
      profitPerUnit: price - cost,
      totalSizes, availableSizes, outSizes, lowSizes, totalReserved, totalSold,
    };
  }, [product, sizeVariants]);

  const removeMutation = useMutation({
    mutationFn: () => productsApi.remove(id!),
    onSuccess: (data: any) => {
      toast.success(data?.softDeleted ? 'Product deactivated' : 'Product deleted');
      qc.invalidateQueries({ queryKey: ['shoe-products-list'] });
      navigate('/shoe-products');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Delete failed'),
  });

  if (isLoading || !product) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-12 w-12 rounded-full border-4 border-orange-200 border-t-orange-600 animate-spin" />
      </div>
    );
  }

  const gallery: any[] = (product.images ?? []);

  const TABS: { id: Tab; label: string; count?: number; icon: any }[] = [
    { id: 'overview', label: 'Overview', icon: Info },
    { id: 'sizes', label: 'Size Grid', count: stats.totalSizes, icon: Ruler },
    { id: 'details', label: 'Details', icon: Sparkles },
    { id: 'materials', label: 'Materials', icon: Palette },
    { id: 'features', label: 'Features', icon: Shield },
    { id: 'log', label: 'Stock Log', icon: History },
  ];

  return (
    <div className="space-y-5 pb-10">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button onClick={() => navigate('/shoe-products')} className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-orange-600 font-bold">
          <ArrowLeft className="h-4 w-4" /> All Products
        </button>
        <div className="flex items-center gap-2 flex-wrap">
          <Link to={`/shoe-products/${id}/edit`} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-orange-50 border-2 border-orange-200 hover:bg-orange-100 text-orange-700 text-sm font-extrabold">
            <Edit3 className="h-4 w-4" /> Edit
          </Link>
          <PrivacyToggle compact />
          <button onClick={() => { if (confirm(`Delete "${product.name}"?`)) removeMutation.mutate(); }}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-50 border-2 border-rose-200 hover:bg-rose-100 text-rose-700 text-sm font-extrabold">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-orange-900 to-amber-700 text-white shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="relative grid lg:grid-cols-[280px_1fr] gap-6 p-6">
          <div className="space-y-2">
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-white/10 backdrop-blur border-2 border-white/20">
              {gallery[imgIndex]?.url ? (
                <img src={gallery[imgIndex].url} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/50"><Footprints className="h-16 w-16" /></div>
              )}
              {profile?.isBridal && (
                <div className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-pink-500 text-white text-[10px] font-extrabold shadow-lg inline-flex items-center gap-1">
                  <Heart className="h-3 w-3" /> BRIDAL
                </div>
              )}
              {profile?.isFeatured && !profile?.isBridal && (
                <div className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-amber-500 text-white text-[10px] font-extrabold shadow-lg inline-flex items-center gap-1">
                  <Star className="h-3 w-3 fill-white" /> FEATURED
                </div>
              )}
              {profile?.isNewArrival && (
                <div className="absolute top-3 left-3 px-2 py-1 rounded-lg bg-emerald-500 text-white text-[10px] font-extrabold shadow-lg">🆕 NEW</div>
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
              <Footprints className="h-3.5 w-3.5 text-amber-300" /> Shoe
              {profile?.gender && (<><span className="text-white/40">•</span><span>{profile.gender}</span></>)}
              {profile?.categoryType && (<><span className="text-white/40">•</span><span>{profile.categoryType.replace(/_/g, ' ')}</span></>)}
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">{product.name}</h1>
            {profile?.modelName && (
              <p className="mt-1 text-lg font-bold text-white/85">{profile.modelName}</p>
            )}
            {product.description && (
              <p className="mt-2 text-sm text-white/80 max-w-2xl line-clamp-2">{product.description}</p>
            )}

            <div className="mt-3 flex items-center gap-2 flex-wrap text-xs">
              {profile?.brand && <Chip icon={Award}>{profile.brand.name}</Chip>}
              {product.sku && <Chip>SKU: {product.sku}</Chip>}
              {profile?.colorName && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/10 backdrop-blur font-bold">
                  <span className="h-3 w-3 rounded-full border border-white/40" style={{ backgroundColor: profile.colorHex || '#fff' }} />
                  {profile.colorName}
                </span>
              )}
              {profile?.sizeSystem && <Chip icon={Ruler}>{profile.sizeSystem} sizes</Chip>}
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
              {!hideCost && stats.profitPerUnit !== 0 && (
                <div className={`rounded-xl px-3 py-2 backdrop-blur border ${stats.profitPerUnit >= 0 ? 'bg-emerald-400/20 border-emerald-300/40' : 'bg-rose-400/20 border-rose-300/40'}`}>
                  <div className="text-[10px] uppercase font-extrabold text-white/80 tracking-wider">Profit / pair</div>
                  <div className="text-lg font-extrabold tabular-nums leading-none mt-0.5">
                    {formatPKRFull(stats.profitPerUnit)} <span className="text-xs opacity-80">({stats.margin.toFixed(0)}%)</span>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
              <HeroStat icon={Package} label="Total Pairs" value={String(stats.stock)} sub={`${stats.totalSizes} sizes`} tone="orange" />
              <HeroStat icon={CheckCircle2} label="Sizes Available" value={String(stats.availableSizes)} sub={`${stats.outSizes} out`} tone="emerald" />
              <HeroStat icon={DollarSign} label="Stock Value" value={formatPKR(stats.stockValue)} sub="Retail" tone="violet" />
              <HeroStat icon={TrendingUp} label="Total Sold" value={String(stats.totalSold)} sub="pairs" tone="amber" />
            </div>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <section className="rounded-2xl bg-white border-2 border-slate-200 shadow-sm p-2 overflow-x-auto">
        <div className="flex gap-1.5 min-w-max">
          {TABS.map((t) => {
            const active = tab === t.id;
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`px-4 py-2.5 rounded-xl text-sm font-extrabold inline-flex items-center gap-2 transition ${
                  active ? 'bg-gradient-to-br from-orange-600 to-amber-700 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}>
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
          <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <SmallStat label="Total Pairs" value={stats.stock} tone="orange" />
            <SmallStat label="Available Sizes" value={stats.availableSizes} tone="emerald" />
            <SmallStat label="Out of Stock" value={stats.outSizes} tone="rose" />
            <SmallStat label="Reserved" value={stats.totalReserved} tone="amber" />
          </section>

          {profile?.sizingNotes && (
            <section className="rounded-2xl bg-amber-50 border-2 border-amber-200 p-4 flex items-start gap-3">
              <Info className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-extrabold text-amber-900 text-sm">Sizing Note</h4>
                <p className="text-xs text-amber-800 font-semibold mt-0.5">{profile.sizingNotes}</p>
                {profile.runsSmall && <div className="text-xs text-amber-800 font-extrabold mt-1">⚠️ Runs small — suggest customer go 1 size up</div>}
                {profile.runsLarge && <div className="text-xs text-blue-800 font-extrabold mt-1">⚠️ Runs large — suggest customer go 1 size down</div>}
              </div>
            </section>
          )}
        </div>
      )}

      {/* SIZE GRID TAB (KEY) */}
      {tab === 'sizes' && (
        <Panel icon={Ruler} title={`Size Grid — ${stats.totalSizes} sizes`} desc={`${stats.stock} total pairs • ${stats.availableSizes} sizes available`} tone="orange"
          empty={(sizeVariants as any[]).length === 0}
          emptyText="No sizes added yet"
          emptyAction={<Link to={`/shoe-products/${id}/edit`}><Button className="bg-orange-600"><Edit3 className="h-4 w-4" /> Add Sizes</Button></Link>}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b-2 border-slate-200">
                <tr>
                  <Th>Size</Th>
                  <Th className="text-center">Stock</Th>
                  <Th className="text-center">Reserved</Th>
                  <Th className="text-center">Available</Th>
                  <Th>Box #</Th>
                  <Th>Shelf</Th>
                  <Th>SKU</Th>
                  <Th className="text-right">Price</Th>
                  <Th className="text-center">Sold</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(sizeVariants as any[])
                  .sort((a, b) => parseFloat(a.size) - parseFloat(b.size))
                  .map((v) => {
                    const available = v.stock - v.reservedStock;
                    const isOut = v.stock <= 0;
                    const isLow = !isOut && v.stock <= v.lowStockAlert;
                    return (
                      <tr key={v.id} className={`${isOut ? 'bg-rose-50/40' : isLow ? 'bg-amber-50/40' : 'hover:bg-orange-50/40'} transition`}>
                        <td className="px-3 py-3">
                          <div className="inline-flex items-center gap-2">
                            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-orange-500 to-amber-700 text-white flex items-center justify-center font-extrabold shadow">
                              {v.size}
                            </div>
                            <div>
                              <div className="text-[10px] font-extrabold text-slate-500">{v.sizeSystem}</div>
                              <div className="text-[10px] font-extrabold text-slate-500">{v.width}</div>
                            </div>
                          </div>
                        </td>
                        <td className={`px-3 py-3 text-center font-extrabold tabular-nums ${isOut ? 'text-rose-700' : isLow ? 'text-amber-700' : 'text-slate-900'}`}>{v.stock}</td>
                        <td className="px-3 py-3 text-center text-xs font-bold text-amber-700 tabular-nums">{v.reservedStock || '—'}</td>
                        <td className={`px-3 py-3 text-center font-extrabold tabular-nums ${available <= 0 ? 'text-rose-700' : 'text-emerald-700'}`}>{available}</td>
                        <td className="px-3 py-3">
                          {v.boxNumber ? (
                            <span className="inline-flex items-center gap-1 font-mono font-extrabold text-xs bg-slate-100 px-2 py-1 rounded-lg">
                              <Package className="h-3 w-3" /> {v.boxNumber}
                            </span>
                          ) : <span className="text-[10px] text-slate-400 font-bold">—</span>}
                        </td>
                        <td className="px-3 py-3">
                          {v.shelfLocation ? (
                            <span className="inline-flex items-center gap-1 font-mono text-xs">
                              <MapPin className="h-3 w-3 text-orange-600" /> {v.shelfLocation}
                            </span>
                          ) : <span className="text-[10px] text-slate-400 font-bold">—</span>}
                        </td>
                        <td className="px-3 py-3 text-[10px] font-mono font-bold text-slate-600">{v.sku || '—'}</td>
                        <td className="px-3 py-3 text-right font-extrabold text-emerald-700 tabular-nums text-sm">
                          {v.priceOverride ? formatPKR(v.priceOverride) : <span className="text-slate-400 text-xs">default</span>}
                        </td>
                        <td className="px-3 py-3 text-center text-xs font-bold text-slate-700">{v.totalSold || 0}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {/* DETAILS */}
      {tab === 'details' && (
        <Panel icon={Sparkles} title="Product Details" tone="violet" empty={!profile}>
          {profile && (
            <div className="p-5 grid sm:grid-cols-2 gap-3">
              {profile.modelName && <InfoRow label="Model Name" value={profile.modelName} />}
              {profile.modelCode && <InfoRow label="Model Code" value={profile.modelCode} mono />}
              {profile.collection && <InfoRow label="Collection" value={profile.collection} />}
              {profile.season && <InfoRow label="Season" value={profile.season} />}
              {profile.ageGroup && <InfoRow label="Age Group" value={profile.ageGroup} />}
              {profile.gender && <InfoRow label="Gender" value={profile.gender} />}
              {profile.brand && <InfoRow label="Brand" value={profile.brand.name} />}
              {profile.warrantyMonths && <InfoRow label="Warranty" value={`${profile.warrantyMonths} months`} />}
              {profile.warrantyDetails && <InfoRow label="Warranty Details" value={profile.warrantyDetails} full />}
              {profile.careInstructions && <InfoRow label="Care Instructions" value={profile.careInstructions} full />}
              {profile.cleaningRecommendation && <InfoRow label="Cleaning" value={profile.cleaningRecommendation} full />}
            </div>
          )}
        </Panel>
      )}

      {/* MATERIALS */}
      {tab === 'materials' && (
        <Panel icon={Palette} title="Materials & Style" tone="rose" empty={!profile}>
          {profile && (
            <div className="p-5 grid sm:grid-cols-2 gap-3">
              {profile.upperMaterial && <InfoRow label="Upper Material" value={profile.upperMaterial} />}
              {profile.soleMaterial && <InfoRow label="Sole Material" value={profile.soleMaterial} />}
              {profile.innerMaterial && <InfoRow label="Inner Material" value={profile.innerMaterial} />}
              {profile.liningMaterial && <InfoRow label="Lining" value={profile.liningMaterial} />}
              {profile.patternType && <InfoRow label="Pattern" value={profile.patternType} />}
              {profile.closureType && <InfoRow label="Closure" value={profile.closureType} />}
              {profile.toeShape && <InfoRow label="Toe Shape" value={profile.toeShape} />}
              {profile.heelHeight && <InfoRow label="Heel Height" value={profile.heelHeight} />}
              {profile.heelType && <InfoRow label="Heel Type" value={profile.heelType} />}
              {profile.soleType && <InfoRow label="Sole Type" value={profile.soleType} />}
              {profile.includesBox !== undefined && (
                <div className="col-span-2 rounded-xl bg-slate-50 border-2 border-slate-200 p-3">
                  <div className="text-[10px] uppercase font-extrabold text-slate-500 mb-2">Box Contents</div>
                  <div className="flex flex-wrap gap-2">
                    {profile.includesBox && <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-extrabold">✓ Original Box</span>}
                    {profile.includesDustBag && <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-extrabold">✓ Dust Bag</span>}
                    {profile.includesExtraLaces && <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-extrabold">✓ Extra Laces</span>}
                  </div>
                </div>
              )}
            </div>
          )}
        </Panel>
      )}

      {/* FEATURES */}
      {tab === 'features' && (
        <Panel icon={Shield} title="Features" tone="emerald" empty={!profile}>
          {profile && (
            <div className="p-5">
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <FeatureBadge active={profile.isWaterproof} icon="💧" label="Waterproof" />
                <FeatureBadge active={profile.isBreathable} icon="💨" label="Breathable" />
                <FeatureBadge active={profile.hasAirCushion} icon="✨" label="Air Cushion" />
                <FeatureBadge active={profile.hasArchSupport} icon="🛡️" label="Arch Support" />
                <FeatureBadge active={profile.isOrthopedic} icon="🩹" label="Orthopedic" />
                <FeatureBadge active={profile.isVegan} icon="🌱" label="Vegan" />
                <FeatureBadge active={profile.isHandmade} icon="✋" label="Handmade" />
              </div>
              {profile.sport && (
                <div className="mt-4 rounded-2xl bg-emerald-50 border-2 border-emerald-200 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Trophy className="h-5 w-5 text-emerald-700" />
                    <h4 className="font-extrabold text-emerald-900">Sports Details</h4>
                  </div>
                  <InfoRow label="Sport" value={profile.sport} />
                  {profile.playingSurface?.length > 0 && (
                    <div className="mt-2">
                      <div className="text-[10px] uppercase font-extrabold text-emerald-700 mb-1">Playing Surface</div>
                      <div className="flex flex-wrap gap-1.5">
                        {profile.playingSurface.map((s: string) => (
                          <span key={s} className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-extrabold">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </Panel>
      )}

      {/* LOG */}
      {tab === 'log' && (
        <Panel icon={History} title="Stock Movement Log" tone="slate" empty={true} emptyText="Detailed stock log coming soon" />
      )}
    </div>
  );
}

function Chip({ icon: Icon, children, tone = 'default' }: any) {
  const tones: Record<string, string> = {
    default: 'bg-white/10',
    emerald: 'bg-emerald-500/30 border border-emerald-300/40',
    rose: 'bg-rose-500/30 border border-rose-300/40',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md backdrop-blur font-bold ${tones[tone]}`}>
      {Icon && <Icon className="h-3 w-3" />} {children}
    </span>
  );
}

function HeroStat({ icon: Icon, label, value, sub, tone }: any) {
  const tones: Record<string, string> = {
    orange: 'from-orange-400/30 to-orange-600/20 border-orange-300/40',
    emerald: 'from-emerald-400/30 to-emerald-600/20 border-emerald-300/40',
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

function Panel({ icon: Icon, title, desc, tone, children, empty, emptyText, emptyAction }: any) {
  const tones: Record<string, string> = {
    orange: 'from-orange-500 to-amber-700',
    violet: 'from-violet-500 to-purple-700',
    rose: 'from-rose-500 to-red-700',
    emerald: 'from-emerald-500 to-teal-700',
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
          {desc && <p className="text-xs text-slate-500 font-semibold">{desc}</p>}
        </div>
      </div>
      {empty ? (
        <div className="p-12 text-center">
          <Icon className="h-12 w-12 text-slate-300 mx-auto mb-2" />
          <div className="font-extrabold text-slate-700">{emptyText || 'No data'}</div>
          {emptyAction && <div className="mt-4 flex justify-center">{emptyAction}</div>}
        </div>
      ) : children}
    </section>
  );
}

function InfoRow({ label, value, mono, full }: any) {
  return (
    <div className={full ? 'col-span-2' : ''}>
      <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500">{label}</div>
      <div className={`text-sm font-bold text-slate-900 mt-0.5 ${mono ? 'font-mono' : ''}`}>{value}</div>
    </div>
  );
}

function SmallStat({ label, value, tone }: any) {
  const tones: Record<string, string> = {
    orange: 'from-orange-500 to-amber-700', emerald: 'from-emerald-500 to-teal-700',
    rose: 'from-rose-500 to-red-700', amber: 'from-amber-500 to-orange-600',
  };
  return (
    <div className="rounded-2xl bg-white border-2 border-slate-200 p-4">
      <div className="text-[10px] uppercase font-extrabold text-slate-500">{label}</div>
      <div className="text-3xl font-extrabold text-slate-900 tabular-nums mt-1">{value}</div>
    </div>
  );
}

function FeatureBadge({ active, icon, label }: any) {
  return (
    <div className={`rounded-xl p-3 border-2 flex items-center gap-2 ${
      active ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-slate-50 opacity-50'}`}>
      <span className="text-2xl">{icon}</span>
      <div className="min-w-0">
        <div className={`font-extrabold text-sm ${active ? 'text-emerald-900' : 'text-slate-500'}`}>{label}</div>
        <div className="text-[10px] font-bold">{active ? '✓ Yes' : '—'}</div>
      </div>
    </div>
  );
}

function Th({ children, className = '' }: any) {
  return <th className={`px-3 py-3 text-left text-[10px] font-extrabold uppercase tracking-wider text-slate-700 ${className}`}>{children}</th>;
}
