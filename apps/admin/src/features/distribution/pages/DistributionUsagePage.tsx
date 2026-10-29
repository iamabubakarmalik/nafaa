/**
 * Distribution usage (admin): every business that has distribution switched
 * on or a plan that allows it, with its booker logins (what we bill per
 * login), bookers active in the last 30 days, and orders booked. Plans gain
 * the feature in Plans → featureDistribution.
 */

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, Truck, UserCheck, Users } from 'lucide-react';
import { adminDistributionApi } from '@/api/admin-distribution.api';
import { formatPKR } from '@/lib/format';

export default function DistributionUsagePage() {
  const [q, setQ] = useState('');
  const [onlyOn, setOnlyOn] = useState(false);
  const { data, isLoading, error } = useQuery({ queryKey: ['admin-distribution-usage'], queryFn: () => adminDistributionApi.usage() });

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (data?.tenants ?? [])
      .filter((t) => !onlyOn || t.enabled)
      .filter((t) => !s || `${t.name} ${t.businessType ?? ''} ${t.plan?.name ?? ''}`.toLowerCase().includes(s))
      .sort((a, b) => b.bookerLogins - a.bookerLogins || b.orders30d - a.orders30d);
  }, [data, q, onlyOn]);
  const active = (data?.tenants ?? []).filter((t) => t.enabled).length;
  const orders = (data?.tenants ?? []).reduce((s, t) => s + t.orders30d, 0);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-orange-700 via-orange-600 to-amber-500 p-6 text-white shadow-soft">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium"><Truck className="h-3.5 w-3.5" />Wholesale & distribution</div>
        <h2 className="mt-3 text-3xl font-bold">Distribution usage</h2>
        <p className="mt-2 text-sm text-white/85">Booker logins per business — the billable count. Turn the feature on per plan in Plans.</p>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Businesses listed" value={data?.totals.tenants ?? 0} />
        <Stat label="Switched on" value={active} />
        <Stat label="Booker logins" value={data?.totals.bookerLogins ?? 0} tone="orange" />
        <Stat label="Orders (30 days)" value={orders} />
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-3">
          <label className="relative min-w-[14rem] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search business, type or plan"
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:border-orange-400 focus:bg-white" />
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={onlyOn} onChange={(e) => setOnlyOn(e.target.checked)} className="h-4 w-4 accent-orange-600" />Only switched on
          </label>
        </div>

        {isLoading ? <div className="p-10 text-center text-sm text-slate-500">Loading…</div>
          : error ? <div className="p-10 text-center text-sm text-rose-600">Could not load usage.</div>
          : !rows.length ? <div className="p-10 text-center text-sm text-slate-500">No business uses distribution yet.</div>
          : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[56rem] text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Business</th><th className="px-3 py-3">Plan</th><th className="px-3 py-3">Switch</th>
                    <th className="px-3 py-3 text-right">Booker logins</th><th className="px-3 py-3 text-right">Active bookers (30d)</th>
                    <th className="px-3 py-3 text-right">Orders (30d)</th><th className="px-5 py-3 text-right">Order value (30d)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((t) => (
                    <tr key={t.tenantId} className="hover:bg-slate-50/60">
                      <td className="px-5 py-3">
                        <Link to={`/tenants/${t.tenantId}`} className="font-semibold text-slate-900 hover:text-orange-700">{t.name}</Link>
                        <div className="text-xs text-slate-500">{t.businessType ?? '—'} · {t.status}</div>
                      </td>
                      <td className="px-3 py-3">
                        {t.plan ? (
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${t.plan.featureDistribution ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                            {t.plan.name}{t.plan.featureDistribution ? '' : ' · not included'}
                          </span>
                        ) : <span className="text-xs text-slate-400">No plan</span>}
                        {t.subscriptionStatus && <div className="mt-0.5 text-xs text-slate-500">{t.subscriptionStatus}</div>}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${t.enabled ? 'bg-orange-50 text-orange-700' : 'bg-slate-100 text-slate-500'}`}>{t.enabled ? 'On' : 'Off'}</span>
                      </td>
                      <td className="px-3 py-3 text-right"><span className="inline-flex items-center gap-1 font-bold tabular-nums text-slate-900"><Users className="h-3.5 w-3.5 text-slate-400" />{t.bookerLogins}</span></td>
                      <td className="px-3 py-3 text-right"><span className="inline-flex items-center gap-1 tabular-nums text-slate-700"><UserCheck className="h-3.5 w-3.5 text-slate-400" />{t.activeBookers30d}</span></td>
                      <td className="px-3 py-3 text-right tabular-nums text-slate-700">{t.orders30d}</td>
                      <td className="px-5 py-3 text-right font-semibold tabular-nums text-slate-900">{formatPKR(t.orderValue30d)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </section>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: 'orange' }) {
  return (
    <div className={tone === 'orange' ? 'rounded-2xl bg-gradient-to-br from-orange-600 to-amber-600 p-4 text-white' : 'rounded-2xl border border-slate-200 bg-white p-4'}>
      <div className={tone === 'orange' ? 'text-xs text-white/80' : 'text-xs text-slate-500'}>{label}</div>
      <div className="mt-1 text-2xl font-bold tabular-nums">{value.toLocaleString()}</div>
    </div>
  );
}
