import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Flower2, Plus, Search, X, RefreshCw, Download, Grid3x3, List,
  Package, AlertTriangle, DollarSign, Eye, Edit3, Trash2,
  CheckCircle2, Star, Leaf, PackageX, Heart, Wand2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@core/ui/Button';
import { formatPKR } from '@core/lib/format';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { floristProductsApi } from '../api/products.api';
import { PrivacyToggle } from '@core/ui/HiddenValue';

type ViewMode = 'grid' | 'table';
type StockFilter = 'all' | 'in' | 'low' | 'out';
type SortKey = 'name' | 'newest' | 'stock-low' | 'price-high' | 'fresh-soon';

const CATEGORIES = [
  { v: 'BOUQUET', l: 'Bouquet', e: '💐' },
  { v: 'BRIDAL_BOUQUET', l: 'Bridal', e: '👰' },
  { v: 'ARRANGEMENT', l: 'Arrangement', e: '🌷' },
  { v: 'FRESH_FLOWER_STEM', l: 'Stems', e: '🌹' },
  { v: 'POTTED_PLANT', l: 'Plants', e: '🪴' },
  { v: 'BASKET', l: 'Basket', e: '🧺' },
  { v: 'FLOWER_GIFT_BOX', l: 'Gift Box', e: '🎁' },
  { v: 'ARTIFICIAL_FLOWER', l: 'Artificial', e: '🌼' },
];

const OCCASIONS = ['Birthday', 'Anniversary', 'Wedding', 'Valentine\'s Day', 'Sympathy', 'Congratulations'];

const FRESHNESS_META: Record<string, { l: string; cls: string }> = {
  PREMIUM_A: { l: 'Premium A+', cls: 'bg-emerald-100 text-emerald-700' },
  GRADE_A: { l: 'Grade A', cls: 'bg-blue-100 text-blue-700' },
  GRADE_B: { l: 'Grade B', cls: 'bg-amber-100 text-amber-700' },
  CLEARANCE: { l: 'Clearance', cls: 'bg-orange-100 text-orange-700' },
  WITHERED: { l: 'Withered', cls: 'bg-rose-100 text-rose-700' },
};

export default function FloristProductsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [categoryType, setCategoryType] = useState('all');
  const [occasion, setOccasion] = useState('all');
  const [freshness, setFreshness] = useState('all');
  const [customizableOnly, setCustomizableOnly] = useState(false);
  const [importedOnly, setImportedOnly] = useState(false);
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [view, setView] = useState<ViewMode>('grid');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['florist-products-list'],
    queryFn: () => productsApi.list({ page: 1, limit: 1000 } as any),
  });
  const products: any[] = (data as any)?.items ?? [];

  const { data: profiles = [] } = useQuery({
    queryKey: ['florist-profiles-all'],
    queryFn: () => floristProductsApi.list(),
  });

  const pmap = useMemo(() => {
    const m = new Map<string, any>();
    (profiles as any[]).forEach((p) => m.set(p.productId, p));
    return m;
  }, [profiles]);

  const stats = useMemo(() => {
    const withering = (profiles as any[]).filter((p) => {
      if (!p.freshUntil) return false;
      const days = Math.ceil((new Date(p.freshUntil).getTime() - Date.now()) / 86400000);
      return days <= 3;
    }).length;
    return {
      total: products.length,
      totalStock: products.reduce((a, p) => a + Number(p.stock || 0), 0),
      stockValue: products.reduce((a, p) => a + Number(p.stock || 0) * Number(p.price || 0), 0),
      lowCount: products.filter((p) => Number(p.stock || 0) > 0 && Number(p.stock || 0) <= Number(p.lowStockAlert ?? 3)).length,
      outCount: products.filter((p) => Number(p.stock || 0) <= 0).length,
      withering,
    };
  }, [products, profiles]);

  const filtered = useMemo(() => {
    let list = [...products];
    const q = search.toLowerCase().trim();
    if (q) list = list.filter((p) => {
      const pr = pmap.get(p.id);
      return (p.name || '').toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q) ||
        (pr?.flowerType || '').toLowerCase().includes(q) || (pr?.color || '').toLowerCase().includes(q);
    });
    if (categoryType !== 'all') list = list.filter((p) => pmap.get(p.id)?.categoryType === categoryType);
    if (occasion !== 'all') list = list.filter((p) => pmap.get(p.id)?.occasions?.includes(occasion));
    if (freshness !== 'all') list = list.filter((p) => pmap.get(p.id)?.freshnessGrade === freshness);
    if (customizableOnly) list = list.filter((p) => pmap.get(p.id)?.isCustomizable);
    if (importedOnly) list = list.filter((p) => pmap.get(p.id)?.isImported);
    if (stockFilter !== 'all') list = list.filter((p) => {
      const s = Number(p.stock || 0), a = Number(p.lowStockAlert ?? 3);
      return stockFilter === 'out' ? s <= 0 : stockFilter === 'low' ? s > 0 && s <= a : s > a;
    });
    list.sort((a, b) => {
      if (sortKey === 'newest') return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      if (sortKey === 'stock-low') return Number(a.stock || 0) - Number(b.stock || 0);
      if (sortKey === 'price-high') return Number(b.price || 0) - Number(a.price || 0);
      if (sortKey === 'fresh-soon') {
        const fa = pmap.get(a.id)?.freshUntil ? new Date(pmap.get(a.id).freshUntil).getTime() : Infinity;
        const fb = pmap.get(b.id)?.freshUntil ? new Date(pmap.get(b.id).freshUntil).getTime() : Infinity;
        return fa - fb;
      }
      return (a.name || '').localeCompare(b.name || '');
    });
    return list;
  }, [products, search, categoryType, occasion, freshness, customizableOnly, importedOnly, stockFilter, sortKey, pmap]);

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
      qc.invalidateQueries({ queryKey: ['florist-products-list'] });
    },
  });

  const exportCSV = () => {
    if (!filtered.length) return toast.error('Nothing to export');
    const head = ['Name', 'SKU', 'Category', 'Flower', 'Color', 'Freshness', 'Fresh Until', 'Cost', 'Retail', 'Stock', 'Occasions'];
    const rows = filtered.map((p) => {
      const pr = pmap.get(p.id);
      return [p.name, p.sku || '', pr?.categoryType || '', pr?.flowerType || '', pr?.color || '',
        pr?.freshnessGrade || '', pr?.freshUntil ? new Date(pr.freshUntil).toLocaleDateString('en-PK') : '',
        Number(p.costPrice || 0).toFixed(2), Number(p.price || 0).toFixed(2),
        Number(p.stock || 0), (pr?.occasions || []).join('; ')];
    });
    const csv = [head, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = `florist-products-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success('Exported');
  };

  return (
    <div className="space-y-5 pb-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-pink-900 to-rose-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-pink-400/20 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Flower2 className="h-3.5 w-3.5 text-amber-300" /> Florist Catalogue
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
            <Link to="/florist-products/new"
              className="inline-flex items-center gap-2 rounded-xl bg-white text-slate-900 hover:bg-slate-100 px-5 py-2.5 text-sm font-extrabold shadow-lg">
              <Plus className="h-4 w-4" /> New Product
            </Link>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Kpi icon={Package} label="Products" value={stats.total} sub={`${stats.totalStock} units`} tone="pink" />
        <Kpi icon={DollarSign} label="Stock Value" value={formatPKR(stats.stockValue)} sub="Retail" tone="emerald" />
        <Kpi icon={Leaf} label="Withering" value={stats.withering} sub="within 3 days" tone="rose"
          onClick={() => setSortKey('fresh-soon')} />
        <Kpi icon={AlertTriangle} label="Low Stock" value={stats.lowCount} sub="Reorder" tone="amber" onClick={() => setStockFilter('low')} />
        <Kpi icon={PackageX} label="Out of Stock" value={stats.outCount} sub="Restock" tone="rose" onClick={() => setStockFilter('out')} />
      </section>

      <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4 space-y-3">
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, SKU, flower type, colour..."
              className="h-12 w-full rounded-2xl border-2 border-slate-200 pl-11 pr-10 text-sm font-semibold focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-200" />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 flex items-center justify-center">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="inline-flex rounded-2xl border-2 border-slate-200 bg-white overflow-hidden">
            <button onClick={() => setView('grid')} className={`px-4 h-12 ${view === 'grid' ? 'bg-pink-600 text-white' : 'text-slate-600'}`}>
              <Grid3x3 className="h-4 w-4" />
            </button>
            <button onClick={() => setView('table')} className={`px-4 h-12 border-l-2 border-slate-200 ${view === 'table' ? 'bg-pink-600 text-white' : 'text-slate-600'}`}>
              <List className="h-4 w-4" />
            </button>
          </div>
          <button onClick={exportCSV}
            className="h-12 px-4 rounded-2xl border-2 border-slate-200 hover:border-pink-300 text-sm font-bold text-slate-700 inline-flex items-center gap-1.5">
            <Download className="h-4 w-4" /> Export
          </button>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <Chip active={categoryType === 'all'} onClick={() => setCategoryType('all')} label="All" emoji="🌸" />
          {CATEGORIES.map((c) => (
            <Chip key={c.v} active={categoryType === c.v} onClick={() => setCategoryType(categoryType === c.v ? 'all' : c.v)} label={c.l} emoji={c.e} />
          ))}
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          <select value={occasion} onChange={(e) => setOccasion(e.target.value)}
            className="h-10 rounded-xl border-2 border-slate-200 bg-white px-3 text-xs font-bold focus:outline-none focus:border-pink-500">
            <option value="all">Any occasion</option>
            {OCCASIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          <select value={freshness} onChange={(e) => setFreshness(e.target.value)}
            className="h-10 rounded-xl border-2 border-slate-200 bg-white px-3 text-xs font-bold focus:outline-none focus:border-pink-500">
            <option value="all">Any grade</option>
            {Object.entries(FRESHNESS_META).map(([k, v]) => <option key={k} value={k}>{v.l}</option>)}
          </select>
          <button onClick={() => setCustomizableOnly((v) => !v)}
            className={`h-10 px-3 rounded-xl border-2 text-xs font-extrabold inline-flex items-center gap-1.5 ${customizableOnly ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-slate-200 text-slate-700'}`}>
            <Wand2 className="h-3.5 w-3.5" /> Customizable
          </button>
          <button onClick={() => setImportedOnly((v) => !v)}
            className={`h-10 px-3 rounded-xl border-2 text-xs font-extrabold inline-flex items-center gap-1.5 ${importedOnly ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-700'}`}>
            🌍 Imported
          </button>
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
            {(['all', 'in', 'low', 'out'] as StockFilter[]).map((v) => (
              <button key={v} onClick={() => setStockFilter(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold ${stockFilter === v ? 'bg-pink-600 text-white' : 'text-slate-600'}`}>
                {v === 'all' ? 'All' : v === 'in' ? 'In stock' : v === 'low' ? 'Low' : 'Out'}
              </button>
            ))}
          </div>
          <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="h-10 rounded-xl border-2 border-slate-200 bg-white px-3 text-xs font-bold focus:outline-none focus:border-pink-500">
            <option value="name">A → Z</option>
            <option value="newest">Newest</option>
            <option value="fresh-soon">Withering first</option>
            <option value="stock-low">Stock low</option>
            <option value="price-high">Most expensive</option>
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
          <div className="mx-auto h-20 w-20 rounded-3xl bg-gradient-to-br from-pink-100 to-rose-200 flex items-center justify-center">
            <Flower2 className="h-9 w-9 text-pink-600" />
          </div>
          <h3 className="mt-5 text-xl font-extrabold text-slate-900">No products found</h3>
          <p className="text-sm text-slate-500 mt-2 font-semibold">Add your first bouquet or flower stem</p>
          <Link to="/florist-products/new">
            <Button className="mt-5 bg-gradient-to-r from-pink-500 to-rose-600"><Plus className="h-4 w-4" /> Add Product</Button>
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
                <Th>Product</Th><Th>Category</Th><Th>Colour</Th>
                <Th className="text-center">Freshness</Th>
                <Th className="text-right">Retail</Th><Th className="text-right">Stock</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((p) => {
                const pr = pmap.get(p.id);
                const stock = Number(p.stock || 0);
                const isOut = stock <= 0;
                const isLow = !isOut && stock <= Number(p.lowStockAlert ?? 3);
                const fm = pr?.freshnessGrade ? FRESHNESS_META[pr.freshnessGrade] : null;
                return (
                  <tr key={p.id} className="hover:bg-pink-50/40">
                    <td className="px-3 py-2.5">
                      <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} className="h-4 w-4 rounded" />
                    </td>
                    <td className="px-3 py-2.5">
                      <Link to={`/florist-products/${p.id}`} className="flex items-center gap-2.5 group">
                        <div className="h-10 w-10 rounded-lg bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                          {p.images?.[0]?.url
                            ? <img src={p.images[0].url} className="w-full h-full object-cover" />
                            : <Flower2 className="h-4 w-4 text-slate-400" />}
                        </div>
                        <div className="min-w-0">
                          <div className="font-extrabold text-slate-900 text-sm truncate group-hover:text-pink-700">{p.name}</div>
                          <div className="text-[10px] font-mono text-slate-500 truncate">{p.sku || pr?.flowerType || '—'}</div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-xs font-bold text-slate-700">{pr?.categoryType?.replace(/_/g, ' ') || '—'}</td>
                    <td className="px-3 py-2.5">
                      {pr?.color ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700">
                          <span className="h-3 w-3 rounded-full border border-slate-300" style={{ backgroundColor: pr.colorHex || '#ec4899' }} />
                          {pr.color}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {fm ? (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${fm.cls}`}>{fm.l}</span>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right font-extrabold text-emerald-700 tabular-nums">{formatPKR(p.price || 0)}</td>
                    <td className="px-3 py-2.5 text-right">
                      <span className={`font-extrabold tabular-nums text-sm ${isOut ? 'text-rose-700' : isLow ? 'text-amber-700' : 'text-slate-900'}`}>{stock}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <Link to={`/florist-products/${p.id}`} className="h-8 w-8 rounded-lg bg-pink-50 hover:bg-pink-100 text-pink-700 flex items-center justify-center">
                          <Eye className="h-3.5 w-3.5" />
                        </Link>
                        <Link to={`/florist-products/${p.id}/edit`} className="h-8 w-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 flex items-center justify-center">
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
  const isLow = !isOut && stock <= Number(p.lowStockAlert ?? 3);
  const freshDays = pr?.freshUntil ? Math.ceil((new Date(pr.freshUntil).getTime() - Date.now()) / 86400000) : null;
  const fm = pr?.freshnessGrade ? FRESHNESS_META[pr.freshnessGrade] : null;

  return (
    <div className={`group relative rounded-2xl bg-white border-2 overflow-hidden transition-all hover:shadow-lg hover:-translate-y-0.5 ${
      sel ? 'border-pink-500 ring-2 ring-pink-200' : isOut ? 'border-rose-200' : isLow ? 'border-amber-200' : 'border-slate-200'}`}>
      <button onClick={onToggle}
        className={`absolute top-2 left-2 z-10 h-6 w-6 rounded-lg border-2 flex items-center justify-center transition ${
          sel ? 'bg-pink-600 border-pink-600 text-white' : 'bg-white/90 border-slate-300 opacity-0 group-hover:opacity-100'}`}>
        {sel && <CheckCircle2 className="h-3.5 w-3.5" />}
      </button>
      <Link to={`/florist-products/${p.id}`} className="block">
        <div className="aspect-square bg-slate-100 relative overflow-hidden">
          {p.images?.[0]?.url
            ? <img src={p.images[0].url} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
            : <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-50 to-rose-50"><Flower2 className="h-10 w-10 text-pink-300" /></div>}
          {pr?.isFeatured && (
            <div className="absolute top-2 right-2 h-6 w-6 rounded-full bg-amber-500 flex items-center justify-center shadow">
              <Star className="h-3 w-3 fill-white text-white" />
            </div>
          )}
          {pr?.isCustomizable && (
            <div className="absolute bottom-1.5 left-1.5 h-6 px-1.5 rounded-md bg-violet-600 flex items-center gap-1 text-white text-[9px] font-extrabold shadow">
              <Wand2 className="h-2.5 w-2.5" /> CUSTOM
            </div>
          )}
          {freshDays !== null && freshDays <= 3 && (
            <div className={`absolute top-2 left-9 px-1.5 py-0.5 rounded-md text-white text-[9px] font-extrabold shadow ${freshDays <= 0 ? 'bg-rose-600' : 'bg-amber-500'}`}>
              {freshDays <= 0 ? '🥀 WITHERED' : `${freshDays}D LEFT`}
            </div>
          )}
          {(isOut || isLow) && (
            <div className={`absolute inset-x-0 bottom-0 py-1 text-center text-[10px] font-extrabold text-white ${isOut ? 'bg-rose-600' : 'bg-amber-500'}`}>
              {isOut ? 'OUT OF STOCK' : `ONLY ${stock} LEFT`}
            </div>
          )}
        </div>
        <div className="p-2.5">
          <div className="font-extrabold text-slate-900 text-xs leading-tight line-clamp-2 min-h-[2rem]">{p.name}</div>
          <div className="mt-1 flex items-center gap-1.5">
            {pr?.color && (
              <span className="h-3 w-3 rounded-full border border-slate-300 shrink-0" style={{ backgroundColor: pr.colorHex || '#ec4899' }} />
            )}
            {pr?.flowerType && <span className="text-[9px] font-extrabold uppercase text-pink-700 truncate">{pr.flowerType}</span>}
          </div>
          <div className="mt-1.5 flex items-end justify-between gap-1">
            <div className="text-base font-extrabold text-emerald-700 tabular-nums leading-none">{formatPKR(p.price || 0)}</div>
            <div className="text-right">
              <div className={`text-sm font-extrabold tabular-nums leading-none ${isOut ? 'text-rose-700' : isLow ? 'text-amber-700' : 'text-slate-700'}`}>{stock}</div>
              <div className="text-[9px] font-bold text-slate-500">{p.unit || 'pcs'}</div>
            </div>
          </div>
          {fm && (
            <div className={`mt-2 inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-extrabold ${fm.cls}`}>
              {fm.l}
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
    pink: 'from-pink-500 to-rose-600', emerald: 'from-emerald-500 to-emerald-700',
    amber: 'from-amber-500 to-orange-600', rose: 'from-rose-500 to-rose-700',
  };
  const C: any = onClick ? 'button' : 'div';
  return (
    <C onClick={onClick} className={`rounded-2xl bg-white border-2 border-slate-200 p-4 shadow-sm text-left w-full ${onClick ? 'hover:border-pink-300 hover:shadow-md transition' : ''}`}>
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
        active ? 'bg-pink-600 text-white border-pink-600 shadow-md' : 'bg-white text-slate-700 border-slate-200 hover:border-pink-300'}`}>
      <span>{emoji}</span>{label}
    </button>
  );
}
