/**
 * Prescriptions list: what waits for the pharmacist's check, what is ready
 * to hand over, and what was given, for any period. Status counts, search
 * and paging come from the server; CSV and print take the whole filter.
 */

import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  CalendarRange, CheckCircle2, ClipboardCheck, Clock, Download, FilePlus, FileText, GraduationCap, ListChecks, Package, Repeat, Stethoscope, UserRound, XCircle,
} from 'lucide-react';
import {
  DateRangeMenu, FilterBar, FilterChip, FilterMenu, KpiCard, KpiRow, PageHero, PageShell, SearchField, Skeleton, ViewTabs,
  heroButton, heroIconButton, heroPrimaryButton, resolveRange, type DateRangeValue,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { downloadCsv } from '@core/lib/csv';
import { rangeLabel } from '@core/lib/dateRange';
import { useBusinessDayStart } from '@core/lib/business-day';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton } from '@core/print/PrintButton';
import type { PrintDoc } from '@core/print/types';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { doctorsApi, type Doctor } from '../api/doctors.api';
import { prescriptionsApi, type Prescription, type PrescriptionQuery, type PrescriptionStatus } from '../api/prescriptions.api';
import { useDebounced, usePageKeys } from '../hooks/usePageKeys';
import { RX_STATUS, drName, shortDate } from '../lib/meta';

const LIMIT = 25;
type Tab = 'all' | PrescriptionStatus;
const TABS: Array<{ id: Tab; label: string; icon: typeof Clock }> = [
  { id: 'all', label: 'Sab', icon: ListChecks },
  { id: 'PENDING', label: 'Check baqi', icon: Clock },
  { id: 'VERIFIED', label: 'Dene ko tayyar', icon: ClipboardCheck },
  { id: 'PARTIALLY_DISPENSED', label: 'Kuch di', icon: Package },
  { id: 'DISPENSED', label: 'Poori di', icon: CheckCircle2 },
  { id: 'REJECTED', label: 'Radd', icon: XCircle },
];

async function fetchAll(q: PrescriptionQuery) {
  const out: Prescription[] = [];
  for (let page = 1; page <= 40; page++) {
    const res = await prescriptionsApi.page({ ...q, page, limit: 100 });
    out.push(...res.items);
    if (out.length >= res.total || !res.items.length) break;
  }
  return out;
}

export default function PrescriptionsPage() {
  const navigate = useNavigate();
  const startHour = useBusinessDayStart();
  const { sales: money } = useMasked();
  const guide = usePageGuide();
  const searchRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const [params] = useSearchParams();
  const [period, setPeriod] = useState<DateRangeValue>({ preset: params.get('doctor') ? 'all' : 'month', custom: { from: '', to: '' } });
  const [doctorId, setDoctorId] = useState<string>(() => params.get('doctor') ?? '');
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const q = useDebounced(search.trim());
  const range = resolveRange(period, startHour);

  const query: PrescriptionQuery = useMemo(() => ({
    status: tab === 'all' ? undefined : tab, search: q || undefined, doctorId: doctorId || undefined,
    from: range?.from, to: range?.to,
  }), [tab, q, doctorId, range?.from, range?.to]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['prescriptions-page', query, page],
    queryFn: () => prescriptionsApi.page({ ...query, page, limit: LIMIT }),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });
  const { data: doctors = [] } = useQuery({ queryKey: ['pharmacy-doctors', 'all'], queryFn: () => doctorsApi.list().catch(() => [] as Doctor[]), staleTime: 5 * 60_000 });
  const c = data?.counts;
  const go = (t: Tab) => { setTab(t); setPage(1); };
  usePageKeys(searchRef, { n: () => navigate('/pharmacy/prescriptions/new') });

  const label = range ? rangeLabel(range.from, range.to) : 'Sab waqt';
  const exportCsv = async () => {
    setExporting(true);
    try {
      const rows = await fetchAll(query);
      if (!rows.length) { toast.error('Is filter me koi nuskha nahi'); return; }
      downloadCsv('nuskhe.csv', [
        ['Number', 'Tareekh', 'Mareez', 'Phone', 'Doctor', 'PMDC', 'Dawaiyan', 'Status', 'Amount'],
        ...rows.map((r) => [r.prescriptionNumber, r.createdAt.slice(0, 10), r.patientName, r.patientPhone, r.doctorName, r.doctorRegNumber,
          r.items.map((i) => `${i.medicineName} x${i.prescribedQty}`).join('; '), RX_STATUS[r.status].label, r.totalAmount]),
      ]);
      toast.success(`${rows.length} nuskhe CSV me`);
    } catch { toast.error('Export nahi hua'); } finally { setExporting(false); }
  };
  const printDoc = async (): Promise<PrintDoc> => {
    const rows = await fetchAll(query);
    return {
      title: 'Nuskhe', subtitle: label,
      meta: [['Nuskhe', String(rows.length)], ['Di gayi dawai', money(data?.dispensedValue ?? 0)]],
      sections: [{
        kind: 'table', title: 'Nuskhe',
        columns: [{ label: 'Number' }, { label: 'Mareez' }, { label: 'Doctor', wideOnly: true }, { label: 'Status' }, { label: 'Amount', align: 'right' }],
        rows: rows.map((r) => [r.prescriptionNumber, r.patientName ?? '', r.doctorName ?? '', RX_STATUS[r.status].label, money(r.totalAmount)]),
      }],
    };
  };

  const items = data?.items ?? [];
  const pages = data ? Math.max(1, Math.ceil(data.total / LIMIT)) : 1;
  const doctorName = doctors.find((d) => d.id === doctorId)?.name;

  return (
    <PageShell>
      {guide.isOpen && (
        <PageGuide title="Nuskhe — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: FilePlus, color: '#2563eb', title: 'Nuskha likhein', text: 'Mareez aur doctor ka naam, phir dawaiyan aur kitni. Stock wali dawai chunein to rate khud aa jata hai.' },
            { icon: ClipboardCheck, color: '#0891b2', title: 'Check karein', text: 'Pharmacist nuskha dekh kar "Check ho gaya" dabata hai — tab hi dawai di ja sakti hai.' },
            { icon: Package, color: '#16a34a', title: 'Dawai dein', text: 'Jitni dawai deni hai likhein, batch chunein aur paisa lein (cash, card, split ya udhaar). Ye normal sale ban jati hai — stock, khata aur reports sab me.' },
            { icon: Repeat, color: '#7c3aed', title: 'Refill', text: 'Refill wale nuskhe se agli dafa ek click me naya nuskha ban jata hai, aaj ke rate par.' },
          ]}
          shortcuts={[['/', 'search'], ['N', 'naya nuskha'], ['G', 'guide']]} />
      )}

      <PageHero title="Nuskhe" chip={<><CalendarRange />{label}</>} busy={isFetching && !isLoading} loading={isLoading || !c}
        meta="Prescriptions — check, dawai dena aur refill"
        actions={<>
          <button type="button" onClick={() => void exportCsv()} disabled={exporting} className={heroButton}><Download className="h-4 w-4" />{exporting ? 'Ban raha…' : 'CSV'}</button>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} label="Print" /></span>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          <Link to="/pharmacy/prescriptions/new" className={heroPrimaryButton}><FilePlus className="h-4 w-4" />Naya nuskha</Link>
        </>}
        stats={[
          { label: `Nuskhe · ${label}`, value: String(c?.all ?? 0) },
          { label: 'Check baqi', value: String(c?.PENDING ?? 0) },
          { label: 'Dene ko tayyar', value: String((c?.VERIFIED ?? 0) + (c?.PARTIALLY_DISPENSED ?? 0)) },
          { label: 'Di gayi dawai', value: money(data?.dispensedValue ?? 0) },
        ]} />

      <KpiRow cols={4}>
        {!c ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : (
          <>
            <KpiCard icon={Clock} color="#d97706" label="Check baqi" value={c.PENDING} hint="Pharmacist dekhe · dabayein" onClick={() => go('PENDING')} active={tab === 'PENDING'} />
            <KpiCard icon={ClipboardCheck} color="#0891b2" label="Dene ko tayyar" value={c.VERIFIED} hint="Check ho gaye" onClick={() => go('VERIFIED')} active={tab === 'VERIFIED'} />
            <KpiCard icon={Package} color="#7c3aed" label="Kuch di, baqi rehti" value={c.PARTIALLY_DISPENSED} hint="Baqi dawai deni hai" onClick={() => go('PARTIALLY_DISPENSED')} active={tab === 'PARTIALLY_DISPENSED'} />
            <KpiCard icon={CheckCircle2} color="#16a34a" label="Poori di" value={c.DISPENSED} hint={`${c.REJECTED + c.CANCELLED} radd / band`} onClick={() => go('DISPENSED')} active={tab === 'DISPENSED'} />
          </>
        )}
      </KpiRow>

      <FilterBar
        search={<SearchField ref={searchRef} value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Nuskha number, mareez, phone, CNIC, doctor ya dawai…" />}
        chips={(search.trim() || doctorId) ? <>
          {doctorId && <FilterChip onRemove={() => setDoctorId('')}>{drName(doctorName) || 'Doctor'}</FilterChip>}
          {search.trim() && <FilterChip onRemove={() => setSearch('')}>"{search.trim()}"</FilterChip>}
        </> : undefined}
        onClear={() => { setSearch(''); setDoctorId(''); }}>
        <DateRangeMenu value={period} onChange={(v) => { setPeriod(v); setPage(1); }} startHour={startHour} label="Date" defaultPreset={'month'} />
        {doctors.length > 0 && (
          <FilterMenu icon={Stethoscope} label="Doctor" value={doctorId || 'all'} active={!!doctorId} width="w-72"
            options={[{ value: 'all', label: 'Sab doctor' }, ...doctors.map((d) => ({ value: d.id, label: d.name, hint: d.specialization ?? d.registrationNumber }))]}
            onChange={(v) => { setDoctorId(v === 'all' ? '' : v); setPage(1); }} />
        )}
      </FilterBar>

      <ViewTabs value={tab} onChange={go} hint={<>Nuskhe par click kar ke kholein</>}
        tabs={TABS.map((t) => ({ id: t.id, label: t.label, icon: t.icon, count: c ? (t.id === 'all' ? c.all : c[t.id]) : null }))} />

      <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
        {isLoading ? (
          <div className="space-y-2 p-4">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700"><FileText className="h-7 w-7" /></span>
            <h3 className="mt-4 text-lg font-semibold text-slate-900">{search || doctorId ? 'Is filter me koi nuskha nahi' : 'Is muddat me koi nuskha nahi'}</h3>
            <p className="mt-1 text-[0.875rem] text-slate-500">Mareez nuskha laye to "Naya nuskha" se likhein.</p>
            <Link to="/pharmacy/prescriptions/new" className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-brand-600 px-4 text-[0.875rem] font-semibold text-brand-fg"><FilePlus className="h-4 w-4" />Naya nuskha</Link>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((r) => {
              const st = RX_STATUS[r.status];
              const given = r.items.reduce((s, i) => s + (i.dispensedQty ?? 0), 0);
              const asked = r.items.reduce((s, i) => s + i.prescribedQty, 0);
              return (
                <li key={r.id}>
                  <Link to={`/pharmacy/prescriptions/${r.id}`} className="grid gap-2 px-4 py-3 hover:bg-slate-50 sm:px-5 lg:grid-cols-[9rem_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.4fr)_8rem_7rem] lg:items-center">
                    <div>
                      <p className="font-mono text-[0.8125rem] font-semibold text-slate-900">{r.prescriptionNumber}</p>
                      <p className="text-[0.75rem] text-slate-500">{shortDate(r.createdAt)}{r.type === 'REFILL' && ' · refill'}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 truncate font-semibold text-slate-900"><UserRound className="h-3.5 w-3.5 shrink-0 text-slate-400" />{r.patientName || 'Walk-in'}</p>
                      <p className="truncate text-[0.75rem] text-slate-500">{[r.patientAge ? `${r.patientAge} saal` : '', r.patientPhone].filter(Boolean).join(' · ') || '—'}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 truncate text-[0.875rem] text-slate-700"><Stethoscope className="h-3.5 w-3.5 shrink-0 text-slate-400" />{drName(r.doctorName) || '—'}</p>
                      {r.doctorRegNumber && <p className="truncate text-[0.75rem] text-slate-500">PMDC {r.doctorRegNumber}</p>}
                    </div>
                    <p className="min-w-0 truncate text-[0.8125rem] text-slate-600">
                      {r.items.slice(0, 3).map((i) => i.medicineName).join(', ')}{r.items.length > 3 ? ` +${r.items.length - 3}` : ''}
                      {asked > 0 && r.status !== 'PENDING' && <span className="ml-1.5 text-[0.75rem] text-slate-400">({Number(given.toFixed(2))}/{Number(asked.toFixed(2))} di)</span>}
                    </p>
                    <span className={cn('w-fit rounded-full px-2.5 py-0.5 text-[0.75rem] font-semibold ring-1', st.tone)}>{st.label}</span>
                    <p className="text-right text-[0.9375rem] font-bold tabular-nums text-slate-900">{r.totalAmount > 0 ? money(r.totalAmount) : '—'}</p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        {data && data.total > LIMIT && (
          <footer className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 text-[0.8125rem] text-slate-600">
            <span>{(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, data.total)} / {data.total}</span>
            <div className="flex gap-2">
              <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="h-8 rounded-lg px-3 font-semibold ring-1 ring-slate-200 disabled:opacity-40">Pichla</button>
              <button type="button" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="h-8 rounded-lg px-3 font-semibold ring-1 ring-slate-200 disabled:opacity-40">Agla</button>
            </div>
          </footer>
        )}
      </section>
    </PageShell>
  );
}
