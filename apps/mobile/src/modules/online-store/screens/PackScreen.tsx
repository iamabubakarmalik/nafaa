/**
 * Scan to pack. Scan (camera) or type the order number or courier CN to
 * open the order, then scan every item's barcode or SKU. A wrong item or one
 * piece too many stops the screen with a loud red warning until cleared;
 * when every line is complete, "Pack ho gaya" marks the order ready. Below,
 * the orders waiting to be packed, with slips and labels for the ticked ones.
 * Mirrors the web PackPage.
 */

import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertOctagon, CheckCircle2, Hand, Package, PackageCheck, Printer, RotateCcw, ScanLine, Tag, Truck } from 'lucide-react-native';
import { lineDone, matchScan, packProgress, type OnlineOrder, type ScanOrder } from '@nafaa/core/online-store';
import { useAuthStore } from '@/core/auth/store';
import { haptic } from '@/core/device/haptics';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { onlineNeededText } from '@/core/offline';
import {
  Badge, Button, Card, Checkbox, EmptyState, IconButton, Input, PressableScale, ProgressBar, Screen, SkeletonRows, Text, toast, useTheme,
} from '@/design';
import { apiErrorMessage, ordersApi, scanApi } from '../api/online';
import { CourierLogo } from '../components/BrandLogo';
import { OrderStatusBadge, SavedDataNote } from '../components/bits';
import { Scanner, type ScanFlash } from '@/core/hardware/scanner';
import { OnlineMenuButton } from '../components/OnlineMenu';
import { CommerceHero } from '../components/CommerceHero';
import { OrderMiniList, useBoardSlice } from '../components/board/OrderMiniList';
import { KEYS, useOnlineGuard } from '../lib/online';
import { openCourierLabel, openCourierLabels, printInvoices } from '../lib/docs';
import { useShopLanguage } from '../lib/messages';

type Alarm = { title: string; text: string } | null;

export function PackScreen() {
  const th = useTheme();
  const qc = useQueryClient();
  const shopName = useAuthStore((s) => s.tenant?.name ?? '');
  const lang = useShopLanguage();
  const { online, guard } = useOnlineGuard();
  const [value, setValue] = useState('');
  const [order, setOrder] = useState<ScanOrder | null>(null);
  const [counts, setCounts] = useState<Record<number, number>>({});
  const [manual, setManual] = useState<number[]>([]);
  const [alarm, setAlarm] = useState<Alarm>(null);
  const [flash, setFlash] = useState<ScanFlash>(null);
  const [lastHit, setLastHit] = useState<number | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [camera, setCamera] = useState(true);

  const queue = useQuery({ queryKey: [...KEYS.orders, 'pack-queue'], queryFn: () => ordersApi.list({ status: 'ACTIVE', limit: 100 }), refetchInterval: 30_000 });
  const confirmedQ = useBoardSlice('pack-confirmed', { board: 'CONFIRMED' }, 1);
  const packedQ = useBoardSlice('pack-packed', { board: 'PACKED' });
  const notSentQ = useBoardSlice('pack-not-sent', { board: 'PACKED_NOT_SENT' }, 1);
  const waiting = (queue.data?.items ?? []).filter((o) => ['CONFIRMED', 'PREPARING', 'READY'].includes(o.orderStatus));

  const signal = (ok: boolean) => { haptic(ok ? 'success' : 'error'); setFlash(ok ? 'ok' : 'bad'); setTimeout(() => setFlash(null), 700); };
  const reset = () => { setOrder(null); setCounts({}); setManual([]); setAlarm(null); setValue(''); setLastHit(null); };

  const lookup = useMutation({
    mutationFn: (code: string) => scanApi.lookup(code),
    onSuccess: (o) => {
      setOrder(o); setCounts({}); setManual([]); setValue(''); setLastHit(null);
      if (!o.canPack) { signal(false); setAlarm({ title: t('Order #{{number}}', { number: o.number }), text: o.packProblem ?? t('Ye order pack nahi ho sakta') }); }
      else signal(true);
    },
    onError: (e) => { signal(false); setAlarm({ title: t('Order nahi mila'), text: apiErrorMessage(e, t('Order nahi mila')) }); setValue(''); },
  });

  const pack = useMutation({
    mutationFn: () => scanApi.packed(order!.id, counts, manual),
    onSuccess: (r) => {
      signal(true);
      toast.success(t('#{{number}} pack ho gaya — Ready', { number: r.order.number }), {
        action: { label: t('Slip print'), onPress: () => printInvoices([r.order.id], shopName, lang) },
      });
      qc.invalidateQueries({ queryKey: KEYS.orders });
      reset();
    },
    onError: (e) => { signal(false); setAlarm({ title: t('Pack nahi hua'), text: apiErrorMessage(e, t('Pack nahi hua')) }); },
  });

  const lines = order?.lines ?? [];
  const progress = packProgress(lines, counts, manual);
  const complete = !!order && order.canPack && progress.complete;

  const onScan = (raw: string) => {
    const code = raw.trim();
    if (!code || alarm || lookup.isPending) return;
    if (!online) { toast.warning(onlineNeededText('onlineOrders')); return; }
    // No order open, the open one cannot be packed, or it is done: this scan is an order number or CN.
    if (!order || !order.canPack || complete) { lookup.mutate(code); return; }
    const r = matchScan(lines, counts, code);
    setValue('');
    if (r.kind === 'WRONG') { signal(false); setAlarm({ title: t('Ghalat cheez!'), text: t('"{{code}}" is order me nahi hai — ye parcel me mat daalein.', { code }) }); return; }
    if (r.kind === 'EXTRA') {
      signal(false);
      const l = lines.find((x) => x.index === r.index)!;
      setAlarm({ title: t('Zyada ho gaya!'), text: t('{{name}}{{value}} sirf {{quantity}} chahiye — ek wapas nikal dein.', { name: l.name, value: l.variant ? ` (${l.variant})` : '', quantity: l.quantity }) });
      return;
    }
    signal(true);
    setCounts((c) => ({ ...c, [r.index]: (c[r.index] ?? 0) + 1 }));
    setLastHit(r.index);
  };

  const pickedOrders = useMemo(() => waiting.filter((o) => picked.has(o.id)), [waiting, picked]);
  const labels = useMutation({
    mutationFn: async () => {
      const byCourier = new Map<string, string[]>();
      for (const o of pickedOrders) if (o.courierBooked && o.trackingNumber && o.courierCode) byCourier.set(o.courierCode, [...(byCourier.get(o.courierCode) ?? []), o.trackingNumber]);
      if (!byCourier.size) throw new Error(t('Chune orders me koi courier par book nahi — label nahi bana'));
      for (const [code, tns] of byCourier) await openCourierLabels(code, tns);
    },
    onError: (e) => toast.error((e as Error).message),
  });
  const togglePick = (o: OnlineOrder) => setPicked((p) => { const n = new Set(p); if (n.has(o.id)) n.delete(o.id); else n.add(o.id); return n; });
  const waitingFor = !order || complete || !order.canPack;

  return (
    <Screen title={t('Packing')} actions={<>
      <IconButton icon={RotateCcw} label={t('RTO returns')} onPress={() => router.push('/online/returns' as never)} />
      <OnlineMenuButton current="/online/pack" />
    </>} onRefresh={() => queue.refetch()} refreshing={queue.isRefetching} keyboard>
      <CommerceHero chip={t('Packing')} loading={queue.isLoading}
        stats={[
          { label: t('Pack karne hain'), value: String(confirmedQ.data?.total ?? 0) },
          { label: t('Packed'), value: String(packedQ.data?.total ?? 0) },
          { label: t('Packed not sent'), value: String(notSentQ.data?.total ?? 0) },
        ]} />
      <SavedDataNote query={queue} />
      <Scanner variant="inline" active={camera && !alarm} flash={flash} onCode={onScan} height={order ? 170 : 230} />
      <View style={{ flexDirection: 'row', gap: th.space(2), alignItems: 'flex-end' }}>
        <Input containerStyle={{ flex: 1 }} value={value} onChangeText={setValue} icon={ScanLine} ltr autoCapitalize="characters" autoCorrect={false}
          placeholder={waitingFor ? t('Order # ya CN scan karein…') : t('Cheez ka barcode / SKU scan karein…')}
          returnKeyType="go" onSubmitEditing={() => onScan(value)} disabled={!!alarm} />
        <Button size="lg" loading={lookup.isPending} disabled={!value.trim() || !!alarm} onPress={() => onScan(value)}>{t('Scan')}</Button>
      </View>
      <Button size="sm" variant="ghost" onPress={() => setCamera((v) => !v)} style={{ alignSelf: 'flex-start' }}>{camera ? t('Camera band') : t('Camera kholein')}</Button>

      {alarm && (
        <View accessibilityRole="alert" style={{ backgroundColor: th.colors.danger.solid, borderRadius: th.radius('xl'), padding: th.space(4), gap: th.space(2), alignItems: 'center' }}>
          <AlertOctagon size={44} color={th.colors.danger.onSolid} />
          <Text size="2xl" weight="heavy" color={th.colors.danger.onSolid} align="center">{alarm.title}</Text>
          <Text size="base" weight="semibold" color={th.colors.danger.onSolid} align="center">{alarm.text}</Text>
          <Button size="lg" variant="inverse" onPress={() => setAlarm(null)}>{t('Theek hai')}</Button>
        </View>
      )}

      {lookup.isPending && !order && <SkeletonRows count={3} />}

      {order && (
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(3) }}>
            {order.courierCode ? <CourierLogo code={order.courierCode} size={36} /> : null}
            <View style={{ flex: 1, gap: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2), flexWrap: 'wrap' }}>
                <Text size="lg" weight="bold" ltr>#{order.number}</Text>
                <OrderStatusBadge status={order.orderStatus as OnlineOrder['orderStatus']} />
              </View>
              <Text size="xs" tone="muted">{order.customerName}{order.customerCity ? ` · ${order.customerCity}` : ''} · {formatMoney(order.total)}{order.trackingNumber ? t(' · CN {{trackingNumber}}', { trackingNumber: order.trackingNumber }) : ''}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text size="2xl" weight="heavy" ltr tabular>{progress.done}<Text size="lg" tone="subtle">/{progress.total}</Text></Text>
              <Text size="2xs" tone="muted">{t('scan hue')}</Text>
            </View>
          </View>
          <View style={{ marginTop: th.space(2) }}><ProgressBar value={progress.total ? progress.done / progress.total : 0} tone={complete ? 'success' : 'brand'} /></View>
          <View style={{ marginTop: th.space(3), borderRadius: th.radius('lg'), borderWidth: 1, borderColor: th.colors.border, overflow: 'hidden' }}>
            {lines.map((l, i) => {
              const n = counts[l.index] ?? 0;
              const done = lineDone(l, counts, manual);
              return (
                <View key={l.index} style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(3), padding: th.space(3), borderTopWidth: i ? 1 : 0, borderTopColor: th.colors.divider,
                  backgroundColor: lastHit === l.index ? th.colors.success.soft : done ? th.colors.success.soft : undefined }}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text size="sm" weight="semibold" numberOfLines={2}>{l.name}{l.variant ? <Text size="sm" tone="muted"> · {l.variant}</Text> : null}</Text>
                    <Text size="2xs" tone="muted" ltr numberOfLines={1}>{l.codes.length ? l.codes.join(' · ') : t('Barcode / SKU nahi — haath se gin kar tick karein')}</Text>
                  </View>
                  {l.codes.length ? (
                    <View style={{ minWidth: 64, borderRadius: th.radius('md'), paddingVertical: th.space(1.5), alignItems: 'center',
                      backgroundColor: done ? th.colors.success.solid : n > 0 ? th.colors.brand.soft : th.colors.surfaceMuted }}>
                      <Text size="lg" weight="heavy" ltr color={done ? th.colors.success.onSolid : undefined}>{n}/{l.quantity}</Text>
                    </View>
                  ) : (
                    <PressableScale onPress={() => setManual((m) => (m.includes(l.index) ? m.filter((x) => x !== l.index) : [...m, l.index]))} haptic="select"
                      style={{ minWidth: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: th.radius('md'), paddingVertical: th.space(2), paddingHorizontal: th.space(2),
                        backgroundColor: done ? th.colors.success.solid : th.colors.warning.soft }}>
                      <Hand size={14} color={done ? th.colors.success.onSolid : th.colors.warning.text} />
                      <Text size="sm" weight="bold" color={done ? th.colors.success.onSolid : th.colors.warning.text}>{done ? t('Gin liya') : t('{{quantity}} gine', { quantity: l.quantity })}</Text>
                    </PressableScale>
                  )}
                </View>
              );
            })}
          </View>
          <View style={{ gap: th.space(2), marginTop: th.space(3) }}>
            <Button size="lg" variant="success" icon={PackageCheck} disabled={!complete || !!alarm} loading={pack.isPending} onPress={guard(() => pack.mutate())}>{t('Pack ho gaya')}</Button>
            <View style={{ flexDirection: 'row', gap: th.space(2) }}>
              <Button variant="secondary" icon={Printer} style={{ flex: 1 }} onPress={() => printInvoices([order.id], shopName, lang)}>{t('Slip')}</Button>
              {order.courierBooked && <Button variant="secondary" icon={Tag} style={{ flex: 1 }} onPress={() => openCourierLabel(order.id, order.number)}>{t('Label')}</Button>}
              <Button variant="ghost" style={{ flex: 1 }} onPress={reset}>{t('Agla order')}</Button>
            </View>
          </View>
        </Card>
      )}

      {!order && !lookup.isPending && !alarm && (
        <EmptyState compact icon={ScanLine} title={t('Order ka number ya courier CN scan karein')} message={t('Phir har cheez scan karein — ghalat ya zyada cheez par screen ruk jayegi.')} />
      )}

      <Card flush title={t('Pack hone wale orders')} description={t('Accept ho chuke, abhi courier ko nahi diye — chun kar slips ya labels ek saath print karein')}>
        {queue.isLoading ? <SkeletonRows count={3} /> : !waiting.length ? (
          <Text size="sm" tone="muted" align="center" style={{ padding: th.space(6) }}>{t('Koi order pack hone ka intezar nahi kar raha.')}</Text>
        ) : (
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2), paddingHorizontal: th.space(4), paddingVertical: th.space(2), borderTopWidth: 1, borderTopColor: th.colors.divider }}>
              <Checkbox value={waiting.every((o) => picked.has(o.id))} onChange={(v) => setPicked(v ? new Set(waiting.map((o) => o.id)) : new Set())} label={t('Sab chunein')} />
              <View style={{ flex: 1 }} />
              <Button size="sm" variant="secondary" icon={Printer} disabled={!pickedOrders.length} onPress={() => printInvoices(pickedOrders.map((o) => o.id), shopName, lang)}>{t('Slips ({{count}})', { count: pickedOrders.length })}</Button>
              <Button size="sm" variant="secondary" icon={Tag} disabled={!pickedOrders.some((o) => o.courierBooked)} loading={labels.isPending} onPress={() => labels.mutate()}>{t('Labels')}</Button>
            </View>
            {waiting.map((o) => {
              const num = String(o.externalOrderNumber ?? o.externalOrderId);
              const packed = !!(o.metadata as { packed?: unknown })?.packed;
              return (
                <PressableScale key={o.id} onPress={() => togglePick(o)} onLongPress={() => lookup.mutate(num)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(3), paddingHorizontal: th.space(4), paddingVertical: th.space(2.5), borderTopWidth: 1, borderTopColor: th.colors.divider }}>
                  <Checkbox value={picked.has(o.id)} onChange={() => togglePick(o)} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text size="sm" weight="semibold" numberOfLines={1}>#{num} <Text size="sm" tone="secondary">· {o.customerName}{o.customerCity ? ` · ${o.customerCity}` : ''}</Text></Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(1.5) }}>
                      {o.courierCode ? <><CourierLogo code={o.courierCode} size={14} /><Text size="xs" tone="muted" numberOfLines={1}>{o.courierLabel}{o.trackingNumber ? ` · ${o.trackingNumber}` : ''}</Text></>
                        : <><Truck size={13} color={th.colors.textMuted} /><Text size="xs" tone="muted">{t('Courier abhi nahi')}</Text></>}
                    </View>
                  </View>
                  {packed || o.orderStatus === 'READY' ? <Badge tone="success" icon={CheckCircle2}>{t('Ready')}</Badge> : <Badge tone="warning">{t('Pack baqi')}</Badge>}
                  <IconButton icon={Package} label={t('Pack karein')} size="sm" variant="secondary" onPress={() => lookup.mutate(num)} />
                </PressableScale>
              );
            })}
          </View>
        )}
      </Card>
      <OrderMiniList title={t('Packed — courier ko dene hain')} board="PACKED" query={packedQ} empty={t('Abhi koi packed parcel nahi')} />
      <Button variant="secondary" icon={ScanLine} onPress={() => router.push('/online/dispatch-scan' as never)}>{t('Dispatch scan kholein')}</Button>
    </Screen>
  );
}
