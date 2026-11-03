/** Jobs (web JobsListPage): work orders by stage (booked, working, waiting, ready for bill, late, unpaid); tap for the job. */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Briefcase, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, ListRow, ListTemplate, Text } from '@/design';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { OfflineNote } from '../../_shared/deskKit';
import { servicesApi, type JobView, type ServiceJob } from '../api';
import { SB_KEYS, jobStatus, priorityTone } from '../meta';

const VIEWS: Array<[JobView, string]> = [['open', t('Khule')], ['booked', t('Booked')], ['working', t('Kaam chal raha')], ['waiting', t('Intezar me')], ['ready', t('Bill baqi')], ['late', t('Late')], ['unpaid', t('Paisa baqi')], ['closed', t('Band')], ['all', t('Sab')]];

export function JobsScreen() {
  const can = usePermission();
  const [view, setView] = useState<JobView>('open');
  const [q, setQ] = useState('');
  const query = useQuery({ queryKey: [SB_KEYS.jobs, view, q], queryFn: () => servicesApi.jobs.page({ view, search: q || undefined, limit: 80 }), refetchInterval: 60_000 });
  const data = query.data;
  return (
    <ListTemplate<ServiceJob>
      title={t('Jobs')} search={{ value: q, onChange: setQ, placeholder: t('Customer, phone ya job number') }}
      filters={{ value: view, onChange: (v) => setView(v as JobView), options: VIEWS.map(([value, label]) => ({ value, label })) }}
      summary={<View style={{ gap: 8 }}>{data && <Text size="sm" tone="muted">{t('Bill {{b}} · Baqi {{d}}', { b: formatMoney(data.totals.bill), d: formatMoney(data.totals.due) })}</Text>}<OfflineNote feature="servicesDesk" /><CachedNote query={query} /></View>}
      data={data?.items} loading={query.isLoading} error={data ? null : query.error} onRetry={() => void query.refetch()} refreshing={query.isRefetching} onRefresh={() => void query.refetch()}
      keyExtractor={(j) => j.id}
      renderItem={({ item: j }) => (
        <ListRow icon={Briefcase} iconTone={jobStatus(j.status).tone} divider chevron onPress={() => router.push(`/services-biz/jobs/${j.id}` as never)} title={`${j.serviceName}${j.customerName ? ` — ${j.customerName}` : ''}`}
          subtitle={`${j.jobNumber}${j.technicianName ? ` · ${j.technicianName}` : ''}`}
          trailing={<View style={{ alignItems: 'flex-end', gap: 2 }}><Text weight="bold" size="sm" ltr>{formatMoney(j.totalCharge)}</Text><Badge tone={j.isLate ? 'danger' : jobStatus(j.status).tone}>{t(jobStatus(j.status).label)}</Badge>{j.priority !== 'NORMAL' && <Text size="2xs" tone={priorityTone(j.priority) === 'danger' ? 'danger' : 'warning'}>{j.priority}</Text>}</View>} />
      )}
      empty={<View style={{ padding: 32, alignItems: 'center' }}><Briefcase size={32} color="#999" /><Text tone="muted">{t('Koi job nahi')}</Text></View>}
      fab={can(P.SERVICE_JOBS_MANAGE) ? { icon: Plus, label: t('New job'), onPress: () => router.push('/services-biz/jobs/new' as never) } : undefined}
    />
  );
}
