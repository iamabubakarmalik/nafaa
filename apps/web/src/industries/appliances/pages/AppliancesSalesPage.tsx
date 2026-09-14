import { useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Receipt, Search, X, RefreshCw, Wallet, TrendingUp, Package, Truck,
  HardHat, Barcode, FileDown, Printer, CalendarDays, User, ChevronLeft,
  ChevronRight, AlertTriangle, Eye, ShoppingCart, Percent, CreditCard,
} from 'lucide-react';
import {
  ResponsiveContainer, ComposedChart, Bar, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { toast } from 'sonner';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { useAuthStore } from '@core/stores/auth.store';
import { salesApi } from '@modules/sales/sales/api/sales.api';
import {
  ApplianceHero, Kpi, Panel, Teacher, Empty, useShortcuts, printHtml,
  downloadCsv, a4Shell, escapeHtml, toDateInput, fmtDate, fmtDateTime,
  guideAction, printAction, Kbd, inputCls, ChipRow,
} from '../components/shared';

/* ═════════════════════════════════════════════════════════════
   APPLIANCES SALES — bikri ka register
   ─────────────────────────────────────────────────────────────
   Aam sales page sirf maal ka total dikhata hai. Appliance ki
   bikri me installation aur delivery ka charge bhi usi bill par
   hota hai — is liye yahan har sale par wo alag nazar aate hain,
   aur "kitna udhaar reh gaya" sab se numaya cheez hai.
   ═════════════════════════════════════════════════════════════ */

const TOOLTIP: React.CSSProperties = {
  borderRadius: 12, border: '2px solid #334155', background: '#0f172a',
  color: '#fff', fontSize: 12, fontWeight: 700,
};

const PAY_META: Record<string, { label: string; emoji: string; cls: string }> = {
  CASH:      { label: 'Cash',     emoji: '💵', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' },
  CARD:      { label: 'Card',     emoji: '💳', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300' },
  BANK:      { label: 'Bank',     emoji: '🏦', cls: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300' },
  EASYPAISA: { label: 'Easypaisa',emoji: '📱', cls: 'bg-lime-100 text-lime-700 dark:bg-lime-500/15 dark:text-lime-300' },
  JAZZCASH:  { label: 'JazzCash', emoji: '📲', cls: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300' },
  CREDIT:    { label: 'Udhaar',   emoji: '📖', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' },
  MIXED:     { label: 'Mila jula',emoji: '🔀', cls: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300' },
};
const payMeta = (m?: string) => PAY_META[m ?? 'CASH'] ?? { label: m ?? '—', emoji: '💰', cls: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300' };

const RANGES = [
  { days: 0, label: 'Aaj' },
  { days: 7, label: '7 din' },
  { days: 30, label: '1 mahina' },
  { days: 90, label: '3 mahine' },
];

export default function AppliancesSalesPage() {
  const shopName = useAuthStore((s) => s.tenant?.name) || 'Meri Dukaan';
  const shopPhone = useAuthStore((s: any) => s.tenant?.phone || '');
  const searchRef = useRef<HTMLInputElement>(null);

  const [showTeacher, setShowTeacher] = useState(false);
  const [days, setDays] = useState(7);
  const [search, setSearch] = useState('');
  const [payFilter, setPayFilter] = useState<string | null>(null);
  const [dueOnly, setDueOnly] = useState(false);
  const [page, setPage] = useState(1);

  const range = useMemo(() => {
    const to = new Date();
    const from = new Date();
    if (days === 0) from.setHours(0, 0, 0, 0);
    else from.setDate(from.getDate() - days);
    return { from: toDateInput(from), to: toDateInput(to) };
  }, [days]);

  const params = {
    from: range.from, to: range.to,
    search: search.trim() || undefined,
    paymentMethod: payFilter ?? undefined,
    page, limit: 50,
  };

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['appliance-sales', params],
    queryFn: () => salesApi.list(params as any),
  });

  const all: any[] = (data as any)?.items ?? [];
  const rows = useMemo(
    () => (dueOnly ? all.filter((s) => Number(s.total) - Number(s.paidAmount) > 0) : all),
    [all, dueOnly],
  );

  /* Appliance ki bikri ka apna hisab — maal alag, services alag */
  const stats = useMemo(() => {
    const svc = (s: any, type: string) =>
      (Array.isArray(s.serviceChargesBreakdown) ? s.serviceChargesBreakdown : [])
        .filter((c: any) => c?.type === type)
        .reduce((x: number, c: any) => x + (Number(c.amount) || 0), 0);

    let revenue = 0, paid = 0, goods = 0, install = 0, deliv = 0, discount = 0, units = 0;
    for (const s of rows) {
      revenue += Number(s.total) || 0;
      paid += Number(s.paidAmount) || 0;
      discount += Number(s.discount) || 0;
      goods += Number(s.subtotal) || 0;
      install += svc(s, 'INSTALLATION');
      deliv += svc(s, 'DELIVERY');
      units += (s.items ?? []).reduce((x: number, i: any) => x + (Number(i.quantity) || 0), 0);
    }
    return {
      count: rows.length, revenue, paid, due: revenue - paid,
      goods, install, deliv, discount, units,
      avg: rows.length ? revenue / rows.length : 0,
    };
  }, [rows]);

  /* Rozana chart */
  const daily = useMemo(() => {
    const m = new Map<string, { date: string; kamai: number; services: number; bills: number }>();
    for (const s of rows) {
      const key = new Date(s.soldAt).toISOString().slice(0, 10);
      const row = m.get(key) ?? { date: key, kamai: 0, services: 0, bills: 0 };
      row.kamai += Number(s.total) || 0;
      row.services += Number(s.serviceCharges) || 0;
      row.bills += 1;
      m.set(key, row);
    }
    return [...m.values()].sort((a, b) => a.date.localeCompare(b.date));
  }, [rows]);

  const exportCsv = () => {
    if (!rows.length) return toast.error('Koi bikri nahi');
    downloadCsv(`appliance-sales-${range.from}-to-${range.to}.csv`, [
      [`Bikri — ${shopName}`],
      [`${fmtDate(range.from)} se ${fmtDate(range.to)} tak`],
      [`${stats.count} bill • Kamai ${stats.revenue.toFixed(0)} • Baqi ${stats.due.toFixed(0)}`],
      [],
      ['Bill #', 'Tareekh', 'Customer', 'Cheezein', 'Maal ka total', 'Discount',
       'Installation', 'Delivery', 'Kul bill', 'Wusool', 'Baqi', 'Payment', 'Halat'],
      ...rows.map((s) => {
        const svc = (type: string) =>
          (Array.isArray(s.serviceChargesBreakdown) ? s.serviceChargesBreakdown : [])
            .filter((c: any) => c?.type === type)
            .reduce((x: number, c: any) => x + (Number(c.amount) || 0), 0);
        return [
          s.saleNumber, fmtDateTime(s.soldAt), s.customer?.name ?? 'Walk-in',
          (s.items ?? []).map((i: any) => `${i.product?.name ?? i.name ?? '—'} ×${i.quantity}`).join(' | '),
          s.subtotal, s.discount, svc('INSTALLATION'), svc('DELIVERY'),
          s.total, s.paidAmount, Math.max(Number(s.total) - Number(s.paidAmount), 0),
          payMeta(s.paymentMethod).label, s.status,
        ];
      }),
    ]);
    toast.success(`${rows.length} bill export ho gaye`);
  };

  const printA4 = () => {
    if (!rows.length) return toast.error('Koi bikri nahi');
    const body = `
      <h2 class="sec">🧾 Bikri Ka Register</h2>
      <table>
        <thead><tr>
          <th>#</th><th>Bill / Tareekh</th><th>Customer</th><th>Cheezein</th>
          <th class="r">Maal</th><th class="r">Services</th><th class="r">Kul</th><th class="r">Baqi</th>
        </tr></thead>
        <tbody>
          ${rows.map((s, i) => {
            const due = Math.max(Number(s.total) - Number(s.paidAmount), 0);
            return `
            <tr>
              <td class="num">${i + 1}</td>
              <td><div class="main">${escapeHtml(s.saleNumber)}</div><div class="sub">${fmtDate(s.soldAt)}</div></td>
              <td>${escapeHtml(s.customer?.name ?? 'Walk-in')}</td>
              <td style="font-size:8.5px;">${escapeHtml((s.items ?? []).map((it: any) => `${it.product?.name ?? '—'} ×${it.quantity}`).join(', ').slice(0, 70))}</td>
              <td class="r">${formatPKR(s.subtotal)}</td>
              <td class="r">${s.serviceCharges ? formatPKR(s.serviceCharges) : '—'}</td>
              <td class="r">${formatPKR(s.total)}</td>
              <td class="r" style="color:${due > 0 ? '#b91c1c' : '#059669'}">${due > 0 ? formatPKR(due) : 'Clear ✓'}</td>
            </tr>`;
          }).join('')}
          <tr class="grand">
            <td colspan="4" style="text-align:right;padding-right:12px;">KUL</td>
            <td class="r">${formatPKR(stats.goods)}</td>
            <td class="r" style="color:#fcd34d !important;">${formatPKR(stats.install + stats.deliv)}</td>
            <td class="r" style="color:#a5f3fc !important;">${formatPKR(stats.revenue)}</td>
            <td class="r" style="color:#fca5a5 !important;">${formatPKR(stats.due)}</td>
          </tr>
        </tbody>
      </table>`;

    const ok = printHtml(a4Shell({
      title: `Bikri — ${shopName}`,
      heading: '🧾 Bikri Ka Register',
      shopName, shopPhone,
      badge: `${fmtDate(range.from)} — ${fmtDate(range.to)}`,
      kpis: [
        { label: '🧾 Bills', value: String(stats.count), sub: `${stats.units} units`, tone: 'blue' },
        { label: '💰 Kul Kamai', value: formatPKR(stats.revenue), sub: `ausat ${formatPKR(stats.avg)}`, tone: 'green' },
        { label: '🔧 Services Se', value: formatPKR(stats.install + stats.deliv), sub: 'installation + delivery', tone: 'amber' },
        { label: '⏳ Baqi Paisa', value: formatPKR(stats.due), tone: 'rose' },
      ],
      body,
    }));
    if (!ok) toast.error('Popup block hai — allow karein');
  };

  useShortcuts({
    '/': () => searchRef.current?.focus(),
    t: () => setShowTeacher(true),
    p: () => printA4(),
    d: () => setDueOnly((v) => !v),
    Escape: () => { if (showTeacher) setShowTeacher(false); },
  }, [showTeacher, rows]);

  return (
    <div className="space-y-4 sm:space-y-5 pb-10">
      {showTeacher && <SalesTeacher onClose={() => setShowTeacher(false)} />}

      <ApplianceHero
        badge="Bikri"
        badgeIcon={<Receipt className="h-3.5 w-3.5 text-amber-300" />}
        title="🧾 Sales"
        subtitle={
          <>
            <strong className="text-cyan-200">{stats.count}</strong> bill
            <span className="opacity-50 mx-1.5">•</span>
            <strong className="text-emerald-300">{formatPKR(stats.revenue)}</strong> kamai
            {stats.due > 0 && (
              <><span className="opacity-50 mx-1.5">•</span><strong className="text-rose-300">{formatPKR(stats.due)}</strong> udhaar</>
            )}
          </>
        }
        actions={[
          guideAction(() => setShowTeacher(true)),
          { key: 'refresh', label: 'Refresh', icon: <RefreshCw className="h-4 w-4" />, onClick: () => refetch(), spinning: isFetching, hideLabelOnMobile: true },
          { key: 'csv', label: 'CSV', icon: <FileDown className="h-4 w-4" />, onClick: exportCsv, disabled: !rows.length, hideLabelOnMobile: true },
          printAction(printA4, !rows.length),
          { key: 'pos', label: 'POS Kholein', icon: <ShoppingCart className="h-4 w-4" />, href: '/pos', variant: 'solid' },
        ]}
        shortcuts={[
          { keys: '/', label: 'Search' }, { keys: 'D', label: 'Sirf udhaar' },
          { keys: 'P', label: 'Print' }, { keys: 'T', label: 'Guide' },
        ]}
      />

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <Kpi icon={Wallet} tone="cyan" label="Kul Kamai" value={formatPKR(stats.revenue)} sub={`${stats.count} bill • ausat ${formatPKR(stats.avg)}`} />
        <Kpi icon={Package} tone="blue" label="Maal Ka Hissa" value={formatPKR(stats.goods)} sub={`${stats.units} units bikay`} />
        <Kpi icon={HardHat} tone="amber" label="Services Se"
          value={formatPKR(stats.install + stats.deliv)}
          sub={`installation ${formatPKR(stats.install)} • delivery ${formatPKR(stats.deliv)}`} />
        <Kpi icon={AlertTriangle} tone="rose" label="Udhaar Baqi" value={formatPKR(stats.due)}
          sub={`wusool ${formatPKR(stats.paid)}`} alert={stats.due > 0}
          onClick={() => setDueOnly(!dueOnly)} active={dueOnly} />
      </section>

      {/* Range */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">Arsa</span>
        {RANGES.map((r) => (
          <button key={r.days} onClick={() => { setDays(r.days); setPage(1); }}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold border-2 transition ${
              days === r.days ? 'bg-cyan-600 border-cyan-600 text-white shadow'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-cyan-400'
            }`}>{r.label}</button>
        ))}
      </div>

      {daily.length > 1 && (
        <Panel icon={TrendingUp} title="Rozana Bikri" hint="Neela = kul bill, peela = services ki kamai" tone="cyan">
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={daily} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fontWeight: 700 }} stroke="#94a3b8"
                tickFormatter={(d) => new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })} />
              <YAxis tick={{ fontSize: 10, fontWeight: 700 }} stroke="#94a3b8"
                tickFormatter={(v) => (Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
              <Tooltip contentStyle={TOOLTIP}
                labelFormatter={(d) => new Date(d as string).toLocaleDateString('en-PK', { dateStyle: 'medium' })}
                formatter={(v: any, n: any) => [n === 'Bills' ? v : formatPKR(Number(v)), n]} />
              <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
              <Bar dataKey="kamai" name="Kul kamai" fill="#06b6d4" radius={[5, 5, 0, 0]} />
              <Line type="monotone" dataKey="services" name="Services" stroke="#f59e0b" strokeWidth={2.5} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </Panel>
      )}

      {/* Toolbar */}
      <div className="flex gap-2 flex-wrap items-center">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input ref={searchRef} className={inputCls('h-12 pl-10 pr-10 text-sm font-semibold')}
            placeholder="Bill number, customer, phone... (/)"
            value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center">
              <X className="h-4 w-4 text-slate-400" />
            </button>
          )}
        </div>
        <button onClick={() => setDueOnly(!dueOnly)}
          className={`h-12 px-4 rounded-2xl border-2 text-xs font-extrabold inline-flex items-center gap-1.5 transition ${
            dueOnly ? 'border-rose-500 bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300'
              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-rose-300'
          }`}>
          <CreditCard className="h-4 w-4" /> <span className="hidden sm:inline">Sirf udhaar</span>
        </button>
        <div className="text-xs font-extrabold text-slate-500 dark:text-slate-400 tabular-nums px-1">{rows.length} bill</div>
      </div>

      <ChipRow
        options={Object.keys(PAY_META).map((k) => ({ value: k, label: PAY_META[k].label, emoji: PAY_META[k].emoji }))}
        value={payFilter} onChange={(v) => { setPayFilter(v); setPage(1); }} allLabel="Sab tareeqe" />

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-24 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />)}
        </div>
      ) : rows.length === 0 ? (
        <Empty
          icon={Receipt}
          title={dueOnly ? 'Koi udhaar baqi nahi 🎉' : 'Is arse me koi bikri nahi'}
          hint={dueOnly ? 'Saare bill poore wusool ho chuke hain.' : 'Arsa badal kar dekhein ya POS se nayi bikri karein'}
          action={
            dueOnly
              ? <Button variant="secondary" onClick={() => setDueOnly(false)}><X className="h-4 w-4" /> Sab bill dekhein</Button>
              : <Link to="/pos"><Button className="bg-gradient-to-r from-cyan-600 to-teal-700 font-extrabold"><ShoppingCart className="h-4 w-4" /> POS Kholein</Button></Link>
          }
        />
      ) : (
        <div className="space-y-2">
          {rows.map((s) => <SaleCard key={s.id} s={s} />)}
        </div>
      )}

      {(data as any)?.meta?.totalPages > 1 && (
        <div className="flex items-center justify-between flex-wrap gap-2 bg-white dark:bg-slate-900/80 rounded-2xl border-2 border-slate-200 dark:border-slate-800 p-3 sm:p-4">
          <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-bold">
            Page <strong className="text-slate-900 dark:text-white">{(data as any).meta.page}</strong> / <strong className="text-slate-900 dark:text-white">{(data as any).meta.totalPages}</strong>
          </div>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}
              className="h-10 px-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-xs font-extrabold text-slate-700 dark:text-slate-200 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1">
              <ChevronLeft className="h-4 w-4" /> Pehle
            </button>
            <button disabled={page >= (data as any).meta.totalPages} onClick={() => setPage((p) => p + 1)}
              className="h-10 px-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-xs font-extrabold text-slate-700 dark:text-slate-200 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1">
              Agla <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═════════════ SALE CARD ═════════════ */
function SaleCard({ s }: { s: any }) {
  const due = Math.max(Number(s.total) - Number(s.paidAmount), 0);
  const pm = payMeta(s.paymentMethod);
  const breakdown: any[] = Array.isArray(s.serviceChargesBreakdown) ? s.serviceChargesBreakdown : [];
  const svc = (type: string) =>
    breakdown.filter((c) => c?.type === type).reduce((x, c) => x + (Number(c.amount) || 0), 0);
  const install = svc('INSTALLATION');
  const deliv = svc('DELIVERY');

  return (
    <div className={`rounded-2xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 shadow-sm hover:shadow-lg transition-all overflow-hidden ${
      due > 0 ? 'border-rose-200 dark:border-rose-500/30' : 'border-slate-200 dark:border-slate-800'
    }`}>
      <div className="p-3 sm:p-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-extrabold text-cyan-700 dark:text-cyan-400">{s.saleNumber}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${pm.cls}`}>{pm.emoji} {pm.label}</span>
              {due > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white">
                  UDHAAR {formatPKR(due)}
                </span>
              )}
              {s.status && s.status !== 'COMPLETED' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">{s.status}</span>
              )}
            </div>
            <div className="mt-1 flex items-center gap-2 flex-wrap text-[11px] font-bold text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" />{fmtDateTime(s.soldAt)}</span>
              <span className="inline-flex items-center gap-1"><User className="h-3 w-3" />{s.customer?.name ?? 'Walk-in'}</span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-lg font-extrabold tabular-nums text-slate-900 dark:text-white">{formatPKR(s.total)}</div>
            <div className={`text-[11px] font-extrabold tabular-nums ${due > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {due > 0 ? `${formatPKR(s.paidAmount)} wusool` : 'Poora wusool ✓'}
            </div>
          </div>
        </div>

        {/* Cheezein */}
        {(s.items ?? []).length > 0 && (
          <div className="mt-2.5 flex gap-1.5 flex-wrap">
            {(s.items ?? []).slice(0, 4).map((it: any, i: number) => (
              <span key={i} className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-extrabold">
                {it.product?.name ?? it.name ?? 'Item'} ×{it.quantity}
                {Array.isArray(it.serials) && it.serials.length > 0 && (
                  <span className="ml-1 font-mono text-slate-400">🔖 {it.serials[0].serialNumber}</span>
                )}
              </span>
            ))}
            {(s.items ?? []).length > 4 && (
              <span className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 text-[10px] font-extrabold">
                +{(s.items ?? []).length - 4} aur
              </span>
            )}
          </div>
        )}

        {/* Hisab — maal, discount, services alag alag */}
        <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          <Cell label="Maal" value={formatPKR(s.subtotal)} icon={Package} />
          {Number(s.discount) > 0 && <Cell label="Discount" value={`−${formatPKR(s.discount)}`} icon={Percent} tone="amber" />}
          {install > 0 && <Cell label="Installation" value={`+${formatPKR(install)}`} icon={HardHat} tone="blue" />}
          {deliv > 0 && <Cell label="Delivery" value={`+${formatPKR(deliv)}`} icon={Truck} tone="emerald" />}
        </div>
      </div>

      <div className="px-3 py-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between gap-2">
        <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
          {(s.items ?? []).reduce((x: number, i: any) => x + (Number(i.quantity) || 0), 0)} units
          {s.shop?.name ? ` • ${s.shop.name}` : ''}
        </div>
        <div className="flex items-center gap-1.5">
          <Link to={`/sales/${s.id}/receipt`}
            className="h-8 px-3 rounded-lg bg-slate-200/70 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-[10px] font-extrabold inline-flex items-center gap-1 transition">
            <Eye className="h-3.5 w-3.5" /> Receipt
          </Link>
          <Link to={`/sales/${s.id}/receipt?auto=1`} target="_blank"
            className="h-8 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-extrabold inline-flex items-center gap-1 transition">
            <Printer className="h-3.5 w-3.5" /> Print
          </Link>
        </div>
      </div>
    </div>
  );
}

function Cell({ label, value, icon: Icon, tone = 'slate' }: any) {
  const tones: Record<string, string> = {
    slate: 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200',
    amber: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-300',
    blue: 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30 text-blue-700 dark:text-blue-300',
    emerald: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300',
  };
  return (
    <div className={`rounded-lg border px-2 py-1.5 flex items-center gap-1.5 ${tones[tone]}`}>
      <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" />
      <div className="min-w-0">
        <div className="text-[9px] font-extrabold uppercase tracking-wider opacity-75">{label}</div>
        <div className="text-[11px] font-extrabold tabular-nums truncate">{value}</div>
      </div>
    </div>
  );
}

function SalesTeacher({ onClose }: { onClose: () => void }) {
  return (
    <Teacher
      title="Sales Page Kaise Parhein?"
      intro={
        <>
          Appliance ki bikri aam dukaan se alag hai — ek hi bill par <strong>maal, installation
          aur delivery</strong> teenon ka paisa hota hai. Yahan har bill par ye teenon alag nazar
          aate hain, aur sab se numaya cheez hai <strong>kitna udhaar reh gaya</strong>.
        </>
      }
      blocks={[
        {
          title: '💰 KPI cards',
          tone: 'cyan',
          tips: [
            <><strong>Maal ka hissa</strong> — sirf cheezon ka paisa</>,
            <><strong>Services se</strong> — installation + delivery ka paisa. Agar ye kam hai to installation charge lena bhool rahe hain</>,
            <><strong>Udhaar baqi</strong> — is par click karein to sirf wo bill nazar aate hain jin ka paisa poora nahi mila (<Kbd dark>D</Kbd>)</>,
          ],
        },
        {
          title: '🧾 Har bill par kya dikhta hai',
          tone: 'blue',
          tips: [
            <>Cheezon ke chips me <strong>serial number</strong> bhi nazar aata hai — warranty ka jhagra ho to fauran mil jata hai</>,
            <>Neeche chaar khanay: <strong>Maal • Discount • Installation • Delivery</strong> — jo laga ho wohi dikhta hai</>,
            <><span className="px-1.5 py-0.5 rounded bg-rose-600 text-white text-[9px] font-black">UDHAAR</span> ka laal tag — ye paisa abhi aana baqi hai</>,
            <><strong>Receipt</strong> — poora bill; <strong>Print</strong> — seedha printer par</>,
          ],
        },
        {
          title: '📊 Rozana chart',
          tone: 'amber',
          tips: [
            <><strong>Neela bar</strong> — us din ka kul bill</>,
            <><strong>Peeli line</strong> — us din services se kitna aaya. Ye line jitni upar, munafa utna behtar</>,
            <><Kbd dark>P</Kbd> — poore arse ka A4 register, har bill ki tafseel ke sath</>,
          ],
        },
      ]}
      shortcuts={[
        { keys: '/', label: 'Search' },
        { keys: 'D', label: 'Sirf udhaar' },
        { keys: 'P', label: 'Print register' },
        { keys: 'T', label: 'Ye guide' },
      ]}
      golden={
        <>
          <strong>Sunahri usool:</strong> Hafte me ek bar <Kbd dark>D</Kbd> daba kar udhaar wale bill dekhein
          aur un customers ko phone karein. Jitna purana udhaar, utna mushkil wusool.
        </>
      }
      onClose={onClose}
    />
  );
}
