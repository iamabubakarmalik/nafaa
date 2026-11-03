/** Every device that checked in from the mobile app, searchable by business, person or model. */

import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { BellOff, BellRing, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { adminMobileApi, type DeviceQuery } from '@/api/admin-mobile.api';
import { formatDate, formatRelative } from '@/lib/format';
import { cn } from '@/lib/cn';
import { industryLabel, inputCls, LANGUAGE_LABEL, MobileHero, Pill, PLATFORM_LABEL } from '../components/MobileUi';

export default function MobileDevicesPage() {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  const query: DeviceQuery = {
    q: params.get('q') ?? undefined,
    platform: params.get('platform') ?? undefined,
    version: params.get('version') ?? undefined,
    tenantId: params.get('tenantId') ?? undefined,
    activeDays: params.get('activeDays') ? Number(params.get('activeDays')) : undefined,
    sort: (params.get('sort') as DeviceQuery['sort']) ?? undefined,
    page: Number(params.get('page') ?? 1),
    limit: 25,
  };
  const update = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) { if (v) next.set(k, v); else next.delete(k); }
    if (!('page' in patch)) next.delete('page');
    setParams(next, { replace: true });
  };
  useEffect(() => {
    const t = setTimeout(() => { if ((params.get('q') ?? '') !== q) update({ q: q.trim() || undefined }); }, 300);
    return () => clearTimeout(t);
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ['admin-mobile-devices', query], queryFn: () => adminMobileApi.devices(query), placeholderData: keepPreviousData,
  });
  const { data: targets } = useQuery({ queryKey: ['admin-mobile-targets'], queryFn: adminMobileApi.targets, staleTime: 60_000 });
  const tenantName = query.tenantId ? data?.items[0]?.tenant.name : null;

  return (
    <div className="space-y-6">
      <MobileHero title="Devices" subtitle="Every phone and tablet running the new app, with the business, person, version and when it was last used." />

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-3">
          <label className="relative min-w-[14rem] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search business, person, email or phone model" className={cn(inputCls, 'pl-9 bg-slate-50')} />
          </label>
          <select value={query.platform ?? ''} onChange={(e) => update({ platform: e.target.value || undefined })} className={cn(inputCls, 'w-auto')}>
            <option value="">All platforms</option><option value="android">Android</option><option value="ios">iOS</option>
          </select>
          <select value={query.version ?? ''} onChange={(e) => update({ version: e.target.value || undefined })} className={cn(inputCls, 'w-auto')}>
            <option value="">All versions</option>
            {(targets?.versions ?? []).map((v) => <option key={v.version} value={v.version}>{v.version} ({v.devices})</option>)}
          </select>
          <select value={query.activeDays ?? ''} onChange={(e) => update({ activeDays: e.target.value || undefined })} className={cn(inputCls, 'w-auto')}>
            <option value="">Any time</option><option value="1">Last 24 hours</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option>
          </select>
          <select value={query.sort ?? 'lastSeen'} onChange={(e) => update({ sort: e.target.value === 'lastSeen' ? undefined : e.target.value })} className={cn(inputCls, 'w-auto')}>
            <option value="lastSeen">Last seen</option><option value="firstSeen">Newest install</option><option value="version">Version</option>
          </select>
          {query.tenantId && (
            <button type="button" onClick={() => update({ tenantId: undefined })} className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800">
              {tenantName ?? 'One business'} ✕
            </button>
          )}
        </div>

        {isLoading ? <div className="p-10 text-center text-sm text-slate-500">Loading…</div>
          : error ? <div className="p-10 text-center text-sm text-rose-600">Could not load devices.</div>
          : !data?.items.length ? <div className="p-10 text-center text-sm text-slate-500">No device matches.</div>
          : (
            <div className={cn('overflow-x-auto transition-opacity', isFetching && 'opacity-60')}>
              <table className="w-full min-w-[60rem] text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Business</th><th className="px-3 py-3">Person</th><th className="px-3 py-3">Device</th>
                    <th className="px-3 py-3">Version</th><th className="px-3 py-3">Language</th><th className="px-3 py-3">Push</th>
                    <th className="px-3 py-3">Installed</th><th className="px-5 py-3 text-right">Last seen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.items.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50/60">
                      <td className="px-5 py-3">
                        <Link to={`/mobile/devices/${d.id}`} className="font-semibold text-slate-900 hover:text-teal-700">{d.tenant.name}</Link>
                        <div className="text-xs text-slate-500">{industryLabel(d.tenant.businessType)}</div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-medium text-slate-800">{d.user.fullName}</div>
                        <div className="text-xs text-slate-500">{d.user.role.toLowerCase()}</div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="text-slate-800">{d.deviceModel ?? 'Unknown model'}</div>
                        <div className="text-xs text-slate-500">{PLATFORM_LABEL[d.platform] ?? d.platform} {d.osVersion ?? ''}</div>
                      </td>
                      <td className="px-3 py-3"><span className="font-semibold tabular-nums">{d.appVersion}</span>{d.buildNumber && <span className="text-xs text-slate-500"> ({d.buildNumber})</span>}</td>
                      <td className="px-3 py-3 text-slate-700">{LANGUAGE_LABEL[d.language ?? 'unknown'] ?? d.language}</td>
                      <td className="px-3 py-3">{d.hasPush ? <Pill tone="teal"><BellRing className="h-3 w-3" />On</Pill> : <Pill><BellOff className="h-3 w-3" />Off</Pill>}</td>
                      <td className="px-3 py-3 text-slate-600">{formatDate(d.firstSeenAt)}</td>
                      <td className="px-5 py-3 text-right text-slate-700">{formatRelative(d.lastSeenAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        {data && data.total > 0 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-sm text-slate-600">
            <span>{data.total.toLocaleString()} devices</span>
            <div className="flex items-center gap-2">
              <button type="button" disabled={data.page <= 1} onClick={() => update({ page: String(data.page - 1) })} className="rounded-lg border border-slate-200 p-1.5 disabled:opacity-40" aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></button>
              <span className="tabular-nums">Page {data.page} of {data.pages}</span>
              <button type="button" disabled={data.page >= data.pages} onClick={() => update({ page: String(data.page + 1) })} className="rounded-lg border border-slate-200 p-1.5 disabled:opacity-40" aria-label="Next page"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
