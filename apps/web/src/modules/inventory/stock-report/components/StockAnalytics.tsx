/**
 * Stock analytics for the filter: sales against the previous period, how
 * long stock has been sitting, where the money is (category, brand,
 * supplier, industry type, season), fast/slow/dead movers, expiry by batch
 * and how the value is worked out.
 */

import { useState, type ReactNode } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  ArrowDownRight, ArrowUpRight, CalendarClock, Calculator, Hourglass, Layers, PiggyBank, Snail, Timer, TrendingUp, Zap, type LucideIcon,
} from 'lucide-react';
import { Card, Segmented, Skeleton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { axisMoney } from '@modules/dashboard/engine/parts';
import { useChartTheme } from '@modules/dashboard/engine/useChartTheme';
import type { StockAnalytics as Data, StockBrief } from '../api/stock-report.api';
import { ageText, change, coverText, dateText, qty } from './meta';

const PALETTE = ['#0f766e', '#2563eb', '#7c3aed', '#db2777', '#ea580c', '#ca8a04', '#16a34a', '#0891b2', '#64748b', '#9333ea', '#be123c', '#4d7c0f'];
const AGE_COLORS = ['#16a34a', '#65a30d', '#d97706', '#ea580c', '#e11d48', '#7c3aed'];
type By = 'category' | 'brand' | 'supplier' | 'group' | 'season';

export function StockAnalytics({ data, loading, money, cost, costHidden, groupLabel, groupTitle, seasonLabel, onOpen }: {
  data?: Data;
  loading: boolean;
  money: (n: number) => string;
  cost: (n: number) => string;
  costHidden: boolean;
  groupLabel?: (id: string) => string;
  groupTitle?: string;
  seasonLabel?: (id: string) => string;
  onOpen: (productId: string) => void;
}) {
  const theme = useChartTheme();
  const [age, setAge] = useState<'saleAge' | 'stockAge'>('saleAge');
  const [by, setBy] = useState<By>('category');
  const metric = costHidden ? 'retail' : 'cost';
  const fmt = costHidden ? money : cost;

  if (loading || !data) {
    return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>;
  }
  const t = data.totals;
  const sales = change(t.sold.revenue, t.prevSold.revenue);
  const profit = change(t.sold.profit ?? 0, t.prevSold.profit ?? 0);
  const breakdowns: Array<{ value: By; label: string; rows: Data['byCategory']; name?: (id: string, n: string) => string }> = [
    { value: 'category', label: 'Category', rows: data.byCategory },
    { value: 'brand', label: 'Brand', rows: data.byBrand },
    { value: 'supplier', label: 'Supplier', rows: data.bySupplier },
    ...(data.byGroup.length ? [{ value: 'group' as const, label: groupTitle ?? 'Type', rows: data.byGroup, name: (id: string, n: string) => (groupLabel ? groupLabel(id) : n) }] : []),
    ...(data.bySeason.length ? [{ value: 'season' as const, label: 'Mausam', rows: data.bySeason, name: (id: string, n: string) => (seasonLabel ? seasonLabel(id) : n) }] : []),
  ];
  const current = breakdowns.find((b) => b.value === by) ?? breakdowns[0];
  const breakRows = current.rows.map((r) => ({ ...r, label: current.name ? current.name(r.id, r.name) : r.name }));
  const ageRows = data[age];
  const statusRows = data.status.map((s) => ({ ...s, name: s.key === 'ok' ? 'Theek' : s.key === 'low' ? 'Kam' : 'Khatam', color: s.key === 'ok' ? '#16a34a' : s.key === 'low' ? '#d97706' : '#e11d48' }));

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={TrendingUp} label="Period ki sale" value={money(t.sold.revenue)} sub={<Delta value={sales} prev={money(t.prevSold.revenue)} />} />
        <Kpi icon={PiggyBank} label="Sale ka profit" value={cost(t.sold.profit)} sub={costHidden ? 'Cost lock' : <Delta value={profit} prev={cost(t.prevSold.profit)} />} />
        <Kpi icon={Timer} label="Maal kitne din chalega" value={t.coverDays === null ? '—' : `${t.coverDays} din`} sub="Is period ki sale ki raftaar se" />
        <Kpi icon={Hourglass} label="Dead stock" value={fmt(costHidden ? t.dead.retail : t.dead.cost)} sub={`${t.dead.count} cheezein · ${data.period.deadDays}+ din se nahi biki`} tone="rose" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="rounded-2xl lg:col-span-2" title={<Title icon={Hourglass}>Maal kitna purana hai</Title>}
          description={age === 'saleAge' ? 'Aakhri sale ko kitne din hue' : 'Maal aaye kitne din hue'}
          actions={<Segmented label="Umar" value={age} onChange={setAge} items={[{ value: 'saleAge', label: 'Sale se' }, { value: 'stockAge', label: 'Aane se' }]} />}>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ageRows} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                <CartesianGrid stroke={theme.grid} vertical={false} />
                <XAxis dataKey="label" tick={theme.axis} axisLine={false} tickLine={false} interval={0} />
                <YAxis tick={theme.axis} axisLine={false} tickLine={false} tickFormatter={axisMoney} width={44} />
                <Tooltip formatter={(v, _n, p) => [`${formatPKR(Number(v))} · ${(p as { payload?: { lines?: number } }).payload?.lines ?? 0} cheezein`, costHidden ? 'Bechne par' : 'Cost']} {...theme.tooltip} />
                <Bar dataKey={metric} radius={[6, 6, 0, 0]} barSize={30}>
                  {ageRows.map((b, i) => <Cell key={b.key} fill={AGE_COLORS[i % AGE_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="rounded-2xl" title={<Title icon={Layers}>Stock ki halat</Title>} description="Kitna paisa theek, kam aur khatam maal me">
          <div className="h-[170px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusRows.filter((s) => s.lines > 0)} dataKey="lines" nameKey="name" innerRadius={48} outerRadius={72} paddingAngle={2} stroke="none">
                  {statusRows.filter((s) => s.lines > 0).map((s) => <Cell key={s.key} fill={s.color} />)}
                </Pie>
                <Tooltip formatter={(v, n) => [`${v} cheezein`, n]} {...theme.tooltip} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-2 space-y-1 text-[0.8125rem]">
            {statusRows.map((s) => (
              <li key={s.key} className="flex items-center justify-between">
                <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />{s.name} · {s.lines}</span>
                <span className="tabular-nums text-slate-900">{fmt(costHidden ? s.retail : s.cost)}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="rounded-2xl" title={<Title icon={Layers}>Paisa kahan laga hai</Title>} description={costHidden ? 'Bechne ki qeemat par' : 'Cost par — bar par tooltip me bechne ki qeemat aur sale'}
        actions={<Segmented label="Kis hisaab se" value={current.value} onChange={setBy} items={breakdowns.map((b) => ({ value: b.value, label: b.label }))} />}>
        {!breakRows.length ? <Empty text="Kuch nahi" /> : (
          <div style={{ height: Math.max(200, breakRows.length * 30) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={breakRows} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={theme.grid} horizontal={false} />
                <XAxis type="number" tick={theme.axis} axisLine={false} tickLine={false} tickFormatter={axisMoney} />
                <YAxis type="category" dataKey="label" tick={theme.axis} axisLine={false} tickLine={false} width={120} />
                <Tooltip formatter={(v, _n, p) => {
                  const r = (p as { payload?: { retail: number; revenue: number; lines: number } }).payload;
                  return [`${formatPKR(Number(v))} · ${r?.lines ?? 0} cheezein · sale ${formatPKR(r?.revenue ?? 0)}`, costHidden ? 'Bechne par' : 'Cost'];
                }} {...theme.tooltip} />
                <Bar dataKey={metric} radius={[0, 6, 6, 0]} barSize={16}>
                  {breakRows.map((c, i) => <Cell key={c.id} fill={c.color || PALETTE[i % PALETTE.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Movers icon={Zap} color="text-orange-600" title="Tez bikne wala" description="Period me sab se zyada bika" rows={data.fast} empty="Is period me kuch nahi bika" onOpen={onOpen}
          right={(r) => <><span className="block font-semibold">{qty(r.sold)} {r.unit}</span><span className="text-[0.6875rem] text-slate-500">{coverText(r.cover)} ka maal</span></>} />
        <Movers icon={Snail} color="text-cyan-600" title="Dheere bikne wala" description={`${data.period.slowCover}+ din ka maal para hai`} rows={data.slow} empty="Koi nahi" onOpen={onOpen}
          right={(r) => <><span className="block font-semibold">{fmt(costHidden ? r.retail : r.valueAtCost)}</span><span className="text-[0.6875rem] text-slate-500">{coverText(r.cover)}</span></>} />
        <Movers icon={Hourglass} color="text-violet-600" title="Dead stock" description={`${data.period.deadDays}+ din se nahi bika — discount ya return sochein`} rows={data.dead} empty="Koi dead stock nahi" onOpen={onOpen}
          right={(r) => <><span className="block font-semibold">{fmt(costHidden ? r.retail : r.valueAtCost)}</span><span className="text-[0.6875rem] text-slate-500">{ageText(r.saleAge)} se</span></>} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl" title={<Title icon={PiggyBank}>Sab se qeemti maal</Title>} description="Bechne ki qeemat par">
          <ul className="divide-y divide-slate-100">
            {data.topValue.map((r, i) => (
              <li key={r.productId}>
                <button type="button" onClick={() => onOpen(r.productId)} className="flex w-full items-center justify-between gap-2 py-2 text-left text-[0.8125rem] hover:opacity-80">
                  <span className="flex min-w-0 items-center gap-2"><span className="w-5 shrink-0 text-slate-400">{i + 1}</span><span className="truncate font-medium text-slate-800">{r.name}</span></span>
                  <span className="shrink-0 tabular-nums text-slate-900">{money(r.retail)} <span className="text-slate-400">· {cost(r.valueAtCost)}</span></span>
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="rounded-2xl" title={<Title icon={CalendarClock}>Expiry — batch war</Title>} description="Jin batches par expiry likhi hai">
          {!data.expiry.buckets.some((b) => b.batches) ? <Empty text="Kisi batch par expiry nahi likhi" /> : (
            <>
              <div className="grid grid-cols-5 gap-1.5">
                {data.expiry.buckets.map((b, i) => (
                  <div key={b.key} className={cn('rounded-xl p-2 text-center ring-1', i === 0 ? 'bg-rose-50 ring-rose-200' : i === 1 ? 'bg-amber-50 ring-amber-200' : 'bg-slate-50 ring-slate-200')}>
                    <p className="text-[0.625rem] font-semibold text-slate-500">{b.label}</p>
                    <p className="text-[0.9375rem] font-bold tabular-nums text-slate-900">{b.batches}</p>
                    <p className="truncate text-[0.625rem] tabular-nums text-slate-500">{cost(b.cost)}</p>
                  </div>
                ))}
              </div>
              <ul className="mt-3 max-h-56 divide-y divide-slate-100 overflow-y-auto">
                {data.expiry.soonest.map((b) => (
                  <li key={`${b.productId}${b.batchNumber}`}>
                    <button type="button" onClick={() => onOpen(b.productId)} className="flex w-full items-center justify-between gap-2 py-2 text-left text-[0.8125rem] hover:opacity-80">
                      <span className="min-w-0"><span className="block truncate font-medium text-slate-800">{b.name}</span><span className="text-[0.6875rem] text-slate-500">Batch {b.batchNumber} · {dateText(b.expiryDate)}</span></span>
                      <span className="shrink-0 text-right"><span className={cn('block font-semibold', b.days < 0 ? 'text-rose-700' : b.days <= 30 ? 'text-amber-700' : 'text-slate-700')}>{b.days < 0 ? 'expire' : `${b.days} din`}</span><span className="text-[0.6875rem] text-slate-500">{qty(b.qty)} · {cost(b.cost)}</span></span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      </div>

      <Card className="rounded-2xl" title={<Title icon={Calculator}>Value kaise nikali</Title>}>
        <div className="grid gap-3 text-[0.8125rem] leading-relaxed text-slate-600 md:grid-cols-2">
          <p><b className="text-slate-900">Ausat cost (average).</b> Har purchase par cost purane aur naye maal ka ausat ban jati hai. Branch ki apni cost likhi ho to woh. Variant ki apni cost. IMEI aur serial wale maal ki cost har unit ki apni kharid se, carpet ki har roll ke rate se.</p>
          <p><b className="text-slate-900">Sale aur profit.</b> Wapas aaya maal minus, void bill shamil nahi. Profit us cost se jo bechte waqt bill par likhi gayi thi. Pichli period utne hi din ki hai jitni chuni hui.</p>
          {(data.quality.noCost > 0 || data.quality.negative > 0 || data.quality.inactive > 0) && (
            <ul className="space-y-1 rounded-xl bg-amber-50 p-3 text-amber-900 md:col-span-2">
              {data.quality.noCost > 0 && <li>• {data.quality.noCost} cheezon ki cost nahi likhi — un ki cost 0 gini gayi.</li>}
              {data.quality.negative > 0 && <li>• {data.quality.negative} cheezon ka stock minus me hai — ginti kar ke theek karein.</li>}
              {data.quality.inactive > 0 && <li>• {data.quality.inactive} band products me abhi maal para hai.</li>}
            </ul>
          )}
        </div>
      </Card>
    </div>
  );
}

function Movers({ icon, color, title, description, rows, empty, right, onOpen }: {
  icon: LucideIcon; color: string; title: string; description: string; rows: StockBrief[]; empty: string;
  right: (r: StockBrief) => ReactNode; onOpen: (id: string) => void;
}) {
  const Icon = icon;
  return (
    <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><Icon className={cn('h-4 w-4', color)} />{title}</span>} description={description}>
      {!rows.length ? <Empty text={empty} /> : (
        <ul className="divide-y divide-slate-100">
          {rows.map((r) => (
            <li key={r.productId}>
              <button type="button" onClick={() => onOpen(r.productId)} className="flex w-full items-center justify-between gap-2 py-2 text-left text-[0.8125rem] hover:opacity-80">
                <span className="min-w-0"><span className="block truncate font-medium text-slate-800">{r.name}</span><span className="text-[0.6875rem] text-slate-500">{qty(r.stock)} {r.unit} para hai</span></span>
                <span className="shrink-0 text-right tabular-nums">{right(r)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function Title({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return <span className="inline-flex items-center gap-2"><Icon className="h-4 w-4 text-brand-600" />{children}</span>;
}

function Delta({ value, prev }: { value: number | null; prev: string }) {
  if (value === null) return <span>Pichli period me kuch nahi</span>;
  const up = value >= 0;
  return (
    <span className={cn('inline-flex items-center gap-0.5', up ? 'text-emerald-600' : 'text-rose-600')}>
      {up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}{Math.abs(value).toFixed(0)}% pichli period se ({prev})
    </span>
  );
}

function Kpi({ icon: I, label, value, sub, tone = 'brand' }: { icon: LucideIcon; label: string; value: string; sub?: ReactNode; tone?: 'brand' | 'rose' }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2"><span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', tone === 'rose' ? 'bg-violet-50 text-violet-700' : 'bg-brand-50 text-brand-700')}><I className="h-4 w-4" /></span><span className="text-[0.8125rem] text-slate-500">{label}</span></div>
      <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">{value}</p>
      {sub && <p className="mt-0.5 text-[0.75rem] text-slate-500">{sub}</p>}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="py-10 text-center text-[0.875rem] text-slate-500">{text}</p>;
}
