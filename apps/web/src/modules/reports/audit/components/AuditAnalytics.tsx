/**
 * Charts for the audit report: events over time and by hour (split by
 * severity), events by type, money at risk, and branches side by side.
 */

import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BarChart3, Clock, Coins, Layers, Store } from 'lucide-react';
import { Segmented, Skeleton, Table, TBody, Td, Th, THead, Tr } from '@/design-system/components';
import { useChartTheme } from '@modules/dashboard/engine/useChartTheme';
import type { AuditOverview, AuditType } from '../api';
import { SEVERITY_META, TYPE_META, hourLabel, keyLabel } from '../meta';
import { Empty, Panel } from './parts';

interface Fmt { money: (n: number) => string; cost: (n: number) => string; costHidden: boolean }

const SEV = ['high', 'medium', 'low'] as const;

export function AuditAnalytics({ data, loading, fmt, onType }: { data: AuditOverview | undefined; loading: boolean; fmt: Fmt; onType: (t: AuditType) => void }) {
  const theme = useChartTheme();
  const tip = theme.tooltip;
  const [typeMetric, setTypeMetric] = useState<'count' | 'high'>('count');

  if (loading || !data) {
    return <div className="grid gap-4 lg:grid-cols-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-72 rounded-2xl" />)}</div>;
  }
  const t = data.totals;
  const [open, close] = data.settings.hours.split('–').map((x) => Number(x.split(':')[0]));
  const types = data.byType.map((x) => ({ ...x, label: TYPE_META[x.type].label, color: TYPE_META[x.type].color })).sort((a, b) => b[typeMetric] - a[typeMetric]);
  const money: Array<{ label: string; value: number; text: string; color: string; type: AuditType }> = [
    { label: 'Void bill', value: t.voidValue, text: fmt.money(t.voidValue), color: TYPE_META.void.color, type: 'void' as const },
    { label: 'Return', value: t.refundValue, text: fmt.money(t.refundValue), color: TYPE_META.refund.color, type: 'refund' as const },
    { label: 'Bari discount', value: t.discountValue, text: fmt.money(t.discountValue), color: TYPE_META.discount.color, type: 'discount' as const },
    { label: 'Drawer kam', value: t.drawerShort, text: fmt.money(t.drawerShort), color: TYPE_META.drawer.color, type: 'drawer' as const },
    { label: 'Galle se nikale', value: t.cashOutValue, text: fmt.money(t.cashOutValue), color: TYPE_META.cash_out.color, type: 'cash_out' as const },
    ...(fmt.costHidden ? [] : [{ label: 'Stock nuqsan (cost)', value: t.cost ?? 0, text: fmt.cost(t.cost ?? 0), color: TYPE_META.stock_loss.color, type: 'stock_loss' as const }]),
  ].filter((m) => m.value > 0);
  const maxMoney = Math.max(...money.map((m) => m.value), 1);
  const trend = data.trend.map((x) => ({ ...x, label: keyLabel(x.key) }));
  const anyTrend = trend.some((x) => x.high + x.medium + x.low > 0);

  return (
    <div className="space-y-4">
      <Panel icon={BarChart3} title="Waqiye waqt ke saath" hint={`${data.range.grouping === 'month' ? 'Mahine' : 'Din'} war, darje ke hisaab se. Kisi din achanak uchaal ho to us din ka record dekhein.`}>
        {!anyTrend ? <Empty text="Is period me koi waqiya nahi" /> : (
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                <CartesianGrid stroke={theme.grid} vertical={false} />
                <XAxis dataKey="label" tick={theme.axis} axisLine={false} tickLine={false} minTickGap={12} />
                <YAxis tick={theme.axis} axisLine={false} tickLine={false} allowDecimals={false} width={36} />
                <Tooltip {...tip} formatter={(v, n) => [String(v), SEVERITY_META[n as keyof typeof SEVERITY_META]?.label ?? n]} />
                <Legend formatter={(v: string) => SEVERITY_META[v as keyof typeof SEVERITY_META]?.label ?? v} wrapperStyle={{ fontSize: 12 }} />
                {SEV.map((s, i) => <Bar key={s} dataKey={s} stackId="a" fill={SEVERITY_META[s].color} maxBarSize={28} radius={i === SEV.length - 1 ? [4, 4, 0, 0] : undefined} />)}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel icon={Layers} title="Type war" hint="Kis type ke waqiye zyada hain. Bar dabayein to wohi record khulta hai."
          actions={<Segmented label="Kya dikhayein" value={typeMetric} onChange={setTypeMetric} items={[{ value: 'count', label: 'Sab' }, { value: 'high', label: 'Zaroori' }]} />}>
          {!types.length ? <Empty text="Koi waqiya nahi" /> : (
            <div style={{ height: Math.max(160, types.length * 30) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={types} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={theme.grid} horizontal={false} />
                  <XAxis type="number" tick={theme.axis} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="label" tick={theme.axis} axisLine={false} tickLine={false} width={112} />
                  <Tooltip {...tip} formatter={(v) => [String(v), typeMetric === 'high' ? 'Zaroori' : 'Waqiye']} />
                  <Bar dataKey={typeMetric} radius={[0, 4, 4, 0]} barSize={16} cursor="pointer" onClick={(bar) => { const row = bar as unknown as { type?: AuditType; payload?: { type?: AuditType } }; const tp = row.payload?.type ?? row.type; if (tp) onType(tp); }}>
                    {types.map((x) => <Cell key={x.type} fill={x.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>

        <Panel icon={Coins} title="Paisa jo khatre me tha" hint="In waqiyat me kitni amount shamil thi. Ye nuqsan zaroori nahi — har ek ko dekh kar tay karein.">
          {!money.length ? <Empty text="Koi amount shamil nahi" /> : (
            <ul className="space-y-3">
              {money.map((m) => (
                <li key={m.label}>
                  <button type="button" onClick={() => onType(m.type)} className="block w-full text-left hover:opacity-80">
                    <div className="flex justify-between gap-2 text-[0.8125rem]"><span className="font-medium text-slate-700">{m.label}</span><span className="tabular-nums font-semibold text-slate-900">{m.text}</span></div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full" style={{ width: `${(m.value / maxMoney) * 100}%`, background: m.color }} /></div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel icon={Clock} title="Kis waqt" hint={`Ghante war (dukaan ka waqt). Halka hissa dukaan ke waqt (${data.settings.hours}) se bahar hai — wahan ke kaam khaas dekhein.`}>
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.hours} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <CartesianGrid stroke={theme.grid} vertical={false} />
              {open < close && open > 0 && <ReferenceArea x1={0} x2={open - 1} fill={theme.isDark ? 'rgba(244,63,94,0.08)' : 'rgba(244,63,94,0.06)'} />}
              {open < close && close < 24 && <ReferenceArea x1={close} x2={23} fill={theme.isDark ? 'rgba(244,63,94,0.08)' : 'rgba(244,63,94,0.06)'} />}
              <XAxis dataKey="hour" tick={theme.axis} axisLine={false} tickLine={false} tickFormatter={(h: number) => hourLabel(h).replace(' ', '')} interval={2} />
              <YAxis tick={theme.axis} axisLine={false} tickLine={false} allowDecimals={false} width={36} />
              <Tooltip {...tip} labelFormatter={(h) => hourLabel(Number(h))} formatter={(v, n) => [String(v), SEVERITY_META[n as keyof typeof SEVERITY_META]?.label ?? n]} />
              <Legend formatter={(v: string) => SEVERITY_META[v as keyof typeof SEVERITY_META]?.label ?? v} wrapperStyle={{ fontSize: 12 }} />
              {SEV.map((s, i) => <Bar key={s} dataKey={s} stackId="h" fill={SEVERITY_META[s].color} maxBarSize={22} radius={i === SEV.length - 1 ? [4, 4, 0, 0] : undefined} />)}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      {data.shops.length > 1 && (
        <Panel icon={Store} title="Branch war" hint="Har branch me kitne waqiye. Ek branch baqi se bohat upar ho to wahan ka staff aur drawer dekhein." flush>
          <Table minWidth="34rem" className="[&_table]:text-[0.8125rem]">
            <THead>
              <Tr><Th className="px-5 py-2">Branch</Th><Th className="px-2 py-2 text-right">Waqiye</Th><Th className="px-2 py-2 text-right">Zaroori</Th><Th className="px-2 py-2 text-right">Void</Th><Th className="px-2 py-2 text-right">Return</Th><Th className="px-5 py-2 text-right">Drawer kam</Th></Tr>
            </THead>
            <TBody>
              {data.shops.map((s) => (
                <Tr key={s.id}>
                  <Td className="px-5 py-2.5 font-medium text-slate-900">{s.name}</Td>
                  <Td className="px-2 py-2.5 text-right tabular-nums">{s.events}</Td>
                  <Td className="px-2 py-2.5 text-right tabular-nums text-rose-600">{s.high}</Td>
                  <Td className="px-2 py-2.5 text-right tabular-nums">{s.voids}</Td>
                  <Td className="px-2 py-2.5 text-right tabular-nums">{fmt.money(s.refundValue)}</Td>
                  <Td className="px-5 py-2.5 text-right tabular-nums">{fmt.money(s.drawerShort)}</Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        </Panel>
      )}
    </div>
  );
}
