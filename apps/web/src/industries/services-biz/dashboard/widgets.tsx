/** Service-business dashboard widgets. */

import { AlertTriangle, Briefcase, CheckCircle2, Clock, FileText, HandCoins, MapPin, ShieldCheck, Star, Truck, UserCheck, Users, Wrench, Zap } from 'lucide-react';
import { Badge } from '@/design-system/components';
import { IconBubble, ListRow, MetricTile, RowList, useMasked, WidgetCard, type KpiDef } from '@modules/dashboard/engine';
import type { AttentionItem } from '@modules/dashboard/widgets';
import { formatPKR } from '@core/lib/format';
import type { JobStatus } from '../api/jobs.api';
import { useServicesOps } from './useServicesOps';
import { t as tr } from '@core/i18n';

const JOB_STATUS: Partial<Record<JobStatus, { label: string; variant: 'default' | 'info' | 'warning' | 'success' }>> = {
  SCHEDULED: { label: tr('Booked'), variant: 'default' },
  ASSIGNED: { label: tr('Banda laga'), variant: 'info' },
  DISPATCHED: { label: tr('Nikal gaya'), variant: 'info' },
  EN_ROUTE: { label: tr('Raaste me'), variant: 'info' },
  ARRIVED: { label: tr('Pohanch gaya'), variant: 'warning' },
  IN_PROGRESS: { label: tr('Kaam jaari'), variant: 'warning' },
};

const when = (iso?: string) => (iso ? new Intl.DateTimeFormat('en-PK', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(iso)) : tr('Waqt tay nahi'));

/** Service headline numbers, offered next to the common ones. */
export const servicesKpis: KpiDef[] = [
  {
    id: 'services-jobs', label: tr('Chaalu jobs'), icon: Briefcase, tone: 'brand',
    useValue: () => {
      const { work, loading } = useServicesOps();
      return { loading, to: '/services-biz/jobs', value: work.active, hint: tr('{{today}} aaj · {{onSite}} site par', { today: work.today, onSite: work.onSite }) };
    },
  },
  {
    id: 'services-urgent', label: tr('Urgent / late'), icon: Zap, tone: 'danger',
    useValue: () => {
      const { work, loading } = useServicesOps();
      return {
        loading, to: '/services-biz/jobs', value: work.urgent.length + work.late.length, alert: work.urgent.length > 0,
        hint: tr('{{count}} urgent · {{count2}} late', { count: work.urgent.length, count2: work.late.length }),
      };
    },
  },
  {
    id: 'services-techs', label: tr('Technician free'), icon: UserCheck, tone: 'success',
    useValue: () => {
      const { techs, loading } = useServicesOps();
      return { loading, to: '/services-biz/technicians', value: `${techs.free}/${techs.total}`, hint: tr('abhi khaali') };
    },
  },
  {
    id: 'services-amc', label: tr('AMC renewal'), icon: ShieldCheck, tone: 'warning',
    useValue: () => {
      const { amc, activeAmc, loading } = useServicesOps();
      return { loading, to: '/services-biz/amc', value: amc.count, alert: amc.week > 0, hint: tr('30 din me · {{activeAmc}} chaalu', { activeAmc }) };
    },
  },
  {
    id: 'services-job-due', label: tr('Jobs ka baqi'), icon: HandCoins, tone: 'danger', sensitive: true,
    useValue: () => {
      const { work, loading } = useServicesOps();
      const { cost } = useMasked();
      return { loading, to: '/services-biz/jobs', value: cost(work.due), hint: tr('chaalu jobs par') };
    },
  },
];

export function useServicesAttention(): AttentionItem[] {
  const { work, amc, techs, quotes } = useServicesOps();
  const items: AttentionItem[] = [];

  if (work.urgent.length) items.push({ icon: Zap, level: 'danger', text: tr('{{count}} urgent / emergency job khuli hai — foran banda bhejein', { count: work.urgent.length }), to: '/services-biz/dispatch', cta: tr('Dispatch') });
  if (work.late.length) items.push({ icon: AlertTriangle, level: 'warning', text: tr('{{count}} job ka waqt guzar gaya, kaam shuru nahi hua — customer ko update dein', { count: work.late.length }), to: '/services-biz/jobs', cta: tr('Jobs dekhein') });
  if (work.unassigned && techs.free) items.push({ icon: Users, level: 'warning', text: tr('{{unassigned}} job par abhi koi technician nahi laga — {{free}} free hain', { unassigned: work.unassigned, free: techs.free }), to: '/services-biz/dispatch', cta: tr('Banda lagayein') });
  if (amc.week) items.push({ icon: ShieldCheck, level: 'warning', text: tr('{{week}} AMC contract agle 7 din me khatam — renewal ki baat karein', { week: amc.week }), to: '/services-biz/amc', cta: tr('Renew karein') });
  if (amc.count > amc.week) items.push({ icon: ShieldCheck, level: 'info', text: tr('{{value}} AMC contract 30 din me renew hone hain', { value: amc.count - amc.week }), to: '/services-biz/amc', cta: tr('AMC dekhein') });
  if (quotes) items.push({ icon: FileText, level: 'info', text: tr('{{quotes}} quote customer ke jawab ka intezar kar rahe hain — follow up karein', { quotes }), to: '/services-biz/quotes', cta: tr('Quotes') });
  return items;
}

/** Open jobs: urgent first, then late, then by booked time. */
export function ServicesJobs() {
  const { work } = useServicesOps();
  const { cost, costHidden } = useMasked();
  return (
    <WidgetCard
      title={tr('Chaalu jobs')}
      icon={Briefcase}
      description={work.due > 0 && !costHidden ? tr('{{active}} jobs · {{due}} baqi', { active: work.active, due: formatPKR(work.due) }) : tr('{{active}} jobs · {{today}} aaj', { active: work.active, today: work.today })}
      to="/services-biz/jobs"
      flush
    >
      <RowList empty={tr('Koi job khuli nahi')} emptyIcon={CheckCircle2}>
        {work.list.map((j) => {
          const urgent = j.priority === 'EMERGENCY' || j.priority === 'URGENT';
          const late = work.late.includes(j);
          const s = JOB_STATUS[j.status];
          const left = Math.max(Number(j.totalCharge || 0) - Number(j.paidAmount || 0), 0);
          return (
            <ListRow
              key={j.id}
              to={`/services-biz/jobs/${j.id}`}
              leading={<IconBubble icon={urgent ? Zap : late ? Clock : Wrench} tone={urgent ? 'danger' : late ? 'warning' : 'neutral'} />}
              title={<span className="inline-flex items-center gap-1.5">{j.customerName || j.jobNumber}{urgent && <Badge variant="danger" size="xs">{j.priority === 'EMERGENCY' ? tr('Emergency') : tr('Urgent')}</Badge>}</span>}
              meta={`${j.serviceName} · ${when(j.scheduledStart ?? undefined)}${j.area ? ` · ${j.area}` : ''}`}
              value={s ? <Badge variant={late ? 'warning' : s.variant} size="xs">{late ? tr('Late') : s.label}</Badge> : undefined}
              valueHint={left > 0 ? <span className="text-slate-500">{cost(left)}</span> : undefined}
            />
          );
        })}
      </RowList>
    </WidgetCard>
  );
}

/** Field team right now. */
export function ServicesField() {
  const { work, techs, rating } = useServicesOps();
  return (
    <WidgetCard title={tr('Field ka haal')} icon={Truck} description={tr('{{free}} technician free · {{total}} kul', { free: techs.free, total: techs.total })} to="/services-biz/dispatch" linkLabel={tr('Live map')}>
      <div className="grid grid-cols-2 gap-2">
        <MetricTile icon={Users} tone="neutral" label={tr('Banda nahi laga')} value={work.unassigned} hint={tr('Technician lagana hai')} to="/services-biz/dispatch" alert={work.unassigned > 0 && techs.free > 0} />
        <MetricTile icon={Truck} tone="info" label={tr('Raaste me')} value={work.onTheWay} hint={tr('Nikal chuke')} />
        <MetricTile icon={MapPin} tone="warning" label={tr('Site par')} value={work.onSite} hint={tr('Kaam jaari')} />
        <MetricTile
          icon={Star}
          tone="success"
          label={tr('Rating')}
          value={rating.avgRating ? rating.avgRating.toFixed(1) : '—'}
          hint={rating.ratedJobs ? tr('{{ratedJobs}} jobs, 30 din', { ratedJobs: rating.ratedJobs }) : tr('Abhi koi rating nahi')}
        />
      </div>
    </WidgetCard>
  );
}

/** AMC contracts ending in the next 30 days. */
export function ServicesAmc() {
  const { amc } = useServicesOps();
  const { sales, salesHidden } = useMasked();
  return (
    <WidgetCard
      title={tr('AMC renewal')}
      icon={ShieldCheck}
      description={amc.value > 0 && !salesHidden ? tr('{{formatPKR}} ke contract 30 din me', { formatPKR: formatPKR(amc.value) }) : tr('{{count}} contract 30 din me', { count: amc.count })}
      to="/services-biz/amc"
      flush
    >
      <RowList empty={tr('Agle 30 din me koi AMC khatam nahi ho raha')} emptyIcon={ShieldCheck}>
        {amc.list.map((a) => (
          <ListRow
            key={a.id}
            leading={<IconBubble icon={ShieldCheck} tone={a.daysLeft <= 7 ? 'danger' : 'warning'} />}
            title={a.customerName}
            meta={<span><span className="font-mono">{a.amcNumber}</span> · {a.type.toLowerCase()} · {sales(a.contractValue)}</span>}
            value={<Badge variant={a.daysLeft <= 7 ? 'danger' : 'warning'} size="xs">{a.daysLeft <= 0 ? tr('Aaj') : tr('{{daysLeft}} din', { daysLeft: a.daysLeft })}</Badge>}
          />
        ))}
      </RowList>
    </WidgetCard>
  );
}

/** Technicians ranked by completed-job billing over 30 days. */
export function ServicesTopTechnicians() {
  const { topTechnicians } = useServicesOps();
  const { sales } = useMasked();
  return (
    <WidgetCard title={tr('Behtareen technician')} icon={UserCheck} description={tr('Pichle 30 din, mukammal jobs ke hisaab se')} to="/services-biz/technicians" flush>
      <RowList empty={tr('Abhi koi job mukammal nahi hui')} emptyIcon={Users}>
        {topTechnicians.map((t, i) => (
          <ListRow
            key={t.technicianId}
            leading={<IconBubble icon={UserCheck} tone={i === 0 ? 'warning' : 'neutral'} />}
            title={t.name?.fullName ?? tr('Technician')}
            meta={tr('{{completedJobs}} jobs', { completedJobs: t.completedJobs })}
            value={sales(t.revenue)}
          />
        ))}
      </RowList>
    </WidgetCard>
  );
}
