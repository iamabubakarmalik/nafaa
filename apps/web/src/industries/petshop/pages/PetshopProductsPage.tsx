import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PawPrint, Plus, Search, X, RefreshCw, Download, Grid3x3, List,
  Package, AlertTriangle, DollarSign, Eye, Edit3, Trash2,
  CheckCircle2, Star, Pill, PackageX, Clock, Leaf,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@core/ui/Button';
import { formatPKR } from '@core/lib/format';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { petProductsApi } from '../api/products.api';
import { PrivacyToggle } from '@core/ui/HiddenValue';

type ViewMode = 'grid' | 'table';
type StockFilter = 'all' | 'in' | 'low' | 'out' | 'expiring' | 'expired';
type SortKey = 'name' | 'newest' | 'stock-low' | 'price-high' | 'expiry-soon';

const SPECIES = [
  { v: 'DOG', l: 'Dog', e: '🐕' },
  { v: 'CAT', l: 'Cat', e: '🐈' },
  { v: 'BIRD', l: 'Bird', e: '🦜' },
  { v: 'FISH', l: 'Fish', e: '🐠' },
  { v: 'RABBIT', l: 'Rabbit', e: '🐰' },
  { v: 'REPTILE', l: 'Reptile', e: '🦎' },
  { v: 'ALL', l: 'All Species', e: '🌐' },
];

const CATEGORIES = [
  'DRY_FOOD', 'WET_FOOD', 'TREATS', 'SUPPLEMENTS', 'PRESCRIPTION_DIET',
  'TOYS', 'BEDS', 'CARRIERS', 'LEASHES_COLLARS', 'GROOMING_SUPPLIES',
  'AQUARIUM_TANK', 'AQUARIUM_FILTER', 'AQUARIUM_FOOD',
  'BIRD_CAGE', 'BIRD_FOOD',
  'VET_MEDICINE', 'VET_VACCINE', 'FIRST_AID',
];

export default function PetshopProductsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [species, setSpecies] = useState('all');
  const [categoryType, setCategoryType] = useState('all');
  const [brand, setBrand] = useState('all');
  const [grainFreeOnly, setGrainFreeOnly] = useState(false);
  const [organicOnly, setOrganicOnly] = useState(false);
  const [prescriptionOnly, setPrescriptionOnly] = useState(false);
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [view, setView] = useState<ViewMode>('grid');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['petshop-products-list'],
    queryFn: () => productsApi.list({ page: 1, limit: 1000 } as any),
  });
  const products: any[] = (data as any)?.items ?? [];

  const { data: profiles = [] } = useQuery({
    queryKey: ['petshop-profiles-all'],
    queryFn: () => petProductsApi.list(),
  });

  const { data: brands = [] } = useQuery({
    queryKey: ['petshop-brands'],
    queryFn: () => petProductsApi.brands(),
  });

  const pmap = useMemo(() => {
    const m = new Map<string, any>();
    (profiles as any[]).forEach((p) => m.set(p.productId, p));
    return m;
  }, [profiles]);

  const stats = useMemo(() => {
    const now = new Date();
    const in90 = new Date();
    in90.setDate(in90.getDate() + 90);

    return {
      total: products.length,
      totalStock: products.reduce((a, p) => a + Number(p.stock || 0), 0),
      stockValue: products.reduce((a, p) => a + Number(p.stock || 0) * Number(p.price || 0), 0),
      lowCount: products.filter((p) => Number(p.stock || 0) > 0 && Number(p.stock || 0) <= Number(p.lowStockAlert ?? 5)).length,
      outCount: products.filter((p) => Number(p.stock || 0) <= 0).length,
      expiringSoon: (profiles as any[]).filter((p) => p.expiryDate && new Date(p.expiryDate) >= now && new Date(p.expiryDate) <= in90).length,
      expired: (profiles as any[]).filter((p) => p.expiryDate && new Date(p.expiryDate) < now).length,
    };
  }, [products, profiles]);

  const filtered = useMemo(() => {
    let list = [...products];
    const q = search.toLowerCase().trim();
    if (q) list = list.filter((p) => {
      const pr = pmap.get(p.id);
      return (p.name || '').toLowerCase().includes(q) ||
        (p.sku || '').toLowerCase().includes(q) ||
        (p.barcode || '').toLowerCase().includes(q) ||
        (pr?.brand || '').toLowerCase().includes(q);
    });
    if (species !== 'all') list = list.filter((p) => pmap.get(p.id)?.species === species);
    if (categoryType !== 'all') list = list.filter((p) => pmap.get(p.id)?.categoryType === categoryType);
    if (brand !== 'all') list = list.filter((p) => pmap.get(p.id)?.brand === brand);
    if (grainFreeOnly) list = list.filter((p) => pmap.get(p.id)?.isGrainFree);
    if (organicOnly) list = list.filter((p) => pmap.get(p.id)?.isOrganic);
    if (prescriptionOnly) list = list.filter((p) => pmap.get(p.id)?.isPrescriptionOnly);

    const now = new Date();
    const in90 = new Date(); in90.setDate(in90.getDate() + 90);

    if (stockFilter === 'expiring') {
      list = list.filter((p) => {
        const pr = pmap.get(p.id);
        if (!pr?.expiryDate) return false;
        const d = new Date(pr.expiryDate);
        return d >= now && d <= in90;
      });
    } else if (stockFilter === 'expired') {
      list = list.filter((p) => {
        const pr = pmap.get(p.id);
        return pr?.expiryDate && new Date(pr.expiryDate) < now;
      });
    } else if (stockFilter !== 'all') {
      list = list.filter((p) => {
        const s = Number(p.stock || 0), a = Number(p.lowStockAlert ?? 5);
        return stockFilter === 'out' ? s <= 0 : stockFilter === 'low' ? s > 0 && s <= a : s > a;
      });
    }

    list.sort((a, b) => {
      if (sortKey === 'newest') return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      if (sortKey === 'stock-low') return Number(a.stock || 0) - Number(b.stock || 0);
      if (sortKey === 'price-high') return Number(b.price || 0) - Number(a.price || 0);
      if (sortKey === 'expiry-soon') {
        const ea = pmap.get(a.id)?.expiryDate;
        const eb = pmap.get(b.id)?.expiryDate;
        if (!ea && !eb) return 0;
        if (!ea) return 1;
        if (!eb) return -1;
        return new Date(ea).getTime() - new Date(eb).getTime();
      }
      return (a.name || '').localeCompare(b.name || '');
    });
    return list;
  }, [products, search, species, categoryType, brand, grainFreeOnly, organicOnly, prescriptionOnly, stockFilter, sortKey, pmap]);

  const toggle = (id: string) => setSelected((prev) => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });

  const bulkDelete = useMutation({
    mutationFn: async () => {
      const res = await Promise.allSettled(Array.from(selected).map((id) => productsApi.remove(id)));
      return res.filter((r) => r.status === 'fulfilled').length;
    },
    onSuccess: (ok) => {
      if (ok) toast.success(`${ok} products deleted`);
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ['petshop-products-list'] });
    },
  });

  const exportCSV = () => {
    if (!filtered.length) return toast.error('Nothing to export');
    const head = ['Name', 'SKU', 'Brand', 'Species', 'Category', 'Life Stage', 'Cost', 'Retail', 'Stock', 'Batch', 'Expiry'];
    const rows = filtered.map((p) => {
      const pr = pmap.get(p.id);
      return [p.name, p.sku || '', pr?.brand || '', pr?.species || '', pr?.categoryType || '', pr?.lifeStage || '',
        Number(p.costPrice || 0).toFixed(2), Number(p.price || 0).toFixed(2),
        Number(p.stock || 0), pr?.batchNumber || '', pr?.expiryDate ? new Date(pr.expiryDate).toLocaleDateString() : ''];
    });
    const csv = [head, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = `petshop-products-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success('Exported');
  };

  return (
    <div className="space-y-5 pb-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-amber-900 to-orange-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-orange-400/20 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <PawPrint className="h-3.5 w-3.5 text-amber-300" /> Pet Products
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold">Products</h1>
            <p className="mt-2 text-sm text-white/80">
              {stats.total} products • {stats.totalStock} units • Value{' '}
              <strong className="text-emerald-300">{formatPKR(stats.stockValue)}</strong>
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2.5 text-sm font-bold backdrop-blur">
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <PrivacyToggle />
            <Link to="/petshop-products/new"
              className="inline-flex items-center gap-2 rounded-xl bg-white text-slate-900 hover:bg-slate-100 px-5 py-2.5 text-sm font-extrabold shadow-lg">
              <Plus className="h-4 w-4" /> New Product
            </Link>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Kpi icon={Package} label="Products" value={stats.total} sub={`${stats.totalStock} units`} tone="amber" />
        <Kpi icon={DollarSign} label="Stock Value" value={formatPKR(stats.stockValue)} sub="Retail" tone="emerald" />
        <Kpi icon={Clock} label="Expiring Soon" value={stats.expiringSoon} sub="Next 90 days" tone="orange" onClick={() => setStockFilter('expiring')} />
        <Kpi icon={AlertTriangle} label="Low Stock" value={stats.lowCount} sub="Reorder" tone="amber" onClick={() => setStockFilter('low')} />
        <Kpi icon={PackageX} label="Expired" value={stats.expired} sub="Remove!" tone="rose" onClick={() => setStockFilter('expired')} />
      </section>

      <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4 space-y-3">
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, SKU, barcode, brand..."
              className="h-12 w-full rounded-2xl border-2 border-slate-200 pl-11 pr-10 text-sm font-semibold focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200" />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 flex items-center justify-center">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="inline-flex rounded-2xl border-2 border-slate-200 bg-white overflow-hidden">
            <button onClick={() => setView('grid')} className={`px-4 h-12 ${view === 'grid' ? 'bg-amber-600 text-white' : 'text-slate-600'}`}>
              <Grid3x3 className="h-4 w-4" />
            </button>
            <button onClick={() => setView('table')} className={`px-4 h-12 border-l-2 border-slate-200 ${view === 'table' ? 'bg-amber-600 text-white' : 'text-slate-600'}`}>
              <List className="h-4 w-4" />
            </button>
          </div>
          <button onClick={exportCSV}
            className="h-12 px-4 rounded-2xl border-2 border-slate-200 hover:border-amber-300 text-sm font-bold text-slate-700 inline-flex items-center gap-1.5">
            <Download className="h-4 w-4" /> Export
          </button>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <Chip active={species === 'all'} onClick={() => setSpecies('all')} label="All" emoji="🌐" />
          {SPECIES.map((s) => (
            <Chip key={s.v} active={species === s.v} onClick={() => setSpecies(species === s.v ? 'all' : s.v)} label={s.l} emoji={s.e} />
          ))}
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          <select value={categoryType} onChange={(e) => setCategoryType(e.target.value)}
            className="h-10 rounded-xl border-2 border-slate-200 bg-white px-3 text-xs font-bold focus:outline-none focus:border-amber-500">
            <option value="all">All categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
          </select>
          <select value={brand} onChange={(e) => setBrand(e.target.value)}
            className="h-10 rounded-xl border-2 border-slate-200 bg-white px-3 text-xs font-bold focus:outline-none focus:border-amber-500">
            <option value="all">All brands</option>
            {(brands as any[]).map((b: any) => <option key={b.brand} value={b.brand}>{b.brand} ({b.count})</option>)}
          </select>
          <button onClick={() => setGrainFreeOnly((v) => !v)}
            className={`h-10 px-3 rounded-xl border-2 text-xs font-extrabold inline-flex items-center gap-1.5 ${grainFreeOnly ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-700'}`}>
            <Leaf className="h-3.5 w-3.5" /> Grain Free
          </button>
          <button onClick={() => setOrganicOnly((v) => !v)}
            className={`h-10 px-3 rounded-xl border-2 text-xs font-extrabold inline-flex items-center gap-1.5 ${organicOnly ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-700'}`}>
            🌿 Organic
          </button>
          <button onClick={() => setPrescriptionOnly((v) => !v)}
            className={`h-10 px-3 rounded-xl border-2 text-xs font-extrabold inline-flex items-center gap-1.5 ${prescriptionOnly ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-slate-200 text-slate-700'}`}>
            <Pill className="h-3.5 w-3.5" /> Rx Only
          </button>
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
            {(['all', 'in', 'low', 'out'] as StockFilter[]).map((v) => (
              <button key={v} onClick={() => setStockFilter(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold ${stockFilter === v ? 'bg-amber-600 text-white' : 'text-slate-600'}`}>
                {v === 'all' ? 'All' : v === 'in' ? 'In stock' : v === 'low' ? 'Low' : 'Out'}
              </button>
            ))}
          </div>
          <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="h-10 rounded-xl border-2 border-slate-200 bg-white px-3 text-xs font-bold focus:outline-none focus:border-amber-500">
            <option value="name">A → Z</option>
            <option value="newest">Newest</option>
            <option value="stock-low">Stock low</option>
            <option value="price-high">Most expensive</option>
            <option value="expiry-soon">Expiring soon</option>
          </select>
          <div className="ml-auto text-xs font-extrabold text-slate-500">{filtered.length} products</div>
        </div>
      </section>

      {selected.size > 0 && (
        <section className="sticky top-2 z-20 rounded-2xl bg-slate-900 text-white shadow-2xl p-3 flex items-center gap-2 flex-wrap">
          <div className="font-extrabold text-sm px-2">{selected.size} selected</div>
          <button onClick={() => { if (confirm(`Delete ${selected.size} products?`)) bulkDelete.mutate(); }}
            className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-extrabold inline-flex items-center gap-1">
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
          <button onClick={() => setSelected(new Set())} className="ml-auto px-3 py-2 rounded-xl bg-white/10 text-xs font-extrabold">Clear</button>
        </section>
      )}

      {isLoading ? (
        <div className="grid gap-3">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-24 rounded-2xl bg-slate-100 animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <section className="rounded-3xl bg-white border-2 border-dashed border-slate-300 p-16 text-center">
          <div className="mx-auto h-20 w-20 rounded-3xl bg-gradient-to-br from-amber-100 to-orange-200 flex items-center justify-center">
            <PawPrint className="h-9 w-9 text-amber-600" />
          </div>
          <h3 className="mt-5 text-xl font-extrabold text-slate-900">No products found</h3>
          <p className="text-sm text-slate-500 mt-2 font-semibold">Add your first pet food, accessory or medicine</p>
          <Link to="/petshop-products/new">
            <Button className="mt-5 bg-gradient-to-r from-amber-600 to-orange-700"><Plus className="h-4 w-4" /> Add Product</Button>
          </Link>
        </section>
      ) : view === 'grid' ? (
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filtered.map((p) => <Card key={p.id} p={p} pr={pmap.get(p.id)} sel={selected.has(p.id)} onToggle={() => toggle(p.id)} />)}
        </section>
      ) : (
        <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b-2 border-slate-200">
              <tr>
                <th className="px-3 py-3 w-10" />
                <Th>Product</Th><Th>Brand</Th><Th>Species</Th>
                <Th className="text-right">Retail</Th><Th className="text-right">Stock</Th>
                <Th className="text-center">Expiry</Th><Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((p) => {
                const pr = pmap.get(p.id);
                const stock = Number(p.stock || 0);
                const isOut = stock <= 0;
                const isLow = !isOut && stock <= Number(p.lowStockAlert ?? 5);
                const expiryDate = pr?.expiryDate ? new Date(pr.expiryDate) : null;
                const daysToExpiry = expiryDate ? Math.ceil((expiryDate.getTime() - Date.now()) / 86400000) : null;

                return (
                  <tr key={p.id} className="hover:bg-amber-50/40">
                    <td className="px-3 py-2.5">
                      <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} className="h-4 w-4 rounded" />
                    </td>
                    <td className="px-3 py-2.5">
                      <Link to={`/petshop-products/${p.id}`} className="flex items-center gap-2.5 group">
                        <div className="h-10 w-10 rounded-lg bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                          {p.images?.[0]?.url
                            ? <img src={p.images[0].url} className="w-full h-full object-cover" />
                            : <PawPrint className="h-4 w-4 text-slate-400" />}
                        </div>
                        <div className="min-w-0">
                          <div className="font-extrabold text-slate-900 text-sm truncate group-hover:text-amber-700">{p.name}</div>
                          <div className="text-[10px] font-mono text-slate-500 truncate">{p.sku || pr?.categoryType?.replace(/_/g, ' ') || '—'}</div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-xs font-bold text-slate-700">{pr?.brand || '—'}</td>
                    <td className="px-3 py-2.5 text-xs font-bold text-slate-600">{pr?.species?.replace(/_/g, ' ') || '—'}</td>
                    <td className="px-3 py-2.5 text-right font-extrabold text-emerald-700 tabular-nums">{formatPKR(p.price || 0)}</td>
                    <td className="px-3 py-2.5 text-right">
                      <span className={`font-extrabold tabular-nums text-sm ${isOut ? 'text-rose-700' : isLow ? 'text-amber-700' : 'text-slate-900'}`}>{stock}</span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {expiryDate ? (
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                          daysToExpiry! < 0 ? 'bg-rose-100 text-rose-700' :
                          daysToExpiry! <= 90 ? 'bg-amber-100 text-amber-700' :
                          'bg-emerald-100 text-emerald-700'}`}>
                          {daysToExpiry! < 0 ? 'EXPIRED' : `${daysToExpiry}d`}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <Link to={`/petshop-products/${p.id}`} className="h-8 w-8 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 flex items-center justify-center">
                          <Eye className="h-3.5 w-3.5" />
                        </Link>
                        <Link to={`/petshop-products/${p.id}/edit`} className="h-8 w-8 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 flex items-center justify-center">
                          <Edit3 className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

function Card({ p, pr, sel, onToggle }: any) {
  const stock = Number(p.stock || 0);
  const isOut = stock <= 0;
  const isLow = !isOut && stock <= Number(p.lowStockAlert ?? 5);
  const expiryDate = pr?.expiryDate ? new Date(pr.expiryDate) : null;
  const daysToExpiry = expiryDate ? Math.ceil((expiryDate.getTime() - Date.now()) / 86400000) : null;
  const isExpired = daysToExpiry !== null && daysToExpiry < 0;
  const isExpiring = daysToExpiry !== null && daysToExpiry >= 0 && daysToExpiry <= 90;

  return (
    <div className={`group relative rounded-2xl bg-white border-2 overflow-hidden transition-all hover:shadow-lg hover:-translate-y-0.5 ${
      sel ? 'border-amber-500 ring-2 ring-amber-200' :
      isExpired ? 'border-rose-300' :
      isOut ? 'border-rose-200' :
      isLow ? 'border-amber-200' : 'border-slate-200'}`}>
      <button onClick={onToggle}
        className={`absolute top-2 left-2 z-10 h-6 w-6 rounded-lg border-2 flex items-center justify-center transition ${
          sel ? 'bg-amber-600 border-amber-600 text-white' : 'bg-white/90 border-slate-300 opacity-0 group-hover:opacity-100'}`}>
        {sel && <CheckCircle2 className="h-3.5 w-3.5" />}
      </button>
      <Link to={`/petshop-products/${p.id}`} className="block">
        <div className="aspect-square bg-slate-100 relative overflow-hidden">
          {p.images?.[0]?.url
            ? <img src={p.images[0].url} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
            : <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50"><PawPrint className="h-10 w-10 text-amber-300" /></div>}
          {pr?.isPrescriptionOnly && <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-rose-500 text-white text-[9px] font-extrabold inline-flex items-center gap-0.5"><Pill className="h-2 w-2" /> Rx</div>}
          {pr?.isFeatured && !pr?.isPrescriptionOnly && (
            <div className="absolute top-2 right-2 h-6 w-6 rounded-full bg-amber-500 flex items-center justify-center shadow">
              <Star className="h-3 w-3 fill-white text-white" />
            </div>
          )}
          {pr?.isOrganic && (
            <div className="absolute bottom-1.5 left-1.5 h-6 px-1.5 rounded-md bg-emerald-600 flex items-center gap-1 text-white text-[9px] font-extrabold shadow">
              🌿 ORG
            </div>
          )}
          {(isOut || isLow || isExpired) && (
            <div className={`absolute inset-x-0 bottom-0 py-1 text-center text-[10px] font-extrabold text-white ${
              isExpired ? 'bg-rose-700' : isOut ? 'bg-rose-600' : 'bg-amber-500'}`}>
              {isExpired ? 'EXPIRED' : isOut ? 'OUT OF STOCK' : `ONLY ${stock} LEFT`}
            </div>
          )}
        </div>
        <div className="p-2.5">
          <div className="font-extrabold text-slate-900 text-xs leading-tight line-clamp-2 min-h-[2rem]">{p.name}</div>
          {pr?.brand && <div className="mt-1 text-[9px] font-extrabold uppercase text-amber-700">{pr.brand}</div>}
          <div className="mt-1.5 flex items-end justify-between gap-1">
            <div className="text-base font-extrabold text-emerald-700 tabular-nums leading-none">{formatPKR(p.price || 0)}</div>
            <div className="text-right">
              <div className={`text-sm font-extrabold tabular-nums leading-none ${isOut ? 'text-rose-700' : isLow ? 'text-amber-700' : 'text-slate-700'}`}>{stock}</div>
              <div className="text-[9px] font-bold text-slate-500">units</div>
            </div>
          </div>
          {isExpiring && !isExpired && (
            <div className="mt-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[9px] font-extrabold">
              <Clock className="h-2.5 w-2.5" /> Exp in {daysToExpiry}d
            </div>
          )}
        </div>
      </Link>
    </div>
  );
}

function Th({ children, className = '' }: any) {
  return <th className={`px-3 py-3 text-left text-[10px] font-extrabold uppercase tracking-wider text-slate-700 ${className}`}>{children}</th>;
}

function Kpi({ icon: Icon, label, value, sub, tone, onClick }: any) {
  const tones: Record<string, string> = {
    amber: 'from-amber-500 to-orange-700', emerald: 'from-emerald-500 to-emerald-700',
    orange: 'from-orange-500 to-red-700', rose: 'from-rose-500 to-red-700',
  };
  const C: any = onClick ? 'button' : 'div';
  return (
    <C onClick={onClick} className={`rounded-2xl bg-white border-2 border-slate-200 p-4 shadow-sm text-left w-full ${onClick ? 'hover:border-amber-300 hover:shadow-md transition' : ''}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-extrabold">{label}</div>
          <div className="mt-1.5 text-xl font-extrabold text-slate-900 tabular-nums truncate">{value}</div>
          <div className="text-[10px] text-slate-500 font-bold mt-0.5 truncate">{sub}</div>
        </div>
        <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-lg shrink-0`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </C>
  );
}

function Chip({ active, onClick, label, emoji }: any) {
  return (
    <button onClick={onClick}
      className={`shrink-0 h-9 px-3 rounded-xl text-xs font-extrabold inline-flex items-center gap-1.5 border-2 transition ${
        active ? 'bg-amber-600 text-white border-amber-600 shadow-md' : 'bg-white text-slate-700 border-slate-200 hover:border-amber-300'}`}>
      <span>{emoji}</span>{label}
    </button>
  );
}
