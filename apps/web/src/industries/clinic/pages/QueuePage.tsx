/**
 * Live line for today: waiting, with the doctor, done. Emergencies stay on
 * top, then token order. Reception marks arrival, the doctor calls the next
 * token and opens the visit. "Screen" shows the current token per doctor in
 * large type for the waiting-room TV.
 */

import { useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { BellRing, CalendarPlus, CheckCircle2, DoorOpen, GraduationCap, Maximize2, Siren, Stethoscope, Timer, UserCheck, UserX, Wallet } from 'lucide-react';
import { Badge, Button, FilterMenu, KpiCard, KpiRow, Modal, PageHero, PageShell, Skeleton, heroButton, heroIconButton, heroPrimaryButton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { cn } from '@core/lib/cn';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { appointmentsApi, type AppointmentStatus } from '../api/appointments.api';
import { doctorsApi } from '../api/doctors.api';
import { ListCard, ListFailed } from '../components/ListBits';
import { APT_STATUS, apiError, dayKey, drName, patientLine, r2, timeOf } from '../lib/meta';

type Row = Awaited<ReturnType<typeof appointmentsApi.queue>>[number];
const WAITING: AppointmentStatus[] = ['SCHEDULED', 'CONFIRMED', 'RESCHEDULED', 'ARRIVED'];

function Column({ title, icon: Icon, tone, rows, children }: { title: string; icon: typeof Timer; tone: string; rows: number; children: ReactNode }) {
  return (
    <ListCard>
      <header className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
        <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', tone)}><Icon className="h-4 w-4" /></span>
        <h2 className="flex-1 text-[0.9375rem] font-semibold text-slate-900">{title}</h2>
        <span className="rounded-full bg-slate-100 px-2 text-[0.75rem] font-semibold tabular-nums text-slate-600">{rows}</span>
      </header>
      <ul className="divide-y divide-slate-100">{children}</ul>
    </ListCard>
  );
}

export default function QueuePage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const guide = usePageGuide();
  const { sales: money } = useMasked();
  const [doctorId, setDoctorId] = useState('');
  const [screen, setScreen] = useState(false);
  const today = dayKey();

  const { data: doctors = [] } = useQuery({ queryKey: ['clinic-doctors', 'active'], queryFn: () => doctorsApi.list({ active: 'true' }) });
  const q = useQuery({ queryKey: ['clinic-queue', doctorId, today], queryFn: () => appointmentsApi.queue(doctorId || undefined, new Date().toISOString()), refetchInterval: 20_000 });
  const rows = q.data ?? [];

  const status = useMutation({
    mutationFn: ({ a, s }: { a: Row; s: AppointmentStatus }) => appointmentsApi.updateStatus(a.id, s),
    onSuccess: (_r, { a, s }) => {
      qc.invalidateQueries({ queryKey: ['clinic-queue'] });
      qc.invalidateQueries({ queryKey: ['clinic-appointments'] });
      if (s === 'IN_CONSULTATION') navigate(`/clinic/appointments/${a.id}`);
    },
    onError: (e) => toast.error(apiError(e, 'Status nahi badla')),
  });

  const waiting = rows.filter((r) => WAITING.includes(r.status));
  const arrived = waiting.filter((r) => r.status === 'ARRIVED');
  const inRoom = rows.filter((r) => r.status === 'IN_CONSULTATION');
  const done = rows.filter((r) => r.status === 'COMPLETED');
  const noShow = rows.filter((r) => r.status === 'NO_SHOW');
  const feesDue = rows.filter((r) => r.status !== 'NO_SHOW' && r.total - r.paidAmount > 0.009);

  /** Next token: arrived first (emergency first, the server orders them), then booked. */
  const callNext = (docId?: string) => {
    const pool = (docId ? arrived.filter((r) => r.doctorId === docId) : arrived);
    const next = pool[0] ?? (docId ? waiting.filter((r) => r.doctorId === docId) : waiting)[0];
    if (!next) { toast.info('Line khaali hai'); return; }
    status.mutate({ a: next, s: 'IN_CONSULTATION' });
  };

  const perDoctor = useMemo(() => doctors.map((d) => ({
    d,
    now: inRoom.find((r) => r.doctorId === d.id),
    next: arrived.filter((r) => r.doctorId === d.id).slice(0, 3),
  })).filter((x) => !doctorId || x.d.id === doctorId), [doctors, inRoom, arrived, doctorId]);

  const card = (a: Row, actions: ReactNode) => (
    <li key={a.id} className={cn('flex items-start gap-3 px-4 py-3', a.isEmergency && 'bg-rose-50/60')}>
      <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg font-bold tabular-nums', a.isEmergency ? 'bg-rose-600 text-white' : 'bg-slate-900 text-white')}>{a.tokenNumber ?? '-'}</span>
      <div className="min-w-0 flex-1">
        <Link to={`/clinic/appointments/${a.id}`} className="block truncate text-[0.9375rem] font-semibold text-slate-900 hover:text-brand-700">{patientLine(a.patient)}</Link>
        <p className="truncate text-[0.75rem] text-slate-500">{drName(a.doctor)} · {timeOf(a.arrivedAt ?? a.scheduledStart)}{a.chiefComplaint && ` · ${a.chiefComplaint}`}</p>
        <div className="mt-1 flex flex-wrap gap-1">
          {a.isEmergency && <Badge size="xs" variant="danger"><Siren className="mr-0.5 h-3 w-3" />Emergency</Badge>}
          {a.status !== 'ARRIVED' && WAITING.includes(a.status) && <Badge size="xs" variant="info">Abhi nahi aaya</Badge>}
          {a.vitals?.bpSystolic && <Badge size="xs" variant="default">BP {a.vitals.bpSystolic}/{a.vitals.bpDiastolic}</Badge>}
          {a.total - a.paidAmount > 0.009 && <Badge size="xs" variant="warning"><Wallet className="mr-0.5 h-3 w-3" />{money(r2(a.total - a.paidAmount))} baqi</Badge>}
          {(a.patient?.allergies?.length ?? 0) > 0 && <Badge size="xs" variant="danger">Allergy</Badge>}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">{actions}</div>
    </li>
  );

  return (
    <PageShell>
      {guide.isOpen && (
        <PageGuide title="Live line — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: UserCheck, color: '#d97706', title: 'Aa gaya', text: 'Booked mareez clinic pohanche to "Aa gaya" — wo intezar wali line me aata hai.' },
            { icon: BellRing, color: '#2563eb', title: 'Agla token', text: '"Agla" dabane se line ka pehla mareez (emergency pehle) doctor ke paas jata hai aur visit khulti hai.' },
            { icon: CheckCircle2, color: '#16a34a', title: 'Mukammal', text: 'Doctor checkup save kar ke "Mukammal" kare — mareez ki visit ginti me aati hai.' },
            { icon: Maximize2, color: '#64748b', title: 'Screen', text: 'Intezar gah ki TV par har doctor ka chalta token bara dikhayein.' },
          ]}
          shortcuts={[['G', 'guide']]} />
      )}
      {screen && (
        <Modal open onClose={() => setScreen(false)} size="full" title="Chalta token">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {perDoctor.map(({ d, now, next }) => (
              <div key={d.id} className="rounded-3xl bg-slate-900 p-6 text-center text-white">
                <p className="text-xl font-semibold">{drName(d)}</p>
                <p className="mt-4 text-[0.875rem] uppercase tracking-widest text-white/60">Ab andar</p>
                <p className="text-[6rem] font-black leading-none tabular-nums">{now?.tokenNumber ?? '—'}</p>
                <p className="mt-4 text-[0.875rem] text-white/60">Agle: <span className="text-2xl font-bold tabular-nums text-white">{next.map((n) => n.tokenNumber).join(' · ') || '—'}</span></p>
              </div>
            ))}
          </div>
        </Modal>
      )}

      <PageHero title="Live line" chip={<><Timer />{arrived.length} intezar me</>} busy={q.isFetching && !q.isLoading} loading={q.isLoading}
        meta="Har 20 second me taaza"
        actions={<>
          <FilterMenu icon={Stethoscope} label="Doctor" value={doctorId || 'all'} active={!!doctorId} onChange={(v) => setDoctorId(v === 'all' ? '' : v)}
            options={[{ value: 'all', label: 'Sab doctors' }, ...doctors.map((d) => ({ value: d.id, label: drName(d) }))]} />
          <button type="button" onClick={() => setScreen(true)} className={heroButton}><Maximize2 className="h-4 w-4" /><span className="hidden sm:inline">Screen</span></button>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          <Link to="/clinic/appointments/new" className={heroPrimaryButton}><CalendarPlus className="h-4 w-4" />Naya token</Link>
        </>}
        stats={[
          { label: 'Aaj kul', value: String(rows.length - noShow.length) },
          { label: 'Doctor ke paas', value: String(inRoom.length) },
          { label: 'Mukammal', value: String(done.length) },
        ]} />

      <KpiRow cols={4}>
        {q.isLoading ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : (
          <>
            <KpiCard icon={Timer} color="#d97706" label="Intezar me" value={arrived.length} hint={`${waiting.length - arrived.length} abhi nahi aaye`} />
            <KpiCard icon={DoorOpen} color="#2563eb" label="Doctor ke paas" value={inRoom.length} />
            <KpiCard icon={CheckCircle2} color="#16a34a" label="Mukammal" value={done.length} />
            <KpiCard icon={Wallet} color="#b45309" label="Fees baqi" value={feesDue.length} hint={money(r2(feesDue.reduce((s, r) => s + r.total - r.paidAmount, 0)))} />
          </>
        )}
      </KpiRow>

      {q.isError ? <ListCard><ListFailed onRetry={() => q.refetch()} /></ListCard> : (
        <div className="grid gap-4 lg:grid-cols-3">
          <Column title="Intezar me" icon={Timer} tone="bg-amber-50 text-amber-700" rows={waiting.length}>
            <li className="px-4 py-2.5"><Button fullWidth leftIcon={<BellRing className="h-4 w-4" />} onClick={() => callNext(doctorId || undefined)} loading={status.isPending}>Agla token andar bhejein</Button></li>
            {waiting.length === 0 && <li className="px-4 py-8 text-center text-[0.8125rem] text-slate-500">Line khaali hai</li>}
            {waiting.map((a) => card(a, <>
              {a.status !== 'ARRIVED' && <Button size="xs" variant="secondary" leftIcon={<UserCheck className="h-3.5 w-3.5" />} onClick={() => status.mutate({ a, s: 'ARRIVED' })}>Aa gaya</Button>}
              <Button size="xs" leftIcon={<DoorOpen className="h-3.5 w-3.5" />} onClick={() => status.mutate({ a, s: 'IN_CONSULTATION' })}>Andar</Button>
              {a.paidAmount <= 0 && <Button size="xs" variant="ghost" leftIcon={<UserX className="h-3.5 w-3.5" />} onClick={() => status.mutate({ a, s: 'NO_SHOW' })}>Nahi aaya</Button>}
            </>))}
          </Column>
          <Column title="Doctor ke paas" icon={DoorOpen} tone="bg-brand-50 text-brand-700" rows={inRoom.length}>
            {inRoom.length === 0 && <li className="px-4 py-8 text-center text-[0.8125rem] text-slate-500">Abhi koi andar nahi</li>}
            {inRoom.map((a) => card(a, <>
              <Button size="xs" variant="secondary" onClick={() => navigate(`/clinic/appointments/${a.id}`)}>Visit</Button>
              <Button size="xs" variant="success" leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />} onClick={() => status.mutate({ a, s: 'COMPLETED' })}>Mukammal</Button>
            </>))}
          </Column>
          <Column title="Mukammal" icon={CheckCircle2} tone="bg-emerald-50 text-emerald-700" rows={done.length}>
            {done.length === 0 && <li className="px-4 py-8 text-center text-[0.8125rem] text-slate-500">Aaj abhi koi mukammal nahi</li>}
            {done.map((a) => card(a, <Badge size="xs" variant={APT_STATUS[a.status].variant}>{timeOf(a.consultationEnd)}</Badge>))}
          </Column>
        </div>
      )}
    </PageShell>
  );
}

