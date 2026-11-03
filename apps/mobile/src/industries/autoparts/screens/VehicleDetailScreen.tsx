/** One vehicle (web CustomerVehiclesPage VehicleDetail): visits, money, paper dates, service history and reminders; starts a new job in one tap. */

import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Bell, MessageCircle, Pencil, Power, Wrench } from 'lucide-react-native';
import { useState } from 'react';
import { Linking, View } from 'react-native';
import { daysUntil } from '@nafaa/core/industries/autoparts';
import { apiErrorMessage } from '@/core/api/errors';
import { useAuthStore } from '@/core/auth/store';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { useBillLanguage } from '@/core/receipt';
import { Badge, Button, Card, DetailRow, DetailSection, DetailTemplate, IconButton, ListRow, Row, Text, toast, useTheme } from '@/design';
import { StatGrid } from '../../_shared/trade/kit';
import { OfflineNote, useDeskOnline } from '../../_shared/deskKit';
import { customerVehiclesApi, serviceRemindersApi } from '../api';
import { REMINDER_KEY, VEHICLE_KEY, dayOnly, jobTypeOf, km, refreshAuto, statusOf, vehicleName, vehicleTypeOf, waLink } from '../meta';
import { serviceNudge } from '../slip';

export function VehicleDetailScreen() {
  const th = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const can = usePermission();
  const { guard } = useDeskOnline('autopartsDesk');
  const shopName = useAuthStore((s) => s.tenant?.name) || 'Shop';
  const lang = useBillLanguage();
  const canEdit = can(P.CUSTOMERS_EDIT);
  const canJob = can(P.SERVICE_JOBS_MANAGE);
  const [busy, setBusy] = useState(false);
  const q = useQuery({ queryKey: [VEHICLE_KEY, 'one', id], queryFn: () => customerVehiclesApi.getOne(id!), enabled: !!id });
  const v = q.data;
  const wa = v ? waLink(v.ownerPhone, serviceNudge(v.ownerName, v.registrationNumber, shopName, lang)) : undefined;

  const autoRem = () => guard(async () => {
    setBusy(true);
    try { const r = await serviceRemindersApi.autoGenerate(id!); toast.success(r.created ? t('{{created}} reminder ban gaye', { created: r.created }) : t('Naye reminder ki zaroorat nahi')); refreshAuto([VEHICLE_KEY, REMINDER_KEY]); void q.refetch(); }
    catch (e) { toast.error(apiErrorMessage(e, t('Reminder nahi bane'))); } finally { setBusy(false); }
  });
  const toggle = () => guard(async () => {
    if (!v) return;
    setBusy(true);
    try { await (v.isActive ? customerVehiclesApi.remove(id!) : customerVehiclesApi.update(id!, { isActive: true })); toast.success(v.isActive ? t('Gaari band kar di — history waisi hi hai') : t('Gaari dobara chalu')); refreshAuto([VEHICLE_KEY]); void q.refetch(); }
    catch (e) { toast.error(apiErrorMessage(e, t('Nahi hua'))); } finally { setBusy(false); }
  });

  return (
    <DetailTemplate
      title={v ? v.registrationNumber : t('Gaari')}
      subtitle={v ? [vehicleName(v) || vehicleTypeOf(v.vehicleType), v.ownerName, v.ownerPhone].filter(Boolean).join(' · ') : undefined}
      loading={q.isLoading} error={q.data ? null : q.error} onRetry={() => void q.refetch()} onRefresh={() => void q.refetch()} refreshing={q.isRefetching}
      actions={v ? <Row gap={1}>{wa ? <IconButton icon={MessageCircle} label={t('WhatsApp')} onPress={() => void Linking.openURL(wa)} /> : null}{canEdit ? <IconButton icon={Pencil} label={t('Badlein')} onPress={() => guard(() => router.push(`/autoparts/vehicles/${v.id}/edit` as never))} /> : null}</Row> : undefined}
      bottomActions={v && canJob && v.isActive ? <Button fullWidth size="lg" icon={Wrench} onPress={() => guard(() => router.push({ pathname: '/autoparts/jobs/new', params: { vehicle: v.id } } as never))}>{t('Naya job')}</Button> : undefined}
    >
      {v && (
        <View style={{ gap: th.space(4) }}>
          <OfflineNote feature="autopartsDesk" />
          <StatGrid items={[
            { label: t('Dafa aayi'), value: String(v.totalServices) }, { tone: 'success', label: t('Kul kharcha'), value: formatMoney(v.totalSpent) },
            { tone: 'info', label: t('Meter'), value: km(v.odometerKm ?? v.lastOdometerKm) },
            { tone: v.customer && v.customer.balance > 0 ? 'warning' : 'neutral', label: t('Khata'), value: v.customer ? (v.customer.balance > 0 ? t('{{balance}} udhaar', { balance: formatMoney(v.customer.balance) }) : v.customer.balance < 0 ? t('{{formatPKR}} jama', { formatPKR: formatMoney(-v.customer.balance) }) : t('Saaf')) : '—' },
          ]} />
          <DetailSection title={t('Kaghzat')}>
            {([[t('Insurance'), v.insuranceExpiry], [t('Token tax'), v.tokenTaxExpiry], [t('Fitness'), v.fitnessExpiry]] as Array<[string, string | undefined]>).map(([label, d], i) => {
              const left = daysUntil(d);
              return <DetailRow key={label} label={label} last={i === 2} value={<Text size="sm" tone={left !== null && left <= 30 ? 'danger' : 'default'}>{d ? `${dayOnly(d)}${left !== null && left <= 30 ? (left < 0 ? ` (${t('khatam')})` : ` (${t('{{left}} din', { left })})`) : ''}` : '—'}</Text>} />;
            })}
          </DetailSection>
          {canEdit && (v.insuranceExpiry || v.tokenTaxExpiry || v.fitnessExpiry) ? <Button size="sm" variant="secondary" icon={Bell} loading={busy} onPress={autoRem}>{t('Kaghzat ke reminder banayein')}</Button> : null}
          {v.notes ? <Card tone="warning"><Text size="sm">{v.notes}</Text></Card> : null}

          <Card flush title={t('Service history')}>
            {!v.serviceHistory?.length ? <View style={{ padding: th.space(4) }}><Text size="sm" tone="muted">{t('Abhi koi job nahi')}</Text></View> : v.serviceHistory.map((j, i) => (
              <ListRow key={j.id} divider={i < v.serviceHistory!.length - 1} title={<Row gap={1.5} wrap><Text weight="semibold">{dayOnly(j.receivedAt)}</Text><Badge tone={statusOf(j.status).tone}>{t(statusOf(j.status).label)}</Badge>{j.odometerKm ? <Text size="xs" tone="muted">{km(j.odometerKm)}</Text> : null}</Row>}
                subtitle={`${j.customerComplaint || jobTypeOf(j.jobType)}${j.partsUsed.length ? ` · ${t('Parts: {{value}}', { value: j.partsUsed.map((p) => p.partName).join(', ') })}` : ''}`}
                trailing={<Text weight="semibold" ltr>{formatMoney(j.total)}</Text>} chevron onPress={() => router.push(`/autoparts/jobs/${j.id}` as never)} />
            ))}
          </Card>
          <Card flush title={t('Reminders')} action={<Button size="sm" variant="link" onPress={() => router.push('/autoparts/reminders' as never)}>{t('Sab reminders →')}</Button>}>
            {!v.reminders?.length ? <View style={{ padding: th.space(4) }}><Text size="sm" tone="muted">{t('Koi reminder nahi')}</Text></View> : v.reminders.map((r, i) => (
              <ListRow key={r.id} divider={i < v.reminders!.length - 1} icon={Bell} iconTone="warning" title={r.title} subtitle={[r.dueDate && dayOnly(r.dueDate), r.dueOdometerKm && km(r.dueOdometerKm)].filter(Boolean).join(' / ') || '—'} />
            ))}
          </Card>
          {canEdit ? <Button variant="ghost" icon={Power} loading={busy} onPress={toggle}>{v.isActive ? t('Band karein') : t('Chalu karein')}</Button> : null}
        </View>
      )}
    </DetailTemplate>
  );
}
