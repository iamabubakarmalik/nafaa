/**
 * Analytics tab: who sold when (trend of the top five), each person's share,
 * busy hours per person and per weekday, a measure-by-person comparison
 * against the team average, bills against bill size, and commission for the
 * month the period ends in.
 */

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart,
  Tooltip, XAxis, YAxis, ZAxis,
} from 'recharts';
import { BarChart3, CalendarClock, Clock, Coins, PieChart as PieIcon, ScatterChart as ScatterIcon, TrendingUp } from 'lucide-react';
import { Segmented } from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import { axisMoney } from '@modules/dashboard/engine/parts';
import { useChartTheme } from '@modules/dashboard/engine/useChartTheme';
import type { StaffOverview } from '../api';
import { OTHERS_COLOR, PALETTE, WEEKDAYS, hourLabel, keyLabel, pct, qtyText } from './meta';
import { Empty, HeatGrid, Panel } from './parts';

type Measure = 'average' | 'itemsPerBill' | 'perHour' | 'discountPct' | 'returnPct' | 'voidPct' | 'creditPct';
const MEASURES: Array<{ value: Measure; label: string; kind: 'money' | 'qty' | 'pct'; team: keyof StaffOverview['team']; hint: string }> = [
  { value: 'average', label: 'Ausat bill', kind: 'money', team: 'average', hint: 'Ek bill ki ausat raqam — bara ho to banda saath me aur cheezein bechta hai' },
  { value: 'itemsPerBill', label: 'Cheez/bill', kind: 'qty', team: 'itemsPerBill', hint: 'Har bill me kitni cheezein' },
  { value: 'perHour', label: 'Fi ghanta', kind: 'money', team: 'perHour', hint: 'Kaam ke har ghante ki bikri (haziri, galla shift ya bikri wale ghante)' },
  { value: 'discountPct', label: 'Chhoot %', kind: 'pct', team: 'discountPct', hint: 'Haath se di gayi chhoot, subtotal ka % — code aur points ki chhoot alag' },
  { value: 'returnPct', label: 'Wapsi %', kind: 'pct', team: 'returnPct', hint: 'Is ke bills ki bikri ka kitna % wapas aaya' },
  { value: 'voidPct', label: 'Cancel %', kind: 'pct', team: 'voidPct', hint: 'Is ke kitne bill cancel hue' },
  { value: 'creditPct', label: 'Udhaar %', kind: 'pct', team: 'creditPct', hint: 'Bikri ka kitna hissa udhaar par gaya' },
];

export function StaffAnalytics({ data, money, onOpen }: { data: StaffOverview; money: (n: number) => string; onOpen: (id: string) => void }) {
  const theme = useChartTheme();
  const tip = theme.tooltip;
  const [measure, setMeasure] = useState<Measure>('average');
  const m = MEASURES.find((x) => x.value === measure)!;
  const sellers = useMemo(() => data.staff.filter((r) => r.id && r.bills > 0), [data.staff]);
  const nameOf = useMemo(() => new Map(data.staff.map((r) => [r.id ?? '', r.name])), [data.staff]);
  // Colour follows the person (their rank slot), the same in every chart on the page.
  const colorOf = useMemo(() => new Map(sellers.map((r, i) => [r.id!, PALETTE[i % PALETTE.length]])), [sellers]);
  const fmt = (v: number) => (m.kind === 'money' ? money(v) : m.kind === 'pct' ? pct(v) : qtyText(v));

  const trendRows = data.trend.map((t) => ({ label: keyLabel(t.key), ...Object.fromEntries([...data.trendStaff, 'others'].map((id) => [id, t.staff[id] ?? 0])) }));
  const hasOthers = data.trend.some((t) => (t.staff.others ?? 0) > 0);
  const series = [...data.trendStaff.map((id) => ({ id, name: nameOf.get(id) ?? 'Banda', color: colorOf.get(id) ?? OTHERS_COLOR })),
    ...(hasOthers ? [{ id: 'others', name: 'Baqi sab', color: OTHERS_COLOR }] : [])];

  const share = sellers.slice(0, 8).map((r) => ({ id: r.id!, name: r.name, value: r.net }));
  const rest = sellers.slice(8).reduce((a, r) => a + r.net, 0);
  if (rest > 0) share.push({ id: 'others', name: 'Baqi sab', value: rest });

  const compare = [...sellers].filter((r) => measure !== 'perHour' || r.hours > 0).sort((a, b) => b[measure] - a[measure]).slice(0, 12)
    .map((r) => ({ id: r.id!, name: r.name, value: r[measure] }));
  const teamValue = data.team[m.team];

  const scatter = sellers.map((r) => ({ id: r.id!, name: r.name, bills: r.bills, average: r.average, net: r.net }));

  if (!sellers.length) return <Panel icon={BarChart3} title="Analytics"><Empty text="Is muddat me kisi ne bikri nahi ki — muddat badal kar dekhein" /></Panel>;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel icon={TrendingUp} title="Kis ne kab becha" className="lg:col-span-2"
          hint={`${data.grouping === 'month' ? 'Mahine' : 'Din'} war bikri (wapsi ke baad) — top 5 alag, baqi ek rang me`}>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendRows} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                <CartesianGrid stroke={theme.grid} vertical={false} />
                <XAxis dataKey="label" tick={theme.axis} axisLine={false} tickLine={false} minTickGap={12} />
                <YAxis tick={theme.axis} axisLine={false} tickLine={false} tickFormatter={axisMoney} width={44} />
                <Tooltip {...tip} formatter={(v, name) => [formatPKR(Number(v)), name]} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {series.map((s) => (
                  <Area key={s.id} type="monotone" dataKey={s.id} name={s.name} stackId="1" stroke={theme.isDark ? '#0f172a' : '#ffffff'} strokeWidth={1.5}
                    fill={s.color} fillOpacity={0.85} />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel icon={PieIcon} title="Bikri me hissa" hint="Kul bikri me har bande ka %">
          <div className="h-[170px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={share} dataKey="value" nameKey="name" innerRadius={48} outerRadius={74} paddingAngle={2} stroke="none">
                  {share.map((s) => <Cell key={s.id} fill={colorOf.get(s.id) ?? OTHERS_COLOR} />)}
                </Pie>
                <Tooltip {...tip} formatter={(v, n) => [formatPKR(Number(v)), n]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-2 space-y-1 text-[0.8125rem]">
            {share.map((s) => (
              <li key={s.id}>
                <button type="button" disabled={s.id === 'others'} onClick={() => onOpen(s.id)} className="flex w-full items-center justify-between gap-2 enabled:hover:text-brand-700">
                  <span className="flex min-w-0 items-center gap-2"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colorOf.get(s.id) ?? OTHERS_COLOR }} /><span className="truncate text-slate-700">{s.name}</span></span>
                  <span className="shrink-0 tabular-nums text-slate-900">{money(s.value)} <span className="text-slate-400">· {data.totals.net > 0 ? ((s.value / data.totals.net) * 100).toFixed(0) : 0}%</span></span>
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel icon={BarChart3} title="Banda war muqabla" hint={m.hint}
        actions={<Segmented label="Kya dikhayein" value={measure} onChange={setMeasure} className="flex-wrap" items={MEASURES.map((x) => ({ value: x.value, label: x.label }))} />}>
        {!compare.length ? <Empty text="Kisi ke kaam ke ghante darj nahi" /> : (
          <div style={{ height: Math.max(180, compare.length * 30 + 30) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={compare} layout="vertical" margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={theme.grid} horizontal={false} />
                <XAxis type="number" tick={theme.axis} axisLine={false} tickLine={false} tickFormatter={m.kind === 'money' ? axisMoney : m.kind === 'pct' ? (v: number) => `${v}%` : undefined} />
                <YAxis type="category" dataKey="name" tick={theme.axis} axisLine={false} tickLine={false} width={110} />
                <Tooltip {...tip} formatter={(v) => [fmt(Number(v)), m.label]} />
                {teamValue > 0 && <ReferenceLine x={teamValue} stroke={theme.highlight} strokeDasharray="4 3" label={{ value: `Team ${fmt(teamValue)}`, position: 'top', fontSize: 11, fill: theme.axis.fill }} />}
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={14} className="cursor-pointer"
                  onClick={(e) => { const id = (e as { payload?: { id?: string } }).payload?.id; if (id) onOpen(id); }}>
                  {compare.map((c) => <Cell key={c.id} fill={colorOf.get(c.id) ?? theme.primary} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel icon={Clock} title="Kaun kis ghante bechta hai" hint="Har bande ke bill ghante war — gehra rang yani zyada bill. Naam dabayein to tafseel">
          <HeatGrid onRow={onOpen} rows={data.staffHours.map((s) => ({ key: s.id, label: nameOf.get(s.id) ?? 'Banda', values: s.hours }))} />
        </Panel>
        <Panel icon={CalendarClock} title="Rush ke din aur ghante" hint="Poori team ke bill — staff kab zyada chahiye">
          <HeatGrid rows={data.heatmap.map((v, d) => ({ key: String(d), label: WEEKDAYS[d], values: v }))} />
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel icon={ScatterIcon} title="Bill zyada ya bill bara?" className="lg:col-span-2"
          hint="Daayein = zyada bill, upar = bara ausat bill, bara gola = zyada bikri. Gole par click se tafseel">
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 8, right: 16, left: -4, bottom: 4 }}>
                <CartesianGrid stroke={theme.grid} />
                <XAxis type="number" dataKey="bills" name="Bill" tick={theme.axis} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="number" dataKey="average" name="Ausat bill" tick={theme.axis} axisLine={false} tickLine={false} tickFormatter={axisMoney} width={48} />
                <ZAxis type="number" dataKey="net" range={[80, 600]} />
                {data.team.average > 0 && <ReferenceLine y={data.team.average} stroke={theme.highlight} strokeDasharray="4 3" />}
                <Tooltip {...tip} cursor={{ strokeDasharray: '3 3' }} content={({ payload }) => {
                  const p = payload?.[0]?.payload as (typeof scatter)[number] | undefined;
                  if (!p) return null;
                  return (
                    <div style={tip.contentStyle} className="px-3 py-2">
                      <p className="font-semibold">{p.name}</p>
                      <p>{p.bills} bill · ausat {formatPKR(p.average)}</p>
                      <p>Bikri {formatPKR(p.net)}</p>
                    </div>
                  );
                }} />
                <Scatter data={scatter} onClick={(p) => { const id = (p as { payload?: { id?: string } }).payload?.id; if (id) onOpen(id); }} className="cursor-pointer">
                  {scatter.map((s) => <Cell key={s.id} fill={colorOf.get(s.id) ?? theme.primary} fillOpacity={0.8} stroke={theme.isDark ? '#0f172a' : '#ffffff'} strokeWidth={2} />)}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel icon={Clock} title="Ghante war bill" hint="Din ke kis waqt kitne bill bane">
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.hourly.filter((h) => h.bills > 0)} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid stroke={theme.grid} vertical={false} />
                <XAxis dataKey="hour" tick={theme.axis} axisLine={false} tickLine={false} tickFormatter={hourLabel} />
                <YAxis tick={theme.axis} axisLine={false} tickLine={false} allowDecimals={false} width={36} />
                <Tooltip {...tip} labelFormatter={(h) => hourLabel(Number(h))} formatter={(v, n) => [n === 'net' ? formatPKR(Number(v)) : String(v), n === 'net' ? 'Bikri' : 'Bill']} />
                <Bar dataKey="bills" fill={theme.primary} radius={[4, 4, 0, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      {data.commission && data.commission.rows.some((r) => r.enrolled) && (
        <Panel icon={Coins} title={`Commission — ${new Date(`${data.commission.period}-15T12:00:00`).toLocaleDateString('en-PK', { month: 'long', year: 'numeric' })}`}
          hint="Muddat jis mahine me khatam hoti hai, us ka hisab — sab branches ki bikri par"
          actions={<Link to="/staff/commission" className="text-[0.8125rem] font-semibold text-brand-700 hover:underline">Commission safha →</Link>}>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {data.commission.rows.filter((r) => r.enrolled).map((r) => (
              <li key={r.userId}>
                <button type="button" onClick={() => onOpen(r.userId)} className="flex w-full items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-left ring-1 ring-slate-100 hover:bg-brand-50">
                  <span className="min-w-0">
                    <span className="block truncate text-[0.8125rem] font-semibold text-slate-900">{nameOf.get(r.userId) ?? 'Banda'}</span>
                    <span className="block text-[0.6875rem] text-slate-500">{r.paid ? 'Ada ho gayi' : 'Baqi hai'}{r.targetPct != null && ` · target ${r.targetPct.toFixed(0)}%`}</span>
                  </span>
                  <span className="shrink-0 font-bold tabular-nums text-slate-900">{money(r.earned)}</span>
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}
