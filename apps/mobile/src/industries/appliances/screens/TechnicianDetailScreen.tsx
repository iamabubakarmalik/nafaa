/** One technician (web TechnicianDetailPage): the month's work, open jobs, recent jobs; call, edit, turn off or on. */

import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Pencil, Phone, Power } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { confirm } from '@/design';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Amount, Badge, Button, Card, DetailRow, DetailSection, DetailTemplate, IconButton, ListRow, Row, Text, toast, useTheme } from '@/design';
import { useCostMask } from '@/modules/sales/lib/mask';
import { Fact, callPhone, errText, useDeskOnline } from '../../_shared/trade/desk';
import { techniciansApi } from '../api';
import { KEYS, catLabel, installStatus, refreshAppliances, serviceStatus } from '../meta';

export function TechnicianDetailScreen() {
  const th = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const can = usePermission();
  const manage = can(P.STAFF_MANAGE);
  const { guard } = useDeskOnline('appliancesDesk');
  const { cost } = useCostMask();
  const q = useQuery({ queryKey: [KEYS.tech, 'one', id], queryFn: () => techniciansApi.getOne(id!), enabled: !!id });
  const [busy, setBusy] = useState(false);
  const x = q.data;

  const toggle = () => guard(async () => {
    if (!x) return;
    if (x.isActive && !(await confirm({ title: t('Technician band karein?'), message: t('Purana kaam aur commission ka record rehta hai. Khule kaam pehle kisi aur ko dein.'), confirmLabel: t('Band karein'), tone: 'danger' }))) return;
    setBusy(true);
    try {
      if (x.isActive) await techniciansApi.remove(x.id); else await techniciansApi.update(x.id, { isActive: true });
      refreshAppliances([KEYS.tech]);
      toast.success(t('Technician update'));
      void q.refetch();
    } catch (e) { toast.error(errText(e, t('Nahi hua'))); } finally { setBusy(false); }
  });

  return (
    <DetailTemplate title={x?.name ?? t('Technician')} subtitle={x ? `${x.employeeCode} · ${x.phone}` : undefined}
      loading={q.isLoading} error={q.error} onRetry={() => void q.refetch()} onRefresh={() => void q.refetch()} refreshing={q.isRefetching}
      actions={x ? <IconButton icon={Phone} label={t('Call')} onPress={() => callPhone(x.phone)} /> : undefined}
      bottomActions={x && manage ? (
        <>
          <Button variant="secondary" icon={Pencil} style={{ flex: 1 }} onPress={() => router.push({ pathname: '/appliances/technicians/new', params: { edit: x.id } } as never)}>{t('Badlein')}</Button>
          <Button variant={x.isActive ? 'ghost' : 'success'} icon={Power} loading={busy} style={{ flex: 1 }} onPress={toggle}>{x.isActive ? t('Band karein') : t('Chalu karein')}</Button>
        </>
      ) : undefined}>
      {x && (
        <View style={{ gap: th.space(3) }}>
          <Row gap={1.5} wrap>
            <Badge tone={x.isActive ? 'success' : 'neutral'}>{x.isActive ? t('Active') : t('Band')}</Badge>
            {x.avgRating ? <Badge tone="warning">{`★ ${Number(x.avgRating).toFixed(1)} (${x.totalReviews})`}</Badge> : null}
            <Badge tone={x.openJobs ? 'info' : 'success'}>{x.openJobs ? t('{{openJobs}} kaam khule', { openJobs: x.openJobs }) : t('Free')}</Badge>
          </Row>
          <DetailSection title={t('Is mahine')}>
            <DetailRow label={t('Kaam')} value={<Text weight="semibold">{String(x.month.jobs)}</Text>} />
            <DetailRow label={t('Kamai')} value={<Text weight="semibold" ltr>{cost(x.month.revenue)}</Text>} />
            <DetailRow label={t('Commission')} value={<Amount value={x.month.commission} />} />
            <DetailRow label={t('Mukammal hone ki dar')} value={<Text weight="semibold">{`${x.completionRate}%`}</Text>} last />
          </DetailSection>
          <Card>
            <View style={{ gap: th.space(2) }}>
              <Fact k={t('Ilaqa')} v={x.currentZone} />
              <Fact k={t('Kaam')} v={x.categoriesExpertise.map(catLabel).join(', ')} />
              <Fact k={t('Brands')} v={x.brandsExpertise.join(', ')} />
              <Fact k={t('Tajurba (saal)')} v={x.experienceYears} />
              <Fact k={t('Waqt')} v={`${x.workStartTime} – ${x.workEndTime}`} />
              <Fact k={t('Visit rate')} v={x.visitChargeRate ? `Rs ${x.visitChargeRate}` : undefined} />
              <Fact k={t('Commission %')} v={x.commissionPct || undefined} />
              <Fact k={t('Pata')} v={x.address} />
              <Fact k={t('Note')} v={x.notes} />
            </View>
          </Card>
          {x.activeServiceRequests?.length > 0 && (
            <DetailSection title={t('Khule repair')}>
              {x.activeServiceRequests.map((s, i) => <ListRow key={s.id} dense divider={i < x.activeServiceRequests.length - 1} chevron onPress={() => router.push(`/appliances/service-requests/${s.id}` as never)} title={`${s.requestNumber ?? ''} · ${s.productName ?? ''}`} subtitle={s.customerName} trailing={<Text size="xs" tone="muted">{serviceStatus(s.status).label}</Text>} />)}
            </DetailSection>
          )}
          {x.recentJobs?.length > 0 && (
            <DetailSection title={t('Pichli installations')}>
              {x.recentJobs.slice(0, 6).map((s, i) => <ListRow key={s.id} dense divider={i < Math.min(x.recentJobs.length, 6) - 1} chevron onPress={() => router.push(`/appliances/installations/${s.id}` as never)} title={`${s.installationNumber ?? ''} · ${s.productName ?? ''}`} subtitle={s.customerName} trailing={<Text size="xs" tone="muted">{installStatus(s.status).label}</Text>} />)}
            </DetailSection>
          )}
          {x.recentServices?.length > 0 && (
            <DetailSection title={t('Pichle repair')}>
              {x.recentServices.slice(0, 6).map((s, i) => <ListRow key={s.id} dense divider={i < Math.min(x.recentServices.length, 6) - 1} chevron onPress={() => router.push(`/appliances/service-requests/${s.id}` as never)} title={`${s.requestNumber ?? ''} · ${s.productName ?? ''}`} subtitle={s.reportedIssue} trailing={<Text size="xs" tone="muted">{serviceStatus(s.status).label}</Text>} />)}
            </DetailSection>
          )}
        </View>
      )}
    </DetailTemplate>
  );
}
