/** Clinic-only dashboard widgets. */

import { AlertTriangle, CalendarClock, CalendarDays, Clock, HandCoins, Stethoscope, Syringe, TestTube, Timer, UserCog, Video, Zap } from 'lucide-react';
import { Avatar, Badge } from '@/design-system/components';
import { IconBubble, ListRow, RowList, useMasked, WidgetCard, type KpiDef } from '@modules/dashboard/engine';
import type { AttentionItem } from '@modules/dashboard/widgets';
import { cn } from '@core/lib/cn';
import type { AppointmentStatus } from '../api/appointments.api';
import { useClinicOps } from './useClinicOps';

const STATUS: Partial<Record<AppointmentStatus, { label: string; variant: 'default' | 'info' | 'warning' | 'success' }>> = {
  SCHEDULED: { label: 'Booked', variant: 'default' },
  CONFIRMED: { label: 'Confirm', variant: 'default' },
  ARRIVED: { label: 'Aa gaye', variant: 'info' },
  IN_CONSULTATION: { label: 'Doctor ke paas', variant: 'warning' },
};

const time = (iso: string) => new Intl.DateTimeFormat('en-PK', { hour: 'numeric', minute: '2-digit' }).format(new Date(iso));

/** Clinic headline numbers, offered next to the common ones. */
export const clinicKpis: KpiDef[] = [
  {
    id: 'clinic-appointments', label: 'Aaj ke appointment', icon: CalendarDays, tone: 'brand',
    useValue: () => {
      const { today, loading } = useClinicOps();
      return { loading, to: '/clinic/appointments', value: today.total, hint: `${today.done} ho gaye · ${today.booked} baqi` };
    },
  },
  {
    id: 'clinic-waiting', label: 'Intezar me', icon: Timer, tone: 'warning',
    useValue: () => {
      const { today, loading } = useClinicOps();
      return {
        loading, to: '/clinic/queue', value: today.waiting, alert: today.emergency > 0,
        hint: today.emergency > 0 ? `${today.emergency} emergency!` : today.inRoom ? `${today.inRoom} doctor ke paas` : 'line khaali',
      };
    },
  },
  {
    id: 'clinic-labs', label: 'Lab test baqi', icon: TestTube, tone: 'info',
    useValue: () => {
      const { pendingLabs, loading } = useClinicOps();
      return { loading, to: '/clinic/lab-orders', value: pendingLabs, hint: 'report aani hai' };
    },
  },
  {
    id: 'clinic-vaccines', label: 'Vaccine due', icon: Syringe, tone: 'danger',
    useValue: () => {
      const { dueVaccines, loading } = useClinicOps();
      return { loading, to: '/clinic/vaccinations', value: dueVaccines, hint: 'agle 7 din', alert: dueVaccines > 0 };
    },
  },
  {
    id: 'clinic-fees-due', label: 'Fees baqi', icon: HandCoins, tone: 'danger', sensitive: true,
    useValue: () => {
      const { monthDue, today, loading } = useClinicOps();
      const { cost } = useMasked();
      return { loading, to: '/clinic/appointments', value: cost(monthDue), hint: today.unpaidCount ? `aaj ${today.unpaidCount} mareez` : '30 din me' };
    },
  },
];

export function useClinicAttention(): AttentionItem[] {
  const { today, pendingLabs, dueVaccines } = useClinicOps();
  const { cost } = useMasked();
  const items: AttentionItem[] = [];

  if (today.emergency) items.push({ icon: Zap, level: 'danger', text: `${today.emergency} emergency mareez — foran dekhna hai`, to: '/clinic/queue', cta: 'Line dekhein' });
  if (today.late) items.push({ icon: AlertTriangle, level: 'warning', text: `${today.late} mareez apne waqt par nahi aaye — call kar ke pooch lein`, to: '/clinic/appointments', cta: 'Appointments' });
  if (today.waiting >= 5) items.push({ icon: Timer, level: 'warning', text: `${today.waiting} mareez intezar me baithe hain — line lambi ho rahi hai`, to: '/clinic/queue', cta: 'Line dekhein' });
  if (today.unpaidCount) items.push({ icon: HandCoins, level: 'warning', text: `${today.unpaidCount} mareez ki fees poori nahi aayi (${cost(today.unpaidAmount)})`, to: '/clinic/appointments', cta: 'Fees lein' });
  if (dueVaccines) items.push({ icon: Syringe, level: 'info', text: `${dueVaccines} vaccine agle 7 din me lagni hai — family ko yaad dila dein`, to: '/clinic/vaccinations', cta: 'Vaccines' });
  if (pendingLabs) items.push({ icon: TestTube, level: 'info', text: `${pendingLabs} lab test ki report abhi baqi hai`, to: '/clinic/lab-orders', cta: 'Lab orders' });
  if (today.waiting > 0 && today.waiting < 5) items.push({ icon: Clock, level: 'info', text: `${today.waiting} mareez intezar me`, to: '/clinic/queue', cta: 'Dekhein' });
  return items;
}

/** Today's appointment flow: booked → arrived → with doctor → done. */
export function ClinicToday() {
  const { today } = useClinicOps();
  const pct = today.total > 0 ? Math.round((today.done / today.total) * 100) : 0;
  return (
    <WidgetCard title="Aaj ke appointment" icon={CalendarDays} description={today.total ? `${today.total} mareez · ${pct}% ho gaye` : 'Aaj koi appointment nahi'} to="/clinic/appointments">
      {today.total === 0 ? (
        <div className="flex items-center gap-3">
          <IconBubble icon={CalendarClock} />
          <p className="text-[0.8125rem] text-slate-600">Naya appointment banayein — mareez, doctor aur waqt sab yahan nazar aayega.</p>
        </div>
      ) : (
        <>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${pct}%` }} />
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
            {([
              ['Booked', today.booked, 'text-slate-900'],
              ['Intezar', today.waiting, 'text-amber-700'],
              ['Doctor ke paas', today.inRoom, 'text-brand-700'],
              ['Ho gaye', today.done, 'text-success-700'],
            ] as const).map(([label, n, color]) => (
              <div key={label} className="rounded-lg bg-slate-50 py-2.5">
                <dd className={cn('text-xl font-bold tabular-nums', color)}>{n}</dd>
                <dt className="truncate px-1 text-[0.75rem] text-slate-500">{label}</dt>
              </div>
            ))}
          </dl>
          {today.noShow > 0 && <p className="mt-3 text-[0.75rem] text-slate-500">{today.noShow} mareez nahi aaye (no-show)</p>}
        </>
      )}
    </WidgetCard>
  );
}

/** Live queue: emergencies first, then by slot time. */
export function ClinicQueue() {
  const { today } = useClinicOps();
  return (
    <WidgetCard title="Aaj ki line" icon={Timer} description={today.waiting ? `${today.waiting} intezar me` : 'Aane wale mareez'} to="/clinic/queue" flush>
      <RowList empty="Koi mareez line me nahi" emptyIcon={Timer}>
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
                  {a.isEmergency && <Badge variant="danger" size="xs">Emergency</Badge>}
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
    <WidgetCard title="Doctors aaj" icon={UserCog} description={doctors.length ? `${doctors.length} doctor ke paas mareez` : `${totalDoctors} doctor`} to="/clinic/doctors" flush>
      <RowList empty="Aaj kisi doctor ka appointment nahi" emptyIcon={Stethoscope}>
        {doctors.slice(0, 6).map((d) => (
          <ListRow
            key={d.id}
            leading={<Avatar name={d.name} url={d.photoUrl} size={36} />}
            title={`Dr. ${d.name}`}
            meta={`${d.done}/${d.total} dekh liye`}
            value={d.inRoom
              ? <Badge variant="warning" size="xs">Mareez ke saath</Badge>
              : d.waiting > 0 ? <Badge variant="info" size="xs">{d.waiting} baqi</Badge> : <Badge variant="success" size="xs">Free</Badge>}
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
    <WidgetCard title="Behtareen doctors" icon={Stethoscope} description="Pichle 30 din, fees ke hisaab se" to="/clinic/doctors" flush>
      <RowList empty="Abhi koi consultation mukammal nahi hui" emptyIcon={UserCog}>
        {topDoctors.map((d, i) => (
          <ListRow
            key={d.doctorId}
            leading={<IconBubble icon={UserCog} tone={i === 0 ? 'warning' : 'neutral'} />}
            title={`${d.doctor?.title ? `${d.doctor.title} ` : 'Dr. '}${d.doctor?.fullName ?? ''}`}
            meta={d.doctor?.specialties?.[0]?.replace(/_/g, ' ').toLowerCase()}
            value={sales(d.revenue)}
            valueHint={<span className="text-slate-500">{d.consultations} visits</span>}
          />
        ))}
      </RowList>
    </WidgetCard>
  );
}
