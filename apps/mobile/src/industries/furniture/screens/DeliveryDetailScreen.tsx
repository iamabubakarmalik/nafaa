/** One delivery (web DeliveriesPage DetailModal): where it goes, the vehicle, the charges and their bill, and the steps out, reached, delivered, fitted. */

import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { CalendarClock, CheckCircle2, MapPin, Phone, Receipt, RotateCcw, Truck, XCircle } from 'lucide-react-native';
import { useState } from 'react';
import { Linking, View } from 'react-native';
import { apiErrorMessage } from '@/core/api/errors';
import { formatDate, formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, Button, Card, DetailRow, DetailSection, DetailTemplate, Row, Text, toast, useTheme } from '@/design';
import { OfflineNote, useDeskOnline } from '../../_shared/deskKit';
import { ReasonSheet } from '../../_shared/trade/sheets';
import { deliveriesApi, type FurnitureDeliveryStatus } from '../api';
import { BillSheet, ConfirmDeliverySheet, VehicleSheet } from '../components/DeliverySheets';
import { FURNITURE_KEYS, OPEN_DELIVERY, charges, deliveryStatus, refreshFurniture } from '../meta';

export function DeliveryDetailScreen() {
  const th = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const can = usePermission();
  const { guard } = useDeskOnline('furnitureDesk');
  const canManage = can(P.SERVICE_JOBS_MANAGE);
  const canBill = can(P.POS_USE);
  const [panel, setPanel] = useState<'vehicle' | 'confirm' | 'bill' | 'reason' | null>(null);
  const [reasonFor, setReasonFor] = useState<FurnitureDeliveryStatus>('FAILED');
  const [busy, setBusy] = useState(false);
  const q = useQuery({ queryKey: [FURNITURE_KEYS.deliveries, 'one', id], queryFn: () => deliveriesApi.getOne(id!), enabled: !!id });
  const d = q.data;
  const changed = (msg: string) => { toast.success(msg); setPanel(null); refreshFurniture([FURNITURE_KEYS.deliveries, FURNITURE_KEYS.orders]); void q.refetch(); };
  const setStatus = (v: { status: FurnitureDeliveryStatus; notes?: string }) => guard(async () => {
    setBusy(true);
    try { const r = await deliveriesApi.updateStatus(id!, v); changed(t('Delivery: {{label}}', { label: t(deliveryStatus(r.status).label) })); } catch (e) { toast.error(apiErrorMessage(e, t('Nahi hua'))); } finally { setBusy(false); }
  });

  const st = d ? deliveryStatus(d.status) : null;
  const open = !!d && OPEN_DELIVERY.includes(d.status);
  const total = d ? charges(d) : 0;
  const out = !!d && ['DISPATCHED', 'IN_TRANSIT', 'ARRIVED'].includes(d.status);
  const ask = (s: FurnitureDeliveryStatus) => { setReasonFor(s); setPanel('reason'); };
  const reasonTitle = reasonFor === 'FAILED' ? t('Delivery cancel karein?') : reasonFor === 'RETURNED' ? t('Saman wapas aaya?') : t('Date badal gayi?');

  return (
    <DetailTemplate
      title={d?.customerName ?? t('Delivery')}
      subtitle={d ? `${d.deliveryNumber}${d.productNames.length ? ` · ${d.productNames.join(', ')}` : ''}` : undefined}
      loading={q.isLoading} error={q.data ? null : q.error} onRetry={() => void q.refetch()} onRefresh={() => void q.refetch()} refreshing={q.isRefetching}
    >
      {d && st && (
        <View style={{ gap: th.space(4) }}>
          <OfflineNote feature="furnitureDesk" />
          <Row gap={2} wrap><Badge tone={st.tone}>{t(st.label)}</Badge>{d.requiresAssembly ? <Badge tone="info">{t('Ghar par fitting')}</Badge> : null}</Row>

          <Card title={t('Ab kya karna hai')}>
            <View style={{ gap: th.space(2) }}>
              {canManage && open && !out && <Button icon={Truck} loading={busy} onPress={() => setStatus({ status: 'DISPATCHED' })}>{t('Nikal gayi')}</Button>}
              {canManage && d.status === 'DISPATCHED' && <Button icon={MapPin} variant="secondary" loading={busy} onPress={() => setStatus({ status: 'ARRIVED' })}>{t('Pohanch gayi')}</Button>}
              {canManage && (out || d.status === 'DELIVERED') && <Button icon={CheckCircle2} onPress={() => guard(() => setPanel('confirm'))}>{d.status === 'DELIVERED' ? t('Fitting ho gayi') : t('De di')}</Button>}
              {canManage && open && <Button icon={Truck} variant="secondary" onPress={() => guard(() => setPanel('vehicle'))}>{t('Gaari / date')}</Button>}
              {canBill && total > 0 && !d.chargesBill && d.status !== 'FAILED' && <Button icon={Receipt} variant="secondary" onPress={() => guard(() => setPanel('bill'))}>{t('Charges ka bill')}</Button>}
              {canManage && open && !out && <Button icon={CalendarClock} variant="secondary" onPress={() => guard(() => ask('RESCHEDULED'))}>{t('Date badli')}</Button>}
              {canManage && out && <Button icon={RotateCcw} variant="secondary" onPress={() => guard(() => ask('RETURNED'))}>{t('Wapas aayi')}</Button>}
              {canManage && open && <Button icon={XCircle} variant="ghost" onPress={() => guard(() => ask('FAILED'))}>{t('Cancel')}</Button>}
              {d.customOrderId ? <Button variant="link" onPress={() => router.push(`/furniture/custom-orders/${d.customOrderId}` as never)}>{t('Custom order')}</Button> : null}
            </View>
          </Card>

          <DetailSection title={t('Customer')}>
            <DetailRow label={t('Naam')} value={d.customerName} />
            <DetailRow label={t('Phone')} value={<Button size="sm" variant="link" icon={Phone} onPress={() => void Linking.openURL(`tel:${d.customerPhone}`)}>{d.customerPhone}</Button>} />
            <DetailRow label={t('Pata')} value={[d.deliveryAddress, d.landmark, d.area, d.city].filter(Boolean).join(', ')} last={!d.floorNumber} />
            {d.floorNumber ? <DetailRow label={t('Manzil')} value={t('{{floorNumber}} manzil {{value}}', { floorNumber: d.floorNumber, value: d.hasLift ? t('· lift hai') : t('· seerhi') })} last /> : null}
          </DetailSection>
          <DetailSection title={t('Gaari')}>
            <DetailRow label={t('Date')} value={d.scheduledDate ? `${formatDate(d.scheduledDate)}${d.scheduledSlot ? ` · ${d.scheduledSlot}` : ''}` : t('Date tay nahi')} />
            <DetailRow label={t('Gaari')} value={[d.vehicleType, d.vehicleNumber].filter(Boolean).join(' ') || t('Gaari nahi di')} />
            <DetailRow label={t('Driver')} value={[d.driverName, d.driverPhone].filter(Boolean).join(' · ') || '—'} />
            <DetailRow label={t('Helper')} value={t('{{helpersCount}} helper · {{value}}', { helpersCount: d.helpersCount, value: d.requiresAssembly ? t('fitting karni hai') : t('sirf delivery') })} last />
          </DetailSection>
          <DetailSection title={t('Charges')}>
            <DetailRow label={t('Gaari')} value={formatMoney(d.deliveryCharge)} />
            <DetailRow label={t('Loading')} value={formatMoney(d.loadingCharge)} />
            <DetailRow label={t('Unloading')} value={formatMoney(d.unloadingCharge)} />
            <DetailRow label={t('Seerhi')} value={formatMoney(d.floorCharge)} />
            <DetailRow label={t('Fitting')} value={formatMoney(d.assemblyCharge)} />
            <DetailRow label={t('Kul')} value={formatMoney(total)} last />
          </DetailSection>
          {d.chargesBill ? (
            <Button icon={Receipt} variant="link" onPress={() => router.push(`/sales/${d.chargesBill!.id}` as never)}>
              {t('Bill {{saleNumber}}{{value}}', { saleNumber: d.chargesBill.saleNumber, value: d.chargesBill.status === 'VOIDED' ? t(' (cancel)') : d.chargesBill.creditAmount > 0 ? t(' · {{creditAmount}} khate me', { creditAmount: formatMoney(d.chargesBill.creditAmount) }) : t(' · paid') })}
            </Button>
          ) : null}
          {d.customOrderId ? <Text size="sm" tone="secondary">{t('Custom order ki delivery — "De di" par order ka bill banta hai.')}</Text> : null}
          {(d.receivedByName || d.customerRating) ? <Text size="sm">{t('Liya: {{value}}{{value2}}{{value3}}', { value: d.receivedByName ?? '—', value2: d.customerRating ? ` · ${'★'.repeat(d.customerRating)}` : '', value3: d.customerFeedback ? ` — ${d.customerFeedback}` : '' })}</Text> : null}
          {d.notes ? <Card tone="default"><Text size="sm" tone="secondary">{d.notes}</Text></Card> : null}

          <VehicleSheet d={d} open={panel === 'vehicle'} onClose={() => setPanel(null)} onDone={() => changed(t('Gaari save'))} />
          <ConfirmDeliverySheet d={d} open={panel === 'confirm'} onClose={() => setPanel(null)} onDone={(r) => changed(r.status === 'ASSEMBLED' ? t('Fitting ho gayi') : t('Delivery ho gayi'))} />
          <BillSheet d={d} total={total} open={panel === 'bill'} onClose={() => setPanel(null)} onDone={(no) => changed(t('Bill {{no}} ban gaya', { no }))} />
          <ReasonSheet open={panel === 'reason'} title={reasonTitle} cta={t('Haan')} danger={reasonFor !== 'RESCHEDULED'} busy={busy} label={t('Wajah')}
            placeholder={reasonFor === 'FAILED' ? t('Customer ne mana kar diya') : reasonFor === 'RETURNED' ? t('Ghar band tha') : t('Customer ne kal bulaya')}
            message={reasonFor === 'RESCHEDULED' ? t('Phir "Gaari / date" se nayi date likhein.') : undefined}
            onSubmit={(notes) => setStatus({ status: reasonFor, notes })} onClose={() => setPanel(null)} />
        </View>
      )}
    </DetailTemplate>
  );
}
