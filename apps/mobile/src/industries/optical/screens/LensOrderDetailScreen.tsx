/**
 * Order page (web LensOrderDetailPage): where the order is, the next step,
 * power, frame and lens, money, and the bill once handed over. Print the
 * customer slip or the lab slip, WhatsApp the customer.
 */

import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { CheckCircle2, FlaskConical, MessageCircle, Printer, Receipt, Wallet, XCircle } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { isOrderClosed, isOrderReady, nextOrderStep, orderStages } from '@nafaa/core/industries/optical';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { useBillLanguage } from '@/core/receipt';
import { Badge, Button, Card, DetailRow, DetailSection, DetailTemplate, IconButton, ListRow, PageHero, HeroAmount, HeroText, Text, useTheme } from '@/design';
import { openWhatsApp } from '@/modules/customers/lib/contact';
import { printDoc } from '@/modules/purchasing/lib/docs';
import { useCostMask } from '@/modules/sales/lib/mask';
import { lensOrdersApi, type LensOrderStatus } from '../api';
import { OrderDialogs, useOrderActions, type OrderDialog } from '../components/OrderSheets';
import { Pill, PowerTable } from '../components/parts';
import { labDoc, orderDoc } from '../docs';
import { OPTICAL_KEYS, dateTime, dayOnly, orderStatusOf, orderText, stageLabel, stepLabel } from '../meta';

export function LensOrderDetailScreen() {
  const th = useTheme();
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const can = usePermission();
  const lang = useBillLanguage();
  const { cost } = useCostMask();
  const canBill = can(P.POS_USE);
  const [dialog, setDialog] = useState<OrderDialog>(null);
  const actions = useOrderActions(() => setDialog(null));
  const q = useQuery({ queryKey: [OPTICAL_KEYS.orders, 'one', id], queryFn: () => lensOrdersApi.getOne(id) });
  const o = q.data;

  const repair = !!o?.computed.isRepair;
  const closed = isOrderClosed(o?.status);
  const step = o ? nextOrderStep(o.status, repair) : null;
  const ready = isOrderReady(o?.status);
  const notes = (o?.notes ?? '').split('\n').filter(Boolean);

  return (
    <DetailTemplate
      title={o?.orderNumber ?? t('Order')} subtitle={o ? `${o.customerName} · ${o.customerPhone}` : undefined}
      loading={q.isLoading} error={!o ? q.error : undefined} onRetry={() => void q.refetch()} onRefresh={() => void q.refetch()} refreshing={q.isRefetching}
      actions={o ? (
        <>
          {!closed && <IconButton icon={MessageCircle} label={t('WhatsApp')} onPress={() => { openWhatsApp(o.customerPhone, orderText(o, repair, formatMoney(o.remainingAmount), lang)); }} />}
          <IconButton icon={Printer} label={t('Parchi')} onPress={() => void printDoc(orderDoc(o, repair))} />
          {!repair && <IconButton icon={FlaskConical} label={t('Lab parchi')} onPress={() => void printDoc(labDoc(o))} />}
        </>
      ) : undefined}
      summary={o ? (
        <PageHero title={o.customerName} chip={t(orderStatusOf(o.status).label)}
          stats={[
            { label: t('Kul'), value: <HeroAmount value={o.totalPrice} size="lg" /> },
            { label: t('Mila'), value: <HeroAmount value={o.paidAmount} size="lg" /> },
            { label: o.status === 'DELIVERED' ? t('Khata me') : t('Baqi'), value: <HeroAmount value={o.remainingAmount} size="lg" /> },
          ]} />
      ) : undefined}
      bottomActions={o && canBill && !closed ? (
        <>
          {ready ? <Button style={{ flex: 1 }} icon={CheckCircle2} onPress={() => setDialog({ kind: 'deliver', order: o })}>{t('Customer ko de diya')}</Button>
            : step ? <Button style={{ flex: 1 }} icon={step.step === 'toLab' ? FlaskConical : CheckCircle2} loading={actions.step.isPending}
              onPress={() => (step.to === 'SENT_TO_LAB' ? setDialog({ kind: 'lab', order: o }) : actions.step.mutate({ o, status: step.to as LensOrderStatus }))}>{stepLabel(step.step)}</Button> : null}
          {o.remainingAmount > 0.009 && <Button variant="secondary" icon={Wallet} onPress={() => setDialog({ kind: 'pay', order: o })}>{t('Payment lein')}</Button>}
        </>
      ) : undefined}
    >
      {o && (
        <>
          <View style={{ flexDirection: 'row', gap: th.space(2), flexWrap: 'wrap', alignItems: 'center' }}>
            <Pill meta={orderStatusOf(o.status)} />
            {repair && <Badge tone="warning">{t('Repair')}</Badge>}
            {o.computed.isOverdue && <Badge tone="danger">{t('Late')}</Badge>}
            <Text size="xs" tone="muted">{t('Order {{orderedAt}} · {{daysWaiting}} din se', { orderedAt: dayOnly(o.orderedAt), daysWaiting: o.computed.daysWaiting })}</Text>
          </View>

          {o.status !== 'CANCELLED' && (
            <Card>
              <View style={{ flexDirection: 'row', gap: 4 }}>
                {orderStages(o.status, repair).map((s) => (
                  <View key={s.key} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                    <View style={{ height: 6, alignSelf: 'stretch', borderRadius: 3, backgroundColor: s.done ? th.colors.success.solid : th.colors.surfaceMuted }} />
                    <Text size="2xs" weight={s.done ? 'semibold' : 'regular'} tone={s.done ? 'default' : 'muted'} align="center" numberOfLines={1}>{stageLabel(s.key)}</Text>
                  </View>
                ))}
              </View>
            </Card>
          )}

          {canBill && !closed && (
            <View style={{ flexDirection: 'row', gap: th.space(2), flexWrap: 'wrap' }}>
              {['SENT_TO_LAB', 'AT_LAB'].includes(o.status) && <Button variant="ghost" size="sm" onPress={() => setDialog({ kind: 'lab', order: o })}>{t('Lab / date badlein')}</Button>}
              <Button variant="ghost" size="sm" icon={XCircle} onPress={() => setDialog({ kind: 'cancel', order: o })}>{t('Cancel')}</Button>
            </View>
          )}

          {!repair && (
            <DetailSection title={t('Number')} action={o.prescription ? <Button variant="link" size="sm" onPress={() => router.push(`/optical/prescriptions/${o.prescription!.id}` as never)}>{`${o.prescription.prescriptionNumber} →`}</Button> : undefined}>
              <Card><PowerTable p={o.prescription ?? o} /></Card>
            </DetailSection>
          )}

          <DetailSection title={repair ? t('Frame aur kaam') : t('Frame aur lens')}>
            <Card flush>
              <DetailRow label={t('Frame')} value={o.frameName} />
              {!repair && <DetailRow label={t('Lens')} value={[o.lensType, o.lensIndex, o.lensMaterial].filter(Boolean).map((x) => t(x as string)).join(' · ')} />}
              {!repair && o.lensCoatings.length > 0 && <DetailRow label={t('Coating')} value={o.lensCoatings.map((x) => t(x)).join(', ')} />}
              <DetailRow label={repair ? t('Kahan') : t('Lab')} value={`${o.labName ?? (repair ? t('Dukaan me') : '—')}${o.labOrderRef ? ` · ${o.labOrderRef}` : ''}`} />
              <DetailRow label={t('Tayyar date')} value={dayOnly(o.expectedDate)} last={!o.receivedAt && !o.deliveredAt && !o.fittingNotes} />
              {o.receivedAt ? <DetailRow label={t('Lab se aaya')} value={dateTime(o.receivedAt)} last={!o.deliveredAt && !o.fittingNotes} /> : null}
              {o.deliveredAt ? <DetailRow label={t('Customer ko diya')} value={dateTime(o.deliveredAt)} last={!o.fittingNotes} /> : null}
              {o.fittingNotes ? <DetailRow label={t('Fitting note')} value={o.fittingNotes} last /> : null}
            </Card>
          </DetailSection>

          <DetailSection title={t('Hisaab')}>
            <Card flush>
              {o.framePrice > 0 && <DetailRow label={t('Frame')} value={cost(o.framePrice)} />}
              {o.lensPrice > 0 && <DetailRow label={repair ? t('Repair') : t('Lens')} value={cost(o.lensPrice)} />}
              {o.fittingCharge > 0 && <DetailRow label={t('Fitting')} value={cost(o.fittingCharge)} />}
              <DetailRow label={t('Kul')} value={<Text weight="bold" ltr>{cost(o.totalPrice)}</Text>} />
              <DetailRow label={t('Mila')} value={<Text weight="semibold" tone="success" ltr>{cost(o.paidAmount)}</Text>} />
              <DetailRow label={o.status === 'DELIVERED' ? t('Khata me') : t('Baqi')} value={<Text weight="bold" tone={o.remainingAmount > 0 ? 'warning' : 'default'} ltr>{cost(o.remainingAmount)}</Text>} last />
            </Card>
            {o.booking && <Text size="xs" tone="muted">{t('Advance aur payments booking {{bookingNumber}} par — har payment usi din ke cash me.', { bookingNumber: o.booking.bookingNumber })}</Text>}
            {o.sale && (
              <Card flush tone="success">
                <ListRow icon={Receipt} iconTone="success" title={t('Bill {{saleNumber}}', { saleNumber: o.sale.saleNumber })} trailing={<Text weight="semibold" ltr>{cost(o.sale.total)}{o.sale.status === 'VOIDED' ? ` ${t('void')}` : ''}</Text>}
                  chevron onPress={() => router.push(`/sales/${o.sale!.id}` as never)} />
              </Card>
            )}
          </DetailSection>

          {notes.length > 0 && (
            <DetailSection title={t('Record')}>
              <Card>{notes.map((n, i) => <Text key={i} size="sm" tone="secondary">{`• ${n}`}</Text>)}</Card>
            </DetailSection>
          )}
          <OrderDialogs dialog={dialog} close={() => setDialog(null)} actions={actions} />
        </>
      )}
    </DetailTemplate>
  );
}
