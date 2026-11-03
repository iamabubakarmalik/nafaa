/** One unit (web UnitCard): warranty by kind, sale, installation and repair history; move to a branch, remove a wrong entry, open a repair. */

import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeftRight, Trash2, Wrench } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Amount, Badge, Button, Card, DetailRow, DetailSection, DetailTemplate, ListRow, Row, StatusPill, Text, confirm, toast, useTheme } from '@/design';
import { useCostMask } from '@/modules/sales/lib/mask';
import { Fact, errText, useDeskOnline } from '../../_shared/trade/desk';
import { applianceSerialApi } from '../api';
import { MoveSerialsSheet } from '../components/SerialSheets';
import { KEYS, catLabel, dayOnly, installStatus, refreshAppliances, serialStatus, serviceStatus, serviceTypeOf, daysPhrase } from '../meta';

export function SerialDetailScreen() {
  const th = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const manage = usePermission()(P.ELECTRONICS_SERIALS_MANAGE);
  const { guard } = useDeskOnline('appliancesDesk');
  const { cost } = useCostMask();
  const q = useQuery({ queryKey: [KEYS.serial, 'one', id], queryFn: () => applianceSerialApi.getOne(id!), enabled: !!id });
  const [moving, setMoving] = useState(false);
  const [busy, setBusy] = useState(false);
  const u = q.data;
  const st = serialStatus(u?.status);
  const w = u?.warranty;

  const remove = () => guard(async () => {
    if (!u || !(await confirm({ title: t('Register se hatayein?'), message: t('Galti se likha tha? Register se hatayein — record mehfooz rehta hai.'), confirmLabel: t('Hatayein'), tone: 'danger' }))) return;
    setBusy(true);
    try { await applianceSerialApi.remove(u.id); refreshAppliances([KEYS.serial]); toast.success(t('Register se hata diya')); router.back(); }
    catch (e) { toast.error(errText(e, t('Nahi hua'))); } finally { setBusy(false); }
  });

  return (
    <DetailTemplate title={u?.serialNumber ?? t('Unit')} subtitle={u ? `${u.product?.name ?? ''}${u.modelNumber ? ` · ${u.modelNumber}` : ''}` : undefined}
      loading={q.isLoading} error={q.error} onRetry={() => void q.refetch()} onRefresh={() => void q.refetch()} refreshing={q.isRefetching}
      bottomActions={u ? (
        <>
          {manage && u.status === 'IN_STOCK' && <Button variant="secondary" icon={ArrowLeftRight} style={{ flex: 1 }} onPress={() => setMoving(true)}>{t('Branch')}</Button>}
          {u.status === 'SOLD' && <Button icon={Wrench} style={{ flex: 1 }} onPress={() => router.push('/appliances/service-requests/new' as never)}>{t('Nayi shikayat')}</Button>}
          {manage && u.status === 'IN_STOCK' && <Button variant="ghost" icon={Trash2} loading={busy} style={{ flex: 1 }} onPress={remove}>{t('Hatayein')}</Button>}
        </>
      ) : undefined}>
      {u && (
        <View style={{ gap: th.space(3) }}>
          <Row gap={1.5} wrap>
            <StatusPill tone={st.tone}>{st.label}</StatusPill>
            {u.installationRequired && <Badge tone={installStatus(u.installationStatus).tone}>{installStatus(u.installationStatus).label}</Badge>}
            {w && u.status === 'SOLD' && <Badge tone={w.isUnderWarranty ? 'success' : 'danger'}>{w.isUnderWarranty ? t('Warranty chal rahi') : t('Warranty khatam')}</Badge>}
          </Row>
          <Card>
            <View style={{ gap: th.space(2) }}>
              <Fact k={t('Product')} v={u.product?.name} />
              <Fact k={t('Type')} v={u.product?.categoryType ? catLabel(u.product.categoryType) : undefined} />
              <Fact k={t('Brand')} v={u.product?.brand} />
              <Fact k={t('Model')} v={u.modelNumber} />
              <Fact k={t('Batch / lot')} v={u.batchNumber} />
              <Fact k={t('Branch')} v={u.shopName} />
              <Fact k={t('Aaya')} v={u.purchaseDate ? dayOnly(u.purchaseDate) : undefined} />
              <Fact k={t('Dealer')} v={u.supplierRef} />
              {u.status === 'SOLD' && <Fact k={t('Customer')} v={[u.customerName, u.customerPhone].filter(Boolean).join(' · ')} />}
              {u.status === 'SOLD' && <Fact k={t('Bika')} v={t('{{value}} · bill {{value2}}', { value: dayOnly(u.soldAt), value2: u.invoiceNumber ?? '—' })} />}
              <Fact k={t('Pata')} v={u.deliveryAddress} />
              <Fact k={t('Note')} v={u.notes} />
            </View>
          </Card>
          {u.status === 'SOLD' && (
            <DetailSection title={t('Warranty')}>
              <DetailRow label={t('Company warranty')} value={<Text size="sm">{u.warrantyEndDate ? `${dayOnly(u.warrantyEndDate)} · ${daysPhrase(w?.mainDaysLeft)}` : '—'}</Text>} />
              {!!u.compressorWarrantyEndDate && <DetailRow label={t('Compressor')} value={<Text size="sm">{`${dayOnly(u.compressorWarrantyEndDate)} · ${daysPhrase(w?.compressorDaysLeft)}`}</Text>} />}
              {!!u.motorWarrantyEndDate && <DetailRow label={t('Motor')} value={<Text size="sm">{`${dayOnly(u.motorWarrantyEndDate)} · ${daysPhrase(w?.motorDaysLeft)}`}</Text>} />}
              <DetailRow label={t('Dukaan warranty')} value={<Text size="sm">{u.shopWarrantyEndDate ? `${dayOnly(u.shopWarrantyEndDate)} · ${daysPhrase(w?.shopDaysLeft)}` : '—'}</Text>} last />
            </DetailSection>
          )}
          <DetailSection title={t('Paisa')}>
            <DetailRow label={t('Khareed')} value={<Text size="sm" ltr>{cost(u.purchasePrice)}</Text>} />
            <DetailRow label={t('Bechne ki qeemat')} value={<Amount value={u.soldPrice ?? u.product?.price ?? 0} />} />
            <DetailRow label={t('Is unit par service kharcha')} value={<Amount value={u.serviceCost} />} last />
          </DetailSection>
          {u.installations.length > 0 && (
            <DetailSection title={t('Installations')}>
              {u.installations.map((i, k) => <ListRow key={i.id} dense divider={k < u.installations.length - 1} chevron onPress={() => router.push(`/appliances/installations/${i.id}` as never)} title={`${i.installationNumber} · ${serviceTypeOf(i.serviceType)}`} subtitle={i.technicianName} trailing={<Text size="xs" tone="muted">{installStatus(i.status).label}</Text>} />)}
            </DetailSection>
          )}
          {u.services.length > 0 && (
            <DetailSection title={t('Repair history')}>
              {u.services.map((s, k) => <ListRow key={s.id} dense divider={k < u.services.length - 1} chevron onPress={() => router.push(`/appliances/service-requests/${s.id}` as never)} title={`${s.requestNumber} · ${s.reportedIssue}`} subtitle={s.workDone} trailing={<Text size="xs" tone="muted">{serviceStatus(s.status).label}</Text>} />)}
            </DetailSection>
          )}
        </View>
      )}
      {u && <MoveSerialsSheet preset={[u.id]} open={moving} onClose={() => setMoving(false)} />}
    </DetailTemplate>
  );
}
