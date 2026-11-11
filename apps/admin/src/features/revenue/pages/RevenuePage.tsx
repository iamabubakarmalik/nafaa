/**
 * Revenue: monthly recurring revenue from plans and add-ons, how many shops
 * pay, are on trial, in grace or grandfathered, and payments approved in
 * the last 30 days. Each shop counts once, by the plan that decides its access.
 */

import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Banknote, Gift, Hourglass, Lightbulb, Puzzle, Receipt, Sparkles, TrendingUp, Users } from 'lucide-react';
import { Card, KpiCard, KpiRow, PageHero, PageShell, Skeleton, Table, TBody, Td, Th, THead, Tr, heroButton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { adminBillingCatalogApi } from '@/api/admin-billing-catalog.api';
import { formatDate, formatPKR, formatPKRFull, num } from '@/lib/format';
import { useChartColors } from '@/ui';

/** Short axis label: 1.2Cr, 90L, 30K. */
function axisValue(v: number) {
  if (v >= 1e7) return `${+(v / 1e7).toFixed(1)}Cr`;
  if (v >= 1e5) return `${+(v / 1e5).toFixed(1)}L`;
  if (v >= 1e3) return `${+(v / 1e3).toFixed(1)}K`;
  return String(v);
}
const shortDate = (key: string) => new Date(`${key}T00:00:00`).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });

export default function RevenuePage() {
  const guide = usePageGuide();
  const colors = useChartColors();
  const q = useQuery({ queryKey: ['admin', 'billing', 'revenue'], queryFn: adminBillingCatalogApi.revenue, refetchInterval: 5 * 60_000 });
  const r = q.data;

  const axis = { stroke: colors.text, fontSize: 11, tickLine: false, axisLine: false } as const;
  const tooltipStyle = { borderRadius: 12, border: `1px solid ${colors.grid}`, fontSize: 12 };
  const planBars = (r?.byPlan ?? []).filter((p) => p.mrr > 0 || p.paying > 0);
  const addOnBars = (r?.addOns ?? []).filter((a) => a.mrr > 0);

  return (
    <PageShell>
      <PageHero
        title="Revenue"
        chip="Per month"
        busy={q.isFetching}
        loading={q.isLoading}
        actions={<button type="button" className={heroButton} onClick={guide.open} aria-label="How this page works (G)"><Lightbulb className="h-4 w-4" /></button>}
        stats={r ? [
          { label: 'Monthly recurring revenue', value: formatPKR(r.mrr), hint: `${formatPKR(r.planMrr)} plans · ${formatPKR(r.addOnMrr)} add-ons` },
          { label: 'Paying shops', value: num(r.payingShops) },
          { label: 'On trial', value: num(r.states.trial) },
          { label: 'In grace', value: num(r.states.grace), hint: r.graceAtRisk ? `${formatPKR(r.graceAtRisk)} a month at risk` : `${r.graceDays} grace days` },
        ] : undefined}
      />

      <KpiRow cols={4}>
        <KpiCard icon={Banknote} color="#059669" label="Payments, last 30 days" value={r ? formatPKR(r.payments30.total) : '—'} hint={r ? `${num(r.payments30.count)} approved` : undefined} />
        <KpiCard icon={Gift} color="#db2777" label="Grandfathered shops" value={r ? num(r.grandfathered.count) : '—'} hint="Free until their date" />
        <KpiCard icon={Users} color="#4f46e5" label="On the free plan" value={r ? num(r.states.free) : '—'} />
        <KpiCard icon={Hourglass} color="#e11d48" label="Expired" value={r ? num(r.states.expired) : '—'} hint="Not paid after grace" />
      </KpiRow>

      {!r ? <Skeleton className="h-96 rounded-3xl" /> : (
        <>
          <div className="grid gap-4 xl:grid-cols-2">
            <Card title="Monthly revenue by plan" description="Paying shops only. Quarterly and yearly payments are spread over their months.">
              {planBars.length ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={planBars} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke={colors.grid} strokeDasharray="3 3" />
                      <XAxis dataKey="name" {...axis} />
                      <YAxis tickFormatter={axisValue} width={52} {...axis} />
                      <Tooltip cursor={{ fill: 'rgba(100,116,139,0.08)' }} contentStyle={tooltipStyle} formatter={(v) => [formatPKRFull(Number(v)), 'Per month']} />
                      <Bar dataKey="mrr" fill={colors.line} radius={[4, 4, 0, 0]} maxBarSize={48} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : <p className="py-10 text-center text-[0.8125rem] text-slate-500">No paying shops yet.</p>}
            </Card>
            <Card title="Payments approved, last 30 days" description="Plan and add-on payments, per Pakistan day.">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={r.payments30.daily} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke={colors.grid} strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={shortDate} minTickGap={24} {...axis} />
                    <YAxis tickFormatter={axisValue} width={52} {...axis} />
                    <Tooltip cursor={{ fill: 'rgba(100,116,139,0.08)' }} contentStyle={tooltipStyle} labelFormatter={(l) => shortDate(String(l))} formatter={(v) => [formatPKRFull(Number(v)), 'Approved']} />
                    <Bar dataKey="amount" fill={colors.second} radius={[4, 4, 0, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <Card title="Plans" description="Shops by state on each plan." flush>
            <Table minWidth="44rem">
              <THead><Tr><Th>Plan</Th><Th align="right">Paying</Th><Th align="right">Active</Th><Th align="right">Trial</Th><Th align="right">Grace</Th><Th align="right">Free</Th><Th align="right">Per month</Th></Tr></THead>
              <TBody>
                {r.byPlan.map((p) => (
                  <Tr key={p.planId}>
                    <Td><span className="font-semibold text-slate-900">{p.name}</span>{!p.isActive && <span className="ms-2 text-[0.75rem] text-slate-500">off</span>}</Td>
                    <Td align="right">{num(p.paying)}</Td>
                    <Td align="right">{num(p.active)}</Td>
                    <Td align="right">{num(p.trial)}</Td>
                    <Td align="right">{p.grace ? <span className="text-amber-700">{num(p.grace)}</span> : '0'}</Td>
                    <Td align="right">{num(p.free)}</Td>
                    <Td align="right" className="font-semibold text-slate-900">{formatPKRFull(p.mrr)}</Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </Card>

          <div className="grid gap-4 xl:grid-cols-3">
            <Card className="xl:col-span-2" title="Add-ons" description="Paid and running, free (trial, grandfather or admin gift), and waiting for payment." flush
              actions={<Link to="/addons" className="text-[0.8125rem] font-semibold text-brand-700 hover:underline">Manage add-ons</Link>}>
              {addOnBars.length > 0 && (
                <div className="h-56 px-4 pt-2 sm:px-5">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={addOnBars} layout="vertical" margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid horizontal={false} stroke={colors.grid} strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={axisValue} {...axis} />
                      <YAxis type="category" dataKey="name" width={130} {...axis} />
                      <Tooltip cursor={{ fill: 'rgba(100,116,139,0.08)' }} contentStyle={tooltipStyle} formatter={(v) => [formatPKRFull(Number(v)), 'Per month']} />
                      <Bar dataKey="mrr" fill={colors.line} radius={[0, 4, 4, 0]} maxBarSize={18} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              <Table minWidth="40rem">
                <THead><Tr><Th>Add-on</Th><Th align="right">Paying</Th><Th align="right">Free</Th><Th align="right">Waiting</Th><Th align="right">Off, unpaid</Th><Th align="right">Per month</Th></Tr></THead>
                <TBody>
                  {r.addOns.map((a) => (
                    <Tr key={a.key}>
                      <Td className="font-medium text-slate-900">{a.name}</Td>
                      <Td align="right">{num(a.paying)}</Td>
                      <Td align="right">{num(a.free)}</Td>
                      <Td align="right">{num(a.pendingPayment)}</Td>
                      <Td align="right">{num(a.pastDue)}</Td>
                      <Td align="right" className="font-semibold text-slate-900">{formatPKRFull(a.mrr)}</Td>
                    </Tr>
                  ))}
                  {!r.addOns.length && <Tr><Td colSpan={6} className="py-6 text-center text-slate-500">No shop has an add-on yet.</Td></Tr>}
                </TBody>
              </Table>
            </Card>
            <Card title="Grandfather period ends" description="Existing shops keep everything free until these dates." flush>
              <ul className="divide-y divide-slate-100">
                {r.grandfathered.byDay.map((d) => (
                  <li key={d.date} className="flex items-center justify-between px-4 py-2.5 text-[0.8125rem] sm:px-5">
                    <span className="text-slate-700">{formatDate(`${d.date}T12:00:00`)}</span>
                    <b className="tabular-nums text-slate-900">{num(d.count)} shops</b>
                  </li>
                ))}
                {!r.grandfathered.byDay.length && <li className="px-5 py-6 text-[0.8125rem] text-slate-500">No shop is grandfathered.</li>}
              </ul>
            </Card>
          </div>
        </>
      )}

      {guide.isOpen && (
        <PageGuide
          title="Revenue"
          description="What Nafaa earns each month from plans and add-ons, and which shops may pay next."
          flowTitle="Where a shop is"
          flow={[
            { label: 'Trial', icon: Sparkles, color: '#0284c7' },
            { label: 'Paying', hint: 'Counts in revenue', icon: Banknote, color: '#059669' },
            { label: 'Grace', hint: 'At risk', icon: Hourglass, color: '#d97706' },
            { label: 'Expired', icon: Receipt, color: '#e11d48' },
          ]}
          steps={[
            { icon: TrendingUp, color: '#4f46e5', title: 'Monthly revenue', text: 'Each paying shop’s plan price for one month (a yearly price is divided by 12), plus its paid add-ons at their monthly price.' },
            { icon: Users, color: '#0284c7', title: 'One shop, one plan', text: 'A shop counts once, by the plan that decides what it can use right now.' },
            { icon: Puzzle, color: '#059669', title: 'Add-ons', text: 'Free add-ons (trial, grandfather, gifts) are counted but add nothing to revenue.' },
            { icon: Gift, color: '#db2777', title: 'Grandfathered', text: 'Shops from before the new prices. Watch the end dates: that is when they choose a plan.' },
          ]}
          tips={['Plans given free by an admin (price 0) are not counted as paying.', 'Numbers refresh every 5 minutes.']}
          shortcuts={[['G', 'This guide']]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}
