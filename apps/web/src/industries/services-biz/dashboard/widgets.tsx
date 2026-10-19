/** Service-business dashboard widgets. */

import { AlertTriangle, Briefcase, CheckCircle2, Clock, FileText, HandCoins, MapPin, ShieldCheck, Star, Truck, UserCheck, Users, Wrench, Zap } from 'lucide-react';
import { Badge } from '@/design-system/components';
import { IconBubble, ListRow, MetricTile, RowList, useMasked, WidgetCard, type KpiDef } from '@modules/dashboard/engine';
import type { AttentionItem } from '@modules/dashboard/widgets';
import { formatPKR } from '@core/lib/format';
import type { JobStatus } from '../api/jobs.api';
import { useServicesOps } from './useServicesOps';

const JOB_STATUS: Partial<Record<JobStatus, { label: string; variant: 'default' | 'info' | 'warning' | 'success' }>> = {
  SCHEDULED: { label: 'Booked', variant: 'default' },
  ASSIGNED: { label: 'Banda laga', variant: 'info' },
  DISPATCHED: { label: 'Nikal gaya', variant: 'info' },
  EN_ROUTE: { label: 'Raaste me', variant: 'info' },
  ARRIVED: { label: 'Pohanch gaya', variant: 'warning' },
  IN_PROGRESS: { label: 'Kaam jaari', variant: 'warning' },
};

const when = (iso?: string) => (iso ? new Intl.DateTimeFormat('en-PK', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(iso)) : 'Waqt tay nahi');

/** Service headline numbers, offered next to the common ones. */
export const servicesKpis: KpiDef[] = [
  {
    id: 'services-jobs', label: 'Chaalu jobs', icon: Briefcase, tone: 'brand',
    useValue: () => {
      const { work, loading } = useServicesOps();
      return { loading, to: '/services-biz/jobs', value: work.active, hint: `${work.today} aaj · ${work.onSite} site par` };
    },
  },
  {
    id: 'services-urgent', label: 'Urgent / late', icon: Zap, tone: 'danger',
    useValue: () => {
      const { work, loading } = useServicesOps();
      return {
        loading, to: '/services-biz/jobs', value: work.urgent.length + work.late.length, alert: work.urgent.length > 0,
        hint: `${work.urgent.length} urgent · ${work.late.length} late`,
      };
    },
  },
  {
    id: 'services-techs', label: 'Technician free', icon: UserCheck, tone: 'success',
    useValue: () => {
      const { techs, loading } = useServicesOps();
      return { loading, to: '/services-biz/technicians', value: `${techs.free}/${techs.total}`, hint: 'abhi khaali' };
    },
  },
  {
    id: 'services-amc', label: 'AMC renewal', icon: ShieldCheck, tone: 'warning',
    useValue: () => {
      const { amc, activeAmc, loading } = useServicesOps();
      return { loading, to: '/services-biz/amc', value: amc.count, alert: amc.week > 0, hint: `30 din me · ${activeAmc} chaalu` };
    },
  },
  {
    id: 'services-job-due', label: 'Jobs ka baqi', icon: HandCoins, tone: 'danger', sensitive: true,
    useValue: () => {
      const { work, loading } = useServicesOps();
      const { cost } = useMasked();
      return { loading, to: '/services-biz/jobs', value: cost(work.due), hint: 'chaalu jobs par' };
    },
  },
];

export function useServicesAttention(): AttentionItem[] {
  const { work, amc, techs, quotes } = useServicesOps();
  const items: AttentionItem[] = [];

  if (work.urgent.length) items.push({ icon: Zap, level: 'danger', text: `${work.urgent.length} urgent / emergency job khuli hai — foran banda bhejein`, to: '/services-biz/dispatch', cta: 'Dispatch' });
  if (work.late.length) items.push({ icon: AlertTriangle, level: 'warning', text: `${work.late.length} job ka waqt guzar gaya, kaam shuru nahi hua — customer ko update dein`, to: '/services-biz/jobs', cta: 'Jobs dekhein' });
  if (work.unassigned && techs.free) items.push({ icon: Users, level: 'warning', text: `${work.unassigned} job par abhi koi technician nahi laga — ${techs.free} free hain`, to: '/services-biz/dispatch', cta: 'Banda lagayein' });
  if (amc.week) items.push({ icon: ShieldCheck, level: 'warning', text: `${amc.week} AMC contract agle 7 din me khatam — renewal ki baat karein`, to: '/services-biz/amc', cta: 'Renew karein' });
  if (amc.count > amc.week) items.push({ icon: ShieldCheck, level: 'info', text: `${amc.count - amc.week} AMC contract 30 din me renew hone hain`, to: '/services-biz/amc', cta: 'AMC dekhein' });
  if (quotes) items.push({ icon: FileText, level: 'info', text: `${quotes} quote customer ke jawab ka intezar kar rahe hain — follow up karein`, to: '/services-biz/quotes', cta: 'Quotes' });
  return items;
}

/** Open jobs: urgent first, then late, then by booked time. */
export function ServicesJobs() {
  const { work } = useServicesOps();
  const { cost, costHidden } = useMasked();
  return (
    <WidgetCard
      title="Chaalu jobs"
      icon={Briefcase}
      description={work.due > 0 && !costHidden ? `${work.active} jobs · ${formatPKR(work.due)} baqi` : `${work.active} jobs · ${work.today} aaj`}
      to="/services-biz/jobs"
      flush
    >
      <RowList empty="Koi job khuli nahi" emptyIcon={CheckCircle2}>
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
              title={<span className="inline-flex items-center gap-1.5">{j.customerName || j.jobNumber}{urgent && <Badge variant="danger" size="xs">{j.priority === 'EMERGENCY' ? 'Emergency' : 'Urgent'}</Badge>}</span>}
              meta={`${j.serviceName} · ${when(j.scheduledStart ?? undefined)}${j.area ? ` · ${j.area}` : ''}`}
              value={s ? <Badge variant={late ? 'warning' : s.variant} size="xs">{late ? 'Late' : s.label}</Badge> : undefined}
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
    <WidgetCard title="Field ka haal" icon={Truck} description={`${techs.free} technician free · ${techs.total} kul`} to="/services-biz/dispatch" linkLabel="Live map">
      <div className="grid grid-cols-2 gap-2">
        <MetricTile icon={Users} tone="neutral" label="Banda nahi laga" value={work.unassigned} hint="Technician lagana hai" to="/services-biz/dispatch" alert={work.unassigned > 0 && techs.free > 0} />
        <MetricTile icon={Truck} tone="info" label="Raaste me" value={work.onTheWay} hint="Nikal chuke" />
        <MetricTile icon={MapPin} tone="warning" label="Site par" value={work.onSite} hint="Kaam jaari" />
        <MetricTile
          icon={Star}
          tone="success"
          label="Rating"
          value={rating.avgRating ? rating.avgRating.toFixed(1) : '—'}
          hint={rating.ratedJobs ? `${rating.ratedJobs} jobs, 30 din` : 'Abhi koi rating nahi'}
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
      title="AMC renewal"
      icon={ShieldCheck}
      description={amc.value > 0 && !salesHidden ? `${formatPKR(amc.value)} ke contract 30 din me` : `${amc.count} contract 30 din me`}
      to="/services-biz/amc"
      flush
    >
      <RowList empty="Agle 30 din me koi AMC khatam nahi ho raha" emptyIcon={ShieldCheck}>
        {amc.list.map((a) => (
          <ListRow
            key={a.id}
            leading={<IconBubble icon={ShieldCheck} tone={a.daysLeft <= 7 ? 'danger' : 'warning'} />}
            title={a.customerName}
            meta={<span><span className="font-mono">{a.amcNumber}</span> · {a.type.toLowerCase()} · {sales(a.contractValue)}</span>}
            value={<Badge variant={a.daysLeft <= 7 ? 'danger' : 'warning'} size="xs">{a.daysLeft <= 0 ? 'Aaj' : `${a.daysLeft} din`}</Badge>}
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
    <WidgetCard title="Behtareen technician" icon={UserCheck} description="Pichle 30 din, mukammal jobs ke hisaab se" to="/services-biz/technicians" flush>
      <RowList empty="Abhi koi job mukammal nahi hui" emptyIcon={Users}>
        {topTechnicians.map((t, i) => (
          <ListRow
            key={t.technicianId}
            leading={<IconBubble icon={UserCheck} tone={i === 0 ? 'warning' : 'neutral'} />}
            title={t.name?.fullName ?? 'Technician'}
            meta={`${t.completedJobs} jobs`}
            value={sales(t.revenue)}
          />
        ))}
      </RowList>
    </WidgetCard>
  );
}
