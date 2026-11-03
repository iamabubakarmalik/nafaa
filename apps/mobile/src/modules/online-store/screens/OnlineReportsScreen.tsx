/**
 * Online sales report for a period: sold vs the previous period, the order
 * pipeline, daily orders, COD vs prepaid, hours and weekdays, channels and
 * cities with RTO, couriers, products, customers, how long COD sits with
 * couriers, and true profit after selling costs (cost.view). Yesterday's
 * e-commerce morning summary sits on top. Mirrors the web OnlineReportsPage.
 */

import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowDownRight, ArrowUpRight, Megaphone, PackageCheck, RotateCcw, Share2, ShieldBan, ShoppingBag, Sun, Timer, Truck, Users, XCircle,
} from 'lucide-react-native';
import { change, rtoTone, type OnlineReport, type ProfitReport } from '@nafaa/core/online-store';
import { formatMoney, formatDate } from '@/core/format';
import { msg, t } from '@/core/i18n';
import { PERMISSIONS, usePermission } from '@/core/permissions';
import {
  Amount, Badge, Button, Card, ChipGroup, EmptyState, ErrorState, IconButton, Screen, Segmented, SkeletonRows, Tabs, Text, useTheme,
} from '@/design';
import { ordersApi, moneyApi } from '../api/online';
import { morningApi } from '../api/growth';
import { CourierLogo } from '../components/BrandLogo';
import { KpiStrip, Note, SavedDataNote } from '../components/bits';
import { OnlineMenuButton } from '../components/OnlineMenu';
import { STATUS_LABEL } from '../lib/labels';
import { KEYS } from '../lib/online';
import { periodOptions, periodRange, type PeriodPreset } from '../lib/period';
import { openWhatsApp } from '../lib/device';
import { shareCsv } from '../lib/docs';

type Tab = 'summary' | 'profit' | 'channels' | 'couriers' | 'products' | 'aging';
const PIPE = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED'] as const;
const WEEKDAY = [msg('Itwaar'), msg('Peer'), msg('Mangal'), msg('Budh'), msg('Jumeraat'), msg('Juma'), msg('Hafta')];

export function OnlineReportsScreen() {
  const th = useTheme();
  const can = usePermission();
  const seesProfit = can(PERMISSIONS.COST_VIEW);
  const [tab, setTab] = useState<Tab>('summary');
  const [period, setPeriod] = useState<PeriodPreset>('month');
  const [channelId, setChannelId] = useState('');
  const range = periodRange(period) ?? periodRange('quarter')!;
  const q = useQuery({ queryKey: [...KEYS.report, 'full', range.from, range.to, channelId], queryFn: () => ordersApi.report({ ...range, integrationId: channelId || undefined }), placeholderData: (p) => p });
  const channelsQ = useQuery({ queryKey: KEYS.channels, queryFn: ordersApi.channels, staleTime: 5 * 60_000 });
  const morning = useQuery({ queryKey: ['ai', 'morning-summary'], queryFn: morningApi.get, staleTime: 30 * 60_000, retry: false });
  const r = q.data;
  const tt = r?.totals;
  const valueChange = r ? change(r.totals.netValue, r.previous.netValue) : null;
  const vs = (n: number | null) => (n == null ? t('pichli period me kuch nahi') : t('{{value}}{{n}}% pichli period se', { value: n >= 0 ? '+' : '', n }));
  const e = morning.data?.ecommerce;
  const channels = channelsQ.data ?? [];
  const tabs = ([
    { value: 'summary', label: t('Khulasa') }, ...(seesProfit ? [{ value: 'profit', label: t('Asli profit') }] : []),
    { value: 'channels', label: t('Channel & shehar') }, { value: 'couriers', label: t('Courier & RTO') },
    { value: 'products', label: t('Products & customers') }, { value: 'aging', label: t('COD') },
  ]) as Array<{ value: Tab; label: string }>;

  const exportCsv = () => {
    if (!r) return;
    void shareCsv(`online-report-${range.from}-${range.to}.csv`, [
      [t('Din'), t('Orders'), t('Sale'), t('Deliver hue'), t('Wapas')],
      ...r.byDay.map((d) => [d.day, d.orders, d.value, d.delivered, d.returned]),
      [],
      [t('Channel'), t('Orders'), t('Sale'), t('Deliver hue'), t('Wapas'), t('RTO %')],
      ...r.byChannel.map((c) => [c.name, c.orders, c.value, c.delivered, c.returned, c.rtoRate]),
      [],
      [t('Shehar'), t('Orders'), t('Sale'), t('RTO %')],
      ...r.byCity.map((c) => [c.city, c.orders, c.value, c.rtoRate]),
    ]);
  };

  return (
    <Screen title={t('Online reports')} actions={<>
      <IconButton icon={Share2} label={t('CSV')} onPress={exportCsv} />
      <IconButton icon={ShieldBan} label={t('Block list')} onPress={() => router.push('/online/blocklist' as never)} />
      <OnlineMenuButton current="/online/reports" />
    </>} onRefresh={q.refetch} refreshing={q.isRefetching}>
      <SavedDataNote query={q} />
      {e && (
        <Card tone="brand" title={t('Kal ka online khulasa')} action={<Sun size={16} color={th.colors.brand.text} />}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2) }}>
            <Mini label={t('Orders')} value={String(e.orders)} />
            <Mini label={t('Sale')} value={formatMoney(e.sales)} />
            <Mini label={t('RTO')} value={String(e.rto)} />
            {e.codWithCouriers != null && <Mini label={t('Courier ke paas')} value={formatMoney(e.codWithCouriers)} />}
            {e.adsSpend != null && <Mini label={t('Ads')} value={formatMoney(e.adsSpend)} />}
            {e.roas != null && <Mini label="ROAS" value={`${e.roas.toFixed(2)}x`} />}
            {e.profitAfterAds != null && <Mini label={t('Profit (ads ke baad)')} value={formatMoney(e.profitAfterAds)} tone={e.profitAfterAds >= 0 ? 'success' : 'danger'} />}
          </View>
          <Button size="sm" variant="secondary" icon={Share2} style={{ marginTop: th.space(3), alignSelf: 'flex-start' }} onPress={() => openWhatsApp(null, e.text)}>{t('WhatsApp par bhejein')}</Button>
        </Card>
      )}
      <ChipGroup value={period} onChange={(v) => setPeriod(v as PeriodPreset)} style={{ marginHorizontal: -th.space(4) }}
        options={periodOptions(['today', 'yesterday', 'week', 'month', 'thisMonth', 'quarter']).map((o) => ({ ...o, label: t(o.label) }))} />
      {channels.length > 1 && <ChipGroup value={channelId} onChange={setChannelId} style={{ marginHorizontal: -th.space(4) }} options={[{ value: '', label: t('Sab channels') }, ...channels.map((c) => ({ value: c.id, label: c.displayName }))]} />}
      {q.isError && !r ? <ErrorState error={q.error} onRetry={q.refetch} /> : !r || !tt ? <SkeletonRows count={8} /> : (
        <>
          <Text size="xs" tone="muted">{formatDate(`${r.range.from}T12:00:00`)} – {formatDate(`${r.range.to}T12:00:00`)} · {t('cancel aur wapas orders sale me nahi gine jate')}</Text>
          <KpiStrip items={[
            { key: 's', label: t('Online sale · {{netOrders}} order', { netOrders: tt.netOrders }), icon: (valueChange ?? 0) >= 0 ? ArrowUpRight : ArrowDownRight, tone: (valueChange ?? 0) >= 0 ? 'success' : 'danger', value: <Amount value={tt.netValue} size="lg" weight="bold" />, hint: vs(valueChange) },
            { key: 'o', label: t('Orders aaye'), icon: ShoppingBag, tone: 'brand', value: String(tt.orders), hint: vs(change(tt.orders, r.previous.orders)) },
            { key: 'd', label: t('Deliver hue'), icon: PackageCheck, tone: 'success', value: <Amount value={tt.deliveredValue} size="lg" weight="bold" />, hint: t('{{delivered}} · {{deliveryRate}}% bheje hue', { delivered: tt.delivered, deliveryRate: tt.deliveryRate }) },
            { key: 'r', label: t('RTO (wapas)'), icon: RotateCcw, tone: rtoTone(tt.rtoRate), value: `${tt.rtoRate}%`, hint: `${tt.returned} / ${tt.dispatched}`, onPress: () => setTab('couriers') },
            { key: 'a', label: t('Ausat order'), icon: Users, tone: 'info', value: <Amount value={tt.avgOrderValue} size="lg" weight="bold" />, hint: t('{{customers}} customer · {{repeatCustomers}} dobara', { customers: tt.customers, repeatCustomers: tt.repeatCustomers }) },
            { key: 'c', label: t('Cancel / reject'), icon: XCircle, tone: 'danger', value: `${tt.cancelRate}%`, hint: t('{{cancelled}} order', { cancelled: tt.cancelled }) },
            { key: 't', label: t('Accept me waqt'), icon: Timer, tone: 'neutral', value: tt.avgAcceptMinutes == null ? '—' : tt.avgAcceptMinutes < 60 ? t('{{m}} min', { m: tt.avgAcceptMinutes }) : t('{{value}} ghante', { value: Math.round(tt.avgAcceptMinutes / 60) }), hint: t('Order aane se bill tak') },
            { key: 'v', label: t('Delivery me waqt'), icon: Truck, tone: 'neutral', value: tt.avgDeliveryDays == null ? '—' : t('{{count}} din', { count: tt.avgDeliveryDays }), hint: t('Courier ko dene se deliver tak') },
          ]} />
          <Tabs value={tab} onChange={setTab} tabs={tabs} />
          {tab === 'summary' && <Summary r={r} />}
          {tab === 'profit' && seesProfit && <Profit q={{ ...range, integrationId: channelId || undefined }} />}
          {tab === 'channels' && <>
            <Bars title={t('Channel')} rows={r.byChannel.map((c) => ({ key: c.name, label: c.name, value: c.value, meta: t('{{orders}} order · RTO {{rto}}%', { orders: c.orders, rto: c.rtoRate }) }))} />
            <Bars title={t('Shehar')} rows={r.byCity.slice(0, 15).map((c) => ({ key: c.city, label: c.city, value: c.value, meta: t('{{orders}} order · RTO {{rto}}%', { orders: c.orders, rto: c.rtoRate }), warn: c.rtoRate >= 20 }))} />
            {r.riskyCities.length > 0 && <Bars title={t('RTO zyada wale shehar')} rows={r.riskyCities.map((c) => ({ key: c.city, label: c.city, value: c.rtoRate, raw: `${c.rtoRate}%`, meta: `${c.returned} / ${c.dispatched}`, warn: true }))} />}
          </>}
          {tab === 'couriers' && (
            <Card flush title={t('Courier aur RTO')} description={t('Kaun sa courier zyada deliver karta hai, kis ke parcel wapas aate hain')}>
              {!r.byCourier.length ? <EmptyState compact title={t('Is period me koi parcel nahi bheja')} /> : r.byCourier.map((c) => (
                <View key={c.code} style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(3), paddingHorizontal: th.space(4), paddingVertical: th.space(2.5), borderTopWidth: 1, borderTopColor: th.colors.divider }}>
                  <CourierLogo code={c.code} size={28} />
                  <View style={{ flex: 1 }}>
                    <Text size="sm" weight="semibold">{c.name}</Text>
                    <Text size="xs" tone="muted">{t('{{d}} deliver · {{r}} wapas · {{a}} bheje', { d: c.delivered, r: c.returned, a: c.dispatched })}</Text>
                  </View>
                  <Badge tone={rtoTone(c.rtoRate)}>{t('RTO {{rto}}%', { rto: c.rtoRate })}</Badge>
                </View>
              ))}
            </Card>
          )}
          {tab === 'products' && <>
            <Bars title={t('Sab se zyada kya bika')} rows={r.topProducts.map((p) => ({ key: p.name, label: p.name, value: p.value || p.qty, meta: t('{{value}} bike', { value: Number(p.qty.toFixed(2)) }) }))} />
            <Bars title={t('Sab se qeemti customer')} rows={r.topCustomers.map((c) => ({ key: c.phone, label: c.name, value: c.value, meta: [t('{{count}} order', { count: c.orders }), c.city].filter(Boolean).join(' · ') }))} />
          </>}
          {tab === 'aging' && <>
            <Card title={t('COD ya pehle se paid')}>
              <View style={{ flexDirection: 'row', gap: th.space(2) }}>
                <Mini label={t('COD orders')} value={`${r.payment.cod.orders} · ${formatMoney(r.payment.cod.value)}`} />
                <Mini label={t('Paid orders')} value={`${r.payment.prepaid.orders} · ${formatMoney(r.payment.prepaid.value)}`} />
              </View>
              <View style={{ flexDirection: 'row', gap: th.space(2), marginTop: th.space(2) }}>
                <Mini label={t('COD mila')} value={formatMoney(r.payment.cod.collected)} tone="success" />
                <Mini label={t('COD baqi')} value={formatMoney(r.payment.cod.pending)} tone="warning" />
              </View>
            </Card>
            <Card title={t('COD kitne din se courier ke paas')}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2) }}>
                {r.codAging.map((a, i) => <Mini key={a.label} label={a.label} value={`${a.count} · ${formatMoney(a.value)}`} tone={i === 3 && a.count ? 'danger' : undefined} />)}
              </View>
              <Button size="sm" variant="secondary" style={{ marginTop: th.space(3), alignSelf: 'flex-start' }} onPress={() => router.push('/online/cod' as never)}>{t('COD & courier')}</Button>
            </Card>
          </>}
          <Button variant="ghost" icon={Megaphone} onPress={() => router.push('/online/ads' as never)} style={{ alignSelf: 'flex-start' }}>{t('Ads & ROAS')}</Button>
        </>
      )}
    </Screen>
  );
}

function Summary({ r }: { r: OnlineReport }) {
  const th = useTheme();
  const maxDay = Math.max(1, ...r.byDay.map((d) => d.orders));
  const maxHour = Math.max(1, ...r.byHour.map((h) => h.orders));
  const maxWd = Math.max(1, ...r.byWeekday.map((d) => d.orders));
  return (
    <>
      <Card title={t('Order ka safar')} description={t('Is period ke orders abhi kis marhale par hain (test order shamil nahi)')}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2) }}>
          {PIPE.map((k) => <Mini key={k} label={t(STATUS_LABEL[k].short)} value={String(r.byStatus[k] ?? 0)} />)}
        </View>
      </Card>
      <Card title={t('Roz ke orders aur sale')} description={t('Sale me cancel aur wapas orders shamil nahi; khali din bhi dikhte hain')}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 110 }}>
          {r.byDay.slice(-45).map((d) => (
            <View key={d.day} style={{ flex: 1, height: `${Math.max(2, (d.orders / maxDay) * 100)}%`, backgroundColor: d.returned ? th.colors.warning.solid : th.colors.brand.solid, borderRadius: 2 }} />
          ))}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: th.space(1) }}>
          <Text size="2xs" tone="muted">{r.byDay[0] ? formatDate(`${r.byDay[Math.max(0, r.byDay.length - 45)].day}T12:00:00`) : ''}</Text>
          <Text size="2xs" tone="muted">{r.byDay.length ? formatDate(`${r.byDay[r.byDay.length - 1].day}T12:00:00`) : ''}</Text>
        </View>
      </Card>
      <Card title={t('Kis waqt order aate hain')}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 80 }}>
          {r.byHour.map((h) => <View key={h.hour} style={{ flex: 1, height: `${Math.max(2, (h.orders / maxHour) * 100)}%`, backgroundColor: th.colors.info.solid, borderRadius: 2 }} />)}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: th.space(1) }}>
          {[0, 6, 12, 18, 23].map((h) => <Text key={h} size="2xs" tone="muted" ltr>{h}:00</Text>)}
        </View>
      </Card>
      <Card title={t('Hafte ka kaun sa din')}>
        <View style={{ gap: th.space(1.5) }}>
          {r.byWeekday.map((d) => (
            <View key={d.day} style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2) }}>
              <Text size="xs" style={{ width: 72 }}>{t(WEEKDAY[d.day] ?? '')}</Text>
              <View style={{ flex: 1, height: 10, backgroundColor: th.colors.surfaceMuted, borderRadius: 5 }}>
                <View style={{ width: `${(d.orders / maxWd) * 100}%`, height: 10, backgroundColor: th.colors.accent.solid, borderRadius: 5 }} />
              </View>
              <Text size="xs" weight="semibold" ltr style={{ width: 28, textAlign: 'right' }}>{d.orders}</Text>
            </View>
          ))}
        </View>
      </Card>
    </>
  );
}

function Bars({ title, rows }: { title: string; rows: Array<{ key: string; label: string; value: number; raw?: string; meta?: string; warn?: boolean }> }) {
  const th = useTheme();
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <Card title={title}>
      {!rows.length ? <Text size="sm" tone="muted">{t('Is period me kuch nahi')}</Text> : (
        <View style={{ gap: th.space(2.5) }}>
          {rows.map((r) => (
            <View key={r.key} style={{ gap: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2) }}>
                <Text size="sm" weight="medium" numberOfLines={1} style={{ flex: 1 }}>{r.label}</Text>
                <Text size="sm" weight="semibold" ltr tone={r.warn ? 'danger' : 'default'}>{r.raw ?? formatMoney(r.value)}</Text>
              </View>
              <View style={{ height: 6, backgroundColor: th.colors.surfaceMuted, borderRadius: 3 }}>
                <View style={{ width: `${(r.value / max) * 100}%`, height: 6, borderRadius: 3, backgroundColor: r.warn ? th.colors.danger.solid : th.colors.brand.solid }} />
              </View>
              {r.meta ? <Text size="2xs" tone="muted">{r.meta}</Text> : null}
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}

function Profit({ q }: { q: { from: string; to: string; integrationId?: string } }) {
  const th = useTheme();
  const [group, setGroup] = useState<'channel' | 'courier' | 'city' | 'product'>('channel');
  const p = useQuery({ queryKey: [...KEYS.profit, q], queryFn: () => moneyApi.profitReport(q) });
  if (p.isLoading) return <SkeletonRows count={4} />;
  if (p.error || !p.data) return <ErrorState error={p.error} onRetry={p.refetch} title={t('Profit nahi nikla')} />;
  const d: ProfitReport = p.data;
  const tt = d.totals;
  const paid = tt.sale + tt.deliveryCollected;
  const pct = (n: number) => (paid ? `${Math.round((n / paid) * 100)}%` : '—');
  const rows = group === 'channel' ? d.byChannel.map((r) => ({ ...r, label: r.name })) : group === 'courier' ? d.byCourier.map((r) => ({ ...r, label: r.name }))
    : group === 'city' ? d.byCity.map((r) => ({ ...r, label: r.city })) : d.byProduct.map((r) => ({ ...r, label: r.name }));
  return (
    <>
      {d.missingRates.length > 0 && (
        <Note tone="warning" action={<Button size="sm" variant="secondary" onPress={() => router.push('/online/costs' as never)}>{t('Rate likhein')}</Button>}>
          {t('{{value}} ka rate likha nahi — in ke parcels ka courier charge 0 gina gaya hai.', { value: d.missingRates.map((r) => r.name).join(', ') })}
        </Note>
      )}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2) }}>
        <Mini label={t('Customer ne diya')} value={formatMoney(paid)} />
        <Mini label={t('Product cost')} value={`${formatMoney(tt.cost ?? 0)} · ${pct(tt.cost ?? 0)}`} />
        <Mini label={t('Selling costs')} value={`${formatMoney(tt.sellingCosts)} · ${pct(tt.sellingCosts)}`} />
        <Mini label={t('RTO ka nuqsan')} value={formatMoney(tt.rtoCost)} tone="danger" />
        <Mini label={t('Asli profit')} value={formatMoney(tt.profit ?? 0)} tone={(tt.profit ?? 0) >= 0 ? 'success' : 'danger'} />
        <Mini label={t('Margin')} value={tt.margin == null ? '—' : `${tt.margin}%`} />
      </View>
      <Segmented value={group} onChange={setGroup} options={[{ value: 'channel', label: t('Channel') }, { value: 'courier', label: t('Courier') }, { value: 'city', label: t('Shehar') }, { value: 'product', label: t('Product') }]} />
      <Card flush title={t('Asli profit — kis cheez se kitna')}>
        {!rows.length ? <Text size="sm" tone="muted" style={{ padding: th.space(4) }}>{t('Is period me bill wala koi online order nahi.')}</Text> : rows.slice(0, 40).map((r, i) => (
          <View key={`${r.label}-${i}`} style={{ paddingHorizontal: th.space(4), paddingVertical: th.space(2.5), borderTopWidth: 1, borderTopColor: th.colors.divider, gap: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2) }}>
              <Text size="sm" weight="semibold" numberOfLines={1} style={{ flex: 1 }}>{r.label}</Text>
              <Amount value={r.profit ?? 0} size="sm" weight="bold" colorize />
              {r.margin != null && <Text size="2xs" tone="muted" ltr>{r.margin}%</Text>}
            </View>
            <Text size="2xs" tone="muted" ltr>{t('{{orders}} order', { orders: r.orders })} · {t('Sale')} {formatMoney(r.sale)} · {t('Cost')} {formatMoney(r.cost ?? 0)} · {t('Courier')} {formatMoney(r.courierCharge)} · RTO {formatMoney(r.rtoCost)}</Text>
          </View>
        ))}
      </Card>
    </>
  );
}

function Mini({ label, value, tone }: { label: string; value: string; tone?: 'success' | 'danger' | 'warning' }) {
  const th = useTheme();
  return (
    <View style={{ minWidth: '30%', flexGrow: 1, backgroundColor: th.colors.surfaceMuted, borderRadius: th.radius('md'), padding: th.space(2) }}>
      <Text size="2xs" tone="muted" numberOfLines={1}>{label}</Text>
      <Text size="sm" weight="bold" tone={tone} ltr numberOfLines={1}>{value}</Text>
    </View>
  );
}
