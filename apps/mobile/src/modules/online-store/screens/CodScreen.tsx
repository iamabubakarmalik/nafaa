/**
 * COD and courier money: what is on the road, what couriers collected but
 * have not paid in (by how many days), settlements received, parcels that
 * came back, and each courier's numbers. Orders are marked paid from the
 * courier's sheet: pick them, paste the sheet's CNs, or upload the statement
 * (reconcile). Mirrors the web CodPage.
 */

import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2, ChevronDown, ClipboardPaste, Download, FileSpreadsheet, Hourglass, PackageX, ReceiptText, Truck, Wallet,
} from 'lucide-react-native';
import { matchSettlementText, orderNo, rtoTone, sumBy, type CodSummary } from '@nafaa/core/online-store';
import { haptic } from '@/core/device/haptics';
import { formatDate, formatDateTime, formatMoney } from '@/core/format';
import { msg, t } from '@/core/i18n';
import { PERMISSIONS, usePermission } from '@/core/permissions';
import {
  Amount, Badge, Button, Card, ChipGroup, Checkbox, EmptyState, IconButton, Input, PressableScale, Screen, SearchBar, Sheet, SkeletonRows,
  Tabs, Text, TextArea, toast, useDebouncedValue, useTheme,
} from '@/design';
import { apiErrorMessage, ordersApi } from '../api/online';
import { CourierLogo } from '../components/BrandLogo';
import { SavedDataNote } from '../components/bits';
import { OnlineMenuButton } from '../components/OnlineMenu';
import { KpiHero } from '../components/CommerceHero';
import { KEYS, refreshOrders, useOnlineGuard } from '../lib/online';
import { periodOptions, periodRange, type PeriodPreset } from '../lib/period';
import { shareCsv } from '../lib/docs';

type Tab = 'with' | 'transit' | 'settled' | 'rto' | 'couriers';

export function CodScreen() {
  const th = useTheme();
  const qc = useQueryClient();
  const can = usePermission();
  const canManage = can(PERMISSIONS.ONLINE_ORDERS_MANAGE);
  const { guard } = useOnlineGuard();
  const [tab, setTab] = useState<Tab>('with');
  const [period, setPeriod] = useState<PeriodPreset>('thisMonth');
  const [courier, setCourier] = useState('');
  const [search, setSearch] = useState('');
  const term = useDebouncedValue(search.trim().toLowerCase(), 200);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [settleOpen, setSettleOpen] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [reference, setReference] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [openBatch, setOpenBatch] = useState<string | null>(null);

  const range = periodRange(period);
  const summaryQ = useQuery({ queryKey: KEYS.codSummary, queryFn: ordersApi.codSummary, refetchInterval: 60_000 });
  const historyQ = useQuery({ queryKey: [...KEYS.codHistory, range?.from, range?.to], queryFn: () => ordersApi.codHistory(range ?? {}), placeholderData: (p) => p });
  const transitQ = useQuery({ queryKey: [...KEYS.orders, 'cod-transit'], queryFn: () => ordersApi.list({ status: 'OUT_FOR_DELIVERY', pay: 'COD', limit: 200 }), enabled: tab === 'transit' });
  const s = summaryQ.data;
  const h = historyQ.data;
  const NO_COURIER = t('Courier nahi likha');
  const courierOk = (name?: string | null) => !courier || (name ?? NO_COURIER) === courier;
  const match = (...f: Array<string | null | undefined>) => !term || f.filter(Boolean).join(' ').toLowerCase().includes(term);

  const withRows = useMemo(() => (s?.withCourier ?? []).filter((o) => courierOk(o.courier) && match(o.externalOrderNumber, o.externalOrderId, o.customerName, o.trackingNumber, o.customerCity)),
    [s, courier, term]); // eslint-disable-line react-hooks/exhaustive-deps
  const transitRows = useMemo(() => (transitQ.data?.items ?? []).filter((o) => courierOk(o.courierLabel) && match(o.externalOrderNumber, o.externalOrderId, o.customerName, o.trackingNumber, o.customerCity)),
    [transitQ.data, courier, term]); // eslint-disable-line react-hooks/exhaustive-deps
  const batches = useMemo(() => (h?.settlements ?? []).filter((b) => (!courier || b.couriers.includes(courier)) && match(b.ref, ...b.orders.map((o) => `${o.number} ${o.customerName} ${o.trackingNumber ?? ''}`))),
    [h, courier, term]); // eslint-disable-line react-hooks/exhaustive-deps
  const returns = useMemo(() => (h?.returns ?? []).filter((r) => courierOk(r.courier) && match(r.number, r.customerName, r.trackingNumber, r.customerCity, r.reason)),
    [h, courier, term]); // eslint-disable-line react-hooks/exhaustive-deps
  const courierNames = useMemo(() => [...new Set((s?.couriers ?? []).map((c) => c.name))], [s]);
  const late = (s?.withCourier ?? []).filter((o) => (o.daysWaiting ?? 0) >= 7);
  const pickedRows = withRows.filter((r) => picked.has(r.id));
  useEffect(() => { setPicked(new Set()); }, [courier]);

  const settle = useMutation({
    mutationFn: () => ordersApi.settleCod([...picked], reference.trim() || undefined),
    onSuccess: (r) => {
      haptic('success');
      toast.success(t('{{settled}} orders ka paisa mil gaya', { settled: r.settled }));
      setPicked(new Set()); setReference(''); setSettleOpen(false);
      refreshOrders(qc);
    },
    onError: (e) => toast.error(apiErrorMessage(e, t('Nahi hua'))),
  });

  const pickFromSheet = () => {
    const hits = matchSettlementText(withRows, pasteText);
    setPicked(new Set(hits.map((o) => o.id)));
    setPasteOpen(false); setPasteText('');
    if (hits.length) toast.success(t('{{count}} order mil gaye · {{formatPKR}} — ab "Paisa mil gaya" dabayein', { count: hits.length, formatPKR: formatMoney(sumBy(hits, (o) => o.total)) }));
    else toast.error(t('Sheet ka koi CN ya order number list me nahi mila'));
  };

  const exportCsv = () => {
    const rows: unknown[][] = tab === 'settled'
      ? [[t('Date'), t('Ref'), t('Order'), t('Customer'), t('Courier'), 'CN', t('Amount')], ...batches.flatMap((b) => b.orders.map((o) => [b.day, b.ref ?? '', o.number, o.customerName, o.courier, o.trackingNumber ?? '', o.total]))]
      : tab === 'rto'
        ? [[t('Order'), t('Customer'), t('Shehar'), t('Courier'), 'CN', t('Wajah'), t('Wapas aaya'), t('Amount')], ...returns.map((r) => [r.number, r.customerName, r.customerCity ?? '', r.courier, r.trackingNumber ?? '', r.reason ?? '', formatDate(r.returnedAt), r.total])]
        : tab === 'transit'
          ? [[t('Order'), t('Customer'), t('Shehar'), t('Courier'), 'CN', t('Bheja'), t('Amount')], ...transitRows.map((o) => [orderNo(o), o.customerName, o.customerCity ?? '', o.courierLabel ?? '', o.trackingNumber ?? '', o.dispatchedAt ? formatDate(o.dispatchedAt) : '', o.total])]
          : tab === 'couriers'
            ? [[t('Courier'), t('Raste me'), t('Courier ke paas'), t('Is mahine mila'), t('Bheje (30 din)'), t('Wapas (30 din)'), t('RTO %')], ...(s?.couriers ?? []).map((c) => [c.name, c.inTransitValue, c.withCourierValue, c.settledMonthValue, c.dispatched30, c.returned30, c.rtoRate])]
            : [[t('Order'), t('Customer'), t('Shehar'), t('Courier'), 'CN', t('Deliver hua'), t('Din'), t('Amount')], ...withRows.map((o) => [o.externalOrderNumber ?? o.externalOrderId, o.customerName, o.customerCity ?? '', o.courier ?? '', o.trackingNumber ?? '', o.deliveredAt ? formatDate(o.deliveredAt) : '', o.daysWaiting ?? '', o.total])];
    if (rows.length < 2) { toast.error(t('Is list me kuch nahi')); return; }
    void shareCsv(`cod-${tab}.csv`, rows);
  };

  const open = (id: string) => router.push(`/online/orders/${id}` as never);
  const dated = tab === 'settled' || tab === 'rto';

  return (
    <Screen title={t('COD & courier')} actions={<>
      <IconButton icon={Download} label={t('CSV')} onPress={exportCsv} />
      <IconButton icon={FileSpreadsheet} label={t('Statement milayein')} onPress={() => router.push('/online/cod-reconcile' as never)} />
      <OnlineMenuButton current="/online/cod" />
    </>} onRefresh={() => { void summaryQ.refetch(); void historyQ.refetch(); void transitQ.refetch(); }} refreshing={summaryQ.isRefetching}>
      <SavedDataNote query={summaryQ} />
      <KpiHero items={[
        { key: 'with', label: t('Courier ke paas'), icon: Wallet, tone: 'warning', loading: !s, value: <Amount value={s?.totals.withCourierValue ?? 0} size="lg" weight="bold" />,
          hint: t('{{withCourier}} deliver · paisa nahi aaya', { withCourier: s?.totals.withCourier ?? 0 }), onPress: () => setTab('with') },
        { key: 'transit', label: t('Raste me (COD)'), icon: Truck, tone: 'info', loading: !s, value: <Amount value={s?.totals.inTransitValue ?? 0} size="lg" weight="bold" />,
          hint: t('{{inTransit}} parcel', { inTransit: s?.totals.inTransit ?? 0 }), onPress: () => setTab('transit') },
        { key: 'settled', label: t('Settlement mila'), icon: ReceiptText, tone: 'success', loading: !h, value: <Amount value={h?.totals.settledValue ?? 0} size="lg" weight="bold" />,
          hint: t('{{settled}} order', { settled: h?.totals.settled ?? 0 }), onPress: () => setTab('settled') },
        { key: 'rto', label: t('Wapas aaye (RTO)'), icon: PackageX, tone: 'danger', loading: !h, value: String(h?.totals.returned ?? 0),
          hint: h ? t('{{returnedValue}} ka maal', { returnedValue: formatMoney(h.totals.returnedValue) }) : undefined, onPress: () => setTab('rto') },
        { key: 'late', label: t('7+ din se atka'), icon: Hourglass, tone: 'warning', loading: !s, value: <Amount value={sumBy(late, (o) => o.total)} size="lg" weight="bold" />,
          hint: t('{{count}} parcel · courier se poochein', { count: late.length }), onPress: () => setTab('with') },
      ]} />

      <Tabs value={tab} onChange={setTab} tabs={[
        { value: 'with', label: t('Courier ke paas'), count: s?.totals.withCourier },
        { value: 'transit', label: t('Raste me'), count: s?.totals.inTransit },
        { value: 'settled', label: t('Settlements'), count: h?.settlements.length },
        { value: 'rto', label: t('Wapas (RTO)'), count: h?.totals.returned },
        { value: 'couriers', label: t('Courier-wise') },
      ]} />
      <SearchBar value={search} onChangeText={setSearch} placeholder={t('Order #, CN, customer ya shehar…')} />
      {courierNames.length > 0 && tab !== 'couriers' && (
        <ChipGroup value={courier} onChange={setCourier} style={{ marginHorizontal: -th.space(4) }}
          options={[{ value: '', label: t('Sab couriers') }, ...courierNames.map((n) => ({ value: n, label: n }))]} />
      )}
      {dated && <ChipGroup value={period} onChange={(v) => setPeriod(v as PeriodPreset)} style={{ marginHorizontal: -th.space(4) }}
        options={periodOptions(['thisMonth', 'month', 'quarter', 'week', 'today']).map((o) => ({ ...o, label: t(o.label) }))} />}

      {!s ? <SkeletonRows count={6} /> : tab === 'with' ? (
        <>
          {s.totals.withCourier > 0 && s.couriers.some((c) => c.withCourierValue > 0) && <HoldingCard s={s} onCourier={setCourier} />}
          {canManage && (
            <View style={{ flexDirection: 'row', gap: th.space(2) }}>
              <Button size="sm" variant="secondary" icon={ClipboardPaste} disabled={!withRows.length} onPress={() => setPasteOpen(true)}>{t('CN paste')}</Button>
              <Button size="sm" variant="secondary" icon={FileSpreadsheet} onPress={() => router.push('/online/cod-reconcile' as never)}>{t('Statement upload')}</Button>
            </View>
          )}
          <Text size="xs" tone="muted">{t('Customer ne courier ko paisa de diya, courier ne abhi jama nahi karwaya. Settlement sheet se mila kar chunein.')}</Text>
          {!withRows.length ? <EmptyState icon={CheckCircle2} title={courier || term ? t('Is filter me kuch nahi') : t('Kisi courier ke paas paisa nahi atka')} message={t('Deliver hue sab COD orders ka paisa aa chuka hai.')} /> : (
            <Card flush>
              {canManage && (
                <View style={{ paddingHorizontal: th.space(4), paddingVertical: th.space(2) }}>
                  <Checkbox value={withRows.every((r) => picked.has(r.id))} onChange={(v) => setPicked(v ? new Set(withRows.map((r) => r.id)) : new Set())} label={t('Sab chunein')} />
                </View>
              )}
              {withRows.map((o) => (
                <PressableScale key={o.id} onPress={() => (canManage ? setPicked((p) => { const n = new Set(p); if (n.has(o.id)) n.delete(o.id); else n.add(o.id); return n; }) : open(o.id))}
                  onLongPress={() => open(o.id)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(3), paddingHorizontal: th.space(4), paddingVertical: th.space(2.5), borderTopWidth: 1, borderTopColor: th.colors.divider, backgroundColor: picked.has(o.id) ? th.colors.brand.soft : undefined }}>
                  {canManage && <Checkbox value={picked.has(o.id)} onChange={() => setPicked((p) => { const n = new Set(p); if (n.has(o.id)) n.delete(o.id); else n.add(o.id); return n; })} />}
                  <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                    <Text size="sm" weight="semibold" numberOfLines={1}>#{o.externalOrderNumber ?? o.externalOrderId} <Text size="sm" tone="secondary">· {o.customerName}{o.customerCity ? ` · ${o.customerCity}` : ''}</Text></Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(1.5) }}>
                      <CourierLogo code={o.courier} size={16} />
                      <Text size="xs" tone="muted" numberOfLines={1} style={{ flex: 1 }}>{o.courier ?? NO_COURIER}{o.trackingNumber ? ` · ${o.trackingNumber}` : ''}{o.deliveredAt ? ` · ${formatDate(o.deliveredAt)}` : ''}</Text>
                      {(o.daysWaiting ?? 0) >= 7 && <Badge tone="warning">{t('{{daysWaiting}} din', { daysWaiting: o.daysWaiting })}</Badge>}
                    </View>
                  </View>
                  <Amount value={o.total} weight="semibold" size="sm" />
                </PressableScale>
              ))}
            </Card>
          )}
        </>
      ) : tab === 'transit' ? (
        transitQ.isLoading ? <SkeletonRows count={5} /> : !transitRows.length ? <EmptyState icon={Truck} title={t('Abhi koi COD parcel raste me nahi')} message={t('Courier ko diye hue COD orders yahan dikhte hain jab tak deliver na hon.')} /> : (
          <Card flush>
            {transitRows.map((o, i) => {
              const d = o.dispatchedAt ? Math.floor((Date.now() - new Date(o.dispatchedAt).getTime()) / 86_400_000) : null;
              return (
                <PressableScale key={o.id} onPress={() => open(o.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(3), paddingHorizontal: th.space(4), paddingVertical: th.space(2.5), borderTopWidth: i ? 1 : 0, borderTopColor: th.colors.divider }}>
                  <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                    <Text size="sm" weight="semibold" numberOfLines={1}>#{orderNo(o)} <Text size="sm" tone="secondary">· {o.customerName}{o.customerCity ? ` · ${o.customerCity}` : ''}</Text></Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(1.5) }}>
                      <CourierLogo code={o.courierCode ?? o.courierLabel} size={16} />
                      <Text size="xs" tone="muted" numberOfLines={1} style={{ flex: 1 }}>{o.courierLabel ?? NO_COURIER}{o.trackingNumber ? ` · ${o.trackingNumber}` : ''}{o.courierTrail?.label ? ` · ${o.courierTrail.label}` : ''}</Text>
                    </View>
                    {d != null && <Text size="2xs" tone={d >= 5 ? 'warning' : 'muted'} weight={d >= 5 ? 'semibold' : 'regular'}>{d === 0 ? t('aaj bheja') : t('{{d}} din se', { d })}</Text>}
                  </View>
                  <Amount value={o.total} weight="semibold" size="sm" />
                </PressableScale>
              );
            })}
          </Card>
        )
      ) : tab === 'settled' ? (
        historyQ.isLoading ? <SkeletonRows count={5} /> : !batches.length ? <EmptyState icon={ReceiptText} title={t('Is period me koi settlement nahi')} message={t('"Courier ke paas" se orders chun kar "Paisa mil gaya" dabayein — yahan record banega.')} /> : (
          <Card flush>
            {batches.map((b, i) => {
              const key = `${b.ref ?? ''}|${b.day}`;
              const isOpen = openBatch === key;
              return (
                <View key={key} style={{ borderTopWidth: i ? 1 : 0, borderTopColor: th.colors.divider }}>
                  <PressableScale onPress={() => setOpenBatch(isOpen ? null : key)} style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(3), paddingHorizontal: th.space(4), paddingVertical: th.space(3) }}>
                    <View style={{ width: 36, height: 36, borderRadius: th.radius('md'), backgroundColor: th.colors.success.soft, alignItems: 'center', justifyContent: 'center' }}><ReceiptText size={16} color={th.colors.success.text} /></View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text size="sm" weight="semibold">{formatDate(`${b.day}T12:00:00`)} <Text size="sm" tone="muted">{b.ref ? t('· ref {{ref}}', { ref: b.ref }) : t('· bina ref')}</Text></Text>
                      <Text size="xs" tone="muted" numberOfLines={1}>{t('{{count}} order · {{value}}', { count: b.count, value: b.couriers.join(', ') })}</Text>
                    </View>
                    <Amount value={b.value} weight="bold" size="sm" tone="success" />
                    <ChevronDown size={16} color={th.colors.textMuted} style={{ transform: [{ rotate: isOpen ? '180deg' : '0deg' }] }} />
                  </PressableScale>
                  {isOpen && b.orders.map((o) => (
                    <PressableScale key={o.id} onPress={() => open(o.id)} style={{ flexDirection: 'row', gap: th.space(2), paddingStart: th.space(16), paddingEnd: th.space(4), paddingVertical: th.space(1.5) }}>
                      <Text size="xs" weight="semibold">#{o.number}</Text>
                      <Text size="xs" tone="muted" numberOfLines={1} style={{ flex: 1 }}>{o.customerName} · {o.courier}{o.trackingNumber ? ` · ${o.trackingNumber}` : ''}</Text>
                      <Amount value={o.total} size="xs" />
                    </PressableScale>
                  ))}
                </View>
              );
            })}
          </Card>
        )
      ) : tab === 'rto' ? (
        historyQ.isLoading ? <SkeletonRows count={5} /> : !returns.length ? <EmptyState icon={PackageX} title={t('Is period me koi parcel wapas nahi aaya')} message={t('Wapas (RTO) par bill void hota hai aur stock khud wapas aa jata hai.')} /> : (
          <Card flush>
            {returns.map((r, i) => (
              <PressableScale key={r.id} onPress={() => open(r.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(3), paddingHorizontal: th.space(4), paddingVertical: th.space(2.5), borderTopWidth: i ? 1 : 0, borderTopColor: th.colors.divider }}>
                <CourierLogo code={r.courier} size={28} />
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <Text size="sm" weight="semibold" numberOfLines={1}>#{r.number} <Text size="sm" tone="secondary">· {r.customerName}{r.customerCity ? ` · ${r.customerCity}` : ''}</Text></Text>
                  <Text size="xs" tone="muted" numberOfLines={1}>{[r.reason, formatDateTime(r.returnedAt), r.daysOut != null ? t('{{daysOut}} din bahar raha', { daysOut: r.daysOut }) : null].filter(Boolean).join(' · ')}</Text>
                </View>
                <Amount value={r.total} weight="semibold" size="sm" />
              </PressableScale>
            ))}
          </Card>
        )
      ) : (
        !s.couriers.length ? <EmptyState icon={Truck} title={t('Abhi koi parcel nahi bheja')} message={t('Order par "Rider/courier ko de diya" me courier aur CN daalein — hisaab yahan banega.')} /> : (
          <Card flush title={t('Courier-wise hisaab')} description={t('Raste me, courier ke paas aur is mahine mila — RTO pichhle 30 din ka')}>
            {s.couriers.map((c) => (
              <PressableScale key={c.code || c.name} onPress={() => { setCourier(c.name); setTab('with'); }} style={{ paddingHorizontal: th.space(4), paddingVertical: th.space(3), borderTopWidth: 1, borderTopColor: th.colors.divider, gap: th.space(2) }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2) }}>
                  <CourierLogo code={c.code || c.name} size={24} />
                  <Text size="sm" weight="bold" style={{ flex: 1 }}>{c.name}</Text>
                  <Badge tone={rtoTone(c.rtoRate, 12, 25)}>{t('RTO {{rto}}%', { rto: c.rtoRate })}</Badge>
                  <Text size="2xs" tone="muted" ltr>{c.returned30}/{c.dispatched30}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: th.space(2) }}>
                  <MiniStat label={t('Raste me')} value={c.inTransitValue} hint={c.inTransit} />
                  <MiniStat label={t('Courier ke paas')} value={c.withCourierValue} hint={c.withCourier} warn={c.withCourierValue > 0} />
                  <MiniStat label={t('Mila')} value={c.settledMonthValue} hint={c.settledMonth} />
                </View>
              </PressableScale>
            ))}
          </Card>
        )
      )}

      {canManage && picked.size > 0 && (
        <View style={{ height: 80 }} />
      )}
      {canManage && picked.size > 0 && (
        <Card tone="brand">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2) }}>
            <Text size="sm" weight="bold" style={{ flex: 1 }}>{t('{{size}} chune · {{pickedValue}}', { size: picked.size, pickedValue: formatMoney(sumBy(pickedRows, (r) => r.total)) })}</Text>
            <Button size="sm" variant="ghost" onPress={() => setPicked(new Set())}>{t('Chhoro')}</Button>
            <Button size="sm" variant="success" icon={CheckCircle2} onPress={() => setSettleOpen(true)}>{t('Paisa mil gaya')}</Button>
          </View>
        </Card>
      )}

      <Sheet open={settleOpen} onClose={() => setSettleOpen(false)} title={t('{{size}} chune · {{pickedValue}}', { size: picked.size, pickedValue: formatMoney(sumBy(pickedRows, (r) => r.total)) })}
        footer={<Button fullWidth size="lg" variant="success" icon={CheckCircle2} loading={settle.isPending} onPress={guard(() => settle.mutate())}>{t('Paisa mil gaya')}</Button>}>
        <Input label={t('Settlement / cheque ref (zaroori nahi)')} value={reference} onChangeText={setReference} ltr />
      </Sheet>
      <Sheet open={pasteOpen} onClose={() => setPasteOpen(false)} title={t('Settlement sheet se milayein')}
        description={t('Courier ki sheet (Excel ya PDF) se CN ya order number copy karke yahan paste karein. Jo list me milenge woh chun liye jayenge.')}
        footer={<Button fullWidth size="lg" disabled={!pasteText.trim()} onPress={pickFromSheet}>{t('Orders chunein')}</Button>}>
        <TextArea value={pasteText} onChangeText={setPasteText} ltr placeholder={t('CN ya order number — har line par ek, ya comma se alag\nMaslan:\n12345678901\n#1042')} numberOfLines={8} />
      </Sheet>
    </Screen>
  );
}

function MiniStat({ label, value, hint, warn }: { label: string; value: number; hint?: number; warn?: boolean }) {
  const th = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: th.colors.surfaceMuted, borderRadius: th.radius('md'), padding: th.space(2) }}>
      <Text size="2xs" tone="muted" numberOfLines={1}>{label}</Text>
      <Amount value={value} size="sm" weight="bold" tone={warn ? 'warning' : undefined} />
      {hint != null && <Text size="2xs" tone="subtle" ltr>{hint}</Text>}
    </View>
  );
}

/** Money with each courier by how long ago the parcel was delivered. */
function HoldingCard({ s, onCourier }: { s: CodSummary; onCourier: (name: string) => void }) {
  const th = useTheme();
  const AGE = [msg('0–7 din'), msg('8–15 din'), msg('16–30 din'), msg('30+ din')];
  const labels = (s.ageLabels ?? AGE).map((l) => t(l));
  const rows = s.couriers.filter((c) => c.withCourierValue > 0);
  return (
    <Card flush title={t('Courier ke paas kitna paisa hai')} description={t('Deliver ho chuka, paisa abhi nahi aaya — kitne din se')}>
      {rows.map((c) => (
        <PressableScale key={c.code || c.name} onPress={() => onCourier(c.name)} style={{ paddingHorizontal: th.space(4), paddingVertical: th.space(2.5), borderTopWidth: 1, borderTopColor: th.colors.divider, gap: th.space(1.5) }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2) }}>
            <CourierLogo code={c.code || c.name} size={20} />
            <Text size="sm" weight="semibold" style={{ flex: 1 }}>{c.name}</Text>
            <Amount value={c.withCourierValue} weight="bold" size="sm" />
          </View>
          <View style={{ flexDirection: 'row', gap: th.space(1.5) }}>
            {(c.age ?? [0, 0, 0, 0]).map((v, i) => (
              <View key={i} style={{ flex: 1, borderRadius: th.radius('sm'), padding: th.space(1.5), backgroundColor: v > 0 && i >= 2 ? th.colors.danger.soft : v > 0 && i === 1 ? th.colors.warning.soft : th.colors.surfaceMuted }}>
                <Text size="2xs" tone="muted" numberOfLines={1}>{labels[i]}</Text>
                <Text size="xs" weight="semibold" ltr tone={v > 0 && i >= 2 ? 'danger' : v > 0 && i === 1 ? 'warning' : v > 0 ? 'default' : 'subtle'}>{v > 0 ? formatMoney(v) : '—'}</Text>
              </View>
            ))}
          </View>
        </PressableScale>
      ))}
    </Card>
  );
}
