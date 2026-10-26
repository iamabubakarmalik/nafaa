/**
 * Charts for online sales over a period, drawn from the server report:
 * order pipeline, daily trend, channels, COD against prepaid, cities,
 * couriers and RTO, hours and weekdays, products, customers and COD aging.
 * The orders page shows every section; the reports page splits them by tab.
 */

import type { ElementType, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  Area, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  AlertTriangle, Banknote, CalendarDays, CheckCircle2, Clock, Globe, MapPin, Package, Repeat, ShoppingBag, TrendingUp, Truck, Users, Wallet, Zap,
  type LucideIcon,
} from 'lucide-react';
import { Card, Table, TBody, Td, Th, THead, Tr } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { axisMoney } from '@modules/dashboard/engine/parts';
import { useChartTheme } from '@modules/dashboard/engine/useChartTheme';
import type { OnlineReport } from '../../api/online-orders.api';
import { channelMeta } from '../../hooks/useSalesChannels';
import type { OrderTab } from '../../lib/orders';

export type AnalyticsSection = 'pipeline' | 'trend' | 'payment' | 'time' | 'channels' | 'cities' | 'couriers' | 'products' | 'customers' | 'codAging';

export const ALL_SECTIONS: AnalyticsSection[] = ['pipeline', 'trend', 'payment', 'channels', 'cities', 'couriers', 'time', 'products', 'customers', 'codAging'];

const PALETTE = ['#0f766e', '#2563eb', '#7c3aed', '#db2777', '#ea580c', '#ca8a04', '#16a34a', '#0891b2', '#64748b', '#9333ea'];
const WEEKDAYS = ['Itwar', 'Peer', 'Mangal', 'Budh', 'Jumeraat', 'Juma', 'Hafta'];
const COD_COLOR = '#ea580c';
const PAID_COLOR = '#16a34a';
const RTO_COLOR = '#e11d48';

const PIPELINE: Array<{ key: string; label: string; icon: LucideIcon; tab: OrderTab }> = [
  { key: 'PENDING', label: 'Naye', icon: Zap, tab: 'PENDING' },
  { key: 'CONFIRMED', label: 'Accept', icon: CheckCircle2, tab: 'ACTIVE' },
  { key: 'PREPARING', label: 'Packing', icon: Package, tab: 'ACTIVE' },
  { key: 'READY', label: 'Ready', icon: ShoppingBag, tab: 'ACTIVE' },
  { key: 'OUT_FOR_DELIVERY', label: 'Raste me', icon: Truck, tab: 'ACTIVE' },
  { key: 'DELIVERED', label: 'Delivered', icon: CheckCircle2, tab: 'DELIVERED' },
];

const dayLabel = (key: string, long: boolean) =>
  new Intl.DateTimeFormat('en-PK', long ? { day: 'numeric', month: 'short' } : { weekday: 'short', day: 'numeric' }).format(new Date(`${key}T12:00:00`));
const hourLabel = (h: number) => (h === 0 ? '12am' : h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`);
const rateTone = (v: number) => (v >= 25 ? 'bg-rose-50 text-rose-700' : v >= 12 ? 'bg-amber-50 text-amber-800' : 'bg-success-50 text-success-700');

export function OnlineAnalytics({ data, money, sections = ALL_SECTIONS, onTab }: {
  data: OnlineReport;
  money: (n: number) => string;
  sections?: AnalyticsSection[];
  /** Pipeline tiles open that list on the orders page. */
  onTab?: (tab: OrderTab) => void;
}) {
  const theme = useChartTheme();
  const tip = theme.tooltip;
  const has = (s: AnalyticsSection) => sections.includes(s);
  const t = data.totals;
  const longRange = data.byDay.length > 14;
  const days = data.byDay.map((d) => ({ ...d, name: dayLabel(d.day, longRange) }));
  const peak = data.byHour.reduce((b, h) => (h.orders > b.orders ? h : b), data.byHour[0]);
  const bestDay = data.byWeekday.reduce((b, w) => (w.value > b.value ? w : b), data.byWeekday[0]);
  const pieData = [
    { name: 'COD', value: data.payment.cod.value, orders: data.payment.cod.orders, color: COD_COLOR },
    { name: 'Pehle se paid', value: data.payment.prepaid.value, orders: data.payment.prepaid.orders, color: PAID_COLOR },
  ].filter((x) => x.orders > 0);
  const maxPipe = Math.max(1, ...PIPELINE.map((p) => data.byStatus[p.key] ?? 0));
  const closed = (data.byStatus.CANCELLED ?? 0) + (data.byStatus.REJECTED ?? 0);
  const repeatPct = t.customers ? Math.round((t.repeatCustomers / t.customers) * 100) : 0;

  return (
    <div className="space-y-4">
      {has('pipeline') && (
        <Card className="rounded-2xl" title={<Title icon={Truck}>Order ka safar</Title>} description="Is period ke orders abhi kis marhale par hain (test order shamil nahi)">
          <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
            {PIPELINE.map((p, i) => {
              const n = data.byStatus[p.key] ?? 0;
              const Tag: ElementType = onTab ? 'button' : 'div';
              return (
                <Tag key={p.key} type={onTab ? 'button' : undefined} onClick={onTab ? () => onTab(p.tab) : undefined}
                  className={cn('rounded-2xl bg-slate-50 p-3 text-left ring-1 ring-slate-100', onTab && 'transition hover:ring-brand-300')}>
                  <div className="flex items-center gap-1.5 text-[0.6875rem] font-semibold text-slate-500">
                    <span className="flex h-5 w-5 items-center justify-center rounded-md bg-slate-900 text-[0.625rem] text-white">{i + 1}</span>
                    <p.icon className="h-3.5 w-3.5" />{p.label}
                  </div>
                  <div className="mt-1 text-xl font-bold tabular-nums text-slate-900">{n}</div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full rounded-full bg-brand-500" style={{ width: `${(n / maxPipe) * 100}%` }} />
                  </div>
                </Tag>
              );
            })}
          </div>
          <div className="mt-3 grid gap-2 text-[0.8125rem] sm:grid-cols-3">
            <Fact tone="success">Kamyab delivery: <b>{t.deliveryRate}%</b> bheje hue parcels me se</Fact>
            <Fact tone="rose">Cancel / reject: <b>{closed}</b> order ({t.cancelRate}%)</Fact>
            <Fact tone="fuchsia">Wapas (RTO): <b>{t.returned}</b> parcel ({t.rtoRate}%)</Fact>
          </div>
        </Card>
      )}

      {has('trend') && (
        <Card className="rounded-2xl" title={<Title icon={TrendingUp}>Roz ke orders aur sale</Title>} description="Sale me cancel aur wapas orders shamil nahi; khali din bhi dikhte hain">
          {!t.orders ? <Empty text="Is period me koi online order nahi" /> : (
            <div className="h-[17.5rem]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={days} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="online-trend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={theme.primary} stopOpacity={0.3} /><stop offset="100%" stopColor={theme.primary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={theme.grid} vertical={false} />
                  <XAxis dataKey="name" tick={theme.axis} axisLine={false} tickLine={false} minTickGap={12} />
                  <YAxis yAxisId="v" tick={theme.axis} axisLine={false} tickLine={false} tickFormatter={axisMoney} width={44} />
                  <YAxis yAxisId="o" orientation="right" tick={theme.axis} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
                  <Tooltip formatter={(v, n) => (n === 'value' ? [formatPKR(Number(v)), 'Sale'] : [String(v), n === 'orders' ? 'Orders' : 'Wapas'])} {...tip} />
                  <Legend formatter={(v) => (v === 'orders' ? 'Orders' : v === 'value' ? 'Sale' : 'Wapas')} wrapperStyle={{ fontSize: 12 }} />
                  <Bar yAxisId="o" dataKey="orders" fill={theme.primarySoft} radius={[4, 4, 0, 0]} maxBarSize={14} />
                  <Bar yAxisId="o" dataKey="returned" fill={RTO_COLOR} radius={[4, 4, 0, 0]} maxBarSize={8} />
                  <Area yAxisId="v" type="monotone" dataKey="value" stroke={theme.primary} strokeWidth={2.25} fill="url(#online-trend)" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      )}

      {(has('payment') || has('channels')) && (
        <div className="grid gap-4 lg:grid-cols-2">
          {has('channels') && (
            <Card className="rounded-2xl" title={<Title icon={Globe}>Channel</Title>} description="Website, Shopify, Daraz, Foodpanda… kahan se kitna">
              {!data.byChannel.length ? <Empty text="Koi order nahi" /> : (
                <>
                  <div className="h-[12.5rem]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.byChannel} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid stroke={theme.grid} horizontal={false} />
                        <XAxis type="number" tick={theme.axis} axisLine={false} tickLine={false} tickFormatter={axisMoney} />
                        <YAxis type="category" dataKey="name" tick={theme.axis} axisLine={false} tickLine={false} width={110} />
                        <Tooltip formatter={(v) => [formatPKR(Number(v)), 'Sale']} {...tip} />
                        <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={16}>
                          {data.byChannel.map((c, i) => <Cell key={c.name} fill={channelMeta(c.type).color ?? PALETTE[i % PALETTE.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <RateTable head={['Channel', 'Orders', 'Sale', 'Deliver', 'RTO']}
                    rows={data.byChannel.map((c) => ({ key: c.name, cells: [`${channelMeta(c.type).emoji} ${c.name}`, String(c.orders), money(c.value), `${c.deliveryRate}%`], rto: c.rtoRate, n: c.dispatched }))} />
                </>
              )}
            </Card>
          )}
          {has('payment') && (
            <Card className="rounded-2xl" title={<Title icon={Banknote}>COD ya pehle se paid</Title>} description="COD ka paisa courier ke paas phansta hai">
              {!pieData.length ? <Empty text="Koi order nahi" /> : (
                <>
                  <div className="h-[11.25rem]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={76} paddingAngle={3} stroke="none">
                          {pieData.map((p) => <Cell key={p.name} fill={p.color} />)}
                        </Pie>
                        <Tooltip formatter={(v, n) => [formatPKR(Number(v)), String(n)]} {...tip} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <ul className="mt-2 space-y-1 text-[0.8125rem]">
                    {pieData.map((p) => (
                      <li key={p.name} className="flex items-center justify-between">
                        <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />{p.name} · {p.orders} order</span>
                        <span className="tabular-nums text-slate-900">{money(p.value)}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Fact tone="success">COD wasool <b className="block text-[0.9375rem] tabular-nums">{money(data.payment.cod.collected)}</b></Fact>
                    <Link to="/online-orders/cod" className="block rounded-xl bg-orange-50 px-3 py-2 text-[0.8125rem] text-orange-800 ring-1 ring-orange-100 hover:ring-orange-300">
                      COD abhi baqi → <b className="block text-[0.9375rem] tabular-nums">{money(data.payment.cod.pending)}</b>
                    </Link>
                  </div>
                </>
              )}
            </Card>
          )}
        </div>
      )}

      {(has('cities') || has('couriers')) && (
        <div className="grid gap-4 lg:grid-cols-2">
          {has('cities') && (
            <Card className="rounded-2xl" title={<Title icon={MapPin}>Shehar</Title>} description="Kahan se order aate hain aur kahan RTO zyada hai">
              {data.riskyCities.length > 0 && (
                <p className="mb-3 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[0.8125rem] text-amber-900 ring-1 ring-amber-100">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>RTO zyada: {data.riskyCities.map((c) => `${c.city} ${c.rtoRate}%`).join(' · ')}. Yahan ke COD order call karke confirm karein ya advance lein.</span>
                </p>
              )}
              {!data.byCity.length ? <Empty text="Koi order nahi" /> : (
                <>
                  <div className="h-[15rem]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.byCity.slice(0, 8)} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid stroke={theme.grid} horizontal={false} />
                        <XAxis type="number" tick={theme.axis} axisLine={false} tickLine={false} allowDecimals={false} />
                        <YAxis type="category" dataKey="city" tick={theme.axis} axisLine={false} tickLine={false} width={100} />
                        <Tooltip formatter={(v, n) => [String(v), n === 'orders' ? 'Orders' : 'Wapas']} {...tip} />
                        <Bar dataKey="orders" stackId="c" fill={theme.primary} barSize={14} />
                        <Bar dataKey="returned" stackId="c" fill={RTO_COLOR} radius={[0, 6, 6, 0]} barSize={14} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <RateTable head={['Shehar', 'Orders', 'Sale', 'Deliver', 'RTO']}
                    rows={data.byCity.map((c) => ({ key: c.city, cells: [c.city, String(c.orders), money(c.value), `${c.deliveryRate}%`], rto: c.rtoRate, n: c.dispatched }))} />
                </>
              )}
            </Card>
          )}
          {has('couriers') && (
            <Card className="rounded-2xl" title={<Title icon={Truck}>Courier aur RTO</Title>} description="Kaun sa courier zyada deliver karta hai, kis ke parcel wapas aate hain">
              {!data.byCourier.length ? <Empty text="Is period me koi parcel nahi bheja" /> : (
                <>
                  <div className="h-[13.75rem]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.byCourier} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                        <CartesianGrid stroke={theme.grid} vertical={false} />
                        <XAxis dataKey="name" tick={theme.axis} axisLine={false} tickLine={false} interval={0} />
                        <YAxis tick={theme.axis} axisLine={false} tickLine={false} unit="%" domain={[0, 100]} width={44} />
                        <Tooltip formatter={(v, n) => [`${v}%`, n === 'deliveryRate' ? 'Deliver' : 'RTO']} {...tip} />
                        <Legend formatter={(v) => (v === 'deliveryRate' ? 'Deliver %' : 'RTO %')} wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey="deliveryRate" fill={PAID_COLOR} radius={[6, 6, 0, 0]} maxBarSize={26} />
                        <Bar dataKey="rtoRate" fill={RTO_COLOR} radius={[6, 6, 0, 0]} maxBarSize={26} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <RateTable head={['Courier', 'Bheje', 'Deliver', 'Wapas', 'RTO']}
                    rows={data.byCourier.map((c) => ({ key: c.code, cells: [c.name, String(c.dispatched), String(c.delivered), String(c.returned)], rto: c.rtoRate, n: c.dispatched }))} />
                </>
              )}
            </Card>
          )}
        </div>
      )}

      {has('time') && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="rounded-2xl" title={<Title icon={Clock}>Kis waqt order aate hain</Title>}
            description={peak?.orders ? `Sab se zyada ${hourLabel(peak.hour)} (${peak.orders} order) — us waqt koi phone ke paas rahe` : 'Staff isi hisaab se rakhein'}>
            <div className="h-[13.75rem]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.byHour.map((h) => ({ ...h, label: hourLabel(h.hour) }))} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke={theme.grid} vertical={false} />
                  <XAxis dataKey="label" tick={theme.axis} axisLine={false} tickLine={false} interval={2} />
                  <YAxis tick={theme.axis} axisLine={false} tickLine={false} allowDecimals={false} width={36} />
                  <Tooltip formatter={(v) => [String(v), 'Orders']} {...tip} />
                  <Bar dataKey="orders" radius={[4, 4, 0, 0]}>
                    {data.byHour.map((h) => <Cell key={h.hour} fill={h.hour === peak?.hour ? theme.highlight : theme.primary} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card className="rounded-2xl" title={<Title icon={CalendarDays}>Hafte ka kaun sa din</Title>}
            description={bestDay?.value ? `${WEEKDAYS[bestDay.day]} sab se acha — ads aur offers usi din` : 'Ads aur offers kis din chalayein'}>
            <div className="h-[13.75rem]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.byWeekday.map((w) => ({ ...w, name: WEEKDAYS[w.day] }))} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                  <CartesianGrid stroke={theme.grid} vertical={false} />
                  <XAxis dataKey="name" tick={theme.axis} axisLine={false} tickLine={false} interval={0} tickFormatter={(v: string) => v.slice(0, 3)} />
                  <YAxis tick={theme.axis} axisLine={false} tickLine={false} tickFormatter={axisMoney} width={44} />
                  <Tooltip formatter={(v) => [formatPKR(Number(v)), 'Sale']} {...tip} />
                  <Bar dataKey="value" fill={theme.primary} radius={[6, 6, 0, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}

      {(has('products') || has('customers')) && (
        <div className="grid gap-4 lg:grid-cols-2">
          {has('products') && (
            <Card className="rounded-2xl" title={<Title icon={Package}>Sab se zyada kya bika</Title>} description="Cancel aur wapas orders ke bagair">
              {!data.topProducts.length ? <Empty text="Koi cheez nahi biki" /> : (
                <RankList rows={data.topProducts.map((p) => ({ key: p.name, title: p.name, meta: `${Number(p.qty.toFixed(2))} bike`, right: money(p.value), bar: p.value || p.qty }))} />
              )}
            </Card>
          )}
          {has('customers') && (
            <Card className="rounded-2xl" title={<Title icon={Users}>Sab se qeemti customer</Title>}
              description={t.customers ? `${t.customers} customer · ${t.repeatCustomers} ne dobara order kiya (${repeatPct}%)` : 'Online khareedne wale'}>
              {!data.topCustomers.length ? <Empty text="Koi customer nahi" /> : (
                <>
                  <p className="mb-3 flex items-start gap-2 rounded-xl bg-teal-50 px-3 py-2 text-[0.8125rem] text-teal-900 ring-1 ring-teal-100">
                    <Repeat className="mt-0.5 h-4 w-4 shrink-0" />
                    {repeatPct < 20 ? 'Dobara aane wale kam hain — parcel me shukriya card ya agle order par discount rakhein.' : 'Achha hai — inhein WhatsApp par naye maal ki khabar dein.'}
                  </p>
                  <RankList rows={data.topCustomers.map((c) => ({
                    key: c.phone, title: c.name, meta: [`${c.orders} order`, c.city].filter(Boolean).join(' · '), right: money(c.value), bar: c.value,
                    to: `/online-orders?search=${encodeURIComponent(c.phone)}`,
                  }))} />
                  <Link to="/online-orders/customers" className="mt-3 inline-block text-[0.8125rem] font-semibold text-brand-700 hover:underline">Sab customers aur WhatsApp →</Link>
                </>
              )}
            </Card>
          )}
        </div>
      )}

      {has('codAging') && (
        <Card className="rounded-2xl" title={<Title icon={Wallet}>COD kitne din se courier ke paas</Title>}
          description="Deliver ho chuka, paisa abhi jama nahi hua (poore account ka, date ka nahi)"
          actions={<Link to="/online-orders/cod" className="text-[0.8125rem] font-semibold text-brand-700 hover:underline">COD safha →</Link>}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {data.codAging.map((a, i) => (
              <div key={a.label} className={cn('rounded-xl p-3 ring-1', i === 3 && a.count ? 'bg-rose-50 ring-rose-100' : 'bg-slate-50 ring-slate-100')}>
                <div className="text-[0.75rem] text-slate-500">{a.label}</div>
                <div className="text-lg font-bold tabular-nums text-slate-900">{money(a.value)}</div>
                <div className="text-[0.75rem] text-slate-500">{a.count} parcel</div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function Title({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return <span className="inline-flex items-center gap-2"><Icon className="h-4 w-4 text-brand-600" />{children}</span>;
}

function Empty({ text }: { text: string }) {
  return <div className="flex h-40 items-center justify-center text-[0.8125rem] text-slate-400">{text}</div>;
}

function Fact({ tone, children }: { tone: 'success' | 'rose' | 'fuchsia'; children: ReactNode }) {
  const cls = { success: 'bg-success-50 text-success-800 ring-success-100', rose: 'bg-rose-50 text-rose-800 ring-rose-100', fuchsia: 'bg-fuchsia-50 text-fuchsia-800 ring-fuchsia-100' }[tone];
  return <div className={cn('rounded-xl px-3 py-2 ring-1', cls)}>{children}</div>;
}

function RankList({ rows }: { rows: Array<{ key: string; title: string; meta: string; right: string; bar: number; to?: string }> }) {
  const max = Math.max(1, ...rows.map((r) => r.bar));
  return (
    <ul className="space-y-2.5">
      {rows.map((r, i) => {
        const body = (
          <>
            <div className="flex items-center justify-between gap-2 text-[0.8125rem]">
              <span className="flex min-w-0 items-center gap-2">
                <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[0.6875rem] font-bold', i === 0 ? 'bg-amber-400 text-white' : 'bg-slate-100 text-slate-600')}>{i + 1}</span>
                <span className="truncate font-medium text-slate-800">{r.title}</span>
              </span>
              <span className="shrink-0 tabular-nums text-slate-900">{r.right}</span>
            </div>
            <div className="ml-8 mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full" style={{ width: `${(r.bar / max) * 100}%`, background: PALETTE[i % PALETTE.length] }} />
            </div>
            <p className="ml-8 mt-0.5 text-[0.6875rem] text-slate-500">{r.meta}</p>
          </>
        );
        return <li key={r.key}>{r.to ? <Link to={r.to} className="block hover:opacity-80">{body}</Link> : body}</li>;
      })}
    </ul>
  );
}

function RateTable({ head, rows }: { head: string[]; rows: Array<{ key: string; cells: string[]; rto: number; n: number }> }) {
  return (
    <div className="mt-3 overflow-x-auto">
      <Table minWidth="26rem" className="[&_table]:text-[0.8125rem]">
        <THead className="text-left text-[0.6875rem] uppercase tracking-wide text-slate-500">
          <Tr>{head.map((h, i) => <Th key={h} className={cn('py-1.5', i > 0 && 'text-right')}>{h}</Th>)}</Tr>
        </THead>
        <TBody className="divide-y divide-slate-100">
          {rows.map((r) => (
            <Tr key={r.key}>
              {r.cells.map((c, i) => <Td key={i} className={cn('py-1.5', i === 0 ? 'max-w-[12rem] truncate font-medium text-slate-900' : 'text-right tabular-nums text-slate-700')}>{c}</Td>)}
              <Td className="py-1.5 text-right">{r.n ? <span className={cn('rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold', rateTone(r.rto))}>{r.rto}%</span> : <span className="text-slate-400">—</span>}</Td>
            </Tr>
          ))}
        </TBody>
      </Table>
    </div>
  );
}
