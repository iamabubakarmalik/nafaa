/**
 * Dispatch scan (web DispatchScanPage): while handing parcels to the rider,
 * scan each CN or order number with the camera (or type it). The order is
 * marked DISPATCHED; a mistake (not packed, cancelled, already sent) stops
 * the screen in red. "Send anyway" is offered for orders not packed yet.
 */

import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertOctagon, CheckCircle2, PackageCheck, ScanLine, XCircle } from 'lucide-react-native';
import { haptic } from '@/core/device/haptics';
import { Scanner, type ScanFlash } from '@/core/hardware/scanner';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { onlineNeededText } from '@/core/offline';
import { Button, Card, EmptyState, Icon, IconButton, Input, Screen, Text, toast, useTheme } from '@/design';
import { apiErrorMessage } from '../api/online';
import { dispatchApi, type DispatchScanResult, type ScanCode } from '../api/board';
import { CourierLogo } from '../components/BrandLogo';
import { CommerceHero } from '../components/CommerceHero';
import { OnlineMenuButton } from '../components/OnlineMenu';
import { OrderMiniList, useBoardSlice } from '../components/board/OrderMiniList';
import { refreshOrders, useOnlineGuard } from '../lib/online';
import { msg } from '@/core/i18n';

const SCAN_TEXT: Record<ScanCode, string> = {
  NOT_ACCEPTED: msg('Order abhi accept nahi hua — pehle accept karein'),
  NOT_PACKED: msg('Order pack nahi hua — pehle packing scan karein'),
  ALREADY_SENT: msg('Ye parcel pehle hi bheja ja chuka'),
  DELIVERED: msg('Ye order deliver ho chuka'),
  RETURNED: msg('Ye order wapas aa chuka (RTO)'),
  CANCELLED: msg('Ye order cancel hai — parcel mat bhejein'),
  DELETED: msg('Ye order delete hai — parcel mat bhejein'),
};
const scanText = (r: DispatchScanResult) => (r.code ? t(SCAN_TEXT[r.code]) : r.message) ?? '';

interface Line { at: number; ok: boolean; number: string; text: string; courierCode: string | null; cn: string | null; cod: number }

export function DispatchScanScreen() {
  const th = useTheme();
  const qc = useQueryClient();
  const { online } = useOnlineGuard();
  const [value, setValue] = useState('');
  const [last, setLast] = useState<DispatchScanResult | null>(null);
  const [lastCode, setLastCode] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [flash, setFlash] = useState<ScanFlash>(null);
  const packedQ = useBoardSlice('dispatch-packed', { board: 'PACKED' });
  const sent = lines.filter((l) => l.ok);
  const mistakes = lines.filter((l) => !l.ok).length;
  const signal = (ok: boolean) => { haptic(ok ? 'success' : 'error'); setFlash(ok ? 'ok' : 'bad'); setTimeout(() => setFlash(null), 700); };

  const scan = useMutation({
    mutationFn: ({ code, force }: { code: string; force?: boolean }) => dispatchApi.scan(code, force),
    onSuccess: (r) => {
      setLast(r); setValue(''); signal(r.ok);
      setLines((ls) => [{
        at: Date.now(), ok: r.ok, number: r.order.number, courierCode: r.order.courierCode, cn: r.order.trackingNumber, cod: r.order.cod,
        text: r.ok ? (r.noCn ? t('DISPATCHED · CN nahi likha') : 'DISPATCHED') : scanText(r),
      }, ...ls].slice(0, 200));
      if (r.ok) { refreshOrders(qc, r.order.id); void packedQ.refetch(); }
    },
    onError: (e) => {
      signal(false); setValue('');
      const text = apiErrorMessage(e, t('Order nahi mila'));
      setLast({ ok: false, code: null, message: text, order: { id: '', number: lastCode, customerName: '', customerCity: null, trackingNumber: null, courierCode: null, courierLabel: null, cod: 0, orderStatus: '' } });
      setLines((ls) => [{ at: Date.now(), ok: false, number: lastCode, text, courierCode: null, cn: null, cod: 0 }, ...ls].slice(0, 200));
    },
  });
  const submit = (code: string) => {
    const c = code.trim();
    if (!c || scan.isPending || (last && !last.ok)) return;
    if (!online) { toast.warning(onlineNeededText('onlineOrders')); return; }
    setLastCode(c);
    scan.mutate({ code: c });
  };
  const bad = last && !last.ok ? last : null;

  return (
    <Screen title={t('Dispatch scan')} keyboard actions={<>
      <IconButton icon={PackageCheck} label={t('Packing')} onPress={() => router.push('/online/pack' as never)} />
      <OnlineMenuButton current="/online/dispatch-scan" />
    </>}>
      <CommerceHero chip={t('Rider ko parcel dete waqt')} loading={packedQ.isLoading}
        stats={[
          { label: t('Bhej diye'), value: String(sent.length) },
          { label: t('Ghaltiyan'), value: String(mistakes) },
          { label: t('COD bheja'), value: formatMoney(sent.reduce((a, l) => a + l.cod, 0)) },
          { label: t('Packed baqi'), value: String(packedQ.data?.total ?? 0) },
        ]} />
      <Scanner variant="inline" active={!bad} flash={flash} onCode={submit} height={200} />
      <View style={{ flexDirection: 'row', gap: th.space(2), alignItems: 'flex-end' }}>
        <Input containerStyle={{ flex: 1 }} value={value} onChangeText={setValue} icon={ScanLine} ltr autoCapitalize="characters" autoCorrect={false}
          placeholder={t('Parcel ka CN ya order # scan karein…')} returnKeyType="go" onSubmitEditing={() => submit(value)} />
        <Button size="lg" loading={scan.isPending} disabled={!value.trim() || !!bad} onPress={() => submit(value)}>{t('Scan')}</Button>
      </View>

      {bad && (
        <View accessibilityRole="alert" style={{ backgroundColor: th.colors.danger.solid, borderRadius: th.radius('xl'), padding: th.space(4), gap: th.space(2), alignItems: 'center' }}>
          <AlertOctagon size={44} color={th.colors.danger.onSolid} />
          <Text size="xl" weight="heavy" color={th.colors.danger.onSolid} align="center">{bad.order.number ? `#${bad.order.number} ` : ''}{t('— parcel mat bhejein')}</Text>
          <Text size="base" weight="semibold" color={th.colors.danger.onSolid} align="center">{scanText(bad)}</Text>
          <View style={{ flexDirection: 'row', gap: th.space(2) }}>
            {bad.code === 'NOT_PACKED' && (
              <Button variant="inverse" loading={scan.isPending} onPress={() => { setLastCode(bad.order.number); setLast(null); scan.mutate({ code: bad.order.number, force: true }); }}>{t('Phir bhi bhejein')}</Button>
            )}
            <Button variant="inverse" onPress={() => setLast(null)}>{t('Theek hai')}</Button>
          </View>
        </View>
      )}
      {last?.ok && (
        <Card tone="success">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(3) }}>
            {last.order.courierCode ? <CourierLogo code={last.order.courierCode} size={32} /> : <Icon icon={CheckCircle2} size={28} color={th.colors.success.text} />}
            <View style={{ flex: 1 }}>
              <Text size="lg" weight="bold" ltr>#{last.order.number} · DISPATCHED</Text>
              <Text size="xs" tone="secondary">{[last.order.customerName, last.order.customerCity, last.order.trackingNumber, last.order.cod ? `COD ${formatMoney(last.order.cod)}` : t('Prepaid')].filter(Boolean).join(' · ')}</Text>
            </View>
          </View>
        </Card>
      )}

      {!lines.length ? (
        <EmptyState compact icon={ScanLine} title={t('Har parcel ka CN ya order # scan karein')} message={t('Order DISPATCHED ho jayega, ghalti foran dikhegi.')} />
      ) : (
        <Card flush title={t('Is dafa scan kiye ({{count}})', { count: lines.length })}>
          {lines.slice(0, 50).map((l) => (
            <View key={`${l.at}-${l.number}`} style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2), paddingHorizontal: th.space(4), paddingVertical: th.space(2.5), borderTopWidth: 1, borderTopColor: th.colors.divider }}>
              <Icon icon={l.ok ? CheckCircle2 : XCircle} size={16} color={l.ok ? th.colors.success.text : th.colors.danger.text} />
              {l.courierCode ? <CourierLogo code={l.courierCode} size={18} /> : null}
              <Text size="sm" weight="semibold" ltr>#{l.number}</Text>
              <Text size="sm" tone={l.ok ? 'secondary' : 'danger'} style={{ flex: 1 }} numberOfLines={2}>{l.text}</Text>
            </View>
          ))}
        </Card>
      )}
      <OrderMiniList title={t('Packed — abhi nahi bheje')} board="PACKED" query={packedQ} empty={t('Sab packed parcel bhej diye')} />
    </Screen>
  );
}
