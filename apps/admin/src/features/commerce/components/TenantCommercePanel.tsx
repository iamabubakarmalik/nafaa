/** Online store panel on the tenant detail page: the shop's channels, orders, catalog links, couriers and catalog jobs. */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Store } from 'lucide-react';
import { adminCommerceApi } from '@/api/admin-commerce.api';
import { ChannelDrawer } from './ChannelDrawer';
import { ChannelStatus, Empty, enumLabel, JobStatus, kindLabel, Pill, when } from './CommerceUi';

export default function TenantCommercePanel({ tenantId }: { tenantId: string }) {
  const [open, setOpen] = useState<string | null>(null);
  const { data, isLoading, error } = useQuery({ queryKey: ['admin-commerce-tenant', tenantId], queryFn: () => adminCommerceApi.tenant(tenantId) });

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-6 py-4">
        <Store className="h-4 w-4" />
        <h3 className="font-bold">Online store</h3>
        <div className="ml-auto flex gap-3 text-xs font-semibold">
          <Link to={`/commerce/channels?search=${encodeURIComponent(data?.tenant.name ?? '')}`} className="text-indigo-700 hover:underline">Channels</Link>
          <Link to="/commerce/orders" className="text-indigo-700 hover:underline">Orders monitor</Link>
          <Link to="/commerce/jobs" className="text-indigo-700 hover:underline">Catalog jobs</Link>
        </div>
      </div>
      {isLoading ? <Empty>Loading…</Empty> : error || !data ? <Empty>Could not load the online store.</Empty> : (
        <div className="space-y-5 p-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <Mini label="Channels" value={data.channels.length} />
            <Mini label="Online orders" value={data.orders.total} hint={`${data.orders.last30d} in 30 days`} />
            <Mini label="Catalog links" value={data.links} />
            <Mini label="Push failures" value={data.pushFailures} bad={data.pushFailures > 0} />
            <Mini label="Courier accounts" value={data.couriers.length} />
          </div>

          {!!Object.keys(data.orders.byStatus30d).length && (
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(data.orders.byStatus30d).sort((a, b) => b[1] - a[1]).map(([s, n]) => <Pill key={s}>{enumLabel(s)}: {n}</Pill>)}
            </div>
          )}

          {!data.channels.length ? <p className="text-sm text-slate-500">No online channels connected.</p> : (
            <div className="overflow-x-auto rounded-2xl border border-slate-100">
              <table className="w-full min-w-[44rem] text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr><th className="px-4 py-2">Channel</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Last sync</th><th className="px-3 py-2">Last order</th><th className="px-3 py-2 text-right">Links</th><th className="px-4 py-2 text-right">Push failures</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.channels.map((c) => (
                    <tr key={c.id} onClick={() => setOpen(c.id)} className="cursor-pointer hover:bg-slate-50/80">
                      <td className="px-4 py-2.5"><div className="font-medium text-slate-900">{c.name}</div><div className="text-xs text-slate-500">{kindLabel(c.kind)}</div></td>
                      <td className="px-3 py-2.5"><ChannelStatus status={c.status} isActive={c.isActive} /></td>
                      <td className="px-3 py-2.5 text-slate-700">{when(c.lastSyncAt)}</td>
                      <td className="px-3 py-2.5 text-slate-700">{when(c.lastOrderAt)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{c.links}</td>
                      <td className={`px-4 py-2.5 text-right tabular-nums ${c.pushFailures ? 'font-bold text-rose-700' : 'text-slate-400'}`}>{c.pushFailures}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="grid gap-5 lg:grid-cols-2">
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Courier accounts</h4>
              {!data.couriers.length ? <p className="text-sm text-slate-500">None.</p> : (
                <ul className="space-y-1.5 text-sm">
                  {data.couriers.map((a) => (
                    <li key={a.id} className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{enumLabel(a.provider)}</span>
                      <Pill tone={a.isActive ? 'emerald' : 'slate'}>{a.isActive ? 'Active' : 'Off'}</Pill>
                      <span className="text-xs text-slate-500">tested {when(a.lastTestedAt)} · {a.shipments} shipments</span>
                      {a.lastError && <span className="w-full text-xs text-rose-700">{a.lastError}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Recent catalog jobs</h4>
              {!data.jobs.length ? <p className="text-sm text-slate-500">None.</p> : (
                <ul className="space-y-1.5 text-sm">
                  {data.jobs.slice(0, 6).map((j) => (
                    <li key={j.id} className="flex flex-wrap items-center gap-2">
                      <JobStatus status={j.status} stalled={j.stalled} />
                      <span className="font-medium">{enumLabel(j.kind)}</span>
                      <span className="text-xs text-slate-500">{j.done}/{j.total}{j.failed ? `, ${j.failed} failed` : ''} · {when(j.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
      <ChannelDrawer id={open} onClose={() => setOpen(null)} />
    </section>
  );
}

function Mini({ label, value, hint, bad }: { label: string; value: number; hint?: string; bad?: boolean }) {
  return (
    <div className={`rounded-2xl border p-3 ${bad ? 'border-rose-200 bg-rose-50' : 'border-slate-200'}`}>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-0.5 text-lg font-bold tabular-nums">{value.toLocaleString()}</div>
      {hint && <div className="text-xs text-slate-500">{hint}</div>}
    </div>
  );
}
