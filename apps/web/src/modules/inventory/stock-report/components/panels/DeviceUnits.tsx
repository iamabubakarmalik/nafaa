/**
 * Unit-level stock for goods counted one by one (IMEI phones, serial
 * electronics and appliances): how old each unit is, what it cost, warranty
 * running out and units sitting too long. Each industry maps its own report
 * into `DeviceReport` (see devices.tsx).
 */

import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Clock, Hourglass, Search, ShieldAlert, Smartphone } from 'lucide-react';
import { Card, KpiCard, KpiRow, Skeleton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { axisMoney } from '@modules/dashboard/engine/parts';
import { useChartTheme } from '@modules/dashboard/engine/useChartTheme';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { ageText } from '../meta';

export interface DeviceUnit {
  id: string;
  name: string;
  ref: string;
  brand: string | null;
  tag: string | null;
  cost: number;
  price: number;
  ageDays: number;
  bucket: string;
  warrantyDaysLeft: number | null;
}

export interface DeviceReport {
  unitLabel: string;
  buckets: Array<{ key: string; label: string; units: number; cost: number }>;
  units: DeviceUnit[];
  dead: { count: number; cost: number };
  warranty: DeviceUnit[];
  totals: { units: number; cost: number; retail: number };
  chips?: Array<{ label: string; value: string }>;
}

const SHOW = 150;

export function DeviceUnits({ data, loading, error }: { data?: DeviceReport; loading: boolean; error?: unknown }) {
  const theme = useChartTheme();
  const { cost, sales: money, costHidden } = useMasked();
  const [bucket, setBucket] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [more, setMore] = useState(false);

  const units = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.units ?? [])
      .filter((u) => (!bucket || u.bucket === bucket) && (!q || [u.name, u.ref, u.brand, u.tag].some((v) => v?.toLowerCase().includes(q))))
      .sort((a, b) => b.ageDays - a.ageDays);
  }, [data, bucket, search]);

  if (loading) return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>;
  if (error || !data) return <p className="rounded-3xl bg-white px-6 py-14 text-center text-[0.875rem] text-slate-500 ring-1 ring-slate-200/80">Units ki report nahi aa saki</p>;

  return (
    <div className="space-y-4">
      <KpiRow cols={4}>
        <KpiCard icon={Smartphone} color="#2563eb" label={`${data.unitLabel} stock me`} value={String(data.totals.units)} hint={`bechne par ${money(data.totals.retail)}`} />
        <KpiCard icon={Clock} color="#0f766e" label="Lagat" value={cost(data.totals.cost)} hint={costHidden ? 'Cost lock' : `munafa ${cost(data.totals.retail - data.totals.cost)}`} />
        <KpiCard icon={Hourglass} color="#7c3aed" label="Purane units" value={String(data.dead.count)} hint={`${cost(data.dead.cost)} phansa`} />
        <KpiCard icon={ShieldAlert} color="#be185d" label="Warranty khatam hone wali" value={String(data.warranty.length)} hint="jald bechein" />
      </KpiRow>

      {!!data.chips?.length && (
        <div className="flex flex-wrap gap-2">
          {data.chips.map((c) => (
            <span key={c.label} className="rounded-full bg-white px-3 py-1.5 text-[0.75rem] text-slate-600 ring-1 ring-slate-200">{c.label}: <b className="text-slate-900">{c.value}</b></span>
          ))}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="rounded-2xl lg:col-span-2" title="Maal ki umar" description="Kitne din se dukaan me hai — bar dabayein to neeche wahi units">
          <div className="h-[230px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.buckets} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                <CartesianGrid stroke={theme.grid} vertical={false} />
                <XAxis dataKey="label" tick={theme.axis} axisLine={false} tickLine={false} />
                <YAxis tick={theme.axis} axisLine={false} tickLine={false} tickFormatter={costHidden ? undefined : axisMoney} width={44} />
                <Tooltip formatter={(v, _n, p) => [`${costHidden ? '••••' : formatPKR(Number(v))} · ${(p as { payload?: { units?: number } }).payload?.units ?? 0} units`, 'Lagat']} {...theme.tooltip} />
                <Bar dataKey={costHidden ? 'units' : 'cost'} radius={[6, 6, 0, 0]} barSize={30} onClick={(b) => setBucket((x) => (x === (b as { key?: string }).key ? null : (b as { key?: string }).key ?? null))} className="cursor-pointer">
                  {data.buckets.map((b, i) => <Cell key={b.key} fill={bucket && bucket !== b.key ? theme.grid : ['#16a34a', '#65a30d', '#d97706', '#ea580c', '#e11d48', '#7c3aed'][i % 6]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="rounded-2xl" title="Warranty khatam ho rahi" description="Supplier warranty khatam hone se pehle bechein">
          {!data.warranty.length ? <p className="py-10 text-center text-[0.875rem] text-slate-500">Koi nahi</p> : (
            <ul className="max-h-[230px] divide-y divide-slate-100 overflow-y-auto">
              {data.warranty.slice(0, 30).map((u) => (
                <li key={u.id} className="flex items-center justify-between gap-2 py-2 text-[0.8125rem]">
                  <span className="min-w-0"><span className="block truncate font-medium text-slate-800">{u.name}</span><span className="font-mono text-[0.6875rem] text-slate-500">{u.ref}</span></span>
                  <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold', (u.warrantyDaysLeft ?? 0) < 0 ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-800')}>
                    {(u.warrantyDaysLeft ?? 0) < 0 ? 'khatam' : `${u.warrantyDaysLeft} din`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
          <h3 className="text-[0.875rem] font-semibold text-slate-900">Har unit · {units.length}{bucket ? ` · ${data.buckets.find((b) => b.key === bucket)?.label}` : ''}</h3>
          <label className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`${data.unitLabel}, naam ya brand…`} aria-label="Unit dhoondein"
              className="h-9 w-full rounded-xl bg-slate-100/80 pl-9 pr-3 text-[0.8125rem] outline-none focus:bg-white focus:ring-2 focus:ring-brand-500" />
          </label>
        </header>
        {!units.length ? <p className="py-12 text-center text-[0.875rem] text-slate-500">Is filter me koi unit nahi</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-[0.8125rem]">
              <thead className="bg-slate-50/70 text-left text-[0.6875rem] uppercase tracking-wide text-slate-500">
                <tr><th className="px-4 py-2">{data.unitLabel}</th><th className="px-2 py-2">Cheez</th><th className="px-2 py-2">Halat</th><th className="px-2 py-2 text-right">Umar</th><th className="px-2 py-2 text-right">Warranty</th><th className="px-2 py-2 text-right">Lagat</th><th className="px-4 py-2 text-right">Rate</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {units.slice(0, more ? units.length : SHOW).map((u) => (
                  <tr key={u.id}>
                    <td className="px-4 py-2 font-mono text-[0.75rem] text-slate-700">{u.ref}</td>
                    <td className="px-2 py-2"><span className="font-medium text-slate-900">{u.name}</span>{u.brand && <span className="text-slate-500"> · {u.brand}</span>}</td>
                    <td className="px-2 py-2 text-slate-600">{u.tag ?? '—'}</td>
                    <td className={cn('px-2 py-2 text-right tabular-nums', u.ageDays > 90 ? 'font-semibold text-rose-700' : 'text-slate-700')}>{ageText(u.ageDays)}</td>
                    <td className="px-2 py-2 text-right tabular-nums text-slate-600">{u.warrantyDaysLeft === null ? '—' : u.warrantyDaysLeft < 0 ? 'khatam' : `${u.warrantyDaysLeft} din`}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{cost(u.cost)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{money(u.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {units.length > SHOW && !more && (
          <button type="button" onClick={() => setMore(true)} className="w-full border-t border-slate-100 py-2.5 text-[0.8125rem] font-semibold text-brand-700 hover:bg-brand-50">Sab {units.length} dikhayein</button>
        )}
      </section>
    </div>
  );
}
