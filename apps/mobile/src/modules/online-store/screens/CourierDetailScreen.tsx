/**
 * One courier: status and 30-day numbers, then tabs for the overview, bulk
 * booking of accepted orders, parcels (Nafaa orders and, where the courier
 * allows it, every parcel on its portal, with labels for several at once),
 * booking settings and the connection (keys checked with the courier).
 * Mirrors the web CourierDetailPage.
 */

import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2, ExternalLink, KeyRound, Lock, Power, Printer, RefreshCw, Share2, Truck, Unplug, UserX, Wallet, Zap,
} from 'lucide-react-native';
import { COURIER_STATE_TONE, type CourierAccount, type CourierSettingField, type CourierState } from '@nafaa/core/online-store';
import { haptic } from '@/core/device/haptics';
import { formatDateTime, formatMoney, formatRelative } from '@/core/format';
import { msg, t } from '@/core/i18n';
import { PERMISSIONS, usePermission } from '@/core/permissions';
import {
  Amount, Badge, Button, Card, ChipGroup, Checkbox, EmptyState, ErrorState, IconButton, Input, PasswordInput, PressableScale, Screen, SearchBar,
  Segmented, Select, SkeletonRows, Tabs, Text, confirm, toast, useDebouncedValue, useTheme, type StatusTone,
} from '@/design';
import { apiErrorMessage, couriersApi } from '../api/online';
import { CourierLogo } from '../components/BrandLogo';
import { KpiStrip, Note } from '../components/bits';
import { COURIER_STATE_LABEL, STATUS_LABEL } from '../lib/labels';
import { KEYS, useOnlineGuard } from '../lib/online';
import { openCourierLabels } from '../lib/docs';
import { openInApp } from '../lib/device';

type Tab = 'overview' | 'book' | 'parcels' | 'settings' | 'connection';
const PARCEL_FILTERS = [
  { value: 'active', label: msg('Raste me') }, { value: 'booked', label: msg('Pickup baqi') }, { value: 'attempted', label: msg('Customer tak nahi pohanche') },
  { value: 'returning', label: msg('Wapas aa rahe') }, { value: 'cod', label: msg('Paisa baqi') }, { value: 'delivered', label: msg('Deliver hue') },
  { value: 'returned', label: msg('RTO') }, { value: 'all', label: msg('Sab') },
];

export function CourierDetailScreen() {
  const th = useTheme();
  const qc = useQueryClient();
  const { code: raw = '' } = useLocalSearchParams<{ code: string }>();
  const code = String(raw).toUpperCase();
  const can = usePermission();
  const canManage = can(PERMISSIONS.ONLINE_ORDERS_MANAGE);
  const { guard } = useOnlineGuard('courier');
  const q = useQuery({ queryKey: KEYS.couriers, queryFn: couriersApi.list, refetchInterval: 60_000 });
  const c = q.data?.find((x) => x.code === code);
  const isApi = c?.mode === 'api';
  const tabs: Array<{ value: Tab; label: string; count?: number }> = !c ? [] : isApi && c.connected
    ? [{ value: 'overview', label: t('Overview') }, { value: 'book', label: t('Book karein') }, { value: 'parcels', label: t('Parcels'), count: c.stats.active || undefined },
      { value: 'settings', label: t('Settings') }, { value: 'connection', label: t('Connection') }]
    : isApi ? [{ value: 'connection', label: t('Jorein') }, { value: 'parcels', label: t('Parcels') }]
      : [{ value: 'overview', label: t('Overview') }, { value: 'parcels', label: t('Parcels'), count: c.stats.active || undefined }];
  const [tab, setTab] = useState<Tab | null>(null);
  const [parcelFilter, setParcelFilter] = useState('active');
  const current: Tab = tab && tabs.some((x) => x.value === tab) ? tab : tabs[0]?.value ?? 'overview';
  const showParcels = (f: string) => { setParcelFilter(f); setTab('parcels'); };

  const sync = useMutation({
    mutationFn: () => couriersApi.sync(code),
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: KEYS.couriers }); qc.invalidateQueries({ queryKey: ['courier-shipments', code] }); if (r.lastError) toast.error(r.lastError); else toast.success(t('Sab parcels ka taaza status aa gaya')); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Nahi hua'))),
  });
  const setActive = useMutation({
    mutationFn: (active: boolean) => couriersApi.update(code, { active }),
    onSuccess: (_r, active) => { qc.invalidateQueries({ queryKey: KEYS.couriers }); toast.success(active ? t('{{name}} chalu', { name: c?.name }) : t('{{name}} band — nayi booking nahi hogi', { name: c?.name })); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Nahi hua'))),
  });

  if (q.isLoading) return <Screen title={t('Courier')}><SkeletonRows count={6} /></Screen>;
  if (!c) return <Screen title={t('Courier')}>{q.error ? <ErrorState error={q.error} onRetry={q.refetch} /> : <EmptyState icon={Truck} title={t('Ye courier list me nahi')} />}</Screen>;
  const s = c.stats;

  return (
    <Screen title={c.name} subtitle={c.connected ? (c.lastError ? t('Masla') : c.active ? t('Jura hua') : t('Band')) : isApi ? t('Ek click connect') : t('Manual')}
      actions={<>
        {c.site && <IconButton icon={ExternalLink} label={t('Website')} onPress={() => openInApp(c.site)} />}
        {c.connected && canManage && <IconButton icon={RefreshCw} label={t('Abhi sync')} onPress={guard(() => sync.mutate())} />}
        {c.connected && canManage && <IconButton icon={Power} label={c.active ? t('Band karein') : t('Chalu karein')} variant={c.active ? 'ghost' : 'danger'} onPress={guard(() => setActive.mutate(!c.active))} />}
      </>}
      onRefresh={q.refetch} refreshing={q.isRefetching}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(3) }}>
        <CourierLogo code={c.code} size={48} />
        <View style={{ flex: 1 }}>
          <Text size="xs" tone="muted">
            {c.connected ? t('Key {{value}}{{value2}}', { value: c.maskedKey ?? '', value2: c.lastSyncAt ? t(' · aakhri sync {{lastSyncAt}}', { lastSyncAt: formatRelative(c.lastSyncAt) }) : '' })
              : isApi ? t('{{name}} ki details paste karein — booking, label, tracking aur RTO sab khud', { name: c.name })
                : c.code === 'RIDER' ? t('Order ka safar aur COD ka paisa Nafaa sambhalta hai') : t('CN khud likhein — tracking link, COD hisaab aur RTO Nafaa sambhalta hai')}
          </Text>
        </View>
        {sync.isPending && <ActivityIndicator />}
      </View>
      <KpiStrip items={[
        { key: 'a', label: t('Raste me'), icon: Truck, tone: 'info', value: String(s.active), hint: s.awaitingPickup ? t('{{awaitingPickup}} pickup baqi', { awaitingPickup: s.awaitingPickup }) : undefined, onPress: () => showParcels('active') },
        { key: 'p', label: t('Pickup ka intezar'), icon: Printer, tone: 'warning', value: String(s.awaitingPickup), hint: t('Label print karke parcel dein'), onPress: () => showParcels('booked') },
        { key: 'u', label: t('Customer tak nahi pohanche'), icon: UserX, tone: 'danger', value: String(s.attempted), hint: t('Call karein warna RTO'), onPress: () => showParcels('attempted') },
        { key: 'c', label: t('COD paas'), icon: Wallet, tone: 'warning', value: <Amount value={s.codPendingValue} size="lg" weight="bold" />, hint: t('{{codPending}} parcel · dabayein', { codPending: s.codPending }), onPress: () => showParcels('cod') },
        { key: 'd', label: t('Deliver (30 din)'), icon: CheckCircle2, tone: 'success', value: String(s.delivered30), hint: t('{{dispatched30}} bheje', { dispatched30: s.dispatched30 }) },
        { key: 'r', label: t('RTO (30 din)'), icon: Truck, tone: s.rtoRate >= 20 ? 'danger' : 'neutral', value: `${s.rtoRate}%`, hint: t('{{returned30}} wapas', { returned30: s.returned30 }), onPress: () => showParcels('returned') },
      ]} />
      {c.connected && c.lastError && (
        <Note tone="danger" title={t('{{name}} se rabta nahi ho raha', { name: c.name })} action={<Button size="sm" variant="secondary" onPress={() => setTab('connection')}>{t('Key check karein')}</Button>}>{c.lastError}</Note>
      )}
      {c.connected && c.missingSettings.length > 0 && current !== 'settings' && (
        <Note tone="warning" title={t('Booking se pehle settings poori karein')} action={<Button size="sm" variant="secondary" onPress={() => setTab('settings')}>{t('Settings')}</Button>}>
          {t('Khali hain: {{value}}', { value: c.missingSettings.join(', ') })}
        </Note>
      )}
      <Tabs value={current} onChange={setTab} tabs={tabs} />
      {current === 'overview' && <Overview c={c} onTab={setTab} onParcels={showParcels} />}
      {current === 'book' && <BookTab c={c} canManage={canManage} />}
      {current === 'parcels' && <ParcelsTab c={c} filter={parcelFilter} setFilter={setParcelFilter} />}
      {current === 'settings' && <Card title={t('Booking settings')} description={t('Har nayi booking par yahi lagengi — booking ke waqt badal bhi sakte hain.')}><SettingsForm c={c} canManage={canManage} /></Card>}
      {current === 'connection' && <ConnectionTab c={c} canManage={canManage} onConnected={() => setTab('overview')} />}
    </Screen>
  );
}

function Overview({ c, onTab, onParcels }: { c: CourierAccount; onTab: (t: Tab) => void; onParcels: (f: string) => void }) {
  const th = useTheme();
  const isApi = c.mode === 'api';
  const items = isApi ? [
    t('Order par "{{name}} par book" — CN khud', { name: c.name }),
    c.connect?.features.label ? t('{{value}} ek click me print', { value: c.connect.labelKind === 'pdf' ? t('Label PDF') : t('Label link') }) : t('Label {{name}} portal se (CN Nafaa me khud aata hai)', { name: c.name }),
    t('Courier utha le → order "Raste me"'),
    t('Deliver → "Courier ke paas" (COD)'),
    t('Wapas (RTO) → bill void, stock wapas'),
    c.connect?.features.settlement ? t('COD ka paisa aaya → khud "Paisa mil gaya"') : t('COD settlement: COD safhe par chun kar "mil gaya"'),
  ] : [
    t('Order par "Rider/courier ko de diya" me courier aur CN likhein'),
    t('Tracking link aur COD hisaab Nafaa me'),
    t('Wapas (RTO) → bill void, stock wapas'),
  ];
  return (
    <View style={{ gap: th.space(3) }}>
      {c.stats.attempted > 0 && (
        <Note tone="warning" title={t('{{attempted}} parcel — customer nahi mila', { attempted: c.stats.attempted })} action={<Button size="sm" variant="secondary" onPress={() => onParcels('attempted')}>{t('Dekhein')}</Button>}>
          {t('Customer ko call ya WhatsApp karein — warna parcel wapas (RTO) aa jayega.')}
        </Note>
      )}
      <Card title={t('Kya kya khud hota hai')}>
        <View style={{ gap: th.space(2) }}>
          {items.map((x) => (
            <View key={x} style={{ flexDirection: 'row', gap: th.space(2) }}>
              <CheckCircle2 size={16} color={th.colors.success.text} />
              <Text size="sm" style={{ flex: 1 }}>{x}</Text>
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2), marginTop: th.space(3) }}>
          {isApi && c.connected && <Button size="sm" icon={Zap} onPress={() => onTab('book')}>{t('Orders book karein')}</Button>}
          <Button size="sm" variant="secondary" icon={Truck} onPress={() => onParcels('active')}>{t('Parcels')}</Button>
          <Button size="sm" variant="secondary" icon={Wallet} onPress={() => router.push('/online/cod' as never)}>{t('COD hisaab')}</Button>
        </View>
      </Card>
    </View>
  );
}

/** Accepted orders not yet handed to any courier: pick and book together. */
function BookTab({ c, canManage }: { c: CourierAccount; canManage: boolean }) {
  const th = useTheme();
  const qc = useQueryClient();
  const { guard } = useOnlineGuard('courier');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [weight, setWeight] = useState('');
  const [failed, setFailed] = useState<Record<string, string>>({});
  const q = useQuery({ queryKey: ['courier-shipments', c.code, 'to-book'], queryFn: () => couriersApi.shipments(c.code, { filter: 'to-book', limit: 200 }) });
  const rows = q.data?.rows ?? [];
  const bulk = useMutation({
    mutationFn: () => couriersApi.bulkBook(c.code, { orderIds: [...picked], weightKg: weight ? Number(weight) : undefined }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['courier-shipments', c.code] });
      qc.invalidateQueries({ queryKey: KEYS.couriers });
      qc.invalidateQueries({ queryKey: KEYS.orders });
      setFailed(Object.fromEntries(r.results.filter((x) => !x.ok).map((x) => [x.orderId, x.error ?? t('Nahi hua')])));
      setPicked(new Set(r.results.filter((x) => !x.ok).map((x) => x.orderId)));
      if (r.booked) { haptic('success'); toast.success(t('{{booked}} order {{name}} par book', { booked: r.booked, name: c.name }), { message: t('Parcels tab se label print karein') }); }
      if (r.failed) toast.error(t('{{failed}} order book nahi hue — wajah neeche likhi hai', { failed: r.failed }));
    },
    onError: (e) => toast.error(apiErrorMessage(e, t('Nahi hua'))),
  });
  const toggle = (id: string) => setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  return (
    <Card flush title={t('Book hone ke liye tayyar')} description={t('Accept ho chuke orders jo abhi kisi courier ko nahi diye. Chunein → ek click me sab book — shehar khud milta hai.')}>
      {q.isLoading ? <SkeletonRows count={4} /> : q.error ? <ErrorState compact error={q.error} onRetry={q.refetch} /> : !rows.length ? (
        <EmptyState compact icon={CheckCircle2} title={t('Sab bhej diye')} message={t('Koi accept hua order courier ka intezar nahi kar raha.')} />
      ) : (
        <View>
          {canManage && (
            <View style={{ paddingHorizontal: th.space(4), paddingVertical: th.space(2), gap: th.space(2), borderTopWidth: 1, borderTopColor: th.colors.divider }}>
              <Checkbox value={rows.every((r) => picked.has(r.id))} onChange={(v) => setPicked(v ? new Set(rows.map((r) => r.id)) : new Set())} label={t('Sab chunein')} />
              {picked.size > 0 && (
                <View style={{ flexDirection: 'row', gap: th.space(2), alignItems: 'flex-end' }}>
                  <Input containerStyle={{ flex: 1 }} value={weight} onChangeText={setWeight} keyboardType="decimal-pad" ltr
                    placeholder={t('Wazan (default {{value}} kg)', { value: c.settings?.defaultWeightKg ?? 0.5 })} />
                  <Button variant="success" icon={Zap} loading={bulk.isPending} onPress={guard(() => bulk.mutate())}>{t('{{name}} par book', { name: c.name })} · {picked.size}</Button>
                </View>
              )}
            </View>
          )}
          {rows.map((o) => (
            <PressableScale key={o.id} onPress={() => (canManage ? toggle(o.id) : router.push(`/online/orders/${o.id}` as never))} onLongPress={() => router.push(`/online/orders/${o.id}` as never)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(3), paddingHorizontal: th.space(4), paddingVertical: th.space(2.5), borderTopWidth: 1, borderTopColor: th.colors.divider }}>
              {canManage && <Checkbox value={picked.has(o.id)} onChange={() => toggle(o.id)} />}
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text size="sm" weight="semibold" numberOfLines={1}>#{o.externalOrderNumber ?? o.externalOrderId} <Text size="sm" tone="secondary">· {o.customerName}{o.customerCity ? ` · ${o.customerCity}` : t(' · shehar nahi likha')}</Text></Text>
                <Text size="xs" tone="muted">{t('{{count}} pieces', { count: o.pieces || 1 })}</Text>
                {failed[o.id] && <Text size="xs" weight="medium" tone="danger">{failed[o.id]}</Text>}
              </View>
              {o.paymentStatus === 'PAID' ? <Badge tone="success">{t('Paid')}</Badge> : <Amount value={o.total} size="sm" weight="semibold" />}
            </PressableScale>
          ))}
        </View>
      )}
    </Card>
  );
}

function ParcelsTab({ c, filter, setFilter }: { c: CourierAccount; filter: string; setFilter: (f: string) => void }) {
  const th = useTheme();
  const portal = !!(c.connected && c.connect?.features.portal);
  const [src, setSrc] = useState<'nafaa' | 'portal'>('nafaa');
  const [search, setSearch] = useState('');
  const query = useDebouncedValue(search.trim(), 300);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [portalFilter, setPortalFilter] = useState('all');
  useEffect(() => setPicked(new Set()), [src, filter, portalFilter]);
  const nafaa = useQuery({
    queryKey: ['courier-shipments', c.code, filter, query], enabled: src === 'nafaa',
    queryFn: () => couriersApi.shipments(c.code, { filter, search: query || undefined, limit: 100 }), placeholderData: (p) => p,
  });
  const port = useQuery({
    queryKey: ['courier-portal', c.code, portalFilter, query], enabled: src === 'portal',
    queryFn: () => couriersApi.portalParcels(c.code, { filter: portalFilter, search: query || undefined, limit: 100 }), placeholderData: (p) => p,
  });
  const canLabel = !!c.connect?.features.label;
  const toggle = (tn: string) => setPicked((s) => { const n = new Set(s); if (n.has(tn)) n.delete(tn); else n.add(tn); return n; });
  const labelBar = canLabel && picked.size > 0 && (
    <View style={{ flexDirection: 'row', gap: th.space(2), alignItems: 'center' }}>
      <Text size="sm" weight="semibold" style={{ flex: 1 }}>{t('{{size}} chune', { size: picked.size })}</Text>
      <Button size="sm" variant="secondary" icon={Share2} onPress={() => openCourierLabels(c.code, [...picked], 'share')}>{t('Share')}</Button>
      <Button size="sm" icon={Printer} onPress={() => openCourierLabels(c.code, [...picked])}>{t('Labels print')}</Button>
    </View>
  );

  return (
    <View style={{ gap: th.space(3) }}>
      {portal && <Segmented value={src} onChange={setSrc} options={[{ value: 'nafaa', label: t('Nafaa orders') }, { value: 'portal', label: t('{{name}} portal (sab)', { name: c.name }) }]} />}
      <SearchBar value={search} onChangeText={setSearch} placeholder={src === 'portal' ? t('CN ya shehar…') : t('Order #, CN ya customer…')} />
      {src === 'nafaa' ? (
        <>
          <ChipGroup value={filter} onChange={setFilter} style={{ marginHorizontal: -th.space(4) }} options={PARCEL_FILTERS.map((f) => ({ value: f.value, label: t(f.label) }))} />
          {labelBar}
          {nafaa.isLoading ? <SkeletonRows count={5} /> : nafaa.error ? <ErrorState error={nafaa.error} onRetry={nafaa.refetch} /> : !(nafaa.data?.rows.length) ? (
            <EmptyState compact icon={Truck} title={t('Yahan koi parcel nahi')} />
          ) : (
            <Card flush>
              {nafaa.data!.rows.map((o, i) => {
                const st = (o.courierStatus ?? 'UNKNOWN') as CourierState | 'BOOKING';
                return (
                  <PressableScale key={o.id} onPress={() => router.push(`/online/orders/${o.id}` as never)} onLongPress={() => o.trackingNumber && toggle(o.trackingNumber)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(3), paddingHorizontal: th.space(4), paddingVertical: th.space(2.5), borderTopWidth: i ? 1 : 0, borderTopColor: th.colors.divider }}>
                    {canLabel && o.trackingNumber && o.viaApi && <Checkbox value={picked.has(o.trackingNumber)} onChange={() => toggle(o.trackingNumber!)} />}
                    <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                      <Text size="sm" weight="semibold" numberOfLines={1}>#{o.externalOrderNumber ?? o.externalOrderId} <Text size="sm" tone="secondary">· {o.customerName}{o.customerCity ? ` · ${o.customerCity}` : ''}</Text></Text>
                      <Text size="xs" tone="muted" ltr numberOfLines={1}>{[o.trackingNumber, o.courierStatusAt ? formatDateTime(o.courierStatusAt) : null].filter(Boolean).join(' · ')}</Text>
                      <View style={{ flexDirection: 'row', gap: 4 }}>
                        <Badge tone={COURIER_STATE_TONE[st] as StatusTone}>{t(COURIER_STATE_LABEL[st] ?? COURIER_STATE_LABEL.UNKNOWN)}</Badge>
                        <Badge tone="neutral">{t(STATUS_LABEL[o.orderStatus]?.short ?? o.orderStatus)}</Badge>
                      </View>
                    </View>
                    <Amount value={o.total} size="sm" weight="semibold" />
                  </PressableScale>
                );
              })}
            </Card>
          )}
        </>
      ) : (
        <>
          <ChipGroup value={portalFilter} onChange={setPortalFilter} style={{ marginHorizontal: -th.space(4) }} options={[
            { value: 'all', label: t('Sab') }, { value: 'active', label: t('Raste me') }, { value: 'attempted', label: t('Customer tak nahi pohanche') },
            { value: 'delivered', label: t('Deliver hue') }, { value: 'returned', label: t('RTO') }, { value: 'unlinked', label: t('Nafaa order se nahi jure') },
          ]} />
          {labelBar}
          {port.isLoading ? <SkeletonRows count={5} /> : port.error ? <ErrorState error={port.error} onRetry={port.refetch} /> : !(port.data?.rows.length) ? (
            <EmptyState compact icon={Truck} title={c.lastSyncAt ? t('Yahan koi parcel nahi') : t('{{name}} se parcels abhi nahi aaye', { name: c.name })}
              message={c.lastSyncAt ? t('Pichhle 30 din me is filter ka koi parcel nahi.') : t('Upar "Abhi sync" dabayein — pichhle 30 din ke saare parcels aa jayenge.')} />
          ) : (
            <Card flush>
              {port.data!.rows.map((r, i) => (
                <PressableScale key={r.id} onPress={() => (r.order ? router.push(`/online/orders/${r.order.id}` as never) : toggle(r.trackingNumber))} onLongPress={() => toggle(r.trackingNumber)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(3), paddingHorizontal: th.space(4), paddingVertical: th.space(2.5), borderTopWidth: i ? 1 : 0, borderTopColor: th.colors.divider }}>
                  {canLabel && <Checkbox value={picked.has(r.trackingNumber)} onChange={() => toggle(r.trackingNumber)} />}
                  <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                    <Text size="sm" weight="semibold" ltr>{r.trackingNumber}</Text>
                    <Text size="xs" tone="muted" numberOfLines={1}>{[r.customerName, r.customerPhone, r.city].filter(Boolean).join(' · ') || '—'}</Text>
                    <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap' }}>
                      <Badge tone={COURIER_STATE_TONE[r.state] as StatusTone}>{t(COURIER_STATE_LABEL[r.state] ?? COURIER_STATE_LABEL.UNKNOWN)}</Badge>
                      {r.order ? <Badge tone="brand">#{r.order.number}</Badge> : <Badge>{t('Portal se book')}</Badge>}
                    </View>
                  </View>
                  <Amount value={r.codAmount} size="sm" weight="semibold" />
                </PressableScale>
              ))}
            </Card>
          )}
        </>
      )}
    </View>
  );
}

/** Booking settings built from the courier's own field list (pickup, origin city, service, weight…). */
function SettingsForm({ c, canManage }: { c: CourierAccount; canManage: boolean }) {
  const th = useTheme();
  const qc = useQueryClient();
  const defs = c.connect?.settings ?? [];
  const needsOptions = defs.some((d) => d.type === 'pickup' || d.type === 'origin-city' || d.type === 'service');
  const opts = useQuery({ queryKey: ['courier-options', c.code], queryFn: () => couriersApi.options(c.code), enabled: needsOptions && c.connected, staleTime: 30 * 60_000 });
  const save = useMutation({
    mutationFn: (settings: Record<string, unknown>) => couriersApi.update(c.code, { settings: settings as never }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.couriers }); qc.invalidateQueries({ queryKey: ['courier-options', c.code] }); toast.success(t('Save ho gaya')); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Nahi hua'))),
  });
  if (!defs.length) return <Text size="sm" tone="muted">{t('Is courier ki koi setting nahi.')}</Text>;
  return (
    <View style={{ gap: th.space(3) }}>
      {defs.map((d) => <SettingControl key={d.key} d={d} value={c.settings?.[d.key]} opts={opts.data} loading={opts.isLoading} disabled={!canManage} onSave={(v) => save.mutate({ [d.key]: v })} />)}
    </View>
  );
}

function SettingControl({ d, value, opts, loading, disabled, onSave }: {
  d: CourierSettingField; value: unknown; loading: boolean; disabled: boolean; onSave: (v: string | number | null) => void;
  opts?: { cities: { id: string; name: string }[]; pickupAddresses: { code: string; address: string; city?: string | null }[]; services: { code: string; name: string }[] };
}) {
  const current = value === null || value === undefined ? '' : String(value);
  const [draft, setDraft] = useState(current);
  useEffect(() => setDraft(current), [current]);
  const label = `${d.label}${d.required ? ' *' : ''}`;
  if (d.type === 'pickup' || d.type === 'origin-city' || d.type === 'service' || d.type === 'select') {
    const list = d.type === 'pickup' ? (opts?.pickupAddresses ?? []).map((a) => ({ value: a.code, label: `${a.address}${a.city ? ` — ${a.city}` : ''}` }))
      : d.type === 'origin-city' ? (opts?.cities ?? []).map((x) => ({ value: x.id, label: x.name }))
        : d.type === 'service' ? (opts?.services ?? []).map((x) => ({ value: x.code, label: x.name })) : d.options ?? [];
    const options = [...(current && !list.some((o) => o.value === current) ? [{ value: current, label: current }] : []), ...list];
    return <Select label={label} hint={d.help} value={current} disabled={disabled || (loading && d.type !== 'select')} title={d.label} searchable={options.length > 8}
      placeholder={loading && d.type !== 'select' ? t('Aa raha hai…') : d.placeholder ?? t('Default')} onChange={(v) => onSave(v || null)} options={options} />;
  }
  return (
    <Input label={label} hint={d.help} value={draft} disabled={disabled} placeholder={d.placeholder ?? t('(khali)')} maxLength={200}
      keyboardType={d.type === 'number' ? 'decimal-pad' : 'default'} ltr={d.type === 'number'} onChangeText={setDraft}
      onBlur={() => draft !== current && onSave(draft === '' ? null : d.type === 'number' ? Number(draft) : draft)} />
  );
}

function ConnectionTab({ c, canManage, onConnected }: { c: CourierAccount; canManage: boolean; onConnected: () => void }) {
  const th = useTheme();
  const qc = useQueryClient();
  const { guard } = useOnlineGuard('integrations');
  const [replace, setReplace] = useState(!c.connected);
  const [vals, setVals] = useState<Record<string, string>>({});
  const fields = c.connect?.credentials ?? [];
  const test = useMutation({
    mutationFn: () => couriersApi.test(c.code),
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: KEYS.couriers }); toast.success(t('{{name}} theek chal raha hai · {{cities}} shehar', { name: c.name, cities: r.cities })); },
    onError: (e) => { qc.invalidateQueries({ queryKey: KEYS.couriers }); toast.error(apiErrorMessage(e, t('Nahi hua'))); },
  });
  const disconnect = useMutation({
    mutationFn: () => couriersApi.disconnect(c.code),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.couriers }); toast.success(t('{{name}} hata diya', { name: c.name })); setReplace(true); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Nahi hua'))),
  });
  const connect = useMutation({
    mutationFn: () => couriersApi.connect(c.code, { credentials: Object.fromEntries(Object.entries(vals).map(([k, v]) => [k, v.trim()])) }),
    onSuccess: (r) => {
      haptic('success');
      qc.invalidateQueries({ queryKey: KEYS.couriers });
      qc.invalidateQueries({ queryKey: ['courier-options', c.code] });
      toast.success(t('{{name}} jur gaya ✓', { name: c.name }), { message: t('{{cities}} shehar me delivery', { cities: r.cities }) });
      setVals({}); setReplace(false);
      if (!c.connected) onConnected();
    },
    onError: (e) => toast.error(apiErrorMessage(e, t('Nahi hua'))),
  });
  const missing = fields.some((f) => !f.optional && !(vals[f.key] ?? '').trim());
  return (
    <View style={{ gap: th.space(3) }}>
      {c.connected && (
        <Card title={t('Connection')} description={[c.connectedAt ? t('Jura: {{when}}', { when: formatDateTime(c.connectedAt) }) : null, c.lastTestedAt ? t('aakhri check {{when}}', { when: formatRelative(c.lastTestedAt) }) : null].filter(Boolean).join(' · ')}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2) }}>
            <KeyRound size={16} color={th.colors.textMuted} />
            <Text size="sm" ltr style={{ flex: 1 }}>{c.maskedKey}</Text>
          </View>
          {canManage && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2), marginTop: th.space(3) }}>
              <Button size="sm" variant="secondary" icon={RefreshCw} loading={test.isPending} onPress={guard(() => test.mutate())}>{t('Check karein')}</Button>
              <Button size="sm" variant="ghost" icon={KeyRound} onPress={() => setReplace((v) => !v)}>{replace ? t('Rehne dein') : t('Nayi key')}</Button>
              <Button size="sm" variant="critical" icon={Unplug} loading={disconnect.isPending}
                onPress={guard(async () => { if (await confirm({ title: t('{{name}} hatayein?', { name: c.name }), message: t('Book parcels ki tracking ruk jayegi (orders waise hi rahenge).'), tone: 'danger', confirmLabel: t('Hatayein') })) disconnect.mutate(); })}>{t('Hatayein')}</Button>
            </View>
          )}
        </Card>
      )}
      {replace && canManage && c.connect && (
        <Card title={c.connected ? t('Nayi key lagayein') : t('{{name}} jorein', { name: c.name })} description={t('Nafaa details usi waqt courier se check karta hai — ghalat details save nahi hotin.')}>
          <View style={{ gap: th.space(3) }}>
            {c.connect.portalUrl && <Button size="sm" variant="ghost" icon={ExternalLink} onPress={() => openInApp(c.connect!.portalUrl)} style={{ alignSelf: 'flex-start' }}>{t('{{name}} portal kholein', { name: c.name })}</Button>}
            {c.connect.steps.length > 0 && (
              <View style={{ gap: th.space(1) }}>
                {c.connect.steps.map((s, i) => <Text key={i} size="xs" tone="secondary">{i + 1}. {s}</Text>)}
              </View>
            )}
            {fields.map((f) => f.options ? (
              <Select key={f.key} label={`${f.label}${f.optional ? ` ${t('(optional)')}` : ''}`} hint={f.help} value={vals[f.key] ?? f.options[0]?.value ?? ''}
                onChange={(v) => setVals((s) => ({ ...s, [f.key]: v }))} options={f.options} />
            ) : f.secret ? (
              <PasswordInput key={f.key} label={`${f.label}${f.optional ? ` ${t('(optional)')}` : ''}`} hint={f.help} value={vals[f.key] ?? ''} placeholder={f.placeholder}
                onChangeText={(v) => setVals((s) => ({ ...s, [f.key]: v }))} />
            ) : (
              <Input key={f.key} label={`${f.label}${f.optional ? ` ${t('(optional)')}` : ''}`} hint={f.help} value={vals[f.key] ?? ''} placeholder={f.placeholder} ltr autoCapitalize="none" autoCorrect={false}
                onChangeText={(v) => setVals((s) => ({ ...s, [f.key]: v }))} />
            ))}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(1.5) }}>
              <Lock size={13} color={th.colors.textMuted} />
              <Text size="2xs" tone="muted" style={{ flex: 1 }}>{t('Keys encrypted save hoti hain · sirf malik / manager')}</Text>
            </View>
            <Button icon={Zap} loading={connect.isPending} disabled={missing} onPress={guard(() => connect.mutate())}>{c.connected ? t('Nayi key check karke lagayein') : t('Check karke jorein')}</Button>
          </View>
        </Card>
      )}
      {!c.connected && c.connect && (
        <Card title={t('Jurne ke baad kya milega')}>
          {[t('Ek click booking aur CN'), c.connect.features.label ? t('Label print') : t('Tracking khud'), t('Deliver aur RTO par order khud update'), c.connect.features.settlement ? t('COD settlement khud') : t('COD hisaab ek jagah')].map((x) => (
            <View key={x} style={{ flexDirection: 'row', gap: th.space(2), marginTop: th.space(1) }}>
              <CheckCircle2 size={16} color={th.colors.success.text} /><Text size="sm">{x}</Text>
            </View>
          ))}
        </Card>
      )}
    </View>
  );
}
