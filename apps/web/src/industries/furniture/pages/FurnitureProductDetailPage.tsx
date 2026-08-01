import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Edit3, Boxes, Package, DollarSign, TrendingUp, Star,
  Sofa, Receipt, ShoppingCart, Hash, Tag, Trash2, AlertTriangle,
  History, Info, Ruler, Palette, Shield, Truck, Hammer,
  Leaf, Droplets, Bug, MapPin, TreePine,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@core/ui/Button';
import { formatPKR, formatPKRFull } from '@core/lib/format';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { productVariantsApi } from '@modules/inventory/products/api/product-variants.api';
import { productImagesApi } from '@modules/inventory/products/api/product-images.api';
import { salesApi } from '@modules/sales/sales/api/sales.api';
import { furnitureProductsApi } from '../api/products.api';
import { PrivacyToggle, useCostHidden } from '@core/ui/HiddenValue';

type Tab = 'overview' | 'dimensions' | 'materials' | 'delivery' | 'variants' | 'sales';

export default function FurnitureProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const hideCost = useCostHidden();

  const [tab, setTab] = useState<Tab>('overview');
  const [imgIndex, setImgIndex] = useState(0);

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id], queryFn: () => productsApi.getOne(id!), enabled: !!id,
  });
  const { data: profile } = useQuery({
    queryKey: ['furniture-profile', id], queryFn: () => furnitureProductsApi.byProduct(id!), enabled: !!id,
  });
  const { data: variants = [] } = useQuery({
    queryKey: ['product-variants', id], queryFn: () => productVariantsApi.list(id!), enabled: !!id, staleTime: 0,
  });
  const { data: images = [] } = useQuery({
    queryKey: ['product-images', id], queryFn: () => productImagesApi.list(id!), enabled: !!id,
  });
  const { data: allSales = [] } = useQuery({
    queryKey: ['sales-list-for-product'], queryFn: () => salesApi.list(), enabled: !!id,
  });

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
    const totalSold = soldLines.reduce((a, it) => a + Number(it.quantity || 0), 0);
    const totalRevenue = soldLines.reduce((a, it) => a + Number(it.total || 0), 0);
    return {
      stock, price, cost,
      isOut: stock <= 0,
      isLow: stock > 0 && stock <= Number(product?.lowStockAlert ?? 2),
      stockValue: stock * price,
      stockCost: stock * cost,
      margin: price > 0 ? ((price - cost) / price) * 100 : 0,
      profitPerUnit: price - cost,
      totalSold, totalRevenue,
      variantCount: (variants as any[]).length,
      variantStock: (variants as any[]).reduce((a, v) => a + Number(v.stock || 0), 0),
    };
  }, [product, soldLines, variants]);

  const removeMutation = useMutation({
    mutationFn: () => productsApi.remove(id!),
    onSuccess: (data: any) => {
      toast.success(data?.softDeleted ? 'Product deactivated' : 'Product deleted');
      qc.invalidateQueries({ queryKey: ['furniture-products-list'] });
      navigate('/furniture-products');
    },
  });

  if (isLoading || !product) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-12 w-12 rounded-full border-4 border-amber-200 border-t-amber-700 animate-spin" />
      </div>
    );
  }

  const gallery: any[] = (images as any[]).length ? (images as any[]) : (product.images ?? []);

  const TABS: { id: Tab; label: string; count?: number; icon: any }[] = [
    { id: 'overview', label: 'Overview', icon: Info },
    { id: 'dimensions', label: 'Dimensions', icon: Ruler },
    { id: 'materials', label: 'Materials', icon: Palette },
    { id: 'delivery', label: 'Delivery & Warranty', icon: Truck },
    { id: 'variants', label: 'Variants', count: stats.variantCount, icon: Boxes },
    { id: 'sales', label: 'Sales', count: salesForProduct.length, icon: Receipt },
  ];

  return (
    <div className="space-y-5 pb-10">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button onClick={() => navigate('/furniture-products')} className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-amber-700 font-bold">
          <ArrowLeft className="h-4 w-4" /> All Products
        </button>
        <div className="flex items-center gap-2 flex-wrap">
          <Link to={`/furniture-products/${id}/edit`} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border-2 border-amber-200 hover:bg-amber-100 text-amber-700 text-sm font-extrabold">
            <Edit3 className="h-4 w-4" /> Edit
          </Link>
          <Link to="/pos" className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border-2 border-slate-200 hover:border-amber-300 text-slate-700 text-sm font-extrabold">
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
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-amber-900 to-orange-800 text-white shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="relative grid lg:grid-cols-[280px_1fr] gap-6 p-6">
          <div className="space-y-2">
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-white/10 backdrop-blur border-2 border-white/20">
              {gallery[imgIndex]?.url ? (
                <img src={gallery[imgIndex].url} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/50"><Sofa className="h-16 w-16" /></div>
              )}
              {profile?.isFeatured && (
                <div className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-amber-500 text-white text-[10px] font-extrabold shadow-lg inline-flex items-center gap-1">
                  <Star className="h-3 w-3 fill-white" /> FEATURED
                </div>
              )}
              {profile?.isEcoFriendly && (
                <div className="absolute top-3 left-3 px-2 py-1 rounded-lg bg-green-600 text-white text-[10px] font-extrabold shadow-lg inline-flex items-center gap-1">
                  <Leaf className="h-3 w-3" /> ECO-FRIENDLY
                </div>
              )}
              {profile?.isCustomizable && (
                <div className="absolute bottom-3 left-3 px-2 py-1 rounded-lg bg-violet-600 text-white text-[10px] font-extrabold shadow-lg inline-flex items-center gap-1">
                  <Hammer className="h-3 w-3" /> CUSTOMIZABLE
                </div>
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
              <Sofa className="h-3.5 w-3.5 text-amber-300" /> Furniture
              {profile?.categoryType && (<><span className="text-white/40">•</span><span>{profile.categoryType.replace(/_/g, ' ')}</span></>)}
              {profile?.brand && (<><span className="text-white/40">•</span><span>{profile.brand}</span></>)}
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">{product.name}</h1>
            {product.description && (
              <p className="mt-2 text-sm text-white/85 max-w-2xl line-clamp-2">{product.description}</p>
            )}

            <div className="mt-3 flex items-center gap-2 flex-wrap text-xs">
              {profile?.modelNumber && <Chip icon={Hash}>Model: {profile.modelNumber}</Chip>}
              {product.sku && <Chip icon={Hash}>SKU: {product.sku}</Chip>}
              {profile?.primaryMaterial && <Chip icon={TreePine} tone="amber">{profile.primaryMaterial.replace(/_/g, ' ')}</Chip>}
              {profile?.conditionType && profile.conditionType !== 'BRAND_NEW' && (
                <Chip icon={Tag} tone="rose">{profile.conditionType.replace(/_/g, ' ')}</Chip>
              )}
              {profile?.showroomLocation && (
                <Chip icon={MapPin} tone="blue">{profile.showroomLocation}{profile.showroomFloor ? ` • ${profile.showroomFloor}` : ''}</Chip>
              )}
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
                <div>
                  <div className="text-[10px] uppercase font-extrabold text-white/70 tracking-wider">EMI from</div>
                  <div className="text-xl font-extrabold tabular-nums text-emerald-300 leading-none mt-1">{formatPKRFull(profile.emiStartingFrom)}<span className="text-xs opacity-80">/mo</span></div>
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
              <HeroStat icon={DollarSign} label="Stock Value" value={formatPKR(stats.stockValue)} sub="Retail" tone="emerald" />
              <HeroStat icon={TrendingUp} label="Total Sold" value={String(stats.totalSold)} sub="units" tone="violet" />
              <HeroStat icon={Shield} label="Warranty" value={profile?.warrantyMonths ? `${profile.warrantyMonths}m` : '—'} sub={profile?.warrantyType || 'None'} tone="amber" />
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
            <p className="text-xs font-semibold opacity-90 mt-0.5">Consider restocking or marking as pre-order</p>
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
                  active ? 'bg-gradient-to-br from-amber-700 to-orange-800 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}>
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
      {tab === 'overview' && profile && (
        <div className="grid sm:grid-cols-2 gap-4">
          {profile.brand && <InfoCard label="Brand" value={profile.brand} />}
          {profile.collectionName && <InfoCard label="Collection" value={profile.collectionName} />}
          {profile.designerName && <InfoCard label="Designer" value={profile.designerName} />}
          {profile.countryOfOrigin && <InfoCard label="Country of Origin" value={profile.countryOfOrigin} />}
        </div>
      )}

      {/* DIMENSIONS */}
      {tab === 'dimensions' && (
        <Panel icon={Ruler} title="Dimensions & Capacity" tone="amber" empty={!profile} emptyText="No dimensions">
          {profile && (
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <StatBox label="Length" value={profile.lengthCm ? `${profile.lengthCm} cm` : '—'} tone="amber" />
                <StatBox label="Width" value={profile.widthCm ? `${profile.widthCm} cm` : '—'} tone="amber" />
                <StatBox label="Height" value={profile.heightCm ? `${profile.heightCm} cm` : '—'} tone="amber" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {profile.seatHeightCm && <StatBox label="Seat Height" value={`${profile.seatHeightCm} cm`} tone="blue" />}
                {profile.weightKg && <StatBox label="Weight" value={`${profile.weightKg} kg`} tone="slate" />}
                {profile.seatingCapacity && <StatBox label="Seating" value={String(profile.seatingCapacity)} tone="violet" />}
                {profile.drawersCount && <StatBox label="Drawers" value={String(profile.drawersCount)} tone="orange" />}
                {profile.shelvesCount && <StatBox label="Shelves" value={String(profile.shelvesCount)} tone="emerald" />}
                {profile.storageCompartments && <StatBox label="Compartments" value={String(profile.storageCompartments)} tone="rose" />}
              </div>
            </div>
          )}
        </Panel>
      )}

      {/* MATERIALS */}
      {tab === 'materials' && (
        <Panel icon={Palette} title="Materials & Finish" tone="violet" empty={!profile} emptyText="No material info">
          {profile && (
            <div className="p-5 space-y-4">
              <div className="grid sm:grid-cols-2 gap-3">
                {profile.primaryMaterial && <InfoBox label="Primary Material" value={profile.primaryMaterial.replace(/_/g, ' ')} />}
                {profile.woodType && <InfoBox label="Wood Type" value={profile.woodType} />}
                {profile.woodFinish && <InfoBox label="Finish" value={profile.woodFinish} />}
                {profile.polishType && <InfoBox label="Polish" value={profile.polishType} />}
              </div>
              {(profile.colorName || profile.colorHex) && (
                <div className="rounded-2xl bg-slate-50 border-2 border-slate-200 p-3 flex items-center gap-3">
                  {profile.colorHex && <div className="h-12 w-12 rounded-lg border-2 border-white shadow" style={{ backgroundColor: profile.colorHex }} />}
                  <div>
                    <div className="text-[10px] uppercase font-extrabold text-slate-500">Color</div>
                    <div className="text-base font-extrabold text-slate-900">{profile.colorName || profile.colorHex}</div>
                  </div>
                </div>
              )}
              {(profile.upholsteryFabric || profile.cushionFilling || profile.cushionDensity) && (
                <div className="grid sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                  {profile.upholsteryFabric && <InfoBox label="Fabric" value={profile.upholsteryFabric} />}
                  {profile.cushionFilling && <InfoBox label="Cushion Filling" value={profile.cushionFilling} />}
                  {profile.cushionDensity && <InfoBox label="Density" value={profile.cushionDensity} />}
                </div>
              )}
              {profile.secondaryMaterials?.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase font-extrabold text-slate-500 mb-2">Secondary Materials</div>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.secondaryMaterials.map((m) => (
                      <span key={m} className="px-2.5 py-1 rounded-lg bg-violet-100 text-violet-800 text-xs font-extrabold">
                        {m.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Panel>
      )}

      {/* DELIVERY */}
      {tab === 'delivery' && (
        <Panel icon={Truck} title="Delivery, Assembly & Warranty" tone="blue" empty={!profile} emptyText="No delivery info">
          {profile && (
            <div className="p-5 space-y-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <InfoBox label="Warranty" value={profile.warrantyMonths ? `${profile.warrantyMonths} months (${profile.warrantyType})` : 'None'} tone="blue" />
                <InfoBox label="Assembly Required" value={profile.requiresAssembly ? '✓ Yes' : '✗ No'} tone={profile.requiresAssembly ? 'amber' : 'emerald'} />
                {profile.assemblyTimeMinutes && <InfoBox label="Assembly Time" value={`${profile.assemblyTimeMinutes} min`} tone="slate" />}
                {profile.helpersNeeded && <InfoBox label="Helpers Needed" value={String(profile.helpersNeeded)} tone="orange" />}
                <InfoBox label="Water Resistant" value={profile.isWaterResistant ? '✓ Yes' : '✗ No'} tone={profile.isWaterResistant ? 'sky' : 'slate'} />
                <InfoBox label="Termite Proof" value={profile.isTermiteProof ? '✓ Yes' : '✗ No'} tone={profile.isTermiteProof ? 'emerald' : 'slate'} />
              </div>
              {profile.deliveryChargeBase && (
                <div className="rounded-2xl bg-blue-50 border-2 border-blue-200 p-4">
                  <div className="flex items-center gap-2">
                    <Truck className="h-5 w-5 text-blue-700" />
                    <div>
                      <div className="text-[10px] uppercase font-extrabold text-blue-700">Delivery Charge</div>
                      <div className="text-lg font-extrabold text-blue-900">{formatPKR(profile.deliveryChargeBase)}</div>
                      {profile.freeDeliveryRadius && (
                        <div className="text-xs font-bold text-blue-700">FREE within {profile.freeDeliveryRadius}km</div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {profile.careInstructions && (
                <div>
                  <div className="text-[10px] uppercase font-extrabold text-slate-500 mb-2">Care Instructions</div>
                  <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-sm font-semibold text-slate-700">
                    {profile.careInstructions}
                  </div>
                </div>
              )}
            </div>
          )}
        </Panel>
      )}

      {/* VARIANTS */}
      {tab === 'variants' && (
        <Panel icon={Boxes} title="Variants" tone="orange"
          empty={(variants as any[]).length === 0} emptyText="No variants — single SKU"
          emptyAction={<Link to={`/furniture-products/${id}/edit`}><Button variant="secondary"><Boxes className="h-4 w-4" /> Add Variants</Button></Link>}>
          <div className="p-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(variants as any[]).map((v) => {
              const vStock = Number(v.stock || 0);
              return (
                <div key={v.id} className={`rounded-2xl border-2 p-3 ${vStock <= 0 ? 'border-rose-200 bg-rose-50/40' : 'border-slate-200 bg-white'}`}>
                  <div className="font-extrabold text-slate-900 text-sm truncate">{v.name}</div>
                  <div className="text-[10px] font-mono text-slate-500 mt-0.5">{v.sku || v.barcode || '—'}</div>
                  <div className="mt-2 flex items-end justify-between">
                    <div className="text-base font-extrabold text-emerald-700 tabular-nums">{formatPKRFull(v.price)}</div>
                    <div className={`text-sm font-extrabold tabular-nums ${vStock <= 0 ? 'text-rose-700' : 'text-slate-700'}`}>
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
        <Panel icon={Receipt} title="Sales History" tone="emerald"
          empty={salesForProduct.length === 0} emptyText="No sales yet">
          <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
            {salesForProduct.map((s: any) => {
              const lines = s.items.filter((it: any) => it.product.id === id);
              const qty = lines.reduce((a: number, it: any) => a + Number(it.quantity || 0), 0);
              const rev = lines.reduce((a: number, it: any) => a + Number(it.total || 0), 0);
              return (
                <Link key={s.id} to={`/sales/${s.id}/receipt`} className="block px-5 py-3 hover:bg-amber-50/40 transition">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-extrabold text-sm text-slate-900">{s.saleNumber}</span>
                        <span className="text-[10px] text-slate-500 font-bold">
                          {new Date(s.soldAt).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 font-semibold mt-0.5">
                        {s.customer?.name || 'Walk-in'} • {qty} pieces
                      </div>
                    </div>
                    <div className="font-extrabold text-emerald-700 tabular-nums">{formatPKRFull(rev)}</div>
                  </div>
                </Link>
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
    amber: 'bg-amber-500/30 border border-amber-300/40',
    blue: 'bg-blue-500/30 border border-blue-300/40',
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

function Panel({ icon: Icon, title, tone, children, empty, emptyText, emptyAction }: any) {
  const tones: Record<string, string> = {
    amber: 'from-amber-600 to-orange-800',
    violet: 'from-violet-500 to-purple-700',
    blue: 'from-blue-500 to-cyan-700',
    orange: 'from-orange-500 to-red-700',
    emerald: 'from-emerald-500 to-teal-700',
  };
  return (
    <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b-2 border-slate-100 flex items-center gap-3">
        <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-md`}>
          <Icon className="h-5 w-5" />
        </div>
        <h3 className="font-extrabold text-slate-900 text-lg leading-tight">{title}</h3>
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

function InfoCard({ label, value }: any) {
  return (
    <div className="rounded-2xl bg-white border-2 border-slate-200 p-4">
      <div className="text-[10px] uppercase font-extrabold text-slate-500">{label}</div>
      <div className="text-lg font-extrabold text-slate-900 mt-1">{value}</div>
    </div>
  );
}

function StatBox({ label, value, tone }: any) {
  const tones: Record<string, string> = {
    amber: 'bg-amber-50 border-amber-200 text-amber-800',
    blue: 'bg-blue-50 border-blue-200 text-blue-800',
    violet: 'bg-violet-50 border-violet-200 text-violet-800',
    orange: 'bg-orange-50 border-orange-200 text-orange-800',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    rose: 'bg-rose-50 border-rose-200 text-rose-800',
    slate: 'bg-slate-50 border-slate-200 text-slate-800',
    sky: 'bg-sky-50 border-sky-200 text-sky-800',
  };
  return (
    <div className={`rounded-xl border-2 p-3 text-center ${tones[tone]}`}>
      <div className="text-[10px] uppercase font-extrabold opacity-75">{label}</div>
      <div className="text-xl font-extrabold tabular-nums mt-1">{value}</div>
    </div>
  );
}

function InfoBox({ label, value, tone = 'slate' }: any) {
  const tones: Record<string, string> = {
    slate: 'bg-slate-50 border-slate-200 text-slate-800',
    amber: 'bg-amber-50 border-amber-200 text-amber-800',
    blue: 'bg-blue-50 border-blue-200 text-blue-800',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    sky: 'bg-sky-50 border-sky-200 text-sky-800',
    orange: 'bg-orange-50 border-orange-200 text-orange-800',
  };
  return (
    <div className={`rounded-xl border-2 p-3 ${tones[tone]}`}>
      <div className="text-[10px] uppercase font-extrabold opacity-75">{label}</div>
      <div className="text-base font-extrabold mt-0.5">{value}</div>
    </div>
  );
}
