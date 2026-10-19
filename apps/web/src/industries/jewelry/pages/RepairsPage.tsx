/**
 * Repairs on the customer's own piece. Booking in takes the piece, its
 * weight and karat, the promised day, the charge and any advance (held on
 * the customer's khata); a karigar can be put on the job. Steps move from
 * received to in work to ready; handing back makes the bill, where the
 * counter takes only charge less advance. Customer and karigar slips print
 * from the row. Repairs booked before this page are listed read-only under
 * "Purane record"; one still in the shop can be handed back from there.
 *
 * Keys: N new repair · / search · G guide.
 */

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle, ArrowRight, Archive, CheckCircle2, Clock, GraduationCap, Hammer, ListChecks, Pencil, Plus, Printer, Receipt, Wallet, Wrench, XCircle,
} from 'lucide-react';
import {
  Button, FilterBar, FilterChip, Input, Kbd, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Select, Skeleton, Table, TBody, THead, Td, Th, Tr,
  Textarea, ViewTabs, heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton, type PrintDoc } from '@core/print';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { PaymentMethodPicker, TakePaymentModal } from '@modules/pos/components';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';
import { exchangesApi, type Exchange } from '../api/exchanges.api';
import { karigarsApi } from '../api/karigars.api';
import { repairsApi, type Repair, type RepairStatus, type RepairView } from '../api/repairs.api';
import { EmptyList, KaratPill, LoadFailed, Pager } from '../components/ui';
import { KEYS, apiError, day, dayTime, exchangeLabel, grams, purityLabel } from '../lib/meta';

type Tab = RepairView | 'old';
const TABS: Array<{ id: Tab; label: string; icon: typeof Wrench }> = [
  { id: 'open', label: 'Dukaan me', icon: ListChecks },
  { id: 'ready', label: 'Tayyar', icon: CheckCircle2 },
  { id: 'late', label: 'Late', icon: AlertTriangle },
  { id: 'done', label: 'De diye', icon: Receipt },
  { id: 'cancelled', label: 'Cancel', icon: XCircle },
  { id: 'all', label: 'Sab', icon: Wrench },
  { id: 'old', label: 'Purane record', icon: Archive },
];

const STATUS: Record<RepairStatus, { label: string; tone: string }> = {
  RECEIVED: { label: 'Liya gaya', tone: 'bg-slate-100 text-slate-700' },
  IN_PROGRESS: { label: 'Kaam ho raha', tone: 'bg-amber-50 text-amber-800' },
  READY: { label: 'Tayyar', tone: 'bg-emerald-50 text-emerald-700' },
  DELIVERED: { label: 'De diya', tone: 'bg-emerald-600 text-white' },
  CANCELLED: { label: 'Cancel', tone: 'bg-rose-50 text-rose-700' },
};
const NEXT: Partial<Record<RepairStatus, RepairStatus>> = { RECEIVED: 'IN_PROGRESS', IN_PROGRESS: 'READY' };
const KARATS = [24, 22, 21, 18, 14];

const isOpen = (r: Repair) => r.status === 'RECEIVED' || r.status === 'IN_PROGRESS' || r.status === 'READY';
const isLate = (r: Repair) => isOpen(r) && !!r.promisedDate && new Date(r.promisedDate) < new Date(new Date().toDateString());
const pieceText = (r: Repair) => [r.karat ? `${r.karat}K` : '', r.weightGrams ? grams(r.weightGrams) : ''].filter(Boolean).join(' · ');

function customerSlip(r: Repair): PrintDoc {
  return {
    title: 'Repair ki parchi',
    subtitle: `${r.repairNumber} · ${day(r.createdAt)}`,
    meta: [['Customer', r.customerName ?? '—'], ['Phone', r.customerPhone ?? '—'], ['Wapas', day(r.promisedDate)]],
    sections: [{
      kind: 'rows',
      rows: [
        { label: 'Zewar aur kaam', value: r.itemDescription },
        ...(r.karat ? [{ label: 'Karat', value: `${r.karat}K` }] : []),
        ...(r.weightGrams ? [{ label: 'Wazan', value: grams(r.weightGrams) }] : []),
        { label: 'Repair charges', value: formatPKR(r.charge), strong: true },
        { label: 'Advance', value: formatPKR(r.advance) },
        { label: 'Baqi', value: formatPKR(r.due), strong: true },
      ],
    }],
    footer: 'Parchi ke baghair zewar wapas nahi hoga. Zewar ka wazan lete waqt check kar lein.',
  };
}

function karigarSlip(r: Repair): PrintDoc {
  return {
    title: 'Karigar parchi — repair',
    subtitle: `${r.repairNumber} · wapas ${day(r.promisedDate)}`,
    meta: [['Karigar', r.karigarName ?? '—']],
    sections: [{
      kind: 'rows',
      rows: [
        { label: 'Kaam', value: r.itemDescription },
        ...(r.karat ? [{ label: 'Karat', value: `${r.karat}K` }] : []),
        ...(r.weightGrams ? [{ label: 'Wazan diya', value: grams(r.weightGrams) }] : []),
        ...(r.notes ? [{ label: 'Note', value: r.notes }] : []),
      ],
    }],
    footer: 'Zewar wapas karte waqt wazan likhwayein. Dastakhat: ____________',
  };
}

export default function RepairsPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const canKarigars = usePermission(PERMISSIONS.SUPPLIERS_VIEW);
  const searchRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>('open');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<Repair | 'new' | null>(null);
  const [act, setAct] = useState<{ r: Repair; kind: 'deliver' | 'pay' | 'cancel' } | null>(null);
  const [oldDeliver, setOldDeliver] = useState<Exchange | null>(null);

  useEffect(() => { const t = setTimeout(() => setQuery(search.trim()), 250); return () => clearTimeout(t); }, [search]);
  useEffect(() => { setPage(1); }, [tab, query]);

  const old = tab === 'old';
  const q = { view: old ? 'open' as const : tab, page, limit: 30, search: query || undefined };
  const listQ = useQuery({ queryKey: [KEYS.repairs, 'page', q], queryFn: () => repairsApi.page(q), placeholderData: (p) => p, enabled: !old });
  const oldQ = useQuery({
    queryKey: [KEYS.exchanges, 'old-repairs', page, query],
    queryFn: () => exchangesApi.page({ kind: 'repair', page, limit: 30, search: query || undefined }),
    placeholderData: (p) => p, enabled: old,
  });
  const countsQ = useQuery({ queryKey: [KEYS.repairs, 'counts'], queryFn: () => repairsApi.page({ view: 'open', limit: 1 }) });
  const karigarsQ = useQuery({ queryKey: [KEYS.karigars, 'list', { isActive: 'true' }], queryFn: () => karigarsApi.list({ isActive: 'true' }), enabled: canKarigars });
  const karigars = karigarsQ.data ?? [];
  const counts = countsQ.data?.counts;
  const data = listQ.data;
  const refresh = () => [KEYS.repairs, KEYS.exchanges, 'sales-history', 'cash-register', 'customers-for-pos'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

  const step = useMutation({
    mutationFn: ({ r, status, reason }: { r: Repair; status: RepairStatus; reason?: string }) => repairsApi.status(r.id, status, reason),
    onSuccess: (r) => { toast.success(`${r.repairNumber}: ${STATUS[r.status].label}`); setAct(null); refresh(); },
    onError: (e) => toast.error(apiError(e, 'Halat nahi badli')),
  });
  const pay = useMutation({
    mutationFn: ({ r, amount, method }: { r: Repair; amount: number; method: PaymentMethod }) => repairsApi.payment(r.id, amount, method),
    onSuccess: () => { toast.success('Advance khate me jama'); setAct(null); refresh(); },
    onError: (e) => toast.error(apiError(e, 'Advance save nahi hua')),
  });
  const deliver = useMutation({
    mutationFn: ({ r, amount, method }: { r: Repair; amount: number; method: PaymentMethod }) => repairsApi.deliver(r.id, { charge: r.charge, paidAmount: amount, paymentMethod: method }),
    onSuccess: (r) => {
      toast.success(r.saleId ? 'Zewar wapas — bill ban gaya' : 'Zewar wapas de diya');
      setAct(null); refresh();
      if (r.saleId) window.open(`/sales/${r.saleId}/receipt?auto=1`, '_blank');
    },
    onError: (e) => toast.error(apiError(e, 'Wapas nahi hua')),
  });
  const deliverOld = useMutation({
    mutationFn: ({ e, amount, method }: { e: Exchange; amount: number; method: string }) => exchangesApi.deliverRepair(e.id, { charge: e.netValue, paidAmount: amount, paymentMethod: method }),
    onSuccess: () => { toast.success('Zewar wapas — bill ban gaya'); setOldDeliver(null); refresh(); },
    onError: (e) => toast.error(apiError(e, 'Wapas nahi hua')),
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if (e.key === 'n' || e.key === 'N') { e.preventDefault(); setForm('new'); }
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const printDoc = async (): Promise<PrintDoc> => {
    const all = await repairsApi.page({ ...q, page: 1, limit: 100 });
    return {
      title: `Repair — ${TABS.find((t) => t.id === tab)?.label ?? ''}`,
      meta: [['Repair', String(all.total)], ['Charges', formatPKR(all.totals.charge)], ['Advance', formatPKR(all.totals.advance)]],
      sections: [{
        kind: 'table',
        columns: [{ label: 'Wapas' }, { label: '#', wideOnly: true }, { label: 'Customer' }, { label: 'Kaam', wideOnly: true }, { label: 'Karigar', wideOnly: true }, { label: 'Charges', align: 'right' }, { label: 'Baqi', align: 'right' }],
        rows: all.items.map((r) => [day(r.promisedDate), r.repairNumber, `${r.customerName ?? ''} ${r.customerPhone ?? ''}`, r.itemDescription, r.karigarName ?? '—', formatPKR(r.charge), formatPKR(r.due)]),
      }],
    };
  };

  const loading = old ? oldQ.isLoading : listQ.isLoading;
  const failed = old ? oldQ.isError && !oldQ.data : listQ.isError && !data;
  const pages = old ? oldQ.data?.pages : data?.pages;

  return (
    <PageShell>
      <PageHero
        title="Repair"
        chip={<><Wrench /> Customer ka zewar</>}
        meta="Zewar lein, karigar ko dein, tayyar hone par bill bana kar wapas karein"
        busy={(listQ.isFetching && !listQ.isLoading) || (oldQ.isFetching && !oldQ.isLoading)}
        loading={countsQ.isLoading}
        actions={<>
          {!old && <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} disabled={!data?.items.length} /></span>}
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          <button type="button" onClick={() => setForm('new')} title="Naya repair (N)" className={heroPrimaryButton}><Plus className="h-4 w-4" /> Repair lein</button>
        </>}
        stats={countsQ.data ? [
          { label: 'Dukaan me', value: counts?.open ?? 0, hint: formatPKR(countsQ.data.totals.charge) },
          { label: 'Tayyar', value: counts?.ready ?? 0 },
          { label: 'Advance jama', value: formatPKR(countsQ.data.totals.advance) },
        ] : [{ label: 'Dukaan me', value: '—' }]}
      />

      <KpiRow cols={4}>
        <KpiCard icon={ListChecks} color="#0891b2" label="Dukaan me" value={counts?.open ?? '—'} hint="Abhi wapas dena hai" onClick={() => setTab('open')} active={tab === 'open'} />
        <KpiCard icon={CheckCircle2} color="#16a34a" label="Tayyar" value={counts?.ready ?? '—'} hint="Customer ko bulayein" onClick={() => setTab('ready')} active={tab === 'ready'} />
        <KpiCard icon={AlertTriangle} color={counts?.late ? '#e11d48' : '#64748b'} label="Late" value={counts?.late ?? '—'} hint={counts?.late ? 'Waqt guzar gaya' : 'Koi late nahi'} onClick={() => setTab('late')} active={tab === 'late'} />
        <KpiCard icon={Wallet} color="#d97706" label="Advance jama" value={countsQ.data ? formatPKR(countsQ.data.totals.advance) : '—'} hint="Khate me, bill par katega" />
      </KpiRow>

      <FilterBar
        search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Customer, phone, parchi #, zewar…" label="Search" />}
        chips={query ? <FilterChip onRemove={() => setSearch('')}>"{query}"</FilterChip> : undefined}
        onClear={() => setSearch('')} />

      <ViewTabs value={tab} onChange={setTab}
        hint={<><Kbd>N</Kbd> naya · <Kbd>/</Kbd> search · <Kbd>G</Kbd> guide</>}
        tabs={TABS.map((t) => ({ id: t.id, label: t.label, icon: t.icon, count: t.id === 'old' ? null : counts?.[t.id] ?? null }))} />

      {loading ? <Skeleton className="h-64 rounded-3xl" />
        : failed ? <LoadFailed what="Repair" retry={() => (old ? oldQ.refetch() : listQ.refetch())} />
          : old ? <OldRepairs rows={oldQ.data?.items ?? []} onDeliver={setOldDeliver} />
            : !data?.items.length ? (
              <EmptyList icon={Wrench} title={query ? 'Is search me kuch nahi' : tab === 'late' ? 'Koi repair late nahi' : 'Koi repair nahi'}
                text="Customer ka zewar, wazan, karat, wapas dene ka din aur charges likhein. Advance khate me jata hai aur bill par kat jata hai.">
                <Button onClick={() => setForm('new')} leftIcon={<Plus className="h-4 w-4" />}>Repair lein</Button>
              </EmptyList>
            ) : (
              <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
                {data.items.map((r) => {
                  const next = NEXT[r.status];
                  return (
                    <li key={r.id} className="flex flex-col gap-3 px-4 py-3.5 lg:flex-row lg:items-center">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[0.9375rem] font-bold text-slate-900">{r.customerName}</span>
                          <span className="text-[0.75rem] text-slate-500">{r.customerPhone} · {r.repairNumber}</span>
                          <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold', STATUS[r.status].tone)}>{STATUS[r.status].label}</span>
                          {isLate(r) && <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[0.6875rem] font-bold text-white">Late</span>}
                        </div>
                        <p className="mt-1 text-[0.8125rem] text-slate-600">{r.itemDescription}{pieceText(r) ? ` · ${pieceText(r)}` : ''}</p>
                        <p className="mt-0.5 text-[0.75rem] text-slate-500">Wapas {day(r.promisedDate)}{r.karigarName ? ` · karigar ${r.karigarName}` : ''}{r.notes ? ` · ${r.notes}` : ''}</p>
                      </div>
                      <div className="text-right text-[0.8125rem] tabular-nums lg:w-44">
                        <span className="block font-bold text-slate-900">{formatPKR(r.charge)}</span>
                        {r.advance > 0 && <span className="block text-emerald-700">Advance {formatPKR(r.advance)}</span>}
                        {isOpen(r) && <span className={cn('block font-semibold', r.due > 0 ? 'text-amber-700' : 'text-emerald-700')}>{r.due > 0 ? `Baqi ${formatPKR(r.due)}` : 'Poora mila'}</span>}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 lg:w-[22rem] lg:justify-end">
                        {isOpen(r) && <Button size="sm" variant={r.status === 'READY' ? 'primary' : 'ghost'} onClick={() => setAct({ r, kind: 'deliver' })} leftIcon={<Receipt className="h-4 w-4" />}>Wapas dein</Button>}
                        {next && <Button size="sm" variant="secondary" loading={step.isPending && step.variables?.r.id === r.id} onClick={() => step.mutate({ r, status: next })} rightIcon={<ArrowRight className="h-4 w-4" />}>{STATUS[next].label}</Button>}
                        {isOpen(r) && (r.charge === 0 || r.due > 0) && <Button size="sm" variant="ghost" onClick={() => setAct({ r, kind: 'pay' })} leftIcon={<Wallet className="h-4 w-4" />}>Advance</Button>}
                        <PrintButton doc={() => customerSlip(r)} size="sm" label="Parchi" />
                        {r.karigarName && <PrintButton doc={() => karigarSlip(r)} size="sm" label="Karigar parchi" />}
                        {isOpen(r) && <Button size="sm" variant="ghost" onClick={() => setForm(r)} aria-label="Badlein"><Pencil className="h-4 w-4" /></Button>}
                        {isOpen(r) && <Button size="sm" variant="ghost" onClick={() => setAct({ r, kind: 'cancel' })} aria-label="Cancel"><XCircle className="h-4 w-4 text-rose-600" /></Button>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
      {pages ? <Pager page={page} pages={pages} onPage={setPage} /> : null}

      {form && <RepairForm repair={form === 'new' ? null : form} karigars={karigars} onClose={() => setForm(null)} onSaved={() => { setForm(null); refresh(); }} />}
      {act?.kind === 'pay' && (
        <TakePaymentModal title={`${act.r.customerName} se advance`} description={`${act.r.repairNumber} · baqi ${formatPKR(act.r.due)}`}
          amount={act.r.due} max={act.r.charge > 0 ? act.r.due : undefined} confirmLabel="Advance jama karein" loading={pay.isPending}
          onConfirm={(amount, method) => pay.mutate({ r: act.r, amount, method })} onClose={() => setAct(null)} />
      )}
      {act?.kind === 'deliver' && (
        <TakePaymentModal title={`${act.r.customerName} ko zewar wapas`}
          description={`${act.r.itemDescription} · charges ${formatPKR(act.r.charge)}${act.r.advance ? ` − advance ${formatPKR(act.r.advance)}` : ''}`}
          amount={act.r.due} max={act.r.due} allowZero confirmLabel={act.r.charge > 0 ? 'Wapas dein aur bill banayein' : 'Wapas dein'} loading={deliver.isPending}
          onConfirm={(amount, method) => deliver.mutate({ r: act.r, amount, method })} onClose={() => setAct(null)} />
      )}
      {act?.kind === 'cancel' && <CancelModal r={act.r} loading={step.isPending} onClose={() => setAct(null)} onConfirm={(reason) => step.mutate({ r: act.r, status: 'CANCELLED', reason })} />}
      {oldDeliver && (
        <TakePaymentModal title={`${oldDeliver.customerName} ko zewar wapas`} description={`${oldDeliver.itemDescription} · repair ${formatPKR(oldDeliver.netValue)}`}
          amount={oldDeliver.netValue} max={oldDeliver.netValue} allowZero confirmLabel="Wapas dein aur bill banayein" loading={deliverOld.isPending}
          onConfirm={(amount, method) => deliverOld.mutate({ e: oldDeliver, amount, method })} onClose={() => setOldDeliver(null)} />
      )}

      {guide.isOpen && (
        <PageGuide title="Repair — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Wrench, color: '#7c3aed', title: 'Zewar lein', text: 'Customer ka naam, phone, zewar aur kaam likhein. Wazan aur karat zaroor likhein taake wapsi par jhagra na ho.' },
            { icon: Wallet, color: '#16a34a', title: 'Advance', text: 'Advance customer ke khate me jama hota hai aur bill par khud kat jata hai.' },
            { icon: Hammer, color: '#d97706', title: 'Karigar', text: 'Karigar chunein aur karigar parchi de dein. Tayyar ho to "Tayyar" dabayein.' },
            { icon: Receipt, color: '#0891b2', title: 'Wapas dein', text: 'Wapas dete waqt sirf baqi amount lein — bill ban kar receipt khulti hai. Baqi reh jaye to khate me udhaar.' },
            { icon: Printer, color: '#ea580c', title: 'Parchi', text: 'Customer parchi zewar lete waqt dein; wapsi par parchi wapas lein.' },
          ]}
          tips={['Cancel karne par advance customer ke khate me jama rehta hai.', 'Purane record me pehle wali repairs dikhti hain; jo abhi dukaan me hai woh wahan se wapas ho sakti hai.']}
          shortcuts={[['N', 'naya'], ['/', 'dhoondein'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}

/** Repairs booked on the old exchange records: read-only, except handing back one still in the shop. */
function OldRepairs({ rows, onDeliver }: { rows: Exchange[]; onDeliver: (e: Exchange) => void }) {
  if (!rows.length) return <EmptyList icon={Archive} title="Koi purana record nahi" text="Is page se pehle darj hui repairs yahan dikhti hain." />;
  return (
    <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
      <Table minWidth="48rem">
        <THead><Tr><Th>Kab</Th><Th>Customer</Th><Th>Zewar</Th><Th>Karat</Th><Th align="right">Wazan</Th><Th align="right">Charges</Th><Th align="right">Halat</Th></Tr></THead>
        <TBody>
          {rows.map((e) => (
            <Tr key={e.id}>
              <Td className="whitespace-nowrap">{dayTime(e.exchangeDate)}<span className="block text-[0.6875rem] text-slate-400">{e.exchangeNumber}</span></Td>
              <Td><span className="block font-medium text-slate-900">{e.customerName}</span><span className="block text-[0.75rem] text-slate-500">{e.customerPhone}</span></Td>
              <Td className="max-w-[16rem]"><span className="block truncate">{e.itemDescription}</span><span className="block text-[0.75rem] text-slate-500">{exchangeLabel(e.exchangeType)}</span></Td>
              <Td><KaratPill purity={e.testedPurity ?? e.claimedPurity} /></Td>
              <Td align="right">{grams(e.netWeight ?? e.grossWeight)}</Td>
              <Td align="right" className="font-semibold">{formatPKR(e.netValue)}</Td>
              <Td align="right">
                {e.purpose === 'REPAIR'
                  ? <Button size="sm" onClick={() => onDeliver(e)} leftIcon={<CheckCircle2 className="h-4 w-4" />}>Wapas dein</Button>
                  : <span className="text-[0.75rem] font-semibold text-emerald-700">De diya</span>}
              </Td>
            </Tr>
          ))}
        </TBody>
      </Table>
    </div>
  );
}

function RepairForm({ repair, karigars, onClose, onSaved }: {
  repair: Repair | null; karigars: Array<{ id: string; fullName: string }>; onClose: () => void; onSaved: () => void;
}) {
  const editing = !!repair;
  const [f, setF] = useState({
    customerName: repair?.customerName ?? '', customerPhone: repair?.customerPhone ?? '', itemDescription: repair?.itemDescription ?? '',
    weightGrams: repair?.weightGrams ? String(repair.weightGrams) : '', karat: repair?.karat ? String(repair.karat) : '22',
    promisedDate: repair?.promisedDate ? repair.promisedDate.slice(0, 10) : '', charge: repair ? String(repair.charge || '') : '', advance: '',
    paymentMethod: 'CASH' as PaymentMethod, karigarId: repair?.karigarId ?? '', notes: repair?.notes ?? '',
  });
  const [error, setError] = useState('');
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));
  const num = (v: string) => v.replace(/[^\d.]/g, '');

  const save = useMutation({
    mutationFn: () => {
      const common = {
        itemDescription: f.itemDescription.trim(), weightGrams: f.weightGrams ? Number(f.weightGrams) : null, karat: f.karat ? Number(f.karat) : null,
        promisedDate: f.promisedDate || null, charge: Number(f.charge) || 0, karigarId: f.karigarId || null, notes: f.notes.trim(),
      };
      return repair
        ? repairsApi.update(repair.id, common)
        : repairsApi.create({ ...common, customerName: f.customerName.trim(), customerPhone: f.customerPhone.trim(), advance: Number(f.advance) || 0, paymentMethod: f.paymentMethod });
    },
    onSuccess: (r) => { toast.success(editing ? 'Repair save ho gayi' : `Repair ${r.repairNumber} darj — parchi print karein`); onSaved(); },
    onError: (e) => setError(apiError(e, 'Save nahi hua')),
  });
  const submit = () => {
    if (!editing && !f.customerName.trim()) return setError('Customer ka naam likhein');
    if (!editing && !/^[\d+\-\s]{7,20}$/.test(f.customerPhone.trim())) return setError('Customer ka sahi phone likhein');
    if (!f.itemDescription.trim()) return setError('Zewar aur kaam likhein');
    if (Number(f.charge) > 0 && Number(f.advance) > Number(f.charge)) return setError('Advance charges se zyada nahi ho sakta');
    setError('');
    save.mutate();
  };

  return (
    <Modal open onClose={onClose} size="lg" title={editing ? `${repair.repairNumber} — badlein` : 'Repair ke liye zewar lein'}
      description={editing ? `${repair.customerName} · ${repair.customerPhone}` : 'Zewar, wazan, karat aur charges — parchi customer ko'}
      footer={<><Button variant="ghost" onClick={onClose}>Rehne dein</Button><Button onClick={submit} loading={save.isPending}>{editing ? 'Save karein' : 'Repair darj karein'}</Button></>}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); submit(); }}
        onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); submit(); } }}>
        {!editing && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Customer" required autoFocus value={f.customerName} onChange={(e) => set({ customerName: e.target.value })} maxLength={80} />
            <Input label="Phone" required inputMode="tel" value={f.customerPhone} onChange={(e) => set({ customerPhone: e.target.value })} placeholder="03xx xxxxxxx" />
          </div>
        )}
        <Input label="Zewar aur kaam" required autoFocus={editing} value={f.itemDescription} onChange={(e) => set({ itemDescription: e.target.value })} placeholder="Jaise: toota bunda jodna, choori ka size chhota" maxLength={200} />
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="Wazan (g)" inputMode="decimal" value={f.weightGrams} onChange={(e) => set({ weightGrams: num(e.target.value) })} hint="Lete waqt tol kar likhein" />
          <Select label="Karat" value={f.karat} onChange={(e) => set({ karat: e.target.value })}
            options={[{ value: '', label: 'Pata nahi' }, ...KARATS.map((k) => ({ value: String(k), label: purityLabel(`KARAT_${k}`) }))]} />
          <Input label="Wapas dene ki date" type="date" value={f.promisedDate} onChange={(e) => set({ promisedDate: e.target.value })} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Repair charges (Rs)" inputMode="decimal" value={f.charge} onChange={(e) => set({ charge: num(e.target.value) })} hint="Wapas dete waqt bill" />
          {karigars.length > 0 && (
            <Select label="Karigar" value={f.karigarId} onChange={(e) => set({ karigarId: e.target.value })}
              options={[{ value: '', label: 'Abhi nahi' }, ...karigars.map((k) => ({ value: k.id, label: k.fullName }))]} />
          )}
        </div>
        {!editing && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Advance (Rs)" inputMode="decimal" value={f.advance} onChange={(e) => set({ advance: num(e.target.value) })} hint="Customer ke khate me jama" />
            {Number(f.advance) > 0 && <PaymentMethodPicker value={f.paymentMethod} onChange={(m) => set({ paymentMethod: m })} label="Advance kaise mila" />}
          </div>
        )}
        <Textarea label="Note" rows={2} value={f.notes} onChange={(e) => set({ notes: e.target.value })} maxLength={300} />
        {error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-[0.8125rem] font-medium text-rose-700">{error}</p>}
        <p className="flex items-center gap-1.5 text-[0.75rem] text-slate-500"><Clock className="h-3.5 w-3.5" />Save: <Kbd>Ctrl</Kbd>+<Kbd>S</Kbd></p>
      </form>
    </Modal>
  );
}

function CancelModal({ r, loading, onClose, onConfirm }: { r: Repair; loading: boolean; onClose: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState('');
  return (
    <Modal open onClose={onClose} title={`${r.repairNumber} cancel karein?`}
      description={r.advance > 0 ? `Advance ${formatPKR(r.advance)} khud wapas nahi hota — customer ke khate me jama rehta hai` : 'Zewar customer ko wapas karein'}
      footer={<><Button variant="ghost" onClick={onClose}>Rehne dein</Button><Button variant="danger" disabled={!reason.trim()} loading={loading} onClick={() => onConfirm(reason.trim())}>Cancel karein</Button></>}>
      <Input label="Wajah" required autoFocus value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} placeholder="Jaise: customer ne kaam nahi karwaya" />
    </Modal>
  );
}
