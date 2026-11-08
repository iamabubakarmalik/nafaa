/**
 * Courier accounts per shop (provider, active, last tested, last error,
 * shipments), booking failure rate per courier over 30 days, and the latest
 * courier API errors. API keys are never shown.
 */

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { adminCommerceApi } from '@/api/admin-commerce.api';
import { Card, CommerceHero, dateTime, Empty, enumLabel, Pill, Stat, tableHeadCls, tdCls, thCls, when } from '../components/CommerceUi';

export default function CommerceCouriersPage() {
  const [q, setQ] = useState('');
  const { data, isLoading, error } = useQuery({ queryKey: ['admin-commerce-couriers'], queryFn: () => adminCommerceApi.couriers() });
  const accounts = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (data?.accounts ?? []).filter((a) => !s || `${a.tenantName ?? ''} ${a.provider}`.toLowerCase().includes(s));
  }, [data, q]);
  const booked = (data?.rates ?? []).reduce((s, r) => s + r.booked, 0);
  const failed = (data?.rates ?? []).reduce((s, r) => s + r.failed, 0);

  return (
    <div className="space-y-6">
      <CommerceHero title="Couriers" subtitle="Courier API accounts connected by shops, how often booking fails per courier, and the latest courier errors." />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Courier accounts" value={data?.accounts.length ?? 0} tone="brand" hint={`${(data?.accounts ?? []).filter((a) => a.isActive).length} active`} />
        <Stat label="Accounts with an error" value={(data?.accounts ?? []).filter((a) => a.lastError).length} tone={(data?.accounts ?? []).some((a) => a.lastError) ? 'rose' : undefined} />
        <Stat label="Booked (30 days)" value={booked} tone="emerald" />
        <Stat label="Booking failures (30 days)" value={failed} tone={failed ? 'amber' : undefined} hint={booked + failed ? `${Math.round((failed / (booked + failed)) * 100)}% of attempts` : undefined} />
      </section>

      {error ? <Card><Empty>Could not load couriers.</Empty></Card> : (
        <>
          <section className="grid gap-6 lg:grid-cols-2">
            <Card title="Booking failure rate by courier" subtitle="Last 30 days. A failure is an auto-booking that did not go through.">
              {!data?.rates.length ? <Empty>No bookings in the last 30 days.</Empty> : (
                <div className="-mx-5 -mb-5 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className={tableHeadCls}><tr><th className={thCls}>Courier</th><th className={`${thCls} text-right`}>Booked</th><th className={`${thCls} text-right`}>Failed</th><th className={`${thCls} text-right`}>Failure rate</th><th className={`${thCls} text-right`}>Shops</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.rates.map((r) => (
                        <tr key={r.courier}>
                          <td className={`${tdCls} font-semibold`}>{r.courier === 'UNKNOWN' ? 'Not chosen yet' : enumLabel(r.courier)}</td>
                          <td className={`${tdCls} text-right tabular-nums`}>{r.booked}</td>
                          <td className={`${tdCls} text-right tabular-nums`}>{r.failed}</td>
                          <td className={`${tdCls} text-right tabular-nums ${(r.failureRate ?? 0) > 20 ? 'font-bold text-rose-700' : ''}`}>{r.failureRate == null ? '—' : `${r.failureRate}%`}</td>
                          <td className={`${tdCls} text-right tabular-nums`}>{r.tenants}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
            <Card title="Recent courier errors" subtitle="Account errors and failed bookings, newest first">
              {!data?.recentErrors.length ? <Empty>No courier errors.</Empty> : (
                <ul className="-mx-5 -mb-5 max-h-[22rem] divide-y divide-slate-100 overflow-y-auto text-sm">
                  {data.recentErrors.map((e, i) => (
                    <li key={i} className="px-5 py-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <Pill tone={e.kind === 'account' ? 'rose' : 'amber'}>{e.kind === 'account' ? 'Account' : 'Booking'}</Pill>
                        <span className="font-semibold text-slate-800">{e.courier ? enumLabel(e.courier) : 'Courier'}</span>
                        <Link to={`/tenants/${e.tenantId}`} className="text-xs text-slate-600 hover:text-indigo-700">{e.tenantName}</Link>
                        {e.number && <span className="text-xs text-slate-500">Order {e.number}</span>}
                        <span className="ml-auto text-xs text-slate-500">{dateTime(e.at)}</span>
                      </div>
                      <p className="mt-0.5 break-words text-xs text-slate-700">{e.error}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </section>

          <Card className="overflow-hidden p-0">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
              <h3 className="text-base font-bold text-slate-900">Courier accounts</h3>
              <label className="relative w-full max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search shop or courier"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:border-indigo-400 focus:bg-white" />
              </label>
            </div>
            {isLoading ? <Empty>Loading…</Empty> : !accounts.length ? <Empty>No courier accounts{q ? ' match' : ' yet'}.</Empty> : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[52rem] text-sm">
                  <thead className={tableHeadCls}>
                    <tr><th className={thCls}>Shop</th><th className={thCls}>Courier</th><th className={thCls}>State</th><th className={thCls}>Last tested</th><th className={thCls}>Last sync</th><th className={`${thCls} text-right`}>Shipments</th><th className={thCls}>Last error</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {accounts.map((a) => (
                      <tr key={a.id}>
                        <td className={tdCls}><Link to={`/tenants/${a.tenantId}`} className="font-semibold text-slate-900 hover:text-indigo-700">{a.tenantName ?? a.tenantId}</Link></td>
                        <td className={tdCls}>{enumLabel(a.provider)}</td>
                        <td className={tdCls}><div className="flex gap-1"><Pill tone={a.isActive ? 'emerald' : 'slate'}>{a.isActive ? 'Active' : 'Off'}</Pill>{a.isSandbox && <Pill tone="amber">Sandbox</Pill>}</div></td>
                        <td className={`${tdCls} whitespace-nowrap`}>{when(a.lastTestedAt)}</td>
                        <td className={`${tdCls} whitespace-nowrap`}>{when(a.lastSyncAt)}</td>
                        <td className={`${tdCls} text-right tabular-nums`}>{a.shipments}</td>
                        <td className={`${tdCls} max-w-[20rem] text-xs text-rose-700`}>{a.lastError ?? <span className="text-slate-400">—</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
