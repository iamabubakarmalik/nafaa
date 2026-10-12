/**
 * Why and how goods come back in the chosen period: return rate against
 * sales, the daily trend by business day, and the split by reason, refund
 * method, staff and product (with each product's own return rate).
 */

import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BookOpen, MessageSquareText, Package, Percent, RotateCcw, TrendingUp, Users, Wallet, type LucideIcon } from 'lucide-react';
import { Card, Skeleton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { axisMoney } from '@modules/dashboard/engine/parts';
import { useChartTheme } from '@modules/dashboard/engine/useChartTheme';
import { returnsApi, type ReturnBucket, type ReturnQuery } from '../api/returns.api';
import { RETURNS_KEY, methodColor, methodLabel, qtyText } from './meta';

const dayLabel = (k: string) => new Date(`${k}T12:00:00`).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });

export function ReturnsAnalytics({ filters, money }: { filters: Omit<ReturnQuery, 'page' | 'limit'>; money: (n: number) => string }) {
  const theme = useChartTheme();
  const q = useQuery({ queryKey: [RETURNS_KEY, 'analytics', filters], queryFn: () => returnsApi.analytics(filters), placeholderData: (p) => p });
  const d = q.data;

  if (q.isLoading || !d) {
    return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>;
  }
  const t = d.totals;
  const trend = d.trend.map((x) => ({ ...x, label: dayLabel(x.key) }));
  const methods = d.byMethod.map((m) => ({ ...m, label: methodLabel(m.key), color: methodColor(m.key) }));

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={RotateCcw} label="Kul wapas" value={money(t.refunded)} sub={`${t.count} wapsi · ${t.bills} bill`} tone="rose" />
        <Kpi icon={Percent} label="Wapsi ki sharah" value={`${t.rate}%`} sub={`Bikri ${money(t.salesTotal)} me se · ${t.billRate}% bill`} tone="amber" />
        <Kpi icon={Package} label="Stock me wapas" value={qtyText(t.restockedQty)} sub={t.writtenOffQty ? `${qtyText(t.writtenOffQty)} kharab — stock me nahi` : 'Sab dobara bikne layak'} tone="emerald" />
        <Kpi icon={BookOpen} label="Khate se kam" value={money(t.khata)} sub={`Haath me diye ${money(t.payout)}`} />
      </div>

      <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><TrendingUp className="h-4 w-4 text-brand-600" />Roz ki wapsi</span>} description="Har karobari din kitna paisa wapas gaya">
        {!trend.some((x) => x.count) ? <Empty text="Is muddat me koi wapsi nahi" /> : (
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                <CartesianGrid stroke={theme.grid} vertical={false} />
                <XAxis dataKey="label" tick={theme.axis} axisLine={false} tickLine={false} minTickGap={12} />
                <YAxis tick={theme.axis} axisLine={false} tickLine={false} tickFormatter={axisMoney} width={44} />
                <Tooltip formatter={(v) => [formatPKR(Number(v)), 'Wapas']} labelFormatter={(l, p) => `${l} · ${p?.[0]?.payload?.count ?? 0} wapsi`} {...theme.tooltip} />
                <Bar dataKey="refunded" name="Wapas" fill="#ea580c" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Ranked icon={MessageSquareText} title="Wajah" description="Maal kyun wapas aa raha hai" rows={d.byReason} money={money} sub={(r) => `${r.count} wapsi · ${qtyText(r.qty)} cheezein`} />
        <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><Wallet className="h-4 w-4 text-brand-600" />Paisa kaise wapas gaya</span>} description="Cash, wallet, bank ya card">
          {!methods.length ? <Empty text="Koi wapsi nahi" /> : (
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={methods} layout="vertical" margin={{ top: 0, right: 8, left: 8, bottom: 0 }}>
                  <CartesianGrid stroke={theme.grid} horizontal={false} />
                  <XAxis type="number" tick={theme.axis} axisLine={false} tickLine={false} tickFormatter={axisMoney} />
                  <YAxis type="category" dataKey="label" tick={theme.axis} axisLine={false} tickLine={false} width={84} />
                  <Tooltip formatter={(v) => [formatPKR(Number(v)), 'Wapas']} {...theme.tooltip} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {methods.map((m) => <Cell key={m.key} fill={m.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
        <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><Package className="h-4 w-4 text-brand-600" />Sab se zyada wapas aane wala maal</span>} description="Sharah = is muddat me jitna bika us me se kitna wapas aaya">
          {!d.byProduct.length ? <Empty text="Koi wapsi nahi" /> : (
            <ul className="divide-y divide-slate-100">
              {d.byProduct.map((p) => (
                <li key={p.key} className="flex items-center gap-3 py-2 text-[0.8125rem]">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-slate-900">{p.label}</span>
                    <span className="block text-[0.6875rem] text-slate-500">{qtyText(p.qty)} {p.unit} wapas · {qtyText(p.soldQty)} bika · {p.count} dafa</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block font-semibold tabular-nums text-slate-900">{money(p.value)}</span>
                    {p.rate != null && (
                      <span className={cn('inline-block rounded-full px-1.5 text-[0.6875rem] font-semibold tabular-nums', p.rate >= 10 ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-600')}>{p.rate}%</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Ranked icon={Users} title="Staff" description="Kis ne kitni wapsi ki" rows={d.byStaff} money={money} sub={(r) => `${r.count} wapsi`} />
      </div>
    </div>
  );
}

function Ranked({ icon: I, title, description, rows, money, sub }: {
  icon: LucideIcon; title: string; description: string; rows: ReturnBucket[]; money: (n: number) => string; sub: (r: ReturnBucket) => string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><I className="h-4 w-4 text-brand-600" />{title}</span>} description={description}>
      {!rows.length ? <Empty text="Koi wapsi nahi" /> : (
        <ul className="space-y-2.5">
          {rows.map((r) => (
            <li key={r.key}>
              <div className="flex justify-between gap-2 text-[0.8125rem]">
                <span className="truncate font-medium text-slate-800">{r.label}</span>
                <span className="shrink-0 tabular-nums text-slate-900">{money(r.value)}</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-orange-500" style={{ width: `${(r.value / max) * 100}%` }} />
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
      {sub && <p className="mt-0.5 truncate text-[0.75rem] text-slate-500">{sub}</p>}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="py-10 text-center text-[0.875rem] text-slate-500">{text}</p>;
}
