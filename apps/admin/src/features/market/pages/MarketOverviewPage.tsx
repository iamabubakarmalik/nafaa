/**
 * Nafaa Market overview: orders, delivered item value (GMV), average order
 * and cancel rate for the chosen days; shops live, paused and waiting for
 * approval; customers; orders by section and city; top shops; stuck orders
 * and a daily trend. Days are Pakistan calendar days.
 */

import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, BarChart3, CheckCircle2, MapPin, PauseCircle, ShoppingBag, Store, UserPlus, Users } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Alert, Card, DateRangeMenu, FilterBar, KpiCard, KpiRow, PageHero, PageShell, Table, TBody, Td, Th, THead, Tr, resolveRange, type DateRangeValue } from '@/design-system/components';
import { usePageGuide } from '@core/components/PageGuide';
import { adminMarketApi } from '@/api/admin-market.api';
import { formatPKR, formatPKRFull, num } from '@/lib/format';
import { Empty, useChartColors } from '@/features/shared/kit';
import { GATE_COLOR, GateTag, GuideButton, MarketGuide, axisValue, shortDay } from '../components/MarketUi';

/** Calendar day key from a local timestamp. */
const dayKey = (t: number) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

export default function MarketOverviewPage() {
  const guide = usePageGuide();
  const navigate = useNavigate();
  const colors = useChartColors();
  const [range, setRange] = useState<DateRangeValue>({ preset: 'month', custom: { from: '', to: '' } });
  const { from, to } = resolveRange(range, 0) ?? { from: '', to: '' };
  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ['admin-market-overview', from, to],
    queryFn: () => adminMarketApi.overview(from, to),
    placeholderData: (prev) => prev,
  });

  // Every day in the range, so quiet days show as zero.
  const series = useMemo(() => {
    const byDay = new Map((data?.daily ?? []).map((d) => [d.day, d]));
    const out: Array<{ day: string; orders: number; gmv: number }> = [];
    if (!from || !to) return out;
    for (let t = Date.parse(`${from}T12:00:00`); t <= Date.parse(`${to}T12:00:00`); t += 86_400_000) {
      const day = dayKey(t);
      out.push(byDay.get(day) ?? { day, orders: 0, gmv: 0 });
    }
    return out;
  }, [data, from, to]);

  const t = data?.totals;
  const s = data?.shops;
  const axis = { stroke: colors.text, fontSize: 11, tickLine: false, axisLine: false } as const;
  const tip = { cursor: { fill: 'rgba(100,116,139,0.08)' }, contentStyle: { borderRadius: 12, border: `1px solid ${colors.grid}`, fontSize: 12 } };
  const maxGate = Math.max(1, ...(data?.byGate ?? []).map((g) => g.orders));

  return (
    <PageShell>
      <PageHero
        title="Nafaa Market"
        chip={from && to ? `${shortDay(from)} – ${shortDay(to)}` : undefined}
        busy={isFetching}
        loading={isLoading}
        actions={<GuideButton onClick={guide.open} />}
        stats={t && s ? [
          { label: 'Orders', value: num(t.orders), hint: `${num(t.buyers)} buyers` },
          { label: 'GMV (delivered)', value: formatPKR(t.gmv), hint: `Average ${formatPKR(t.avgOrder)}` },
          { label: 'Cancel rate', value: `${t.cancelRate}%`, hint: `${num(t.cancelled)} cancelled` },
          { label: 'Live shops', value: num(s.active), hint: `${num(s.listed)} published` },
        ] : undefined}
      />

      {!!data?.stuck && (
        <Alert tone="danger" title={`${num(data.stuck)} stuck order${data.stuck === 1 ? '' : 's'}`} action={<Link to="/market/orders?stuck=1" className="text-[0.8125rem] font-semibold underline">Open orders</Link>}>
          Pending for over 15 minutes, or not sent to the shop after 2 minutes. Call the shop or cancel for the customer.
        </Alert>
      )}
      {!!s?.pending && (
        <Alert tone={data?.requireApproval ? 'warning' : 'info'} title={`${num(s.pending)} shop${s.pending === 1 ? '' : 's'} awaiting approval`} action={<Link to="/market/approvals" className="text-[0.8125rem] font-semibold underline">Review</Link>}>
          {data?.requireApproval ? 'Customers do not see these shops until you approve them.' : 'Approval is off in settings, so these shops are already visible. Review them anyway.'}
        </Alert>
      )}

      <FilterBar>
        <DateRangeMenu value={range} onChange={setRange} startHour={0} allowAll={false} defaultPreset="month" />
      </FilterBar>

      {error ? <Card><Empty>Could not load the overview. Try again in a moment.</Empty></Card> : (
        <>
          <KpiRow cols={5}>
            <KpiCard icon={CheckCircle2} color="#16a34a" label="Delivered" value={num(t?.delivered)} onClick={() => navigate('/market/orders?status=DELIVERED')} />
            <KpiCard icon={Store} color="#4f46e5" label="New shops" value={num(s?.new)} hint="Published in this period" onClick={() => navigate('/market/shops')} />
            <KpiCard icon={PauseCircle} color="#d97706" label="Paused shops" value={num(s?.paused)} onClick={() => navigate('/market/shops?status=paused')} />
            <KpiCard icon={Users} color="#0284c7" label="Customers" value={num(data?.customers.total)} onClick={() => navigate('/market/customers')} />
            <KpiCard icon={UserPlus} color="#db2777" label="New customers" value={num(data?.customers.new)} hint="Signed up in this period" />
          </KpiRow>

          <section className="grid gap-4 lg:grid-cols-2">
            <Card title="Orders per day" description="All Market orders, Pakistan time">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={series} margin={{ left: -16, right: 8, top: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
                    <XAxis dataKey="day" tickFormatter={shortDay} minTickGap={24} {...axis} />
                    <YAxis allowDecimals={false} {...axis} />
                    <Tooltip {...tip} labelFormatter={(d) => shortDay(String(d))} formatter={(v) => [Number(v).toLocaleString('en-PK'), 'Orders']} />
                    <Bar isAnimationActive={false} dataKey="orders" fill={colors.line} radius={[4, 4, 0, 0]} maxBarSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card title="GMV per day" description="Item value of delivered orders">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={series} margin={{ left: 0, right: 8, top: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
                    <XAxis dataKey="day" tickFormatter={shortDay} minTickGap={24} {...axis} />
                    <YAxis tickFormatter={(v) => axisValue(Number(v))} width={48} {...axis} />
                    <Tooltip {...tip} labelFormatter={(d) => shortDay(String(d))} formatter={(v) => [formatPKRFull(Number(v)), 'GMV']} />
                    <Bar isAnimationActive={false} dataKey="gmv" fill={colors.second} radius={[4, 4, 0, 0]} maxBarSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <Card title="By section" description="Orders and GMV per Market section">
              <ul className="space-y-3">
                {(data?.byGate ?? []).map((g) => (
                  <li key={g.gate}>
                    <div className="flex items-center justify-between gap-2 text-[0.8125rem]">
                      <GateTag gate={g.gate} />
                      <span className="text-slate-500">{num(g.orders)} · {formatPKR(g.gmv)}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full" style={{ width: `${(g.orders / maxGate) * 100}%`, background: GATE_COLOR[g.gate] }} />
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
            <Card flush title="By city" description="Shop city">
              {!data?.byCity.length ? <Empty>No orders in this period.</Empty> : (
                <Table>
                  <THead><Tr><Th>City</Th><Th align="right">Orders</Th><Th align="right">GMV</Th></Tr></THead>
                  <TBody>
                    {data.byCity.map((c) => (
                      <Tr key={c.city} interactive onClick={() => navigate(`/market/orders?city=${encodeURIComponent(c.city)}`)}>
                        <Td><span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-slate-400" />{c.city}</span></Td>
                        <Td align="right">{num(c.orders)}</Td>
                        <Td align="right">{formatPKR(c.gmv)}</Td>
                      </Tr>
                    ))}
                  </TBody>
                </Table>
              )}
            </Card>
            <Card flush title="Top shops" description="By GMV in this period">
              {!data?.topShops.length ? <Empty>No orders in this period.</Empty> : (
                <Table>
                  <THead><Tr><Th>Shop</Th><Th align="right">Orders</Th><Th align="right">GMV</Th></Tr></THead>
                  <TBody>
                    {data.topShops.map((r) => (
                      <Tr key={r.shopId} interactive onClick={() => navigate(`/market/shops/${r.shopId}`)}>
                        <Td>
                          <div className="font-medium text-slate-900">{r.name}</div>
                          <div className="text-[0.75rem] text-slate-500">{r.city ?? '—'}</div>
                        </Td>
                        <Td align="right">{num(r.orders)}</Td>
                        <Td align="right">{formatPKR(r.gmv)}</Td>
                      </Tr>
                    ))}
                  </TBody>
                </Table>
              )}
            </Card>
          </section>
        </>
      )}

      {guide.isOpen && (
        <MarketGuide
          search={false}
          title="Nafaa Market"
          description="How the Market is doing and what needs attention today."
          flowTitle="From customer to shop"
          flow={[
            { label: 'Order', hint: 'Customer checks out', icon: ShoppingBag, color: '#4f46e5' },
            { label: 'Shop POS', hint: 'Online Orders', icon: Store, color: '#0284c7' },
            { label: 'Delivered', hint: 'Counts in GMV', icon: CheckCircle2, color: '#16a34a' },
            { label: 'Watch', hint: 'Stuck and approvals', icon: AlertTriangle, color: '#e11d48' },
          ]}
          steps={[
            { icon: BarChart3, color: '#4f46e5', title: 'Pick the days', text: 'The date menu changes every number, chart and table on this page.' },
            { icon: AlertTriangle, color: '#e11d48', title: 'Clear the red boxes', text: 'Stuck orders and shops waiting for approval show at the top. Open them first.' },
            { icon: Store, color: '#0284c7', title: 'Open a shop or city', text: 'Click a top shop or a city to see its shops or orders.' },
          ]}
          tips={['GMV counts the item value of delivered orders only.', 'Cancel rate includes cancelled and refunded orders.', 'Live shops are published, not paused and approved when approval is on.']}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}
