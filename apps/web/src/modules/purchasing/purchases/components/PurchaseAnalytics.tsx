/**
 * Purchase analytics for the chosen period: totals against the previous
 * period, spend trend, suppliers, categories, items, payment methods, units
 * bought in, cost rises, returns, open orders and the weekday pattern.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Boxes, CalendarClock, ClipboardList, Layers, PackageSearch, RotateCcw, TrendingUp, Truck, Wallet } from 'lucide-react';
import { Card, Segmented, Skeleton, Table, THead, TBody, Tr, Th, Td } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { axisMoney } from '@modules/dashboard/engine/parts';
import { PAYMENT_COLORS, PAYMENT_LABELS, useChartTheme } from '@modules/dashboard/engine/useChartTheme';
import { purchasesApi, type PurchaseAnalytics as Data } from '../api/purchases.api';
import { t as tr } from '@core/i18n';

const PALETTE = ['#0f766e', '#2563eb', '#7c3aed', '#db2777', '#ea580c', '#ca8a04', '#16a34a', '#0891b2', '#64748b', '#9333ea'];
const DAYS = [tr('Itwar'), tr('Peer'), tr('Mangal'), tr('Budh'), tr('Jumeraat'), tr('Juma'), tr('Hafta')];
const q = (n: number) => Number(n.toFixed(2)).toLocaleString('en-PK');

export function PurchaseAnalytics({ range, money }: { range: { from: string; to: string } | null; money: (n: number) => string }) {
  const theme = useChartTheme();
  const tip = theme.tooltip;
  const [metric, setMetric] = useState<'value' | 'paid' | 'bills'>('value');
  const qy = useQuery({ queryKey: ['purchase-analytics', range?.from, range?.to], queryFn: () => purchasesApi.analytics(range) });
  const d = qy.data;

  if (qy.isLoading || !d) {
    return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>;
  }
  const t = d.totals;
  const up = t.growth >= 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={Truck} label={tr('Maal aaya')} value={money(t.value)} sub={
          <span className={cn('inline-flex items-center gap-0.5', up ? 'text-rose-600' : 'text-emerald-600')}>
            {up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}{tr('{{value}}% pichli period se ({{prevValue}})', { value: Math.abs(t.growth).toFixed(0), prevValue: money(t.prevValue) })}
          </span>} />
        <Kpi icon={Wallet} label={tr('Diye')} value={money(t.paid)} sub={tr('Udhaar par {{credit}}', { credit: money(t.credit) })} tone={t.credit > 0 ? 'amber' : 'emerald'} />
        <Kpi icon={ClipboardList} label={tr('Bill')} value={String(t.bills)} sub={tr('Ausat bill {{avgBill}}', { avgBill: money(t.avgBill) })} />
        <Kpi icon={Boxes} label={tr('Suppliers / cheezein')} value={`${t.suppliers} / ${t.items}`} sub={t.returned > 0 ? tr('Wapas {{returned}}', { returned: money(t.returned) }) : tr('Koi return nahi')} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="rounded-2xl lg:col-span-2" title={<span className="inline-flex items-center gap-2"><TrendingUp className="h-4 w-4 text-brand-600" />{tr('Purchase ka rujhan')}</span>}
          description={d.range.byMonth ? tr('Mahine war') : tr('Din war')}
          actions={<Segmented label={tr('Kya dikhayein')} value={metric} onChange={setMetric} items={[{ value: 'value', label: tr('Maal') }, { value: 'paid', label: tr('Diye') }, { value: 'bills', label: tr('Bill') }]} />}>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={d.trend} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="pur-trend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={theme.primary} stopOpacity={0.3} /><stop offset="100%" stopColor={theme.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={theme.grid} vertical={false} />
                <XAxis dataKey="label" tick={theme.axis} axisLine={false} tickLine={false} minTickGap={12} />
                <YAxis tick={theme.axis} axisLine={false} tickLine={false} tickFormatter={metric === 'bills' ? undefined : axisMoney} width={44} allowDecimals={false} />
                <Tooltip formatter={(v) => [metric === 'bills' ? String(v) : formatPKR(Number(v)), metric === 'bills' ? tr('Bill') : metric === 'paid' ? tr('Diye') : tr('Maal')]} {...tip} />
                <Area type="monotone" dataKey={metric} stroke={theme.primary} strokeWidth={2.25} fill="url(#pur-trend)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><Wallet className="h-4 w-4 text-brand-600" />{tr('Payment kaise hui')}</span>}>
          {!d.payments.length ? <Empty text={tr('Koi payment nahi')} /> : (
            <>
              <div className="h-[170px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={d.payments} dataKey="value" nameKey="method" innerRadius={48} outerRadius={72} paddingAngle={2} stroke="none">
                      {d.payments.map((p) => <Cell key={p.method} fill={PAYMENT_COLORS[p.method] ?? '#64748b'} />)}
                    </Pie>
                    <Tooltip formatter={(v, n) => [formatPKR(Number(v)), PAYMENT_LABELS[String(n)] ?? n]} {...tip} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-2 space-y-1 text-[0.8125rem]">
                {d.payments.map((p) => (
                  <li key={p.method} className="flex items-center justify-between">
                    <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: PAYMENT_COLORS[p.method] ?? '#64748b' }} />{PAYMENT_LABELS[p.method] ?? p.method}</span>
                    <span className="tabular-nums text-slate-900">{money(p.value)}</span>
                  </li>
                ))}
                {t.credit > 0 && <li className="flex justify-between border-t border-slate-100 pt-1 text-amber-700"><span>{tr('Udhaar par')}</span><span className="tabular-nums">{money(t.credit)}</span></li>}
              </ul>
            </>
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><Truck className="h-4 w-4 text-brand-600" />{tr('Suppliers')}</span>} description={tr('Kis se kitna maal aaya')}>
          {!d.suppliers.length ? <Empty text={tr('Koi purchase nahi')} /> : (
            <ul className="space-y-2.5">
              {d.suppliers.map((s, i) => (
                <li key={s.id}>
                  <Link to={`/suppliers/${s.id}`} className="block hover:opacity-80">
                    <div className="flex justify-between gap-2 text-[0.8125rem]">
                      <span className="truncate font-medium text-slate-800">{s.name}</span>
                      <span className="shrink-0 tabular-nums text-slate-900">{money(s.value)} <span className="text-slate-400">· {s.share.toFixed(0)}%</span></span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full" style={{ width: `${s.share}%`, background: PALETTE[i % PALETTE.length] }} />
                    </div>
                    <p className="mt-0.5 text-[0.6875rem] text-slate-500">{tr('{{bills}} bill · diye {{paid}}', { bills: s.bills, paid: money(s.paid) })}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><Layers className="h-4 w-4 text-brand-600" />{tr('Categories')}</span>} description={tr('Paisa kis type ke maal par laga')}>
          {!d.categories.length ? <Empty text={tr('Koi purchase nahi')} /> : (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={d.categories} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={theme.grid} horizontal={false} />
                  <XAxis type="number" tick={theme.axis} axisLine={false} tickLine={false} tickFormatter={axisMoney} />
                  <YAxis type="category" dataKey="name" tick={theme.axis} axisLine={false} tickLine={false} width={110} />
                  <Tooltip formatter={(v) => [formatPKR(Number(v)), tr('Maal')]} {...tip} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={16}>
                    {d.categories.map((c, i) => <Cell key={c.name} fill={c.color || PALETTE[i % PALETTE.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><PackageSearch className="h-4 w-4 text-brand-600" />{tr('Sab se zyada khareeda maal')}</span>} description={tr('Amount, quantity aur ausat cost (fi base unit)')}>
        {!d.items.length ? <Empty text={tr('Koi purchase nahi')} /> : (
          <div className="overflow-x-auto">
            <Table minWidth="34rem" className="[&>table]:text-sm">
              <THead className="text-start text-[0.75rem] uppercase tracking-wide text-slate-500">
                <Tr><Th className="px-0 py-2">#</Th><Th className="px-0 py-2">{tr('Cheez')}</Th><Th className="px-0 py-2 text-end">{tr('Quantity')}</Th><Th className="px-0 py-2 text-end">{tr('Ausat cost')}</Th><Th className="px-0 py-2 text-end">{tr('Bill')}</Th><Th className="px-0 py-2 text-end">{tr('Amount')}</Th></Tr>
              </THead>
              <TBody className="divide-y divide-slate-100">
                {d.items.map((i, n) => (
                  <Tr key={`${i.name}${n}`}>
                    <Td className="px-0 py-2 text-slate-400">{n + 1}</Td>
                    <Td className="px-0 py-2 font-medium text-slate-900">{i.name}{i.raw && <span className="ms-1.5 rounded bg-amber-100 px-1 text-[0.625rem] font-semibold text-amber-800">{tr('RAW')}</span>}</Td>
                    <Td className="px-0 text-inherit py-2 text-end tabular-nums">{q(i.qty)} {i.unit}</Td>
                    <Td className="px-0 text-inherit py-2 text-end tabular-nums">{money(i.avgCost)}</Td>
                    <Td className="px-0 text-inherit py-2 text-end tabular-nums">{i.bills}</Td>
                    <Td className="px-0 text-inherit py-2 text-end font-semibold tabular-nums">{money(i.value)}</Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </div>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-rose-600" />{tr('Mehngi hoti cheezein')}</span>} description={tr('Is period me cost kitni barhi')}>
          {!d.costRises.length ? <Empty text={tr('Kisi cheez ki cost nahi barhi')} /> : (
            <ul className="divide-y divide-slate-100">
              {d.costRises.map((c) => (
                <li key={c.name} className="flex items-center justify-between gap-2 py-2 text-[0.8125rem]">
                  <span className="min-w-0"><span className="block truncate font-medium text-slate-800">{c.name}</span><span className="text-[0.75rem] text-slate-500">{formatPKR(c.first)} → {formatPKR(c.last)} / {c.unit}</span></span>
                  <span className="shrink-0 rounded-full bg-rose-50 px-2 py-0.5 font-semibold text-rose-700">+{c.change.toFixed(0)}%</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><Boxes className="h-4 w-4 text-brand-600" />{tr('Kis unit me khareeda')}</span>} description={tr('Pcs, carton, box, bori…')}>
          {!d.units.length ? <Empty text={tr('Koi purchase nahi')} /> : (
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={d.units} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                  <CartesianGrid stroke={theme.grid} vertical={false} />
                  <XAxis dataKey="unit" tick={theme.axis} axisLine={false} tickLine={false} />
                  <YAxis tick={theme.axis} axisLine={false} tickLine={false} tickFormatter={axisMoney} width={44} />
                  <Tooltip formatter={(v, _n, p) => [`${formatPKR(Number(v))} · ${(p as { payload?: { lines?: number } }).payload?.lines ?? 0} lines`, tr('Maal')]} {...tip} />
                  <Bar dataKey="value" fill={theme.primary} radius={[6, 6, 0, 0]} barSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><CalendarClock className="h-4 w-4 text-brand-600" />{tr('Hafte ke din')}</span>} description={tr('Kis din zyada maal aata hai')}>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={d.weekday.map((w) => ({ ...w, name: DAYS[w.day] }))} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                <CartesianGrid stroke={theme.grid} vertical={false} />
                <XAxis dataKey="name" tick={theme.axis} axisLine={false} tickLine={false} interval={0} tickFormatter={(v: string) => v.slice(0, 3)} />
                <YAxis tick={theme.axis} axisLine={false} tickLine={false} tickFormatter={axisMoney} width={44} />
                <Tooltip formatter={(v) => [formatPKR(Number(v)), tr('Maal')]} {...tip} />
                <Bar dataKey="value" fill={theme.highlight} radius={[6, 6, 0, 0]} barSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><ClipboardList className="h-4 w-4 text-blue-600" />{tr('Khule orders')}</span>} description={tr('{{count}} order · {{value}} ka maal aana baqi{{value2}}', { count: d.openOrders.count, value: money(d.openOrders.value), value2: d.openOrders.late ? tr(' · {{late}} late', { late: d.openOrders.late }) : '' })}>
          {!d.openOrders.list.length ? <Empty text={tr('Koi khula order nahi')} /> : (
            <ul className="divide-y divide-slate-100">
              {d.openOrders.list.map((o) => (
                <li key={o.id}>
                  <Link to={`/purchases/${o.id}`} className="flex items-center justify-between gap-2 py-2 text-[0.8125rem] hover:opacity-80">
                    <span className="min-w-0"><span className="block truncate font-medium text-slate-800">{o.supplier}</span><span className="text-[0.75rem] text-slate-500">{o.number}{o.expectedAt ? ` · ${new Date(o.expectedAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}` : ''}</span></span>
                    <span className="flex shrink-0 items-center gap-2">{o.late && <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[0.6875rem] font-semibold text-rose-700">{tr('Late')}</span>}<span className="tabular-nums">{money(o.value)}</span></span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><RotateCcw className="h-4 w-4 text-amber-600" />{tr('Return')}</span>} description={tr('Supplier ko lautaya maal')}>
          <div className="flex items-end gap-6 py-4">
            <div><p className="text-3xl font-bold tabular-nums text-slate-900">{d.returns.count}</p><p className="text-[0.75rem] text-slate-500">{tr('return')}</p></div>
            <div><p className="text-3xl font-bold tabular-nums text-amber-700">{money(d.returns.total)}</p><p className="text-[0.75rem] text-slate-500">{tr('amount (khate se kam hui)')}</p></div>
            {t.value > 0 && <div><p className="text-3xl font-bold tabular-nums text-slate-900">{((d.returns.total / t.value) * 100).toFixed(1)}%</p><p className="text-[0.75rem] text-slate-500">{tr('purchase ka')}</p></div>}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Kpi({ icon: I, label, value, sub, tone = 'brand' }: { icon: typeof Truck; label: string; value: string; sub?: React.ReactNode; tone?: 'brand' | 'amber' | 'emerald' }) {
  const toneCls = tone === 'amber' ? 'bg-amber-50 text-amber-700' : tone === 'emerald' ? 'bg-emerald-50 text-emerald-700' : 'bg-brand-50 text-brand-700';
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2"><span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', toneCls)}><I className="h-4 w-4" /></span><span className="text-[0.8125rem] text-slate-500">{label}</span></div>
      <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">{value}</p>
      {sub && <p className="mt-0.5 text-[0.75rem] text-slate-500">{sub}</p>}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="py-10 text-center text-[0.875rem] text-slate-500">{text}</p>;
}

export type { Data as PurchaseAnalyticsData };
