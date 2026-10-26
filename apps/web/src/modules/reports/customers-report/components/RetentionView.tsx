/**
 * Retention tab: customers grouped by the month they first bought, and the
 * share of each group that bought again one, two, three… months later.
 * Includes the average return curve across all groups.
 */

import { useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity, CalendarRange, Repeat, Sprout, Trophy, UserPlus } from 'lucide-react';
import { KpiCard, KpiRow, Segmented, Table, TBody, Td, Th, THead, Tr } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { useChartTheme } from '@modules/dashboard/engine/useChartTheme';
import type { Cohorts } from '../api';
import { Empty, Panel, keyLabel, type Formatter } from './parts';

export function RetentionView({ data: d, f, months, onMonths }: { data: Cohorts; f: Formatter; months: number; onMonths: (m: number) => void }) {
  const theme = useChartTheme();
  const [show, setShow] = useState<'pct' | 'people' | 'money'>('pct');
  const at = (off: number) => d.curve[off]?.pct ?? null;
  const ranked = d.cohorts.filter((c) => c.size >= 3 && c.cells.length > 1).map((c) => ({ key: c.key, pct: c.cells[1].pct }));
  const best = ranked.sort((a, b) => b.pct - a.pct)[0];
  const curve = d.curve.slice(1).filter((c) => c.pct != null).map((c) => ({ label: `+${c.offset}`, pct: c.pct, cohorts: c.cohorts }));
  const span = Math.max(...d.cohorts.map((c) => c.cells.length), 1);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[0.8125rem] text-slate-600">Pichle {months} mahine ke naye customers — har mahina ek line. Period ka filter yahan nahi lagta.</p>
        <Segmented label="Kitne mahine" value={String(months)} onChange={(v) => onMonths(Number(v))}
          items={[{ value: '6', label: '6 mahine' }, { value: '12', label: '12 mahine' }, { value: '24', label: '24 mahine' }]} />
      </div>

      <KpiRow>
        <KpiCard icon={UserPlus} color="#16a34a" label="Naye customers" value={f.count(d.newCustomers)} hint={`${keyLabel(d.from)} – ${keyLabel(d.to)}`} />
        <KpiCard icon={Repeat} color="#2563eb" label="Agle mahine wapas" value={f.pct(at(1))} hint="pehli khareedari ke baad wala mahina" />
        <KpiCard icon={Activity} color="#7c3aed" label="3 mahine baad" value={f.pct(at(3))} hint="teesre mahine bhi aaye" />
        <KpiCard icon={Sprout} color="#d97706" label="6 mahine baad" value={f.pct(at(6))} hint={months < 7 ? '12 mahine chunein' : 'chhathe mahine bhi aaye'} />
        <KpiCard icon={Trophy} color="#db2777" label="Sab se acha mahina" value={best ? keyLabel(best.key) : '—'} hint={best ? `${best.pct.toFixed(0)}% agle mahine wapas aaye` : 'abhi data kam hai'} />
      </KpiRow>

      <Panel icon={CalendarRange} flush title="Dobara aane ka chart (cohort)"
        hint="Har line: us mahine pehli dafa aane wale. Khane me: utne mahine baad kitne wapas aaye. Gehra rang = zyada log."
        actions={<Segmented label="Kya dikhayein" value={show} onChange={setShow} items={[{ value: 'pct', label: '%' }, { value: 'people', label: 'Log' }, { value: 'money', label: 'Sale' }]} />}>
        {d.newCustomers === 0 ? <div className="px-4 pb-4"><Empty text="In mahino me koi naya naam wala customer nahi aaya" /></div> : (
          <Table className="px-4 pb-4 sm:px-5 [&_table]:text-[0.75rem] [&_table]:border-separate [&_table]:border-spacing-1">
            <THead className="border-0 bg-transparent normal-case tracking-normal">
              <Tr className="text-[0.6875rem] font-semibold text-slate-500">
                <Th className="sticky left-0 bg-white px-2 py-1 text-left">Pehla mahina</Th>
                <Th className="px-2 py-1 text-right">Naye</Th>
                {Array.from({ length: span }, (_, i) => <Th key={i} className="min-w-[3.25rem] px-1 py-1 text-center">{i === 0 ? 'Usi mahine' : `+${i}`}</Th>)}
              </Tr>
            </THead>
            <TBody className="divide-y-0">
              {[...d.cohorts].reverse().map((c) => (
                <Tr key={c.key}>
                  <Td className="sticky left-0 whitespace-nowrap bg-white px-2 py-1 font-medium text-slate-700">{keyLabel(c.key)}</Td>
                  <Td className="px-2 py-1 text-right font-semibold tabular-nums text-slate-900">{c.size}</Td>
                  {Array.from({ length: span }, (_, i) => {
                    const cell = c.cells[i];
                    if (!cell) return <Td key={i} className="p-0" />;
                    const strength = i === 0 ? 1 : cell.pct / 100;
                    const text = show === 'pct' ? `${cell.pct.toFixed(0)}%` : show === 'people' ? String(cell.customers) : f.money(cell.net);
                    return (
                      <Td key={i} title={`${cell.customers} customers · ${f.money(cell.net)}`}
                        className={cn('rounded-md px-1 py-1.5 text-center tabular-nums', !c.size && 'text-slate-300', Math.min(1, strength * (i === 0 ? 1 : 2.2)) > 0.5 ? 'text-white' : 'text-slate-800')}
                        style={c.size ? { backgroundColor: tint(theme.primary, 0.1 + 0.9 * Math.min(1, strength * (i === 0 ? 1 : 2.2))) } : undefined}>
                        {c.size ? text : '—'}
                      </Td>
                    );
                  })}
                </Tr>
              ))}
            </TBody>
          </Table>
        )}
      </Panel>

      <Panel icon={Activity} title="Ausat return" hint="Sab mahino ko mila kar: pehli khareedari ke itne mahine baad kitne % customer phir aaye">
        {!curve.length ? <Empty text="Abhi itne mahine guzre nahi" /> : (
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={curve} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid stroke={theme.grid} vertical={false} />
                <XAxis dataKey="label" tick={theme.axis} axisLine={false} tickLine={false} />
                <YAxis tick={theme.axis} axisLine={false} tickLine={false} width={40} tickFormatter={(v) => `${v}%`} />
                <Tooltip {...theme.tooltip} labelFormatter={(l) => `${String(l).slice(1)} mahine baad`}
                  formatter={(v, _n, item) => [`${Number(v).toFixed(1)}% · ${(item?.payload as { cohorts: number }).cohorts} mahino ka ausat`, 'Wapas aaye']} />
                <Line type="monotone" dataKey="pct" stroke={theme.primary} strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Panel>
    </div>
  );
}

/** Theme colour ("rgb(r g b)") at the given strength. */
const tint = (rgb: string, a: number) => rgb.replace(')', ` / ${a.toFixed(2)})`);
