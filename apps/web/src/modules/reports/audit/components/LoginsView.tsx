/** Login history: totals, logins by hour, each person's devices and failures, and the record. */

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Clock, KeyRound, LogIn, MonitorSmartphone, ShieldAlert, Users } from 'lucide-react';
import { KpiCard, KpiRow, Segmented, Skeleton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { useChartTheme } from '@modules/dashboard/engine/useChartTheme';
import type { LoginReport, LoginStatus } from '../api';
import { hourLabel, when } from '../meta';
import { Chip, Empty, Panel } from './parts';
import { t as tr } from '@core/i18n';

export function LoginsView({ data, loading, status, onStatus, onMore, loadingMore, onStaff }: {
  data: LoginReport | undefined;
  loading: boolean;
  status: LoginStatus;
  onStatus: (s: LoginStatus) => void;
  onMore: () => void;
  loadingMore: boolean;
  onStaff: (id: string) => void;
}) {
  const theme = useChartTheme();
  if (loading || !data) return <div className="grid gap-4"><Skeleton className="h-24 rounded-2xl" /><Skeleton className="h-64 rounded-2xl" /><Skeleton className="h-80 rounded-2xl" /></div>;
  const t = data.totals;

  return (
    <div className="space-y-4">
      <KpiRow>
        <KpiCard icon={LogIn} color="#2563eb" label={tr('Login')} value={t.logins} hint={tr('{{people}} bande', { people: t.people })} onClick={() => onStatus('all')} active={status === 'all'} />
        <KpiCard icon={ShieldAlert} color="#e11d48" label={tr('Nakam login')} value={t.failed} hint={tr('Ghalat password waghera')} onClick={() => onStatus('failed')} active={status === 'failed'} />
        <KpiCard icon={MonitorSmartphone} color="#7c3aed" label={tr('Naye device')} value={t.newDevices} hint={tr('Pehli dafa is device se')} onClick={() => onStatus('new')} active={status === 'new'} />
        <KpiCard icon={Clock} color="#d97706" label={tr('Waqt ke baad')} value={t.afterHours} hint={tr('Dukaan ka waqt {{hours}}', { hours: t.hours })} onClick={() => onStatus('after')} active={status === 'after'} />
        <KpiCard icon={KeyRound} color="#0891b2" label={tr('Alag device')} value={t.devices} hint={tr('Is period me')} />
      </KpiRow>

      <div className="grid gap-4 lg:grid-cols-5">
        <Panel icon={Clock} title={tr('Login kis waqt')} hint={tr('Ghante war. Raat ke login khaas dekhein.')} className="lg:col-span-3">
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.hours} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                <CartesianGrid stroke={theme.grid} vertical={false} />
                <XAxis dataKey="hour" tick={theme.axis} axisLine={false} tickLine={false} tickFormatter={(h: number) => hourLabel(h).replace(' ', '')} interval={2} />
                <YAxis tick={theme.axis} axisLine={false} tickLine={false} allowDecimals={false} width={36} />
                <Tooltip {...theme.tooltip} labelFormatter={(h) => hourLabel(Number(h))} formatter={(v, n) => [String(v), n === 'ok' ? tr('Kamyab') : tr('Nakam')]} />
                <Legend formatter={(v: string) => (v === 'ok' ? tr('Kamyab') : tr('Nakam'))} wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="ok" stackId="l" fill={theme.primary} maxBarSize={22} />
                <Bar dataKey="failed" stackId="l" fill="#e11d48" maxBarSize={22} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel icon={Users} title={tr('Har banda')} hint={tr('Nakam login aur naye device wale upar.')} className="lg:col-span-2">
          {!data.people.length ? <Empty text={tr('Koi login nahi')} /> : (
            <ul className="divide-y divide-slate-100">
              {data.people.slice(0, 10).map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => onStaff(p.id)} className="flex w-full items-center justify-between gap-3 py-2 text-start hover:opacity-80">
                    <span className="min-w-0">
                      <span className="block truncate text-[0.8125rem] font-semibold text-slate-900">{p.name}</span>
                      <span className="block text-[0.6875rem] text-slate-500">{tr('{{logins}} login · {{devices}} device{{value}}', { logins: p.logins, devices: p.devices, value: p.last ? tr(' · aakhri {{last}}', { last: when(p.last) }) : '' })}</span>
                    </span>
                    <span className="flex shrink-0 gap-1">
                      {p.failed > 0 && <Chip tone="rose">{tr('{{failed}} nakam', { failed: p.failed })}</Chip>}
                      {p.newDevices > 0 && <Chip tone="amber">{tr('{{newDevices}} naya', { newDevices: p.newDevices })}</Chip>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel icon={LogIn} title={tr('Login record')} flush
        actions={<Segmented label={tr('Kaun se')} value={status} onChange={onStatus} items={[{ value: 'all', label: tr('Sab') }, { value: 'failed', label: tr('Nakam') }, { value: 'new', label: tr('Naye') }, { value: 'after', label: tr('Raat') }]} />}>
        {!data.items.length ? <Empty icon={LogIn} text={tr('Is filter me koi login nahi')} /> : (
          <ul className="divide-y divide-slate-100">
            {data.items.map((l) => (
              <li key={l.id} className="flex items-center gap-3 px-4 py-2.5 sm:px-5">
                <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', l.success ? (l.isNewDevice ? 'bg-violet-50 text-violet-700' : 'bg-emerald-50 text-emerald-700') : 'bg-rose-50 text-rose-700')}>
                  {l.success ? (l.isNewDevice ? <MonitorSmartphone className="h-4 w-4" /> : <LogIn className="h-4 w-4 rtl-flip" />) : <ShieldAlert className="h-4 w-4" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.8125rem] font-semibold text-slate-900">{l.userName}
                    <span className="ms-1.5 font-normal text-slate-500">{l.success ? (l.isNewDevice ? tr('naye device se') : 'login') : tr('nakam{{value}}', { value: l.failureReason ? ` — ${l.failureReason}` : '' })}</span>
                  </span>
                  <span className="block truncate text-[0.6875rem] text-slate-500">{[l.deviceName, l.location, l.ipAddress && `IP ${l.ipAddress}`].filter(Boolean).join(' · ') || l.email}</span>
                </span>
                <span className="shrink-0 text-end text-[0.75rem] text-slate-500">{when(l.createdAt)}{l.afterHours && <span className="block font-medium text-amber-700">{tr('waqt ke baad')}</span>}</span>
              </li>
            ))}
          </ul>
        )}
        {data.hasMore && (
          <div className="border-t border-slate-100 p-3">
            <button type="button" onClick={onMore} disabled={loadingMore} className="w-full rounded-xl py-2 text-[0.8125rem] font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-60">
              {loadingMore ? tr('Aa rahe hain…') : tr('Aur dikhayein ({{count}} / {{total}})', { count: data.items.length, total: data.total })}
            </button>
          </div>
        )}
      </Panel>
    </div>
  );
}
