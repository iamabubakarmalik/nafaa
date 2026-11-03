/**
 * Mobile app overview: active devices, installs and daily use over time,
 * splits by platform, version, language and industry, and businesses on
 * mobile versus web only. Counts cover the 2.0 app (devices that check in);
 * people still on the older app are shown separately.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { adminMobileApi } from '@/api/admin-mobile.api';
import { formatRelative } from '@/lib/format';
import { Card, industryLabel, LANGUAGE_LABEL, MobileHero, Pill, PLATFORM_LABEL, SERIES, ShareBars, Stat } from '../components/MobileUi';

const RANGES = [14, 30, 90];
const shortDate = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });

export default function MobileOverviewPage() {
  const [days, setDays] = useState(30);
  const { data, isLoading, error } = useQuery({ queryKey: ['admin-mobile-overview', days], queryFn: () => adminMobileApi.overview(days) });

  const t = data?.totals;
  const platformTotal = (data?.byPlatform ?? []).reduce((s, p) => s + p.devices, 0) || 1;

  return (
    <div className="space-y-6">
      <MobileHero title="Mobile app overview" subtitle="Who uses the app, on which version and language, and how use is growing. Counts include the new app only; people on the older app are listed separately.">
        <div className="inline-flex rounded-xl bg-white/15 p-1">
          {RANGES.map((r) => (
            <button key={r} type="button" onClick={() => setDays(r)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${days === r ? 'bg-white text-teal-800' : 'text-white/85 hover:text-white'}`}>
              {r} days
            </button>
          ))}
        </div>
      </MobileHero>

      {error ? <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">Could not load mobile usage.</div> : null}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-6">
        <Stat label="Active today" value={t?.activeToday ?? 0} hint={`${t?.newToday ?? 0} new installs today`} tone="teal" />
        <Stat label="Active in 7 days" value={t?.active7d ?? 0} />
        <Stat label="Active in 30 days" value={t?.active30d ?? 0} />
        <Stat label="All devices" value={t?.devices ?? 0} hint="Ever checked in" />
        <Stat label="Push reachable" value={t?.pushReachable30d ?? 0} hint="Active, notifications on" />
        <Stat label="Older app users" value={t?.olderAppUsers ?? 0} hint="Push saved, no new app yet" tone={t?.olderAppUsers ? 'amber' : undefined} />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card title="Active devices per day" subtitle="Devices that opened the app on each business day (PKT)">
          <div className="h-[240px]">
            {isLoading ? <div className="h-full animate-pulse rounded-2xl bg-slate-100" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data?.series ?? []} margin={{ left: -16, right: 8, top: 8 }}>
                  <defs>
                    <linearGradient id="mobActive" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={SERIES[1]} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={SERIES[1]} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={shortDate} stroke="#94a3b8" fontSize={11} tickLine={false} minTickGap={24} />
                  <YAxis allowDecimals={false} stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip labelFormatter={(d) => shortDate(String(d))} formatter={(v) => [Number(v).toLocaleString(), 'Active devices']} />
                  <Area type="monotone" dataKey="active" stroke={SERIES[1]} strokeWidth={2} fill="url(#mobActive)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card title="New installs per day" subtitle="First check-in of each device">
          <div className="h-[240px]">
            {isLoading ? <div className="h-full animate-pulse rounded-2xl bg-slate-100" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.series ?? []} margin={{ left: -16, right: 8, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={shortDate} stroke="#94a3b8" fontSize={11} tickLine={false} minTickGap={24} />
                  <YAxis allowDecimals={false} stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: '#f1f5f9' }} labelFormatter={(d) => shortDate(String(d))} formatter={(v) => [Number(v).toLocaleString(), 'New installs']} />
                  <Bar dataKey="installs" fill={SERIES[0]} radius={[4, 4, 0, 0]} maxBarSize={18} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card title="Platform" subtitle="Active in the last 30 days">
          <div className="mb-4 flex h-3 overflow-hidden rounded-full bg-slate-100">
            {(data?.byPlatform ?? []).map((p, i) => (
              <div key={p.key} title={`${PLATFORM_LABEL[p.key] ?? p.key}: ${p.devices}`}
                style={{ width: `${(p.devices / platformTotal) * 100}%`, background: SERIES[i % SERIES.length] }}
                className="border-r-2 border-white last:border-r-0" />
            ))}
          </div>
          <div className="space-y-2">
            {(data?.byPlatform ?? []).map((p, i) => (
              <div key={p.key} className="flex items-center justify-between text-sm">
                <span className="inline-flex items-center gap-2 font-medium text-slate-700">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: SERIES[i % SERIES.length] }} />{PLATFORM_LABEL[p.key] ?? p.key}
                </span>
                <span className="tabular-nums text-slate-600">{p.devices.toLocaleString()} · {Math.round((p.devices / platformTotal) * 100)}%</span>
              </div>
            ))}
            {!data?.byPlatform.length && <div className="py-4 text-center text-sm text-slate-500">No devices yet.</div>}
          </div>
          {!!data?.byModel.length && (
            <>
              <div className="mb-3 mt-6 text-xs font-semibold uppercase tracking-wide text-slate-500">Top phone models</div>
              <ShareBars rows={data.byModel} color={SERIES[4]} />
            </>
          )}
        </Card>
        <Card title="Language" subtitle="App language on active devices">
          <ShareBars rows={data?.byLanguage ?? []} color={SERIES[1]} format={(k) => LANGUAGE_LABEL[k] ?? k} />
        </Card>
        <Card title="Industry" subtitle="Active devices by business type">
          <ShareBars rows={data?.byIndustry ?? []} color={SERIES[2]} format={industryLabel} />
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card title="App versions" subtitle="Active in the last 30 days" className="lg:col-span-2"
          action={<Link to="/mobile/releases" className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-900">Update control <ArrowRight className="h-3.5 w-3.5" /></Link>}>
          {(data?.oldVersions.outdated || data?.oldVersions.unsupported) ? (
            <div className="mb-4 flex items-start gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>
                <b>{data.oldVersions.outdated.toLocaleString()}</b> active devices are behind the latest version
                {data.oldVersions.unsupported ? <> and <b>{data.oldVersions.unsupported.toLocaleString()}</b> are below the minimum (they see the update screen)</> : null}.
              </span>
            </div>
          ) : null}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[28rem] text-sm">
              <thead className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr><th className="py-2 pr-3">Version</th><th className="py-2 pr-3">Platform</th><th className="py-2 pr-3">Status</th><th className="py-2 text-right">Devices</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(data?.byVersion ?? []).map((v) => (
                  <tr key={`${v.platform}-${v.version}`}>
                    <td className="py-2 pr-3 font-semibold tabular-nums text-slate-900">{v.version}</td>
                    <td className="py-2 pr-3 text-slate-600">{PLATFORM_LABEL[v.platform] ?? v.platform}</td>
                    <td className="py-2 pr-3">
                      {v.status === 'current' ? <Pill tone="emerald">Current</Pill> : v.status === 'outdated' ? <Pill tone="amber">Behind latest</Pill> : <Pill tone="rose">Below minimum</Pill>}
                    </td>
                    <td className="py-2 text-right tabular-nums text-slate-700">{v.devices.toLocaleString()}</td>
                  </tr>
                ))}
                {!data?.byVersion.length && <tr><td colSpan={4} className="py-6 text-center text-slate-500">No devices yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Businesses: mobile vs web" subtitle="Businesses with any login in the last 30 days">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-slate-50 p-3"><div className="text-xl font-bold tabular-nums">{data?.tenants.active30d ?? 0}</div><div className="text-[11px] text-slate-500">Active</div></div>
            <div className="rounded-2xl bg-teal-50 p-3"><div className="text-xl font-bold tabular-nums text-teal-800">{data?.tenants.onMobile ?? 0}</div><div className="text-[11px] text-teal-700">Use mobile</div></div>
            <div className="rounded-2xl bg-slate-50 p-3"><div className="text-xl font-bold tabular-nums">{data?.tenants.webOnly ?? 0}</div><div className="text-[11px] text-slate-500">Web only</div></div>
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-teal-600" style={{ width: `${data?.tenants.active30d ? (data.tenants.onMobile / data.tenants.active30d) * 100 : 0}%` }} />
          </div>
          <div className="mt-5 text-xs font-semibold uppercase tracking-wide text-slate-500">Most devices</div>
          <div className="mt-2 divide-y divide-slate-100">
            {(data?.topTenants ?? []).map((tn) => (
              <Link key={tn.tenantId} to={`/mobile/devices?tenantId=${tn.tenantId}`} className="flex items-center justify-between gap-2 py-2 text-sm hover:text-teal-700">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{tn.name}</span>
                  <span className="block text-xs text-slate-500">{industryLabel(tn.industry)} · {formatRelative(tn.lastSeen)}</span>
                </span>
                <span className="font-semibold tabular-nums">{tn.devices}</span>
              </Link>
            ))}
            {!data?.topTenants.length && <div className="py-4 text-center text-sm text-slate-500">No devices yet.</div>}
          </div>
        </Card>
      </section>
    </div>
  );
}
