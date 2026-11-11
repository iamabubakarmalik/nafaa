/**
 * Revenue analytics: recurring revenue (MRR and ARR), plan payments per
 * month, cancelled plans per month, revenue by plan and the shops that paid
 * the most. Months follow Pakistan time.
 */

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BarChart3, Crown, CreditCard, Layers, Lightbulb, Repeat, TrendingDown, Wallet } from 'lucide-react';
import { Card, EmptyState, PageHero, PageShell, Segmented, Skeleton, heroButton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { useAppearanceStore } from '@/design-system';
import { adminAnalyticsApi } from '@/api/admin-analytics.api';
import { formatPKR, formatPKRFull } from '@/lib/format';
import { cn } from '@/lib/cn';
import { useListParams } from '@/ui';
import { num } from '@/lib/format';

const RANGES = [{ value: '6', label: '6 months' }, { value: '12', label: '12 months' }, { value: '24', label: '24 months' }];
const MEDAL = ['bg-amber-100 text-amber-700', 'bg-slate-200 text-slate-700', 'bg-orange-100 text-orange-700'];

/** Reads an "r g b" CSS variable from <html> as an rgb() color. */
function cssColor(name: string, fallback: string) {
  if (typeof document === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v ? `rgb(${v.split(/[\s,]+/).join(' ')})` : fallback;
}

/** Short axis label: 1.2Cr, 90L, 30K. */
function axisValue(v: number) {
  if (v >= 1e7) return `${+(v / 1e7).toFixed(1)}Cr`;
  if (v >= 1e5) return `${+(v / 1e5).toFixed(1)}L`;
  if (v >= 1e3) return `${+(v / 1e3).toFixed(1)}K`;
  return String(v);
}

const monthLabel = (key: string) => new Date(`${key}-01T12:00:00`).toLocaleDateString('en-PK', { month: 'short', year: '2-digit' });

export default function AnalyticsPage() {
  const guide = usePageGuide();
  const list = useListParams({ months: '12' });
  const months = Number(list.filters.months) || 12;

  const mrr = useQuery({ queryKey: ['admin', 'analytics', 'mrr'], queryFn: adminAnalyticsApi.mrrArr, staleTime: 60_000 });
  const revenue = useQuery({ queryKey: ['admin', 'analytics', 'revenue', months], queryFn: () => adminAnalyticsApi.monthlyRevenue(months), staleTime: 60_000 });
  const churn = useQuery({ queryKey: ['admin', 'analytics', 'churn', months], queryFn: () => adminAnalyticsApi.churn(months), staleTime: 60_000 });
  const top = useQuery({ queryKey: ['admin', 'analytics', 'top'], queryFn: () => adminAnalyticsApi.topTenants(10), staleTime: 60_000 });
  const mix = useQuery({ queryKey: ['admin', 'analytics', 'plan-mix'], queryFn: adminAnalyticsApi.planMix, staleTime: 60_000 });

  const theme = useAppearanceStore((s) => `${s.resolved.accentHex}|${s.resolved.mode}|${s.systemPrefersDark}`);
  const colors = useMemo(() => ({
    line: cssColor('--brand-500', '#6366f1'),
    bad: cssColor('--rose-500', '#f43f5e'),
    grid: cssColor('--bd-slate-200', '#e2e8f0'),
    text: cssColor('--tx-slate-500', '#64748b'),
  }), [theme]); // eslint-disable-line react-hooks/exhaustive-deps
  const axis = { stroke: colors.text, fontSize: 11, tickLine: false, axisLine: false } as const;

  const m = mrr.data;
  const rev = revenue.data ?? [];
  const cur = rev[rev.length - 1]?.revenue ?? 0;
  const periodTotal = rev.reduce((n, r) => n + r.revenue, 0);
  const churned = (churn.data ?? []).reduce((n, c) => n + c.churned, 0);
  const planRows = mix.data ?? [];
  const maxMrr = Math.max(1, ...planRows.map((p) => p.mrr));
  const topRows = top.data ?? [];

  const tip = (money: boolean, label: string) => (
    <Tooltip
      cursor={{ fill: 'rgba(100,116,139,0.08)' }}
      contentStyle={{ borderRadius: 12, border: `1px solid ${colors.grid}`, fontSize: 12 }}
      labelFormatter={(l) => monthLabel(String(l))}
      formatter={(v) => [money ? formatPKRFull(Number(v)) : num(Number(v)), label]}
    />
  );

  return (
    <PageShell>
      <PageHero
        title="Revenue analytics"
        chip={`Last ${months} months`}
        busy={revenue.isFetching || churn.isFetching}
        loading={mrr.isLoading}
        actions={<button type="button" className={heroButton} onClick={guide.open} aria-label="How this page works (G)"><Lightbulb className="h-4 w-4" /></button>}
        stats={m ? [
          { label: 'Monthly recurring revenue', value: formatPKR(m.mrr), hint: `${num(m.activeSubscriptions)} active plans` },
          { label: 'Yearly recurring revenue', value: formatPKR(m.arr), hint: 'MRR times 12' },
          { label: 'Collected this month', value: formatPKR(cur), hint: 'Approved payments' },
          { label: `Collected, ${months} months`, value: formatPKR(periodTotal) },
        ] : undefined}
      />

      <div className="flex justify-end">
        <Segmented value={String(months)} onChange={(v) => list.setFilter('months', v)} items={RANGES} label="Period" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Payments collected" description="Plan payments approved each month (Nafaa income).">
          <div className="h-72">
            {revenue.isLoading ? <Skeleton className="h-full rounded-2xl" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={rev} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="rev-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={colors.line} stopOpacity={0.28} />
                      <stop offset="100%" stopColor={colors.line} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke={colors.grid} strokeDasharray="3 3" />
                  <XAxis dataKey="month" tickFormatter={monthLabel} minTickGap={24} {...axis} />
                  <YAxis tickFormatter={axisValue} width={52} {...axis} />
                  {tip(true, 'Collected')}
                  <Area type="monotone" dataKey="revenue" stroke={colors.line} strokeWidth={2} fill="url(#rev-fill)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card title="Cancelled plans" description={`${num(churned)} plans cancelled in ${months} months.`}>
          <div className="h-72">
            {churn.isLoading ? <Skeleton className="h-full rounded-2xl" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={churn.data ?? []} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke={colors.grid} strokeDasharray="3 3" />
                  <XAxis dataKey="month" tickFormatter={monthLabel} minTickGap={24} {...axis} />
                  <YAxis allowDecimals={false} width={40} {...axis} />
                  {tip(false, 'Cancelled')}
                  <Bar dataKey="churned" fill={colors.bad} radius={[4, 4, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Revenue by plan" description="Monthly recurring revenue from active plans.">
          {mix.isLoading ? <Skeleton className="h-40 rounded-2xl" /> : planRows.length === 0 ? (
            <EmptyState icon={<Layers className="h-6 w-6" />} title="No active plans yet" description="Active paid plans appear here." />
          ) : (
            <ul className="space-y-3">
              {planRows.map((p) => (
                <li key={p.planId}>
                  <div className="flex items-baseline justify-between gap-2 text-[0.875rem]">
                    <span className="font-medium text-slate-900">{p.name} <span className="font-normal text-slate-500">· {num(p.subscriptions)} shops</span></span>
                    <span className="font-semibold text-slate-900">{formatPKR(p.mrr)}</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.max(3, (p.mrr / maxMrr) * 100)}%` }} /></div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Top paying shops" description="By total approved payments.">
          {top.isLoading ? <Skeleton className="h-40 rounded-2xl" /> : topRows.length === 0 ? (
            <EmptyState icon={<Crown className="h-6 w-6" />} title="No revenue yet" description="Shops appear here after their first approved payment." />
          ) : (
            <ul className="space-y-1">
              {topRows.map((t, i) => (
                <li key={t.tenantId}>
                  <Link to={`/tenants/${t.tenantId}`} className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-slate-50">
                    <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[0.75rem] font-bold', MEDAL[i] ?? 'bg-slate-100 text-slate-600')}>{i + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.875rem] font-medium text-slate-900">{t.tenant?.name ?? 'Unknown shop'}</span>
                      <span className="block text-[0.75rem] text-slate-500">{num(t.paymentsCount)} payments</span>
                    </span>
                    <span className="text-[0.875rem] font-semibold text-emerald-700">{formatPKR(t.totalPaid)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {guide.isOpen && (
        <PageGuide
          title="Revenue analytics"
          description="How much Nafaa earns from plans, and how that changes over time."
          flowTitle="Where the numbers come from"
          flow={[
            { label: 'Shop pays for a plan', icon: CreditCard, color: '#4f46e5' },
            { label: 'You approve it', icon: Wallet, color: '#0284c7' },
            { label: 'Counts as collected', icon: BarChart3, color: '#059669' },
            { label: 'Plan ends or is cancelled', icon: TrendingDown, color: '#e11d48' },
          ]}
          steps={[
            { icon: Repeat, color: '#4f46e5', title: 'MRR and ARR', text: 'Monthly recurring revenue spreads quarterly and yearly plans over their months. ARR is MRR times 12.' },
            { icon: BarChart3, color: '#059669', title: 'Collected', text: 'Money from payments you approved, grouped by the month of approval.' },
            { icon: Layers, color: '#d97706', title: 'Revenue by plan', text: 'See which plans bring the most recurring revenue.' },
          ]}
          tips={['Change the period with the switch above the charts.', 'Months follow Pakistan time.']}
          shortcuts={[['G', 'This guide']]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}
