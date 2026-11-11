/**
 * Platform dashboard: the admin home screen.
 *
 * One request (/admin/dashboard) returns the KPIs for the chosen period with
 * the period before it, a per-day trend, what happened to the shops that
 * signed up, industries and the alerts that need attention.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle, ArrowRight, Building2, CircleAlert, Info, Lightbulb, Receipt, RefreshCw, Repeat, ShoppingCart,
  Store, TrendingDown, TrendingUp, UserMinus, UserPlus, Wallet,
} from 'lucide-react';
import { Card, EmptyState, KpiCard, KpiRow, PageHero, PageShell, Skeleton, heroButton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { cn } from '@/lib/cn';
import { formatPKR, formatPKRFull } from '@/lib/format';
import { adminDashboardApi, type Compare, type DashboardDays, type DashboardSummary } from '@/api/admin-dashboard.api';
import { WORKSPACES } from '@/shell/navigation/nav-config';
import { WorkspaceMark } from '@/shell/sidebar/WorkspaceMark';
import { TrendChart } from '../components/TrendChart';
import { industryForType } from '@/lib/industries';

const RANGES: DashboardDays[] = [7, 14, 30, 90];
const num = (n: number) => n.toLocaleString('en-PK');

/** Change against the previous period, e.g. "+12% vs last 30 days". */
function Delta({ now, prev, days, invert }: { now: number; prev: number; days: number; invert?: boolean }) {
  if (!prev && !now) return <span>No change</span>;
  if (!prev) return <span className="font-medium text-emerald-600">New vs prior {days}d</span>;
  const pct = Math.round(((now - prev) / prev) * 100);
  const up = pct >= 0;
  const good = invert ? !up : up;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className={cn('inline-flex items-center gap-1 font-medium', pct === 0 ? 'text-slate-500' : good ? 'text-emerald-600' : 'text-rose-600')}>
      <Icon className="h-3 w-3" /> {up ? '+' : ''}{pct}% <span className="font-normal text-slate-500">vs prior {days}d</span>
    </span>
  );
}

const ALERT_STYLE = {
  danger: { icon: CircleAlert, box: 'bg-rose-50 text-rose-700 ring-rose-200', count: 'bg-rose-600 text-white' },
  warning: { icon: AlertTriangle, box: 'bg-amber-50 text-amber-800 ring-amber-200', count: 'bg-amber-500 text-white' },
  info: { icon: Info, box: 'bg-sky-50 text-sky-800 ring-sky-200', count: 'bg-sky-600 text-white' },
};

function Alerts({ data }: { data: DashboardSummary }) {
  if (!data.alerts.length) {
    return (
      <Card title="Needs attention">
        <div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-3 text-[0.8125rem] text-emerald-800 ring-1 ring-emerald-200">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white"><RefreshCw className="h-4 w-4" /></span>
          All clear. No payments, renewals or stuck shops are waiting.
        </div>
      </Card>
    );
  }
  return (
    <Card title="Needs attention" description="Open an item to act on it.">
      <ul className="space-y-2">
        {data.alerts.map((a) => {
          const s = ALERT_STYLE[a.level];
          return (
            <li key={a.id}>
              <Link to={a.to} className={cn('group flex items-center gap-3 rounded-xl p-3 ring-1 transition hover:shadow-sm', s.box)}>
                <s.icon className="h-5 w-5 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[0.8125rem] font-semibold">{a.title}</span>
                  <span className="block text-[0.75rem] opacity-80">{a.detail}</span>
                </span>
                <span className={cn('rounded-full px-2 py-0.5 text-[0.75rem] font-bold tabular-nums', s.count)}>{num(a.count)}</span>
                <ArrowRight className="h-4 w-4 shrink-0 opacity-60 transition group-hover:translate-x-0.5" />
              </Link>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function Funnel({ data }: { data: DashboardSummary }) {
  const top = data.funnel[0]?.count || 0;
  return (
    <Card title="New shops: how far they got" description={`Shops that signed up in the last ${data.range.days} days.`}>
      {top === 0 ? <p className="text-[0.8125rem] text-slate-500">No signups in this period.</p> : (
        <ol className="space-y-2.5">
          {data.funnel.map((step, i) => {
            const pct = top ? Math.round((step.count / top) * 100) : 0;
            const prev = i > 0 ? data.funnel[i - 1].count : 0;
            const lost = i > 0 ? prev - step.count : 0;
            return (
              <li key={step.key}>
                <div className="mb-1 flex items-baseline justify-between gap-2 text-[0.8125rem]">
                  <span className="font-medium text-slate-700">{step.label}</span>
                  <span className="tabular-nums text-slate-900"><b>{num(step.count)}</b> <span className="text-slate-500">· {pct}%</span></span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-brand-500 transition-[width] duration-500" style={{ width: `${Math.max(pct, 2)}%`, opacity: 1 - i * 0.12 }} />
                </div>
                {lost > 0 && <div className="mt-0.5 text-[0.6875rem] text-slate-400">{num(lost)} stopped here</div>}
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}

function Industries({ data }: { data: DashboardSummary }) {
  const max = Math.max(1, ...data.industries.map((r) => r.shops));
  return (
    <Card title="Industries" description={`Shops per industry, and how many sold in the last ${data.range.days} days.`} flush>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[30rem] text-[0.8125rem]">
          <thead>
            <tr className="border-b border-slate-200 text-start text-[0.75rem] text-slate-500">
              <th className="px-4 py-2 text-start font-medium sm:px-5">Industry</th>
              <th className="px-3 py-2 text-end font-medium">Shops</th>
              <th className="px-3 py-2 text-end font-medium">Selling</th>
              <th className="px-4 py-2 text-end font-medium sm:px-5">Sales value</th>
            </tr>
          </thead>
          <tbody>
            {data.industries.map((r) => {
              const id = industryForType(r.type);
              return (
                <tr key={r.type} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-2 sm:px-5">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${id.color}1a`, color: id.color }}><id.icon className="h-3.5 w-3.5" /></span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium text-slate-900">{id.label}</div>
                        <div className="mt-1 h-1 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full" style={{ width: `${(r.shops / max) * 100}%`, backgroundColor: id.color }} /></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-end tabular-nums text-slate-900">{num(r.shops)}</td>
                  <td className="px-3 py-2 text-end tabular-nums text-slate-600">{num(r.selling)}</td>
                  <td className="px-4 py-2 text-end tabular-nums text-slate-900 sm:px-5" title={formatPKRFull(r.gmv)}>{formatPKR(r.gmv)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function Workspaces() {
  return (
    <Card title="Workspaces" description="Every area of Nafaa has its own menu.">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {WORKSPACES.filter((w) => w.id !== 'platform').map((ws) => (
          <Link key={ws.id} to={ws.root} className="group flex items-center gap-3 rounded-xl p-2.5 ring-1 ring-slate-200 transition hover:bg-slate-50 hover:ring-slate-300">
            <WorkspaceMark workspace={ws} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[0.8125rem] font-semibold text-slate-900">{ws.label}</span>
              <span className="block truncate text-[0.75rem] text-slate-500">{ws.description}</span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5" />
          </Link>
        ))}
      </div>
    </Card>
  );
}

export default function DashboardPage() {
  const [days, setDays] = useState<DashboardDays>(30);
  const guide = usePageGuide();
  const { data, isLoading, isFetching, isError, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['admin', 'dashboard', days],
    queryFn: () => adminDashboardApi.summary(days),
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });
  const k = data?.kpis;

  return (
    <PageShell>
      <PageHero
        title="Platform overview"
        chip={`Last ${days} days`}
        busy={isFetching}
        meta={data ? `Pakistan time · updated ${new Date(dataUpdatedAt).toLocaleTimeString('en-PK', { hour: 'numeric', minute: '2-digit' })}` : undefined}
        loading={isLoading}
        actions={
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="flex gap-1" role="group" aria-label="Period">
              {RANGES.map((d) => (
                <button key={d} type="button" onClick={() => setDays(d)} aria-pressed={days === d} className={cn(heroButton, 'px-2.5', days === d && 'bg-[color:var(--hero-primary-bg)] text-[color:var(--hero-primary-fg)] hover:bg-[color:var(--hero-primary-hover)]')}>
                  {d}d
                </button>
              ))}
            </div>
            <button type="button" onClick={guide.open} className={heroButton} aria-label="How this page works (G)">
              <Lightbulb className="h-4 w-4" /> <span className="hidden sm:inline">Guide</span>
            </button>
          </div>
        }
        stats={k ? [
          { label: 'Sales value through Nafaa', value: formatPKR(k.gmv.value), hint: `${num(k.bills.value)} bills` },
          { label: 'Monthly recurring revenue', value: formatPKR(k.mrr), hint: `${num(k.payingShops)} paying shops` },
          { label: 'Shops selling (7 days)', value: num(k.sellingShops.last7), hint: `${num(k.sellingShops.prev7)} the week before` },
          { label: 'New shops', value: num(k.tenants.new), hint: `${num(k.tenants.newPrev)} in the previous ${days} days` },
        ] : undefined}
      />

      {isError && (
        <EmptyState icon={<CircleAlert className="h-6 w-6" />} title="Dashboard did not load" description="The server did not answer. Check System health, then try again." action={<button type="button" onClick={() => refetch()} className="text-[0.8125rem] font-semibold text-brand-700 hover:underline">Try again</button>} />
      )}

      {k && data ? (
        <>
          <KpiRow cols={5}>
            <KpiCard icon={Building2} color="#4f46e5" label="Shops" value={num(k.tenants.total)} hint={`${num(k.tenants.active)} active · ${num(k.tenants.trial)} trial`} />
            <KpiCard icon={ShoppingCart} color="#0891b2" label="Bills" value={num(k.bills.value)} hint={<Delta now={k.bills.value} prev={k.bills.prev} days={days} />} />
            <KpiCard icon={Wallet} color="#059669" label="Payments collected" value={formatPKR(k.revenue.value)} hint={<Delta now={k.revenue.value} prev={k.revenue.prev} days={days} />} />
            <KpiCard icon={Repeat} color="#7c3aed" label="Yearly run rate" value={formatPKR(k.arr)} hint="Monthly recurring × 12" />
            <KpiCard icon={UserMinus} color="#e11d48" label="Ended subscriptions" value={num(k.churned)} hint={`Cancelled or expired in ${days} days`} />
          </KpiRow>

          <div className="grid gap-4 xl:grid-cols-3">
            <div className="xl:col-span-2">
              <TrendChart data={data.daily} />
            </div>
            <Alerts data={data} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Funnel data={data} />
            <Industries data={data} />
          </div>

          <Workspaces />
        </>
      ) : isLoading && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[5.5rem] rounded-2xl" />)}</div>
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      )}

      {guide.isOpen && (
        <PageGuide
          title="Platform overview"
          description="The health of the whole platform for the period you pick, compared with the period before it."
          flowTitle="Where the numbers come from"
          flow={[
            { label: 'Shop signs up', hint: 'New shops', icon: UserPlus, color: '#4f46e5' },
            { label: 'Sells at the counter', hint: 'Bills, sales value', icon: Receipt, color: '#0891b2' },
            { label: 'Pays for a plan', hint: 'Payments, MRR', icon: Wallet, color: '#059669' },
            { label: 'Renews or leaves', hint: 'Ended subscriptions', icon: Store, color: '#e11d48' },
          ]}
          steps={[
            { icon: TrendingUp, color: '#4f46e5', title: 'Pick a period', text: '7, 14, 30 or 90 days. Every card compares it with the same number of days before it.' },
            { icon: CircleAlert, color: '#e11d48', title: 'Clear the alerts', text: 'Payments waiting for approval and renewals due are listed first. Click one to open the right page.' },
            { icon: UserPlus, color: '#059669', title: 'Watch new shops', text: 'The funnel shows where new shops stop: setup, first product, first sale or paying.' },
            { icon: Building2, color: '#0891b2', title: 'Compare industries', text: 'Which industries have the most shops and which of them actually sell.' },
          ]}
          tips={[
            'Days follow Pakistan time, not server time.',
            'Sales value is what shops sold through Nafaa, not Nafaa’s own income. Nafaa’s income is “Payments collected”.',
            'Press Ctrl K anywhere to jump to a page, shop or user.',
          ]}
          shortcuts={[['Ctrl K', 'Search'], ['Alt W', 'Switch workspace'], ['Ctrl B', 'Collapse sidebar'], ['G', 'This guide']]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}
