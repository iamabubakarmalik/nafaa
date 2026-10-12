/**
 * Supplier analytics: 12 months of buying against paying, what we owe by
 * age, who we owe most, biggest suppliers, suppliers gone quiet and the
 * city split. Uses the supplier summary.
 */

import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, CalendarClock, Clock, MapPin, TrendingUp, Truck } from 'lucide-react';
import { Card, Skeleton } from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import { axisMoney } from '@modules/dashboard/engine/parts';
import { useChartTheme } from '@modules/dashboard/engine/useChartTheme';
import { suppliersApi } from '../api/suppliers.api';

export function SupplierAnalytics() {
  const theme = useChartTheme();
  const tip = theme.tooltip;
  const q = useQuery({ queryKey: ['suppliers', 'summary'], queryFn: suppliersApi.summary, staleTime: 60_000 });
  const s = q.data as any;
  if (q.isLoading || !s) return <div className="grid gap-3 sm:grid-cols-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-60 rounded-2xl" />)}</div>;

  const months = (s.months12 ?? []) as Array<{ label: string; total: number; paid: number; count: number }>;
  const aging = (s.dueAging ?? []) as Array<{ bucket: string; amount: number; count: number }>;
  const debtors = (s.topDebtors ?? []) as Array<{ id: string; name: string; outstandingDue: number; daysSincePayment: number | null; city?: string | null }>;
  const top = (s.topSuppliers ?? []) as Array<{ supplierId: string; supplier?: { name: string }; totalSpent: number; outstanding: number; orderCount: number }>;
  const dormant = (s.dormantSuppliers ?? []) as Array<{ id: string; name: string; daysSincePurchase: number | null; outstandingDue: number }>;
  const cities = (s.cityBreakdown ?? []) as Array<{ city: string; count: number; totalPurchased: number; outstanding: number }>;
  const topMax = Math.max(1, ...top.map((t) => t.totalSpent));

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Kul dena hai" value={formatPKR(s.totalOutstanding)} sub={`${s.suppliersWithDebt} supplier`} tone="text-rose-600" />
        <Stat label="Is mahine kharidari" value={formatPKR(s.monthPurchases)} sub={`${s.growthVsLastMonth >= 0 ? '▲' : '▼'} ${Math.abs(s.growthVsLastMonth).toFixed(0)}% pichle mahine se`} />
        <Stat label="Is mahine diye" value={formatPKR((s.monthLedgerPaid ?? 0) + (s.monthPaid ?? 0))} />
        <Stat label="Ausat bill" value={formatPKR(s.avgOrderValue)} sub={`${s.activeSuppliers} chalu supplier`} />
      </div>

      <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><TrendingUp className="h-4 w-4 text-brand-600" />12 mahine — kharidari aur adaigi</span>}>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={months} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
              <CartesianGrid stroke={theme.grid} vertical={false} />
              <XAxis dataKey="label" tick={theme.axis} axisLine={false} tickLine={false} />
              <YAxis tick={theme.axis} axisLine={false} tickLine={false} tickFormatter={axisMoney} width={44} />
              <Tooltip formatter={(v, n) => [formatPKR(Number(v)), n]} {...tip} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="total" name="Kharidari" fill={theme.primary} radius={[6, 6, 0, 0]} />
              <Bar dataKey="paid" name="Diye" fill={theme.profit} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><Clock className="h-4 w-4 text-amber-600" />Baqi kitna purana</span>} description="Aakhri adaigi ke hisaab se">
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={aging} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                <CartesianGrid stroke={theme.grid} vertical={false} />
                <XAxis dataKey="bucket" tick={theme.axis} axisLine={false} tickLine={false} />
                <YAxis tick={theme.axis} axisLine={false} tickLine={false} tickFormatter={axisMoney} width={44} />
                <Tooltip formatter={(v) => [formatPKR(Number(v)), 'Baqi']} {...tip} />
                <Bar dataKey="amount" fill={theme.highlight} radius={[6, 6, 0, 0]} barSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-rose-600" />Sab se zyada dena</span>}>
          {!debtors.length ? <Empty text="Kisi ka kuch baqi nahi" /> : (
            <ul className="divide-y divide-slate-100">
              {debtors.slice(0, 8).map((d) => (
                <li key={d.id}>
                  <Link to={`/suppliers/${d.id}`} className="flex items-center justify-between gap-2 py-2 text-[0.8125rem] hover:opacity-80">
                    <span className="min-w-0"><span className="block truncate font-medium text-slate-800">{d.name}</span>
                      <span className="text-[0.75rem] text-slate-500">{d.daysSincePayment == null ? 'Kabhi adaigi nahi' : `Aakhri adaigi ${d.daysSincePayment} din pehle`}</span></span>
                    <span className="shrink-0 font-semibold tabular-nums text-rose-600">{formatPKR(d.outstandingDue)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="rounded-2xl lg:col-span-2" title={<span className="inline-flex items-center gap-2"><Truck className="h-4 w-4 text-brand-600" />Bare suppliers</span>} description="Ab tak ki kul kharidari">
          {!top.length ? <Empty text="Abhi koi kharidari nahi" /> : (
            <ul className="space-y-2.5">
              {top.map((t) => (
                <li key={t.supplierId}>
                  <Link to={`/suppliers/${t.supplierId}`} className="block hover:opacity-80">
                    <div className="flex justify-between gap-2 text-[0.8125rem]"><span className="truncate font-medium text-slate-800">{t.supplier?.name ?? '—'}</span><span className="tabular-nums text-slate-900">{formatPKR(t.totalSpent)}</span></div>
                    <div className="mt-1 h-2 rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand-500" style={{ width: `${(t.totalSpent / topMax) * 100}%` }} /></div>
                    <p className="mt-0.5 text-[0.6875rem] text-slate-500">{t.orderCount} bill{t.outstanding > 0 ? ` · baqi ${formatPKR(t.outstanding)}` : ''}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><CalendarClock className="h-4 w-4 text-slate-600" />Khamosh suppliers</span>} description="Kaafi din se maal nahi liya">
          {!dormant.length ? <Empty text="Sab se maal aa raha hai" /> : (
            <ul className="divide-y divide-slate-100">
              {dormant.slice(0, 6).map((d) => (
                <li key={d.id}><Link to={`/suppliers/${d.id}`} className="flex justify-between gap-2 py-2 text-[0.8125rem] hover:opacity-80">
                  <span className="truncate text-slate-800">{d.name}</span><span className="shrink-0 text-slate-500">{d.daysSincePurchase == null ? 'Kabhi nahi' : `${d.daysSincePurchase} din`}</span>
                </Link></li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {cities.length > 0 && (
        <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4 text-brand-600" />Shehar</span>}>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {cities.map((c) => (
              <div key={c.city} className="rounded-xl bg-slate-50 p-3">
                <p className="font-medium text-slate-900">{c.city}</p>
                <p className="text-[0.75rem] text-slate-500">{c.count} supplier · {formatPKR(c.totalPurchased)}</p>
                {c.outstanding > 0 && <p className="text-[0.75rem] text-rose-600">Baqi {formatPKR(c.outstanding)}</p>}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[0.8125rem] text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${tone ?? 'text-slate-900'}`}>{value}</p>
      {sub && <p className="mt-0.5 text-[0.75rem] text-slate-500">{sub}</p>}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="py-10 text-center text-[0.875rem] text-slate-500">{text}</p>;
}
