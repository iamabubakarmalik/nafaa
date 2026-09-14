import { useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  PackageX, Search, X, RefreshCw, AlertTriangle, TrendingDown, Wallet,
  ShoppingCart, Barcode, FileDown, MessageCircle, Package, Zap, LayoutGrid,
  List as ListIcon, CheckCircle2, Plus, Filter,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from 'recharts';
import { toast } from 'sonner';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { useAuthStore } from '@core/stores/auth.store';
import { appliancesAnalyticsApi, type ApplianceLowStockRow } from '../api/analytics.api';
import {
  ApplianceHero, Kpi, Panel, Teacher, Empty, useShortcuts, printHtml,
  downloadCsv, a4Shell, escapeHtml, toDateInput, guideAction, printAction, Kbd,
  ChipRow, inputCls,
} from '../components/shared';
import { catMeta, catLabel, catEmoji, energyMeta } from '../constants';

/* ═════════════════════════════════════════════════════════════
   LOW STOCK — "kya khatam ho raha hai"
   ─────────────────────────────────────────────────────────────
   Appliances me ye normal dukaan se alag hai:
     • Serial wale model ki ginti serial register se aati hai,
       Product.stock se nahi
     • Har cheez mehngi hai — "dobara mangwane ka kharcha" janna
       zaroori hai, warna order dete waqt paisa kam par jata hai
     • Season ka farq: garmi me AC, sardi me geyser
   ═════════════════════════════════════════════════════════════ */

type View = 'grid' | 'list';

export default function AppliancesLowStockPage() {
  const shopName = useAuthStore((s) => s.tenant?.name) || 'Meri Dukaan';
  const shopPhone = useAuthStore((s: any) => s.tenant?.phone || '');
  const searchRef = useRef<HTMLInputElement>(null);

  const [showTeacher, setShowTeacher] = useState(false);
  const [search, setSearch] = useState('');
  const [group, setGroup] = useState<string | null>(null);
  const [outOnly, setOutOnly] = useState(false);
  const [view, setView] = useState<View>('grid');
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['appliance-low-stock'],
    queryFn: appliancesAnalyticsApi.lowStock,
  });

  const all = data?.items ?? [];

  /** Category ke bare group (AC, Cooling, Laundry…) ke hisab se ginti */
  const groupCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of all) {
      const g = catMeta(r.categoryType).group;
      m.set(g, (m.get(g) ?? 0) + 1);
    }
    return m;
  }, [all]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter((r) => {
      if (outOnly && !r.isOut) return false;
      if (group && catMeta(r.categoryType).group !== group) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        (r.sku ?? '').toLowerCase().includes(q) ||
        (r.brand ?? '').toLowerCase().includes(q) ||
        (r.modelNumber ?? '').toLowerCase().includes(q) ||
        catLabel(r.categoryType).toLowerCase().includes(q)
      );
    });
  }, [all, search, group, outOnly]);

  const pickedRows = useMemo(() => rows.filter((r) => picked.has(r.productId)), [rows, picked]);
  const orderRows = pickedRows.length ? pickedRows : rows;
  const orderCost = orderRows.reduce((s, r) => s + r.reorderCost, 0);

  const toggle = (id: string) =>
    setPicked((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  const allPicked = rows.length > 0 && rows.every((r) => picked.has(r.productId));

  const s = data?.summary;

  /* ─── CSV ─── */
  const exportCsv = () => {
    if (!orderRows.length) return toast.error('Koi cheez nahi');
    downloadCsv(`low-stock-${toDateInput(new Date())}.csv`, [
      [`Low Stock — ${shopName}`],
      [`Nikala gaya: ${new Date().toLocaleString('en-PK')}`],
      s ? [`Kam: ${s.totalLow} • Khatam: ${s.totalOut} • Dobara mangwane ka kharcha: ${s.reorderCost.toFixed(0)}`] : [],
      [],
      ['Cheez', 'Brand', 'Model', 'Qism', 'SKU', 'Capacity', 'Energy',
       'Mojooda stock', 'Alert level', 'Kitne mangwane', 'Lagat/unit', 'Order ka kharcha',
       'Bechne ka rate', 'Serial wala', 'Installation chahiye'],
      ...orderRows.map((r) => {
        const need = Math.max(r.lowStockAlert - r.stock, 1);
        return [
          r.name, r.brand ?? '', r.modelNumber ?? '', catLabel(r.categoryType), r.sku ?? '',
          r.capacity ?? '', r.energyRating ? energyMeta(r.energyRating).label : '',
          r.stock, r.lowStockAlert, need, r.costPrice, r.reorderCost, r.price,
          r.requiresSerial ? 'Haan' : 'Nahi', r.requiresInstallation ? 'Haan' : 'Nahi',
        ];
      }),
    ]);
    toast.success(`${orderRows.length} cheezein export ho gayin`);
  };

  /* ─── A4 purchase order ─── */
  const printA4 = () => {
    if (!orderRows.length) return toast.error('Koi cheez nahi');
    const body = `
      <h2 class="sec">🛒 Kya Mangwana Hai${pickedRows.length ? ' (sirf chuni hui cheezein)' : ''}</h2>
      <table>
        <thead><tr>
          <th>#</th><th>Cheez</th><th>Brand / Model</th><th class="c">Abhi</th>
          <th class="c">Alert</th><th class="c">Mangwana</th><th class="r">Lagat/unit</th><th class="r">Kharcha</th>
        </tr></thead>
        <tbody>
          ${orderRows.map((r, i) => {
            const need = Math.max(r.lowStockAlert - r.stock, 1);
            return `
            <tr>
              <td class="num">${i + 1}</td>
              <td>
                <div class="main">${catEmoji(r.categoryType)} ${escapeHtml(r.name)}</div>
                <div class="sub">${escapeHtml(catLabel(r.categoryType))}${r.capacity ? ` • ${escapeHtml(r.capacity)}` : ''}${r.sku ? ` • ${escapeHtml(r.sku)}` : ''}</div>
              </td>
              <td>${escapeHtml(r.brand ?? '—')}${r.modelNumber ? `<div class="sub">${escapeHtml(r.modelNumber)}</div>` : ''}</td>
              <td class="c" style="font-weight:800;color:${r.isOut ? '#b91c1c' : '#d97706'}">${r.stock}</td>
              <td class="c">${r.lowStockAlert}</td>
              <td class="c" style="font-weight:800;">${need}</td>
              <td class="r">${formatPKR(r.costPrice)}</td>
              <td class="r">${formatPKR(r.reorderCost)}</td>
            </tr>`;
          }).join('')}
          <tr class="grand">
            <td colspan="7" style="text-align:right;padding-right:12px;">KUL KHARCHA</td>
            <td class="r" style="color:#a5f3fc !important;">${formatPKR(orderCost)}</td>
          </tr>
        </tbody>
      </table>
      <div style="margin-top:22px;display:flex;justify-content:space-between;gap:40px;">
        <div style="flex:1;border-top:1.5px solid #0f172a;padding-top:5px;text-align:center;font-size:10px;font-weight:700;">Order dene wala</div>
        <div style="flex:1;border-top:1.5px solid #0f172a;padding-top:5px;text-align:center;font-size:10px;font-weight:700;">Supplier ke dastakhat</div>
      </div>`;

    const ok = printHtml(a4Shell({
      title: `Low Stock — ${shopName}`,
      heading: '📉 Kya Khatam Ho Raha Hai',
      shopName, shopPhone, badge: 'Purchase Order',
      kpis: [
        { label: '⚠️ Kam Ho Gayi', value: String(s?.totalLow ?? 0), sub: 'alert level se neeche', tone: 'amber' },
        { label: '🚫 Bilkul Khatam', value: String(s?.totalOut ?? 0), sub: 'stock 0', tone: 'rose' },
        { label: '💰 Order Ka Kharcha', value: formatPKR(orderCost), sub: `${orderRows.length} cheezein`, tone: 'blue' },
        { label: '📦 Phansa Paisa', value: formatPKR(s?.valueAtRisk ?? 0), sub: 'jo bacha hai uski lagat', tone: 'green' },
      ],
      body,
    }));
    if (!ok) toast.error('Popup block hai — allow karein');
  };

  /** Supplier ko WhatsApp par seedha order list */
  const waOrder = () => {
    if (!orderRows.length) return toast.error('Koi cheez nahi');
    const lines = orderRows.slice(0, 40).map((r, i) => {
      const need = Math.max(r.lowStockAlert - r.stock, 1);
      return `${i + 1}. ${r.name}${r.modelNumber ? ` (${r.modelNumber})` : ''} — *${need}* ${r.unit || 'pcs'}`;
    });
    const msg = `Assalam-o-Alaikum! 🙏\n\n*${shopName}* ki taraf se order:\n\n${lines.join('\n')}\n${orderRows.length > 40 ? `\n…aur ${orderRows.length - 40} cheezein` : ''}\n\nRate aur availability bata dein. Shukriya!`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  useShortcuts({
    '/': () => searchRef.current?.focus(),
    t: () => setShowTeacher(true),
    p: () => printA4(),
    g: () => setView((v) => (v === 'grid' ? 'list' : 'grid')),
    o: () => setOutOnly((v) => !v),
    Escape: () => {
      if (showTeacher) setShowTeacher(false);
      else if (picked.size) setPicked(new Set());
    },
  }, [showTeacher, picked.size, orderRows]);

  const chartData = useMemo(
    () => (data?.byCategory ?? []).slice(0, 10).map((c) => ({
      name: `${catEmoji(c.categoryType)} ${catLabel(c.categoryType)}`,
      count: c.count,
      value: c.value,
    })),
    [data],
  );

  return (
    <div className="space-y-4 sm:space-y-5 pb-10">
      {showTeacher && <LowStockTeacher onClose={() => setShowTeacher(false)} />}

      <ApplianceHero
        badge="Stock Alert"
        badgeIcon={<PackageX className="h-3.5 w-3.5 text-amber-300" />}
        title="📉 Kya Khatam Ho Raha Hai"
        subtitle={
          s ? (
            <>
              <strong className="text-amber-300">{s.totalLow}</strong> cheezein kam
              <span className="opacity-50 mx-1.5">•</span>
              <strong className="text-rose-300">{s.totalOut}</strong> bilkul khatam
              <span className="opacity-50 mx-1.5">•</span>
              order ka kharcha <strong className="text-cyan-200">{formatPKR(s.reorderCost)}</strong>
            </>
          ) : 'Alert level se neeche jane wali har cheez yahan'
        }
        actions={[
          guideAction(() => setShowTeacher(true)),
          { key: 'refresh', label: 'Refresh', icon: <RefreshCw className="h-4 w-4" />, onClick: () => refetch(), spinning: isFetching, hideLabelOnMobile: true },
          { key: 'wa', label: 'Order Bhejein', icon: <MessageCircle className="h-4 w-4" />, onClick: waOrder, disabled: !orderRows.length, variant: 'accent', hideLabelOnMobile: true },
          { key: 'csv', label: 'CSV', icon: <FileDown className="h-4 w-4" />, onClick: exportCsv, disabled: !orderRows.length, hideLabelOnMobile: true },
          printAction(printA4, !orderRows.length),
        ]}
        shortcuts={[
          { keys: '/', label: 'Search' }, { keys: 'G', label: 'Grid/List' },
          { keys: 'O', label: 'Sirf khatam' }, { keys: 'P', label: 'Print' },
          { keys: 'T', label: 'Guide' }, { keys: 'Esc', label: 'Clear' },
        ]}
      />

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <Kpi icon={TrendingDown} tone="amber" label="Kam Ho Gayin" value={s?.totalLow ?? 0} sub="alert level se neeche" />
        <Kpi icon={AlertTriangle} tone="rose" label="Bilkul Khatam" value={s?.totalOut ?? 0} sub="stock 0 — foran mangwayein"
          alert={(s?.totalOut ?? 0) > 0} onClick={() => setOutOnly(!outOnly)} active={outOnly} />
        <Kpi icon={ShoppingCart} tone="cyan" label="Order Ka Kharcha" value={formatPKR(orderCost)}
          sub={pickedRows.length ? `${pickedRows.length} chuni hui` : `${rows.length} cheezein`} />
        <Kpi icon={Barcode} tone="violet" label="Serial Wale" value={s?.serialTrackedLow ?? 0} sub="ginti serial register se" />
      </section>

      {/* Category chart */}
      {chartData.length > 0 && (
        <Panel icon={Package} title="Kis Qism Me Sab Se Ziyada Kami" hint="Order dete waqt yahan se shuru karein" tone="amber">
          <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 34)}>
            <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fontWeight: 700 }} stroke="#94a3b8" />
              <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 10, fontWeight: 700 }} stroke="#94a3b8" />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: '2px solid #334155', background: '#0f172a', color: '#fff', fontSize: 12, fontWeight: 700 }}
                formatter={(v: any, n: any) => [n === 'Kharcha' ? formatPKR(Number(v)) : v, n === 'count' ? 'Cheezein' : n]}
              />
              <Bar dataKey="count" name="Cheezein" radius={[0, 6, 6, 0]}>
                {chartData.map((_, i) => <Cell key={i} fill={i === 0 ? '#ef4444' : i < 3 ? '#f59e0b' : '#06b6d4'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      )}

      {/* Toolbar */}
      <div className="flex gap-2 flex-wrap items-center">
        <div className="flex-1 min-w-[220px] relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input ref={searchRef} className={inputCls('h-12 pl-10 pr-10 text-sm font-semibold')}
            placeholder="Naam, brand, model, SKU... (/)" value={search} onChange={(e) => setSearch(e.target.value)} />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center">
              <X className="h-4 w-4 text-slate-400" />
            </button>
          )}
        </div>
        <div className="inline-flex rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1 h-12">
          <button onClick={() => setView('grid')}
            className={`px-3 rounded-xl text-xs font-extrabold inline-flex items-center gap-1.5 transition ${
              view === 'grid' ? 'bg-cyan-600 text-white shadow' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}>
            <LayoutGrid className="h-4 w-4" /> <span className="hidden md:inline">Cards</span>
          </button>
          <button onClick={() => setView('list')}
            className={`px-3 rounded-xl text-xs font-extrabold inline-flex items-center gap-1.5 transition ${
              view === 'list' ? 'bg-cyan-600 text-white shadow' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}>
            <ListIcon className="h-4 w-4" /> <span className="hidden md:inline">List</span>
          </button>
        </div>
        <button onClick={() => setOutOnly(!outOnly)}
          className={`h-12 px-4 rounded-2xl border-2 text-xs font-extrabold inline-flex items-center gap-1.5 transition ${
            outOnly ? 'border-rose-500 bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300'
              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-rose-300'
          }`}>
          <AlertTriangle className="h-4 w-4" /> <span className="hidden sm:inline">Sirf khatam</span>
        </button>
      </div>

      {groupCounts.size > 1 && (
        <ChipRow
          options={[...groupCounts.entries()].sort((a, b) => b[1] - a[1]).map(([g, c]) => ({ value: g, label: g, count: c }))}
          value={group}
          onChange={setGroup}
          allLabel={`Sab (${all.length})`}
        />
      )}

      {/* Bulk bar */}
      {picked.size > 0 && (
        <div className="sticky top-2 z-30 rounded-2xl bg-gradient-to-r from-slate-900 to-cyan-900 dark:from-slate-950 dark:to-cyan-950 text-white border-2 border-cyan-400/40 shadow-2xl p-3 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 mr-1">
            <div className="h-9 w-9 rounded-xl bg-white/15 flex items-center justify-center font-extrabold tabular-nums text-sm">{picked.size}</div>
            <div className="text-xs font-extrabold leading-tight">
              chuni hui<br /><span className="text-white/60 font-bold">kharcha {formatPKR(orderCost)}</span>
            </div>
          </div>
          <button onClick={() => setPicked(allPicked ? new Set() : new Set(rows.map((r) => r.productId)))}
            className="h-10 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-[11px] font-extrabold transition">
            {allPicked ? 'Sab hatao' : 'Sab chuno'}
          </button>
          <button onClick={waOrder} className="h-10 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-[11px] font-extrabold inline-flex items-center gap-1.5 transition">
            <MessageCircle className="h-3.5 w-3.5" /> WhatsApp Order
          </button>
          <button onClick={exportCsv} className="h-10 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-[11px] font-extrabold inline-flex items-center gap-1.5 transition">
            <FileDown className="h-3.5 w-3.5" /> CSV
          </button>
          <button onClick={printA4} className="h-10 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-[11px] font-extrabold inline-flex items-center gap-1.5 transition">
            <ShoppingCart className="h-3.5 w-3.5" /> Purchase Order
          </button>
          <button onClick={() => setPicked(new Set())} className="h-10 w-10 ml-auto rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-44 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />)}
        </div>
      ) : rows.length === 0 ? (
        <Empty
          icon={CheckCircle2}
          title={all.length === 0 ? 'Sab stock theek hai 🎉' : 'Is filter me kuch nahi'}
          hint={
            all.length === 0
              ? 'Koi cheez alert level se neeche nahi gayi. Alert level product ki settings me set hota hai.'
              : 'Filter badal kar dekhein'
          }
          action={
            all.length > 0 ? (
              <Button variant="secondary" onClick={() => { setSearch(''); setGroup(null); setOutOnly(false); }}>
                <X className="h-4 w-4" /> Filter Clear
              </Button>
            ) : (
              <Link to="/appliance-products"><Button className="bg-gradient-to-r from-cyan-600 to-teal-700 font-extrabold"><Package className="h-4 w-4" /> Products Dekhein</Button></Link>
            )
          }
        />
      ) : view === 'grid' ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {rows.map((r) => (
            <LowCard key={r.productId} r={r} checked={picked.has(r.productId)} onToggle={() => toggle(r.productId)} />
          ))}
        </div>
      ) : (
        <LowTable rows={rows} picked={picked} allPicked={allPicked} onToggle={toggle}
          onToggleAll={() => setPicked(allPicked ? new Set() : new Set(rows.map((r) => r.productId)))} />
      )}
    </div>
  );
}

/* ═════════════ CARD ═════════════ */
function LowCard({ r, checked, onToggle }: { r: ApplianceLowStockRow; checked: boolean; onToggle: () => void }) {
  const need = Math.max(r.lowStockAlert - r.stock, 1);
  const cm = catMeta(r.categoryType);
  const pct = r.lowStockAlert > 0 ? Math.min((r.stock / r.lowStockAlert) * 100, 100) : 0;

  return (
    <div className={`relative rounded-2xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all overflow-hidden ${
      checked ? 'border-cyan-500 dark:border-cyan-400 ring-2 ring-cyan-200 dark:ring-cyan-500/25'
        : r.isOut ? 'border-rose-300 dark:border-rose-500/40' : 'border-amber-200 dark:border-amber-500/30'
    }`}>
      <button onClick={onToggle} title="Order list ke liye chunein"
        className={`absolute top-2.5 right-2.5 z-10 h-7 w-7 rounded-lg border-2 flex items-center justify-center transition ${
          checked ? 'bg-cyan-600 border-cyan-600 text-white shadow'
            : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-transparent hover:border-cyan-400'
        }`}>
        <CheckCircle2 className="h-4 w-4" />
      </button>

      <Link to={`/appliance-products/${r.productId}`} className="block p-4">
        <div className="flex items-start gap-2.5 pr-8">
          <div className={`h-11 w-11 rounded-xl flex items-center justify-center text-xl shrink-0 ${
            r.isOut ? 'bg-rose-100 dark:bg-rose-500/15' : 'bg-amber-100 dark:bg-amber-500/15'
          }`}>
            {cm.emoji}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-extrabold text-slate-900 dark:text-white text-sm truncate">{r.name}</h3>
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate">
              {r.brand ? `${r.brand} • ` : ''}{cm.label}
              {r.capacity ? ` • ${r.capacity}` : ''}
            </div>
            {r.modelNumber && (
              <div className="font-mono text-[10px] font-bold text-slate-400 dark:text-slate-500 truncate">{r.modelNumber}</div>
            )}
          </div>
        </div>

        {/* Stock bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-[11px] font-extrabold mb-1">
            <span className={r.isOut ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'}>
              {r.isOut ? '🚫 Bilkul khatam' : `${r.stock} ${r.unit || 'pcs'} bachay`}
            </span>
            <span className="text-slate-400 dark:text-slate-500">alert: {r.lowStockAlert}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
            <div className={`h-full rounded-full transition-all ${r.isOut ? 'bg-rose-500' : 'bg-gradient-to-r from-amber-400 to-orange-500'}`}
              style={{ width: `${Math.max(pct, r.isOut ? 0 : 6)}%` }} />
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/30 px-2.5 py-2">
            <div className="text-[9px] text-cyan-700 dark:text-cyan-400 font-extrabold uppercase tracking-wider">Mangwayein</div>
            <div className="text-sm font-extrabold text-cyan-700 dark:text-cyan-300 tabular-nums">{need} {r.unit || 'pcs'}</div>
          </div>
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 px-2.5 py-2">
            <div className="text-[9px] text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-wider">Kharcha</div>
            <div className="text-sm font-extrabold text-slate-700 dark:text-slate-200 tabular-nums truncate">{formatPKR(r.reorderCost)}</div>
          </div>
        </div>

        <div className="mt-2 flex items-center gap-1.5 flex-wrap text-[10px] font-bold">
          {r.requiresSerial && (
            <span className="px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 inline-flex items-center gap-1">
              <Barcode className="h-3 w-3" /> Serial
            </span>
          )}
          {r.requiresInstallation && (
            <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300">
              🔧 Lagani parti hai
            </span>
          )}
          {r.energyRating && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
              {energyMeta(r.energyRating).emoji} {energyMeta(r.energyRating).label}
            </span>
          )}
          {r.notInShop && (
            <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
              Is shop me nahi
            </span>
          )}
        </div>

        <div className="mt-2 flex items-center justify-between text-[10px] font-bold text-slate-400 dark:text-slate-500">
          <span>Lagat {formatPKR(r.costPrice)}</span>
          <span>Bechna {formatPKR(r.price)}</span>
        </div>
      </Link>
    </div>
  );
}

/* ═════════════ TABLE ═════════════ */
function LowTable({ rows, picked, allPicked, onToggle, onToggleAll }: {
  rows: ApplianceLowStockRow[];
  picked: Set<string>;
  allPicked: boolean;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
}) {
  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[860px]">
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
              <Th className="text-center">Abhi</Th>
              <Th className="text-center">Alert</Th>
              <Th className="text-center">Mangwana</Th>
              <Th className="text-right">Lagat</Th>
              <Th className="text-right pr-4">Kharcha</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const need = Math.max(r.lowStockAlert - r.stock, 1);
              const on = picked.has(r.productId);
              return (
                <tr key={r.productId}
                  className={`border-b border-slate-100 dark:border-slate-800 transition ${
                    on ? 'bg-cyan-50 dark:bg-cyan-500/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}>
                  <td className="px-3 py-2.5">
                    <button onClick={() => onToggle(r.productId)}
                      className={`h-6 w-6 rounded-md border-2 flex items-center justify-center transition ${
                        on ? 'bg-cyan-600 border-cyan-600 text-white'
                          : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-transparent hover:border-cyan-400'
                      }`}>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                  <td className="px-3 py-2.5">
                    <Link to={`/appliance-products/${r.productId}`} className="flex items-center gap-2 group">
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
                    {r.brand || '—'}
                    {r.modelNumber && <div className="font-mono text-[10px] text-slate-400">{r.modelNumber}</div>}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-extrabold tabular-nums ${
                      r.isOut ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300'
                        : 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300'
                    }`}>{r.stock}</span>
                  </td>
                  <td className="px-3 py-2.5 text-center text-xs font-bold text-slate-500 dark:text-slate-400 tabular-nums">{r.lowStockAlert}</td>
                  <td className="px-3 py-2.5 text-center text-sm font-extrabold text-cyan-700 dark:text-cyan-400 tabular-nums">{need}</td>
                  <td className="px-3 py-2.5 text-right text-xs font-bold text-slate-600 dark:text-slate-300 tabular-nums whitespace-nowrap">{formatPKR(r.costPrice)}</td>
                  <td className="px-3 py-2.5 pr-4 text-right text-xs font-extrabold text-slate-800 dark:text-slate-100 tabular-nums whitespace-nowrap">{formatPKR(r.reorderCost)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-slate-900 dark:bg-slate-950 text-white">
              <td colSpan={5} className="px-3 py-3 text-right text-[11px] font-extrabold uppercase tracking-widest">Kul</td>
              <td className="px-3 py-3 text-center text-xs font-extrabold text-cyan-300 tabular-nums">
                {rows.reduce((s, r) => s + Math.max(r.lowStockAlert - r.stock, 1), 0)}
              </td>
              <td />
              <td className="px-3 py-3 pr-4 text-right text-xs font-extrabold text-amber-300 tabular-nums whitespace-nowrap">
                {formatPKR(rows.reduce((s, r) => s + r.reorderCost, 0))}
              </td>
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

/* ═════════════ TEACHER ═════════════ */
function LowStockTeacher({ onClose }: { onClose: () => void }) {
  return (
    <Teacher
      title="Low Stock Page Kaise Kaam Karta Hai?"
      intro={
        <>
          Ye page wo <strong>saari cheezein</strong> dikhata hai jo apne "alert level" se neeche gir chuki hain.
          Appliances me ye aur bhi zaroori hai kyunke <strong>har cheez mehngi hai</strong> — ek AC ka order
          bhi hazaron ka hota hai, is liye pehle se jan lena parta hai ke kitna paisa lagega.
        </>
      }
      blocks={[
        {
          title: '📦 Ginti kahan se aati hai',
          tone: 'cyan',
          tips: [
            <><strong>Serial wale model</strong> (AC, fridge, washing machine) ki ginti <strong>serial register</strong> se aati hai — jitne serial "Stock me" hain, utna stock</>,
            <><strong>Chhoti cheezein</strong> (iron, blender, fan) ki ginti normal stock se aati hai</>,
            <><strong>Alert level</strong> har product ki apni settings me set hota hai — jab stock us se neeche jaye, cheez yahan aa jati hai</>,
            <><span className="px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 text-[10px] font-black">Bilkul khatam</span> matlab stock bilkul 0 — customer aaye to khali haath jayega</>,
          ],
        },
        {
          title: '🛒 Order kaise dein',
          tone: 'emerald',
          tips: [
            <>Jin cheezon ka order dena hai unhein <strong>☑️ chunein</strong> — upar bar me foran kharcha nazar aa jayega</>,
            <><strong>"WhatsApp Order"</strong> — chuni hui cheezon ki list seedha supplier ko. Har cheez ke saamne <strong>kitne mangwane hain</strong> likha hota hai</>,
            <><strong>"Purchase Order"</strong> (<Kbd dark>P</Kbd>) — A4 par mukammal order, dono dastakhaton ki jagah ke sath. Supplier ko dein ya PDF bana lein</>,
            <><strong>CSV</strong> — Excel me poori list, rate aur kharche ke sath</>,
          ],
        },
        {
          title: '💡 Aqalmandi ki baatein',
          tone: 'amber',
          tips: [
            <>Chart dekhein — <strong>kis qism me sab se ziyada kami hai</strong>. Aksar ek hi supplier se kayi cheezein aati hain, ek hi order me mangwa lein</>,
            <><strong>Mausam ka khayal rakhein:</strong> garmi shuru hone se pehle AC aur cooler, sardi se pehle geyser aur heater — alert ka intezar na karein</>,
            <>Jo cheez <strong>"Lagani parti hai"</strong> wali hai, uska stock khatam hone ka matlab sirf bikri nahi — <strong>installation ki kamai bhi ruk jati hai</strong></>,
            <>"Kharcha" column batata hai ke alert level tak pohanchne me kitna paisa lagega — <strong>order dene se pehle jeb dekh lein</strong></>,
          ],
        },
      ]}
      shortcuts={[
        { keys: '/', label: 'Search' },
        { keys: 'G', label: 'Grid / List' },
        { keys: 'O', label: 'Sirf khatam' },
        { keys: 'P', label: 'Purchase order' },
        { keys: 'T', label: 'Ye guide' },
        { keys: 'Esc', label: 'Selection clear' },
      ]}
      golden={
        <>
          <strong>Sunahri usool:</strong> Appliances me <strong>"stock khatam" ka nuqsan dohra</strong> hota hai —
          maal ka munafa bhi gaya aur installation ki kamai bhi. Hafte me ek bar ye page zaroor kholein.
        </>
      }
      onClose={onClose}
    />
  );
}
