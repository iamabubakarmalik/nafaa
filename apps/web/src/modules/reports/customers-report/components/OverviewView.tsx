/**
 * Overview tab: new against returning buyers over time, named against
 * walk-in sales, how many days people come and how far apart, the top
 * customers by spend, profit, visits or credit, and where they live.
 */

import { useState, type ReactNode } from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Building2, CalendarClock, Footprints, MapPin, Repeat, Store, Trophy, UserPlus, Users } from 'lucide-react';
import { Segmented } from '@/design-system/components';
import { axisMoney } from '@modules/dashboard/engine/parts';
import { useChartTheme } from '@modules/dashboard/engine/useChartTheme';
import type { Overview, TopCustomer } from '../api';
import { BarList, CustomerCell, DataTable, Delta, Empty, Panel, daysAgo, keyLabel, type Formatter } from './parts';

type TopKey = 'spend' | 'profit' | 'visits' | 'credit';
const GENDER = { MALE: { label: 'Mard', color: '#2563eb' }, FEMALE: { label: 'Khawateen', color: '#db2777' }, OTHER: { label: 'Nahi likha', color: '#94a3b8' } };

export function OverviewView({ data: d, f, compare, noun }: { data: Overview; f: Formatter; compare: boolean; noun: string }) {
  const theme = useChartTheme();
  const [metric, setMetric] = useState<'people' | 'money'>('people');
  const [top, setTop] = useState<TopKey>('spend');
  const [place, setPlace] = useState<'cities' | 'areas'>('cities');
  const t = d.totals;
  const prev = compare ? d.previous : null;
  const showCost = !f.costHidden && t.profit != null;
  const rows = d.trend.map((x) => ({ ...x, label: keyLabel(x.key) }));
  const mix = [
    { name: 'Naam wale', value: Math.max(0, t.named), color: theme.primary },
    { name: 'Walk-in', value: Math.max(0, t.walkIn), color: '#94a3b8' },
  ];
  const topRows: TopCustomer[] = (top === 'profit' ? d.top.profit : d.top[top]) ?? [];
  const places = d[place];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel icon={Users} className="lg:col-span-2" title={metric === 'people' ? 'Naye aur purane customers' : 'Naam wali aur walk-in sale'}
          hint={metric === 'people'
            ? `${d.grouping === 'month' ? 'Har mahine' : 'Har din'} kitne naye log pehli dafa aaye, aur kitne purane wapas aaye`
            : 'Jin bills par customer ka naam tha, aur jo bina naam ke bane'}
          actions={<Segmented label="Kya dikhayein" value={metric} onChange={setMetric} items={[{ value: 'people', label: 'Log' }, { value: 'money', label: 'Sale' }]} />}>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              {metric === 'people' ? (
                <BarChart data={rows} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                  <CartesianGrid stroke={theme.grid} vertical={false} />
                  <XAxis dataKey="label" tick={theme.axis} axisLine={false} tickLine={false} minTickGap={12} />
                  <YAxis tick={theme.axis} axisLine={false} tickLine={false} allowDecimals={false} width={40} />
                  <Tooltip {...theme.tooltip} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="newBuyers" name="Naye" stackId="a" fill="#16a34a" maxBarSize={28} />
                  <Bar dataKey="returningBuyers" name="Purane" stackId="a" fill={theme.primary} radius={[5, 5, 0, 0]} maxBarSize={28} />
                </BarChart>
              ) : (
                <AreaChart data={rows} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                  <defs>
                    <linearGradient id="cr-named" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={theme.primary} stopOpacity={0.3} /><stop offset="100%" stopColor={theme.primary} stopOpacity={0} /></linearGradient>
                    <linearGradient id="cr-walk" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#94a3b8" stopOpacity={0.3} /><stop offset="100%" stopColor="#94a3b8" stopOpacity={0} /></linearGradient>
                  </defs>
                  <CartesianGrid stroke={theme.grid} vertical={false} />
                  <XAxis dataKey="label" tick={theme.axis} axisLine={false} tickLine={false} minTickGap={12} />
                  <YAxis tick={theme.axis} axisLine={false} tickLine={false} width={44} tickFormatter={f.salesHidden ? () => '' : axisMoney} />
                  <Tooltip {...theme.tooltip} formatter={(v, n) => [f.money(Number(v)), n]} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="named" name="Naam wale" stackId="m" stroke={theme.primary} strokeWidth={2} fill="url(#cr-named)" />
                  <Area type="monotone" dataKey="walkIn" name="Walk-in" stackId="m" stroke="#94a3b8" strokeWidth={2} fill="url(#cr-walk)" />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel icon={Store} title="Naam wale vs walk-in" hint="Kitni sale pehchane hue customers se aayi">
          {t.named + t.walkIn <= 0 ? <Empty text="Is period me koi sale nahi" /> : (
            <>
              <div className="relative mx-auto h-40 w-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={mix} dataKey="value" nameKey="name" innerRadius={48} outerRadius={72} paddingAngle={2} stroke="none">
                      {mix.map((m) => <Cell key={m.name} fill={m.color} />)}
                    </Pie>
                    <Tooltip {...theme.tooltip} formatter={(v, n) => [f.money(Number(v)), n]} />
                  </PieChart>
                </ResponsiveContainer>
                <span className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-bold tabular-nums text-slate-900">{t.namedShare.toFixed(0)}%</span>
                  <span className="text-[0.6875rem] text-slate-500">naam wale</span>
                </span>
              </div>
              <dl className="mt-3 space-y-1.5 text-[0.8125rem]">
                <Row label={`Naam wale · ${t.namedBills} bill`} value={f.money(t.named)} />
                <Row label={`Walk-in · ${t.walkInBills} bill`} value={f.money(t.walkIn)} />
                <Row label="Ausat bill — naam wale" value={f.money(t.avgBasket)} />
                <Row label="Ausat bill — walk-in" value={f.money(t.walkInBasket)} />
              </dl>
              {prev && <p className="mt-2 text-[0.75rem]"><Delta now={t.namedShare} before={prev.namedShare} points /></p>}
              <p className="mt-2 text-[0.6875rem] leading-relaxed text-slate-500">Zyada bills par naam likhein — tabhi pata chalta hai kaun wapas aata hai aur kaun kho gaya.</p>
            </>
          )}
        </Panel>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Panel icon={UserPlus} title="Naye vs purane" hint="Naya = is period me pehli dafa khareeda (is branch par)">
          <div className="grid grid-cols-2 gap-3">
            <Split color="#16a34a" label="Naye" people={t.newBuyers} money={f.money(t.newNet)} share={t.named ? (t.newNet / t.named) * 100 : 0}
              delta={prev ? <Delta now={t.newBuyers} before={prev.newBuyers} /> : null} />
            <Split color={theme.primary} label="Purane" people={t.returning} money={f.money(t.returningNet)} share={t.named ? (t.returningNet / t.named) * 100 : 0}
              delta={prev ? <Delta now={t.returning} before={prev.returning} /> : null} />
          </div>
          <p className="mt-3 text-[0.75rem] text-slate-500">{t.signups} naye {noun.toLowerCase()} register hue{prev ? <> · <Delta now={t.signups} before={prev.signups} /></> : null}</p>
        </Panel>

        <Panel icon={Repeat} title="Kitne din aaye" hint="Is period me har customer kitne alag dinon par aaya">
          <div className="h-[190px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={d.visits} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid stroke={theme.grid} vertical={false} />
                <XAxis dataKey="label" tick={theme.axis} axisLine={false} tickLine={false} />
                <YAxis tick={theme.axis} axisLine={false} tickLine={false} allowDecimals={false} width={40} />
                <Tooltip {...theme.tooltip} formatter={(v) => [`${v} customers`, 'Customers']} />
                <Bar dataKey="customers" fill={theme.primary} radius={[6, 6, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-1 text-[0.75rem] text-slate-500">{t.repeat} customers ({t.repeatRate.toFixed(0)}%) ek se zyada din aaye · ausat {t.avgVisits.toFixed(1)} din</p>
        </Panel>

        <Panel icon={CalendarClock} title="Aane ka faasla" hint="Do dafa aane ke beech kitne din guzarte hain">
          {d.frequency.customers === 0 ? <Empty text="Is period me koi do dafa nahi aaya" /> : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Big label="Ausat" value={`${d.frequency.avgDays?.toFixed(1)} din`} />
                <Big label="Aam taur par (median)" value={`${d.frequency.medianDays?.toFixed(1)} din`} />
              </div>
              <p className="text-[0.75rem] leading-relaxed text-slate-500">
                {d.frequency.customers} customers jo is period me 2 ya zyada din aaye un ka hisaab. Median aam customer batata hai — chand roz aane wale is ko kharab nahi karte.
              </p>
              <dl className="space-y-1.5 border-t border-slate-100 pt-3 text-[0.8125rem]">
                <Row label="Ausat kharch (har customer)" value={f.money(t.avgSpend)} />
                {showCost && <Row label="Profit (naam wale)" value={`${f.cost(t.profit)} · ${f.pct(t.margin)}`} />}
                <Row label="Udhaar par diya" value={f.money(t.credit)} />
              </dl>
            </div>
          )}
        </Panel>
      </div>

      <Panel icon={Trophy} flush title="Sab se ache customers" hint="Is period me — naam par click karein to poori profile khulegi"
        actions={<Segmented label="Kis hisaab se" value={top} onChange={setTop} items={[
          { value: 'spend', label: 'Kharch' },
          ...(showCost && d.top.profit ? [{ value: 'profit' as const, label: 'Profit' }] : []),
          { value: 'visits', label: 'Dafa' },
          { value: 'credit', label: 'Udhaar' },
        ]} />}>
        <div className="px-4 pb-3 sm:px-5">
          <DataTable rows={topRows} rowKey={(r) => r.id} empty="Is period me koi naam wala bill nahi"
            columns={[
              { label: '#', render: (_, i) => <span className="text-slate-400">{i + 1}</span> },
              { label: 'Customer', render: (r) => <CustomerCell id={r.id} name={r.name} phone={r.phone} isVip={r.isVip} sub={r.isNew ? <span className="font-semibold text-emerald-600">Naya</span> : r.city} /> },
              { label: 'Din', align: 'right', render: (r) => r.visits },
              { label: 'Bill', align: 'right', render: (r) => r.bills },
              { label: 'Sale', align: 'right', render: (r) => <span className="font-semibold text-slate-900">{f.money(r.net)}</span> },
              { label: 'Ausat bill', align: 'right', render: (r) => f.money(r.average) },
              { label: 'Profit', align: 'right', hide: !showCost, render: (r) => f.cost(r.profit) },
              { label: 'Udhaar', align: 'right', render: (r) => (r.credit > 0 ? <span className="text-amber-700">{f.money(r.credit)}</span> : '—') },
              { label: 'Aakhri dafa', align: 'right', render: (r) => daysAgo(r.daysSince) },
            ]} />
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel icon={MapPin} className="lg:col-span-2" title="Customer kahan se" hint="Customer ke profile me likha shehar ya ilaqa — sale ke hisaab se"
          actions={<Segmented label="Shehar ya ilaqa" value={place} onChange={setPlace} items={[{ value: 'cities', label: 'Shehar' }, { value: 'areas', label: 'Ilaqa' }]} />}>
          <BarList format={f.money} empty={place === 'cities' ? 'Kisi customer ka shehar nahi likha' : 'Kisi customer ka ilaqa nahi likha'}
            rows={places.rows.map((c) => ({ key: c.name, name: c.name, value: c.net, hint: `${c.buyers} customers` }))} />
          {(places.others || places.missing.buyers > 0) && (
            <p className="mt-3 border-t border-slate-100 pt-2 text-[0.75rem] text-slate-500">
              {places.others && <>Baqi {places.others.groups} jagah: {places.others.buyers} customers · {f.money(places.others.net)}. </>}
              {places.missing.buyers > 0 && <>{places.missing.buyers} customers ki jagah nahi likhi ({f.money(places.missing.net)}).</>}
            </p>
          )}
        </Panel>

        <Panel icon={Footprints} title="Mard / khawateen" hint="Profile me likhe hisaab se">
          <BarList format={f.money} empty="Koi data nahi"
            rows={d.genders.filter((g) => g.buyers).map((g) => ({ key: g.key, name: GENDER[g.key].label, value: g.net, color: GENDER[g.key].color, hint: `${g.buyers} customers` }))} />
        </Panel>
      </div>

      {d.branches.length > 1 && (
        <Panel icon={Building2} flush title="Branch war customers" hint="Har branch par kitne naam wale customers aaye">
          <div className="px-4 pb-3 sm:px-5">
            <DataTable rows={d.branches} rowKey={(r) => r.id ?? 'none'} columns={[
              { label: 'Branch', render: (r) => <span className="font-medium text-slate-900">{r.name}</span> },
              { label: 'Customers', align: 'right', render: (r) => r.buyers },
              { label: 'Naam wali', align: 'right', render: (r) => f.money(r.named) },
              { label: 'Walk-in', align: 'right', render: (r) => f.money(r.walkIn) },
              { label: 'Naam ka hissa', align: 'right', render: (r) => f.pct(r.named + r.walkIn > 0 ? (r.named / (r.named + r.walkIn)) * 100 : 0) },
            ]} />
          </div>
        </Panel>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-2"><dt className="text-slate-500">{label}</dt><dd className="tabular-nums font-medium text-slate-900">{value}</dd></div>;
}

function Big({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2.5 ring-1 ring-slate-100">
      <p className="text-[0.6875rem] font-medium text-slate-500">{label}</p>
      <p className="text-lg font-bold tabular-nums text-slate-900">{value}</p>
    </div>
  );
}

function Split({ color, label, people, money, share, delta }: { color: string; label: string; people: number; money: string; share: number; delta: ReactNode }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
      <p className="flex items-center gap-1.5 text-[0.75rem] font-semibold text-slate-600"><span className="h-2 w-2 rounded-full" style={{ background: color }} />{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums text-slate-900">{people}</p>
      <p className="text-[0.75rem] tabular-nums text-slate-600">{money} · {share.toFixed(0)}%</p>
      {delta && <p className="mt-1 text-[0.6875rem]">{delta}</p>}
    </div>
  );
}
