/**
 * Bookings made in the chosen period: how many turned into sales, money
 * taken and given back, the daily trend by business day, the pickup load of
 * the next two weeks, and the split by status, staff, product and payment.
 */

import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  BookmarkCheck, CalendarClock, CreditCard, Package, Percent, RotateCcw, ShoppingBag, Timer, TrendingUp, Users, Wallet, type LucideIcon,
} from 'lucide-react';
import { Card, Skeleton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { axisMoney } from '@modules/dashboard/engine/parts';
import { PAYMENT_COLORS, PAYMENT_LABELS, useChartTheme } from '@modules/dashboard/engine/useChartTheme';
import { bookingsApi, type BookingBucket, type BookingQuery, type BookingStatus } from '../api/bookings.api';
import { BOOKINGS_KEY, STATUS, qtyText } from './meta';

const dayLabel = (k: string) => new Date(`${k}T12:00:00`).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });
const weekday = (k: string) => new Date(`${k}T12:00:00`).toLocaleDateString('en-PK', { weekday: 'short', day: 'numeric' });

export function BookingsAnalytics({ filters, money }: { filters: Omit<BookingQuery, 'page' | 'limit' | 'status' | 'sort'>; money: (n: number) => string }) {
  const theme = useChartTheme();
  const q = useQuery({ queryKey: [BOOKINGS_KEY, 'analytics', filters], queryFn: () => bookingsApi.analytics(filters), placeholderData: (p) => p });
  const d = q.data;

  if (q.isLoading || !d) {
    return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>;
  }
  const t = d.totals;
  const trend = d.trend.map((x) => ({ ...x, open: x.count - x.converted - x.cancelled, label: dayLabel(x.key) }));
  const load = d.pickupLoad.map((x) => ({ ...x, label: weekday(x.key) }));
  const statuses = d.byStatus.map((b) => ({ ...b, label: STATUS[b.key as BookingStatus]?.label ?? b.key, color: STATUS[b.key as BookingStatus]?.color }));
  const methods = d.byMethod.map((b) => ({ ...b, label: PAYMENT_LABELS[b.key] ?? b.key, color: PAYMENT_COLORS[b.key] }));

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={BookmarkCheck} label="Bookings" value={String(t.count)} sub={`${money(t.value)} ki · ${t.open} abhi khuli`} />
        <Kpi icon={ShoppingBag} label="Bikri bani" value={t.conversionRate == null ? '—' : `${t.conversionRate}%`}
          sub={`${t.converted} bik gayi · ${t.cancelled} cancel`} tone="emerald" />
        <Kpi icon={Wallet} label="Paise mile" value={money(t.received)} sub="Advance aur baad ki payments" tone="emerald" />
        <Kpi icon={RotateCcw} label="Wapas diye" value={money(t.refunded)} sub="Cancel par wapsi" tone="rose" />
        <Kpi icon={Percent} label="Ausat advance" value={t.avgAdvancePct == null ? '—' : `${t.avgAdvancePct}%`} sub="Booking ke waqt kul ka kitna" tone="amber" />
        <Kpi icon={Timer} label="Bikri tak ausat" value={t.avgDaysToSale == null ? '—' : `${t.avgDaysToSale} din`} sub="Booking se pickup tak" />
        <Kpi icon={TrendingUp} label="Bikri ki raqam" value={money(t.convertedValue)} sub="Jo bookings bik gayi" tone="emerald" />
        <Kpi icon={CalendarClock} label="Agle 14 din" value={String(load.reduce((s, x) => s + x.count, 0))}
          sub={`pickup · ${money(load.reduce((s, x) => s + x.balance, 0))} baqi`} tone="amber" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><TrendingUp className="h-4 w-4 text-brand-600" />Roz ki bookings</span>} description="Har karobari din kitni bookings aayi, aur un ka anjaam">
          {!trend.length ? <Empty text="Is muddat me koi booking nahi" /> : (
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trend} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                  <CartesianGrid stroke={theme.grid} vertical={false} />
                  <XAxis dataKey="label" tick={theme.axis} axisLine={false} tickLine={false} minTickGap={12} />
                  <YAxis tick={theme.axis} axisLine={false} tickLine={false} allowDecimals={false} width={32} />
                  <Tooltip {...theme.tooltip} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="converted" name="Bik gayi" stackId="a" fill="#7c3aed" />
                  <Bar dataKey="cancelled" name="Cancel" stackId="a" fill="#e11d48" />
                  <Bar dataKey="open" name="Khuli" stackId="a" fill="#0284c7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><CalendarClock className="h-4 w-4 text-brand-600" />Aane wale pickup</span>} description="Agle 14 din kis din kitne customer aayenge aur kitna baqi wasool hona hai">
          {!load.some((x) => x.count) ? <Empty text="Agle 14 din koi pickup nahi" /> : (
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={load} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                  <CartesianGrid stroke={theme.grid} vertical={false} />
                  <XAxis dataKey="label" tick={theme.axis} axisLine={false} tickLine={false} minTickGap={8} />
                  <YAxis yAxisId="n" tick={theme.axis} axisLine={false} tickLine={false} allowDecimals={false} width={28} />
                  <YAxis yAxisId="m" orientation="right" tick={theme.axis} axisLine={false} tickLine={false} tickFormatter={axisMoney} width={44} />
                  <Tooltip formatter={(v, n) => [n === 'Baqi raqam' ? money(Number(v)) : v, n]} {...theme.tooltip} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar yAxisId="n" dataKey="count" name="Pickup" fill="#d97706" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="m" dataKey="balance" name="Baqi raqam" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Ranked icon={BookmarkCheck} title="Haal" description="Is muddat ki bookings ab kis haal me hain" rows={statuses} money={money}
          dot={(r) => (r as typeof statuses[number]).color} sub={(r) => `${r.count} booking`} />
        <Ranked icon={Package} title="Sab se zyada book hone wala maal" description="Kis cheez ki advance booking zyada hoti hai" rows={d.byProduct} money={money}
          sub={(r) => `${qtyText(r.qty)} ${(r as typeof d.byProduct[number]).unit} · ${r.count} booking`} />
        <Ranked icon={Users} title="Staff" description="Kis ne kitni bookings li" rows={d.byStaff} money={money} sub={(r) => `${r.count} booking`} />
        <Ranked icon={CreditCard} title="Payment ka tareeqa" description="Advance aur baad ki payments kaise aayi" rows={methods} money={money}
          dot={(r) => (r as typeof methods[number]).color ?? '#64748b'} sub={(r) => `${r.count} payment`} />
      </div>
    </div>
  );
}

function Ranked({ icon: I, title, description, rows, money, sub, dot }: {
  icon: LucideIcon; title: string; description: string; rows: BookingBucket[]; money: (n: number) => string;
  sub: (r: BookingBucket) => string; dot?: (r: BookingBucket) => string | undefined;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><I className="h-4 w-4 text-brand-600" />{title}</span>} description={description}>
      {!rows.length ? <Empty text="Koi data nahi" /> : (
        <ul className="space-y-2.5">
          {rows.map((r) => (
            <li key={r.key}>
              <div className="flex justify-between gap-2 text-[0.8125rem]">
                <span className="flex min-w-0 items-center gap-2">
                  {dot && <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: dot(r) }} />}
                  <span className="truncate font-medium text-slate-800">{r.label}</span>
                </span>
                <span className="shrink-0 tabular-nums text-slate-900">{money(r.value)}</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-brand-500" style={{ width: `${(r.value / max) * 100}%`, background: dot?.(r) }} />
              </div>
              <p className="mt-0.5 text-[0.6875rem] text-slate-500">{sub(r)}</p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function Kpi({ icon: I, label, value, sub, tone = 'brand' }: { icon: LucideIcon; label: string; value: string; sub?: string; tone?: 'brand' | 'rose' | 'emerald' | 'amber' }) {
  const toneCls = { rose: 'bg-rose-50 text-rose-700', emerald: 'bg-emerald-50 text-emerald-700', amber: 'bg-amber-50 text-amber-700', brand: 'bg-brand-50 text-brand-700' }[tone];
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
