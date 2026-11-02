/**
 * Khulasa tab: hourly sales against the day before and the same weekday
 * last week, the sales statement, how money came in, the close-the-day
 * checklist, top items, categories, staff, branches and items running low.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar, CartesianGrid, Cell, ComposedChart, Line as ChartLine, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { AlertTriangle, BarChart3, Clock, Package, Receipt, Store, Trophy, UserRound, Wallet } from 'lucide-react';
import { Segmented } from '@/design-system/components';
import { axisMoney, hourLabel, hourTick } from '@modules/dashboard/engine/parts';
import { PAYMENT_COLORS, useChartTheme } from '@modules/dashboard/engine/useChartTheme';
import type { DayBook } from '../api';
import { method, qty, type Money } from '../print';
import { CloseChecklist } from './CloseChecklist';
import { Delta, Empty, Line, Panel, ShareBar, Tag, TableWrap, td, tdR, th, thR } from './parts';
import { t as tr, Trans } from '@core/i18n';

const WEEKDAY = (key: string) => new Intl.DateTimeFormat('en-PK', { weekday: 'long' }).format(new Date(`${key}T12:00:00`));

export function OverviewView({ d, m, pending, onTab, onStaff }: {
  d: DayBook; m: Money; pending: number; onTab: (t: 'cash' | 'money' | 'items' | 'staff' | 'checks') => void; onStaff: (id: string, name: string) => void;
}) {
  const s = d.summary;
  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-3">
        <HourlyCard d={d} m={m} className="xl:col-span-2" />
        <CompareCard d={d} m={m} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Panel icon={Receipt} title={tr('Sale ka hisaab')} hint={tr('Cheezon ki qeemat se net sale tak, qadam ba qadam')}>
          <Line label={tr('Cheezon ki qeemat')} value={m.sales(s.subtotal)} hint={tr('{{itemsSold}} cheezein', { itemsSold: qty(s.itemsSold) })} />
          <Line sign="−" label={tr('Discount')} value={m.sales(s.discount)} hint={d.discounts.bills ? tr('{{bills}} bill', { bills: d.discounts.bills }) : undefined} />
          {s.charges > 0 && <Line sign="+" label={tr('Service charges')} value={m.sales(s.charges)} />}
          <Line sign="=" label={tr('Bill ki amount · {{bills}} bill', { bills: s.bills })} value={m.sales(s.billed)} />
          <Line sign="−" label={tr('Return')} value={m.sales(s.returns)} hint={s.returnCount ? tr('{{returnCount}} dafa', { returnCount: s.returnCount }) : undefined} />
          <Line strong label={tr('Net sale')} value={m.sales(s.net)} />
          {!m.costHidden && (
            <>
              <Line sign="−" label={tr('Maal ki cost')} value={m.cost(s.cogs)} />
              <Line strong label={tr('Profit{{value}}', { value: s.margin != null ? ` · ${s.margin.toFixed(1)}%` : '' })} value={m.cost(s.grossProfit)} />
            </>
          )}
          <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-[0.75rem] leading-relaxed text-slate-500">
            {tr('Void bill is me shamil nahi. Return us din ginti hai jis din maal wapas aaya.')}
          </p>
        </Panel>

        <PaymentsCard d={d} m={m} onMore={() => onTab('money')} />

        <CloseChecklist d={d} m={m} pending={pending} onTab={onTab} className="lg:col-span-2 xl:col-span-1" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel icon={Trophy} title={tr('Sab se zyada bika')} hint={tr('Amount ke hisaab se')} actions={<button type="button" onClick={() => onTab('items')} className="text-[0.75rem] font-semibold text-brand-700 hover:underline">{tr('Sab maal →')}</button>}>
          {!d.items.length ? <Empty icon={Package} text={tr('Is din kuch nahi bika')} /> : (
            <ol className="space-y-2.5">
              {d.items.slice(0, 7).map((i, n) => (
                <li key={i.productId ?? i.name}>
                  <div className="flex items-baseline justify-between gap-2 text-[0.8125rem]">
                    <span className="min-w-0 truncate text-slate-700"><span className="me-1.5 text-slate-400">{n + 1}</span>{i.name}</span>
                    <span className="shrink-0 tabular-nums font-medium text-slate-900">{m.sales(i.revenue)}</span>
                  </div>
                  <div className="flex items-center justify-between text-[0.6875rem] text-slate-500">
                    <span>{tr('{{qty}} {{unit}} · {{bills}} bill', { qty: qty(i.qty), unit: i.unit, bills: i.bills })}</span>
                    {!m.costHidden && <span>{tr('profit {{profit}}', { profit: m.cost(i.profit) })}</span>}
                  </div>
                  <ShareBar value={i.revenue} max={d.items[0].revenue} color={i.color ?? undefined} />
                </li>
              ))}
            </ol>
          )}
        </Panel>

        <Panel icon={BarChart3} title={tr('Category war')} hint={tr('Har type ke maal ki sale')}>
          {!d.categories.length ? <Empty icon={BarChart3} text={tr('Koi sale nahi')} /> : (
            <ul className="space-y-2.5">
              {d.categories.slice(0, 8).map((c) => (
                <li key={c.id ?? 'none'}>
                  <div className="flex items-baseline justify-between gap-2 text-[0.8125rem]">
                    <span className="flex min-w-0 items-center gap-2 truncate text-slate-700">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: c.color ?? '#94a3b8' }} />{c.name}
                    </span>
                    <span className="shrink-0 tabular-nums font-medium text-slate-900">{m.sales(c.revenue)}</span>
                  </div>
                  <p className="text-[0.6875rem] text-slate-500">{tr('{{qty}} cheezein · {{items}} item{{value}}', { qty: qty(c.qty), items: c.items, value: s.net > 0 ? tr(' · {{value}}% sale', { value: ((c.revenue / s.net) * 100).toFixed(0) }) : '' })}</p>
                  <ShareBar value={c.revenue} max={d.categories[0].revenue} color={c.color ?? undefined} />
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel icon={UserRound} title={tr('Kis ne kitna becha')} hint={tr('Naam par dabayein: us ke bill')} actions={<button type="button" onClick={() => onTab('staff')} className="text-[0.75rem] font-semibold text-brand-700 hover:underline">{tr('Poori list →')}</button>}>
          {!d.staff.length ? <Empty icon={UserRound} text={tr('Koi bill nahi bana')} /> : (
            <ul className="space-y-2.5">
              {d.staff.slice(0, 6).map((p) => (
                <li key={p.userId}>
                  <button type="button" onClick={() => onStaff(p.userId, p.name)} className="block w-full text-start hover:opacity-80">
                    <div className="flex items-baseline justify-between gap-2 text-[0.8125rem]">
                      <span className="truncate font-medium text-slate-800">{p.name}</span>
                      <span className="shrink-0 tabular-nums text-slate-900">{m.sales(p.total)}</span>
                    </div>
                    <p className="text-[0.6875rem] text-slate-500">{tr('{{bills}} bill · ausat {{avgBill}}{{value}}', { bills: p.bills, avgBill: m.sales(p.avgBill), value: p.voids ? tr(' · {{voids}} void', { voids: p.voids }) : '' })}</p>
                    <ShareBar value={p.total} max={d.staff[0].total} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {d.branches.length > 1 && (
        <Panel icon={Store} title={tr('Branch war')} hint={tr('Har branch ki sale, galla aur expense. Farq = gina hua − hona chahiye.')}>
          <TableWrap>
            <thead><tr><th className={th}>{tr('Branch')}</th><th className={thR}>{tr('Bill')}</th><th className={thR}>{tr('Net sale')}</th><th className={thR}>{tr('Cash sale')}</th><th className={thR}>{tr('Expense')}</th><th className={thR}>{tr('Register')}</th><th className={thR}>{tr('Farq')}</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {d.branches.map((b) => (
                <tr key={b.shopId}>
                  <td className={`${td} font-medium text-slate-900`}>{b.name}</td>
                  <td className={tdR}>{b.bills}</td>
                  <td className={`${tdR} font-semibold text-slate-900`}>{m.sales(b.net)}</td>
                  <td className={tdR}>{m.sales(b.cash)}</td>
                  <td className={tdR}>{m.cost(b.expenses)}</td>
                  <td className={tdR}>{b.registers ? (b.openRegisters ? <Tag tone="amber">{tr('{{openRegisters}} khula', { openRegisters: b.openRegisters })}</Tag> : <Tag tone="green">{tr('Band')}</Tag>) : '—'}</td>
                  <td className={tdR}>{b.difference == null ? '—' : <span className={b.difference < 0 ? 'text-rose-700' : b.difference > 0 ? 'text-amber-700' : 'text-success-700'}>{m.sales(b.difference)}</span>}</td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        </Panel>
      )}

      <Panel icon={AlertTriangle} title={tr('Kam reh gaya maal')} hint={tr('Is din biki cheezein jo ab apni had (low stock alert) tak ya us se neeche hain. Stock abhi ka hai.')}>
        {!d.lowStock.length ? <Empty icon={Package} text={tr('Sab theek hai')} hint={tr('Is din biki koi cheez kam nahi hui')} /> : (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {d.lowStock.map((l) => (
              <li key={`${l.productId}-${l.shop}`}>
                <Link to={`/products/${l.productId}`} className="flex items-center justify-between gap-2 rounded-2xl bg-slate-50 px-3 py-2 ring-1 ring-slate-100 hover:bg-slate-100">
                  <span className="min-w-0">
                    <span className="block truncate text-[0.8125rem] font-medium text-slate-800">{l.name}</span>
                    <span className="text-[0.6875rem] text-slate-500">{tr('{{shop}} · had {{alert}}', { shop: l.shop, alert: qty(l.alert) })}</span>
                  </span>
                  <Tag tone={l.stock <= 0 ? 'rose' : 'amber'}>{l.stock <= 0 ? tr('Khatam') : `${qty(l.stock)} ${l.unit}`}</Tag>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {d.lowStock.length > 0 && <Link to="/low-stock" className="mt-3 inline-block text-[0.75rem] font-semibold text-brand-700 hover:underline">{tr('Order banayein →')}</Link>}
      </Panel>
    </div>
  );
}

function HourlyCard({ d, m, className }: { d: DayBook; m: Money; className?: string }) {
  const theme = useChartTheme();
  const [vs, setVs] = useState<'lastWeek' | 'yesterday'>('lastWeek');
  const data = d.hourly.map((h) => ({ ...h, label: hourTick(h.hour), compare: h[vs] }));
  const has = data.some((h) => h.sales || h.compare);
  const busiest = [...d.hourly].sort((a, b) => b.sales - a.sales)[0];
  const compareLabel = vs === 'lastWeek' ? tr('Pichhla {{date}}', { date: WEEKDAY(d.compare.lastWeek.date) }) : tr('Kal');
  return (
    <Panel className={className} icon={Clock} title={tr('Ghante war sale')}
      hint={busiest?.sales ? <Trans text="Sab se zyada rush {{hour}} par — {{bills}} bill, {{sales}}" values={{ hour: <b className="text-slate-700">{hourLabel(busiest.hour)}</b>, bills: busiest.bills, sales: m.sales(busiest.sales) }} /> : tr('Kis waqt kitni sale hui')}
      actions={<Segmented label={tr('Kis se milayein')} value={vs} onChange={setVs} items={[{ value: 'lastWeek', label: tr('Pichhla hafta') }, { value: 'yesterday', label: tr('Kal') }]} />}>
      {!has ? <Empty icon={Clock} text={tr('Is din koi sale nahi')} /> : (
        <>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                <CartesianGrid stroke={theme.grid} vertical={false} />
                <XAxis dataKey="label" tick={theme.axis} axisLine={false} tickLine={false} interval={1} />
                <YAxis tick={theme.axis} axisLine={false} tickLine={false} tickFormatter={axisMoney} width={44} />
                <Tooltip {...theme.tooltip}
                  labelFormatter={(_l, p) => { const h = (p?.[0]?.payload as { hour?: number } | undefined)?.hour; return h == null ? '' : hourLabel(h); }}
                  formatter={(v, name) => [m.sales(Number(v)), name === 'sales' ? tr('Is din') : compareLabel]} />
                <Bar dataKey="sales" fill={theme.primary} radius={[4, 4, 0, 0]} maxBarSize={22} />
                <ChartLine type="monotone" dataKey="compare" stroke={theme.highlight} strokeWidth={2} dot={false} strokeDasharray="4 3" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap gap-4 text-[0.75rem] text-slate-600">
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: theme.primary }} />{tr('Is din')}</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4 rounded" style={{ backgroundColor: theme.highlight }} />{compareLabel}</span>
          </div>
        </>
      )}
    </Panel>
  );
}

function CompareCard({ d, m }: { d: DayBook; m: Money }) {
  const s = d.summary;
  const y = d.compare.yesterday;
  const w = d.compare.lastWeek;
  const rows: Array<{ label: string; now: number; y: number; w: number; fmt: (v: number) => string; hide?: boolean }> = [
    { label: tr('Net sale'), now: s.net, y: y.net, w: w.net, fmt: (v) => m.sales(v) },
    { label: tr('Bill'), now: s.bills, y: y.bills, w: w.bills, fmt: (v) => String(v) },
    { label: tr('Ausat bill'), now: s.avgBill, y: y.avgBill, w: w.avgBill, fmt: (v) => m.sales(v) },
    { label: tr('Cheezein'), now: s.itemsSold, y: y.itemsSold, w: w.itemsSold, fmt: qty },
    { label: tr('Profit'), now: s.grossProfit ?? 0, y: y.profit ?? 0, w: w.profit ?? 0, fmt: (v) => m.cost(v), hide: m.costHidden },
  ];
  return (
    <Panel icon={BarChart3} title={tr('Muqabla')} hint={tr('Kal aur pichhle {{date}} se. Hara = behtar.', { date: WEEKDAY(w.date) })}>
      <div className="space-y-3">
        {rows.filter((r) => !r.hide).map((r) => (
          <div key={r.label} className="rounded-2xl bg-slate-50 px-3 py-2.5 ring-1 ring-slate-100">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[0.75rem] font-medium text-slate-500">{r.label}</span>
              <span className="text-[1rem] font-bold tabular-nums text-slate-900">{r.fmt(r.now)}</span>
            </div>
            <div className="mt-1 grid grid-cols-2 gap-2 text-[0.6875rem] text-slate-500">
              <span className="flex items-center justify-between gap-1">{tr('Kal {{y}}', { y: r.fmt(r.y) })}{' '} <Delta now={r.now} before={r.y} /></span>
              <span className="flex items-center justify-between gap-1">{tr('Hafta {{w}}', { w: r.fmt(r.w) })}{' '} <Delta now={r.now} before={r.w} /></span>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function PaymentsCard({ d, m, onMore }: { d: DayBook; m: Money; onMore: () => void }) {
  const theme = useChartTheme();
  const list = d.payments.filter((p) => p.total > 0);
  const total = list.reduce((a, p) => a + p.total, 0);
  const cash = d.payments.filter((p) => p.method === 'CASH').reduce((a, p) => a + p.total, 0);
  return (
    <Panel icon={Wallet} title={tr('Paisa kaise aaya')} hint={tr('Sale aur booking ka paisa, cash me se wapas di gayi rezgari nikal kar')}
      actions={<button type="button" onClick={onMore} className="text-[0.75rem] font-semibold text-brand-700 hover:underline">{tr('Details →')}</button>}>
      {!list.length ? <Empty icon={Wallet} text={tr('Is din koi paisa nahi aaya')} /> : (
        <>
          <div className="relative h-[150px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={list} dataKey="total" nameKey="method" innerRadius={46} outerRadius={68} paddingAngle={2} stroke="none">
                  {list.map((p) => <Cell key={p.method} fill={PAYMENT_COLORS[p.method] ?? '#64748b'} />)}
                </Pie>
                <Tooltip {...theme.tooltip} formatter={(v, nm) => [m.sales(Number(v)), method(String(nm))]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[0.6875rem] text-slate-500">{tr('Kul')}</span>
              <span className="text-[0.9375rem] font-bold tabular-nums text-slate-900">{m.sales(total)}</span>
            </div>
          </div>
          <ul className="mt-2 space-y-1.5 text-[0.8125rem]">
            {list.map((p) => (
              <li key={p.method} className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-slate-600"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PAYMENT_COLORS[p.method] ?? '#64748b' }} />{method(p.method)} <span className="text-slate-400">{tr('· {{bills}} bill', { bills: p.bills })}</span></span>
                <span className="tabular-nums font-medium text-slate-900">{m.sales(p.total)} <span className="text-[0.6875rem] text-slate-400">{total ? `${((p.total / total) * 100).toFixed(0)}%` : ''}</span></span>
              </li>
            ))}
          </ul>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-success-50 px-3 py-2"><p className="text-[0.6875rem] font-medium text-success-800">{tr('Cash')}</p><p className="font-bold tabular-nums text-success-900">{m.sales(cash)}</p></div>
            <div className="rounded-xl bg-sky-50 px-3 py-2"><p className="text-[0.6875rem] font-medium text-sky-800">{tr('Online / card')}</p><p className="font-bold tabular-nums text-sky-900">{m.sales(total - cash)}</p></div>
          </div>
          {d.summary.credit > 0 && <Line label={tr('Udhaar par diya (abhi nahi aaya)')} value={m.sales(d.summary.credit)} />}
          {d.khata.collected > 0 && <Line label={tr('Khata se wasooli')} value={m.sales(d.khata.collected)} />}
        </>
      )}
    </Panel>
  );
}
