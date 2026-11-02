/** Auto parts and workshop dashboard widgets. */

import { AlertTriangle, Bell, Car, CheckCircle2, FileWarning, Package, UserCog, Wrench } from 'lucide-react';
import { Badge } from '@/design-system/components';
import { IconBubble, ListRow, RowList, useMasked, WidgetCard, type KpiDef } from '@modules/dashboard/engine';
import type { AttentionItem } from '@modules/dashboard/widgets';
import { cn } from '@core/lib/cn';
import { useAutoPartsOps } from './useAutoPartsOps';
import { t } from '@core/i18n';

/** Auto parts headline numbers, offered next to the common ones. */
export const autoPartsKpis: KpiDef[] = [
  {
    id: 'autoparts-jobs', label: t('Chalte job'), icon: Wrench, tone: 'brand',
    useValue: () => {
      const { board, jobs, loading } = useAutoPartsOps();
      return {
        loading, to: '/autoparts/jobs?view=working', value: board.activeJobs, alert: jobs.overdue.length > 0,
        hint: jobs.overdue.length ? t('{{count}} late!', { count: jobs.overdue.length }) : t('{{waitingParts}} parts ke intezar me', { waitingParts: board.waitingParts }),
      };
    },
  },
  {
    id: 'autoparts-ready', label: t('Gaari tayyar'), icon: CheckCircle2, tone: 'success',
    useValue: () => {
      const { board, loading } = useAutoPartsOps();
      return { loading, to: '/autoparts/jobs?view=ready', value: board.readyDelivery, hint: t('aaj {{deliveredCount}} di gayin', { deliveredCount: board.today.deliveredCount }) };
    },
  },
  {
    id: 'autoparts-parts-wait', label: t('Parts ka intezar'), icon: Package, tone: 'warning',
    useValue: () => {
      const { board, loading } = useAutoPartsOps();
      return { loading, to: '/autoparts/jobs?view=waiting', value: board.waitingParts, alert: board.waitingParts > 0, hint: t('job ruke hue') };
    },
  },
  {
    id: 'autoparts-reminders', label: t('Service reminder'), icon: Bell, tone: 'danger',
    useValue: () => {
      const { reminders, loading } = useAutoPartsOps();
      return {
        loading, to: '/autoparts/reminders', value: reminders.overdue.length, alert: reminders.overdue.length > 0,
        hint: t('{{count}} agle 30 din', { count: reminders.upcoming.length }),
      };
    },
  },
  {
    id: 'autoparts-workshop', label: t('Aaj workshop'), icon: Car, tone: 'info',
    useValue: () => {
      const { board, loading } = useAutoPartsOps();
      const { sales } = useMasked();
      return { loading, to: '/autoparts/jobs', value: sales(board.today.revenue), hint: t('{{deliveredCount}} job mukammal', { deliveredCount: board.today.deliveredCount }) };
    },
  },
];

export function useAutoPartsAttention(): AttentionItem[] {
  const { board, jobs, reminders } = useAutoPartsOps();
  const items: AttentionItem[] = [];
  if (jobs.overdue.length) items.push({ icon: AlertTriangle, level: 'danger', text: t('{{count}} gaari ka waada guzar gaya — customer ko batayein', { count: jobs.overdue.length }), to: '/autoparts/jobs?view=late', cta: t('Jobs dekhein') });
  if (board.waitingParts) items.push({ icon: Package, level: 'warning', text: t('{{waitingParts}} job parts ke intezar me ruke hain — parts mangwayein', { waitingParts: board.waitingParts }), to: '/autoparts/jobs?view=waiting', cta: t('Dekhein') });
  if (reminders.overdue.length) items.push({ icon: Bell, level: 'warning', text: t('{{count}} service reminder ki date guzar gayi — customer ko call karein', { count: reminders.overdue.length }), to: '/autoparts/reminders', cta: t('Reminders') });
  if (board.readyDelivery) items.push({ icon: CheckCircle2, level: 'info', text: t('{{readyDelivery}} gaari tayyar hai — customer ko bula lein', { readyDelivery: board.readyDelivery }), to: '/autoparts/jobs?view=ready', cta: t('Dekhein') });
  if (jobs.today.length) items.push({ icon: Wrench, level: 'info', text: t('{{count}} gaari aaj deni hai', { count: jobs.today.length }), to: '/autoparts/jobs', cta: t('Jobs') });
  if (reminders.papersTotal) items.push({ icon: FileWarning, level: 'neutral', text: t('{{papersTotal}} gaariyon ki insurance, token ya fitness 30 din me khatam — customer ko bata kar kaam lein', { papersTotal: reminders.papersTotal }), to: '/autoparts/vehicles', cta: t('Gaariyan') });
  return items;
}

export function AutoPartsWorkshop() {
  const { board, jobs } = useAutoPartsOps();
  const cells: Array<[string, number, string]> = [
    [t('Chal rahe'), board.activeJobs, 'text-slate-900'],
    [t('Parts intezar'), board.waitingParts, 'text-amber-700'],
    [t('Tayyar'), board.readyDelivery, 'text-success-700'],
  ];
  return (
    <WidgetCard
      title={t('Workshop board')}
      icon={Wrench}
      description={jobs.urgent ? t('{{urgent}} urgent job', { urgent: jobs.urgent }) : t('{{totalMechanics}} mechanic · {{totalVehicles}} gaariyan darj', { totalMechanics: board.totalMechanics, totalVehicles: board.totalVehicles })}
      to="/autoparts/jobs"
    >
      <dl className="grid grid-cols-3 gap-2 text-center">
        {cells.map(([label, n, color]) => (
          <div key={label} className="rounded-lg bg-slate-50 py-2.5">
            <dd className={cn('text-xl font-bold tabular-nums', color)}>{n}</dd>
            <dt className="text-[0.75rem] text-slate-500">{label}</dt>
          </div>
        ))}
      </dl>
      {jobs.overdue.length > 0 ? (
        <p className="mt-3 flex items-center gap-2 text-[0.8125rem] text-rose-700">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {' '}{t('{{count}} job waade ke waqt se late', { count: jobs.overdue.length })}
        </p>
      ) : (
        <p className="mt-3 text-[0.8125rem] text-slate-500">{t('30 din me {{jobCount}} job mukammal hue.', { jobCount: board.monthly.jobCount })}</p>
      )}
    </WidgetCard>
  );
}

export function AutoPartsJobs() {
  const { jobs } = useAutoPartsOps();
  const { sales } = useMasked();
  return (
    <WidgetCard
      title={t('Gaari kab deni hai')}
      icon={Car}
      description={jobs.overdue.length ? t('{{count}} late · {{count2}} aaj', { count: jobs.overdue.length, count2: jobs.today.length }) : t('{{count}} aaj deni hain', { count: jobs.today.length })}
      to="/autoparts/jobs"
      flush
    >
      <RowList empty={t('Koi job waade par baqi nahi')} emptyIcon={Car}>
        {jobs.list.map((j) => {
          const late = j.left !== null && j.left < 0;
          const soon = j.left !== null && j.left <= 24;
          const when = j.left === null ? '—' : late ? t('Late') : soon ? t('{{value}}h', { value: Math.max(Math.round(j.left), 1) }) : t('{{value}} din', { value: Math.round(j.left / 24) });
          const car = [j.makeName, j.modelName].filter(Boolean).join(' ');
          return (
            <ListRow
              key={j.id}
              to={`/autoparts/jobs/${j.id}`}
              leading={<IconBubble icon={Car} tone={late ? 'danger' : j.priority === 'URGENT' || j.priority === 'EMERGENCY' ? 'warning' : 'neutral'} />}
              title={j.registrationNumber || car || j.jobNumber}
              meta={<span>{car && j.registrationNumber ? `${car} · ` : ''}{j.customerName ?? ''}{j.total ? ` · ${sales(j.total)}` : ''}</span>}
              value={<Badge variant={late ? 'danger' : soon ? 'warning' : 'default'} size="xs">{when}</Badge>}
            />
          );
        })}
      </RowList>
    </WidgetCard>
  );
}

export function AutoPartsReminders() {
  const { reminders } = useAutoPartsOps();
  const p = reminders.papers;
  return (
    <WidgetCard
      title={t('Service reminder')}
      icon={Bell}
      description={reminders.overdue.length ? t('{{count}} guzar gaye · {{count2}} aane wale', { count: reminders.overdue.length, count2: reminders.upcoming.length }) : t('{{count}} agle 30 din me', { count: reminders.upcoming.length })}
      to="/autoparts/reminders"
      flush
    >
      <RowList empty={t('Koi reminder baqi nahi')} emptyIcon={Bell}>
        {[
          ...reminders.list.map((r) => {
            const late = r.left !== null && r.left < 0;
            return (
              <ListRow
                key={r.id}
                leading={<IconBubble icon={Bell} tone={late ? 'danger' : 'info'} />}
                title={r.title}
                meta={r.reminderType.replace(/_/g, ' ').toLowerCase()}
                value={<Badge variant={late ? 'danger' : 'default'} size="xs">{r.left === null ? '—' : late ? t('{{value}} din late', { value: -r.left }) : r.left === 0 ? t('Aaj') : t('{{left}} din', { left: r.left })}</Badge>}
              />
            );
          }),
          ...(reminders.papersTotal > 0 ? [
            <ListRow
              key="papers"
              to="/autoparts/vehicles"
              leading={<IconBubble icon={FileWarning} tone="warning" />}
              title={t('Kaghzat khatam ho rahe')}
              meta={t('Insurance {{insurance}} · Token {{tokenTax}} · Fitness {{fitness}}', { insurance: p.insurance, tokenTax: p.tokenTax, fitness: p.fitness })}
              value={reminders.papersTotal}
            />,
          ] : []),
        ]}
      </RowList>
    </WidgetCard>
  );
}

export function AutoPartsMechanics() {
  const { mechanics } = useAutoPartsOps();
  const { sales } = useMasked();
  return (
    <WidgetCard title={t('Mechanic ka kaam')} icon={UserCog} description={t('30 din me mukammal job aur bill')} to="/autoparts/mechanics" flush>
      <RowList empty={t('Abhi kisi mechanic ka job mukammal nahi hua')} emptyIcon={UserCog}>
        {mechanics.map((m, i) => (
          <ListRow
            key={m.mechanicId}
            leading={<IconBubble icon={UserCog} tone={i === 0 ? 'success' : 'neutral'} />}
            title={m.name || t('Mechanic')}
            meta={t('{{jobs}} job', { jobs: m.jobs })}
            value={sales(m.revenue)}
          />
        ))}
      </RowList>
    </WidgetCard>
  );
}
