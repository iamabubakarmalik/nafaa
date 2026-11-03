/** Services dashboard (web services-biz/dashboard): jobs by stage, late and unpaid work, today's in and out, the month's money and quick actions. */

import { useQuery } from '@tanstack/react-query';
import { Award, Briefcase, Clock, FileText, Package, Plus, ShieldCheck, UserX, Users, Wallet } from 'lucide-react-native';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { PackDashboard, type DashAction, type DashAttention } from '../../_shared/packDashboard';
import { servicesApi } from '../api';
import { SB_KEYS } from '../meta';

export function ServicesDashboardScreen() {
  const can = usePermission();
  const q = useQuery({ queryKey: [SB_KEYS.dash], queryFn: () => servicesApi.jobs.stats(), refetchInterval: 30_000 });
  const s = q.data;
  const attention: DashAttention[] = [];
  if (s?.late) attention.push({ icon: Clock, tone: 'danger', text: t('{{n}} job late hai', { n: s.late }), href: '/services-biz/jobs' });
  if (s?.unassigned) attention.push({ icon: UserX, tone: 'warning', text: t('{{n}} job par technician nahi', { n: s.unassigned }), href: '/services-biz/jobs' });
  if (s?.ready) attention.push({ icon: Briefcase, tone: 'info', text: t('{{n}} job ka bill baqi ({{a}})', { n: s.ready, a: formatMoney(s.readyDue) }), href: '/services-biz/jobs' });
  if (s?.unpaidJobs) attention.push({ icon: Wallet, tone: 'danger', text: t('{{n}} job ka paisa baqi ({{a}})', { n: s.unpaidJobs, a: formatMoney(s.unpaidDue) }), href: '/services-biz/jobs' });
  const actions: DashAction[] = [
    { href: '/services-biz/jobs/new', icon: Plus, label: t('New job'), hint: t('Fast'), show: can(P.SERVICE_JOBS_MANAGE) }, { href: '/services-biz/jobs', icon: Briefcase, label: t('Jobs'), hint: t('Work orders') },
    { href: '/services-biz/quotes', icon: FileText, label: t('Quotes'), hint: t('Rate dena') }, { href: '/services-biz/catalog', icon: Package, label: t('Catalog'), hint: t('Rate list') },
    { href: '/services-biz/technicians', icon: Users, label: t('Technicians'), hint: t('Commission') }, { href: '/services-biz/amc', icon: Award, label: t('AMC'), hint: t('Contracts') }, { href: '/services-biz/warranty', icon: ShieldCheck, label: t('Warranty'), hint: t('Claims') },
  ];
  return (
    <PackDashboard title={t('Services dashboard')} stats={[{ label: t('Khuli jobs'), value: String(s?.open ?? 0) }, { label: t('Aaj ho gayi'), value: String(s?.todayDone ?? 0) }, { label: t('Is mahine Sale'), value: formatMoney(s?.monthRevenue ?? 0) }]}
      attention={attention} actions={actions} refreshing={q.isRefetching} onRefresh={() => void q.refetch()} />
  );
}
