/**
 * Customer vehicles: every vehicle that came to the workshop with its owner,
 * visits, money spent and paper dates. A vehicle opens its full service
 * history and reminders, and starts a new job in one click.
 *
 * Keys: N new vehicle · / search · G guide.
 */

import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowDownWideNarrow, Bell, Car, Download, FileWarning, Filter, GraduationCap, History, ListChecks, MessageCircle, Pencil, Plus, Power, Star, UserX, Wrench,
} from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import {
  Button, FilterBar, FilterChip, FilterMenu, Kbd, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Skeleton,
  heroButton, heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { downloadCsv } from '@core/lib/csv';
import { formatPKR } from '@core/lib/format';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { useAuthStore } from '@core/stores/auth.store';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { customerVehiclesApi, type CustomerVehicle, type VehicleInput, type VehicleSort, type VehicleView } from '../api/customer-vehicles.api';
import { serviceRemindersApi } from '../api/service-reminders.api';
import { VehicleFormModal } from '../components/VehicleFormModal';
import { REMINDER_KEY, VEHICLE_KEY, apiError, dayOnly, daysTo, jobTypeOf, km, statusOf, vehicleName, vehicleTypeOf, waLink } from '../components/meta';
import { t as tr } from '@core/i18n';

const VIEWS: Array<{ id: VehicleView; label: string; icon: typeof Car }> = [
  { id: 'all', label: tr('Sab gaariyan'), icon: ListChecks },
  { id: 'papers', label: tr('Kaghzat khatam hone wale'), icon: FileWarning },
  { id: 'regular', label: tr('Pakke customer (3+ dafa)'), icon: Star },
  { id: 'away', label: tr('4 mahine se nahi aaye'), icon: UserX },
  { id: 'inactive', label: tr('Band ki hui'), icon: Power },
];
const SORTS: Array<{ value: VehicleSort; label: string }> = [
  { value: 'recent', label: tr('Haal me aayi') }, { value: 'visits', label: tr('Zyada dafa aayi') }, { value: 'spent', label: tr('Zyada kharcha') }, { value: 'name', label: tr('Number se') },
];

/** Paper dates ending within 30 days (or already ended). */
function papers(v: CustomerVehicle) {
  return ([[tr('Insurance'), v.insuranceExpiry], [tr('Token'), v.tokenTaxExpiry], [tr('Fitness'), v.fitnessExpiry]] as Array<[string, string | undefined]>)
    .map(([label, d]) => ({ label, d, left: daysTo(d) }))
    .filter((x) => x.left !== null && x.left <= 30);
}

export default function CustomerVehiclesPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const canEdit = usePermission(PERMISSIONS.CUSTOMERS_EDIT);
  const canJob = usePermission(PERMISSIONS.SERVICE_JOBS_MANAGE);
  const { sales } = useMasked();
  const guide = usePageGuide();
  const searchRef = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<VehicleView>((params.get('view') as VehicleView) || 'all');
  const [sort, setSort] = useState<VehicleSort>('recent');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<CustomerVehicle | 'new' | null>(null);
  const openId = params.get('open');

  useEffect(() => { const t = setTimeout(() => setQuery(search.trim()), 250); return () => clearTimeout(t); }, [search]);
  useEffect(() => { setPage(1); }, [view, sort, query]);

  const q = { view, sort, search: query || undefined, page, limit: 40 };
  const listQ = useQuery({ queryKey: [VEHICLE_KEY, 'page', q], queryFn: () => customerVehiclesApi.page(q), placeholderData: (p) => p });
  const statsQ = useQuery({ queryKey: [VEHICLE_KEY, 'stats'], queryFn: () => customerVehiclesApi.stats() });
  const data = listQ.data;
  const s = statsQ.data;
  const filtered = !!query || view !== 'all';

  const save = useMutation({
    mutationFn: (v: VehicleInput) => (form && form !== 'new' ? customerVehiclesApi.update(form.id, v) : customerVehiclesApi.create(v)),
    onSuccess: (v) => {
      toast.success(form === 'new' ? tr('{{registrationNumber}} darj ho gayi', { registrationNumber: v.registrationNumber }) : tr('Gaari save ho gayi'));
      [VEHICLE_KEY, 'customers'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      setForm(null);
    },
    onError: (e) => toast.error(apiError(e, tr('Gaari save nahi hui'))),
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if ((e.key === 'n' || e.key === 'N') && canEdit) { e.preventDefault(); setForm('new'); }
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canEdit]);

  const exportCsv = async () => {
    const all = await customerVehiclesApi.page({ ...q, page: 1, limit: 200 });
    downloadCsv('gaariyan.csv', [
      [tr('Number'), tr('Company'), tr('Model'), tr('Saal'), tr('Type'), tr('Malik'), tr('Phone'), tr('Meter'), tr('Dafa aayi'), tr('Kharcha'), tr('Aakhri dafa'), tr('Insurance'), tr('Token'), tr('Fitness')],
      ...all.items.map((v) => [v.registrationNumber, v.makeName ?? '', v.modelName ?? '', v.year ?? '', vehicleTypeOf(v.vehicleType), v.ownerName ?? '', v.ownerPhone ?? '',
        v.odometerKm ?? '', v.totalServices, v.totalSpent, v.lastServiceAt ? dayOnly(v.lastServiceAt) : '', v.insuranceExpiry ? dayOnly(v.insuranceExpiry) : '',
        v.tokenTaxExpiry ? dayOnly(v.tokenTaxExpiry) : '', v.fitnessExpiry ? dayOnly(v.fitnessExpiry) : '']),
    ]);
  };

  return (
    <PageShell>
      <PageHero
        title={tr('Gaariyan')}
        chip={<><Car /> {' '}{tr('Customer vehicles')}</>}
        meta={tr('Har gaari ki service history, kaghzat aur malik — ek jagah')}
        busy={listQ.isFetching && !listQ.isLoading}
        loading={statsQ.isLoading}
        actions={<>
          <button type="button" onClick={() => void exportCsv()} disabled={!data?.items.length} className={heroButton}><Download className="h-4 w-4" /><span className="hidden sm:inline">{tr('CSV')}</span></button>
          <Link to="/autoparts/makes" className={heroButton}><Car className="h-4 w-4" /><span className="hidden sm:inline">{tr('Company / model')}</span></Link>
          <button type="button" onClick={guide.open} title={tr('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canEdit && <button type="button" onClick={() => setForm('new')} title={tr('Nayi gaari (N)')} className={heroPrimaryButton}><Plus className="h-4 w-4" /> {' '}{tr('Nayi gaari')}</button>}
        </>}
        stats={s ? [
          { label: tr('Darj gaariyan'), value: s.total },
          { label: tr('Abhi workshop me'), value: s.inShop },
          { label: tr('Kaghzat khatam hone wale'), value: s.papers },
        ] : [{ label: tr('Darj gaariyan'), value: '—' }]}
      />

      <KpiRow cols={4}>
        {!s ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={Car} color="#2563eb" label={tr('Sab gaariyan')} value={s.total} onClick={() => setView('all')} active={view === 'all'} />
          <KpiCard icon={FileWarning} color={s.papers ? '#e11d48' : '#64748b'} label={tr('Kaghzat')} value={s.papers} hint={tr('30 din me khatam')} onClick={() => setView('papers')} active={view === 'papers'} />
          <KpiCard icon={Star} color="#d97706" label={tr('Pakke customer')} value={s.regular} hint={tr('3 ya zyada dafa')} onClick={() => setView('regular')} active={view === 'regular'} />
          <KpiCard icon={UserX} color="#7c3aed" label={tr('Door ho gaye')} value={s.away} hint={tr('4 mahine se nahi aaye — call karein')} onClick={() => setView('away')} active={view === 'away'} />
        </>}
      </KpiRow>

      <FilterBar
        search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder={tr('Gaari number, malik, phone, model, chassis…')} label={tr('Search')} />}
        chips={filtered ? <>
          {query && <FilterChip onRemove={() => setSearch('')}>"{query}"</FilterChip>}
          {view !== 'all' && <FilterChip onRemove={() => setView('all')}>{VIEWS.find((v) => v.id === view)?.label}</FilterChip>}
        </> : undefined}
        onClear={() => { setSearch(''); setView('all'); }}>
        <FilterMenu icon={Filter} label={VIEWS.find((v) => v.id === view)?.label ?? tr('Sab')} value={view} active={view !== 'all'} onChange={setView} width="w-72"
          options={VIEWS.map((v) => ({ value: v.id, label: v.label, icon: v.icon }))} />
        <FilterMenu icon={ArrowDownWideNarrow} label={SORTS.find((x) => x.value === sort)?.label ?? tr('Tarteeb')} value={sort} onChange={setSort} align="right" options={SORTS} />
      </FilterBar>

      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[0.8125rem] text-slate-600">
        <span><strong className="text-slate-900">{data?.total ?? 0}</strong> {' '}{tr('gaariyan')}</span>
        <span className="hidden items-center gap-1 sm:inline-flex">{canEdit && <><Kbd>N</Kbd> {' '}{tr('nayi ·')}{' '} </>}<Kbd>/</Kbd> {' '}{tr('search ·')}{' '} <Kbd>G</Kbd> {' '}{tr('guide')}</span>
      </div>

      {listQ.isLoading ? (
        <div className="space-y-2 rounded-3xl bg-white p-4 ring-1 ring-slate-200/80">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : !data?.items.length ? (
        <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
          <Car className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 font-semibold text-slate-900">{filtered ? tr('Is filter me koi gaari nahi') : tr('Abhi koi gaari darj nahi')}</p>
          <p className="mt-1 text-sm text-slate-500">{tr('Naya job banate hi gaari khud darj ho jati hai. Yahan se bhi darj kar sakte hain.')}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {canEdit && <Button onClick={() => setForm('new')} leftIcon={<Plus className="h-4 w-4" />}>{tr('Nayi gaari')}</Button>}
            {filtered && <Button variant="ghost" onClick={() => { setSearch(''); setView('all'); }}>{tr('Filter saaf karein')}</Button>}
          </div>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
          {data.items.map((v) => {
            const due = papers(v);
            return (
              <li key={v.id}>
                <button type="button" onClick={() => setParams({ open: v.id })} className="flex w-full items-start gap-3 px-3 py-3 text-start hover:bg-slate-50 sm:px-4">
                  <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Car className="h-5 w-5" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="font-semibold text-slate-900">{v.registrationNumber}</span>
                      <span className="text-[0.8125rem] text-slate-600">{vehicleName(v) || vehicleTypeOf(v.vehicleType)}</span>
                      {v.openJobs > 0 && <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[0.6875rem] font-medium text-violet-700 ring-1 ring-violet-200">{tr('Workshop me')}</span>}
                      {due.map((p) => <span key={p.label} className="rounded-full bg-rose-50 px-2 py-0.5 text-[0.6875rem] font-medium text-rose-700 ring-1 ring-rose-200">{p.label} {p.left! < 0 ? 'khatam' : tr('{{left}} din', { left: p.left })}</span>)}
                      {!v.isActive && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.6875rem] font-medium text-slate-600">{tr('Band')}</span>}
                    </span>
                    <span className="mt-0.5 block truncate text-[0.8125rem] text-slate-600">{[v.ownerName, v.ownerPhone].filter(Boolean).join(' · ') || tr('Malik nahi likha')}</span>
                    <span className="mt-0.5 block text-[0.75rem] text-slate-500">{v.totalServices ? tr('{{totalServices}} dafa aayi · aakhri {{lastServiceAt}}', { totalServices: v.totalServices, lastServiceAt: dayOnly(v.lastServiceAt) }) : tr('Abhi tak koi service nahi')}{v.odometerKm ? ` · ${km(v.odometerKm)}` : ''}</span>
                  </span>
                  <span className="shrink-0 text-end">
                    <span className="block font-semibold tabular-nums text-slate-900">{sales(v.totalSpent)}</span>
                    <span className="text-[0.75rem] text-slate-500">{tr('kul kharcha')}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((x) => x - 1)}>{tr('Pichla')}</Button>
          <span className="text-sm text-slate-600">{tr('Safha {{page}} / {{totalPages}}', { page, totalPages: data.totalPages })}</span>
          <Button variant="secondary" size="sm" disabled={page >= data.totalPages} onClick={() => setPage((x) => x + 1)}>{tr('Agla')}</Button>
        </div>
      )}

      {openId && <VehicleDetail id={openId} canEdit={canEdit} canJob={canJob} onEdit={(v) => setForm(v)} onClose={() => setParams({})} onNewJob={(v) => navigate(`/autoparts/jobs/new?vehicle=${v.id}`)} />}
      {form && <VehicleFormModal vehicle={form === 'new' ? null : form} pending={save.isPending} onSave={(v) => save.mutate(v)} onClose={() => setForm(null)} />}

      {guide.isOpen && (
        <PageGuide title={tr('Gaariyan — aasaan tareeqa')} onClose={guide.close}
          steps={[
            { icon: Car, color: '#2563eb', title: tr('Khud darj hoti hain'), text: tr('Naya job banate hi gaari is list me aa jati hai. Malik ka phone ho to us ke khata se jurti hai.') },
            { icon: History, color: '#7c3aed', title: tr('Service history'), text: tr('Gaari kholein — har job, kab aayi, kya kaam hua, meter aur kitna bill. Customer ko bata sakte hain pichli dafa kya badla tha.') },
            { icon: FileWarning, color: '#e11d48', title: tr('Kaghzat'), text: tr('Insurance, token aur fitness ki date likhein — 30 din pehle laal nishan aata hai. "Reminder banayein" se reminders me chali jati hain.') },
            { icon: UserX, color: '#d97706', title: tr('Door ho gaye'), text: tr('4 mahine se na aane wale customer — WhatsApp karein, wapas aate hain.') },
          ]}
          shortcuts={[['N', tr('nayi gaari')], ['/', 'dhoondein'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}

function VehicleDetail({ id, canEdit, canJob, onEdit, onClose, onNewJob }: {
  id: string; canEdit: boolean; canJob: boolean; onEdit: (v: CustomerVehicle) => void; onClose: () => void; onNewJob: (v: CustomerVehicle) => void;
}) {
  const qc = useQueryClient();
  const shopName = useAuthStore((s) => s.tenant?.name) || 'Dukaan';
  const { sales } = useMasked();
  const vQ = useQuery({ queryKey: [VEHICLE_KEY, 'one', id], queryFn: () => customerVehiclesApi.getOne(id) });
  const v = vQ.data;
  const refresh = () => [VEHICLE_KEY, REMINDER_KEY].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  const autoRem = useMutation({
    mutationFn: () => serviceRemindersApi.autoGenerate(id),
    onSuccess: (r) => { toast.success(r.created ? tr('{{created}} reminder ban gaye', { created: r.created }) : tr('Naye reminder ki zaroorat nahi')); refresh(); },
    onError: (e) => toast.error(apiError(e, tr('Reminder nahi bane'))),
  });
  const toggle = useMutation({
    mutationFn: () => (v!.isActive ? customerVehiclesApi.remove(id) : customerVehiclesApi.update(id, { isActive: true })),
    onSuccess: () => { toast.success(v!.isActive ? tr('Gaari band kar di — history waisi hi hai') : tr('Gaari dobara chalu')); refresh(); },
    onError: (e) => toast.error(apiError(e, tr('Nahi hua'))),
  });
  const wa = v ? waLink(v.ownerPhone, `Assalam o alaikum ${v.ownerName ?? ''},\n${shopName}: aap ki gaari ${v.registrationNumber} ki service ka waqt ho gaya hai. Tashreef laayein. Shukriya!`) : undefined;

  return (
    <Modal open onClose={onClose} size="xl" title={v ? `${v.registrationNumber} — ${vehicleName(v) || vehicleTypeOf(v.vehicleType)}` : tr('Gaari')}
      description={v ? [v.ownerName, v.ownerPhone].filter(Boolean).join(' · ') : undefined}
      footer={v ? <>
        {canEdit && <Button variant="ghost" leftIcon={<Power className="h-4 w-4" />} loading={toggle.isPending} onClick={() => toggle.mutate()}>{v.isActive ? tr('Band karein') : tr('Chalu karein')}</Button>}
        {wa && <a href={wa} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"><MessageCircle className="h-4 w-4" />{tr('WhatsApp')}</a>}
        {canEdit && <Button variant="secondary" leftIcon={<Pencil className="h-4 w-4" />} onClick={() => onEdit(v)}>{tr('Badlein')}</Button>}
        {canJob && v.isActive && <Button leftIcon={<Wrench className="h-4 w-4" />} onClick={() => onNewJob(v)}>{tr('Naya job')}</Button>}
      </> : undefined}>
      {!v ? <Skeleton className="h-64 rounded-2xl" /> : (
        <div className="space-y-4">
          <dl className="grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-3 text-[0.8125rem] sm:grid-cols-4">
            <Box label={tr('Dafa aayi')} value={String(v.totalServices)} />
            <Box label={tr('Kul kharcha')} value={sales(v.totalSpent)} />
            <Box label={tr('Meter')} value={km(v.odometerKm ?? v.lastOdometerKm)} />
            <Box label={tr('Khata')} value={v.customer ? (v.customer.balance > 0 ? tr('{{balance}} udhaar', { balance: formatPKR(v.customer.balance) }) : v.customer.balance < 0 ? tr('{{formatPKR}} jama', { formatPKR: formatPKR(-v.customer.balance) }) : tr('Saaf')) : '—'} />
          </dl>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <section>
              <h3 className="mb-2 flex items-center gap-1.5 text-[0.875rem] font-semibold text-slate-900"><History className="h-4 w-4 text-slate-500" />{tr('Service history')}</h3>
              {!v.serviceHistory?.length ? <p className="rounded-xl bg-slate-50 px-3 py-6 text-center text-[0.8125rem] text-slate-500">{tr('Abhi koi job nahi')}</p> : (
                <ul className="divide-y divide-slate-100 rounded-xl ring-1 ring-slate-200">
                  {v.serviceHistory.map((j) => (
                    <li key={j.id}>
                      <Link to={`/autoparts/jobs/${j.id}`} className="flex items-start gap-3 px-3 py-2.5 hover:bg-slate-50">
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-1.5 text-[0.8125rem]">
                            <span className="font-semibold text-slate-900">{dayOnly(j.receivedAt)}</span>
                            <span className={cn('rounded-full px-2 py-0.5 text-[0.6875rem] font-medium ring-1', statusOf(j.status).tone)}>{statusOf(j.status).label}</span>
                            {j.odometerKm ? <span className="text-slate-500">{km(j.odometerKm)}</span> : null}
                          </span>
                          <span className="mt-0.5 block truncate text-[0.75rem] text-slate-600">{j.customerComplaint || jobTypeOf(j.jobType)}</span>
                          {j.partsUsed.length > 0 && <span className="mt-0.5 block truncate text-[0.75rem] text-slate-500">{tr('Parts: {{value}}', { value: j.partsUsed.map((p) => p.partName).join(', ') })}</span>}
                        </span>
                        <span className="shrink-0 text-[0.8125rem] font-semibold tabular-nums text-slate-900">{sales(j.total)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section className="space-y-3">
              <div>
                <h3 className="mb-2 flex items-center gap-1.5 text-[0.875rem] font-semibold text-slate-900"><FileWarning className="h-4 w-4 text-slate-500" />{tr('Kaghzat')}</h3>
                <dl className="space-y-1 rounded-xl p-3 text-[0.8125rem] ring-1 ring-slate-200">
                  {([[tr('Insurance'), v.insuranceExpiry], [tr('Token tax'), v.tokenTaxExpiry], [tr('Fitness'), v.fitnessExpiry]] as Array<[string, string | undefined]>).map(([label, d]) => {
                    const left = daysTo(d);
                    return (
                      <div key={label} className="flex justify-between gap-2">
                        <dt className="text-slate-500">{label}</dt>
                        <dd className={cn('font-medium', left !== null && left <= 30 ? 'text-rose-700' : 'text-slate-800')}>{d ? `${dayOnly(d)}${left !== null && left <= 30 ? (left < 0 ? ' (khatam)' : ` (${left} din)`) : ''}` : '—'}</dd>
                      </div>
                    );
                  })}
                </dl>
                {canEdit && (v.insuranceExpiry || v.tokenTaxExpiry || v.fitnessExpiry) && (
                  <Button className="mt-2" size="sm" variant="secondary" leftIcon={<Bell className="h-3.5 w-3.5" />} loading={autoRem.isPending} onClick={() => autoRem.mutate()}>{tr('Kaghzat ke reminder banayein')}</Button>
                )}
              </div>
              <div>
                <h3 className="mb-2 flex items-center gap-1.5 text-[0.875rem] font-semibold text-slate-900"><Bell className="h-4 w-4 text-slate-500" />{tr('Reminders')}</h3>
                {!v.reminders?.length ? <p className="text-[0.8125rem] text-slate-500">{tr('Koi reminder nahi')}</p> : (
                  <ul className="space-y-1.5">
                    {v.reminders.map((r) => (
                      <li key={r.id} className="flex justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-[0.8125rem]">
                        <span className="font-medium text-slate-800">{r.title}</span>
                        <span className="text-slate-600">{[r.dueDate && dayOnly(r.dueDate), r.dueOdometerKm && km(r.dueOdometerKm)].filter(Boolean).join(' / ') || '—'}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <Link to="/autoparts/reminders" className="mt-2 inline-block text-[0.8125rem] font-semibold text-brand-700 hover:underline">{tr('Sab reminders →')}</Link>
              </div>
              {v.notes && <p className="rounded-xl bg-amber-50 px-3 py-2 text-[0.8125rem] text-amber-900">{v.notes}</p>}
            </section>
          </div>
        </div>
      )}
    </Modal>
  );
}

function Box({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-slate-500">{label}</dt><dd className="text-[0.9375rem] font-bold tabular-nums text-slate-900">{value}</dd></div>;
}
