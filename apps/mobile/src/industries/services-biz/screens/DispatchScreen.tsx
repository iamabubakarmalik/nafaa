/**
 * Dispatch (web DispatchPage): open jobs that still need a technician, grouped
 * by area (urgent first), the team with what each person holds today, and the
 * jobs on the road or on site grouped by technician. There is no map; the area
 * on the job is the grouping, and each technician's jobs sit under their name.
 */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { AlertTriangle, Car, MapPin, UserCheck, Users, Wrench } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, Button, Card, EmptyState, KpiStrip, ListRow, Screen, SearchBar, Segmented, Sheet, Text, toast, useTheme } from '@/design';
import { OfflineNote, errorText, useDeskOnline } from '../../_shared/deskKit';
import { servicesApi, type ServiceJob } from '../api';
import { SB_KEYS, TECH_STATUS, dateOf, jobStatus, priorityTone, refreshServices } from '../meta';

const URGENT = ['URGENT', 'EMERGENCY'];
const BOOKED = ['DRAFT', 'ENQUIRY', 'QUOTED', 'CONFIRMED', 'SCHEDULED', 'READY', 'ASSIGNED'];
const WORKING = ['DISPATCHED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS'];
const placeOf = (j: ServiceJob) => [j.area, j.city].filter(Boolean).join(', ') || j.serviceAddress || t('Area nahi likha');

export function DispatchScreen() {
  const th = useTheme();
  const manage = usePermission()(P.SERVICE_JOBS_MANAGE);
  const { guard } = useDeskOnline('servicesDesk');
  const [tab, setTab] = useState<'board' | 'field'>('board');
  const [q, setQ] = useState('');
  const [assigning, setAssigning] = useState<ServiceJob | null>(null);
  const jobsQ = useQuery({ queryKey: [SB_KEYS.jobs, 'dispatch'], queryFn: () => servicesApi.jobs.page({ view: 'open', limit: 200, sort: 'due' }), refetchInterval: 30_000 });
  const techQ = useQuery({ queryKey: [SB_KEYS.techs], queryFn: () => servicesApi.technicians.list(), refetchInterval: 30_000 });
  const suggest = useQuery({ queryKey: [SB_KEYS.techs, 'suggest', assigning?.id], queryFn: () => servicesApi.dispatch.suggest(assigning!.id), enabled: !!assigning });
  const jobs = jobsQ.data?.items ?? [];
  const techs = techQ.data ?? [];
  const match = (j: ServiceJob) => { const w = q.trim().toLowerCase(); return !w || `${j.jobNumber} ${j.serviceName} ${j.customerName ?? ''} ${j.area ?? ''} ${j.city ?? ''}`.toLowerCase().includes(w); };
  const waiting = useMemo(() => jobs.filter((j) => !j.primaryTechnicianId && BOOKED.includes(j.status) && match(j))
    .sort((a, b) => Number(URGENT.includes(b.priority)) - Number(URGENT.includes(a.priority)) || (a.scheduledStart ?? a.createdAt).localeCompare(b.scheduledStart ?? b.createdAt)), [jobs, q]); // eslint-disable-line react-hooks/exhaustive-deps
  const field = jobs.filter((j) => WORKING.includes(j.status) && match(j));
  const byArea = useMemo(() => { const m = new Map<string, ServiceJob[]>(); for (const j of waiting) { const k = placeOf(j); m.set(k, [...(m.get(k) ?? []), j]); } return [...m.entries()]; }, [waiting]);
  const mineOf = (staffId: string) => jobs.filter((j) => j.primaryTechnicianId === staffId);
  const free = techs.filter((x) => x.status === 'AVAILABLE').length;
  const late = jobs.filter((j) => j.isLate).length;
  const assign = async (staffId: string) => {
    if (!assigning) return;
    try { const j = await servicesApi.jobs.assign(assigning.id, staffId); refreshServices(); setAssigning(null); toast.success(t('{{jobNumber}} — {{value}} ko de di', { jobNumber: j.jobNumber, value: j.technicianName ?? t('Technician') })); }
    catch (e) { toast.error(errorText(e, t('Nahi hua'))); }
  };
  const jobRow = (j: ServiceJob, action?: boolean) => (
    <ListRow key={j.id} divider icon={URGENT.includes(j.priority) ? AlertTriangle : Wrench} iconTone={URGENT.includes(j.priority) ? 'danger' : 'info'} chevron={!action} onPress={() => router.push({ pathname: '/services-biz/jobs/[id]', params: { id: j.id } } as never)}
      title={j.serviceName} subtitle={`${[j.customerName, j.jobNumber].filter(Boolean).join(' · ')}${j.scheduledStart ? ` · ${dateOf(j.scheduledStart)}` : ''}`}
      trailing={action && manage ? <Button size="sm" icon={UserCheck} onPress={() => guard(() => setAssigning(j))}>{t('Lagayein')}</Button> : <Badge tone={jobStatus(j.status).tone}>{t(jobStatus(j.status).label)}</Badge>} />
  );
  return (
    <Screen title={t('Dispatch')} subtitle={t('Kis job ko kaun jayega')} onRefresh={() => { void jobsQ.refetch(); void techQ.refetch(); }} refreshing={jobsQ.isRefetching}>
      <View style={{ gap: th.space(3) }}>
        <OfflineNote feature="servicesDesk" />
        <KpiStrip items={[{ key: 'w', label: t('Technician baqi'), value: String(waiting.length), icon: UserCheck }, { key: 'f', label: t('Free'), value: `${free}/${techs.length}`, icon: Users }, { key: 'o', label: t('Field me'), value: String(field.length), icon: Car }, { key: 'l', label: t('Late'), value: String(late), icon: AlertTriangle, tone: late ? 'danger' : undefined }]} />
        <SearchBar value={q} onChangeText={setQ} placeholder={t('Job #, customer, area…')} />
        <Segmented value={tab} onChange={(v) => setTab(v as 'board' | 'field')} options={[{ value: 'board', label: `${t('Board')} ${waiting.length}`, icon: UserCheck }, { value: 'field', label: `${t('Field me')} ${field.length}`, icon: Car }]} />
        {tab === 'board' ? (
          <>
            {byArea.length === 0 && <EmptyState icon={UserCheck} title={t('Sab jobs par technician lag chuka')} />}
            {byArea.map(([area, list]) => (
              <Card key={area} title={`${area} · ${list.length}`} flush>{list.map((j) => jobRow(j, true))}</Card>
            ))}
            <Text size="sm" weight="semibold" tone="secondary">{t('Team aaj')}</Text>
            {techs.length === 0 ? <EmptyState icon={Users} title={t('Koi technician nahi')} /> : techs.map((x) => {
              const mine = mineOf(x.staffId);
              const s = TECH_STATUS[x.status];
              return (
                <Card key={x.id} title={x.staff?.fullName ?? t('Technician')} flush>
                  <ListRow dense title={t('{{count}} jobs', { count: mine.length })} subtitle={x.primarySkill ?? undefined} trailing={<Badge tone={s?.tone ?? 'neutral'}>{t(s?.label ?? x.status)}</Badge>} divider={mine.length > 0} />
                  {mine.slice(0, 4).map((j) => <ListRow key={j.id} dense divider icon={MapPin} title={j.serviceName} subtitle={placeOf(j)} chevron onPress={() => router.push({ pathname: '/services-biz/jobs/[id]', params: { id: j.id } } as never)} />)}
                </Card>
              );
            })}
          </>
        ) : field.length === 0 ? <EmptyState icon={Car} title={t('Abhi koi technician field me nahi')} /> : (
          techs.map((x) => ({ x, list: field.filter((j) => j.primaryTechnicianId === x.staffId) })).filter((g) => g.list.length).map((g) => (
            <Card key={g.x.id} title={`${g.x.staff?.fullName ?? t('Technician')} · ${g.list.length}`} flush>{g.list.map((j) => jobRow(j))}</Card>
          ))
        )}
      </View>
      <Sheet open={!!assigning} onClose={() => setAssigning(null)} title={t('Technician lagayein')} description={assigning ? `${assigning.jobNumber} · ${placeOf(assigning)}` : t('Skill aur doori ke hisaab se')} height={0.7}>
        {(suggest.data ?? []).map((s) => (
          <ListRow key={s.id} divider title={s.staff?.fullName ?? '—'} subtitle={`${s.primarySkill ?? ''}${s.distanceKm != null ? ` · ${s.distanceKm.toFixed(1)} km` : ''} · ${t('{{n}} khuli jobs', { n: s.openJobs ?? 0 })}`} chevron onPress={() => void assign(s.staffId)} />
        ))}
        {suggest.isLoading && <Text tone="muted">{t('Dhoondh rahe hain…')}</Text>}
      </Sheet>
    </Screen>
  );
}
