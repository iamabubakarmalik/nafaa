/** Clinic appointments (web ClinicAppointmentsPage): the day's visits by status with fees; tap for the visit. */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Calendar, CalendarPlus } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { feeDue } from '@nafaa/core/industries/clinic';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, ListRow, ListTemplate, Text } from '@/design';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { OfflineNote, shiftKey, todayKey } from '../../_shared/deskKit';
import { clinicApi, type Appointment } from '../api';
import { APT_STATUS, CLINIC_KEYS, doctorName, visitTypeLabel } from '../meta';
import { VisitSheet } from './VisitSheet';

const toIso = (key: string, time: string) => new Date(`${key}T${time}:00+05:00`).toISOString();
const RANGES = [['today', t('Aaj')], ['week', t('7 din')], ['month', t('30 din')]] as const;

export function AppointmentsScreen() {
  const can = usePermission();
  const [range, setRange] = useState<'today' | 'week' | 'month'>('today');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const from = range === 'today' ? todayKey() : shiftKey(todayKey(), range === 'week' ? -6 : -29);
  const query = useQuery({ queryKey: [CLINIC_KEYS.appointments, range, q], queryFn: () => clinicApi.appointments.page({ from: toIso(from, '00:00'), to: toIso(todayKey(), '23:59'), search: q || undefined, limit: 80 }), refetchInterval: 30_000 });
  const data = query.data;
  return (
    <>
      <ListTemplate<Appointment>
        title={t('Appointments')} search={{ value: q, onChange: setQ, placeholder: t('Mareez, MRN ya token') }}
        filters={{ value: range, onChange: (v) => setRange(v as typeof range), options: RANGES.map(([value, label]) => ({ value, label })) }}
        summary={<View style={{ gap: 8 }}>{data && <Text size="sm" tone="muted">{t('Fees {{f}} · Baqi {{d}}', { f: formatMoney(data.summary.fees), d: formatMoney(data.summary.due) })}</Text>}<OfflineNote feature="clinicDesk" /><CachedNote query={query} /></View>}
        data={data?.items} loading={query.isLoading} error={data ? null : query.error} onRetry={() => void query.refetch()} refreshing={query.isRefetching} onRefresh={() => void query.refetch()}
        keyExtractor={(a) => a.id}
        renderItem={({ item: a }) => (
          <ListRow icon={Calendar} iconTone={APT_STATUS[a.status].tone} divider chevron onPress={() => setOpen(a.id)} title={`${a.tokenNumber ? `#${a.tokenNumber} · ` : ''}${a.patient?.fullName ?? ''}`} subtitle={`${doctorName(a.doctor)} · ${visitTypeLabel(a.visitType)}`}
            trailing={<View style={{ alignItems: 'flex-end', gap: 2 }}>{feeDue(a) > 0 && a.status === 'COMPLETED' && <Text size="xs" tone="warning" ltr>{formatMoney(feeDue(a))}</Text>}<Badge tone={APT_STATUS[a.status].tone}>{t(APT_STATUS[a.status].label)}</Badge></View>} />
        )}
        fab={can(P.SERVICE_BOOKINGS_MANAGE) ? { icon: CalendarPlus, label: t('Reception'), onPress: () => router.push('/clinic/appointments/new' as never) } : undefined}
      />
      <VisitSheet id={open} onClose={() => setOpen(null)} />
    </>
  );
}
