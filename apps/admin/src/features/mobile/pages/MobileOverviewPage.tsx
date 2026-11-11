/**
 * Mobile app overview: active devices, installs and daily use over time,
 * splits by platform, version, language and industry, and shops on mobile
 * versus web only. Counts cover the 2.0 app (devices that check in); people
 * still on the older app are shown separately.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, BellRing, Lightbulb, Smartphone, TrendingUp, Download, Users } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Alert, Card, KpiCard, KpiRow, PageHero, PageShell, Segmented, Skeleton, heroButton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { adminMobileApi } from '@/api/admin-mobile.api';
import { formatRelative } from '@/lib/format';
import { MiniTable, num, Pill, SERIES, useChartColors } from '@/features/shared/kit';
import { industryLabel, LANGUAGE_LABEL, PLATFORM_LABEL, ShareBars } from '../components/MobileUi';

const RANGES = [14, 30, 90];
const shortDate = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });

export default function MobileOverviewPage() {
  const guide = usePageGuide();
  const colors = useChartColors();
  const [days, setDays] = useState(30);
  const { data, isLoading, isFetching, error } = useQuery({ queryKey: ['admin-mobile-overview', days], queryFn: () => adminMobileApi.overview(days), placeholderData: (prev) => prev });

  const t = data?.totals;
  const platformTotal = (data?.byPlatform ?? []).reduce((s, p) => s + p.devices, 0) || 1;
  const axis = { stroke: colors.text, fontSize: 11, tickLine: false, axisLine: false } as const;
  const tip = { cursor: { fill: 'rgba(100,116,139,0.08)' }, contentStyle: { borderRadius: 12, border: `1px solid ${colors.grid}`, fontSize: 12 } };

  return (
    <PageShell>
      <PageHero
        title="Mobile apps"
        chip={`Last ${days} days`}
        busy={isFetching}
        loading={isLoading}
        actions={
          <>
            <Segmented value={String(days)} onChange={(v) => setDays(Number(v))} label="Period" items={RANGES.map((r) => ({ value: String(r), label: `${r} days` }))} />
            <button type="button" className={heroButton} onClick={guide.open} aria-label="How this page works (G)"><Lightbulb className="h-4 w-4" /></button>
          </>
        }
        stats={t ? [
          { label: 'Active today', value: num(t.activeToday), hint: `${num(t.newToday)} new installs` },
          { label: 'Active in 7 days', value: num(t.active7d) },
          { label: 'Active in 30 days', value: num(t.active30d) },
          { label: 'All devices', value: num(t.devices), hint: 'Ever checked in' },
        ] : undefined}
      />

      {error ? <Alert tone="danger">Could not load mobile usage.</Alert> : null}

      <KpiRow cols={3}>
        <KpiCard icon={BellRing} color="#0d9488" label="Push reachable" value={num(t?.pushReachable30d)} hint="Active, notifications on" />
        <KpiCard icon={Smartphone} color="#d97706" label="Older app users" value={num(t?.olderAppUsers)} hint="Push saved, no new app yet" />
        <KpiCard icon={Users} color="#4f46e5" label="Shops on mobile" value={`${num(data?.tenants.onMobile)} of ${num(data?.tenants.active30d)}`} hint="Active shops, last 30 days" />
      </KpiRow>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card title="Active devices per day" description="Devices that opened the app on each business day (PKT)">
          <div className="h-[240px]">
            {isLoading ? <Skeleton className="h-full rounded-xl" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data?.series ?? []} margin={{ left: -16, right: 8, top: 8 }}>
                  <defs>
                    <linearGradient id="mobActive" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={colors.line} stopOpacity={0.28} />
                      <stop offset="100%" stopColor={colors.line} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
                  <XAxis dataKey="date" tickFormatter={shortDate} minTickGap={24} {...axis} />
                  <YAxis allowDecimals={false} {...axis} />
                  <Tooltip {...tip} labelFormatter={(d) => shortDate(String(d))} formatter={(v) => [Number(v).toLocaleString('en-PK'), 'Active devices']} />
                  <Area type="monotone" dataKey="active" stroke={colors.line} strokeWidth={2} fill="url(#mobActive)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
        <Card title="New installs per day" description="First check-in of each device">
          <div className="h-[240px]">
            {isLoading ? <Skeleton className="h-full rounded-xl" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.series ?? []} margin={{ left: -16, right: 8, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
                  <XAxis dataKey="date" tickFormatter={shortDate} minTickGap={24} {...axis} />
                  <YAxis allowDecimals={false} {...axis} />
                  <Tooltip {...tip} labelFormatter={(d) => shortDate(String(d))} formatter={(v) => [Number(v).toLocaleString('en-PK'), 'New installs']} />
                  <Bar dataKey="installs" fill={colors.second} radius={[4, 4, 0, 0]} maxBarSize={18} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card title="Platform" description="Active in the last 30 days">
          <div className="mb-4 flex h-3 overflow-hidden rounded-full bg-slate-100">
            {(data?.byPlatform ?? []).map((p, i) => (
              <div key={p.key} title={`${PLATFORM_LABEL[p.key] ?? p.key}: ${p.devices}`} style={{ width: `${(p.devices / platformTotal) * 100}%`, background: SERIES[i % SERIES.length] }} className="border-r-2 border-white last:border-r-0" />
            ))}
          </div>
          <div className="space-y-2">
            {(data?.byPlatform ?? []).map((p, i) => (
              <div key={p.key} className="flex items-center justify-between text-[0.875rem]">
                <span className="inline-flex items-center gap-2 font-medium text-slate-700"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: SERIES[i % SERIES.length] }} />{PLATFORM_LABEL[p.key] ?? p.key}</span>
                <span className="tabular-nums text-slate-600">{num(p.devices)} · {Math.round((p.devices / platformTotal) * 100)}%</span>
              </div>
            ))}
            {!data?.byPlatform.length && <div className="py-4 text-center text-[0.875rem] text-slate-500">No devices yet.</div>}
          </div>
          {!!data?.byModel.length && (
            <>
              <div className="mb-3 mt-6 text-[0.75rem] font-semibold uppercase tracking-wide text-slate-500">Top phone models</div>
              <ShareBars rows={data.byModel} color={SERIES[4]} />
            </>
          )}
        </Card>
        <Card title="Language" description="App language on active devices"><ShareBars rows={data?.byLanguage ?? []} color={SERIES[1]} format={(k) => LANGUAGE_LABEL[k] ?? k} /></Card>
        <Card title="Industry" description="Active devices by business type"><ShareBars rows={data?.byIndustry ?? []} color={SERIES[2]} format={industryLabel} /></Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card flush className="lg:col-span-2" title="App versions" description="Active in the last 30 days"
          actions={<Link to="/mobile/releases" className="inline-flex items-center gap-1 text-[0.8125rem] font-semibold text-brand-700 hover:underline">Update control <ArrowRight className="h-3.5 w-3.5" /></Link>}>
          {(data?.oldVersions.outdated || data?.oldVersions.unsupported) ? (
            <div className="px-4 sm:px-5">
              <Alert tone="warning">
                <b>{num(data.oldVersions.outdated)}</b> active devices are behind the latest version
                {data.oldVersions.unsupported ? <> and <b>{num(data.oldVersions.unsupported)}</b> are below the minimum (they see the update screen)</> : null}.
              </Alert>
            </div>
          ) : null}
          <MiniTable minWidth="28rem" head={['Version', 'Platform', 'Status', 'Devices']} empty="No devices yet."
            rows={(data?.byVersion ?? []).map((v) => [
              <span key="v" className="font-semibold tabular-nums text-slate-900">{v.version}</span>,
              PLATFORM_LABEL[v.platform] ?? v.platform,
              v.status === 'current' ? <Pill key="s" tone="emerald">Current</Pill> : v.status === 'outdated' ? <Pill key="s" tone="amber">Behind latest</Pill> : <Pill key="s" tone="rose">Below minimum</Pill>,
              num(v.devices),
            ])} />
        </Card>

        <Card title="Shops: mobile and web" description="Shops with any login in the last 30 days">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-slate-50 p-3"><div className="text-xl font-bold tabular-nums">{num(data?.tenants.active30d)}</div><div className="text-[0.6875rem] text-slate-500">Active</div></div>
            <div className="rounded-xl bg-brand-50 p-3"><div className="text-xl font-bold tabular-nums text-brand-800">{num(data?.tenants.onMobile)}</div><div className="text-[0.6875rem] text-brand-700">Use mobile</div></div>
            <div className="rounded-xl bg-slate-50 p-3"><div className="text-xl font-bold tabular-nums">{num(data?.tenants.webOnly)}</div><div className="text-[0.6875rem] text-slate-500">Web only</div></div>
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-brand-600" style={{ width: `${data?.tenants.active30d ? (data.tenants.onMobile / data.tenants.active30d) * 100 : 0}%` }} />
          </div>
          <div className="mt-5 text-[0.75rem] font-semibold uppercase tracking-wide text-slate-500">Most devices</div>
          <div className="mt-2 divide-y divide-slate-100">
            {(data?.topTenants ?? []).map((tn) => (
              <Link key={tn.tenantId} to={`/mobile/devices?tenantId=${tn.tenantId}`} className="flex items-center justify-between gap-2 py-2 text-[0.875rem] hover:text-brand-700">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{tn.name}</span>
                  <span className="block text-[0.75rem] text-slate-500">{industryLabel(tn.industry)} · {formatRelative(tn.lastSeen)}</span>
                </span>
                <span className="font-semibold tabular-nums">{tn.devices}</span>
              </Link>
            ))}
            {!data?.topTenants.length && <div className="py-4 text-center text-[0.875rem] text-slate-500">No devices yet.</div>}
          </div>
        </Card>
      </section>

      {guide.isOpen && (
        <PageGuide
          title="Mobile apps"
          description="Who uses the Nafaa mobile app, on which version and language, and how use is growing."
          flowTitle="From install to update"
          flow={[
            { label: 'Install', hint: 'First check-in', icon: Download, color: '#4f46e5' },
            { label: 'Use', hint: 'Daily active devices', icon: Smartphone, color: '#0d9488' },
            { label: 'Notify', hint: 'Push and announcements', icon: BellRing, color: '#d97706' },
            { label: 'Update', hint: 'Soft or forced update', icon: TrendingUp, color: '#059669' },
          ]}
          steps={[
            { icon: TrendingUp, color: '#4f46e5', title: 'Pick a period', text: 'The charts follow the period. The big numbers always show today, 7 days and 30 days.' },
            { icon: Smartphone, color: '#0d9488', title: 'Check versions', text: 'Devices behind the latest version can be nudged from Update control.' },
            { icon: Users, color: '#d97706', title: 'Open a shop', text: 'Click a shop under "Most devices" to see all its devices.' },
          ]}
          tips={['Counts cover the new app only; older app users are listed apart.', 'Days are Pakistan business days.']}
          shortcuts={[['G', 'This guide']]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}
