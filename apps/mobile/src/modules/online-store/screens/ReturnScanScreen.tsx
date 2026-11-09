/**
 * RTO returns desk. Scan a returned parcel's CN or order number; the order
 * goes through the normal RTO path (its bill is voided, which puts every
 * item back in the order's branch). Items that came back broken are marked
 * damaged and written off as a stock loss instead. The courier and return
 * charges are kept on the order. Below the scanner: parcels still coming
 * back (Pending RTO) and the ones received today. Mirrors the web ReturnScanPage.
 */

import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertOctagon, CheckCircle2, Minus, PackageX, Plus, ScanLine } from 'lucide-react-native';
import type { ScanOrder } from '@nafaa/core/online-store';
import { haptic } from '@/core/device/haptics';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { onlineNeededText } from '@/core/offline';
import { Badge, Button, Card, ChipGroup, EmptyState, IconButton, Input, Screen, SkeletonRows, Text, toast, useTheme } from '@/design';
import { apiErrorMessage, scanApi } from '../api/online';
import { CourierLogo } from '../components/BrandLogo';
import { Scanner, type ScanFlash } from '@/core/hardware/scanner';
import { OnlineMenuButton } from '../components/OnlineMenu';
import { RTO_REASONS } from '../lib/labels';
import { KEYS, useOnlineGuard } from '../lib/online';
import { CommerceHero } from '../components/CommerceHero';
import { OrderMiniList, useBoardSlice } from '../components/board/OrderMiniList';
import { periodRange } from '../lib/period';

export function ReturnScanScreen() {
  const th = useTheme();
  const qc = useQueryClient();
  const { online, guard } = useOnlineGuard();
  const [value, setValue] = useState('');
  const [order, setOrder] = useState<ScanOrder | null>(null);
  const [damaged, setDamaged] = useState<Record<number, number>>({});
  const [reason, setReason] = useState(t(RTO_REASONS[0]));
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<ScanFlash>(null);
  const [done, setDone] = useState<Array<{ number: string; restocked: number; damaged: number; rtoCost: number; courierCode: string | null }>>([]);
  const today = periodRange('today')!;
  const pendingQ = useBoardSlice('rto-pending', { board: 'RETURNING' });
  const todayQ = useBoardSlice('rto-today', { board: 'RETURNED', from: today.from, to: today.to });
  const signal = (ok: boolean) => { haptic(ok ? 'success' : 'error'); setFlash(ok ? 'ok' : 'bad'); setTimeout(() => setFlash(null), 700); };

  const lookup = useMutation({
    mutationFn: (code: string) => scanApi.lookup(code),
    onSuccess: (o) => {
      setOrder(o); setDamaged({}); setValue('');
      if (o.canReturn) { setError(null); signal(true); } else { setError(o.returnProblem); signal(false); }
    },
    onError: (e) => { setOrder(null); setError(apiErrorMessage(e, t('Order nahi mila'))); setValue(''); signal(false); },
  });
  const receive = useMutation({
    mutationFn: () => scanApi.rtoReceive(order!.id, damaged, order!.orderStatus === 'RETURNED' ? undefined : reason),
    onSuccess: (r) => {
      signal(true);
      setDone((d) => [{ number: r.order.number, restocked: r.restocked, damaged: r.damaged, rtoCost: r.rtoCost, courierCode: r.order.courierCode }, ...d].slice(0, 20));
      if (r.failed.length) toast.error(t('Kuch kharab maal nahi likha gaya: {{value}}', { value: r.failed.join(', ') }));
      else toast.success(t('#{{number}} wapas — {{restocked}} shelf par{{value}}', { number: r.order.number, restocked: r.restocked, value: r.damaged ? t(', {{damaged}} kharab likhe', { damaged: r.damaged }) : '' }));
      for (const k of [KEYS.orders, KEYS.codSummary, KEYS.codHistory, KEYS.profit]) qc.invalidateQueries({ queryKey: k });
      void pendingQ.refetch(); void todayQ.refetch();
      setOrder(null); setDamaged({}); setValue('');
    },
    onError: (e) => { signal(false); setError(apiErrorMessage(e, t('Nahi hua'))); },
  });

  const scan = (code: string) => {
    const c = code.trim();
    if (!c || lookup.isPending || receive.isPending) return;
    if (!online) { toast.warning(onlineNeededText('onlineOrders')); return; }
    lookup.mutate(c);
  };
  const setDamage = (i: number, n: number, max: number) => setDamaged((d) => ({ ...d, [i]: Math.max(0, Math.min(max, n)) }));
  const damagedQty = Object.values(damaged).reduce((a, n) => a + n, 0);
  const totalQty = order?.lines.reduce((a, l) => a + l.quantity, 0) ?? 0;

  return (
    <Screen title={t('RTO returns')} actions={<>
      <IconButton icon={ScanLine} label={t('Packing')} onPress={() => router.push('/online/pack' as never)} />
      <OnlineMenuButton current="/online/returns" />
    </>} keyboard>
      <CommerceHero chip={t('Wapas aaye parcel')} loading={pendingQ.isLoading}
        stats={[
          { label: t('Pending RTO'), value: String(pendingQ.data?.total ?? 0) },
          { label: t('Aaj receive'), value: String(todayQ.data?.total ?? 0) },
          { label: t('Abhi scan kiye'), value: String(done.length) },
          { label: t('Kharab'), value: String(done.reduce((a, d) => a + d.damaged, 0)) },
        ]} />
      <Scanner variant="inline" active={!order} flash={flash} onCode={scan} height={order ? 140 : 230} />
      <View style={{ flexDirection: 'row', gap: th.space(2), alignItems: 'flex-end' }}>
        <Input containerStyle={{ flex: 1 }} value={value} onChangeText={setValue} icon={ScanLine} ltr autoCapitalize="characters" autoCorrect={false}
          placeholder={t('Wapas aaye parcel ka CN ya order # scan karein…')} returnKeyType="go" onSubmitEditing={() => scan(value)} />
        <Button size="lg" loading={lookup.isPending} disabled={!value.trim()} onPress={() => scan(value)}>{t('Scan')}</Button>
      </View>

      {error && (
        <View accessibilityRole="alert" style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(3), backgroundColor: th.colors.danger.solid, borderRadius: th.radius('xl'), padding: th.space(4) }}>
          <AlertOctagon size={28} color={th.colors.danger.onSolid} />
          <Text size="base" weight="semibold" color={th.colors.danger.onSolid} style={{ flex: 1 }}>{order ? `#${order.number}: ` : ''}{error}</Text>
          <Button size="sm" variant="inverse" onPress={() => setError(null)}>{t('Theek hai')}</Button>
        </View>
      )}
      {lookup.isPending && <SkeletonRows count={3} />}

      {order && order.canReturn && (
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(3) }}>
            {order.courierCode ? <CourierLogo code={order.courierCode} size={36} /> : null}
            <View style={{ flex: 1 }}>
              <Text size="lg" weight="bold" ltr>#{order.number}</Text>
              <Text size="xs" tone="muted">{order.customerName}{order.customerCity ? ` · ${order.customerCity}` : ''} · {formatMoney(order.total)}{order.trackingNumber ? t(' · CN {{trackingNumber}}', { trackingNumber: order.trackingNumber }) : ''}</Text>
            </View>
          </View>
          {order.orderStatus === 'RETURNED' && <Badge tone="warning" style={{ marginTop: th.space(2) }}>{t('Courier ne wapas likh diya — ab maal check karein')}</Badge>}
          <View style={{ marginTop: th.space(3), borderRadius: th.radius('lg'), borderWidth: 1, borderColor: th.colors.border, overflow: 'hidden' }}>
            {order.lines.map((l, i) => {
              const bad = damaged[l.index] ?? 0;
              return (
                <View key={l.index} style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2), padding: th.space(3), borderTopWidth: i ? 1 : 0, borderTopColor: th.colors.divider }}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text size="sm" weight="semibold" numberOfLines={2}>{l.name}{l.variant ? <Text size="sm" tone="muted"> · {l.variant}</Text> : null}</Text>
                    <Text size="xs">
                      <Text size="xs" weight="semibold" tone="success">{t('{{value}} shelf par', { value: l.quantity - bad })}</Text>
                      {bad > 0 ? <Text size="xs" weight="semibold" tone="danger"> {t('· {{bad}} kharab', { bad })}</Text> : null}
                    </Text>
                  </View>
                  <Text size="2xs" tone="muted">{t('Kharab')}</Text>
                  <IconButton icon={Minus} label={t('Kam')} variant="secondary" disabled={!bad} onPress={() => setDamage(l.index, bad - 1, l.quantity)} />
                  <Text size="lg" weight="bold" tone={bad ? 'danger' : 'subtle'} ltr style={{ minWidth: 24, textAlign: 'center' }}>{bad}</Text>
                  <IconButton icon={Plus} label={t('Zyada')} variant="secondary" disabled={bad >= l.quantity} onPress={() => setDamage(l.index, bad + 1, l.quantity)} />
                </View>
              );
            })}
          </View>
          {order.orderStatus !== 'RETURNED' && (
            <View style={{ marginTop: th.space(3) }}>
              <ChipGroup wrap value={reason} onChange={setReason} options={RTO_REASONS.map((r) => ({ value: t(r), label: t(r) }))} />
            </View>
          )}
          <Button size="lg" icon={CheckCircle2} style={{ marginTop: th.space(3) }} loading={receive.isPending} onPress={guard(() => receive.mutate())}>
            {t('Wapas receive karein · {{value}} shelf par{{value2}}', { value: totalQty - damagedQty, value2: damagedQty ? t(', {{damagedQty}} kharab', { damagedQty }) : '' })}
          </Button>
          <Button variant="ghost" onPress={() => { setOrder(null); setDamaged({}); }}>{t('Chhorein')}</Button>
          <Text size="xs" tone="muted">{t('Bill void hoga aur maal is order ki branch me wapas aayega. Kharab maal "Damage" ke taur par stock se niklega (nuksan cost par). Courier aur wapsi ka kharcha order par likha jayega.')}</Text>
        </Card>
      )}

      {!order && !lookup.isPending && !error && (
        <EmptyState compact icon={PackageX} title={t('Courier se wapas aaya parcel scan karein')} message={t('Label ka CN ya order number — Nafaa order dhoond kar maal ki list dikhayega.')} />
      )}

      {done.length > 0 && (
        <Card flush title={t('Abhi receive kiye ({{count}})', { count: done.length })}>
          {done.map((d) => (
            <View key={d.number} style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2), paddingHorizontal: th.space(4), paddingVertical: th.space(2.5), borderTopWidth: 1, borderTopColor: th.colors.divider }}>
              {d.courierCode ? <CourierLogo code={d.courierCode} size={18} /> : null}
              <Text size="sm" weight="semibold" ltr>#{d.number}</Text>
              <Text size="sm" tone="secondary" style={{ flex: 1 }}>{t('{{restocked}} shelf par{{value}}', { restocked: d.restocked, value: d.damaged ? t(' · {{damaged}} kharab', { damaged: d.damaged }) : '' })}</Text>
              {d.rtoCost > 0 && <Text size="sm" tone="danger">{t('RTO {{rtoCost}}', { rtoCost: formatMoney(d.rtoCost) })}</Text>}
            </View>
          ))}
        </Card>
      )}

      <OrderMiniList title={t('Pending RTO')} board="RETURNING" query={pendingQ} empty={t('Koi parcel wapas raste me nahi')} />
      <OrderMiniList title={t('Aaj receive hue')} board="RETURNED" query={todayQ} empty={t('Aaj abhi koi parcel wapas nahi aaya')} />
    </Screen>
  );
}
