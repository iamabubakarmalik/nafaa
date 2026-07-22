import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Gem, Search, RefreshCw, Sparkles, Star, TrendingUp, ShieldCheck,
  Diamond, Heart, Scale, Award, Trash2,
} from 'lucide-react';
import { jewelryProductsApi, type JewelryCategory } from '../api/products.api';
import { formatPKR } from '@/lib/format';
import { toast } from 'sonner';

const CATEGORIES: { value: JewelryCategory; label: string; emoji: string }[] = [
  { value: 'RING', label: 'Ring', emoji: '💍' },
  { value: 'NECKLACE', label: 'Necklace', emoji: '📿' },
  { value: 'EARRINGS', label: 'Earrings', emoji: '👂' },
  { value: 'BANGLE', label: 'Bangle', emoji: '⭕' },
  { value: 'BRACELET', label: 'Bracelet', emoji: '⛓️' },
  { value: 'PENDANT', label: 'Pendant', emoji: '💎' },
  { value: 'CHAIN', label: 'Chain', emoji: '⛓️' },
  { value: 'NOSE_PIN', label: 'Nose Pin', emoji: '👃' },
  { value: 'JHUMKA', label: 'Jhumka', emoji: '💫' },
  { value: 'CHOKER', label: 'Choker', emoji: '⚜️' },
  { value: 'MANGALSUTRA', label: 'Mangalsutra', emoji: '📿' },
  { value: 'KUNDAN_SET', label: 'Kundan Set', emoji: '👑' },
  { value: 'BRIDAL_SET', label: 'Bridal Set', emoji: '👰' },
  { value: 'KADA', label: 'Kada', emoji: '🔗' },
  { value: 'PAYAL', label: 'Payal', emoji: '🦶' },
  { value: 'COIN', label: 'Coin', emoji: '🪙' },
  { value: 'BAR', label: 'Bar', emoji: '📊' },
];

const METAL_TYPES = [
  { value: 'GOLD', label: 'Gold', emoji: '🥇' },
  { value: 'SILVER', label: 'Silver', emoji: '🥈' },
  { value: 'PLATINUM', label: 'Platinum', emoji: '💠' },
  { value: 'ROSE_GOLD', label: 'Rose Gold', emoji: '🌹' },
  { value: 'WHITE_GOLD', label: 'White Gold', emoji: '⚪' },
];

export default function JewelryProductsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [metalFilter, setMetalFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');

  const { data: profiles = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['jewelry-products', categoryFilter, metalFilter, tagFilter, search],
    queryFn: () => jewelryProductsApi.list({
      category: categoryFilter === 'all' ? undefined : categoryFilter,
      metalType: metalFilter === 'all' ? undefined : metalFilter,
      featured: tagFilter === 'featured' ? true : undefined,
      isBridalCollection: tagFilter === 'bridal' ? true : undefined,
      isFestivalSpecial: tagFilter === 'festival' ? true : undefined,
      hasDiamond: tagFilter === 'diamond' ? true : undefined,
      search: search.trim() || undefined,
    }),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => jewelryProductsApi.remove(id),
    onSuccess: () => { toast.success('Removed'); queryClient.invalidateQueries({ queryKey: ['jewelry-products'] }); },
  });

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-amber-900 to-yellow-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Jewelry Catalog
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">💎 Jewelry Products</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">Rings, necklaces, bridal — sab collection</p>
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
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products, SKU..." className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-amber-500" />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button onClick={() => setCategoryFilter('all')} className={
            'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
            (categoryFilter === 'all' ? 'bg-amber-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
          }>All</button>
          {CATEGORIES.map((c) => (
            <button key={c.value} onClick={() => setCategoryFilter(c.value)} className={
              'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
              (categoryFilter === c.value ? 'bg-amber-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
            }>{c.emoji} {c.label}</button>
          ))}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <button onClick={() => setMetalFilter('all')} className={
            'px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
            (metalFilter === 'all' ? 'bg-yellow-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
          }>All Metals</button>
          {METAL_TYPES.map((m) => (
            <button key={m.value} onClick={() => setMetalFilter(m.value)} className={
              'px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
              (metalFilter === m.value ? 'bg-yellow-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
            }>{m.emoji} {m.label}</button>
          ))}
          <div className="w-px bg-slate-200 mx-1" />
          {[
            { v: 'all', label: 'All' },
            { v: 'featured', label: '⭐ Featured' },
            { v: 'bridal', label: '👰 Bridal' },
            { v: 'festival', label: '🎉 Festival' },
            { v: 'diamond', label: '💎 Diamond' },
          ].map((t) => (
            <button key={t.v} onClick={() => setTagFilter(t.v)} className={
              'px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
              (tagFilter === t.v ? 'bg-rose-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
            }>{t.label}</button>
          ))}
        </div>
      </section>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-80 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}
        </div>
      ) : profiles.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed border-slate-200 dark:border-neutral-800 p-12 text-center">
          <Gem className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">No jewelry products yet</p>
        </div>
      ) : (
        <section className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {profiles.map((profile) => (
            <ProductCard
              key={profile.id}
              profile={profile}
              onDelete={() => { if (confirm('Remove this product?')) removeMutation.mutate(profile.id); }}
            />
          ))}
        </section>
      )}
    </div>
  );
}

function ProductCard({ profile, onDelete }: any) {
  const product = profile.product;
  const category = CATEGORIES.find((c) => c.value === profile.category);
  const metal = METAL_TYPES.find((m) => m.value === profile.metalType);
  const purityLabel = profile.purity.replace('KARAT_', '').replace('SILVER_', 'S') + 'K';

  return (
    <Link to={'/products/' + profile.productId + '/edit'} className={
      'group rounded-2xl bg-white dark:bg-neutral-900 border-2 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all overflow-hidden ' +
      (profile.isFeatured ? 'border-amber-400 ring-2 ring-amber-100 dark:ring-amber-950/40' : 'border-slate-200 dark:border-neutral-800')
    }>
      <div className="relative aspect-square bg-gradient-to-br from-amber-500 via-yellow-600 to-amber-700 overflow-hidden">
        {product?.images?.[0]?.url ? (
          <img src={product.images[0].url} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-6xl">{category?.emoji || '💎'}</span>
          </div>
        )}

        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {profile.isFeatured && (
            <span className="px-1.5 py-0.5 rounded bg-amber-500 text-white text-[9px] font-extrabold uppercase shadow">
              <Star className="h-2 w-2 fill-current inline" /> Featured
            </span>
          )}
          {profile.isBridalCollection && (
            <span className="px-1.5 py-0.5 rounded bg-rose-500 text-white text-[9px] font-extrabold uppercase shadow">👰 Bridal</span>
          )}
          {profile.hasDiamond && (
            <span className="px-1.5 py-0.5 rounded bg-cyan-500 text-white text-[9px] font-extrabold uppercase shadow">
              <Diamond className="h-2 w-2 inline" /> Diamond
            </span>
          )}
          {profile.hallmarkNumber && (
            <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[9px] font-extrabold uppercase shadow inline-flex items-center gap-0.5">
              <ShieldCheck className="h-2 w-2" /> Hallmark
            </span>
          )}
        </div>

        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={(e) => { e.preventDefault(); onDelete(); }} className="h-8 w-8 rounded-lg bg-rose-600/90 text-white flex items-center justify-center shadow">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="absolute bottom-2 right-2 rounded-lg bg-slate-900/70 backdrop-blur px-2 py-1 text-white text-[10px] font-extrabold">
          {metal?.emoji} {purityLabel}
        </div>
      </div>

      <div className="p-3 space-y-2">
        <div>
          <h3 className="font-extrabold text-sm text-slate-900 dark:text-white line-clamp-1">{product?.name}</h3>
          {profile.itemCode && <div className="text-[10px] font-mono font-bold text-slate-500">{profile.itemCode}</div>}
          <div className="text-[10px] font-extrabold uppercase text-amber-600">{category?.label}</div>
        </div>

        <div className="grid grid-cols-2 gap-1 text-xs">
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 p-1.5 text-center">
            <div className="text-[9px] uppercase font-extrabold text-amber-700 flex items-center justify-center gap-0.5">
              <Scale className="h-2.5 w-2.5" /> Gross
            </div>
            <div className="text-sm font-extrabold text-amber-900 tabular-nums">{profile.grossWeight.toFixed(2)}g</div>
          </div>
          <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-1.5 text-center">
            <div className="text-[9px] uppercase font-extrabold text-emerald-700">Net</div>
            <div className="text-sm font-extrabold text-emerald-800 tabular-nums">{profile.netWeight.toFixed(2)}g</div>
          </div>
        </div>

        {(profile.makingChargePct > 0 || profile.makingChargePerGram > 0) && (
          <div className="text-[10px] font-bold text-slate-600">
            Making: {profile.makingChargePct > 0 && profile.makingChargePct + '%'}
            {profile.makingChargePerGram > 0 && ' Rs' + profile.makingChargePerGram + '/g'}
          </div>
        )}

        {profile.hasStones && profile.stoneCaret && (
          <div className="text-[10px] font-bold text-cyan-700 inline-flex items-center gap-1">
            <Diamond className="h-2.5 w-2.5" />
            {profile.stoneCaret}ct • {profile.stoneCount} stones
          </div>
        )}

        <div className="pt-2 border-t border-slate-100 dark:border-neutral-800 flex items-end justify-between">
          <div>
            <div className="text-lg font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums leading-none">{formatPKR(product?.price ?? 0)}</div>
            <div className="text-[9px] font-bold text-slate-500 mt-0.5">Estimated</div>
          </div>
          {profile.totalSold > 0 && (
            <div className="text-right">
              <div className="text-[10px] font-extrabold text-slate-500">Sold</div>
              <div className="text-xs font-extrabold text-slate-700 tabular-nums">{profile.totalSold}</div>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
