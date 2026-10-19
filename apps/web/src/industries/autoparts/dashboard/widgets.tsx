/** Auto parts and workshop dashboard widgets. */

import { AlertTriangle, Bell, Car, CheckCircle2, FileWarning, Package, UserCog, Wrench } from 'lucide-react';
import { Badge } from '@/design-system/components';
import { IconBubble, ListRow, RowList, useMasked, WidgetCard, type KpiDef } from '@modules/dashboard/engine';
import type { AttentionItem } from '@modules/dashboard/widgets';
import { cn } from '@core/lib/cn';
import { useAutoPartsOps } from './useAutoPartsOps';

/** Auto parts headline numbers, offered next to the common ones. */
export const autoPartsKpis: KpiDef[] = [
  {
    id: 'autoparts-jobs', label: 'Chalte job', icon: Wrench, tone: 'brand',
    useValue: () => {
      const { board, jobs, loading } = useAutoPartsOps();
      return {
        loading, to: '/autoparts/jobs?view=working', value: board.activeJobs, alert: jobs.overdue.length > 0,
        hint: jobs.overdue.length ? `${jobs.overdue.length} late!` : `${board.waitingParts} parts ke intezar me`,
      };
    },
  },
  {
    id: 'autoparts-ready', label: 'Gaari tayyar', icon: CheckCircle2, tone: 'success',
    useValue: () => {
      const { board, loading } = useAutoPartsOps();
      return { loading, to: '/autoparts/jobs?view=ready', value: board.readyDelivery, hint: `aaj ${board.today.deliveredCount} di gayin` };
    },
  },
  {
    id: 'autoparts-parts-wait', label: 'Parts ka intezar', icon: Package, tone: 'warning',
    useValue: () => {
      const { board, loading } = useAutoPartsOps();
      return { loading, to: '/autoparts/jobs?view=waiting', value: board.waitingParts, alert: board.waitingParts > 0, hint: 'job ruke hue' };
    },
  },
  {
    id: 'autoparts-reminders', label: 'Service reminder', icon: Bell, tone: 'danger',
    useValue: () => {
      const { reminders, loading } = useAutoPartsOps();
      return {
        loading, to: '/autoparts/reminders', value: reminders.overdue.length, alert: reminders.overdue.length > 0,
        hint: `${reminders.upcoming.length} agle 30 din`,
      };
    },
  },
  {
    id: 'autoparts-workshop', label: 'Aaj workshop', icon: Car, tone: 'info',
    useValue: () => {
      const { board, loading } = useAutoPartsOps();
      const { sales } = useMasked();
      return { loading, to: '/autoparts/jobs', value: sales(board.today.revenue), hint: `${board.today.deliveredCount} job mukammal` };
    },
  },
];

export function useAutoPartsAttention(): AttentionItem[] {
  const { board, jobs, reminders } = useAutoPartsOps();
  const items: AttentionItem[] = [];
  if (jobs.overdue.length) items.push({ icon: AlertTriangle, level: 'danger', text: `${jobs.overdue.length} gaari ka waada guzar gaya — customer ko batayein`, to: '/autoparts/jobs?view=late', cta: 'Jobs dekhein' });
  if (board.waitingParts) items.push({ icon: Package, level: 'warning', text: `${board.waitingParts} job parts ke intezar me ruke hain — parts mangwayein`, to: '/autoparts/jobs?view=waiting', cta: 'Dekhein' });
  if (reminders.overdue.length) items.push({ icon: Bell, level: 'warning', text: `${reminders.overdue.length} service reminder ki date guzar gayi — customer ko call karein`, to: '/autoparts/reminders', cta: 'Reminders' });
  if (board.readyDelivery) items.push({ icon: CheckCircle2, level: 'info', text: `${board.readyDelivery} gaari tayyar hai — customer ko bula lein`, to: '/autoparts/jobs?view=ready', cta: 'Dekhein' });
  if (jobs.today.length) items.push({ icon: Wrench, level: 'info', text: `${jobs.today.length} gaari aaj deni hai`, to: '/autoparts/jobs', cta: 'Jobs' });
  if (reminders.papersTotal) items.push({ icon: FileWarning, level: 'neutral', text: `${reminders.papersTotal} gaariyon ki insurance, token ya fitness 30 din me khatam — customer ko bata kar kaam lein`, to: '/autoparts/vehicles', cta: 'Gaariyan' });
  return items;
}

export function AutoPartsWorkshop() {
  const { board, jobs } = useAutoPartsOps();
  const cells: Array<[string, number, string]> = [
    ['Chal rahe', board.activeJobs, 'text-slate-900'],
    ['Parts intezar', board.waitingParts, 'text-amber-700'],
    ['Tayyar', board.readyDelivery, 'text-success-700'],
  ];
  return (
    <WidgetCard
      title="Workshop board"
      icon={Wrench}
      description={jobs.urgent ? `${jobs.urgent} urgent job` : `${board.totalMechanics} mechanic · ${board.totalVehicles} gaariyan darj`}
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
          <AlertTriangle className="h-4 w-4 shrink-0" /> {jobs.overdue.length} job waade ke waqt se late
        </p>
      ) : (
        <p className="mt-3 text-[0.8125rem] text-slate-500">30 din me {board.monthly.jobCount} job mukammal hue.</p>
      )}
    </WidgetCard>
  );
}

export function AutoPartsJobs() {
  const { jobs } = useAutoPartsOps();
  const { sales } = useMasked();
  return (
    <WidgetCard
      title="Gaari kab deni hai"
      icon={Car}
      description={jobs.overdue.length ? `${jobs.overdue.length} late · ${jobs.today.length} aaj` : `${jobs.today.length} aaj deni hain`}
      to="/autoparts/jobs"
      flush
    >
      <RowList empty="Koi job waade par baqi nahi" emptyIcon={Car}>
        {jobs.list.map((j) => {
          const late = j.left !== null && j.left < 0;
          const soon = j.left !== null && j.left <= 24;
          const when = j.left === null ? '—' : late ? 'Late' : soon ? `${Math.max(Math.round(j.left), 1)}h` : `${Math.round(j.left / 24)} din`;
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
      title="Service reminder"
      icon={Bell}
      description={reminders.overdue.length ? `${reminders.overdue.length} guzar gaye · ${reminders.upcoming.length} aane wale` : `${reminders.upcoming.length} agle 30 din me`}
      to="/autoparts/reminders"
      flush
    >
      <RowList empty="Koi reminder baqi nahi" emptyIcon={Bell}>
        {[
          ...reminders.list.map((r) => {
            const late = r.left !== null && r.left < 0;
            return (
              <ListRow
                key={r.id}
                leading={<IconBubble icon={Bell} tone={late ? 'danger' : 'info'} />}
                title={r.title}
                meta={r.reminderType.replace(/_/g, ' ').toLowerCase()}
                value={<Badge variant={late ? 'danger' : 'default'} size="xs">{r.left === null ? '—' : late ? `${-r.left} din late` : r.left === 0 ? 'Aaj' : `${r.left} din`}</Badge>}
              />
            );
          }),
          ...(reminders.papersTotal > 0 ? [
            <ListRow
              key="papers"
              to="/autoparts/vehicles"
              leading={<IconBubble icon={FileWarning} tone="warning" />}
              title="Kaghzat khatam ho rahe"
              meta={`Insurance ${p.insurance} · Token ${p.tokenTax} · Fitness ${p.fitness}`}
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
    <WidgetCard title="Mechanic ka kaam" icon={UserCog} description="30 din me mukammal job aur bill" to="/autoparts/mechanics" flush>
      <RowList empty="Abhi kisi mechanic ka job mukammal nahi hua" emptyIcon={UserCog}>
        {mechanics.map((m, i) => (
          <ListRow
            key={m.mechanicId}
            leading={<IconBubble icon={UserCog} tone={i === 0 ? 'success' : 'neutral'} />}
            title={m.name || 'Mechanic'}
            meta={`${m.jobs} job`}
            value={sales(m.revenue)}
          />
        ))}
      </RowList>
    </WidgetCard>
  );
}
