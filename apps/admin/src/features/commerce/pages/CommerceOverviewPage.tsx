/**
 * Online store overview: channels by type and health, online orders per day,
 * GMV, delivery and RTO rates, top shops, couriers in use and where
 * hand-typed orders come from. Days are Pakistan business days.
 */

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Boxes, CheckCircle2, Lightbulb, Plug, Truck, XCircle } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Alert, Card, DateRangeMenu, FilterBar, KpiCard, KpiRow, PageHero, PageShell, resolveRange, heroButton, type DateRangeValue } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { adminCommerceApi } from '@/api/admin-commerce.api';
import { formatPKR, formatPKRFull } from '@/lib/format';
import { MiniTable, num, useChartColors, Empty } from '@/features/shared/kit';
import { enumLabel, kindLabel } from '../components/CommerceUi';

const shortDate = (d: string) => new Intl.DateTimeFormat('en-PK', { day: 'numeric', month: 'short' }).format(new Date(`${d}T00:00:00`));
/** Calendar day key from a local Date. */
const dayKey = (t: number) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

export default function CommerceOverviewPage() {
  const guide = usePageGuide();
  const colors = useChartColors();
  const [range, setRange] = useState<DateRangeValue>({ preset: 'month', custom: { from: '', to: '' } });
  const { from, to } = resolveRange(range, 0) ?? { from: '', to: '' };
  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ['admin-commerce-overview', from, to],
    queryFn: () => adminCommerceApi.overview(from, to),
    placeholderData: (prev) => prev,
  });

  // Every day in the range, so quiet days show as zero instead of disappearing.
  const series = useMemo(() => {
    const byDay = new Map((data?.daily ?? []).map((d) => [d.day, d]));
    const out: Array<{ day: string; orders: number; gmv: number }> = [];
    for (let t = Date.parse(`${from}T12:00:00`); t <= Date.parse(`${to}T12:00:00`); t += 86_400_000) {
      const day = dayKey(t);
      out.push(byDay.get(day) ?? { day, orders: 0, gmv: 0 });
    }
    return out;
  }, [data, from, to]);

  const t = data?.totals;
  const channelTotal = (data?.channels ?? []).reduce((s, c) => s + c.total, 0);
  const connected = (data?.channels ?? []).reduce((s, c) => s + c.connected, 0);
  const axis = { stroke: colors.text, fontSize: 11, tickLine: false, axisLine: false } as const;
  const tip = { cursor: { fill: 'rgba(100,116,139,0.08)' }, contentStyle: { borderRadius: 12, border: `1px solid ${colors.grid}`, fontSize: 12 } };

  return (
    <PageShell>
      <PageHero
        title="Online store"
        chip={from && to ? `${shortDate(from)} – ${shortDate(to)}` : undefined}
        busy={isFetching}
        loading={isLoading}
        actions={<button type="button" className={heroButton} onClick={guide.open} aria-label="How this page works (G)"><Lightbulb className="h-4 w-4" /></button>}
        stats={t ? [
          { label: 'Online orders', value: num(t.orders), hint: `${num(t.merchants)} shops` },
          { label: 'Sales value (GMV)', value: formatPKR(t.gmv), hint: 'Without cancelled and returned' },
          { label: 'Delivery rate', value: t.deliveryRate == null ? '—' : `${t.deliveryRate}%`, hint: `${num(t.delivered)} delivered` },
          { label: 'Return rate (RTO)', value: t.rtoRate == null ? '—' : `${t.rtoRate}%`, hint: `${num(t.returned)} returned` },
        ] : undefined}
      />

      {!!data?.pausedTypes.length && (
        <Alert tone="danger" title="Kill switch is on" action={<Link to="/commerce/controls" className="text-[0.8125rem] font-semibold underline">Open controls</Link>}>
          Pushes to {data.pausedTypes.map(kindLabel).join(', ')} are paused for every shop.
        </Alert>
      )}

      <FilterBar>
        <DateRangeMenu value={range} onChange={setRange} startHour={0} allowAll={false} defaultPreset="month" />
      </FilterBar>

      {error ? <Card><Empty>Could not load the overview.</Empty></Card> : (
        <>
          <KpiRow cols={3}>
            <KpiCard icon={Boxes} color="#4f46e5" label="Average order" value={formatPKR(t?.aov ?? 0)} />
            <KpiCard icon={Plug} color="#0d9488" label="Channels connected" value={`${connected} of ${channelTotal}`} />
            <KpiCard icon={XCircle} color="#e11d48" label="Cancelled orders" value={num(t?.cancelled)} />
          </KpiRow>

          <section className="grid gap-4 lg:grid-cols-2">
            <Card title="Orders per day" description="All shops, Pakistan time">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={series} margin={{ left: -16, right: 8, top: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
                    <XAxis dataKey="day" tickFormatter={shortDate} minTickGap={24} {...axis} />
                    <YAxis allowDecimals={false} {...axis} />
                    <Tooltip {...tip} labelFormatter={(d) => shortDate(String(d))} formatter={(v) => [Number(v).toLocaleString('en-PK'), 'Orders']} />
                    <Bar isAnimationActive={false} dataKey="orders" fill={colors.line} radius={[4, 4, 0, 0]} maxBarSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card title="Sales value per day" description="Order value, without cancelled and returned">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={series} margin={{ left: 0, right: 8, top: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
                    <XAxis dataKey="day" tickFormatter={shortDate} minTickGap={24} {...axis} />
                    <YAxis tickFormatter={(v) => formatPKR(Number(v)).replace('Rs ', '')} {...axis} />
                    <Tooltip {...tip} labelFormatter={(d) => shortDate(String(d))} formatter={(v) => [formatPKRFull(Number(v)), 'Sales value']} />
                    <Bar isAnimationActive={false} dataKey="gmv" fill={colors.second} radius={[4, 4, 0, 0]} maxBarSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <Card flush title="Channels by type" description="All time, across every shop" actions={<Link to="/commerce/channels" className="text-[0.8125rem] font-semibold text-brand-700 hover:underline">All channels</Link>}>
              <MiniTable minWidth="30rem" head={['Type', 'Total', 'Connected', 'Paused', 'Error', 'Orders']}
                rows={(data?.channels ?? []).map((c) => [
                  <Link key="k" to={`/commerce/channels?kind=${c.kind}`} className="font-semibold text-slate-900 hover:text-brand-700">{kindLabel(c.kind)}</Link>,
                  c.total, c.connected, c.paused, c.error ? <span key="e" className="font-semibold text-rose-700">{c.error}</span> : 0,
                  data?.byKind.find((b) => b.kind === c.kind)?.orders ?? 0,
                ])} empty="No channels connected yet." />
            </Card>
            <Card flush title="Top shops by online orders" description="In the selected period">
              <MiniTable minWidth="28rem" head={['Shop', 'Orders', 'Sales value', 'Delivered', 'Returned']}
                rows={(data?.topMerchants ?? []).map((m) => [
                  <Link key="n" to={`/tenants/${m.tenantId}`} className="font-semibold text-slate-900 hover:text-brand-700">{m.name}</Link>,
                  m.orders, formatPKR(m.gmv), m.delivered, m.returned,
                ])} empty="No online orders in this period." />
            </Card>
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <Card flush title="Couriers used" description="Orders handed to each courier">
              <MiniTable head={['Courier', 'Orders', 'Shops']} rows={(data?.couriers.used ?? []).map((c) => [enumLabel(c.courier), c.orders, c.tenants])} empty="No courier orders in this period." />
            </Card>
            <Card flush title="Courier accounts" description="Connected by shops" actions={<Link to="/commerce/couriers" className="text-[0.8125rem] font-semibold text-brand-700 hover:underline">Couriers</Link>}>
              <MiniTable head={['Courier', 'Active', 'Off']} rows={(data?.couriers.accounts ?? []).map((c) => [enumLabel(c.provider), c.active, c.inactive])} empty="No courier accounts yet." />
            </Card>
            <Card flush title="Manual orders by source" description="Typed in by shops (Add order)">
              <MiniTable head={['Source', 'Orders']} rows={(data?.manualSources ?? []).map((s) => [enumLabel(s.source), s.orders])} empty="No manual orders in this period." />
            </Card>
          </section>
        </>
      )}

      {guide.isOpen && (
        <PageGuide
          title="Online store"
          description="Orders and channels of every shop that sells online, in one place."
          flowTitle="How an online order moves"
          flow={[
            { label: 'Order arrives', hint: 'Shopify, Daraz, website…', icon: Plug, color: '#4f46e5' },
            { label: 'Shop confirms', hint: 'Bill is made', icon: CheckCircle2, color: '#0284c7' },
            { label: 'Courier', hint: 'Booked and dispatched', icon: Truck, color: '#d97706' },
            { label: 'Delivered or returned', hint: 'Delivery and return rate', icon: Boxes, color: '#059669' },
          ]}
          steps={[
            { icon: Boxes, color: '#4f46e5', title: 'Pick a period', text: 'The numbers, charts and tables follow the period in the filter bar.' },
            { icon: Plug, color: '#0d9488', title: 'Check channels', text: 'Open "All channels" to see sync errors, then act from the channel panel.' },
            { icon: AlertTriangle, color: '#e11d48', title: 'Watch returns', text: 'A high return rate means shops are losing money on shipping. Check the couriers page.' },
          ]}
          tips={['A red banner means a kill switch is on and pushes are paused.', 'Click a channel type to open the channels list filtered to it.']}
          shortcuts={[['G', 'This guide']]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}
