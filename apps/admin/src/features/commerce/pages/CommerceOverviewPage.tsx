/**
 * Online store overview: channels by type and health, online orders per day,
 * GMV, delivery and RTO rates, top merchants, couriers in use and where
 * hand-typed orders come from. Dates are Pakistan time.
 */

import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { adminCommerceApi } from '@/api/admin-commerce.api';
import { formatPKR, formatPKRFull } from '@/lib/format';
import { Card, CommerceHero, Empty, enumLabel, inputCls, kindLabel, SERIES, Stat, tableHeadCls, tdCls, thCls } from '../components/CommerceUi';

/** Local calendar date (the admin works in Pakistan time), not the UTC date. */
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const shortDate = (d: string) => new Intl.DateTimeFormat('en-PK', { day: 'numeric', month: 'short' }).format(new Date(`${d}T00:00:00`));
const PRESETS = [{ label: '7 days', days: 7 }, { label: '30 days', days: 30 }, { label: '90 days', days: 90 }];

export default function CommerceOverviewPage() {
  const [to, setTo] = useState(() => iso(new Date()));
  const [from, setFrom] = useState(() => iso(new Date(Date.now() - 29 * 86_400_000)));
  const { data, isLoading, error } = useQuery({ queryKey: ['admin-commerce-overview', from, to], queryFn: () => adminCommerceApi.overview(from, to) });

  // Every day in the range, so quiet days show as zero instead of disappearing.
  const series = useMemo(() => {
    const byDay = new Map((data?.daily ?? []).map((d) => [d.day, d]));
    const out: Array<{ day: string; orders: number; gmv: number }> = [];
    for (let t = Date.parse(`${from}T12:00:00`); t <= Date.parse(`${to}T12:00:00`); t += 86_400_000) {
      const day = iso(new Date(t));
      out.push(byDay.get(day) ?? { day, orders: 0, gmv: 0 });
    }
    return out;
  }, [data, from, to]);

  const t = data?.totals;
  const channelTotal = (data?.channels ?? []).reduce((s, c) => s + c.total, 0);
  const connected = (data?.channels ?? []).reduce((s, c) => s + c.connected, 0);
  const setPreset = (days: number) => { setTo(iso(new Date())); setFrom(iso(new Date(Date.now() - (days - 1) * 86_400_000))); };

  return (
    <div className="space-y-6">
      <CommerceHero title="Online store overview" subtitle="Every shop's online channels and orders in one place: Shopify, Daraz, WooCommerce, custom websites, Foodpanda, Indolj and hand-typed orders.">
        {PRESETS.map((p) => (
          <button key={p.days} type="button" onClick={() => setPreset(p.days)} className="rounded-xl bg-white/15 px-3 py-2 text-xs font-semibold hover:bg-white/25">{p.label}</button>
        ))}
      </CommerceHero>

      {!!data?.pausedTypes.length && (
        <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          Kill switch is on for {data.pausedTypes.map(kindLabel).join(', ')}. Pushes to these channels are paused. <Link to="/commerce/controls" className="font-semibold underline">Controls</Link>
        </div>
      )}

      <section className="flex flex-wrap items-end gap-3">
        <label className="text-xs font-semibold text-slate-600">From<input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className={`${inputCls} mt-1 w-44`} /></label>
        <label className="text-xs font-semibold text-slate-600">To<input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className={`${inputCls} mt-1 w-44`} /></label>
      </section>

      {error ? <Card><Empty>Could not load the overview.</Empty></Card> : (
        <>
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-6">
            <Stat label="Online orders" value={isLoading ? '…' : t?.orders ?? 0} hint={`${t?.merchants ?? 0} shops`} tone="brand" />
            <Stat label="GMV" value={isLoading ? '…' : formatPKR(t?.gmv ?? 0)} hint="Excludes cancelled and returned" />
            <Stat label="Average order" value={isLoading ? '…' : formatPKR(t?.aov ?? 0)} />
            <Stat label="Delivery rate" value={t?.deliveryRate == null ? '—' : `${t.deliveryRate}%`} hint={`${t?.delivered ?? 0} delivered`} tone="emerald" />
            <Stat label="RTO rate" value={t?.rtoRate == null ? '—' : `${t.rtoRate}%`} hint={`${t?.returned ?? 0} returned`} tone={(t?.rtoRate ?? 0) > 20 ? 'rose' : undefined} />
            <Stat label="Channels connected" value={`${connected}/${channelTotal}`} hint={`${t?.cancelled ?? 0} orders cancelled`} />
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <Card title="Online orders per day" subtitle="All shops, Pakistan time">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={series} margin={{ left: -16, right: 8, top: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="day" tickFormatter={shortDate} stroke="#94a3b8" fontSize={11} tickLine={false} minTickGap={24} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip cursor={{ fill: '#f1f5f9' }} labelFormatter={(d) => shortDate(String(d))} formatter={(v) => [Number(v).toLocaleString(), 'Orders']} />
                    <Bar isAnimationActive={false} dataKey="orders" fill={SERIES[0]} radius={[4, 4, 0, 0]} maxBarSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card title="GMV per day" subtitle="Order value, excluding cancelled and returned">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={series} margin={{ left: 0, right: 8, top: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="day" tickFormatter={shortDate} stroke="#94a3b8" fontSize={11} tickLine={false} minTickGap={24} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => formatPKR(Number(v)).replace('Rs ', '')} />
                    <Tooltip cursor={{ fill: '#f1f5f9' }} labelFormatter={(d) => shortDate(String(d))} formatter={(v) => [formatPKRFull(Number(v)), 'GMV']} />
                    <Bar isAnimationActive={false} dataKey="gmv" fill={SERIES[1]} radius={[4, 4, 0, 0]} maxBarSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <Card title="Channels by type" subtitle="All time, across every shop" action={<Link to="/commerce/channels" className="text-xs font-semibold text-indigo-700 hover:underline">All channels</Link>}>
              <MiniTable head={['Type', 'Total', 'Connected', 'Paused', 'Error', 'Orders (range)']}
                rows={(data?.channels ?? []).map((c) => [
                  <Link key="k" to={`/commerce/channels?kind=${c.kind}`} className="font-semibold text-slate-900 hover:text-indigo-700">{kindLabel(c.kind)}</Link>,
                  c.total, c.connected, c.paused, c.error ? <span key="e" className="font-semibold text-rose-700">{c.error}</span> : 0,
                  data?.byKind.find((b) => b.kind === c.kind)?.orders ?? 0,
                ])} empty="No channels connected yet." />
            </Card>
            <Card title="Top shops by online orders" subtitle="In the selected range">
              <MiniTable head={['Shop', 'Orders', 'GMV', 'Delivered', 'Returned']}
                rows={(data?.topMerchants ?? []).map((m) => [
                  <Link key="n" to={`/tenants/${m.tenantId}`} className="font-semibold text-slate-900 hover:text-indigo-700">{m.name}</Link>,
                  m.orders, formatPKR(m.gmv), m.delivered, m.returned,
                ])} empty="No online orders in this range." />
            </Card>
          </section>

          <section className="grid gap-6 lg:grid-cols-3">
            <Card title="Couriers used" subtitle="Orders handed to each courier in the range">
              <MiniTable head={['Courier', 'Orders', 'Shops']} rows={(data?.couriers.used ?? []).map((c) => [enumLabel(c.courier), c.orders, c.tenants])} empty="No courier orders in this range." />
            </Card>
            <Card title="Courier accounts" subtitle="API accounts connected by shops" action={<Link to="/commerce/couriers" className="text-xs font-semibold text-indigo-700 hover:underline">Couriers</Link>}>
              <MiniTable head={['Courier', 'Active', 'Off']} rows={(data?.couriers.accounts ?? []).map((c) => [enumLabel(c.provider), c.active, c.inactive])} empty="No courier accounts yet." />
            </Card>
            <Card title="Manual orders by source" subtitle="Orders typed in by shops (Add order)">
              <MiniTable head={['Source', 'Orders']} rows={(data?.manualSources ?? []).map((s) => [enumLabel(s.source), s.orders])} empty="No manual orders in this range." />
            </Card>
          </section>
        </>
      )}
    </div>
  );
}

function MiniTable({ head, rows, empty }: { head: string[]; rows: Array<Array<ReactNode>>; empty: string }) {
  if (!rows.length) return <Empty>{empty}</Empty>;
  return (
    <div className="-mx-5 -mb-5 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className={tableHeadCls}><tr>{head.map((h, i) => <th key={h} className={`${thCls} ${i ? 'text-right' : ''}`}>{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r, i) => (
            <tr key={i} className="hover:bg-slate-50/60">
              {r.map((c, j) => <td key={j} className={`${tdCls} ${j ? 'text-right tabular-nums text-slate-700' : ''}`}>{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
