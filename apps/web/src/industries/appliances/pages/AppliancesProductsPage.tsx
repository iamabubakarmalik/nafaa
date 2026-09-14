import { useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Package, Plus, Search, X, RefreshCw, Filter, LayoutGrid, List as ListIcon,
  Barcode, ShieldCheck, HardHat, Zap, Wallet, TrendingUp, AlertTriangle,
  FileDown, Printer, CheckCircle2, Pencil, Trash2, Star, Flame, Sparkles,
  BarChart3, ChevronRight, Boxes, Truck, Percent,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { toast } from 'sonner';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { useAuthStore } from '@core/stores/auth.store';
import { productsApi, type Product } from '@modules/inventory/products/api/products.api';
import { brandsApi } from '@modules/inventory/brands/api/brands.api';
import { applianceProductsApi } from '../api/products.api';
import {
  ApplianceHero, Kpi, Panel, Teacher, Empty, useShortcuts, printHtml,
  downloadCsv, a4Shell, escapeHtml, toDateInput, guideAction, printAction,
  Kbd, inputCls, ChipRow,
} from '../components/shared';
import {
  catMeta, catLabel, catEmoji, CATEGORY_GROUPS, energyMeta,
} from '../constants';

/* ═════════════════════════════════════════════════════════════
   APPLIANCES PRODUCTS — maal ki poori fehrist
   ─────────────────────────────────────────────────────────────
   Appliance ki dukaan me har product par teen cheezein matter
   karti hain jo aam POS nahi dikhata:
     • serial rakhna parta hai ya nahi
     • lagana parta hai ya nahi (aur uska charge)
     • warranty kitne mahine — main, compressor, motor
   Ye page unhi ko numaya karta hai.
   ═════════════════════════════════════════════════════════════ */

const VIEW_KEY = 'nafaa:appliances:products:view';
const PIE_COLORS = ['#06b6d4', '#3b82f6', '#10b981', '#f59e0b', '#a855f7', '#ef4444', '#14b8a6', '#f97316', '#64748b'];
const TOOLTIP: React.CSSProperties = {
  borderRadius: 12, border: '2px solid #334155', background: '#0f172a',
  color: '#fff', fontSize: 12, fontWeight: 700,
};

type Tab = 'list' | 'analytics';

export default function AppliancesProductsPage() {
  const qc = useQueryClient();
  const shopName = useAuthStore((s) => s.tenant?.name) || 'Meri Dukaan';
  const shopPhone = useAuthStore((s: any) => s.tenant?.phone || '');
  const searchRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<Tab>('list');
  const [view, setView] = useState<'grid' | 'list'>(() => {
    try { return (localStorage.getItem(VIEW_KEY) as 'grid' | 'list') || 'grid'; } catch { return 'grid'; }
  });
  const [showTeacher, setShowTeacher] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState('');
  const [group, setGroup] = useState<string | null>(null);
  const [brandId, setBrandId] = useState('');
  const [flag, setFlag] = useState<'serial' | 'install' | 'low' | 'out' | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const setViewSafe = (v: 'grid' | 'list') => {
    setView(v);
    try { localStorage.setItem(VIEW_KEY, v); } catch { /* private mode */ }
  };

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['appliance-products-list'],
    queryFn: () => productsApi.list({ page: 1, limit: 500 }),
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['appliance-profiles'],
    queryFn: () => applianceProductsApi.list(),
  });

  const { data: brands = [] } = useQuery({
    queryKey: ['brands'],
    queryFn: () => brandsApi.list(),
  });

  const profileBy = useMemo(
    () => new Map(profiles.map((p: any) => [p.productId, p])),
    [profiles],
  );
  const brandName = useMemo(
    () => new Map((brands as any[]).map((b) => [b.id, b.name])),
    [brands],
  );

  /** Product + appliance profile, ek hi row me */
  const rows = useMemo(() => {
    const items: any[] = (data as any)?.items ?? [];
    return items.map((p) => {
      const prof: any = profileBy.get(p.id);
      const stock = Number(p.stock) || 0;
      const alert = Number(p.lowStockAlert) || 0;
      return {
        ...p,
        prof,
        categoryType: prof?.categoryType ?? null,
        brandLabel: p.brand?.name ?? (prof?.brandId ? brandName.get(prof.brandId) : null) ?? null,
        modelNumber: prof?.modelNumber ?? null,
        capacity: prof?.capacity ?? null,
        energy: prof?.isInverter ? 'INVERTER' : (prof?.energyRating ?? null),
        requiresSerial: prof?.requiresSerial ?? false,
        requiresInstallation: prof?.requiresInstallation ?? false,
        installationCharge: Number(prof?.installationCharge) || 0,
        warrantyMonths: prof?.warrantyMonths ?? null,
        compressorWarrantyMonths: prof?.compressorWarrantyMonths ?? null,
        motorWarrantyMonths: prof?.motorWarrantyMonths ?? null,
        heavy: prof?.requiresLargeVehicle ?? catMeta(prof?.categoryType).heavy,
        isFeatured: prof?.isFeatured ?? false,
        isBestSeller: prof?.isBestSeller ?? false,
        isNewArrival: prof?.isNewArrival ?? false,
        stock, alert,
        isLow: stock > 0 && alert > 0 && stock <= alert,
        isOut: stock <= 0,
        stockValue: stock * (Number(p.costPrice) || 0),
        retailValue: stock * (Number(p.price) || 0),
        hasProfile: !!prof,
      };
    });
  }, [data, profileBy, brandName]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (group && catMeta(r.categoryType).group !== group) return false;
      if (brandId && r.brand?.id !== brandId && r.prof?.brandId !== brandId) return false;
      if (flag === 'serial' && !r.requiresSerial) return false;
      if (flag === 'install' && !r.requiresInstallation) return false;
      if (flag === 'low' && !r.isLow) return false;
      if (flag === 'out' && !r.isOut) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        (r.sku ?? '').toLowerCase().includes(q) ||
        (r.barcode ?? '').toLowerCase().includes(q) ||
        (r.brandLabel ?? '').toLowerCase().includes(q) ||
        (r.modelNumber ?? '').toLowerCase().includes(q) ||
        catLabel(r.categoryType).toLowerCase().includes(q)
      );
    });
  }, [rows, search, group, brandId, flag]);

  const groupCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) {
      const g = catMeta(r.categoryType).group;
      m.set(g, (m.get(g) ?? 0) + 1);
    }
    return m;
  }, [rows]);

  const stats = useMemo(() => {
    const src = filtered;
    return {
      count: src.length,
      units: src.reduce((s, r) => s + r.stock, 0),
      value: src.reduce((s, r) => s + r.stockValue, 0),
      retail: src.reduce((s, r) => s + r.retailValue, 0),
      serial: src.filter((r) => r.requiresSerial).length,
      install: src.filter((r) => r.requiresInstallation).length,
      low: src.filter((r) => r.isLow).length,
      out: src.filter((r) => r.isOut).length,
      noProfile: src.filter((r) => !r.hasProfile).length,
      installIncome: src.reduce((s, r) => s + (r.requiresInstallation ? r.installationCharge * r.stock : 0), 0),
    };
  }, [filtered]);

  const pickedRows = useMemo(() => filtered.filter((r) => picked.has(r.id)), [filtered, picked]);
  const printRows = pickedRows.length ? pickedRows : filtered;
  const allPicked = filtered.length > 0 && filtered.every((r) => picked.has(r.id));

  const toggle = (id: string) =>
    setPicked((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const removeMut = useMutation({
    mutationFn: (id: string) => productsApi.remove(id),
    onSuccess: () => {
      toast.success('Product delete ho gaya');
      qc.invalidateQueries({ queryKey: ['appliance-products-list'] });
      qc.invalidateQueries({ queryKey: ['appliance-profiles'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Delete nahi hua — bikri ka record ho sakta hai'),
  });

  const clearFilters = () => { setSearch(''); setGroup(null); setBrandId(''); setFlag(null); };
  const hasFilters = !!(search || group || brandId || flag);

  /* ─── CSV ─── */
  const exportCsv = () => {
    if (!printRows.length) return toast.error('Koi product nahi');
    downloadCsv(`appliance-products-${toDateInput(new Date())}.csv`, [
      [`Products — ${shopName}`],
      [`Nikala gaya: ${new Date().toLocaleString('en-PK')}`],
      [`${stats.count} products • ${stats.units} units • lagat ${stats.value.toFixed(0)}`],
      [],
      ['Naam', 'Qism', 'Brand', 'Model', 'SKU', 'Barcode', 'Capacity', 'Energy',
       'Stock', 'Alert', 'Lagat/unit', 'Bechne ka rate', 'Kul lagat', 'Bechne par',
       'Serial chahiye', 'Lagana parta', 'Installation charge',
       'Warranty (mah)', 'Compressor (mah)', 'Motor (mah)', 'Bhari saman'],
      ...printRows.map((r) => [
        r.name, catLabel(r.categoryType), r.brandLabel ?? '', r.modelNumber ?? '',
        r.sku ?? '', r.barcode ?? '', r.capacity ?? '',
        r.energy ? energyMeta(r.energy).label : '',
        r.stock, r.alert, r.costPrice, r.price, r.stockValue, r.retailValue,
        r.requiresSerial ? 'Haan' : 'Nahi',
        r.requiresInstallation ? 'Haan' : 'Nahi', r.installationCharge,
        r.warrantyMonths ?? '', r.compressorWarrantyMonths ?? '', r.motorWarrantyMonths ?? '',
        r.heavy ? 'Haan' : 'Nahi',
      ]),
    ]);
    toast.success(`${printRows.length} products export ho gaye`);
  };

  /* ─── A4 ─── */
  const printA4 = () => {
    if (!printRows.length) return toast.error('Koi product nahi');
    const body = `
      <h2 class="sec">📦 Products${pickedRows.length ? ' (chuni hui)' : ''}</h2>
      <table>
        <thead><tr>
          <th>#</th><th>Cheez</th><th>Brand / Model</th><th class="c">Stock</th>
          <th class="c">Serial</th><th class="c">Install</th><th class="r">Lagat</th><th class="r">Bechna</th>
        </tr></thead>
        <tbody>
          ${printRows.map((r, i) => `
            <tr>
              <td class="num">${i + 1}</td>
              <td>
                <div class="main">${catEmoji(r.categoryType)} ${escapeHtml(r.name)}</div>
                <div class="sub">${escapeHtml(catLabel(r.categoryType))}${r.capacity ? ` • ${escapeHtml(r.capacity)}` : ''}${r.sku ? ` • ${escapeHtml(r.sku)}` : ''}</div>
              </td>
              <td>${escapeHtml(r.brandLabel ?? '—')}${r.modelNumber ? `<div class="sub">${escapeHtml(r.modelNumber)}</div>` : ''}</td>
              <td class="c" style="font-weight:800;color:${r.isOut ? '#b91c1c' : r.isLow ? '#d97706' : '#0f172a'}">${r.stock}</td>
              <td class="c">${r.requiresSerial ? '✓' : '—'}</td>
              <td class="c">${r.requiresInstallation ? formatPKR(r.installationCharge) : '—'}</td>
              <td class="r">${formatPKR(r.costPrice)}</td>
              <td class="r">${formatPKR(r.price)}</td>
            </tr>`).join('')}
          <tr class="grand">
            <td colspan="6" style="text-align:right;padding-right:12px;">KUL LAGAT</td>
            <td class="r" style="color:#a5f3fc !important;">${formatPKR(printRows.reduce((s, r) => s + r.stockValue, 0))}</td>
            <td class="r" style="color:#86efac !important;">${formatPKR(printRows.reduce((s, r) => s + r.retailValue, 0))}</td>
          </tr>
        </tbody>
      </table>`;

    const ok = printHtml(a4Shell({
      title: `Products — ${shopName}`,
      heading: '📦 Product List',
      shopName, shopPhone, badge: 'Product Report',
      kpis: [
        { label: '📦 Products', value: String(stats.count), sub: `${stats.units} units`, tone: 'blue' },
        { label: '💰 Stock Ki Lagat', value: formatPKR(stats.value), tone: 'green' },
        { label: '🔖 Serial Wale', value: String(stats.serial), sub: `${stats.install} lagane wale`, tone: 'amber' },
        { label: '⚠️ Kam / Khatam', value: `${stats.low} / ${stats.out}`, tone: 'rose' },
      ],
      body,
    }));
    if (!ok) toast.error('Popup block hai — allow karein');
  };

  useShortcuts({
    '/': () => { setTab('list'); setTimeout(() => searchRef.current?.focus(), 0); },
    n: () => { window.location.href = '/appliance-products/new'; },
    t: () => setShowTeacher(true),
    p: () => printA4(),
    g: () => setViewSafe(view === 'grid' ? 'list' : 'grid'),
    f: () => setShowFilters((v) => !v),
    a: () => setTab((v) => (v === 'analytics' ? 'list' : 'analytics')),
    Escape: () => {
      if (showTeacher) setShowTeacher(false);
      else if (showFilters) setShowFilters(false);
      else if (picked.size) setPicked(new Set());
    },
  }, [showTeacher, showFilters, picked.size, view, printRows]);

  return (
    <div className="space-y-4 sm:space-y-5 pb-10">
      {showTeacher && <ProductsTeacher onClose={() => setShowTeacher(false)} />}

      <ApplianceHero
        badge="Products"
        badgeIcon={<Package className="h-3.5 w-3.5 text-amber-300" />}
        title="📦 Maal"
        subtitle={
          <>
            <strong className="text-cyan-200">{stats.count}</strong> products
            <span className="opacity-50 mx-1.5">•</span>
            <strong className="text-emerald-300">{formatPKR(stats.value)}</strong> ka stock
            {stats.out > 0 && (
              <><span className="opacity-50 mx-1.5">•</span><strong className="text-rose-300">{stats.out}</strong> khatam</>
            )}
          </>
        }
        actions={[
          guideAction(() => setShowTeacher(true)),
          { key: 'refresh', label: 'Refresh', icon: <RefreshCw className="h-4 w-4" />, onClick: () => refetch(), spinning: isFetching, hideLabelOnMobile: true },
          { key: 'csv', label: 'CSV', icon: <FileDown className="h-4 w-4" />, onClick: exportCsv, disabled: !printRows.length, hideLabelOnMobile: true },
          printAction(printA4, !printRows.length),
          { key: 'new', label: 'Naya Product', icon: <Plus className="h-4 w-4" />, shortcut: 'N', href: '/appliance-products/new', variant: 'solid' },
        ]}
        shortcuts={[
          { keys: '/', label: 'Search' }, { keys: 'N', label: 'Naya' },
          { keys: 'G', label: 'Grid/List' }, { keys: 'A', label: 'Analytics' },
          { keys: 'F', label: 'Filters' }, { keys: 'P', label: 'Print' },
          { keys: 'T', label: 'Guide' },
        ]}
      />

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <Kpi icon={Boxes} tone="cyan" label="Stock Ki Lagat" value={formatPKR(stats.value)}
          sub={`${stats.units} units • bechne par ${formatPKR(stats.retail)}`} />
        <Kpi icon={Barcode} tone="violet" label="Serial Wale" value={stats.serial}
          sub="in ka serial register rakhna parta hai"
          onClick={() => setFlag(flag === 'serial' ? null : 'serial')} active={flag === 'serial'} />
        <Kpi icon={HardHat} tone="blue" label="Lagane Wale" value={stats.install}
          sub={stats.installIncome > 0 ? `stock par ${formatPKR(stats.installIncome)} installation` : 'installation charge lagta hai'}
          onClick={() => setFlag(flag === 'install' ? null : 'install')} active={flag === 'install'} />
        <Kpi icon={AlertTriangle} tone="rose" label="Kam / Khatam" value={`${stats.low} / ${stats.out}`}
          sub="alert level se neeche" alert={stats.out > 0}
          onClick={() => setFlag(flag === 'out' ? null : 'out')} active={flag === 'out'} />
      </section>

      {stats.noProfile > 0 && (
        <div className="rounded-2xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/30 p-3 flex items-start gap-2.5">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs font-bold text-amber-900 dark:text-amber-200">
            <strong>{stats.noProfile} products</strong> ki appliance tafseel adhoori hai — warranty, installation
            charge aur serial ki setting nahi lagi. Aise product par POS installation book nahi kar sakta.
            Card par <span className="px-1.5 py-0.5 rounded bg-amber-200 dark:bg-amber-500/30 text-[10px] font-black">TAFSEEL BAQI</span> likha hota hai.
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="inline-flex rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-1 shadow-sm">
          <TabBtn active={tab === 'list'} onClick={() => setTab('list')} icon={Package} label="Maal" />
          <TabBtn active={tab === 'analytics'} onClick={() => setTab('analytics')} icon={BarChart3} label="Analytics" />
        </div>
        {tab === 'list' && (
          <div className="inline-flex rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1">
            <button onClick={() => setViewSafe('grid')}
              className={`px-3 py-2 rounded-xl transition ${view === 'grid' ? 'bg-cyan-600 text-white shadow' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button onClick={() => setViewSafe('list')}
              className={`px-3 py-2 rounded-xl transition ${view === 'list' ? 'bg-cyan-600 text-white shadow' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
              <ListIcon className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="text-xs font-extrabold text-slate-500 dark:text-slate-400 tabular-nums px-1">{filtered.length} products</div>
      </div>

      {tab === 'analytics' ? (
        <ProductAnalytics rows={rows} />
      ) : (
        <>
          {/* Toolbar */}
          <div className="flex gap-2 flex-wrap items-center">
            <div className="flex-1 min-w-[220px] relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input ref={searchRef} className={inputCls('h-12 pl-10 pr-10 text-sm font-semibold')}
                placeholder="Naam, brand, model, SKU, barcode... (/)"
                value={search} onChange={(e) => setSearch(e.target.value)} />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center">
                  <X className="h-4 w-4 text-slate-400" />
                </button>
              )}
            </div>
            <button onClick={() => setShowFilters(!showFilters)}
              className={`h-12 px-4 rounded-2xl border-2 text-xs font-extrabold inline-flex items-center gap-1.5 transition ${
                showFilters || hasFilters
                  ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-500/15 text-cyan-700 dark:text-cyan-300'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-cyan-300'
              }`}>
              <Filter className="h-4 w-4" /> <span className="hidden sm:inline">Filters</span>
              {hasFilters && <span className="h-5 w-5 rounded-full bg-cyan-600 text-white text-[10px] font-bold flex items-center justify-center">!</span>}
            </button>
          </div>

          {showFilters && (
            <Panel className="space-y-3">
              <div>
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Qism</div>
                <ChipRow
                  options={CATEGORY_GROUPS.filter((g) => groupCounts.get(g)).map((g) => ({ value: g, label: g, count: groupCounts.get(g) }))}
                  value={group} onChange={setGroup} allLabel={`Sab (${rows.length})`} />
              </div>
              <div>
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Khaas</div>
                <ChipRow
                  options={[
                    { value: 'serial', label: 'Serial wale', emoji: '🔖' },
                    { value: 'install', label: 'Lagane wale', emoji: '🔧' },
                    { value: 'low', label: 'Stock kam', emoji: '⚠️' },
                    { value: 'out', label: 'Khatam', emoji: '🚫' },
                  ]}
                  value={flag as any} onChange={(v) => setFlag(v as any)} allLabel="Sab" />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Brand</div>
                  <select className={inputCls('h-11 text-xs font-extrabold')} value={brandId} onChange={(e) => setBrandId(e.target.value)}>
                    <option value="">Sab brands</option>
                    {(brands as any[]).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              </div>
              {hasFilters && (
                <button onClick={clearFilters} className="text-xs font-extrabold text-rose-600 dark:text-rose-400 inline-flex items-center gap-1">
                  <X className="h-3 w-3" /> Sab filters clear karo
                </button>
              )}
            </Panel>
          )}

          {/* Bulk bar */}
          {picked.size > 0 && (
            <div className="sticky top-2 z-30 rounded-2xl bg-gradient-to-r from-slate-900 to-cyan-900 dark:from-slate-950 dark:to-cyan-950 text-white border-2 border-cyan-400/40 shadow-2xl p-3 flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 mr-1">
                <div className="h-9 w-9 rounded-xl bg-white/15 flex items-center justify-center font-extrabold tabular-nums text-sm">{picked.size}</div>
                <div className="text-xs font-extrabold leading-tight">
                  chune hue<br />
                  <span className="text-white/60 font-bold">lagat {formatPKR(pickedRows.reduce((s, r) => s + r.stockValue, 0))}</span>
                </div>
              </div>
              <button onClick={() => setPicked(allPicked ? new Set() : new Set(filtered.map((r) => r.id)))}
                className="h-10 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-[11px] font-extrabold transition">
                {allPicked ? 'Sab hatao' : 'Sab chuno'}
              </button>
              <button onClick={exportCsv} className="h-10 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-[11px] font-extrabold inline-flex items-center gap-1.5 transition">
                <FileDown className="h-3.5 w-3.5" /> CSV
              </button>
              <button onClick={printA4} className="h-10 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-[11px] font-extrabold inline-flex items-center gap-1.5 transition">
                <Printer className="h-3.5 w-3.5" /> Print
              </button>
              <button onClick={() => setPicked(new Set())} className="h-10 w-10 ml-auto rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* List */}
          {isLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <div key={i} className="h-56 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <Empty
              icon={Package}
              title={rows.length === 0 ? 'Abhi koi product nahi' : 'Koi product nahi mila'}
              hint={
                rows.length === 0
                  ? 'Naya product banayein — wizard me warranty, installation charge aur serial ki setting bhi bhar dein'
                  : 'Search ya filter badal kar dekhein'
              }
              action={
                rows.length === 0
                  ? <Link to="/appliance-products/new"><Button className="bg-gradient-to-r from-cyan-600 to-teal-700 font-extrabold shadow-lg shadow-cyan-500/40"><Plus className="h-4 w-4" /> Pehla Product</Button></Link>
                  : <Button variant="secondary" onClick={clearFilters}><X className="h-4 w-4" /> Filters Clear</Button>
              }
            />
          ) : view === 'grid' ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filtered.map((r) => (
                <ProductCard key={r.id} r={r} checked={picked.has(r.id)} onToggle={() => toggle(r.id)}
                  onDelete={() => { if (confirm(`"${r.name}" delete karein?`)) removeMut.mutate(r.id); }} />
              ))}
            </div>
          ) : (
            <ProductTable rows={filtered} picked={picked} allPicked={allPicked} onToggle={toggle}
              onToggleAll={() => setPicked(allPicked ? new Set() : new Set(filtered.map((r) => r.id)))}
              onDelete={(r: any) => { if (confirm(`"${r.name}" delete karein?`)) removeMut.mutate(r.id); }} />
          )}
        </>
      )}
    </div>
  );
}

function TabBtn({ active, onClick, icon: Icon, label }: any) {
  return (
    <button onClick={onClick}
      className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-extrabold inline-flex items-center gap-1.5 transition ${
        active ? 'bg-slate-900 dark:bg-cyan-600 text-white shadow' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
      }`}>
      <Icon className="h-4 w-4" /> {label}
    </button>
  );
}

/* ═════════════ CARD ═════════════ */
function ProductCard({ r, checked, onToggle, onDelete }: any) {
  const cm = catMeta(r.categoryType);
  const img = Array.isArray(r.images) ? r.images[0] : null;
  const margin = r.price > 0 ? ((r.price - r.costPrice) / r.price) * 100 : 0;

  return (
    <div className={`group relative rounded-2xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all overflow-hidden ${
      checked ? 'border-cyan-500 dark:border-cyan-400 ring-2 ring-cyan-200 dark:ring-cyan-500/25'
        : r.isOut ? 'border-rose-300 dark:border-rose-500/40'
        : r.isLow ? 'border-amber-300 dark:border-amber-500/40'
        : 'border-slate-200 dark:border-slate-800 hover:border-cyan-300 dark:hover:border-cyan-500/50'
    }`}>
      <button onClick={onToggle} title="Chunein"
        className={`absolute top-2.5 right-2.5 z-10 h-7 w-7 rounded-lg border-2 flex items-center justify-center transition ${
          checked ? 'bg-cyan-600 border-cyan-600 text-white shadow'
            : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-transparent hover:border-cyan-400'
        }`}>
        <CheckCircle2 className="h-4 w-4" />
      </button>

      <Link to={`/appliance-products/${r.id}`} className="block p-4">
        <div className="flex items-start gap-3 pr-8">
          {img ? (
            <img src={img} alt={r.name} className="h-14 w-14 rounded-xl object-cover shadow shrink-0" />
          ) : (
            <div className="h-14 w-14 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-2xl shrink-0">
              {cm.emoji}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="font-extrabold text-slate-900 dark:text-white text-sm truncate group-hover:text-cyan-700 dark:group-hover:text-cyan-300 transition">
              {r.name}
            </h3>
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate">
              {r.brandLabel ? `${r.brandLabel} • ` : ''}{cm.label}{r.capacity ? ` • ${r.capacity}` : ''}
            </div>
            {r.modelNumber && (
              <div className="font-mono text-[10px] font-bold text-slate-400 dark:text-slate-500 truncate">{r.modelNumber}</div>
            )}
          </div>
        </div>

        {/* Badges — appliance ki khaas baatein */}
        <div className="mt-2.5 flex gap-1 flex-wrap">
          {!r.hasProfile && (
            <span className="px-1.5 py-0.5 rounded-md bg-amber-200 dark:bg-amber-500/30 text-amber-800 dark:text-amber-200 text-[9px] font-black">TAFSEEL BAQI</span>
          )}
          {r.requiresSerial && (
            <span className="px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 text-[10px] font-extrabold inline-flex items-center gap-1">
              <Barcode className="h-3 w-3" /> Serial
            </span>
          )}
          {r.requiresInstallation && (
            <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 text-[10px] font-extrabold inline-flex items-center gap-1">
              <HardHat className="h-3 w-3" /> {r.installationCharge > 0 ? formatPKR(r.installationCharge) : 'Lagani'}
            </span>
          )}
          {r.heavy && (
            <span className="px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300 text-[10px] font-extrabold inline-flex items-center gap-1">
              <Truck className="h-3 w-3" /> Bhari
            </span>
          )}
          {r.energy && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[10px] font-extrabold">
              {energyMeta(r.energy).emoji} {energyMeta(r.energy).label}
            </span>
          )}
          {r.isBestSeller && <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 text-[10px] font-extrabold inline-flex items-center gap-1"><Flame className="h-3 w-3" /> Hit</span>}
          {r.isNewArrival && <span className="px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 text-[10px] font-extrabold inline-flex items-center gap-1"><Sparkles className="h-3 w-3" /> Naya</span>}
        </div>

        {/* Warranty — teen alag */}
        {(r.warrantyMonths || r.compressorWarrantyMonths || r.motorWarrantyMonths) && (
          <div className="mt-2 flex gap-1.5 flex-wrap text-[10px] font-bold text-slate-500 dark:text-slate-400">
            {r.warrantyMonths ? <span>🛡️ {r.warrantyMonths}m</span> : null}
            {r.compressorWarrantyMonths ? <span>❄️ Comp {r.compressorWarrantyMonths}m</span> : null}
            {r.motorWarrantyMonths ? <span>⚙️ Motor {r.motorWarrantyMonths}m</span> : null}
          </div>
        )}

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className={`rounded-xl px-2.5 py-2 border ${
            r.isOut ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30'
              : r.isLow ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30'
              : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
          }`}>
            <div className={`text-[9px] font-extrabold uppercase tracking-wider ${
              r.isOut ? 'text-rose-700 dark:text-rose-400' : r.isLow ? 'text-amber-700 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'
            }`}>Stock</div>
            <div className={`text-sm font-extrabold tabular-nums ${
              r.isOut ? 'text-rose-700 dark:text-rose-300' : r.isLow ? 'text-amber-700 dark:text-amber-300' : 'text-slate-800 dark:text-slate-100'
            }`}>
              {r.isOut ? 'Khatam' : `${r.stock} ${r.unit ?? 'pcs'}`}
            </div>
          </div>
          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 px-2.5 py-2">
            <div className="text-[9px] text-emerald-700 dark:text-emerald-400 font-extrabold uppercase tracking-wider">Rate</div>
            <div className="text-sm font-extrabold text-emerald-700 dark:text-emerald-300 tabular-nums truncate">{formatPKR(r.price)}</div>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between text-[10px] font-bold text-slate-400 dark:text-slate-500">
          <span>Lagat {formatPKR(r.costPrice)}</span>
          <span className={margin >= 15 ? 'text-emerald-600 dark:text-emerald-400' : margin > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}>
            {margin.toFixed(0)}% margin
          </span>
        </div>
      </Link>

      <div className="px-3 py-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between gap-1">
        <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 truncate">
          {r.sku || r.barcode || '—'}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Link to={`/appliance-products/${r.id}`}
            className="h-8 px-2.5 rounded-lg bg-slate-200/70 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-[10px] font-extrabold inline-flex items-center gap-1 transition">
            Detail <ChevronRight className="h-3 w-3" />
          </Link>
          <Link to={`/appliance-products/${r.id}/edit`}
            className="h-8 w-8 rounded-lg bg-cyan-100 dark:bg-cyan-500/15 hover:bg-cyan-200 dark:hover:bg-cyan-500/25 text-cyan-700 dark:text-cyan-300 flex items-center justify-center transition" title="Edit">
            <Pencil className="h-3.5 w-3.5" />
          </Link>
          <button onClick={(e) => { e.preventDefault(); onDelete(); }}
            className="h-8 w-8 rounded-lg bg-rose-100 dark:bg-rose-500/15 hover:bg-rose-200 dark:hover:bg-rose-500/25 text-rose-700 dark:text-rose-400 flex items-center justify-center transition" title="Delete">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═════════════ TABLE ═════════════ */
function ProductTable({ rows, picked, allPicked, onToggle, onToggleAll, onDelete }: any) {
  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[980px]">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/80 border-b-2 border-slate-200 dark:border-slate-700">
              <th className="px-3 py-3 w-10">
                <button onClick={onToggleAll}
                  className={`h-6 w-6 rounded-md border-2 flex items-center justify-center transition ${
                    allPicked ? 'bg-cyan-600 border-cyan-600 text-white'
                      : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-transparent hover:border-cyan-400'
                  }`}>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </button>
              </th>
              <Th className="text-left">Cheez</Th>
              <Th className="text-left">Brand / Model</Th>
              <Th className="text-center">Khaas</Th>
              <Th className="text-center">Warranty</Th>
              <Th className="text-center">Stock</Th>
              <Th className="text-right">Lagat</Th>
              <Th className="text-right">Rate</Th>
              <Th className="text-right pr-4">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r: any) => {
              const on = picked.has(r.id);
              return (
                <tr key={r.id} className={`border-b border-slate-100 dark:border-slate-800 transition ${
                  on ? 'bg-cyan-50 dark:bg-cyan-500/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}>
                  <td className="px-3 py-2.5">
                    <button onClick={() => onToggle(r.id)}
                      className={`h-6 w-6 rounded-md border-2 flex items-center justify-center transition ${
                        on ? 'bg-cyan-600 border-cyan-600 text-white'
                          : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-transparent hover:border-cyan-400'
                      }`}>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                  <td className="px-3 py-2.5">
                    <Link to={`/appliance-products/${r.id}`} className="flex items-center gap-2 group">
                      <span className="text-lg shrink-0">{catEmoji(r.categoryType)}</span>
                      <div className="min-w-0">
                        <div className="text-[13px] font-extrabold text-slate-900 dark:text-white truncate group-hover:text-cyan-700 dark:group-hover:text-cyan-300 transition">
                          {r.name}
                        </div>
                        <div className="text-[10px] font-bold text-slate-400">
                          {catLabel(r.categoryType)}{r.capacity ? ` • ${r.capacity}` : ''}{r.sku ? ` • ${r.sku}` : ''}
                        </div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300">
                    {r.brandLabel || '—'}
                    {r.modelNumber && <div className="font-mono text-[10px] text-slate-400">{r.modelNumber}</div>}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-center gap-1">
                      {r.requiresSerial && <span title="Serial rakhna parta hai">🔖</span>}
                      {r.requiresInstallation && <span title={`Lagani parti hai — ${formatPKR(r.installationCharge)}`}>🔧</span>}
                      {r.heavy && <span title="Bhari saman">🚚</span>}
                      {!r.hasProfile && <span title="Appliance tafseel adhoori" className="text-amber-500">⚠️</span>}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-center text-[10px] font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {r.warrantyMonths ? `${r.warrantyMonths}m` : '—'}
                    {r.compressorWarrantyMonths ? ` / ${r.compressorWarrantyMonths}m` : ''}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-extrabold tabular-nums ${
                      r.isOut ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300'
                        : r.isLow ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}>{r.stock}</span>
                  </td>
                  <td className="px-3 py-2.5 text-right text-xs font-bold tabular-nums text-slate-600 dark:text-slate-300 whitespace-nowrap">{formatPKR(r.costPrice)}</td>
                  <td className="px-3 py-2.5 text-right text-xs font-extrabold tabular-nums text-emerald-700 dark:text-emerald-400 whitespace-nowrap">{formatPKR(r.price)}</td>
                  <td className="px-3 py-2.5 pr-4">
                    <div className="flex items-center justify-end gap-1">
                      <Link to={`/appliance-products/${r.id}`}
                        className="h-8 w-8 rounded-lg bg-slate-200/70 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 flex items-center justify-center transition" title="Detail">
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                      <Link to={`/appliance-products/${r.id}/edit`}
                        className="h-8 w-8 rounded-lg bg-cyan-100 dark:bg-cyan-500/15 hover:bg-cyan-200 dark:hover:bg-cyan-500/25 text-cyan-700 dark:text-cyan-300 flex items-center justify-center transition" title="Edit">
                        <Pencil className="h-3.5 w-3.5" />
                      </Link>
                      <button onClick={() => onDelete(r)}
                        className="h-8 w-8 rounded-lg bg-rose-100 dark:bg-rose-500/15 hover:bg-rose-200 dark:hover:bg-rose-500/25 text-rose-700 dark:text-rose-400 flex items-center justify-center transition" title="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-slate-900 dark:bg-slate-950 text-white">
              <td colSpan={6} className="px-3 py-3 text-right text-[11px] font-extrabold uppercase tracking-widest">
                {rows.length} products ka total
              </td>
              <td className="px-3 py-3 text-right text-xs font-extrabold text-cyan-300 tabular-nums whitespace-nowrap">
                {formatPKR(rows.reduce((s: number, r: any) => s + r.stockValue, 0))}
              </td>
              <td className="px-3 py-3 text-right text-xs font-extrabold text-emerald-300 tabular-nums whitespace-nowrap">
                {formatPKR(rows.reduce((s: number, r: any) => s + r.retailValue, 0))}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`px-3 py-3 text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400 whitespace-nowrap ${className}`}>
      {children}
    </th>
  );
}

/* ═════════════ ANALYTICS ═════════════ */
function ProductAnalytics({ rows }: { rows: any[] }) {
  const a = useMemo(() => {
    const byCat = new Map<string, { name: string; count: number; value: number; units: number }>();
    for (const r of rows) {
      const key = catMeta(r.categoryType).group;
      const c = byCat.get(key) ?? { name: key, count: 0, value: 0, units: 0 };
      c.count += 1; c.value += r.stockValue; c.units += r.stock;
      byCat.set(key, c);
    }

    const byBrand = new Map<string, { name: string; count: number; value: number }>();
    for (const r of rows) {
      const key = r.brandLabel ?? 'Bina brand';
      const b = byBrand.get(key) ?? { name: key, count: 0, value: 0 };
      b.count += 1; b.value += r.stockValue;
      byBrand.set(key, b);
    }

    const margins = rows.filter((r) => r.price > 0).map((r) => ({
      ...r, margin: ((r.price - r.costPrice) / r.price) * 100,
    }));

    return {
      byCat: [...byCat.values()].sort((x, y) => y.value - x.value),
      byBrand: [...byBrand.values()].sort((x, y) => y.value - x.value).slice(0, 10),
      lowMargin: margins.filter((r) => r.margin < 10).sort((x, y) => x.margin - y.margin).slice(0, 10),
      topMargin: [...margins].sort((x, y) => y.margin - x.margin).slice(0, 10),
      noProfile: rows.filter((r) => !r.hasProfile),
      noWarranty: rows.filter((r) => r.hasProfile && !r.warrantyMonths),
      installNoCharge: rows.filter((r) => r.requiresInstallation && r.installationCharge <= 0),
      value: rows.reduce((s, r) => s + r.stockValue, 0),
    };
  }, [rows]);

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="grid lg:grid-cols-2 gap-3 sm:gap-4">
        <Panel icon={Boxes} title="Qism Ke Hisab Se Paisa" hint="Kis cheez me sab se ziyada stock phansa hai" tone="cyan">
          {a.byCat.length === 0 ? (
            <p className="text-xs font-bold text-slate-400 py-8 text-center">Abhi koi product nahi</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={a.byCat} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={52} outerRadius={92} paddingAngle={2}>
                  {a.byCat.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => formatPKR(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 10, fontWeight: 700 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Panel>

        <Panel icon={Star} title="Brand Ke Hisab Se" hint="Kaunse brand me sab se ziyada paisa laga hai" tone="violet">
          {a.byBrand.length === 0 ? (
            <p className="text-xs font-bold text-slate-400 py-8 text-center">Abhi koi product nahi</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(240, a.byBrand.length * 30)}>
              <BarChart data={a.byBrand} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fontWeight: 700 }} stroke="#94a3b8"
                  tickFormatter={(v) => (Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10, fontWeight: 700 }} stroke="#94a3b8" />
                <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => formatPKR(Number(v))} />
                <Bar dataKey="value" name="Stock ki lagat" fill="#a855f7" radius={[0, 5, 5, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Panel>
      </div>

      {/* Jin par kaam chahiye */}
      <div className="grid lg:grid-cols-3 gap-3 sm:gap-4">
        <Panel icon={AlertTriangle} title={`Tafseel Adhoori (${a.noProfile.length})`}
          hint="In par POS installation book nahi kar sakta" tone="amber">
          {a.noProfile.length === 0 ? (
            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 py-6 text-center">✅ Sab ki tafseel poori hai</p>
          ) : (
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {a.noProfile.slice(0, 15).map((r: any) => (
                <Link key={r.id} to={`/appliance-products/${r.id}/edit`}
                  className="flex items-center gap-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 px-2.5 py-2 hover:shadow transition">
                  <span className="text-base shrink-0">{catEmoji(r.categoryType)}</span>
                  <span className="text-[11px] font-extrabold text-slate-900 dark:text-white truncate flex-1">{r.name}</span>
                  <Pencil className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </Panel>

        <Panel icon={ShieldCheck} title={`Warranty Nahi Lagi (${a.noWarranty.length})`}
          hint="Bikne par warranty ki tareekh nahi banegi" tone="violet">
          {a.noWarranty.length === 0 ? (
            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 py-6 text-center">✅ Sab par warranty lagi hai</p>
          ) : (
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {a.noWarranty.slice(0, 15).map((r: any) => (
                <Link key={r.id} to={`/appliance-products/${r.id}/edit`}
                  className="flex items-center gap-2 rounded-xl bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/30 px-2.5 py-2 hover:shadow transition">
                  <span className="text-base shrink-0">{catEmoji(r.categoryType)}</span>
                  <span className="text-[11px] font-extrabold text-slate-900 dark:text-white truncate flex-1">{r.name}</span>
                  <Pencil className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400 shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </Panel>

        <Panel icon={HardHat} title={`Installation Charge 0 (${a.installNoCharge.length})`}
          hint="Lagani parti hai lekin paisa set nahi" tone="blue">
          {a.installNoCharge.length === 0 ? (
            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 py-6 text-center">✅ Sab par charge laga hai</p>
          ) : (
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {a.installNoCharge.slice(0, 15).map((r: any) => (
                <Link key={r.id} to={`/appliance-products/${r.id}/edit`}
                  className="flex items-center gap-2 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 px-2.5 py-2 hover:shadow transition">
                  <span className="text-base shrink-0">{catEmoji(r.categoryType)}</span>
                  <span className="text-[11px] font-extrabold text-slate-900 dark:text-white truncate flex-1">{r.name}</span>
                  <Pencil className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* Margin */}
      <div className="grid lg:grid-cols-2 gap-3 sm:gap-4">
        <Panel icon={Percent} title="Sab Se Kam Margin" hint="In ka rate ya purchase dobara dekhein" tone="rose">
          {a.lowMargin.length === 0 ? (
            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 py-6 text-center">✅ Har product ka margin 10% se upar</p>
          ) : (
            <div className="space-y-1">
              {a.lowMargin.map((r: any) => (
                <Link key={r.id} to={`/appliance-products/${r.id}`}
                  className="flex items-center gap-2.5 rounded-xl px-2 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition">
                  <span className="text-base shrink-0">{catEmoji(r.categoryType)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-extrabold text-slate-900 dark:text-white truncate">{r.name}</div>
                    <div className="text-[10px] font-bold text-slate-400">
                      Lagat {formatPKR(r.costPrice)} → Bechna {formatPKR(r.price)}
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold shrink-0 ${
                    r.margin < 0 ? 'bg-rose-600 text-white' : 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300'
                  }`}>{r.margin.toFixed(0)}%</span>
                </Link>
              ))}
            </div>
          )}
        </Panel>

        <Panel icon={TrendingUp} title="Sab Se Acha Margin" hint="Inhe customer ko pehle dikhayein" tone="emerald">
          {a.topMargin.length === 0 ? (
            <p className="text-xs font-bold text-slate-400 py-6 text-center">Abhi data nahi</p>
          ) : (
            <div className="space-y-1">
              {a.topMargin.map((r: any, i: number) => (
                <Link key={r.id} to={`/appliance-products/${r.id}`}
                  className="flex items-center gap-2.5 rounded-xl px-2 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition">
                  <span className={`h-6 w-6 rounded-lg text-[10px] font-extrabold flex items-center justify-center shrink-0 ${
                    i === 0 ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-extrabold text-slate-900 dark:text-white truncate">{r.name}</div>
                    <div className="text-[10px] font-bold text-slate-400">{formatPKR(r.price - r.costPrice)} per unit</div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 shrink-0">
                    {r.margin.toFixed(0)}%
                  </span>
                </Link>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

/* ═════════════ TEACHER ═════════════ */
function ProductsTeacher({ onClose }: { onClose: () => void }) {
  return (
    <Teacher
      title="Products Page — Appliances Me Kya Alag Hai?"
      intro={
        <>
          Aam dukaan me product ka naam, rate aur stock kaafi hota hai. Appliance me <strong>teen aur
          cheezein</strong> zaroori hain — warna POS aur warranty dono adhoore reh jate hain.
        </>
      }
      blocks={[
        {
          title: '🔑 Teen zaroori settings',
          tone: 'cyan',
          tips: [
            <><span className="px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 text-[10px] font-black">🔖 Serial</span> — AC, fridge, washing machine ka <strong>serial register</strong> rakha jata hai. Is se warranty aur repair ka poora record milta hai</>,
            <><span className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 text-[10px] font-black">🔧 Lagani</span> — POS par bechte waqt <strong>installation khud book ho jati hai</strong> aur charge bill me jurta hai</>,
            <><strong>🛡️ Warranty</strong> — main, compressor aur motor teenon ke mahine. Bikne par tareekhein khud lag jati hain</>,
            <><span className="px-1.5 py-0.5 rounded bg-amber-200 dark:bg-amber-500/30 text-amber-800 dark:text-amber-200 text-[9px] font-black">TAFSEEL BAQI</span> ka matlab ye settings nahi lagin — edit kar ke bhar dein</>,
          ],
        },
        {
          title: '📊 Analytics tab',
          tone: 'violet',
          tips: [
            <><Kbd dark>A</Kbd> — <strong>"Tafseel adhoori"</strong>, <strong>"Warranty nahi lagi"</strong> aur <strong>"Installation charge 0"</strong> ki teen lists. Har naam par click kar ke seedha edit kholta hai</>,
            <><strong>Sab se kam margin</strong> — jin ka margin 10% se neeche hai. Purchase rate ya bechne ka rate dobara dekhein</>,
            <><strong>Qism aur brand ke chart</strong> — paisa kis cheez me phansa hai</>,
          ],
        },
        {
          title: '⚡ Tez kaam',
          tone: 'emerald',
          tips: [
            <><Kbd dark>G</Kbd> — cards aur table me switch. Table me warranty aur khaas nishaniyan ek nazar me</>,
            <><strong>☑️ Chunein</strong> phir CSV ya print — sirf chuni hui cheezon ki list</>,
            <><strong>Khaas filters</strong> — serial wale, lagane wale, stock kam, khatam</>,
            <><Kbd dark>P</Kbd> — A4 product list, stock aur installation charge ke sath</>,
          ],
        },
      ]}
      shortcuts={[
        { keys: '/', label: 'Search' },
        { keys: 'N', label: 'Naya product' },
        { keys: 'G', label: 'Grid / List' },
        { keys: 'A', label: 'Analytics' },
        { keys: 'F', label: 'Filters' },
        { keys: 'P', label: 'Print' },
        { keys: 'T', label: 'Ye guide' },
      ]}
      golden={
        <>
          <strong>Sunahri usool:</strong> Naya product banate waqt <strong>warranty aur installation charge
          usi waqt bhar dein</strong>. Baad me yaad nahi rehta, aur phir har bikri par kaam adhoora reh jata hai.
        </>
      }
      onClose={onClose}
    />
  );
}
