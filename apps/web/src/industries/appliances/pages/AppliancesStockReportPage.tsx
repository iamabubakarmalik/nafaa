import { useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Boxes, Search, X, RefreshCw, AlertTriangle, Wallet, TrendingUp, Clock,
  ShieldAlert, FileDown, Barcode, Package, HardHat, Layers, Snowflake,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { toast } from 'sonner';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { useAuthStore } from '@core/stores/auth.store';
import { appliancesAnalyticsApi, type StockSerialRow } from '../api/analytics.api';
import {
  ApplianceHero, Kpi, Panel, Teacher, Empty, useShortcuts, printHtml,
  downloadCsv, a4Shell, escapeHtml, toDateInput, fmtDate,
  guideAction, printAction, Kbd, ChipRow, inputCls, StatusBadge,
} from '../components/shared';
import { catLabel, catEmoji, energyMeta, instStatusMeta, daysPhrase } from '../constants';

/* ═════════════════════════════════════════════════════════════
   STOCK REPORT — "mera paisa kahan para hai"
   ─────────────────────────────────────────────────────────────
   Appliance ki dukaan me sab se bara masla ye hai ke laakhon
   rupay maal ki soorat me khare rehte hain. Ye page batata hai:
     • kitna paisa kis qism me phansa hai
     • kaunsa maal purana ho gaya (dead stock)
     • kis unit ki warranty khatam hone wali hai
     • kya bik gaya lekin abhi laga nahi
   ═════════════════════════════════════════════════════════════ */

type Tab = 'value' | 'serials' | 'warranty' | 'dead';

const PIE_COLORS = ['#06b6d4', '#3b82f6', '#10b981', '#f59e0b', '#a855f7', '#ef4444', '#14b8a6', '#f97316', '#64748b'];
const TOOLTIP: React.CSSProperties = {
  borderRadius: 12, border: '2px solid #334155', background: '#0f172a',
  color: '#fff', fontSize: 12, fontWeight: 700,
};

export default function AppliancesStockReportPage() {
  const shopName = useAuthStore((s) => s.tenant?.name) || 'Meri Dukaan';
  const shopPhone = useAuthStore((s: any) => s.tenant?.phone || '');
  const searchRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<Tab>('value');
  const [showTeacher, setShowTeacher] = useState(false);
  const [search, setSearch] = useState('');
  const [bucket, setBucket] = useState<string | null>(null);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['appliance-stock-report'],
    queryFn: appliancesAnalyticsApi.stock,
  });

  const t = data?.totals;

  const serials = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.serials ?? []).filter((r) => {
      if (bucket && r.bucket !== bucket) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        r.serialNumber.toLowerCase().includes(q) ||
        (r.brand ?? '').toLowerCase().includes(q) ||
        (r.modelNumber ?? '').toLowerCase().includes(q) ||
        catLabel(r.categoryType).toLowerCase().includes(q)
      );
    });
  }, [data, search, bucket]);

  const products = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data?.products ?? [];
    return (data?.products ?? []).filter((r) =>
      r.name.toLowerCase().includes(q) ||
      (r.sku ?? '').toLowerCase().includes(q) ||
      (r.brand ?? '').toLowerCase().includes(q),
    );
  }, [data, search]);

  const catChart = useMemo(
    () => (data?.byCategory ?? []).slice(0, 9).map((c) => ({
      name: `${catEmoji(c.categoryType)} ${catLabel(c.categoryType)}`,
      value: c.value,
      units: c.units,
    })),
    [data],
  );

  /* ─── CSV ─── */
  const exportCsv = () => {
    if (!data) return;
    downloadCsv(`stock-report-${toDateInput(new Date())}.csv`, [
      [`Stock Report — ${shopName}`],
      [`Nikala gaya: ${new Date().toLocaleString('en-PK')}`],
      [`Kul stock value: ${t?.totalValue.toFixed(0)} • Bechne par: ${t?.totalRetailValue.toFixed(0)} • Munafa: ${t?.potentialProfit.toFixed(0)}`],
      [],
      ['— SERIAL WALE UNITS —'],
      ['Serial', 'Cheez', 'Brand', 'Qism', 'Model', 'Capacity', 'Energy',
       'Lagat', 'Bechne ka rate', 'Umar (din)', 'Bracket',
       'Installation', 'Warranty tak', 'Warranty din', 'Compressor tak', 'Motor tak'],
      ...(data.serials ?? []).map((r) => [
        r.serialNumber, r.name, r.brand ?? '', catLabel(r.categoryType), r.modelNumber ?? '',
        r.capacity ?? '', r.energyRating ? energyMeta(r.energyRating).label : '',
        r.cost, r.price, r.ageDays, r.bucket,
        instStatusMeta(r.installationStatus).label,
        r.warrantyEndDate ? fmtDate(r.warrantyEndDate) : '', r.warrantyDaysLeft ?? '',
        r.compressorWarrantyEndDate ? fmtDate(r.compressorWarrantyEndDate) : '',
        r.motorWarrantyEndDate ? fmtDate(r.motorWarrantyEndDate) : '',
      ]),
      [],
      ['— BAQI PRODUCTS —'],
      ['Cheez', 'SKU', 'Brand', 'Qism', 'Stock', 'Unit', 'Lagat/unit', 'Kul lagat', 'Bechne par'],
      ...(data.products ?? []).map((r) => [
        r.name, r.sku ?? '', r.brand ?? '', catLabel(r.categoryType),
        r.stock, r.unit, r.unitCost, r.value, r.retailValue,
      ]),
    ]);
    toast.success('Stock report export ho gayi');
  };

  /* ─── A4 ─── */
  const printA4 = () => {
    if (!data) return;
    const body = `
      <h2 class="sec">📦 Qism Ke Hisab Se Paisa</h2>
      <table>
        <thead><tr><th>#</th><th>Qism</th><th class="c">Units</th><th class="r">Lagat</th><th class="r">Hissa</th></tr></thead>
        <tbody>
          ${(data.byCategory ?? []).map((c, i) => `
            <tr>
              <td class="num">${i + 1}</td>
              <td class="main">${catEmoji(c.categoryType)} ${escapeHtml(catLabel(c.categoryType))}</td>
              <td class="c">${c.units}</td>
              <td class="r">${formatPKR(c.value)}</td>
              <td class="r">${t?.totalValue ? ((c.value / t.totalValue) * 100).toFixed(1) : '0'}%</td>
            </tr>`).join('')}
          <tr class="grand">
            <td colspan="3" style="text-align:right;padding-right:12px;">KUL</td>
            <td class="r" style="color:#a5f3fc !important;">${formatPKR(t?.totalValue ?? 0)}</td>
            <td class="r">100%</td>
          </tr>
        </tbody>
      </table>

      <h2 class="sec">⏳ Maal Ki Umar</h2>
      <table>
        <thead><tr><th>Bracket</th><th class="c">Units</th><th class="r">Lagat</th></tr></thead>
        <tbody>
          ${(data.buckets ?? []).map((b) => `
            <tr>
              <td class="main">${escapeHtml(b.label)}</td>
              <td class="c">${b.units}</td>
              <td class="r">${formatPKR(b.value)}</td>
            </tr>`).join('')}
        </tbody>
      </table>

      ${data.deadStock.count > 0 ? `
      <h2 class="sec">🐌 Dead Stock — 60 din se ziyada para (${data.deadStock.count} units, ${formatPKR(data.deadStock.value)})</h2>
      <table>
        <thead><tr><th>#</th><th>Cheez / Serial</th><th>Qism</th><th class="c">Umar</th><th class="r">Lagat</th></tr></thead>
        <tbody>
          ${data.deadStock.items.map((r, i) => `
            <tr>
              <td class="num">${i + 1}</td>
              <td><div class="main">${escapeHtml(r.name)}</div><div class="sub">${escapeHtml(r.serialNumber)}</div></td>
              <td>${escapeHtml(catLabel(r.categoryType))}</td>
              <td class="c" style="font-weight:800;color:#b91c1c;">${r.ageDays} din</td>
              <td class="r">${formatPKR(r.cost)}</td>
            </tr>`).join('')}
        </tbody>
      </table>` : ''}

      ${data.expiringWarranty.count > 0 ? `
      <h2 class="sec">🛡️ Warranty Khatam Ho Rahi (${data.expiringWarranty.count})</h2>
      <table>
        <thead><tr><th>#</th><th>Cheez / Serial</th><th>Kaunsi warranty</th><th class="c">Din baqi</th><th>Khatam</th></tr></thead>
        <tbody>
          ${data.expiringWarranty.items.map((r, i) => `
            <tr>
              <td class="num">${i + 1}</td>
              <td><div class="main">${escapeHtml(r.name)}</div><div class="sub">${escapeHtml(r.serialNumber)}</div></td>
              <td>${escapeHtml(r.expiringKind === 'COMPRESSOR' ? 'Compressor' : r.expiringKind === 'MOTOR' ? 'Motor' : 'Main')}</td>
              <td class="c" style="font-weight:800;color:#d97706;">${r.expiringDays}</td>
              <td>${fmtDate(r.warrantyEndDate)}</td>
            </tr>`).join('')}
        </tbody>
      </table>` : ''}`;

    const ok = printHtml(a4Shell({
      title: `Stock Report — ${shopName}`,
      heading: '📦 Stock Report',
      shopName, shopPhone, badge: 'Stock & Value',
      kpis: [
        { label: '💰 Stock Ki Lagat', value: formatPKR(t?.totalValue ?? 0), sub: `${(t?.serialUnits ?? 0) + (t?.productUnits ?? 0)} units`, tone: 'blue' },
        { label: '🏷️ Bechne Par', value: formatPKR(t?.totalRetailValue ?? 0), tone: 'green' },
        { label: '📈 Mumkina Munafa', value: formatPKR(t?.potentialProfit ?? 0), tone: 'amber' },
        { label: '🐌 Dead Stock', value: formatPKR(data.deadStock.value), sub: `${data.deadStock.count} units`, tone: 'rose' },
      ],
      body,
    }));
    if (!ok) toast.error('Popup block hai — allow karein');
  };

  useShortcuts({
    '/': () => searchRef.current?.focus(),
    t: () => setShowTeacher(true),
    p: () => printA4(),
    Escape: () => { if (showTeacher) setShowTeacher(false); },
  }, [showTeacher, data]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-40 rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />)}
        </div>
        <div className="h-72 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5 pb-10">
      {showTeacher && <StockTeacher onClose={() => setShowTeacher(false)} />}

      <ApplianceHero
        badge="Stock & Value"
        badgeIcon={<Boxes className="h-3.5 w-3.5 text-amber-300" />}
        title="📦 Stock Report"
        subtitle={
          t ? (
            <>
              <strong className="text-cyan-200">{formatPKR(t.totalValue)}</strong> ka maal para hai
              <span className="opacity-50 mx-1.5">•</span>
              bechne par <strong className="text-emerald-300">{formatPKR(t.totalRetailValue)}</strong>
              <span className="opacity-50 mx-1.5">•</span>
              munafa <strong className="text-amber-300">{formatPKR(t.potentialProfit)}</strong>
            </>
          ) : 'Aap ka paisa kis maal me phansa hai'
        }
        actions={[
          guideAction(() => setShowTeacher(true)),
          { key: 'refresh', label: 'Refresh', icon: <RefreshCw className="h-4 w-4" />, onClick: () => refetch(), spinning: isFetching, hideLabelOnMobile: true },
          { key: 'csv', label: 'CSV', icon: <FileDown className="h-4 w-4" />, onClick: exportCsv, hideLabelOnMobile: true },
          printAction(printA4),
        ]}
        shortcuts={[
          { keys: '/', label: 'Search' }, { keys: 'P', label: 'Print' },
          { keys: 'T', label: 'Guide' }, { keys: 'Esc', label: 'Band' },
        ]}
      />

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <Kpi icon={Wallet} tone="cyan" label="Stock Ki Lagat" value={formatPKR(t?.totalValue ?? 0)}
          sub={`${t?.serialUnits ?? 0} serial + ${t?.productUnits ?? 0} baqi units`} />
        <Kpi icon={TrendingUp} tone="emerald" label="Mumkina Munafa" value={formatPKR(t?.potentialProfit ?? 0)}
          sub={`bechne par ${formatPKR(t?.totalRetailValue ?? 0)}`} />
        <Kpi icon={Snowflake} tone="rose" label="Dead Stock" value={formatPKR(data?.deadStock.value ?? 0)}
          sub={`${data?.deadStock.count ?? 0} units • 60+ din`} alert={(data?.deadStock.count ?? 0) > 0}
          onClick={() => setTab('dead')} active={tab === 'dead'} />
        <Kpi icon={HardHat} tone="amber" label="Lagana Baqi" value={data?.pendingInstall.count ?? 0}
          sub="bik gaya, laga nahi" alert={(data?.pendingInstall.count ?? 0) > 0} />
      </section>

      {/* Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="inline-flex rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-1 shadow-sm overflow-x-auto">
          <TabBtn active={tab === 'value'} onClick={() => setTab('value')} icon={Layers} label="Paisa Kahan" />
          <TabBtn active={tab === 'serials'} onClick={() => setTab('serials')} icon={Barcode} label="Serial Units" badge={t?.serialUnits} />
          <TabBtn active={tab === 'warranty'} onClick={() => setTab('warranty')} icon={ShieldAlert} label="Warranty" badge={data?.expiringWarranty.count} />
          <TabBtn active={tab === 'dead'} onClick={() => setTab('dead')} icon={Snowflake} label="Dead Stock" badge={data?.deadStock.count} />
        </div>
      </div>

      {/* ══ PAISA KAHAN ══ */}
      {tab === 'value' && (
        <>
          <div className="grid lg:grid-cols-2 gap-3 sm:gap-4">
            <Panel icon={Layers} title="Qism Ke Hisab Se Paisa" hint="Kis cheez me sab se ziyada phansa hai" tone="cyan">
              {catChart.length === 0 ? (
                <p className="text-xs font-bold text-slate-400 py-8 text-center">Abhi stock nahi hai</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={catChart} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={52} outerRadius={92} paddingAngle={2}>
                      {catChart.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => formatPKR(Number(v))} />
                    <Legend wrapperStyle={{ fontSize: 10, fontWeight: 700 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Panel>

            <Panel icon={Clock} title="Maal Ki Umar" hint="Jo purana ho raha hai us par discount sochein" tone="amber">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data?.buckets ?? []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fontWeight: 700 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 10, fontWeight: 700 }} stroke="#94a3b8"
                    tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
                  <Tooltip contentStyle={TOOLTIP} formatter={(v: any, n: any) => [n === 'Lagat' ? formatPKR(Number(v)) : v, n]} />
                  <Bar dataKey="value" name="Lagat" radius={[8, 8, 0, 0]}>
                    {(data?.buckets ?? []).map((b, i) => (
                      <Cell key={i} fill={b.key === '90+' ? '#ef4444' : b.key === '61-90' ? '#f59e0b' : b.key === '31-60' ? '#06b6d4' : '#10b981'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-2 grid grid-cols-4 gap-1.5">
                {(data?.buckets ?? []).map((b) => (
                  <button key={b.key} onClick={() => { setBucket(bucket === b.key ? null : b.key); setTab('serials'); }}
                    className={`rounded-xl border-2 px-2 py-1.5 text-center transition ${
                      bucket === b.key ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-500/15'
                        : 'border-slate-200 dark:border-slate-700 hover:border-cyan-300'
                    }`}>
                    <div className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">{b.label}</div>
                    <div className="text-sm font-extrabold text-slate-900 dark:text-white tabular-nums">{b.units}</div>
                  </button>
                ))}
              </div>
            </Panel>
          </div>

          {/* Non-serial products */}
          <Panel icon={Package} title={`Baqi Products (${products.length})`} hint="Chhoti cheezein jin ka serial nahi rakha jata" tone="blue">
            {products.length === 0 ? (
              <p className="text-xs font-bold text-slate-400 py-6 text-center">Koi non-serial product stock me nahi</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[680px]">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/80 border-b-2 border-slate-200 dark:border-slate-700">
                      <Th className="text-left">Cheez</Th>
                      <Th className="text-left">Brand</Th>
                      <Th className="text-center">Stock</Th>
                      <Th className="text-right">Lagat/unit</Th>
                      <Th className="text-right">Kul Lagat</Th>
                      <Th className="text-right pr-4">Bechne Par</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((r) => (
                      <tr key={r.productId} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                        <td className="px-3 py-2.5">
                          <Link to={`/appliance-products/${r.productId}`} className="flex items-center gap-2 group">
                            <span className="text-base shrink-0">{catEmoji(r.categoryType)}</span>
                            <div className="min-w-0">
                              <div className="text-[13px] font-extrabold text-slate-900 dark:text-white truncate group-hover:text-cyan-700 dark:group-hover:text-cyan-300 transition">{r.name}</div>
                              <div className="text-[10px] font-bold text-slate-400">{catLabel(r.categoryType)}{r.sku ? ` • ${r.sku}` : ''}</div>
                            </div>
                          </Link>
                        </td>
                        <td className="px-3 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300">{r.brand || '—'}</td>
                        <td className="px-3 py-2.5 text-center text-sm font-extrabold text-slate-800 dark:text-slate-100 tabular-nums">{r.stock} <span className="text-[10px] font-bold text-slate-400">{r.unit}</span></td>
                        <td className="px-3 py-2.5 text-right text-xs font-bold text-slate-600 dark:text-slate-300 tabular-nums whitespace-nowrap">{formatPKR(r.unitCost)}</td>
                        <td className="px-3 py-2.5 text-right text-xs font-extrabold text-slate-800 dark:text-slate-100 tabular-nums whitespace-nowrap">{formatPKR(r.value)}</td>
                        <td className="px-3 py-2.5 pr-4 text-right text-xs font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums whitespace-nowrap">{formatPKR(r.retailValue)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-900 dark:bg-slate-950 text-white">
                      <td colSpan={4} className="px-3 py-3 text-right text-[11px] font-extrabold uppercase tracking-widest">Kul</td>
                      <td className="px-3 py-3 text-right text-xs font-extrabold text-cyan-300 tabular-nums whitespace-nowrap">
                        {formatPKR(products.reduce((s, r) => s + r.value, 0))}
                      </td>
                      <td className="px-3 py-3 pr-4 text-right text-xs font-extrabold text-emerald-300 tabular-nums whitespace-nowrap">
                        {formatPKR(products.reduce((s, r) => s + r.retailValue, 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </Panel>
        </>
      )}

      {/* ══ SERIAL UNITS / WARRANTY / DEAD ══ */}
      {tab !== 'value' && (
        <>
          <div className="flex gap-2 flex-wrap items-center">
            <div className="flex-1 min-w-[220px] relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input ref={searchRef} className={inputCls('h-12 pl-10 pr-10 text-sm font-semibold')}
                placeholder="Serial, naam, brand, model... (/)" value={search} onChange={(e) => setSearch(e.target.value)} />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center">
                  <X className="h-4 w-4 text-slate-400" />
                </button>
              )}
            </div>
          </div>

          {tab === 'serials' && (data?.buckets ?? []).length > 0 && (
            <ChipRow
              options={(data?.buckets ?? []).map((b) => ({ value: b.key, label: b.label, count: b.units }))}
              value={bucket} onChange={setBucket} allLabel={`Sab (${data?.serials.length ?? 0})`} />
          )}

          <SerialTable
            rows={
              tab === 'serials' ? serials
                : tab === 'warranty' ? (data?.expiringWarranty.items ?? [])
                : (data?.deadStock.items ?? [])
            }
            mode={tab}
          />
        </>
      )}

      {/* Lagana baqi */}
      {tab === 'value' && (data?.pendingInstall.count ?? 0) > 0 && (
        <Panel icon={HardHat} title={`Bik Gaya Lekin Laga Nahi (${data!.pendingInstall.count})`}
          hint="Ye dukaan ka adhoora kaam hai — customer intezar kar raha hai" tone="amber">
          <div className="space-y-1.5">
            {data!.pendingInstall.items.slice(0, 15).map((r) => (
              <div key={r.id} className="flex items-center gap-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 px-2.5 py-2">
                <span className="text-base shrink-0">{catEmoji(r.categoryType)}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-extrabold text-slate-900 dark:text-white truncate">{r.name}</div>
                  <div className="font-mono text-[10px] font-bold text-slate-400">{r.serialNumber}</div>
                </div>
                <StatusBadge meta={instStatusMeta(r.installationStatus)} size="xs" />
              </div>
            ))}
          </div>
          <Link to="/appliances/installations" className="mt-3 inline-flex items-center gap-1.5 text-xs font-extrabold text-cyan-700 dark:text-cyan-400 hover:underline">
            <HardHat className="h-3.5 w-3.5" /> Installations page kholein
          </Link>
        </Panel>
      )}
    </div>
  );
}

function SerialTable({ rows, mode }: { rows: StockSerialRow[]; mode: Tab }) {
  if (rows.length === 0) {
    return (
      <Empty
        icon={mode === 'warranty' ? ShieldAlert : mode === 'dead' ? Snowflake : Barcode}
        title={
          mode === 'warranty' ? 'Koi warranty khatam nahi ho rahi 🎉'
            : mode === 'dead' ? 'Koi dead stock nahi 🎉'
            : 'Koi serial unit nahi mila'
        }
        hint={
          mode === 'warranty' ? 'Agle 30 din me kisi unit ki warranty khatam nahi ho rahi.'
            : mode === 'dead' ? '60 din se ziyada koi maal nahi para — bikri achi chal rahi hai.'
            : 'Search ya bracket badal kar dekhein.'
        }
      />
    );
  }

  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/80 border-b-2 border-slate-200 dark:border-slate-700">
              <Th className="text-left">Cheez / Serial</Th>
              <Th className="text-left">Brand / Model</Th>
              <Th className="text-center">Umar</Th>
              <Th className="text-center">Installation</Th>
              <Th className="text-center">{mode === 'warranty' ? 'Kaunsi Warranty' : 'Warranty'}</Th>
              <Th className="text-right">Lagat</Th>
              <Th className="text-right pr-4">Bechna</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const wDays = mode === 'warranty' ? r.expiringDays : r.warrantyDaysLeft;
              const wKind = r.expiringKind === 'COMPRESSOR' ? 'Compressor' : r.expiringKind === 'MOTOR' ? 'Motor' : 'Main';
              return (
                <tr key={r.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                  <td className="px-3 py-2.5">
                    <Link to={`/appliance-products/${r.productId}`} className="flex items-center gap-2 group">
                      <span className="text-base shrink-0">{catEmoji(r.categoryType)}</span>
                      <div className="min-w-0">
                        <div className="text-[13px] font-extrabold text-slate-900 dark:text-white truncate group-hover:text-cyan-700 dark:group-hover:text-cyan-300 transition">{r.name}</div>
                        <div className="font-mono text-[10px] font-bold text-slate-400">{r.serialNumber}</div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300">
                    {r.brand || '—'}
                    {r.modelNumber && <div className="font-mono text-[10px] text-slate-400">{r.modelNumber}</div>}
                    {r.capacity && <div className="text-[10px] text-slate-400">{r.capacity}</div>}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold tabular-nums ${
                      r.ageDays > 90 ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300'
                        : r.ageDays > 60 ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}>{r.ageDays} din</span>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <StatusBadge meta={instStatusMeta(r.installationStatus)} size="xs" />
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {wDays === null || wDays === undefined ? (
                      <span className="text-[11px] font-bold text-slate-400">—</span>
                    ) : (
                      <div>
                        <span className={`text-[11px] font-extrabold ${
                          wDays < 0 ? 'text-rose-600 dark:text-rose-400'
                            : wDays <= 30 ? 'text-amber-600 dark:text-amber-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}>{daysPhrase(wDays)}</span>
                        {mode === 'warranty' && <div className="text-[9px] font-bold text-slate-400">{wKind}</div>}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right text-xs font-bold text-slate-600 dark:text-slate-300 tabular-nums whitespace-nowrap">{formatPKR(r.cost)}</td>
                  <td className="px-3 py-2.5 pr-4 text-right text-xs font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums whitespace-nowrap">{formatPKR(r.price)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-slate-900 dark:bg-slate-950 text-white">
              <td colSpan={5} className="px-3 py-3 text-right text-[11px] font-extrabold uppercase tracking-widest">
                {rows.length} units ka total
              </td>
              <td className="px-3 py-3 text-right text-xs font-extrabold text-cyan-300 tabular-nums whitespace-nowrap">
                {formatPKR(rows.reduce((s, r) => s + r.cost, 0))}
              </td>
              <td className="px-3 py-3 pr-4 text-right text-xs font-extrabold text-emerald-300 tabular-nums whitespace-nowrap">
                {formatPKR(rows.reduce((s, r) => s + r.price, 0))}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, icon: Icon, label, badge }: any) {
  return (
    <button onClick={onClick}
      className={`px-3 py-2 rounded-xl text-xs font-extrabold inline-flex items-center gap-1.5 whitespace-nowrap transition ${
        active ? 'bg-slate-900 dark:bg-cyan-600 text-white shadow' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
      }`}>
      <Icon className="h-4 w-4" /> {label}
      {badge ? <span className={`px-1.5 rounded-full text-[9px] tabular-nums ${active ? 'bg-white/25' : 'bg-slate-200 dark:bg-slate-700'}`}>{badge}</span> : null}
    </button>
  );
}

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`px-3 py-3 text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400 whitespace-nowrap ${className}`}>
      {children}
    </th>
  );
}

function StockTeacher({ onClose }: { onClose: () => void }) {
  return (
    <Teacher
      title="Stock Report Kaise Parhein?"
      intro={
        <>
          Appliance ki dukaan ka sab se bara masla ye hai ke <strong>laakhon rupay maal ki soorat me khare</strong>
          rehte hain. Ye page batata hai ke wo paisa <strong>kahan para hai aur kitna der se para hai</strong>.
        </>
      }
      blocks={[
        {
          title: '💰 "Paisa Kahan" tab',
          tone: 'cyan',
          tips: [
            <><strong>Donut chart</strong> — kis qism me sab se ziyada paisa phansa hai. Agar aadha paisa sirf AC me hai to sardi me musibat hogi</>,
            <><strong>Umar ka chart</strong> — 0–30 din wala maal tandurust hai. <span className="text-rose-600 dark:text-rose-400 font-extrabold">90+ din</span> wala paisa mara hua hai</>,
            <>Kisi bracket par click karein to <strong>usi umar ke saare units</strong> khul jate hain</>,
            <><strong>"Bechne par"</strong> aur <strong>"Mumkina munafa"</strong> — agar aaj saara maal bik jaye to kitna milega</>,
          ],
        },
        {
          title: '🛡️ Warranty tab — sab se zaroori',
          tone: 'amber',
          tips: [
            <>Appliance ki <strong>teen alag warranty</strong> hoti hain: main, compressor aur motor. Compressor ki aksar 10 saal hoti hai, main ki 1 saal</>,
            <>Ye tab dikhata hai jin ki <strong>koi bhi warranty 30 din me khatam</strong> ho rahi hai — aur kaunsi wali</>,
            <><strong>Customer ko phone karein:</strong> "aap ki warranty khatam ho rahi hai, free checking karwa lein" — is se AMC bikta hai</>,
            <>Warranty khatam hone ke baad wohi repair <strong>paid</strong> ho jati hai — dukaan ka nuqsan bach jata hai</>,
          ],
        },
        {
          title: '🐌 Dead Stock tab',
          tone: 'rose',
          tips: [
            <><strong>60 din se ziyada</strong> para maal — ye paisa kaam nahi kar raha</>,
            <>Purana model hai to <strong>discount de kar nikaal dein</strong> — naya model aane par aur girega</>,
            <>Ek hi model bar bar dead stock me aata hai to <strong>aage mat mangwayein</strong></>,
            <><Kbd dark>P</Kbd> — poori report A4 par, dead stock aur warranty ki list ke sath</>,
          ],
        },
        {
          title: '🔧 "Bik gaya lekin laga nahi"',
          tone: 'violet',
          tips: [
            <>Ye wo units hain jo <strong>bik chuke hain lekin ghar par lage nahi</strong></>,
            <>Customer ne paisa de diya hai aur intezar kar raha hai — <strong>yahi sab se ziyada shikayat</strong> banti hai</>,
            <>Installations page khol kar foran technician lagayein</>,
          ],
        },
      ]}
      shortcuts={[
        { keys: '/', label: 'Search' },
        { keys: 'P', label: 'Print report' },
        { keys: 'T', label: 'Ye guide' },
        { keys: 'Esc', label: 'Band' },
      ]}
      golden={
        <>
          <strong>Sunahri usool:</strong> Jo maal <strong>90 din se para</strong> hai us par 5% discount de kar
          bech dena behtar hai — kyunke wohi paisa naye maal me lagta to ab tak <strong>do bar munafa</strong> de chuka hota.
        </>
      }
      onClose={onClose}
    />
  );
}
