import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Home, Plus, Search, X, RefreshCw, Download, Grid3x3, List,
  Package, AlertTriangle, DollarSign, Eye, Edit3, Trash2,
  Barcode, ShoppingCart, CheckCircle2, Star, Award, Zap,
  TrendingUp, PackageX, Shield, HardHat, Truck,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@core/ui/Button';
import { formatPKR } from '@core/lib/format';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { applianceProductsApi } from '../api/products.api';
import { applianceBrandsApi } from '../api/brands.api';
import { PrivacyToggle, useCostHidden } from '@core/ui/HiddenValue';

type ViewMode = 'grid' | 'table';
type StockFilter = 'all' | 'in' | 'low' | 'out';
type SortKey = 'name' | 'stock-low' | 'stock-high' | 'price-low' | 'price-high' | 'newest';

export default function AppliancesProductsPage() {
  const queryClient = useQueryClient();
  const hideCost = useCostHidden();

  const [search, setSearch] = useState('');
  const [categoryType, setCategoryType] = useState('all');
  const [brandId, setBrandId] = useState('all');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [view, setView] = useState<ViewMode>('grid');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['appliances-products-list'],
    queryFn: () => productsApi.list({ page: 1, limit: 1000 } as any),
  });
  const products: any[] = (data as any)?.items ?? [];

  const { data: profiles = [] } = useQuery({
    queryKey: ['appliance-profiles-all'],
    queryFn: () => applianceProductsApi.list(),
  });

  const { data: brands = [] } = useQuery({
    queryKey: ['appliance-brands'],
    queryFn: () => applianceBrandsApi.list({ active: true }),
  });

  const profileByProduct = useMemo(() => {
    const map = new Map<string, any>();
    (profiles as any[]).forEach((p) => map.set(p.productId, p));
    return map;
  }, [profiles]);

  const stats = useMemo(() => {
    const totalStock = products.reduce((a, p) => a + Number(p.stock || 0), 0);
    const stockValue = products.reduce((a, p) => a + Number(p.stock || 0) * Number(p.price || 0), 0);
    const low = products.filter((p) => Number(p.stock || 0) > 0 && Number(p.stock || 0) <= Number(p.lowStockAlert ?? 3));
    const out = products.filter((p) => Number(p.stock || 0) <= 0);
    return {
      total: products.length,
      totalStock, stockValue,
      lowCount: low.length,
      outCount: out.length,
    };
  }, [products]);

  const filtered = useMemo(() => {
    let list = [...products];
    const q = search.toLowerCase().trim();
    if (q) {
      list = list.filter((p) =>
        (p.name || '').toLowerCase().includes(q) ||
        (p.sku || '').toLowerCase().includes(q) ||
        (p.barcode || '').toLowerCase().includes(q),
      );
    }
    if (categoryType !== 'all') {
      list = list.filter((p) => {
        const profile = profileByProduct.get(p.id);
        return profile?.categoryType === categoryType;
      });
    }
    if (brandId !== 'all') {
      list = list.filter((p) => {
        const profile = profileByProduct.get(p.id);
        return profile?.brandId === brandId;
      });
    }
    if (stockFilter !== 'all') {
      list = list.filter((p) => {
        const s = Number(p.stock || 0);
        const alert = Number(p.lowStockAlert ?? 3);
        if (stockFilter === 'out') return s <= 0;
        if (stockFilter === 'low') return s > 0 && s <= alert;
        return s > alert;
      });
    }
    list.sort((a, b) => {
      switch (sortKey) {
        case 'stock-low': return Number(a.stock || 0) - Number(b.stock || 0);
        case 'stock-high': return Number(b.stock || 0) - Number(a.stock || 0);
        case 'price-low': return Number(a.price || 0) - Number(b.price || 0);
        case 'price-high': return Number(b.price || 0) - Number(a.price || 0);
        case 'newest': return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        default: return (a.name || '').localeCompare(b.name || '');
      }
    });
    return list;
  }, [products, search, categoryType, brandId, stockFilter, sortKey, profileByProduct]);

  const bulkDelete = useMutation({
    mutationFn: async () => {
      const ids = Array.from(selected);
      const res = await Promise.allSettled(ids.map((id) => productsApi.remove(id)));
      return { ok: res.filter((r) => r.status === 'fulfilled').length };
    },
    onSuccess: ({ ok }) => {
      if (ok) toast.success(`${ok} products delete ho gaye`);
      setSelected(new Set());
      queryClient.invalidateQueries({ queryKey: ['appliances-products-list'] });
    },
  });

  const exportCSV = () => {
    if (filtered.length === 0) return toast.error('Koi data nahi');
    const head = ['Name', 'Model', 'SKU', 'Barcode', 'Brand', 'Category', 'Capacity', 'Cost', 'Retail', 'Stock', 'Warranty'];
    const body = filtered.map((p) => {
      const prof = profileByProduct.get(p.id);
      const brand = (brands as any[]).find((b) => b.id === prof?.brandId);
      return [
        p.name, prof?.modelNumber || '', p.sku || '', p.barcode || '',
        brand?.name || '', prof?.categoryType || '', prof?.capacity || '',
        Number(p.costPrice || 0).toFixed(2), Number(p.price || 0).toFixed(2),
        Number(p.stock || 0), prof?.warrantyMonths ? `${prof.warrantyMonths}m` : '',
      ];
    });
    const csv = [head, ...body].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `appliances-products-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported!');
  };

  return (
    <div className="space-y-5 pb-6">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-cyan-900 to-teal-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Home className="h-3.5 w-3.5 text-amber-300" /> Appliances Store
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">Products</h1>
            <p className="mt-2 text-sm text-white/80">
              {stats.total} products • {stats.totalStock} pcs stock • Value{' '}
              <strong className="text-emerald-300">{formatPKR(stats.stockValue)}</strong>
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2.5 text-sm font-bold backdrop-blur">
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <PrivacyToggle />
            <Link to="/appliance-products/new"
              className="inline-flex items-center gap-2 rounded-xl bg-white text-slate-900 hover:bg-slate-100 px-5 py-2.5 text-sm font-extrabold shadow-lg">
              <Plus className="h-4 w-4" /> New Product
            </Link>
          </div>
        </div>
      </section>

      {/* KPIs */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi icon={Package} label="Total Products" value={stats.total} sub={`${stats.totalStock} pcs`} tone="cyan" />
        <Kpi icon={DollarSign} label="Stock Value" value={formatPKR(stats.stockValue)} sub="Retail value" tone="emerald" />
        <Kpi icon={AlertTriangle} label="Low Stock" value={stats.lowCount} sub="Reorder soon" tone="amber"
          onClick={() => setStockFilter('low')} />
        <Kpi icon={PackageX} label="Out of Stock" value={stats.outCount} sub="Restock now" tone="rose"
          onClick={() => setStockFilter('out')} />
      </section>

      {/* TOOLBAR */}
      <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4 space-y-3">
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Naam, model, SKU, barcode..."
              className="h-12 w-full rounded-2xl border-2 border-slate-200 bg-white pl-11 pr-10 text-sm font-semibold focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200" />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 flex items-center justify-center">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="inline-flex rounded-2xl border-2 border-slate-200 bg-white overflow-hidden">
            <button onClick={() => setView('grid')}
              className={`px-4 h-12 text-xs font-extrabold transition ${view === 'grid' ? 'bg-cyan-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
              <Grid3x3 className="h-4 w-4" />
            </button>
            <button onClick={() => setView('table')}
              className={`px-4 h-12 text-xs font-extrabold border-l-2 border-slate-200 transition ${view === 'table' ? 'bg-cyan-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
              <List className="h-4 w-4" />
            </button>
          </div>
          <button onClick={exportCSV}
            className="h-12 px-4 rounded-2xl border-2 border-slate-200 hover:border-cyan-300 bg-white text-sm font-bold text-slate-700 inline-flex items-center gap-1.5">
            <Download className="h-4 w-4" /> Export
          </button>
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          <select value={brandId} onChange={(e) => setBrandId(e.target.value)}
            className="h-10 rounded-xl border-2 border-slate-200 bg-white px-3 text-xs font-bold focus:outline-none focus:border-cyan-500">
            <option value="all">All Brands</option>
            {(brands as any[]).map((b) => (<option key={b.id} value={b.id}>{b.name}</option>))}
          </select>

          <select value={categoryType} onChange={(e) => setCategoryType(e.target.value)}
            className="h-10 rounded-xl border-2 border-slate-200 bg-white px-3 text-xs font-bold focus:outline-none focus:border-cyan-500">
            <option value="all">All Categories</option>
            <option value="REFRIGERATOR">🧊 Refrigerator</option>
            <option value="AIR_CONDITIONER_SPLIT">❄️ AC Split</option>
            <option value="AIR_CONDITIONER_INVERTER">⚡ AC Inverter</option>
            <option value="WASHING_MACHINE_FRONT_LOAD">👔 W/M Front Load</option>
            <option value="WASHING_MACHINE_TOP_LOAD">👕 W/M Top Load</option>
            <option value="LED_TV">📺 LED TV</option>
            <option value="SMART_TV">📱 Smart TV</option>
            <option value="MICROWAVE_OVEN">📡 Microwave</option>
            <option value="WATER_DISPENSER">💧 Water Dispenser</option>
            <option value="GEYSER_ELECTRIC">♨️ Geyser</option>
            <option value="FAN_CEILING">🌀 Fan</option>
          </select>

          <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
            {[
              { v: 'all' as StockFilter, l: 'All' },
              { v: 'in' as StockFilter, l: 'In stock' },
              { v: 'low' as StockFilter, l: 'Low' },
              { v: 'out' as StockFilter, l: 'Out' },
            ].map((o) => (
              <button key={o.v} onClick={() => setStockFilter(o.v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition ${
                  stockFilter === o.v ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}>{o.l}</button>
            ))}
          </div>

          <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="h-10 rounded-xl border-2 border-slate-200 bg-white px-3 text-xs font-bold focus:outline-none focus:border-cyan-500">
            <option value="name">A → Z</option>
            <option value="newest">Newest</option>
            <option value="stock-low">Stock low</option>
            <option value="stock-high">Stock high</option>
            <option value="price-low">Cheap first</option>
            <option value="price-high">Expensive first</option>
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
          <button onClick={() => setSelected(new Set())}
            className="ml-auto px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-extrabold">Clear</button>
        </section>
      )}

      {isLoading ? (
        <div className="grid gap-3">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-24 rounded-2xl bg-slate-100 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <section className="rounded-3xl bg-white border-2 border-dashed border-slate-300 p-16 text-center">
          <div className="mx-auto h-20 w-20 rounded-3xl bg-gradient-to-br from-cyan-100 to-teal-200 flex items-center justify-center">
            <Home className="h-9 w-9 text-cyan-600" />
          </div>
          <h3 className="mt-5 text-xl font-extrabold text-slate-900">No products found</h3>
          <p className="text-sm text-slate-500 mt-2 font-semibold">Add karo pehla product</p>
          <Link to="/appliance-products/new">
            <Button className="mt-5 bg-gradient-to-r from-cyan-600 to-teal-700">
              <Plus className="h-4 w-4" /> Add Product
            </Button>
          </Link>
        </section>
      ) : view === 'grid' ? (
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filtered.map((p) => {
            const profile = profileByProduct.get(p.id);
            return (
              <ProductCard key={p.id} p={p} profile={profile} selected={selected.has(p.id)}
                onToggle={() => {
                  setSelected((prev) => {
                    const n = new Set(prev);
                    n.has(p.id) ? n.delete(p.id) : n.add(p.id);
                    return n;
                  });
                }} />
            );
          })}
        </section>
      ) : (
        <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b-2 border-slate-200">
                <tr>
                  <th className="px-3 py-3 w-10"></th>
                  <Th>Product</Th>
                  <Th>Brand</Th>
                  <Th>Capacity</Th>
                  <Th className="text-right">Retail</Th>
                  <Th className="text-right">Stock</Th>
                  <Th className="text-center">Warranty</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((p) => {
                  const profile = profileByProduct.get(p.id);
                  const brand = (brands as any[]).find((b) => b.id === profile?.brandId);
                  const stock = Number(p.stock || 0);
                  const isOut = stock <= 0;
                  const isLow = !isOut && stock <= Number(p.lowStockAlert ?? 3);
                  return (
                    <tr key={p.id} className="hover:bg-cyan-50/40 transition">
                      <td className="px-3 py-2.5">
                        <input type="checkbox" checked={selected.has(p.id)}
                          onChange={() => {
                            setSelected((prev) => {
                              const n = new Set(prev);
                              n.has(p.id) ? n.delete(p.id) : n.add(p.id);
                              return n;
                            });
                          }}
                          className="h-4 w-4 rounded" />
                      </td>
                      <td className="px-3 py-2.5">
                        <Link to={`/appliance-products/${p.id}`} className="flex items-center gap-2.5 group">
                          <div className="h-10 w-10 rounded-lg bg-slate-100 overflow-hidden shrink-0">
                            {p.images?.[0]?.url ? (
                              <img src={p.images[0].url} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center"><Home className="h-4 w-4 text-slate-400" /></div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-extrabold text-slate-900 text-sm truncate group-hover:text-cyan-700">{p.name}</div>
                            <div className="text-[10px] font-mono text-slate-500 truncate">{profile?.modelNumber || p.sku || '—'}</div>
                          </div>
                        </Link>
                      </td>
                      <td className="px-3 py-2.5 text-xs font-bold text-slate-700">{brand?.name || '—'}</td>
                      <td className="px-3 py-2.5 text-xs font-bold text-slate-600">{profile?.capacity || '—'}</td>
                      <td className="px-3 py-2.5 text-right font-extrabold text-emerald-700 tabular-nums">{formatPKR(p.price || 0)}</td>
                      <td className="px-3 py-2.5 text-right">
                        <span className={`font-extrabold tabular-nums text-sm ${isOut ? 'text-rose-700' : isLow ? 'text-amber-700' : 'text-slate-900'}`}>
                          {stock}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {profile?.warrantyMonths ? (
                          <span className="px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-700 text-[10px] font-extrabold">
                            {profile.warrantyMonths}m
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          <Link to={`/appliance-products/${p.id}`} className="h-8 w-8 rounded-lg bg-cyan-50 hover:bg-cyan-100 text-cyan-700 flex items-center justify-center">
                            <Eye className="h-3.5 w-3.5" />
                          </Link>
                          <Link to={`/appliance-products/${p.id}/edit`} className="h-8 w-8 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-700 flex items-center justify-center">
                            <Edit3 className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function ProductCard({ p, profile, selected, onToggle }: any) {
  const stock = Number(p.stock || 0);
  const alert = Number(p.lowStockAlert ?? 3);
  const isOut = stock <= 0;
  const isLow = !isOut && stock <= alert;

  return (
    <div className={[
      'group relative rounded-2xl bg-white border-2 overflow-hidden transition-all hover:shadow-lg hover:-translate-y-0.5',
      selected ? 'border-cyan-500 ring-2 ring-cyan-200' : isOut ? 'border-rose-200' : isLow ? 'border-amber-200' : 'border-slate-200',
    ].join(' ')}>
      <button onClick={onToggle}
        className={[
          'absolute top-2 left-2 z-10 h-6 w-6 rounded-lg border-2 flex items-center justify-center transition',
          selected ? 'bg-cyan-600 border-cyan-600 text-white' : 'bg-white/90 border-slate-300 opacity-0 group-hover:opacity-100',
        ].join(' ')}>
        {selected && <CheckCircle2 className="h-3.5 w-3.5" />}
      </button>

      <Link to={`/appliance-products/${p.id}`} className="block">
        <div className="aspect-square bg-slate-100 overflow-hidden relative">
          {p.images?.[0]?.url ? (
            <img src={p.images[0].url} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Home className="h-10 w-10 text-slate-300" />
            </div>
          )}
          {profile?.isFeatured && (
            <div className="absolute top-2 right-2 h-6 w-6 rounded-full bg-amber-500 flex items-center justify-center shadow">
              <Star className="h-3 w-3 fill-white text-white" />
            </div>
          )}
          {profile?.isInverter && (
            <div className="absolute top-2 left-8 h-6 px-1.5 rounded bg-blue-600 flex items-center gap-0.5 shadow text-[9px] font-extrabold text-white uppercase">
              <Zap className="h-2.5 w-2.5" /> INVERTER
            </div>
          )}
          {(isOut || isLow) && (
            <div className={[
              'absolute inset-x-0 bottom-0 py-1 text-center text-[10px] font-extrabold text-white',
              isOut ? 'bg-rose-600' : 'bg-amber-500',
            ].join(' ')}>
              {isOut ? 'OUT OF STOCK' : `ONLY ${stock} LEFT`}
            </div>
          )}
        </div>

        <div className="p-2.5">
          <div className="font-extrabold text-slate-900 text-xs leading-tight line-clamp-2 min-h-[2rem]">{p.name}</div>
          {profile?.capacity && (
            <div className="mt-1 text-[9px] font-mono text-cyan-700 font-extrabold truncate">{profile.capacity}</div>
          )}
          <div className="mt-1.5 flex items-end justify-between gap-1">
            <div>
              <div className="text-base font-extrabold text-emerald-700 tabular-nums leading-none">{formatPKR(p.price || 0)}</div>
            </div>
            <div className="text-right">
              <div className={[
                'text-sm font-extrabold tabular-nums leading-none',
                isOut ? 'text-rose-700' : isLow ? 'text-amber-700' : 'text-slate-700',
              ].join(' ')}>{stock}</div>
              <div className="text-[9px] font-bold text-slate-500">pcs</div>
            </div>
          </div>
          <div className="mt-1.5 flex items-center gap-1 flex-wrap">
            {profile?.warrantyMonths ? (
              <div className="inline-flex items-center gap-0.5 text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-cyan-100 text-cyan-700">
                <Shield className="h-2 w-2" /> {profile.warrantyMonths}m
              </div>
            ) : null}
            {profile?.installationCovered && (
              <div className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-700">
                🎁 Install
              </div>
            )}
            {profile?.freeDelivery && (
              <div className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-700">
                🚚 Free
              </div>
            )}
          </div>
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
    cyan: 'from-cyan-500 to-teal-700 shadow-cyan-500/30',
    emerald: 'from-emerald-500 to-emerald-700 shadow-emerald-500/30',
    amber: 'from-amber-500 to-orange-600 shadow-amber-500/30',
    rose: 'from-rose-500 to-rose-700 shadow-rose-500/30',
  };
  const Comp: any = onClick ? 'button' : 'div';
  return (
    <Comp onClick={onClick}
      className={[
        'rounded-2xl bg-white border-2 border-slate-200 p-4 shadow-sm text-left w-full',
        onClick ? 'hover:border-cyan-300 hover:shadow-md transition' : '',
      ].join(' ')}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-extrabold">{label}</div>
          <div className="mt-1.5 text-xl font-extrabold text-slate-900 tabular-nums truncate">{value}</div>
          {sub && <div className="text-[10px] text-slate-500 font-bold mt-0.5 truncate">{sub}</div>}
        </div>
        <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-lg shrink-0`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Comp>
  );
}
