import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Baby, Plus, Search, X, RefreshCw, Download, Grid3x3, List,
  Package, AlertTriangle, DollarSign, Eye, Edit3, Trash2,
  CheckCircle2, Star, Cake, Gift, ShieldAlert, PackageX,
  GraduationCap, Battery, Radio,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@core/ui/Button';
import { formatPKR } from '@core/lib/format';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { toyProductsApi } from '../api/products.api';
import { PrivacyToggle } from '@core/ui/HiddenValue';

type ViewMode = 'grid' | 'table';
type StockFilter = 'all' | 'in' | 'low' | 'out';
type SortKey = 'name' | 'newest' | 'stock-low' | 'price-high' | 'best-sellers';

const AGE_GROUPS = [
  { v: 'NEWBORN_0_6M', l: '0-6M', e: '👶' },
  { v: 'INFANT_6_12M', l: '6-12M', e: '🍼' },
  { v: 'TODDLER_1_2Y', l: '1-2Y', e: '🧸' },
  { v: 'TODDLER_2_3Y', l: '2-3Y', e: '🎈' },
  { v: 'PRESCHOOL_3_5Y', l: '3-5Y', e: '🎨' },
  { v: 'KIDS_5_8Y', l: '5-8Y', e: '🎒' },
  { v: 'KIDS_8_12Y', l: '8-12Y', e: '⚽' },
  { v: 'TWEEN_12_14Y', l: '12-14Y', e: '📱' },
  { v: 'TEEN_14_PLUS', l: '14+', e: '🎮' },
];

const CATEGORIES = [
  'BUILDING_BLOCKS', 'LEGO', 'DOLL', 'PLUSH_TOY', 'BOARD_GAME',
  'EDUCATIONAL_TOY', 'STEM_TOY', 'RC_CAR', 'RC_DRONE', 'BABY_TOY',
];

export default function ToyProductsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [ageGroup, setAgeGroup] = useState('all');
  const [gender, setGender] = useState('all');
  const [categoryType, setCategoryType] = useState('all');
  const [educationalOnly, setEducationalOnly] = useState(false);
  const [rcOnly, setRcOnly] = useState(false);
  const [safeOnly, setSafeOnly] = useState(false);
  const [birthdayOnly, setBirthdayOnly] = useState(false);
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [view, setView] = useState<ViewMode>('grid');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['toy-products-list'],
    queryFn: () => productsApi.list({ page: 1, limit: 1000 } as any),
  });
  const products: any[] = (data as any)?.items ?? [];

  const { data: profiles = [] } = useQuery({
    queryKey: ['toy-profiles-all'],
    queryFn: () => toyProductsApi.list(),
  });

  const pmap = useMemo(() => {
    const m = new Map<string, any>();
    (profiles as any[]).forEach((p) => m.set(p.productId, p));
    return m;
  }, [profiles]);

  const stats = useMemo(() => ({
    total: products.length,
    totalStock: products.reduce((a, p) => a + Number(p.stock || 0), 0),
    stockValue: products.reduce((a, p) => a + Number(p.stock || 0) * Number(p.price || 0), 0),
    educational: (profiles as any[]).filter((p) => p.isEducational).length,
    rc: (profiles as any[]).filter((p) => p.isRemoteControlled).length,
    lowCount: products.filter((p) => Number(p.stock || 0) > 0 && Number(p.stock || 0) <= Number(p.lowStockAlert ?? 5)).length,
    outCount: products.filter((p) => Number(p.stock || 0) <= 0).length,
  }), [products, profiles]);

  const filtered = useMemo(() => {
    let list = [...products];
    const q = search.toLowerCase().trim();
    if (q) list = list.filter((p) => {
      const pr = pmap.get(p.id);
      return (p.name || '').toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q) ||
        (p.barcode || '').toLowerCase().includes(q) ||
        (pr?.brand || '').toLowerCase().includes(q) ||
        (pr?.characterFranchise || '').toLowerCase().includes(q);
    });
    if (ageGroup !== 'all') list = list.filter((p) => {
      const pr = pmap.get(p.id);
      return pr?.ageGroup === ageGroup || (pr?.ageGroups ?? []).includes(ageGroup) || pr?.ageGroup === 'ALL_AGES';
    });
    if (gender !== 'all') list = list.filter((p) => {
      const pr = pmap.get(p.id);
      return pr?.genderTarget === gender || pr?.genderTarget === 'UNISEX';
    });
    if (categoryType !== 'all') list = list.filter((p) => pmap.get(p.id)?.categoryType === categoryType);
    if (educationalOnly) list = list.filter((p) => pmap.get(p.id)?.isEducational);
    if (rcOnly) list = list.filter((p) => pmap.get(p.id)?.isRemoteControlled);
    if (safeOnly) list = list.filter((p) => {
      const pr = pmap.get(p.id);
      return pr && !pr.chokingHazard && pr.isNonToxic && (pr.safetyCertifications ?? []).length > 0;
    });
    if (birthdayOnly) list = list.filter((p) => pmap.get(p.id)?.isBirthdayGift);
    if (stockFilter !== 'all') list = list.filter((p) => {
      const s = Number(p.stock || 0), a = Number(p.lowStockAlert ?? 5);
      return stockFilter === 'out' ? s <= 0 : stockFilter === 'low' ? s > 0 && s <= a : s > a;
    });
    list.sort((a, b) => {
      if (sortKey === 'newest') return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      if (sortKey === 'stock-low') return Number(a.stock || 0) - Number(b.stock || 0);
      if (sortKey === 'price-high') return Number(b.price || 0) - Number(a.price || 0);
      if (sortKey === 'best-sellers') return Number(pmap.get(b.id)?.totalSold || 0) - Number(pmap.get(a.id)?.totalSold || 0);
      return (a.name || '').localeCompare(b.name || '');
    });
    return list;
  }, [products, search, ageGroup, gender, categoryType, educationalOnly, rcOnly, safeOnly, birthdayOnly, stockFilter, sortKey, pmap]);

  const toggle = (id: string) => setSelected((prev) => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });

  const bulkDelete = useMutation({
    mutationFn: async () => {
      const res = await Promise.allSettled(Array.from(selected).map((id) => productsApi.remove(id)));
      return res.filter((r) => r.status === 'fulfilled').length;
    },
    onSuccess: (ok) => {
      if (ok) toast.success(`${ok} toys deleted`);
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ['toy-products-list'] });
    },
  });

  const exportCSV = () => {
    if (!filtered.length) return toast.error('Nothing to export');
    const head = ['Name', 'SKU', 'Age Group', 'Gender', 'Category', 'Brand', 'Franchise', 'Cost', 'Retail', 'Stock', 'Educational', 'RC', 'Safety Certs'];
    const rows = filtered.map((p) => {
      const pr = pmap.get(p.id);
      return [p.name, p.sku || '', pr?.ageGroup || '', pr?.genderTarget || '',
        pr?.categoryType || '', pr?.brand || '', pr?.characterFranchise || '',
        Number(p.costPrice || 0).toFixed(2), Number(p.price || 0).toFixed(2),
        Number(p.stock || 0), pr?.isEducational ? 'Yes' : 'No',
        pr?.isRemoteControlled ? 'Yes' : 'No',
        (pr?.safetyCertifications ?? []).join('; ')];
    });
    const csv = [head, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = `toys-${new Date().toISOString().slice(0, 10)}.csv`;
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
              <Baby className="h-3.5 w-3.5 text-amber-300" /> Toy Catalogue
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold">Toys</h1>
            <p className="mt-2 text-sm text-white/80">
              {stats.total} toys • {stats.totalStock} units • Value{' '}
              <strong className="text-emerald-300">{formatPKR(stats.stockValue)}</strong>
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2.5 text-sm font-bold backdrop-blur">
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <PrivacyToggle />
            <Link to="/toy-products/new"
              className="inline-flex items-center gap-2 rounded-xl bg-white text-slate-900 hover:bg-slate-100 px-5 py-2.5 text-sm font-extrabold shadow-lg">
              <Plus className="h-4 w-4" /> New Toy
            </Link>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Kpi icon={Package} label="Toys" value={stats.total} sub={`${stats.totalStock} units`} tone="pink" />
        <Kpi icon={GraduationCap} label="Educational" value={stats.educational} sub="Learning toys" tone="violet" onClick={() => setEducationalOnly((v) => !v)} />
        <Kpi icon={Radio} label="Remote Control" value={stats.rc} sub="RC toys" tone="blue" onClick={() => setRcOnly((v) => !v)} />
        <Kpi icon={AlertTriangle} label="Low Stock" value={stats.lowCount} sub="Reorder" tone="amber" onClick={() => setStockFilter('low')} />
        <Kpi icon={PackageX} label="Out of Stock" value={stats.outCount} sub="Restock" tone="rose" onClick={() => setStockFilter('out')} />
      </section>

      <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4 space-y-3">
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, SKU, brand, franchise..."
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
          <Chip active={ageGroup === 'all'} onClick={() => setAgeGroup('all')} label="All Ages" emoji="👨‍👩‍👧‍👦" />
          {AGE_GROUPS.map((a) => (
            <Chip key={a.v} active={ageGroup === a.v} onClick={() => setAgeGroup(ageGroup === a.v ? 'all' : a.v)} label={a.l} emoji={a.e} />
          ))}
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          <select value={gender} onChange={(e) => setGender(e.target.value)}
            className="h-10 rounded-xl border-2 border-slate-200 bg-white px-3 text-xs font-bold focus:outline-none focus:border-pink-500">
            <option value="all">All genders</option>
            <option value="UNISEX">⚧️ Unisex</option>
            <option value="BOYS">👦 Boys</option>
            <option value="GIRLS">👧 Girls</option>
          </select>
          <select value={categoryType} onChange={(e) => setCategoryType(e.target.value)}
            className="h-10 rounded-xl border-2 border-slate-200 bg-white px-3 text-xs font-bold focus:outline-none focus:border-pink-500">
            <option value="all">All categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
          </select>
          <button onClick={() => setEducationalOnly((v) => !v)}
            className={`h-10 px-3 rounded-xl border-2 text-xs font-extrabold inline-flex items-center gap-1.5 ${educationalOnly ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-slate-200 text-slate-700'}`}>
            <GraduationCap className="h-3.5 w-3.5" /> Educational
          </button>
          <button onClick={() => setRcOnly((v) => !v)}
            className={`h-10 px-3 rounded-xl border-2 text-xs font-extrabold inline-flex items-center gap-1.5 ${rcOnly ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-700'}`}>
            <Radio className="h-3.5 w-3.5" /> RC
          </button>
          <button onClick={() => setSafeOnly((v) => !v)}
            className={`h-10 px-3 rounded-xl border-2 text-xs font-extrabold inline-flex items-center gap-1.5 ${safeOnly ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-700'}`}>
            <ShieldAlert className="h-3.5 w-3.5" /> Safe
          </button>
          <button onClick={() => setBirthdayOnly((v) => !v)}
            className={`h-10 px-3 rounded-xl border-2 text-xs font-extrabold inline-flex items-center gap-1.5 ${birthdayOnly ? 'border-pink-500 bg-pink-50 text-pink-700' : 'border-slate-200 text-slate-700'}`}>
            <Cake className="h-3.5 w-3.5" /> Birthday
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
            <option value="best-sellers">Best sellers</option>
            <option value="stock-low">Stock low</option>
            <option value="price-high">Most expensive</option>
          </select>
          <div className="ml-auto text-xs font-extrabold text-slate-500">{filtered.length} toys</div>
        </div>
      </section>

      {selected.size > 0 && (
        <section className="sticky top-2 z-20 rounded-2xl bg-slate-900 text-white shadow-2xl p-3 flex items-center gap-2 flex-wrap">
          <div className="font-extrabold text-sm px-2">{selected.size} selected</div>
          <button onClick={() => { if (confirm(`Delete ${selected.size} toys?`)) bulkDelete.mutate(); }}
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
            <Baby className="h-9 w-9 text-pink-600" />
          </div>
          <h3 className="mt-5 text-xl font-extrabold text-slate-900">No toys found</h3>
          <p className="text-sm text-slate-500 mt-2 font-semibold">Add your first toy</p>
          <Link to="/toy-products/new">
            <Button className="mt-5 bg-gradient-to-r from-pink-600 to-rose-700"><Plus className="h-4 w-4" /> Add Toy</Button>
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
                <Th>Toy</Th><Th>Age</Th><Th>Gender</Th><Th>Brand</Th>
                <Th className="text-right">Retail</Th><Th className="text-right">Stock</Th>
                <Th className="text-center">Flags</Th><Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((p) => {
                const pr = pmap.get(p.id);
                const stock = Number(p.stock || 0);
                const isOut = stock <= 0;
                const isLow = !isOut && stock <= Number(p.lowStockAlert ?? 5);
                return (
                  <tr key={p.id} className="hover:bg-pink-50/40">
                    <td className="px-3 py-2.5">
                      <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} className="h-4 w-4 rounded" />
                    </td>
                    <td className="px-3 py-2.5">
                      <Link to={`/toy-products/${p.id}`} className="flex items-center gap-2.5 group">
                        <div className="h-10 w-10 rounded-lg bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                          {p.images?.[0]?.url
                            ? <img src={p.images[0].url} className="w-full h-full object-cover" />
                            : <Baby className="h-4 w-4 text-slate-400" />}
                        </div>
                        <div className="min-w-0">
                          <div className="font-extrabold text-slate-900 text-sm truncate group-hover:text-pink-700">{p.name}</div>
                          <div className="text-[10px] font-mono text-slate-500 truncate">{p.sku || pr?.characterFranchise || '—'}</div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-xs font-bold text-slate-700">{AGE_GROUPS.find((a) => a.v === pr?.ageGroup)?.l || '—'}</td>
                    <td className="px-3 py-2.5 text-xs font-bold text-slate-700">{pr?.genderTarget || '—'}</td>
                    <td className="px-3 py-2.5 text-xs font-bold text-slate-600">{pr?.brand || '—'}</td>
                    <td className="px-3 py-2.5 text-right font-extrabold text-emerald-700 tabular-nums">{formatPKR(p.price || 0)}</td>
                    <td className="px-3 py-2.5 text-right">
                      <span className={`font-extrabold tabular-nums text-sm ${isOut ? 'text-rose-700' : isLow ? 'text-amber-700' : 'text-slate-900'}`}>{stock}</span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <div className="inline-flex items-center gap-1">
                        {pr?.isEducational && <span title="Educational" className="text-violet-600">🎓</span>}
                        {pr?.isRemoteControlled && <span title="RC" className="text-blue-600">📡</span>}
                        {pr?.isBirthdayGift && <span title="Birthday" className="text-pink-600">🎂</span>}
                        {pr?.chokingHazard && <span title="Choking hazard" className="text-rose-600">⚠️</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <Link to={`/toy-products/${p.id}`} className="h-8 w-8 rounded-lg bg-pink-50 hover:bg-pink-100 text-pink-700 flex items-center justify-center">
                          <Eye className="h-3.5 w-3.5" />
                        </Link>
                        <Link to={`/toy-products/${p.id}/edit`} className="h-8 w-8 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-700 flex items-center justify-center">
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
  const ageLabel = AGE_GROUPS.find((a) => a.v === pr?.ageGroup)?.l;

  return (
    <div className={`group relative rounded-2xl bg-white border-2 overflow-hidden transition-all hover:shadow-lg hover:-translate-y-0.5 ${
      sel ? 'border-pink-500 ring-2 ring-pink-200' : isOut ? 'border-rose-200' : isLow ? 'border-amber-200' : 'border-slate-200'}`}>
      <button onClick={onToggle}
        className={`absolute top-2 left-2 z-10 h-6 w-6 rounded-lg border-2 flex items-center justify-center transition ${
          sel ? 'bg-pink-600 border-pink-600 text-white' : 'bg-white/90 border-slate-300 opacity-0 group-hover:opacity-100'}`}>
        {sel && <CheckCircle2 className="h-3.5 w-3.5" />}
      </button>
      <Link to={`/toy-products/${p.id}`} className="block">
        <div className="aspect-square bg-slate-100 relative overflow-hidden">
          {p.images?.[0]?.url
            ? <img src={p.images[0].url} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
            : <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-50 to-rose-50"><Baby className="h-10 w-10 text-pink-300" /></div>}
          {pr?.isBirthdayGift && <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-pink-500 text-white text-[9px] font-extrabold">🎂</div>}
          {pr?.isBestSeller && (
            <div className="absolute top-2 left-8 px-1.5 py-0.5 rounded-md bg-amber-500 text-white text-[9px] font-extrabold">BEST</div>
          )}
          {pr?.chokingHazard && (
            <div className="absolute bottom-8 left-1.5 h-5 w-5 rounded-full bg-rose-500 flex items-center justify-center text-white text-[10px]">⚠</div>
          )}
          {pr?.isEducational && (
            <div className="absolute bottom-1.5 left-1.5 h-6 px-1.5 rounded-md bg-violet-600 flex items-center gap-1 text-white text-[9px] font-extrabold shadow">
              <GraduationCap className="h-2.5 w-2.5" /> EDU
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
          {ageLabel && <div className="mt-1 text-[9px] font-extrabold uppercase text-pink-700">{ageLabel} • {pr?.genderTarget}</div>}
          <div className="mt-1.5 flex items-end justify-between gap-1">
            <div className="text-base font-extrabold text-emerald-700 tabular-nums leading-none">{formatPKR(p.price || 0)}</div>
            <div className="text-right">
              <div className={`text-sm font-extrabold tabular-nums leading-none ${isOut ? 'text-rose-700' : isLow ? 'text-amber-700' : 'text-slate-700'}`}>{stock}</div>
              <div className="text-[9px] font-bold text-slate-500">units</div>
            </div>
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
    pink: 'from-pink-500 to-rose-700', violet: 'from-violet-500 to-purple-700',
    blue: 'from-blue-500 to-cyan-700', amber: 'from-amber-500 to-orange-600', rose: 'from-rose-500 to-rose-700',
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
