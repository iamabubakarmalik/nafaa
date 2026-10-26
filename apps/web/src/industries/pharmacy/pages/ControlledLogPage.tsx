/**
 * Narcotic / controlled register: every register medicine with stock now,
 * what came in and went out in the period, and sales that still lack the
 * patient or doctor. Opening a medicine shows its register line by line
 * (opening and closing balance, bill, patient, doctor) ready to print for
 * an inspector; a missing name can be filled in from here.
 */

import { useMemo, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, ArrowLeft, CalendarRange, CheckCircle2, ClipboardPen, GraduationCap, PackageMinus, PackagePlus, ShieldAlert, ShoppingCart } from 'lucide-react';
import {
  Button, DateRangeMenu, FilterBar, Input, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Skeleton, Table, TBody, Td, Th, THead, Tr,
  heroIconButton, resolveRange, type DateRangeValue,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { rangeLabel } from '@core/lib/dateRange';
import { useBusinessDayStart } from '@core/lib/business-day';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton } from '@core/print/PrintButton';
import type { PrintDoc } from '@core/print/types';
import { controlledLogApi, type NarcoticRegister, type RegisterRow } from '../api/controlled-log.api';
import { SCHEDULE_META, drName, formatCnic } from '../lib/meta';

const fmt = (n: number) => String(Number(n.toFixed(2)));
const when = (v: string) => new Intl.DateTimeFormat('en-PK', { day: 'numeric', month: 'short', year: '2-digit', hour: 'numeric', minute: '2-digit' }).format(new Date(v));
const apiError = (e: unknown) => { const m = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message; return (Array.isArray(m) ? m[0] : m) ?? 'Save nahi hua'; };

function registerDoc(r: NarcoticRegister, period: string): PrintDoc {
  return {
    title: `Register — ${r.medicine.name}`,
    subtitle: period,
    meta: [['Shuru', `${fmt(r.opening)} ${r.medicine.unit}`], ['Aaya', fmt(r.inQty)], ['Gaya', fmt(r.outQty)], ['Aakhir', `${fmt(r.closing)} ${r.medicine.unit}`]],
    sections: [{
      kind: 'table', title: 'Har entry',
      columns: [{ label: '#' }, { label: 'Tareekh' }, { label: 'Kya' }, { label: 'Mareez / doctor', wideOnly: true }, { label: 'Aaya', align: 'right' }, { label: 'Gaya', align: 'right' }, { label: 'Baqi', align: 'right' }],
      rows: r.rows.map((x) => [String(x.no), when(x.at), `${x.label}${x.reference ? ` ${x.reference}` : ''}`,
        x.party ? [x.party.patientName, x.party.patientCnic, drName(x.party.doctorName), x.party.doctorRegNumber].filter(Boolean).join(' · ') : '',
        x.inQty ? fmt(x.inQty) : '', x.outQty ? fmt(x.outQty) : '', fmt(x.closing)]),
    }],
  };
}

function DetailsModal({ row, productId, onClose, onSaved }: { row: RegisterRow; productId: string; onClose: () => void; onSaved: () => void }) {
  const p = row.party ?? {};
  const [d, setD] = useState({ patientName: p.patientName ?? '', patientCnic: p.patientCnic ?? '', patientPhone: p.patientPhone ?? '', doctorName: p.doctorName ?? '', doctorRegNumber: p.doctorRegNumber ?? '', prescriptionNumber: p.prescriptionNumber ?? '' });
  const [tried, setTried] = useState(false);
  const errors = {
    patientName: d.patientName.trim().length < 2 ? 'Mareez ka naam likhein' : undefined,
    doctorName: d.doctorName.trim().length < 2 ? 'Doctor ka naam likhein' : undefined,
    patientCnic: d.patientCnic && d.patientCnic.replace(/\D/g, '').length !== 13 ? 'CNIC 13 hindsay ka hota hai' : undefined,
  };
  const save = useMutation({
    mutationFn: () => controlledLogApi.saleDetails({
      saleId: row.saleId!, productId, patientName: d.patientName.trim(), doctorName: d.doctorName.trim(),
      patientCnic: d.patientCnic.trim() || undefined, patientPhone: d.patientPhone.trim() || undefined,
      doctorRegNumber: d.doctorRegNumber.trim() || undefined, prescriptionNumber: d.prescriptionNumber.trim() || undefined,
    }),
    onSuccess: () => { toast.success('Register me likh diya'); onSaved(); },
    onError: (e) => toast.error(apiError(e)),
  });
  const submit = (e: FormEvent) => { e.preventDefault(); setTried(true); if (Object.values(errors).some(Boolean)) return; save.mutate(); };
  return (
    <Modal open onClose={onClose} size="lg" title={`Bill ${row.reference ?? ''} — mareez aur doctor`} description={`${fmt(row.outQty)} gaya · ${when(row.at)}`}
      footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Wapas</Button><Button type="submit" form="rx-party" loading={save.isPending}>Save</Button></div>}>
      <form id="rx-party" onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
        <Input label="Mareez ka naam" required autoFocus value={d.patientName} onChange={(e) => setD({ ...d, patientName: e.target.value })} error={tried ? errors.patientName : undefined} />
        <Input label="CNIC" inputMode="numeric" value={d.patientCnic} onChange={(e) => setD({ ...d, patientCnic: formatCnic(e.target.value) })} error={tried ? errors.patientCnic : undefined} />
        <Input label="Phone" value={d.patientPhone} onChange={(e) => setD({ ...d, patientPhone: e.target.value })} />
        <Input label="Nuskha number" value={d.prescriptionNumber} onChange={(e) => setD({ ...d, prescriptionNumber: e.target.value })} />
        <Input label="Doctor ka naam" required value={d.doctorName} onChange={(e) => setD({ ...d, doctorName: e.target.value })} error={tried ? errors.doctorName : undefined} />
        <Input label="PMDC" value={d.doctorRegNumber} onChange={(e) => setD({ ...d, doctorRegNumber: e.target.value })} />
      </form>
    </Modal>
  );
}

function RegisterView({ productId, period, range }: { productId: string; period: string; range: { from: string; to: string } | null }) {
  const qc = useQueryClient();
  const canFill = usePermission(PERMISSIONS.POS_USE);
  const [fill, setFill] = useState<RegisterRow | null>(null);
  const [onlyMissing, setOnlyMissing] = useState(false);
  const { data: r, isLoading } = useQuery({
    queryKey: ['pharmacy-register', productId, range?.from, range?.to],
    queryFn: () => controlledLogApi.register(productId, range ?? undefined),
  });
  if (isLoading || !r) return <Skeleton className="h-96 rounded-3xl" />;
  const rows = onlyMissing ? r.rows.filter((x) => x.missing) : r.rows;
  const meta = SCHEDULE_META[r.medicine.scheduleClass];
  return (
    <>
      {fill && <DetailsModal row={fill} productId={productId} onClose={() => setFill(null)} onSaved={() => { setFill(null); qc.invalidateQueries({ queryKey: ['pharmacy-register'] }); qc.invalidateQueries({ queryKey: ['pharmacy-register-overview'] }); }} />}
      <KpiRow cols={4}>
        <KpiCard icon={CalendarRange} color="#475569" label="Shuru me" value={`${fmt(r.opening)} ${r.medicine.unit}`} />
        <KpiCard icon={PackagePlus} color="#16a34a" label="Aaya" value={fmt(r.inQty)} hint="Purchase, return, adjustment" />
        <KpiCard icon={PackageMinus} color="#e11d48" label="Gaya" value={fmt(r.outQty)} hint="Sale, damage, wapas" />
        <KpiCard icon={AlertTriangle} color="#d97706" label="Naam baqi" value={r.missing} hint="dabayein — sirf ye dikhayein" onClick={() => setOnlyMissing((v) => !v)} active={onlyMissing} />
      </KpiRow>
      <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
          <div>
            <h2 className="flex items-center gap-2 text-[1rem] font-semibold text-slate-900">{r.medicine.name}{meta && <span className={cn('rounded-md px-1.5 py-0.5 text-[0.6875rem] font-semibold ring-1', meta.tone)}>{meta.label}</span>}</h2>
            <p className="text-[0.75rem] text-slate-500">{[r.medicine.dosageForm, r.medicine.registrationNumber && `DRAP ${r.medicine.registrationNumber}`, `aakhir me ${fmt(r.closing)} ${r.medicine.unit}`].filter(Boolean).join(' · ')}</p>
          </div>
          <PrintButton doc={() => registerDoc(r, period)} label="Register print" size="sm" />
        </header>
        {rows.length === 0 ? <p className="px-6 py-12 text-center text-[0.875rem] text-slate-500">{onlyMissing ? 'Sab sales me naam likhe hain' : 'Is muddat me koi entry nahi'}</p> : (
          <Table minWidth="60rem">
            <THead><Tr>
              <Th className="px-4 py-2.5">#</Th><Th className="px-3 py-2.5">Waqt</Th><Th className="px-3 py-2.5">Kya</Th><Th className="px-3 py-2.5">Mareez / doctor</Th>
              <Th align="right" className="px-3 py-2.5">Shuru</Th><Th align="right" className="px-3 py-2.5">Aaya</Th><Th align="right" className="px-3 py-2.5">Gaya</Th><Th align="right" className="px-4 py-2.5">Baqi</Th>
            </Tr></THead>
            <TBody>
              {rows.map((x) => (
                <Tr key={x.id} className={cn(x.missing && 'bg-amber-50/50', x.saleVoided && 'opacity-60')}>
                  <Td className="px-4 py-2 tabular-nums text-slate-500">{x.no}</Td>
                  <Td className="whitespace-nowrap px-3 py-2 text-slate-600">{when(x.at)}</Td>
                  <Td className="px-3 py-2">
                    <span className="font-medium text-slate-900">{x.label}</span>
                    {x.reference && <span className="ml-1 font-mono text-[0.75rem] text-slate-500">{x.reference}</span>}
                    {x.returnOf && <span className="ml-1 text-[0.75rem] text-slate-500">(bill {x.returnOf})</span>}
                    {x.saleVoided && <span className="ml-1 text-[0.75rem] font-semibold text-rose-600">void</span>}
                  </Td>
                  <Td className="px-3 py-2">
                    {x.party && (x.party.patientName || x.party.doctorName) ? (
                      <span className="text-slate-700">{x.party.patientName ?? '—'}{x.party.patientCnic && <span className="ml-1 font-mono text-[0.75rem] text-slate-500">{x.party.patientCnic}</span>}
                        <span className="block text-[0.75rem] text-slate-500">{drName(x.party.doctorName) || 'doctor nahi'}{x.party.doctorRegNumber && ` · ${x.party.doctorRegNumber}`}{x.party.prescriptionNumber && ` · ${x.party.prescriptionNumber}`}</span>
                      </span>
                    ) : x.saleId ? <span className="font-medium text-amber-700">Naam nahi likha</span> : <span className="text-slate-400">—</span>}
                    {x.saleId && !x.saleVoided && canFill && (
                      <button type="button" onClick={() => setFill(x)} className="ml-2 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.75rem] font-semibold text-brand-700 hover:bg-brand-50"><ClipboardPen className="h-3.5 w-3.5" />{x.missing ? 'Bharein' : 'Badlein'}</button>
                    )}
                  </Td>
                  <Td align="right" className="px-3 py-2 tabular-nums text-slate-500">{fmt(x.opening)}</Td>
                  <Td align="right" className="px-3 py-2 tabular-nums text-emerald-700">{x.inQty ? fmt(x.inQty) : ''}</Td>
                  <Td align="right" className="px-3 py-2 tabular-nums text-rose-700">{x.outQty ? fmt(x.outQty) : ''}</Td>
                  <Td align="right" className="px-4 py-2 font-semibold tabular-nums">{fmt(x.closing)}</Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}
      </section>
    </>
  );
}

export default function ControlledLogPage() {
  const startHour = useBusinessDayStart();
  const guide = usePageGuide();
  const [params, setParams] = useSearchParams();
  const productId = params.get('product') ?? '';
  const [period, setPeriod] = useState<DateRangeValue>({ preset: 'thisMonth', custom: { from: '', to: '' } });
  const [search, setSearch] = useState('');
  const range = resolveRange(period, startHour);
  const label = range ? rangeLabel(range.from, range.to) : 'Sab waqt';

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['pharmacy-register-overview', range?.from, range?.to],
    queryFn: () => controlledLogApi.overview(range ?? undefined),
  });
  const items = useMemo(() => (data?.items ?? []).filter((i) => !search.trim() || i.name.toLowerCase().includes(search.trim().toLowerCase())), [data, search]);
  const t = data?.totals;
  const open = (id: string) => setParams(id ? { product: id } : {});
  const current = data?.items.find((i) => i.productId === productId);

  return (
    <PageShell>
      {guide.isOpen && (
        <PageGuide title="Narcotic register — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: ShieldAlert, color: '#e11d48', title: 'Kaun si dawai', text: 'Jis dawai par "Narcotic register" laga ho ya schedule Narcotic / Psychotropic / Controlled ho, wo yahan aati hai.' },
            { icon: ShoppingCart, color: '#2563eb', title: 'POS par naam', text: 'POS par aisi dawai daalte hi doctor aur mareez ka naam poocha jata hai — bill ke saath register me chala jata hai.' },
            { icon: ClipboardPen, color: '#d97706', title: 'Naam baqi', text: 'Jis sale me naam nahi likha wo peeli dikhti hai — "Bharein" se baad me likh dein.' },
            { icon: CalendarRange, color: '#16a34a', title: 'Print', text: 'Dawai kholein, mahina chunein aur "Register print" — inspector ko dikhane ke liye shuru, aaya, gaya aur baqi sab.' },
          ]}
          shortcuts={[['G', 'guide']]} />
      )}

      <PageHero title="Narcotic register" chip={<><CalendarRange />{label}</>} busy={isFetching && !isLoading} loading={isLoading || !t}
        meta={current ? current.name : 'Controlled dawaiyon ka hisaab'}
        actions={<>
          {productId && <button type="button" onClick={() => open('')} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white/15 px-2.5 text-[0.8125rem] font-semibold text-white ring-1 ring-white/25 hover:bg-white/25"><ArrowLeft className="h-4 w-4" />Sab dawaiyan</button>}
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
        </>}
        stats={[
          { label: 'Register wali dawaiyan', value: String(t?.medicines ?? 0) },
          { label: 'Sales', value: String(t?.sales ?? 0) },
          { label: 'Naam baqi', value: String(t?.missing ?? 0) },
          { label: 'Kul gaya', value: fmt(t?.out ?? 0) },
        ]} />

      <FilterBar search={!productId ? <SearchField value={search} onChange={setSearch} placeholder="Dawai ka naam…" /> : undefined}>
        <DateRangeMenu value={period} onChange={setPeriod} startHour={startHour} label="Date" defaultPreset="thisMonth" />
      </FilterBar>

      {productId ? <RegisterView productId={productId} period={label} range={range} /> : (
        <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
          {isLoading ? <div className="space-y-2 p-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
            : items.length === 0 ? (
              <div className="flex flex-col items-center px-6 py-16 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600"><ShieldAlert className="h-7 w-7" /></span>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">Koi register wali dawai nahi</h3>
                <p className="mt-1 text-[0.875rem] text-slate-500">Dawai ke "Schedule" step me "Narcotic register me likhein" chalu karein.</p>
                <Link to="/pharmacy/medicines" className="mt-4 text-[0.875rem] font-semibold text-brand-700 hover:underline">Dawaiyan →</Link>
              </div>
            ) : (
              <Table minWidth="46rem">
                <THead><Tr>
                  <Th className="px-5 py-2.5">Dawai</Th><Th align="right" className="px-3 py-2.5">Stock abhi</Th><Th align="right" className="px-3 py-2.5">Aaya</Th><Th align="right" className="px-3 py-2.5">Gaya</Th><Th align="right" className="px-3 py-2.5">Sales</Th><Th align="right" className="px-5 py-2.5">Naam baqi</Th>
                </Tr></THead>
                <TBody>
                  {items.map((i) => (
                    <Tr key={i.productId} onClick={() => open(i.productId)} className="cursor-pointer hover:bg-slate-50">
                      <Td className="px-5 py-2.5"><p className="font-semibold text-slate-900">{i.name}</p><p className="text-[0.75rem] text-slate-500">{[SCHEDULE_META[i.scheduleClass]?.label, i.dosageForm, !i.isActive && 'band'].filter(Boolean).join(' · ')}</p></Td>
                      <Td align="right" className="px-3 py-2.5 font-semibold tabular-nums">{fmt(i.stock)} <span className="font-normal text-slate-500">{i.unit}</span></Td>
                      <Td align="right" className="px-3 py-2.5 tabular-nums text-emerald-700">{fmt(i.inQty)}</Td>
                      <Td align="right" className="px-3 py-2.5 tabular-nums text-rose-700">{fmt(i.outQty)}</Td>
                      <Td align="right" className="px-3 py-2.5 tabular-nums">{i.sales}</Td>
                      <Td align="right" className="px-5 py-2.5">{i.missing ? <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[0.75rem] font-semibold text-amber-800 ring-1 ring-amber-200">{i.missing}</span> : <CheckCircle2 className="ml-auto h-4 w-4 text-emerald-600" />}</Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            )}
        </section>
      )}
    </PageShell>
  );
}
