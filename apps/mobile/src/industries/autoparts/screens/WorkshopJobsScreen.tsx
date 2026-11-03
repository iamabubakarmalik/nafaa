/**
 * Workshop jobs (web WorkshopJobsPage): vehicles in the workshop and where each
 * job stands — work going on, waiting for parts or the customer's go-ahead,
 * ready to hand back — what is late, money still owed on delivered jobs, and
 * the month's workshop earnings.
 */

import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { AlertTriangle, Bell, Car, CheckCircle2, Clock, MessageCircle, Package, Plus, Printer, Receipt, Truck, Wallet, Wrench } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Linking, View } from 'react-native';
import { jobDue, jobIsLate, isReady } from '@nafaa/core/industries/autoparts';
import { useAuthStore } from '@/core/auth/store';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { useBillLanguage } from '@/core/receipt';
import { Badge, Card, ChipGroup, EmptyState, HBarList, IconButton, ListRow, ListTemplate, Row, Select, Text, toast, useTheme } from '@/design';
import { usePaged } from '@/modules/inventory/stock/usePaged';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { OfflineNote, useDeskOnline } from '../../_shared/deskKit';
import { Meta, RowCard, StatGrid } from '../../_shared/trade/kit';
import { sendSlip } from '../../_shared/trade/slip';
import { mechanicsApi, workshopJobsApi, type JobListParams, type JobPriority, type JobSort, type JobStats, type JobView, type WorkshopJob } from '../api';
import { JOB_KEY, MECHANIC_KEY, PRIORITIES, dateTime, dayOnly, jobTypeOf, priorityOf, statusOf, vehicleName, waLink } from '../meta';
import { jobCard, jobMessage } from '../slip';

type Tab = JobView | 'analytics';
const LIMIT = 40;

export function WorkshopJobsScreen() {
  const th = useTheme();
  const can = usePermission();
  const { guard } = useDeskOnline('autopartsDesk');
  const shopName = useAuthStore((s) => s.tenant?.name) || 'Shop';
  const lang = useBillLanguage();
  const params = useLocalSearchParams<{ view?: string; mechanic?: string }>();
  const canManage = can(P.SERVICE_JOBS_MANAGE);
  const [tab, setTab] = useState<Tab>((params.view as JobView) || 'open');
  const [priority, setPriority] = useState<JobPriority | ''>('');
  const [mechanic, setMechanic] = useState(params.mechanic ?? '');
  const [sort, setSort] = useState<JobSort>('due');
  const [search, setSearch] = useState('');
  const shopId = useAuthStore((s) => s.currentShopId) ?? undefined;

  const q: JobListParams = { view: tab === 'analytics' ? 'open' : tab, shopId, limit: LIMIT, sort, search: search.trim() || undefined, priority: priority || undefined, mechanicId: mechanic || undefined };
  const list = usePaged([JOB_KEY, 'page', q], (page) => workshopJobsApi.page({ ...q, page }).then((r) => ({ ...r, pages: r.totalPages })), tab !== 'analytics');
  const stats = useQuery({ queryKey: [JOB_KEY, 'stats', shopId], queryFn: () => workshopJobsApi.stats(shopId), refetchInterval: 60_000 });
  const mech = useQuery({ queryKey: [MECHANIC_KEY], queryFn: () => mechanicsApi.list(), staleTime: 5 * 60_000 });
  const s = stats.data;
  const totals = list.first?.totals;

  const views: Array<{ value: Tab; label: string }> = [
    { value: 'open', label: t('Workshop me') }, { value: 'working', label: t('Kaam chal raha') }, { value: 'waiting', label: t('Parts / haan ka intezar') }, { value: 'ready', label: t('Tayyar — deni hai') },
    { value: 'late', label: t('Late') }, { value: 'unpaid', label: t('Udhaar baqi') }, { value: 'closed', label: t('Di gayi / cancel') }, { value: 'all', label: t('Sab') }, { value: 'analytics', label: t('Analytics') },
  ];

  const summary = (
    <View style={{ gap: th.space(3) }}>
      <StatGrid items={[
        { icon: Wrench, tone: 'accent', label: t('Kaam chal raha'), loading: stats.isLoading, value: String(s?.working ?? 0), hint: t('{{open}} workshop me', { open: s?.open ?? 0 }), onPress: () => setTab('working') },
        { icon: Package, tone: s?.waiting ? 'warning' : 'neutral', label: t('Intezar me'), loading: stats.isLoading, value: String(s?.waiting ?? 0), hint: t('Parts ya customer ki haan'), onPress: () => setTab('waiting') },
        { icon: CheckCircle2, tone: 'success', label: t('Tayyar — deni hai'), loading: stats.isLoading, value: String(s?.ready ?? 0), hint: s?.readyDue ? t('{{readyDue}} lena hai', { readyDue: formatMoney(s.readyDue) }) : t('Customer ko bulayein'), onPress: () => setTab('ready') },
        { icon: AlertTriangle, tone: s?.late ? 'danger' : 'neutral', label: t('Late'), loading: stats.isLoading, value: String(s?.late ?? 0), hint: s?.late ? t('Waada guzar gaya') : t('Koi late nahi'), onPress: () => setTab('late') },
        { icon: Wallet, tone: s?.unpaidDue ? 'warning' : 'neutral', label: t('Udhaar baqi'), loading: stats.isLoading, value: formatMoney(s?.unpaidDue ?? 0), hint: t('{{unpaidJobs}} job', { unpaidJobs: s?.unpaidJobs ?? 0 }), onPress: () => setTab('unpaid') },
        { icon: Car, tone: 'info', label: t('Aaj aayi / gayi'), loading: stats.isLoading, value: `${s?.todayIn ?? 0} / ${s?.todayOut ?? 0}`, hint: t('Is mahine kamai {{value}}', { value: formatMoney(s?.monthRevenue ?? 0) }) },
      ]} />
      <OfflineNote feature="autopartsDesk" />
      <CachedNote query={stats} />
      <ChipGroup value={tab} onChange={(v) => setTab(v as Tab)} style={{ marginHorizontal: -th.space(4) }} options={views} />
      {tab === 'analytics' ? <Analytics stats={s} /> : (
        <>
          <Row gap={2}>
            <View style={{ flex: 1 }}><Select label={t('Jaldi')} value={priority} onChange={(v) => setPriority(v as JobPriority | '')} placeholder={t('Sab')} options={[{ value: '', label: t('Sab') }, ...PRIORITIES.map((p) => ({ value: p, label: t(priorityOf(p).label) }))]} /></View>
            <View style={{ flex: 1 }}><Select label={t('Mechanic')} value={mechanic} onChange={setMechanic} placeholder={t('Sab')} options={[{ value: '', label: t('Sab') }, ...(mech.data ?? []).map((m) => ({ value: m.id, label: m.staff?.fullName ?? t('Mechanic') }))]} /></View>
          </Row>
          <ChipGroup value={sort} onChange={(v) => setSort(v as JobSort)} style={{ marginHorizontal: -th.space(4) }}
            options={[{ value: 'due', label: t('Jo pehle deni hai') }, { value: 'new', label: t('Naye pehle') }, { value: 'old', label: t('Purane pehle') }, { value: 'amount', label: t('Bara bill pehle') }]} />
          {totals && (list.first?.total ?? 0) > 0 ? (
            <Text size="xs" tone="muted">{t('{{total}} jobs · bill {{bill}}', { total: list.first!.total, bill: formatMoney(totals.bill) })} · {t('mila {{paid}}', { paid: formatMoney(totals.paid) })}{totals.due > 0 ? ` · ${t('baqi {{due}}', { due: formatMoney(totals.due) })}` : ''}</Text>
          ) : null}
        </>
      )}
    </View>
  );

  const printJob = (j: WorkshopJob) => void sendSlip(jobCard(j, lang), shopName, lang).catch(() => toast.error(t('Could not print. Check the printer and try again.')));

  return (
    <ListTemplate<WorkshopJob>
      title={t('Workshop')}
      subtitle={t('Gaari lein, kaam likhein, parts lagayein, bill bana kar wapas dein')}
      grouped={false}
      actions={<IconButton icon={Bell} label={t('Reminders')} onPress={() => router.push('/autoparts/reminders' as never)} />}
      search={tab !== 'analytics' ? { value: search, onChange: setSearch, placeholder: t('Gaari number, job #, customer, phone, model…') } : undefined}
      summary={summary}
      data={tab === 'analytics' ? [] : list.items}
      loading={tab !== 'analytics' && list.loading}
      error={tab !== 'analytics' ? list.error : undefined}
      onRetry={list.refetch}
      refreshing={list.refreshing}
      onRefresh={() => { list.refetch(); void stats.refetch(); }}
      onEndReached={list.loadMore}
      keyExtractor={(j) => j.id}
      renderItem={({ item: j }) => {
        const due = j.due ?? jobDue(j);
        const st = statusOf(j.status);
        const late = j.isLate ?? jobIsLate(j);
        const wa = waLink(j.customerPhone, jobMessage(j, shopName, lang));
        return (
          <RowCard>
            <ListRow
              icon={Car} iconTone={late ? 'danger' : isReady(j.status) ? 'success' : 'accent'}
              title={<Row gap={1.5} wrap><Text weight="semibold" ltr>{j.registrationNumber ?? '—'}</Text><Text size="xs" tone="secondary" numberOfLines={1} style={{ flexShrink: 1 }}>{vehicleName(j)}</Text></Row>}
              subtitle={<View style={{ gap: 3 }}>
                <Row gap={1} wrap><Badge tone={st.tone}>{t(st.label)}</Badge>{j.priority !== 'NORMAL' ? <Badge tone={priorityOf(j.priority).tone}>{t(priorityOf(j.priority).label)}</Badge> : null}<Text size="2xs" tone="muted" ltr>{j.jobNumber}</Text></Row>
                <Text size="xs" tone="secondary" numberOfLines={1}>{[j.customerName, j.customerPhone].filter(Boolean).join(' · ') || t('Customer nahi likha')} — {j.customerComplaint || jobTypeOf(j.jobType)}</Text>
                <Row gap={1}><Clock size={12} color={late ? th.colors.danger.text : th.colors.textMuted} /><Text size="2xs" tone={late ? 'danger' : 'muted'}>{j.status === 'DELIVERED' ? t('Di gayi {{deliveredAt}}', { deliveredAt: dayOnly(j.deliveredAt) }) : j.status === 'CANCELLED' ? t('Cancel {{cancelledAt}}', { cancelledAt: dayOnly(j.cancelledAt) }) : j.promisedAt ? (late ? t('Late — waada {{promisedAt}}', { promisedAt: dateTime(j.promisedAt) }) : t('Deni hai {{promisedAt}}', { promisedAt: dateTime(j.promisedAt) })) : t('Waqt tay nahi')}{j.mechanicName ? ` · ${j.mechanicName}` : ''}</Text></Row>
              </View>}
              trailing={<View style={{ alignItems: 'flex-end', gap: 2 }}>
                <Text weight="bold" ltr>{formatMoney(j.total)}</Text>
                {due > 0 && j.status !== 'CANCELLED' ? <Text size="2xs" tone="warning" ltr>{t('baqi {{due}}', { due: formatMoney(due) })}</Text> : null}
                <Row gap={1}><IconButton icon={Printer} label={t('Parchi')} size="sm" variant="ghost" onPress={() => printJob(j)} />{wa ? <IconButton icon={MessageCircle} label={t('WhatsApp')} size="sm" variant="ghost" onPress={() => void Linking.openURL(wa)} /> : null}</Row>
              </View>}
              chevron onPress={() => router.push(`/autoparts/jobs/${j.id}` as never)}
            />
          </RowCard>
        );
      }}
      empty={tab === 'analytics' ? undefined : <EmptyState icon={Car} title={search || priority || mechanic ? t('Is filter me koi job nahi') : tab === 'late' ? t('Koi gaari late nahi — shabash') : tab === 'ready' ? t('Koi gaari dene ke liye tayyar nahi') : t('Koi job nahi')} message={t('Gaari aaye to number, meter aur shikayat likhein, parchi dein — tayyar hote hi WhatsApp karein.')} />}
      fab={canManage ? { icon: Plus, label: t('Naya job'), onPress: () => guard(() => router.push('/autoparts/jobs/new' as never)) } : undefined}
    />
  );
}

function Analytics({ stats: s }: { stats?: JobStats }) {
  const th = useTheme();
  if (!s) return null;
  const other = Math.max(s.monthRevenue - s.monthLabour - s.monthParts, 0);
  return (
    <View style={{ gap: th.space(3) }}>
      <Card title={t('Kamai — is mahine')}>
        <StatGrid items={[
          { icon: Car, label: t('Gaariyan di'), value: String(s.monthDelivered) }, { icon: Receipt, tone: 'success', label: t('Kul bill'), value: formatMoney(s.monthRevenue) },
          { icon: Wrench, tone: 'accent', label: t('Mazdoori'), value: formatMoney(s.monthLabour) }, { icon: Package, tone: 'info', label: t('Parts'), value: formatMoney(s.monthParts) },
          { icon: Truck, tone: 'neutral', label: t('Bahar ka kaam / tax'), value: formatMoney(other) }, { icon: Wallet, tone: s.unpaidDue > 0 ? 'warning' : 'neutral', label: t('Udhaar baqi'), value: formatMoney(s.unpaidDue) },
        ]} />
        <Text size="xs" tone="muted" style={{ marginTop: 8 }}>{t('Profit aur cost Reports → Profit me — har job ka bill wahan sale ki tarah aata hai.')}</Text>
      </Card>
      <Card title={t('Jobs kis halat me')}>
        {s.byStatus.length === 0 ? <Text size="sm" tone="muted">{t('Abhi koi job nahi')}</Text> : <HBarList colorful rows={[...s.byStatus].sort((a, b) => b.count - a.count).map((b) => ({ key: b.status, label: t(statusOf(b.status).label), value: b.count, display: <Text size="xs" tone="muted">{b.count}</Text> }))} />}
      </Card>
    </View>
  );
}
