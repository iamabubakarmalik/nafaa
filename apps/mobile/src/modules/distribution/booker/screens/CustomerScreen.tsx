/**
 * One shop on the route: contact and khata, GPS check-in with the distance to
 * the shop, and what a booker does there (order, no order, recovery, market
 * return), plus what was already done today.
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  AlertTriangle, Ban, CheckCircle2, Crosshair, MapPin, MessageCircle, Navigation, Phone, RotateCcw, ShoppingCart, Wallet,
} from 'lucide-react-native';
import { useState } from 'react';
import { Linking, View } from 'react-native';
import { formatMoney, formatTime } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Button, Card, DetailRow, DetailSection, DetailTemplate, Icon, IconButton, Row, Text, toast, useTheme } from '@/design';
import { creditFor } from '../core/order';
import { customerDay, getCheckIn, getCustomer, queueCollection, queueVisit } from '../core/repo';
import type { CollectionPayload } from '../core/types';
import { newClientRef, openMap, openWhatsApp } from '../native/device';
import { useBookerStore, useDbQuery } from '../store';
import { NoOrderSheet, RecoverySheet, type RecoveryValue } from '../ui/sheets';
import { daysSince, QueueStatus, SyncAction } from '../ui/shared';
import { checkIn, checkInOrNow, visitPayload } from '../visit';

export function BookerCustomerScreen() {
  const th = useTheme();
  const can = usePermission();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { db, manifest, today, bump, sync } = useBookerStore();
  const [locating, setLocating] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [sheet, setSheet] = useState<'none' | 'noOrder' | 'recovery'>('none');
  const [sheetKey, setSheetKey] = useState(0);
  const [saving, setSaving] = useState(false);

  const { data: customer } = useDbQuery((d) => getCustomer(d, id), [id]);
  const { data: checkin } = useDbQuery((d) => getCheckIn(d, id, today), [id, today]);
  const { data: day } = useDbQuery((d) => customerDay(d, id, today), [id, today]);

  if (!db || !customer || !manifest) return <DetailTemplate title={t('Customer')} loading />;

  const radius = manifest.settings.checkInRadiusM || 150;
  const route = manifest.routes.find((r) => r.id === customer.routeId);
  const credit = manifest.settings.creditMode !== 'OFF' ? creditFor(customer, 0) : null;
  const due = daysSince(customer.oldestDueAt);
  const hasLocation = customer.latitude != null && customer.longitude != null;
  const title = customer.businessName || customer.name;

  const doCheckIn = async () => {
    setLocating(true);
    setGpsError(null);
    const res = await checkIn(db, customer, today, radius);
    setLocating(false);
    if (res.error) setGpsError(res.error);
    bump();
  };

  const openSheet = (s: 'noOrder' | 'recovery') => { setSheetKey((k) => k + 1); setSheet(s); };

  const saveNoOrder = async (code: string, note: string) => {
    setSaving(true);
    try {
      const c = await checkInOrNow(db, customer, today, radius);
      await queueVisit(db, visitPayload({
        clientRef: newClientRef(), customer, outcome: code === 'SHOP_CLOSED' ? 'CLOSED' : 'NO_ORDER', checkin: c, noOrderReason: code, note,
      }), today, c?.distanceM ?? null);
      setSheet('none');
      toast.success(t('Visit save ho gaya'));
      bump();
      sync({ quiet: true });
    } finally {
      setSaving(false);
    }
  };

  const saveRecovery = async (v: RecoveryValue) => {
    setSaving(true);
    try {
      const c = await checkInOrNow(db, customer, today, radius);
      const payload: CollectionPayload = { clientRef: newClientRef(), customerId: customer.id, amount: v.amount, method: v.method, collectedAt: new Date().toISOString() };
      if (v.reference.trim()) payload.reference = v.reference.trim().slice(0, 80);
      if (v.note.trim()) payload.note = v.note.trim().slice(0, 300);
      if (v.cheque) Object.assign(payload, v.cheque);
      if (c?.latitude != null && c.longitude != null) { payload.latitude = c.latitude; payload.longitude = c.longitude; }
      const visitedAlready = !!(day?.visits.length || day?.orders.length);
      await queueCollection(db, payload, today, visitedAlready ? null : {
        payload: visitPayload({ clientRef: newClientRef(), customer, outcome: 'RECOVERY_ONLY', checkin: c }),
        distanceM: c?.distanceM ?? null,
      });
      setSheet('none');
      toast.success(t('Recovery save ho gayi'), { message: t('Office check karega') });
      bump();
      sync({ quiet: true });
    } finally {
      setSaving(false);
    }
  };

  const reasonLabel = (code: string | null) => t(manifest.noOrderReasons.find((r) => r.code === code)?.label ?? code ?? '');
  const hasToday = !!day && (day.orders.length > 0 || day.visits.length > 0 || day.collections.length > 0 || day.returns.length > 0);

  return (
    <>
      <DetailTemplate
        title={title}
        subtitle={route?.name}
        actions={<SyncAction />}
        bottomActions={(
          <Button size="xl" style={{ flex: 1 }} icon={ShoppingCart} onPress={() => router.push(`/booker/order/${customer.id}`)}>{t('Order banayein')}</Button>
        )}
      >
        <Card>
          <View style={{ gap: th.space(3) }}>
            {customer.businessName && <Text weight="semibold">{customer.name}</Text>}
            {(customer.address || customer.area) && (
              <Row gap={2} align="start">
                <Icon icon={MapPin} size={16} tone="subtle" />
                <Text size="sm" tone="muted" style={{ flex: 1 }}>{[customer.address, customer.area, customer.city].filter(Boolean).join(', ')}</Text>
              </Row>
            )}
            <Row gap={2}>
              {!!customer.phone && (
                <>
                  <IconButton icon={Phone} label={t('Call')} variant="soft" size="lg" onPress={() => Linking.openURL(`tel:${customer.phone}`)} />
                  <IconButton icon={MessageCircle} label={t('WhatsApp')} variant="soft" size="lg" onPress={() => openWhatsApp('', customer.phone)} />
                </>
              )}
              {hasLocation && <IconButton icon={Navigation} label={t('Raasta')} variant="soft" size="lg" onPress={() => openMap(customer.latitude!, customer.longitude!)} />}
              {!!customer.phone && <Text ltr size="sm" tone="muted" style={{ marginStart: 'auto' }}>{customer.phone}</Text>}
            </Row>
          </View>
        </Card>

        {manifest.me.canSeeBalance && customer.balance != null && (
          <DetailSection title={t('Khata')}>
            <DetailRow label={t('Balance (udhaar)')} value={<Text weight="bold" ltr tone={customer.balance > 0 ? 'danger' : 'default'}>{formatMoney(customer.balance)}</Text>} />
            {!!customer.creditLimit && <DetailRow label={t('Credit limit')} value={<Text ltr>{formatMoney(customer.creditLimit)}</Text>} />}
            {due != null && <DetailRow label={t('Sab se purana udhaar')} value={customer.creditDays ? t('{{count}} din (had {{limit}} din)', { count: due, limit: customer.creditDays }) : t('{{count}} din', { count: due })} last={!credit?.message} />}
            {credit?.message && (
              <View style={{ padding: th.space(3) }}>
                <Row gap={2} align="start">
                  <Icon icon={AlertTriangle} size={16} tone="danger" />
                  <Text size="sm" tone="danger" style={{ flex: 1 }}>{credit.message}</Text>
                </Row>
              </View>
            )}
          </DetailSection>
        )}

        <Card title={t('Check-in')} action={<Button variant="secondary" size="sm" icon={Crosshair} loading={locating} onPress={doCheckIn}>{checkin ? t('Dobara') : t('Check-in')}</Button>}>
          <View style={{ gap: th.space(2) }}>
            {checkin ? (
              <Text size="sm" weight="semibold" ltr={false}>
                {formatTime(checkin.at)}
                {checkin.distanceM != null ? ` · ${t('dukaan se {{value}} m', { value: checkin.distanceM })}` : checkin.latitude == null ? ` · ${t('location nahi mili')}` : ''}
              </Text>
            ) : (
              <Text size="sm" tone="muted">{t('Dukaan par pohanch kar check-in karein')}</Text>
            )}
            {!!checkin?.far && (
              <Text size="xs" tone="warning">{t('Aap dukaan se {{value}} m door hain (had {{radius}} m). Kaam ho jayega, lekin office ko door wala visit dikhega.', { value: checkin.distanceM, radius })}</Text>
            )}
            {checkin && !hasLocation && <Text size="xs" tone="muted">{t('Is dukaan ki location save nahi, is liye faasla nahi nap sakte.')}</Text>}
            {!!gpsError && <Text size="xs" tone="danger">{t(gpsError)}</Text>}
          </View>
        </Card>

        <Row gap={3}>
          <Button variant="secondary" size="lg" icon={Ban} style={{ flex: 1 }} onPress={() => openSheet('noOrder')}>{t('No order')}</Button>
          {manifest.me.canCollect && <Button variant="secondary" size="lg" icon={Wallet} style={{ flex: 1 }} onPress={() => openSheet('recovery')}>{t('Recovery')}</Button>}
        </Row>
        {can(P.DISTRIBUTION_RETURNS_COLLECT) && (
          <Button variant="soft" size="lg" icon={RotateCcw} fullWidth onPress={() => router.push(`/booker/return?customerId=${customer.id}`)}>{t('Market return')}</Button>
        )}

        {hasToday && (
          <DetailSection title={t('Aaj')}>
            {day!.orders.map((o) => (
              <View key={o.clientRef} style={{ padding: th.space(3), gap: 4 }}>
                <Row gap={2}>
                  <Icon icon={ShoppingCart} size={16} tone="brand" />
                  <Text size="sm" weight="semibold" style={{ flex: 1 }}>{t('Order')} {o.number ?? ''} · <Text ltr size="sm" weight="semibold">{formatMoney(o.serverTotal ?? o.localTotal)}</Text></Text>
                  <QueueStatus status={o.status} />
                </Row>
                {o.serverTotal != null && Math.abs(o.serverTotal - o.localTotal) > 0.01 && (
                  <Text size="xs" tone="warning">{t('Phone par {{local}} tha, office ka total {{server}}', { local: formatMoney(o.localTotal), server: formatMoney(o.serverTotal) })}</Text>
                )}
                {(o.warnings ? (JSON.parse(o.warnings) as string[]) : []).map((w, i) => <Text key={i} size="xs" tone="warning">{t(w)}</Text>)}
                {o.status === 'CONFLICT' && <Text size="xs" tone="danger">{t(o.reason ?? '')}</Text>}
              </View>
            ))}
            {day!.visits.filter((v) => v.outcome !== 'ORDER').map((v) => (
              <Row key={v.clientRef} gap={2} style={{ padding: th.space(3) }}>
                <Icon icon={v.outcome === 'RECOVERY_ONLY' ? CheckCircle2 : Ban} size={16} tone={v.outcome === 'RECOVERY_ONLY' ? 'info' : 'subtle'} />
                <Text size="sm" style={{ flex: 1 }}>{v.outcome === 'RECOVERY_ONLY' ? t('Sirf recovery') : `${t('No order')} · ${reasonLabel(v.noOrderReason)}`}</Text>
                <QueueStatus status={v.status} />
              </Row>
            ))}
            {day!.collections.map((c) => (
              <Row key={c.clientRef} gap={2} style={{ padding: th.space(3) }}>
                <Icon icon={Wallet} size={16} tone="info" />
                <Text size="sm" style={{ flex: 1 }}>{t('Recovery')} <Text ltr size="sm">{formatMoney(c.amount)}</Text> · {c.method === 'BANK_TRANSFER' ? t('Bank') : c.method === 'CASH' ? t('Cash') : c.method === 'CHEQUE' ? t('Cheque') : c.method}</Text>
                <QueueStatus status={c.status} />
              </Row>
            ))}
            {day!.returns.map((r) => (
              <Row key={r.clientRef} gap={2} style={{ padding: th.space(3) }}>
                <Icon icon={RotateCcw} size={16} tone="warning" />
                <Text size="sm" style={{ flex: 1 }}>{t('Market return')} · {t('{{count}} item', { count: r.lineCount })}{r.number ? ` · ${r.number}` : ''}</Text>
                <QueueStatus status={r.status} />
              </Row>
            ))}
          </DetailSection>
        )}
      </DetailTemplate>

      <NoOrderSheet key={`n${sheetKey}`} open={sheet === 'noOrder'} reasons={manifest.noOrderReasons} onClose={() => setSheet('none')} onSave={saveNoOrder} saving={saving} />
      <RecoverySheet key={`r${sheetKey}`} open={sheet === 'recovery'} balance={manifest.me.canSeeBalance ? customer.balance : null} onClose={() => setSheet('none')} onSave={saveRecovery} saving={saving} />
    </>
  );
}
