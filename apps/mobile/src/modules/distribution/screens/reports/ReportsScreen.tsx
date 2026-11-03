/**
 * Distribution reports. Three views:
 *   DSR      one business day per booker: planned and visited shops, strike
 *            rate, orders, lines per call, drop size, no-order reasons,
 *            recovery and working hours.
 *   Summary  the chosen period: booked vs invoiced, delivery outcomes,
 *            returns, cash at the door, recoveries, and the split by route,
 *            booker, product and scheme.
 *   Visits   per booker per day: productive and unproductive shops, strike
 *            rate, time in market, distance and GPS flags.
 * Each view can be shared as text. Print and CSV stay on the web.
 */

import { useQuery } from '@tanstack/react-query';
import { MapPin, Navigation, Share2, ShoppingBag, Truck, Wallet } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import {
  Card, DatePicker, DonutChart, EmptyState, HBarList, IconButton, ListGroup, ListRow, Row, Screen, Segmented, Select, SkeletonRows, StatTile, StatusPill, Text, useTheme,
} from '@/design';
import { DIST_KEY, distributionApi, type Dsr, type DistSummary } from '../../api/distribution.api';
import { phase2Api, type VisitAnalytics } from '../../api/phase2.api';
import { DistributionGate } from '../../components/DistributionGate';
import { CachedNote, shareText } from '../../components/parts';
import { dayKeyLabel, dayTime, rs, trim } from '../../lib/meta';
import { fromYmd, monthStartKey, todayKey, ymd } from '../../lib/setup';

type View_ = 'dsr' | 'summary' | 'visits';
const hm = (min: number) => `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`;
const hour = (h: number | null) => (h == null ? '—' : `${((h + 11) % 12) + 1}${h < 12 ? 'am' : 'pm'}`);

export function ReportsScreen() {
  return <DistributionGate title={t('Reports')}><Body /></DistributionGate>;
}

function Body() {
  const th = useTheme();
  const [view, setView] = useState<View_>('dsr');
  const [date, setDate] = useState(todayKey());
  const [from, setFrom] = useState(monthStartKey());
  const [to, setTo] = useState(todayKey());
  const [routeId, setRouteId] = useState('');
  const [bookerId, setBookerId] = useState('');
  const routesQ = useQuery({ queryKey: [DIST_KEY, 'routes'], queryFn: () => distributionApi.routes(), staleTime: 5 * 60_000 });
  const filters = { routeId: routeId || undefined, bookerId: bookerId || undefined };
  const dsrQ = useQuery({ queryKey: [DIST_KEY, 'dsr', date, filters], queryFn: () => distributionApi.dsr({ date, ...filters }), enabled: view === 'dsr' });
  const sumQ = useQuery({ queryKey: [DIST_KEY, 'summary', from, to, filters], queryFn: () => distributionApi.summary({ from, to, ...filters }), enabled: view === 'summary' });
  const visitsQ = useQuery({ queryKey: [DIST_KEY, 'visits-report', from, to, filters], queryFn: () => phase2Api.visits({ from, to, ...filters, flags: true }), enabled: view === 'visits' });
  const active = view === 'dsr' ? dsrQ : view === 'summary' ? sumQ : visitsQ;

  const bookers = (() => {
    const m = new Map<string, string>();
    (routesQ.data ?? []).forEach((r) => { if (r.bookerId) m.set(r.bookerId, r.bookerName ?? t('Booker')); });
    return [...m.entries()];
  })();

  const share = () => {
    if (view === 'dsr' && dsrQ.data) void shareText(dsrText(dsrQ.data));
    else if (view === 'summary' && sumQ.data) void shareText(summaryText(sumQ.data));
    else if (view === 'visits' && visitsQ.data) void shareText(visitsText(visitsQ.data));
  };

  return (
    <Screen title={t('Reports')} onRefresh={() => void active.refetch()} refreshing={active.isRefetching}
      actions={<IconButton icon={Share2} label={t('Share')} disabled={!active.data} onPress={share} />}>
      <Segmented value={view} onChange={setView} size="sm" options={[{ value: 'dsr', label: t('DSR (din)') }, { value: 'summary', label: t('Period summary') }, { value: 'visits', label: t('Visits') }]} />
      {view === 'dsr' ? (
        <DatePicker label={t('Din')} value={fromYmd(date)} onChange={(d) => setDate(ymd(d))} />
      ) : (
        <Row gap={2}>
          <View style={{ flex: 1 }}><DatePicker label={t('Se')} value={fromYmd(from)} onChange={(d) => setFrom(ymd(d))} /></View>
          <View style={{ flex: 1 }}><DatePicker label={t('Tak')} value={fromYmd(to)} onChange={(d) => setTo(ymd(d))} /></View>
        </Row>
      )}
      <Row gap={2}>
        <View style={{ flex: 1 }}><Select placeholder={t('Sab routes')} value={routeId} onChange={setRouteId} options={[{ value: '', label: t('Sab routes') }, ...(routesQ.data ?? []).map((r) => ({ value: r.id, label: r.name }))]} /></View>
        <View style={{ flex: 1 }}><Select placeholder={t('Sab bookers')} value={bookerId} onChange={setBookerId} options={[{ value: '', label: t('Sab bookers') }, ...bookers.map(([id, name]) => ({ value: id, label: name }))]} /></View>
      </Row>
      <CachedNote query={active} />
      <View style={{ gap: th.space(4) }}>
        {view === 'dsr' ? <DsrView q={dsrQ} /> : view === 'summary' ? <SummaryView q={sumQ} /> : <VisitsView q={visitsQ} />}
      </View>
    </Screen>
  );
}

type Q<T> = { data?: T; isLoading: boolean; error: unknown };

function Wait<T>({ q, children }: { q: Q<T>; children: (d: T) => React.ReactNode }) {
  if (q.isLoading) return <SkeletonRows count={4} />;
  if (!q.data) return <EmptyState compact title={t('Report abhi aa rahi hai')} />;
  return <>{children(q.data)}</>;
}

function Tiles({ items }: { items: React.ComponentProps<typeof StatTile>[] }) {
  const rows: React.ComponentProps<typeof StatTile>[][] = [];
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));
  return (
    <View style={{ gap: 8 }}>
      {rows.map((r, i) => <Row key={i} gap={2}>{r.map((p) => <StatTile key={p.label} style={{ flex: 1 }} {...p} />)}{r.length === 1 && <View style={{ flex: 1 }} />}</Row>)}
    </View>
  );
}

/* ───────────── DSR ───────────── */

function DsrView({ q }: { q: Q<Dsr> }) {
  const th = useTheme();
  return (
    <Wait q={q}>{(data) => {
      const x = data.totals;
      return (
        <>
          <Tiles items={[
            { icon: MapPin, label: t('Visits'), value: `${x.visited}/${x.planned}`, hint: t('kiye / plan') },
            { icon: ShoppingBag, tone: 'success', label: t('Strike rate'), value: `${Math.round(x.strikeRate)}%`, hint: t('{{productive}} dukanon par order', { productive: x.productive }) },
            { icon: Truck, tone: 'accent', label: t('Orders'), value: String(x.orders), hint: t('{{lines}} lines', { lines: x.lines }) },
            { icon: Wallet, tone: 'info', label: t('Order value'), value: rs(x.value), hint: x.orders ? t('ausat {{value}}', { value: rs(x.value / x.orders) }) : '—' },
          ]} />
          <StatTile icon={Wallet} tone="success" label={t('Recovery')} value={rs(x.collected)} hint={dayKeyLabel(data.date)} />
          {!data.bookers.length ? <EmptyState compact title={t('Is din kisi booker ka visit ya order nahi.')} /> : data.bookers.map((b) => (
            <Card key={b.bookerId} title={b.bookerName} description={b.routes.join(', ')}
              action={<StatusPill tone={b.strikeRate >= 70 ? 'success' : b.strikeRate >= 40 ? 'warning' : 'danger'}>{Math.round(b.strikeRate)}%</StatusPill>}>
              <View style={{ gap: th.space(1) }}>
                <KV k={t('Visits')} v={`${b.visited}/${b.planned}${b.outOfRangeCheckIns > 0 ? ` · ${b.outOfRangeCheckIns}!` : ''}`} />
                <KV k={t('Orders')} v={String(b.orders)} />
                <KV k={t('Value')} v={rs(b.value)} strong />
                <KV k={t('Lines/call')} v={String(b.linesPerCall)} />
                <KV k={t('Drop size')} v={rs(b.dropSize)} />
                <KV k={t('Recovery')} v={rs(b.collected) + (b.collectedPending > 0 ? ` (${rs(b.collectedPending)} ${t('Verify baqi')})` : '')} />
                <KV k={t('Kaam ke ghante')} v={`${hour(b.firstActivityHour)} – ${hour(b.lastActivityHour)}`} />
                {b.noOrder.length > 0 && <Text size="xs" tone="muted">{t('Order kyun nahi')}: {b.noOrder.map((n) => `${n.label} (${n.count})`).join(', ')}</Text>}
              </View>
            </Card>
          ))}
        </>
      );
    }}</Wait>
  );
}

function KV({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <Row gap={2} justify="between">
      <Text size="sm" tone="muted" style={{ flexShrink: 1 }}>{k}</Text>
      <Text size="sm" weight={strong ? 'bold' : 'medium'} tabular ltr>{v}</Text>
    </Row>
  );
}

/* ───────────── summary ───────────── */

function SummaryView({ q }: { q: Q<DistSummary> }) {
  return (
    <Wait q={q}>{(data) => {
      const inv = data.invoiced;
      const settled = inv.delivered + inv.partial + inv.returned;
      return (
        <>
          <Tiles items={[
            { icon: ShoppingBag, tone: 'warning', label: t('Booked'), value: rs(data.booked.value), hint: t('{{orders}} orders · {{cancelled}} cancel', { orders: data.booked.orders, cancelled: data.booked.cancelled }) },
            { icon: Truck, tone: 'accent', label: t('Invoiced'), value: rs(inv.value), hint: t('{{invoices}} invoices', { invoices: inv.invoices }) },
            { icon: Truck, tone: 'success', label: t('Delivery'), value: `${inv.delivered}/${settled || 0}`, hint: t('{{partial}} kuch · {{returned}} sab wapas · {{notSettled}} baqi', { partial: inv.partial, returned: inv.returned, notSettled: inv.notSettled }) },
            { icon: Truck, tone: 'danger', label: t('Wapas aaya'), value: rs(inv.returnsValue), hint: inv.value ? t('{{value}}% Invoice ka', { value: ((inv.returnsValue / inv.value) * 100).toFixed(1) }) : '—' },
          ]} />
          <StatTile icon={Wallet} tone="success" label={t('Cash + recovery')} value={rs(inv.cashAtDelivery + data.recoveries.verified)} hint={t('Recovery {{verified}}', { verified: rs(data.recoveries.verified) })} />
          <Card title={t('Delivery')}>
            <DonutChart
              slices={[
                { key: 'd', label: t('Poora deliver'), value: inv.delivered },
                { key: 'p', label: t('Kuch wapas'), value: inv.partial },
                { key: 'r', label: t('Sab wapas'), value: inv.returned },
                { key: 'n', label: t('Baqi'), value: inv.notSettled },
              ].filter((s) => s.value > 0)}
              center={<Text weight="bold" size="lg">{settled + inv.notSettled}</Text>}
            />
          </Card>
          <Card title={t('Route war')}>
            {data.byRoute.length ? <HBarList colorful rows={data.byRoute.map((r) => ({ key: r.routeId ?? 'none', label: r.routeName ?? t('Route nahi'), value: r.value, display: rs(r.value), hint: `${r.invoices} ${t('Invoices')} · ${t('Wapas')} ${rs(r.returns)} · ${t('Cash')} ${rs(r.cash)}` }))} /> : <Text size="sm" tone="muted">{t('Is period me koi Invoice nahi.')}</Text>}
          </Card>
          <Card title={t('Booker war')}>
            {data.byBooker.length ? <HBarList colorful rows={data.byBooker.map((r) => ({ key: r.bookerId, label: r.bookerName ?? '—', value: r.value, display: rs(r.value), hint: `${r.invoices} ${t('Invoices')} · ${t('Wapas')} ${rs(r.returns)} · ${t('Cash')} ${rs(r.cash)}` }))} /> : <Text size="sm" tone="muted">{t('Is period me koi Invoice nahi.')}</Text>}
          </Card>
          <Card title={t('Top products')}>
            {data.topProducts.length ? <HBarList rows={data.topProducts.slice(0, 10).map((p) => ({ key: p.productId, label: p.name, value: p.value, display: rs(p.value), hint: `${trim(p.baseQty)} ${p.baseUnit}` }))} /> : <Text size="sm" tone="muted">{t('Is period me koi Invoice nahi.')}</Text>}
          </Card>
          <Card title={t('Schemes')} description={t('Kitna discount aur free maal diya')} flush>
            {data.bySchemes.length ? (
              <ListGroup>
                {data.bySchemes.map((s) => (
                  <ListRow key={s.schemeId} dense title={s.name} subtitle={`${s.lines} ${t('Lines')}${s.freeBaseQty ? ` · ${trim(s.freeBaseQty)} free` : ''}${s.isClaimable ? ` · ${t('Claim')}` : ''}`} trailing={<Text weight="bold" tabular ltr>{rs(s.discount)}</Text>} />
                ))}
              </ListGroup>
            ) : <View style={{ padding: 16 }}><Text size="sm" tone="muted">{t('Is period me koi scheme nahi lagi.')}</Text></View>}
          </Card>
        </>
      );
    }}</Wait>
  );
}

/* ───────────── visits ───────────── */

function VisitsView({ q }: { q: Q<VisitAnalytics> }) {
  const th = useTheme();
  return (
    <Wait q={q}>{(data) => {
      const x = data.totals;
      return (
        <>
          <Tiles items={[
            { icon: MapPin, label: t('Visits'), value: `${x.visited}/${x.planned}`, hint: t('kiye / plan') },
            { icon: ShoppingBag, tone: 'success', label: t('Strike rate'), value: `${Math.round(x.strikeRate)}%`, hint: t('{{productive}} order wali · {{unproductive}} bina order', { productive: x.productive, unproductive: x.unproductive }) },
            { icon: Wallet, tone: 'accent', label: t('Orders'), value: String(x.orders), hint: rs(x.value) },
            { icon: Navigation, tone: 'info', label: t('Safar'), value: `${trim(x.travelledKm)} km`, hint: t('check-ins ke beech seedhi doori') },
          ]} />
          <StatTile icon={MapPin} tone={x.farFromShop || x.noGps ? 'danger' : 'success'} label={t('GPS flags')} value={String(x.farFromShop + x.noGps)} hint={t('{{farFromShop}} door se · {{noGps}} bina GPS', { farFromShop: x.farFromShop, noGps: x.noGps })} />
          {!data.rows.length ? <EmptyState compact title={t('Is period me koi visit ya plan nahi.')} /> : data.rows.map((r) => {
            const flags = r.flags.farFromShop + r.flags.noGps + r.flags.poorAccuracy;
            return (
              <Card key={`${r.bookerId}|${r.date}`} title={r.bookerName ?? '—'} description={dayKeyLabel(r.date)}
                action={<StatusPill tone={r.strikeRate >= 70 ? 'success' : r.strikeRate >= 40 ? 'warning' : 'danger'}>{Math.round(r.strikeRate)}%</StatusPill>}>
                <View style={{ gap: th.space(1) }}>
                  <KV k={t('Visit')} v={`${r.visited}/${r.planned} · ${t('Order wali')} ${r.productive}`} />
                  <KV k={t('Market me')} v={hm(r.timeInMarketMin)} />
                  <KV k={t('Km')} v={trim(r.travelledKm)} />
                  <KV k={t('GPS flags')} v={flags === 0 ? t('Theek') : `${r.flags.farFromShop} ${t('door se')} · ${r.flags.noGps} ${t('bina GPS')}`} />
                </View>
              </Card>
            );
          })}
          {!!data.flagged?.length && (
            <Card title={t('Flag wali visits')} description={t('Dukan se door check-in ya bina GPS — booker se poochein')} flush>
              <ListGroup>
                {data.flagged.map((v) => (
                  <ListRow key={v.id} dense title={v.customerName ?? t('Customer')} subtitle={`${v.bookerName ?? t('Booker')} · ${dayTime(v.checkInAt)}`}
                    trailing={<StatusPill tone={v.reason === 'FAR' ? 'danger' : 'warning'}>{v.reason === 'FAR' ? t('{{value}} m door', { value: v.distanceM ?? '?' }) : t('Bina GPS')}</StatusPill>} />
                ))}
              </ListGroup>
            </Card>
          )}
        </>
      );
    }}</Wait>
  );
}

/* ───────────── share text ───────────── */

function dsrText(d: Dsr) {
  const x = d.totals;
  return [
    `${t('DSR — Daily sales report')} · ${dayKeyLabel(d.date)}`,
    `${t('Visits')}: ${x.visited}/${x.planned} · ${t('Strike rate')}: ${Math.round(x.strikeRate)}%`,
    `${t('Orders')}: ${x.orders} · ${t('Order value')}: ${rs(x.value)} · ${t('Recovery')}: ${rs(x.collected)}`,
    '',
    ...d.bookers.map((b) => `${b.bookerName}: ${b.visited}/${b.planned}, ${b.orders} ${t('Orders')}, ${rs(b.value)}, ${t('Recovery')} ${rs(b.collected)}`),
  ].join('\n');
}
function summaryText(d: DistSummary) {
  return [
    `${t('Period summary')} · ${dayKeyLabel(d.from)} – ${dayKeyLabel(d.to)}`,
    `${t('Booked')}: ${rs(d.booked.value)} (${d.booked.orders})`,
    `${t('Invoiced')}: ${rs(d.invoiced.value)} (${d.invoiced.invoices})`,
    `${t('Wapas aaya')}: ${rs(d.invoiced.returnsValue)}`,
    `${t('Cash + recovery')}: ${rs(d.invoiced.cashAtDelivery + d.recoveries.verified)}`,
    '',
    ...d.byRoute.map((r) => `${r.routeName ?? t('Route nahi')}: ${rs(r.value)}`),
  ].join('\n');
}
function visitsText(d: VisitAnalytics) {
  const x = d.totals;
  return [
    `${t('Visit report')} · ${dayKeyLabel(d.from)} – ${dayKeyLabel(d.to)}`,
    `${t('Visits')}: ${x.visited}/${x.planned} · ${t('Strike rate')}: ${Math.round(x.strikeRate)}%`,
    `${t('Orders')}: ${x.orders} · ${rs(x.value)}`,
    `${t('GPS flags')}: ${x.farFromShop + x.noGps}`,
  ].join('\n');
}
