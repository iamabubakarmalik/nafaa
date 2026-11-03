/**
 * Prescription page (web PrescriptionDetailPage): the power as printed, the
 * glasses made from it, doctor and customer details, with renew, edit, close,
 * print and WhatsApp.
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Ban, Glasses, MessageCircle, Pencil, Printer, RefreshCw } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { rxState } from '@nafaa/core/industries/optical';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { useBillLanguage } from '@/core/receipt';
import { Button, Card, DetailRow, DetailSection, DetailTemplate, IconButton, ListRow, PageHero, Sheet, HeroText, Text, useTheme } from '@/design';
import { openWhatsApp } from '@/modules/customers/lib/contact';
import { printDoc } from '@/modules/purchasing/lib/docs';
import { prescriptionsApi } from '../api';
import { Pill, PowerTable } from '../components/parts';
import { rxDoc } from '../docs';
import { OPTICAL_KEYS, dayOnly, orderStatusOf, refreshOptical, rxShareText, rxTypeLabel } from '../meta';
import { rxLine } from './PrescriptionsScreen';

export function PrescriptionDetailScreen() {
  const th = useTheme();
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const lang = useBillLanguage();
  const can = usePermission();
  const [confirmOff, setConfirmOff] = useState(false);
  const q = useQuery({ queryKey: [OPTICAL_KEYS.rx, 'one', id], queryFn: () => prescriptionsApi.getOne(id) });
  const rx = q.data;
  const renew = useMutation({
    mutationFn: () => prescriptionsApi.renew(id),
    onSuccess: (n) => { refreshOptical([OPTICAL_KEYS.rx]); router.push(`/optical/prescriptions/${n.id}/edit` as never); },
  });
  const off = useMutation({
    mutationFn: () => prescriptionsApi.deactivate(id),
    onSuccess: () => { setConfirmOff(false); refreshOptical([OPTICAL_KEYS.rx]); void q.refetch(); },
  });
  const st = rx ? rxState(rx) : null;
  const usable = !!rx && rx.isActive && st?.state !== 'expired';
  const gender = rx?.customerGender === 'MALE' ? t('Mard') : rx?.customerGender === 'FEMALE' ? t('Aurat') : '';

  return (
    <DetailTemplate
      title={rx?.customerName ?? t('Nuskha')} subtitle={rx ? `${rx.prescriptionNumber} · ${rxTypeLabel(rx.prescriptionType)}` : undefined}
      loading={q.isLoading} error={!rx ? q.error : undefined} onRetry={() => void q.refetch()} onRefresh={() => void q.refetch()} refreshing={q.isRefetching}
      actions={rx ? (
        <>
          <IconButton icon={MessageCircle} label={t('WhatsApp')} onPress={() => { openWhatsApp(rx.customerPhone, rxShareText(rx.customerName, rx.prescriptionNumber, dayOnly(rx.prescriptionDate), lang)); }} />
          <IconButton icon={Printer} label={t('Print')} onPress={() => void printDoc(rxDoc(rx))} />
        </>
      ) : undefined}
      summary={rx ? (
        <PageHero title={rx.customerName} chip={rxLine(rx)}
          stats={[{ label: t('Nuskhe ki date'), value: <HeroText size="lg" weight="bold">{dayOnly(rx.prescriptionDate)}</HeroText> }, { label: t('Muddat'), value: <HeroText size="lg" weight="bold">{dayOnly(rx.expiryDate)}</HeroText> }, { label: t('Istemal'), value: <HeroText size="lg" weight="bold" ltr>{String(rx.timesUsed)}</HeroText> }]} />
      ) : undefined}
      bottomActions={rx && usable && can(P.POS_USE) ? <Button icon={Glasses} fullWidth onPress={() => router.push(`/optical/lens-orders/new?rx=${rx.id}` as never)}>{t('Chashma order')}</Button> : undefined}
    >
      {rx && (
        <>
          <View style={{ flexDirection: 'row', gap: th.space(2), flexWrap: 'wrap' }}>
            <Button variant="secondary" size="sm" icon={Pencil} onPress={() => router.push(`/optical/prescriptions/${rx.id}/edit` as never)}>{t('Badlein')}</Button>
            {rx.isActive && <Button variant="secondary" size="sm" icon={RefreshCw} loading={renew.isPending} onPress={() => renew.mutate()}>{t('Renew (nayi muddat)')}</Button>}
            {rx.isActive && <Button variant="ghost" size="sm" icon={Ban} onPress={() => setConfirmOff(true)}>{t('Band karein')}</Button>}
          </View>
          <DetailSection title={t('Number')}>
            <Card>
              <PowerTable p={rx} />
              {(rx.rightVa || rx.leftVa) && <Text size="sm" style={{ marginTop: th.space(2) }}>{t('Nazar R / L')}: <Text size="sm" weight="semibold" ltr>{[rx.rightVa, rx.leftVa].filter(Boolean).join(' / ')}</Text></Text>}
              {rx.segHeight != null && <Text size="sm">{t('Fitting height')}: <Text size="sm" weight="semibold" ltr>{`${rx.segHeight} mm`}</Text></Text>}
              {(rx.clRightBaseCurve || rx.clLeftBaseCurve) && (
                <Text size="sm">{t('Contact lens BC / DIA')}: <Text size="sm" weight="semibold" ltr>{t('R {{value}} · L {{value2}}', { value: [rx.clRightBaseCurve, rx.clRightDiameter].filter(Boolean).join(' / ') || '—', value2: [rx.clLeftBaseCurve, rx.clLeftDiameter].filter(Boolean).join(' / ') || '—' })}</Text></Text>
              )}
            </Card>
          </DetailSection>
          <DetailSection title={t('Is nuskhe ke chashme')}>
            <Card flush>
              {!rx.lensOrders?.length ? <Text tone="muted" style={{ padding: th.space(4) }}>{t('Abhi koi chashma order nahi')}</Text> : rx.lensOrders.map((o, i) => (
                <ListRow key={o.id} divider={i < rx.lensOrders!.length - 1} title={o.frameName} overline={`${o.orderNumber} · ${dayOnly(o.orderedAt)}`} subtitle={o.lensType}
                  trailing={<View style={{ alignItems: 'flex-end', gap: 4 }}><Text size="sm" weight="semibold" ltr>{formatMoney(o.totalPrice)}</Text><Pill meta={orderStatusOf(o.status)} /></View>}
                  chevron onPress={() => router.push(`/optical/lens-orders/${o.id}` as never)} />
              ))}
            </Card>
          </DetailSection>
          <DetailSection title={t('Tafseel')}>
            <Card flush>
              <DetailRow label={t('Doctor')} value={`${rx.doctorName ?? rx.prescribedBy ?? '—'}${rx.clinicName ? ` · ${rx.clinicName}` : ''}`} />
              <DetailRow label={t('Umar / jins')} value={[rx.customerAge != null ? t('{{count}} saal', { count: rx.customerAge }) : '', gender].filter(Boolean).join(' · ') || '—'} />
              <DetailRow label={t('Mobile')} value={<Text size="sm" weight="semibold" ltr>{rx.customerPhone ?? '—'}</Text>} last={!rx.notes && !rx.customerId} />
              {rx.notes ? <DetailRow label={t('Note')} value={rx.notes} last={!rx.customerId} /> : null}
              {rx.customerId ? <ListRow dense title={t('Customer ka record →')} chevron onPress={() => router.push(`/customers/${rx.customerId}` as never)} /> : null}
            </Card>
          </DetailSection>
        </>
      )}
      <Sheet open={confirmOff} onClose={() => setConfirmOff(false)} title={t('Nuskha band karein?')} description={t('Ye nuskha naye chashma order me nahi aayega. Record aur purane order rehte hain.')}
        footer={<Button fullWidth size="lg" variant="danger" loading={off.isPending} onPress={() => off.mutate()}>{t('Band karein')}</Button>}>
        <Text size="sm" tone="secondary">{rx ? `${rx.prescriptionNumber} · ${rx.customerName}` : ''}</Text>
      </Sheet>
    </DetailTemplate>
  );
}
