import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Package, Plus, Search, X, RefreshCw, Sparkles, Star, TrendingUp,
  Truck, Award, Zap, ShieldCheck, MapPin, DollarSign, Ruler,
  ArrowUpRight, ArrowRight, Filter, Layers,
} from 'lucide-react';
import { hardwareProductsApi, type CategoryType, type Unit } from '../api/products.api';
import { hardwareBrandsApi } from '../api/brands.api';
import { formatPKR } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';

const CATEGORIES: { value: CategoryType; label: string; emoji: string; group: string }[] = [
  { value: 'CEMENT', label: 'Cement', emoji: '🧱', group: 'Building' },
  { value: 'STEEL_REBAR', label: 'Steel Rebar', emoji: '🔩', group: 'Steel' },
  { value: 'STEEL_SHEET', label: 'Steel Sheet', emoji: '⚙️', group: 'Steel' },
  { value: 'STEEL_PIPE', label: 'Steel Pipe', emoji: '🔧', group: 'Steel' },
  { value: 'BRICKS', label: 'Bricks', emoji: '🧱', group: 'Building' },
  { value: 'BLOCKS', label: 'Blocks', emoji: '🟫', group: 'Building' },
  { value: 'SAND', label: 'Sand', emoji: '🏖️', group: 'Aggregates' },
  { value: 'GRAVEL', label: 'Gravel', emoji: '🪨', group: 'Aggregates' },
  { value: 'CRUSH', label: 'Crush', emoji: '⛰️', group: 'Aggregates' },
  { value: 'TILES_FLOOR', label: 'Floor Tiles', emoji: '🟦', group: 'Tiles' },
  { value: 'TILES_WALL', label: 'Wall Tiles', emoji: '🟩', group: 'Tiles' },
  { value: 'MARBLE', label: 'Marble', emoji: '⬜', group: 'Tiles' },
  { value: 'GRANITE', label: 'Granite', emoji: '⬛', group: 'Tiles' },
  { value: 'SANITARY_WARE', label: 'Sanitary', emoji: '🚽', group: 'Plumbing' },
  { value: 'PLUMBING_PIPE', label: 'Pipes', emoji: '🔵', group: 'Plumbing' },
  { value: 'PLUMBING_FITTING', label: 'Fittings', emoji: '🔗', group: 'Plumbing' },
  { value: 'ELECTRIC_WIRE', label: 'Wires', emoji: '⚡', group: 'Electric' },
  { value: 'ELECTRIC_SWITCH', label: 'Switches', emoji: '🔌', group: 'Electric' },
  { value: 'ELECTRIC_CONDUIT', label: 'Conduits', emoji: '🔦', group: 'Electric' },
  { value: 'PAINT', label: 'Paint', emoji: '🎨', group: 'Paint' },
  { value: 'PRIMER', label: 'Primer', emoji: '🖌️', group: 'Paint' },
  { value: 'THINNER', label: 'Thinner', emoji: '🧴', group: 'Paint' },
  { value: 'WOOD_LUMBER', label: 'Wood/Lumber', emoji: '🪵', group: 'Wood' },
  { value: 'PLYWOOD', label: 'Plywood', emoji: '📋', group: 'Wood' },
  { value: 'MDF', label: 'MDF', emoji: '📄', group: 'Wood' },
  { value: 'HARDWARE_TOOL', label: 'Tools', emoji: '🔨', group: 'Tools' },
  { value: 'POWER_TOOL', label: 'Power Tools', emoji: '🪚', group: 'Tools' },
  { value: 'HAND_TOOL', label: 'Hand Tools', emoji: '🔧', group: 'Tools' },
  { value: 'FASTENER', label: 'Fasteners', emoji: '🔩', group: 'Tools' },
  { value: 'ADHESIVE', label: 'Adhesive', emoji: '🧴', group: 'Chemicals' },
  { value: 'WATERPROOFING', label: 'Waterproofing', emoji: '💧', group: 'Chemicals' },
  { value: 'INSULATION', label: 'Insulation', emoji: '🧊', group: 'Chemicals' },
  { value: 'DOOR', label: 'Doors', emoji: '🚪', group: 'Fixtures' },
  { value: 'WINDOW', label: 'Windows', emoji: '🪟', group: 'Fixtures' },
  { value: 'GLASS', label: 'Glass', emoji: '🪞', group: 'Fixtures' },
  { value: 'ALUMINUM', label: 'Aluminum', emoji: '🥈', group: 'Metal' },
  { value: 'IRON_FABRICATION', label: 'Iron Fab', emoji: '⚒️', group: 'Metal' },
  { value: 'ROOFING', label: 'Roofing', emoji: '🏠', group: 'Fixtures' },
  { value: 'SAFETY_EQUIPMENT', label: 'Safety', emoji: '🦺', group: 'Safety' },
  { value: 'OTHER', label: 'Other', emoji: '📦', group: 'Other' },
];

const UNITS: { value: Unit; label: string }[] = [
  { value: 'BAG', label: 'Bag' }, { value: 'KG', label: 'KG' }, { value: 'TON', label: 'Ton' },
  { value: 'PIECE', label: 'Piece' }, { value: 'DOZEN', label: 'Dozen' }, { value: 'CARTON', label: 'Carton' },
  { value: 'METER', label: 'Meter' }, { value: 'FEET', label: 'Feet' }, { value: 'INCH', label: 'Inch' },
  { value: 'SQFT', label: 'Sq.Ft' }, { value: 'SQMETER', label: 'Sq.M' },
  { value: 'CUBIC_FEET', label: 'Cu.Ft' }, { value: 'CUBIC_METER', label: 'Cu.M' },
  { value: 'LITER', label: 'Liter' }, { value: 'GALLON', label: 'Gallon' },
  { value: 'BUNDLE', label: 'Bundle' }, { value: 'ROLL', label: 'Roll' },
  { value: 'SHEET', label: 'Sheet' }, { value: 'BOX', label: 'Box' },
  { value: 'SET', label: 'Set' }, { value: 'TRIP', label: 'Trip' },
];

export default function HardwareProductsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [brandFilter, setBrandFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');

  const { data: profiles = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['hardware-products', categoryFilter, brandFilter, tagFilter, search],
    queryFn: () => hardwareProductsApi.list({
      categoryType: categoryFilter === 'all' ? undefined : categoryFilter,
      brandId: brandFilter === 'all' ? undefined : brandFilter,
      featured: tagFilter === 'featured' ? true : undefined,
      bestSeller: tagFilter === 'bestseller' ? true : undefined,
      fastMoving: tagFilter === 'fastmoving' ? true : undefined,
      requiresTruck: tagFilter === 'truck' ? true : undefined,
      search: search.trim() || undefined,
    }),
  });

  const { data: brands = [] } = useQuery({
    queryKey: ['hardware-brands-list'],
    queryFn: () => hardwareBrandsApi.list({ active: true }),
  });

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-amber-900 to-orange-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Product Catalog
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">📦 Hardware Products</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">Cement, steel, tiles, paint — all inventory</p>
          </div>
          <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
            <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
            Refresh
          </button>
        </div>
      </section>

      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products..." className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-amber-500" />
        </div>

        {/* Category filter */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button onClick={() => setCategoryFilter('all')} className={
            'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
            (categoryFilter === 'all' ? 'bg-amber-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
          }>All Categories</button>
          {CATEGORIES.map((c) => (
            <button key={c.value} onClick={() => setCategoryFilter(c.value)} className={
              'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
              (categoryFilter === c.value ? 'bg-amber-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
            }>
              {c.emoji} {c.label}
            </button>
          ))}
        </div>

        {/* Brand + Tag filters */}
        <div className="flex gap-2 flex-wrap">
          <select value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)} className="h-9 rounded-lg border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-xs font-bold focus:outline-none focus:border-amber-500">
            <option value="all">All Brands</option>
            {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>

          {[
            { v: 'all', label: 'All' },
            { v: 'featured', label: '⭐ Featured' },
            { v: 'bestseller', label: '🏆 Best Seller' },
            { v: 'fastmoving', label: '⚡ Fast Moving' },
            { v: 'truck', label: '🚚 Needs Truck' },
          ].map((t) => (
            <button key={t.v} onClick={() => setTagFilter(t.v)} className={
              'px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
              (tagFilter === t.v ? 'bg-amber-900 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
            }>{t.label}</button>
          ))}
        </div>
      </section>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-72 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}
        </div>
      ) : profiles.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed border-slate-200 dark:border-neutral-800 p-12 text-center">
          <Package className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">No hardware products yet</p>
          <p className="text-xs text-slate-500 mt-1">Add products from Products module, then set hardware profile</p>
        </div>
      ) : (
        <section className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {profiles.map((profile) => <ProductCard key={profile.id} profile={profile} />)}
        </section>
      )}
    </div>
  );
}

function ProductCard({ profile }: { profile: any }) {
  const category = CATEGORIES.find((c) => c.value === profile.categoryType);
  const p = profile.product;

  return (
    <Link
      to={'/products/' + profile.productId + '/edit'}
      className={
        'group rounded-2xl bg-white dark:bg-neutral-900 border-2 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all overflow-hidden ' +
        (profile.isFeatured ? 'border-amber-400' : 'border-slate-200 dark:border-neutral-800')
      }
    >
      <div className="relative aspect-video bg-gradient-to-br from-amber-500 to-orange-600 overflow-hidden">
        {p?.images?.[0]?.url ? (
          <img src={p.images[0].url} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-5xl">{category?.emoji || '📦'}</span>
          </div>
        )}

        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {profile.isFeatured && (
            <span className="px-1.5 py-0.5 rounded bg-amber-500 text-white text-[9px] font-extrabold uppercase inline-flex items-center gap-0.5 shadow">
              <Star className="h-2 w-2 fill-current" />
              Featured
            </span>
          )}
          {profile.isBestSeller && (
            <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-white text-[9px] font-extrabold uppercase inline-flex items-center gap-0.5 shadow">
              <TrendingUp className="h-2 w-2" />
              Best
            </span>
          )}
          {profile.isFastMoving && (
            <span className="px-1.5 py-0.5 rounded bg-red-500 text-white text-[9px] font-extrabold uppercase inline-flex items-center gap-0.5 shadow">
              <Zap className="h-2 w-2" />
              Fast
            </span>
          )}
        </div>

        <div className="absolute top-2 right-2 flex flex-col gap-1">
          {profile.requiresTruck && (
            <span className="h-7 w-7 rounded bg-slate-900/70 backdrop-blur text-white flex items-center justify-center shadow" title="Requires Truck">
              <Truck className="h-3.5 w-3.5" />
            </span>
          )}
          {profile.hasIsoCertification && (
            <span className="h-7 w-7 rounded bg-blue-600/90 backdrop-blur text-white flex items-center justify-center shadow" title="ISO Certified">
              <ShieldCheck className="h-3.5 w-3.5" />
            </span>
          )}
        </div>
      </div>

      <div className="p-4 space-y-2">
        <div>
          <h3 className="font-extrabold text-slate-900 dark:text-white line-clamp-1">{p?.name}</h3>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {profile.brand && (
              <span className="text-[10px] font-extrabold text-amber-700">{profile.brand.name}</span>
            )}
            {category && (
              <span className="text-[10px] font-bold text-slate-500">• {category.label}</span>
            )}
          </div>
        </div>

        {/* Category-specific details */}
        <div className="grid grid-cols-2 gap-1 text-xs">
          {profile.grade && (
            <div className="rounded bg-blue-50 dark:bg-blue-950/30 p-1.5">
              <div className="text-[8px] uppercase font-extrabold text-blue-700">Grade</div>
              <div className="font-extrabold text-blue-900">{profile.grade}</div>
            </div>
          )}
          {profile.diameter && (
            <div className="rounded bg-purple-50 dark:bg-purple-950/30 p-1.5">
              <div className="text-[8px] uppercase font-extrabold text-purple-700">Dia</div>
              <div className="font-extrabold text-purple-900">{profile.diameter}</div>
            </div>
          )}
          {profile.bagWeight && (
            <div className="rounded bg-amber-50 dark:bg-amber-950/30 p-1.5">
              <div className="text-[8px] uppercase font-extrabold text-amber-700">Bag</div>
              <div className="font-extrabold text-amber-900">{profile.bagWeight}kg</div>
            </div>
          )}
          {profile.tileSize && (
            <div className="rounded bg-cyan-50 dark:bg-cyan-950/30 p-1.5">
              <div className="text-[8px] uppercase font-extrabold text-cyan-700">Size</div>
              <div className="font-extrabold text-cyan-900">{profile.tileSize}</div>
            </div>
          )}
          {profile.colorName && (
            <div className="rounded bg-fuchsia-50 dark:bg-fuchsia-950/30 p-1.5">
              <div className="text-[8px] uppercase font-extrabold text-fuchsia-700">Color</div>
              <div className="font-extrabold text-fuchsia-900 truncate">{profile.colorName}</div>
            </div>
          )}
          {profile.litersPerCan && (
            <div className="rounded bg-cyan-50 dark:bg-cyan-950/30 p-1.5">
              <div className="text-[8px] uppercase font-extrabold text-cyan-700">Can</div>
              <div className="font-extrabold text-cyan-900">{profile.litersPerCan}L</div>
            </div>
          )}
        </div>

        <div className="pt-2 border-t border-slate-100 dark:border-neutral-800 flex items-end justify-between">
          <div>
            <div className="text-[10px] font-extrabold text-slate-500 uppercase">{profile.unit}</div>
            <div className="text-lg font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">{formatPKR(p?.price ?? 0)}</div>
            {profile.bulkPrice && (
              <div className="text-[10px] font-extrabold text-blue-700">Bulk: {formatPKR(profile.bulkPrice)}</div>
            )}
          </div>
          <div className="text-right">
            <div className="text-xs font-extrabold text-slate-500">Stock</div>
            <div className={
              'text-lg font-extrabold tabular-nums ' +
              ((p?.stock ?? 0) <= 0 ? 'text-rose-700' : (p?.stock ?? 0) < 10 ? 'text-amber-700' : 'text-slate-900')
            }>{p?.stock ?? 0}</div>
          </div>
        </div>
      </div>
    </Link>
  );
}
