/**
 * Dispatch board: jobs that still need a technician (urgent and earliest
 * first), every technician with what is in their hands today, and the
 * jobs on the road or on site. A job is given to someone from here in two
 * clicks.
 *
 * Keys: / search · R refresh · G guide.
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, CalendarClock, Car, Clock, GraduationCap, MapPin, RefreshCw, Truck, UserCheck, Users, Wrench } from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { Button, FilterBar, Kbd, KpiCard, KpiRow, PageHero, PageShell, SearchField, Skeleton, ViewTabs, heroButton, heroIconButton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { useShopParam } from '@core/stores/auth.store';
import { jobsApi, type ServiceJob } from '../api/jobs.api';
import { techniciansApi } from '../api/technicians.api';
import { AssignModal } from '../components/AssignModal';
import { BOOKED, JOB_KEY, TECH_KEY, WORKING, apiError, dateTime, itemName, placeOf, priorityOf, statusOf, techStatusOf } from '../components/meta';

type Tab = 'board' | 'field';
const URGENT = ['URGENT', 'EMERGENCY'];

export default function DispatchPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const shopId = useShopParam();
  const canManage = usePermission(PERMISSIONS.SERVICE_JOBS_MANAGE);
  const searchRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>('board');
  const [search, setSearch] = useState('');
  const [assigning, setAssigning] = useState<ServiceJob | null>(null);

  const jobsQ = useQuery({ queryKey: [JOB_KEY, 'dispatch', shopId], queryFn: () => jobsApi.page({ view: 'open', shopId: shopId || undefined, limit: 200, sort: 'due' }), refetchInterval: 30_000 });
  const techQ = useQuery({ queryKey: [TECH_KEY], queryFn: () => techniciansApi.list(), refetchInterval: 30_000 });
  const jobs = jobsQ.data?.items ?? [];
  const techs = techQ.data ?? [];
  const match = (j: ServiceJob) => {
    const w = search.trim().toLowerCase();
    return !w || `${j.jobNumber} ${j.serviceName} ${j.customerName ?? ''} ${j.customerPhone ?? ''} ${j.area ?? ''} ${j.city ?? ''}`.toLowerCase().includes(w);
  };
  const waiting = useMemo(() => jobs.filter((j) => !j.primaryTechnicianId && BOOKED.includes(j.status) && match(j))
    .sort((a, b) => Number(URGENT.includes(b.priority)) - Number(URGENT.includes(a.priority)) || (a.scheduledStart ?? a.createdAt).localeCompare(b.scheduledStart ?? b.createdAt)),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [jobs, search]);
  const field = jobs.filter((j) => WORKING.includes(j.status) && match(j));
  const byTech = (staffId: string) => jobs.filter((j) => j.primaryTechnicianId === staffId);

  const assign = useMutation({
    mutationFn: (v: { id: string; primary: string; helpers: string[] }) => jobsApi.assign(v.id, v.primary, v.helpers),
    onSuccess: (j) => { toast.success(`${j.jobNumber} — ${j.technicianName ?? 'technician'} ko de di`); [JOB_KEY, TECH_KEY].forEach((k) => qc.invalidateQueries({ queryKey: [k] })); setAssigning(null); },
    onError: (e) => toast.error(apiError(e, 'Nahi hua')),
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key.toLowerCase() === 'r') { void jobsQ.refetch(); void techQ.refetch(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [jobsQ, techQ]);

  const free = techs.filter((t) => t.status === 'AVAILABLE').length;
  const late = jobs.filter((j) => j.isLate).length;

  return (
    <PageShell>
      <PageHero
        title="Dispatch"
        chip={<><Truck /> Kaam baantein</>}
        meta="Kis job ko kaun jayega — urgent pehle, phir jo pehle waqt ki hai"
        busy={jobsQ.isFetching && !jobsQ.isLoading}
        loading={jobsQ.isLoading}
        actions={<>
          <button type="button" onClick={() => { void jobsQ.refetch(); void techQ.refetch(); }} title="Refresh (R)" className={heroButton}><RefreshCw className="h-4 w-4" /><span className="hidden sm:inline">Refresh</span></button>
          <Link to="/services-biz/technicians" className={heroButton}><Users className="h-4 w-4" /><span className="hidden sm:inline">Technicians</span></Link>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
        </>}
        stats={[
          { label: 'Technician baqi', value: waiting.length },
          { label: 'Free technician', value: `${free}/${techs.length}` },
          { label: 'Field me', value: field.length },
        ]}
      />

      <KpiRow cols={4}>
        {jobsQ.isLoading ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={CalendarClock} color={waiting.length ? '#0284c7' : '#64748b'} label="Banda lagana hai" value={waiting.length} hint={`${waiting.filter((j) => URGENT.includes(j.priority)).length} urgent`} onClick={() => setTab('board')} active={tab === 'board'} />
          <KpiCard icon={Car} color="#7c3aed" label="Raste me / site par" value={field.length} onClick={() => setTab('field')} active={tab === 'field'} />
          <KpiCard icon={Users} color="#16a34a" label="Free" value={free} hint="Abhi kaam de sakte hain" />
          <KpiCard icon={AlertTriangle} color={late ? '#e11d48' : '#64748b'} label="Late" value={late} hint="Waqt guzar gaya" />
        </>}
      </KpiRow>

      <FilterBar search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Job #, customer, area…" label="Search" />} />
      <ViewTabs value={tab} onChange={setTab} hint={<><Kbd>/</Kbd> search · <Kbd>R</Kbd> refresh</>}
        tabs={[{ id: 'board', label: 'Board', icon: UserCheck, count: waiting.length }, { id: 'field', label: 'Field me', icon: Car, count: field.length }]} />

      {tab === 'board' ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <section className="space-y-2">
            <h3 className="px-1 text-[0.8125rem] font-semibold text-slate-700">Technician ka intezar</h3>
            {jobsQ.isLoading ? <Skeleton className="h-48 rounded-3xl" /> : !waiting.length ? (
              <div className="rounded-3xl bg-white px-6 py-10 text-center ring-1 ring-slate-200/80"><UserCheck className="mx-auto h-8 w-8 text-emerald-400" /><p className="mt-2 font-semibold text-slate-900">Har job par banda laga hai</p></div>
            ) : (
              <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
                {waiting.map((j) => <JobLine key={j.id} j={j} action={canManage ? <Button size="sm" onClick={() => setAssigning(j)} leftIcon={<UserCheck className="h-3.5 w-3.5" />}>Lagayein</Button> : undefined} />)}
              </ul>
            )}
          </section>
          <section className="space-y-2">
            <h3 className="px-1 text-[0.8125rem] font-semibold text-slate-700">Team aaj</h3>
            {techQ.isLoading ? <Skeleton className="h-48 rounded-3xl" /> : !techs.length ? (
              <div className="rounded-3xl bg-white px-6 py-10 text-center ring-1 ring-slate-200/80"><p className="font-semibold text-slate-900">Koi technician nahi</p><Link to="/services-biz/technicians" className="mt-2 inline-block text-sm font-semibold text-brand-700 hover:underline">Technician banayein →</Link></div>
            ) : (
              <ul className="space-y-2">
                {techs.map((t) => {
                  const mine = byTech(t.staffId);
                  const s = techStatusOf(t.status);
                  return (
                    <li key={t.id} className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200/80">
                      <div className="flex items-center gap-2">
                        <span className="min-w-0 flex-1 truncate font-semibold text-slate-900">{t.staff?.fullName ?? 'Technician'}</span>
                        <span className="text-[0.75rem] text-slate-500">{mine.length} jobs</span>
                        <span className={cn('rounded-full px-2 py-0.5 text-[0.6875rem] font-medium ring-1', s.tone)}>{s.label}</span>
                      </div>
                      {mine.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {mine.slice(0, 4).map((j) => (
                            <li key={j.id}><Link to={`/services-biz/jobs/${j.id}`} className="flex items-center gap-2 rounded-lg bg-slate-50 px-2 py-1 text-[0.75rem] hover:bg-slate-100">
                              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: statusOf(j.status).color }} />
                              <span className="min-w-0 flex-1 truncate text-slate-700">{j.serviceName} — {placeOf(j)}</span>
                              <span className="shrink-0 text-slate-500">{j.scheduledStart ? dateTime(j.scheduledStart) : statusOf(j.status).label}</span>
                            </Link></li>
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      ) : !field.length ? (
        <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80"><Car className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-3 font-semibold text-slate-900">Abhi koi field me nahi</p></div>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
          {field.map((j) => <JobLine key={j.id} j={j} />)}
        </ul>
      )}

      {assigning && <AssignModal jobId={assigning.id} jobNumber={assigning.jobNumber} pending={assign.isPending} onAssign={(primary, helpers) => assign.mutate({ id: assigning.id, primary, helpers })} onClose={() => setAssigning(null)} />}

      {guide.isOpen && (
        <PageGuide title="Dispatch — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: CalendarClock, color: '#0284c7', title: 'Bayen taraf', text: 'Wo jobs jin par abhi koi technician nahi — urgent aur jaldi waqt wali upar.' },
            { icon: UserCheck, color: '#16a34a', title: 'Lagayein', text: '"Lagayein" dabayein — duty par, sahi hunar aur area wale technician upar aate hain, saath helper bhi chun sakte hain.' },
            { icon: Users, color: '#7c3aed', title: 'Dayen taraf', text: 'Har technician ke haath me aaj kya hai. Zyada kaam wale ko nayi job na dein.' },
            { icon: MapPin, color: '#ea580c', title: 'Field me', text: 'Raste me, pohanch gaye ya kaam chal raha — job khol kar halat badalte jayein.' },
          ]}
          shortcuts={[['/', 'dhoondein'], ['R', 'refresh'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}

function JobLine({ j, action }: { j: ServiceJob; action?: ReactNode }) {
  const st = statusOf(j.status);
  return (
    <li className="flex items-start gap-3 px-3 py-3 sm:px-4">
      <span className={cn('mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', URGENT.includes(j.priority) ? 'bg-rose-50 text-rose-600' : 'bg-sky-50 text-sky-600')}>
        {URGENT.includes(j.priority) ? <AlertTriangle className="h-4 w-4" /> : <Wrench className="h-4 w-4" />}
      </span>
      <Link to={`/services-biz/jobs/${j.id}`} className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="truncate font-semibold text-slate-900">{j.serviceName}</span>
          <span className={cn('rounded-full px-2 py-0.5 text-[0.6875rem] font-medium ring-1', st.tone)}>{st.label}</span>
          {j.priority !== 'NORMAL' && <span className={cn('rounded-full px-2 py-0.5 text-[0.6875rem] font-medium ring-1', priorityOf(j.priority).tone)}>{priorityOf(j.priority).label}</span>}
          <span className="font-mono text-[0.6875rem] text-slate-400">{j.jobNumber}</span>
        </div>
        <p className="mt-0.5 truncate text-[0.8125rem] text-slate-600">{[j.customerName, itemName(j)].filter(Boolean).join(' · ')} — {placeOf(j)}</p>
        <p className={cn('mt-0.5 inline-flex items-center gap-1 text-[0.75rem]', j.isLate ? 'font-semibold text-rose-700' : 'text-slate-500')}><Clock className="h-3 w-3" />{j.scheduledStart ? dateTime(j.scheduledStart) : 'Waqt tay nahi'}{j.technicianName ? ` · ${j.technicianName}` : ''}</p>
      </Link>
      {action}
    </li>
  );
}
