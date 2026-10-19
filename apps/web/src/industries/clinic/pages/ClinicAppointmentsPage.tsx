/**
 * Appointments: every visit with server-side search, period, doctor,
 * status and "fees baqi" filters, paging, CSV and print; fees can be taken
 * from the row. The Follow-up tab lists patients the doctors asked to come
 * back, with a one-click booking.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  CalendarCheck, CalendarClock, CalendarPlus, CheckCircle2, Download, GraduationCap, Printer, Repeat, Stethoscope, Timer, Wallet, XCircle,
} from 'lucide-react';
import {
  Badge, Button, DateRangeMenu, FilterBar, FilterChip, FilterMenu, KpiCard, KpiRow, PageHero, PageShell, SearchField, Skeleton,
  Table, TBody, THead, Td, Th, Tr, ViewTabs, heroButton, heroIconButton, heroPrimaryButton, resolveRange, type DateRangeValue,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { downloadCsv } from '@core/lib/csv';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { appointmentsApi, type Appointment, type AppointmentStatus, type FeePayment } from '../api/appointments.api';
import { doctorsApi } from '../api/doctors.api';
import { FeePayModal } from '../components/FeePayModal';
import { ListCard, ListFailed, ListLoading, Pager } from '../components/ListBits';
import { useDebounced, usePageKeys } from '../hooks/usePageKeys';
import { APT_STATUS, PAY_STATUS, apiError, dayBounds, dayKey, drName, patientLine, r2, shortDate, timeOf, visitLabel } from '../lib/meta';
import { printTokenSlip } from '../lib/print';

type Tab = 'list' | 'followups';
const LIMIT = 30;
const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'Sab' }, { value: 'OPEN', label: 'Abhi baqi (line)' }, { value: 'COMPLETED', label: 'Mukammal' },
  { value: 'CANCELLED', label: 'Cancel' }, { value: 'NO_SHOW', label: 'Nahi aaye' },
];

function periodOf(v: DateRangeValue) {
  const r = resolveRange(v, 0);
  if (!r) return {};
  return { from: r.from === 'all' ? undefined : dayBounds(r.from).from, to: dayBounds(r.to).to };
}

function FollowUps() {
  const [days, setDays] = useState<'7' | '30' | 'past'>('7');
  const range = days === 'past'
    ? { from: dayBounds(dayKey(new Date(Date.now() - 30 * 86_400_000))).from, to: dayBounds(dayKey(new Date(Date.now() - 86_400_000))).to }
    : { from: dayBounds(dayKey()).from, to: dayBounds(dayKey(new Date(Date.now() + Number(days) * 86_400_000))).to };
  const q = useQuery({ queryKey: ['clinic-followups', range.from, range.to], queryFn: () => appointmentsApi.followUps(range.from, range.to) });
  const rows = q.data ?? [];
  const open = rows.filter((r) => !r.bookedAppointmentId);
  return (
    <ListCard>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <p className="text-[0.875rem] text-slate-600"><b className="text-slate-900">{open.length}</b> ne abhi booking nahi ki · {rows.length - open.length} booked</p>
        <FilterMenu icon={CalendarClock} label="Kab" value={days} onChange={setDays} align="right"
          options={[{ value: '7', label: 'Agle 7 din' }, { value: '30', label: 'Agle 30 din' }, { value: 'past', label: 'Guzar gaye (30 din)' }]} />
      </div>
      {q.isLoading ? <ListLoading /> : q.isError ? <ListFailed onRetry={() => q.refetch()} /> : rows.length === 0 ? (
        <p className="px-6 py-14 text-center text-[0.875rem] text-slate-500">Is waqt me koi follow-up nahi. Doctor checkup me "Dobara kab aayein" likhe to yahan aata hai.</p>
      ) : (
        <Table minWidth="48rem">
          <THead><Tr><Th>Tareekh</Th><Th>Mareez</Th><Th>Doctor</Th><Th>Diagnosis</Th><Th align="right">Booking</Th></Tr></THead>
          <TBody>
            {rows.map((f) => (
              <Tr key={f.id}>
                <Td className="whitespace-nowrap font-semibold text-slate-900">{shortDate(f.followUpDate)}</Td>
                <Td><Link to={`/clinic/patients/${f.patientId}`} className="font-semibold text-slate-900 hover:text-brand-700">{patientLine(f.patient)}</Link><p className="text-[0.75rem] text-slate-500">{f.patient?.mrn}{f.patient?.phonePrimary && ` · ${f.patient.phonePrimary}`}</p></Td>
                <Td>{drName(f.doctor)}</Td>
                <Td className="max-w-xs truncate">{f.finalDiagnosis || f.provisionalDiagnosis || f.followUpAdvice || '—'}</Td>
                <Td align="right">
                  {f.bookedAppointmentId
                    ? <Link to={`/clinic/appointments/${f.bookedAppointmentId}`}><Badge variant="success">Booked {shortDate(f.bookedFor)}</Badge></Link>
                    : <Link to={`/clinic/appointments/new?patient=${f.patientId}&doctor=${f.doctorId}`} className="inline-flex h-8 items-center gap-1 rounded-lg bg-brand-600 px-2.5 text-[0.75rem] font-semibold text-white hover:bg-brand-700"><CalendarPlus className="h-3.5 w-3.5" />Book</Link>}
                </Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      )}
    </ListCard>
  );
}

export default function ClinicAppointmentsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const guide = usePageGuide();
  const { sales: money } = useMasked();
  const canBill = usePermission(PERMISSIONS.POS_USE);
  const searchRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>('list');
  const [search, setSearch] = useState('');
  const [range, setRange] = useState<DateRangeValue>({ preset: 'today', custom: { from: '', to: '' } });
  const [doctorId, setDoctorId] = useState('');
  const [status, setStatus] = useState('all');
  const [due, setDue] = useState(false);
  const [page, setPage] = useState(1);
  const [paying, setPaying] = useState<Appointment | null>(null);
  const q = useDebounced(search.trim());
  usePageKeys(searchRef, { n: () => navigate('/clinic/appointments/new'), f: () => setTab((t) => (t === 'list' ? 'followups' : 'list')) });
  useEffect(() => { setPage(1); }, [q, range, doctorId, status, due]);

  const { data: doctors = [] } = useQuery({ queryKey: ['clinic-doctors', 'all'], queryFn: () => doctorsApi.list() });
  const params = useMemo(() => ({
    ...periodOf(range), search: q || undefined, doctorId: doctorId || undefined, status: status === 'all' ? undefined : status,
    paymentStatus: due ? 'DUE' : undefined, limit: LIMIT,
  }), [range, q, doctorId, status, due]);
  const list = useQuery({
    queryKey: ['clinic-appointments', 'page', params, page],
    queryFn: () => appointmentsApi.page({ ...params, page }),
    placeholderData: (p) => p,
    refetchInterval: 60_000,
    enabled: tab === 'list',
  });
  const data = list.data;
  const by = data?.summary.byStatus ?? {};
  const count = (...s: AppointmentStatus[]) => s.reduce((n, k) => n + (by[k] ?? 0), 0);

  const pay = useMutation({
    mutationFn: (body: FeePayment) => appointmentsApi.addPayment(paying!.id, body),
    onSuccess: (res) => {
      toast.success(`Bill ${res.sale.saleNumber} ban gaya`);
      printTokenSlip(res, paying!.patient ? { ...paying!.patient } : null, paying!.doctor, res.sale);
      setPaying(null);
      qc.invalidateQueries({ queryKey: ['clinic-appointments'] });
    },
    onError: (e) => toast.error(apiError(e, 'Bill nahi bana')),
  });

  const exportCsv = async () => {
    try {
      const all = await appointmentsApi.page({ ...params, page: 1, limit: 200 });
      if (!all.items.length) { toast.error('Koi appointment nahi'); return; }
      downloadCsv('appointments.csv', [
        ['Tareekh', 'Waqt', 'Token', 'Number', 'Mareez', 'MR', 'Phone', 'Doctor', 'Visit', 'Status', 'Fees', 'Bill bana', 'Baqi'],
        ...all.items.map((a) => [shortDate(a.scheduledStart), timeOf(a.scheduledStart), a.tokenNumber, a.appointmentNumber, a.patient?.fullName, a.patient?.mrn, a.patient?.phonePrimary,
          drName(a.doctor), visitLabel(a.visitType), APT_STATUS[a.status].label, a.total, a.paidAmount, r2(Math.max(a.total - a.paidAmount, 0))]),
      ]);
    } catch (e) { toast.error(apiError(e, 'File nahi bani')); }
  };

  const chips = [
    doctorId && <FilterChip key="d" onRemove={() => setDoctorId('')}>{drName(doctors.find((d) => d.id === doctorId))}</FilterChip>,
    status !== 'all' && <FilterChip key="s" onRemove={() => setStatus('all')}>{STATUS_OPTIONS.find((s) => s.value === status)?.label}</FilterChip>,
    due && <FilterChip key="p" onRemove={() => setDue(false)}>Fees baqi</FilterChip>,
    q && <FilterChip key="q" onRemove={() => setSearch('')}>"{q}"</FilterChip>,
  ].filter(Boolean);

  return (
    <PageShell className="print:space-y-2">
      {guide.isOpen && (
        <PageGuide title="Appointments — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: CalendarPlus, color: '#2563eb', title: 'Naya token', text: 'N dabayein ya "Naya token" — reception page par mareez, doctor aur fees ek jagah.' },
            { icon: Wallet, color: '#d97706', title: 'Fees baqi', text: '"Fees baqi" card dabayein — jin ki fees ka bill nahi bana. Row ke Rs button se foran lein.' },
            { icon: Repeat, color: '#16a34a', title: 'Follow-up', text: 'F dabayein — doctor ne jin ko dobara bulaya, un ki list; "Book" se seedha token.' },
            { icon: Download, color: '#64748b', title: 'CSV aur print', text: 'Jo filter laga hai wohi list file me ya kaghaz par.' },
          ]}
          shortcuts={[['/', 'search'], ['N', 'naya token'], ['F', 'follow-up'], ['G', 'guide']]} />
      )}
      {paying && (
        <FeePayModal title={`Fees — ${paying.patient?.fullName ?? paying.appointmentNumber}`} due={r2(paying.total - paying.paidAmount)} busy={pay.isPending}
          description={`Token ${paying.tokenNumber ?? '-'} · ${drName(paying.doctor)} · baqi ${money(r2(paying.total - paying.paidAmount))}`}
          onClose={() => setPaying(null)} onPay={(b) => pay.mutate(b)} />
      )}

      <PageHero title="Appointments" chip={<><CalendarCheck />{data?.total ?? 0}</>} busy={list.isFetching && !list.isLoading} loading={list.isLoading && tab === 'list'}
        meta="Har visit, token aur fees"
        actions={<>
          <button type="button" onClick={() => void exportCsv()} className={heroButton}><Download className="h-4 w-4" /><span className="hidden sm:inline">CSV</span></button>
          <button type="button" onClick={() => window.print()} className={heroButton}><Printer className="h-4 w-4" /><span className="hidden sm:inline">Print</span></button>
          <Link to="/clinic/queue" className={heroButton}><Timer className="h-4 w-4" /><span className="hidden sm:inline">Live line</span></Link>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          <Link to="/clinic/appointments/new" className={heroPrimaryButton}><CalendarPlus className="h-4 w-4" />Naya token</Link>
        </>}
        stats={[
          { label: 'Fees (is filter me)', value: money(data?.summary.fees ?? 0) },
          { label: 'Bill ban gaya', value: money(data?.summary.billed ?? 0) },
          { label: 'Baqi', value: money(data?.summary.due ?? 0) },
        ]} />

      <KpiRow>
        {list.isLoading ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : (
          <>
            <KpiCard icon={CalendarCheck} color="#2563eb" label="Kul" value={data?.total ?? 0} onClick={() => { setStatus('all'); setDue(false); }} active={status === 'all' && !due} />
            <KpiCard icon={Timer} color="#d97706" label="Line me" value={count('SCHEDULED', 'CONFIRMED', 'RESCHEDULED', 'ARRIVED', 'IN_CONSULTATION')} hint="Booked, intezar, doctor ke paas" onClick={() => setStatus('OPEN')} active={status === 'OPEN'} />
            <KpiCard icon={CheckCircle2} color="#16a34a" label="Mukammal" value={count('COMPLETED')} onClick={() => setStatus('COMPLETED')} active={status === 'COMPLETED'} />
            <KpiCard icon={XCircle} color="#e11d48" label="Cancel / nahi aaye" value={count('CANCELLED', 'NO_SHOW')} onClick={() => setStatus('CANCELLED')} active={status === 'CANCELLED'} />
            <KpiCard icon={Wallet} color="#b45309" label="Fees baqi" value={money(data?.summary.due ?? 0)} onClick={() => setDue((v) => !v)} active={due} />
          </>
        )}
      </KpiRow>

      <FilterBar
        search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Mareez ka naam, phone, MR, appointment number ya shikayat…" />}
        chips={chips.length ? <>{chips}</> : undefined}
        onClear={() => { setSearch(''); setDoctorId(''); setStatus('all'); setDue(false); }}>
        <DateRangeMenu value={range} onChange={setRange} startHour={0} defaultPreset="today" />
        <FilterMenu icon={Stethoscope} label="Doctor" value={doctorId || 'all'} active={!!doctorId} onChange={(v) => setDoctorId(v === 'all' ? '' : v)}
          options={[{ value: 'all', label: 'Sab doctors' }, ...doctors.map((d) => ({ value: d.id, label: drName(d) }))]} />
        <FilterMenu icon={CalendarClock} label="Status" value={status} active={status !== 'all'} onChange={setStatus} options={STATUS_OPTIONS} align="right" />
      </FilterBar>

      <ViewTabs<Tab> value={tab} onChange={setTab} hint="F dabayein: follow-up"
        tabs={[{ id: 'list', label: 'Appointments', icon: CalendarCheck, count: data?.total ?? null }, { id: 'followups', label: 'Follow-up', icon: Repeat }]} />

      {tab === 'followups' ? <FollowUps /> : (
        <ListCard>
          {list.isLoading ? <ListLoading /> : list.isError ? <ListFailed onRetry={() => list.refetch()} /> : !data?.items.length ? (
            <div className="flex flex-col items-center px-6 py-16 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700"><CalendarCheck className="h-7 w-7" /></span>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">{chips.length ? 'Is filter me koi appointment nahi' : 'Is waqt me koi appointment nahi'}</h3>
              <p className="mt-1 text-[0.875rem] text-slate-500">Reception se mareez ko token dein — yahan foran aa jata hai.</p>
              <Button className="mt-4" onClick={() => navigate('/clinic/appointments/new')} leftIcon={<CalendarPlus className="h-4 w-4" />}>Naya token</Button>
            </div>
          ) : (
            <>
              <Table minWidth="60rem">
                <THead><Tr><Th>Waqt / token</Th><Th>Mareez</Th><Th>Doctor</Th><Th>Status</Th><Th align="right">Fees</Th><Th align="right" /></Tr></THead>
                <TBody>
                  {data.items.map((a) => {
                    const left = r2(a.total - a.paidAmount);
                    const pay = a.total > 0 && a.status !== 'CANCELLED' && a.status !== 'NO_SHOW' ? PAY_STATUS[a.paymentStatus] : null;
                    return (
                      <Tr key={a.id} interactive onClick={() => navigate(`/clinic/appointments/${a.id}`)}>
                        <Td className="whitespace-nowrap">
                          <p className="font-semibold text-slate-900">{shortDate(a.scheduledStart)} · {timeOf(a.scheduledStart)}</p>
                          <p className="text-[0.75rem] text-slate-500">Token {a.tokenNumber ?? '-'} · {a.appointmentNumber}{a.isEmergency && <span className="ml-1 font-semibold text-rose-600">Emergency</span>}</p>
                        </Td>
                        <Td>
                          <p className="font-semibold text-slate-900">{patientLine(a.patient)}</p>
                          <p className="max-w-xs truncate text-[0.75rem] text-slate-500">{a.patient?.mrn}{a.chiefComplaint && ` · ${a.chiefComplaint}`}</p>
                        </Td>
                        <Td><p>{drName(a.doctor)}</p><p className="text-[0.75rem] text-slate-500">{visitLabel(a.visitType)}</p></Td>
                        <Td><Badge variant={APT_STATUS[a.status].variant} dot>{APT_STATUS[a.status].label}</Badge></Td>
                        <Td align="right">
                          <p className="font-semibold">{money(a.total)}</p>
                          {pay && <Badge size="xs" variant={pay.variant}>{left > 0 ? `${money(left)} baqi` : pay.label}</Badge>}
                        </Td>
                        <Td align="right" onClick={(e) => e.stopPropagation()}>
                          {canBill && left > 0 && a.status !== 'CANCELLED' && a.status !== 'NO_SHOW' && (
                            <Button size="sm" variant="secondary" leftIcon={<Wallet className="h-4 w-4" />} onClick={() => setPaying(a)}>Fees</Button>
                          )}
                        </Td>
                      </Tr>
                    );
                  })}
                </TBody>
              </Table>
              <Pager page={page} total={data.total} limit={LIMIT} onPage={setPage} />
            </>
          )}
        </ListCard>
      )}
    </PageShell>
  );
}
