/** Clinic-only dashboard widgets. */

import { AlertTriangle, CalendarClock, CalendarDays, Clock, HandCoins, Stethoscope, Syringe, TestTube, Timer, UserCog, Video, Zap } from 'lucide-react';
import { Avatar, Badge } from '@/design-system/components';
import { IconBubble, ListRow, RowList, useMasked, WidgetCard, type KpiDef } from '@modules/dashboard/engine';
import type { AttentionItem } from '@modules/dashboard/widgets';
import { cn } from '@core/lib/cn';
import type { AppointmentStatus } from '../api/appointments.api';
import { useClinicOps } from './useClinicOps';
import { t } from '@core/i18n';

const STATUS: Partial<Record<AppointmentStatus, { label: string; variant: 'default' | 'info' | 'warning' | 'success' }>> = {
  SCHEDULED: { label: t('Booked'), variant: 'default' },
  CONFIRMED: { label: t('Confirm'), variant: 'default' },
  ARRIVED: { label: t('Aa gaye'), variant: 'info' },
  IN_CONSULTATION: { label: t('Doctor ke paas'), variant: 'warning' },
};

const time = (iso: string) => new Intl.DateTimeFormat('en-PK', { hour: 'numeric', minute: '2-digit' }).format(new Date(iso));

/** Clinic headline numbers, offered next to the common ones. */
export const clinicKpis: KpiDef[] = [
  {
    id: 'clinic-appointments', label: t('Aaj ke appointment'), icon: CalendarDays, tone: 'brand',
    useValue: () => {
      const { today, loading } = useClinicOps();
      return { loading, to: '/clinic/appointments', value: today.total, hint: t('{{done}} ho gaye · {{booked}} baqi', { done: today.done, booked: today.booked }) };
    },
  },
  {
    id: 'clinic-waiting', label: t('Intezar me'), icon: Timer, tone: 'warning',
    useValue: () => {
      const { today, loading } = useClinicOps();
      return {
        loading, to: '/clinic/queue', value: today.waiting, alert: today.emergency > 0,
        hint: today.emergency > 0 ? t('{{emergency}} emergency!', { emergency: today.emergency }) : today.inRoom ? t('{{inRoom}} doctor ke paas', { inRoom: today.inRoom }) : t('line khaali'),
      };
    },
  },
  {
    id: 'clinic-labs', label: t('Lab test baqi'), icon: TestTube, tone: 'info',
    useValue: () => {
      const { pendingLabs, loading } = useClinicOps();
      return { loading, to: '/clinic/lab-orders', value: pendingLabs, hint: t('report aani hai') };
    },
  },
  {
    id: 'clinic-vaccines', label: t('Vaccine due'), icon: Syringe, tone: 'danger',
    useValue: () => {
      const { dueVaccines, loading } = useClinicOps();
      return { loading, to: '/clinic/vaccinations', value: dueVaccines, hint: t('agle 7 din'), alert: dueVaccines > 0 };
    },
  },
  {
    id: 'clinic-fees-due', label: t('Fees baqi'), icon: HandCoins, tone: 'danger', sensitive: true,
    useValue: () => {
      const { monthDue, today, loading } = useClinicOps();
      const { cost } = useMasked();
      return { loading, to: '/clinic/appointments', value: cost(monthDue), hint: today.unpaidCount ? t('aaj {{unpaidCount}} mareez ka bill baqi', { unpaidCount: today.unpaidCount }) : t('fees khata me, 30 din') };
    },
  },
];

export function useClinicAttention(): AttentionItem[] {
  const { today, pendingLabs, dueVaccines } = useClinicOps();
  const { cost } = useMasked();
  const items: AttentionItem[] = [];

  if (today.emergency) items.push({ icon: Zap, level: 'danger', text: t('{{emergency}} emergency mareez — foran dekhna hai', { emergency: today.emergency }), to: '/clinic/queue', cta: t('Line dekhein') });
  if (today.late) items.push({ icon: AlertTriangle, level: 'warning', text: t('{{late}} mareez apne waqt par nahi aaye — call kar ke pooch lein', { late: today.late }), to: '/clinic/appointments', cta: t('Appointments') });
  if (today.waiting >= 5) items.push({ icon: Timer, level: 'warning', text: t('{{waiting}} mareez intezar me baithe hain — line lambi ho rahi hai', { waiting: today.waiting }), to: '/clinic/queue', cta: t('Line dekhein') });
  if (today.unpaidCount) items.push({ icon: HandCoins, level: 'warning', text: t('{{unpaidCount}} mareez ki fees poori nahi aayi ({{unpaidAmount}})', { unpaidCount: today.unpaidCount, unpaidAmount: cost(today.unpaidAmount) }), to: '/clinic/appointments', cta: t('Fees lein') });
  if (dueVaccines) items.push({ icon: Syringe, level: 'info', text: t('{{dueVaccines}} vaccine agle 7 din me lagni hai — family ko yaad dila dein', { dueVaccines }), to: '/clinic/vaccinations', cta: t('Vaccines') });
  if (pendingLabs) items.push({ icon: TestTube, level: 'info', text: t('{{pendingLabs}} lab test ki report abhi baqi hai', { pendingLabs }), to: '/clinic/lab-orders', cta: t('Lab orders') });
  if (today.waiting > 0 && today.waiting < 5) items.push({ icon: Clock, level: 'info', text: t('{{waiting}} mareez intezar me', { waiting: today.waiting }), to: '/clinic/queue', cta: t('Dekhein') });
  return items;
}

/** Today's appointment flow: booked → arrived → with doctor → done. */
export function ClinicToday() {
  const { today } = useClinicOps();
  const pct = today.total > 0 ? Math.round((today.done / today.total) * 100) : 0;
  return (
    <WidgetCard title={t('Aaj ke appointment')} icon={CalendarDays} description={today.total ? t('{{total}} mareez · {{pct}}% ho gaye', { total: today.total, pct }) : t('Aaj koi appointment nahi')} to="/clinic/appointments">
      {today.total === 0 ? (
        <div className="flex items-center gap-3">
          <IconBubble icon={CalendarClock} />
          <p className="text-[0.8125rem] text-slate-600">{t('Naya appointment banayein — mareez, doctor aur waqt sab yahan nazar aayega.')}</p>
        </div>
      ) : (
        <>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${pct}%` }} />
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
            {([
              [t('Booked'), today.booked, 'text-slate-900'],
              [t('Intezar'), today.waiting, 'text-amber-700'],
              [t('Doctor ke paas'), today.inRoom, 'text-brand-700'],
              [t('Ho gaye'), today.done, 'text-success-700'],
            ] as const).map(([label, n, color]) => (
              <div key={label} className="rounded-lg bg-slate-50 py-2.5">
                <dd className={cn('text-xl font-bold tabular-nums', color)}>{n}</dd>
                <dt className="truncate px-1 text-[0.75rem] text-slate-500">{label}</dt>
              </div>
            ))}
          </dl>
          {today.noShow > 0 && <p className="mt-3 text-[0.75rem] text-slate-500">{t('{{noShow}} mareez nahi aaye (no-show)', { noShow: today.noShow })}</p>}
        </>
      )}
    </WidgetCard>
  );
}

/** Live queue: emergencies first, then by slot time. */
export function ClinicQueue() {
  const { today } = useClinicOps();
  return (
    <WidgetCard title={t('Aaj ki line')} icon={Timer} description={today.waiting ? t('{{waiting}} intezar me', { waiting: today.waiting }) : t('Aane wale mareez')} to="/clinic/queue" flush>
      <RowList empty={t('Koi mareez line me nahi')} emptyIcon={Timer}>
        {today.queue.map((a) => {
          const s = STATUS[a.status];
          return (
            <ListRow
              key={a.id}
              to={`/clinic/appointments/${a.id}`}
              leading={
                <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[0.75rem] font-bold tabular-nums', a.isEmergency ? 'bg-rose-50 text-rose-700' : 'bg-brand-50 text-brand-700')}>
                  #{a.tokenNumber ?? '–'}
                </span>
              }
              title={
                <span className="inline-flex items-center gap-1.5">
                  {a.patient?.fullName ?? a.appointmentNumber}
                  {a.isEmergency && <Badge variant="danger" size="xs">{t('Emergency')}</Badge>}
                  {a.isTelemedicine && <Video className="h-3.5 w-3.5 text-slate-400" />}
                </span>
              }
              meta={`${time(a.scheduledStart)}${a.doctor?.fullName ? ` · Dr. ${a.doctor.fullName}` : ''}`}
              value={s ? <Badge variant={s.variant} size="xs">{s.label}</Badge> : undefined}
            />
          );
        })}
      </RowList>
    </WidgetCard>
  );
}

/** Each doctor's load today. */
export function ClinicDoctors() {
  const { doctors, totalDoctors } = useClinicOps();
  return (
    <WidgetCard title={t('Doctors aaj')} icon={UserCog} description={doctors.length ? t('{{count}} doctor ke paas mareez', { count: doctors.length }) : t('{{totalDoctors}} doctor', { totalDoctors })} to="/clinic/doctors" flush>
      <RowList empty={t('Aaj kisi doctor ka appointment nahi')} emptyIcon={Stethoscope}>
        {doctors.slice(0, 6).map((d) => (
          <ListRow
            key={d.id}
            leading={<Avatar name={d.name} url={d.photoUrl} size={36} />}
            title={t('Dr. {{name}}', { name: d.name })}
            meta={t('{{done}}/{{total}} dekh liye', { done: d.done, total: d.total })}
            value={d.inRoom
              ? <Badge variant="warning" size="xs">{t('Mareez ke saath')}</Badge>
              : d.waiting > 0 ? <Badge variant="info" size="xs">{t('{{waiting}} baqi', { waiting: d.waiting })}</Badge> : <Badge variant="success" size="xs">{t('Free')}</Badge>}
          />
        ))}
      </RowList>
    </WidgetCard>
  );
}

/** Doctors ranked by billed consultations over 30 days. */
export function ClinicTopDoctors() {
  const { topDoctors } = useClinicOps();
  const { sales } = useMasked();
  return (
    <WidgetCard title={t('Behtareen doctors')} icon={Stethoscope} description={t('Pichle 30 din, fees ke hisaab se')} to="/clinic/doctors" flush>
      <RowList empty={t('Abhi koi consultation mukammal nahi hui')} emptyIcon={UserCog}>
        {topDoctors.map((d, i) => (
          <ListRow
            key={d.doctorId}
            leading={<IconBubble icon={UserCog} tone={i === 0 ? 'warning' : 'neutral'} />}
            title={`${d.doctor?.title ? `${d.doctor.title} ` : 'Dr. '}${d.doctor?.fullName ?? ''}`}
            meta={d.doctor?.specialties?.[0]?.replace(/_/g, ' ').toLowerCase()}
            value={sales(d.revenue)}
            valueHint={<span className="text-slate-500">{t('{{consultations}} visits', { consultations: d.consultations })}</span>}
          />
        ))}
      </RowList>
    </WidgetCard>
  );
}
