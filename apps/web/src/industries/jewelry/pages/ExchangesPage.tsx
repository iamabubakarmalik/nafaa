/**
 * Old gold bought across the counter, and repairs.
 *
 * Buying: weigh, test the karat, take the stones off, value at today's
 * buying rate less kaat; the metal goes into metal stock and cash paid
 * leaves the drawer. A slip for the customer (with CNIC) prints from the
 * row. Repairs: the customer's piece is booked in with its weight and the
 * agreed charge; handing it back makes the bill.
 *
 * Keys: N new · / search · 1 bought · 2 repairs · G guide.
 */

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CheckCircle2, GraduationCap, Plus, Printer, Repeat, Scale, ShieldCheck, Wallet, Wrench } from 'lucide-react';
import {
  Button, DateRangeMenu, FilterBar, FilterChip, Input, Kbd, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Select, Skeleton,
  Switch, Table, TBody, THead, Td, Th, Tr, Textarea, ViewTabs, heroIconButton, heroPrimaryButton, resolveRange, type DateRangeValue,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton, type PrintDoc } from '@core/print';
import { formatPKR } from '@core/lib/format';
import { useBusinessDayStart } from '@core/lib/business-day';
import { rangeLabel } from '@core/lib/dateRange';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { TakePaymentModal } from '@modules/pos/components';
import { exchangesApi, type Exchange, type ExchangeKind } from '../api/exchanges.api';
import type { Purity } from '../api/metal-rates.api';
import { ChipPicker, EmptyList, KaratPill, LoadFailed, Pager } from '../components/ui';
import { useMetalRates } from '../hooks/useJewelryFacts';
import { COMMON_PURITIES, KEYS, PURITY_FACTOR, apiError, dayTime, exchangeLabel, grams, metalOf, purityLabel, r2, r3, rateFor } from '../lib/meta';

type Tab = 'buy' | 'repair';
const BUY_TYPES = ['OLD_GOLD_EXCHANGE', 'BROKEN_JEWELRY', 'COIN_EXCHANGE', 'PURE_METAL_DEPOSIT', 'OLD_SILVER_EXCHANGE'];
const REPAIR_TYPES = ['REPAIR', 'RESIZING', 'RENOVATION'];
const isOpenRepair = (e: Exchange) => REPAIR_TYPES.includes(e.exchangeType) && e.purpose === 'REPAIR';

function slip(e: Exchange): PrintDoc {
  const repair = REPAIR_TYPES.includes(e.exchangeType);
  return {
    title: repair ? 'Repair ki parchi' : 'Purana sona — khareed parchi',
    subtitle: `${e.exchangeNumber} · ${dayTime(e.exchangeDate)}`,
    meta: [['Customer', e.customerName], ...(e.customerPhone ? [['Phone', e.customerPhone] as [string, string]] : []), ...(e.customerCnic ? [['CNIC', e.customerCnic] as [string, string]] : [])],
    sections: [{
      kind: 'rows',
      rows: [
        { label: 'Zewar', value: e.itemDescription },
        { label: 'Kaam', value: exchangeLabel(e.exchangeType) },
        { label: 'Karat', value: purityLabel(e.testedPurity ?? e.claimedPurity) },
        { label: 'Kul wazan', value: grams(e.grossWeight) },
        ...(e.stoneWeight ? [{ label: 'Nag', value: grams(e.stoneWeight) }] : []),
        { label: 'Asal wazan', value: grams(e.netWeight ?? e.grossWeight) },
        ...(repair ? [{ label: 'Repair charges', value: formatPKR(e.netValue), strong: true }] : [
          { label: 'Rate fi gram', value: formatPKR(e.ratePerGram) },
          { label: 'Qeemat', value: formatPKR(e.grossValue) },
          ...(e.deductions ? [{ label: 'Kaat', value: `− ${formatPKR(e.deductions)}`, sub: true }] : []),
          ...(e.testingCharges ? [{ label: 'Testing', value: `− ${formatPKR(e.testingCharges)}`, sub: true }] : []),
          { label: 'Customer ko diya', value: formatPKR(e.netValue), strong: true },
        ]),
      ],
    }],
    footer: repair ? 'Parchi ke baghair zewar wapas nahi hoga.' : 'Customer ne zewar apni marzi se becha. Dastakhat: ____________',
  };
}

export default function ExchangesPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const startHour = useBusinessDayStart();
  const [params, setParams] = useSearchParams();
  const canBuy = usePermission(PERMISSIONS.PURCHASES_CREATE);
  const canViewBuy = usePermission(PERMISSIONS.PURCHASES_VIEW);
  const canRepair = usePermission(PERMISSIONS.POS_USE);
  const searchRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<Tab>(params.get('tab') === 'repair' || !canViewBuy ? 'repair' : 'buy');
  const [openOnly, setOpenOnly] = useState(false);
  const [range, setRange] = useState<DateRangeValue>({ preset: 'thisMonth', custom: { from: '', to: '' } });
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<Tab | null>(null);
  const [deliver, setDeliver] = useState<Exchange | null>(null);

  useEffect(() => { const t = setTimeout(() => setQuery(search.trim()), 250); return () => clearTimeout(t); }, [search]);
  useEffect(() => { setPage(1); }, [tab, openOnly, range, query]);
  const urlTab = params.get('tab');
  useEffect(() => { setTab(urlTab === 'repair' || !canViewBuy ? 'repair' : 'buy'); }, [urlTab, canViewBuy]);
  useEffect(() => {
    const next = new URLSearchParams(params);
    if (tab === 'buy') next.delete('tab'); else next.set('tab', tab);
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const period = resolveRange(range, startHour);
  const kind: ExchangeKind = tab === 'buy' ? 'buy' : openOnly ? 'repair-open' : 'repair';
  const q = { kind, page, limit: 30, search: query || undefined, ...(period ?? {}) };
  const listQ = useQuery({ queryKey: [KEYS.exchanges, 'page', q], queryFn: () => exchangesApi.page(q), placeholderData: (p) => p });
  const openRepairsQ = useQuery({ queryKey: [KEYS.exchanges, 'open-repairs'], queryFn: () => exchangesApi.page({ kind: 'repair-open', limit: 1 }), enabled: canRepair });
  const data = listQ.data;
  const filtered = !!query || openOnly;
  const can = tab === 'buy' ? canBuy : canRepair;

  const deliverM = useMutation({
    mutationFn: ({ e, amount, method }: { e: Exchange; amount: number; method: string }) =>
      exchangesApi.deliverRepair(e.id, { charge: e.netValue, paidAmount: amount, paymentMethod: method }),
    onSuccess: () => { toast.success('Zewar wapas — bill ban gaya'); setDeliver(null); qc.invalidateQueries({ queryKey: [KEYS.exchanges] }); qc.invalidateQueries({ queryKey: ['sales-history'] }); },
    onError: (e) => toast.error(apiError(e, 'Wapas nahi hua')),
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if ((e.key === 'n' || e.key === 'N') && can) { e.preventDefault(); setForm(tab); }
      if (e.key === '1' && canViewBuy) setTab('buy');
      if (e.key === '2') setTab('repair');
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [can, tab, canViewBuy]);

  const printDoc = async (): Promise<PrintDoc> => {
    const all = await exchangesApi.page({ ...q, page: 1, limit: 100 });
    return {
      title: tab === 'buy' ? 'Purana sona khareeda' : 'Repair',
      subtitle: period ? rangeLabel(period.from, period.to) : 'Sab tareekhen',
      meta: [['Kul', String(all.total)], ['Wazan', grams(all.totals.grams)], ['Qeemat', formatPKR(all.totals.value)]],
      sections: [{
        kind: 'table',
        columns: [{ label: 'Kab' }, { label: '#', wideOnly: true }, { label: 'Customer' }, { label: 'Karat' }, { label: 'Grams', align: 'right' }, { label: 'Rs', align: 'right' }],
        rows: all.items.map((e) => [dayTime(e.exchangeDate), e.exchangeNumber, e.customerName, purityLabel(e.testedPurity ?? e.claimedPurity), String(r3(e.netWeight ?? e.grossWeight)), formatPKR(e.netValue)]),
      }],
    };
  };

  return (
    <PageShell>
      <PageHero
        title="Purana sona aur repair"
        chip={<><Repeat /> Exchange</>}
        meta="Customer se sona khareedein ya zewar repair ke liye lein — har cheez parchi ke saath"
        busy={listQ.isFetching && !listQ.isLoading}
        loading={listQ.isLoading}
        actions={<>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} disabled={!data?.items.length} /></span>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {can && <button type="button" onClick={() => setForm(tab)} title="Naya (N)" className={heroPrimaryButton}><Plus className="h-4 w-4" />{tab === 'buy' ? ' Sona khareedein' : ' Repair lein'}</button>}
        </>}
        stats={data ? [
          { label: tab === 'buy' ? 'Khareeda' : 'Repair', value: data.total, hint: period ? rangeLabel(period.from, period.to) : undefined },
          { label: 'Wazan', value: grams(data.totals.grams), hint: tab === 'buy' ? `Khalis ${grams(data.totals.fine)}` : undefined },
          { label: tab === 'buy' ? 'Diya' : 'Charges', value: formatPKR(data.totals.value) },
        ] : [{ label: 'Khareeda', value: '—' }]}
      />

      <KpiRow cols={4}>
        <KpiCard icon={Scale} color="#d97706" label="Wazan aaya" value={data ? grams(data.totals.grams) : '—'} hint={tab === 'buy' ? 'Is period me' : 'Repair ke zewar'} />
        <KpiCard icon={Wallet} color="#0891b2" label={tab === 'buy' ? 'Customer ko diya' : 'Repair charges'} value={data ? formatPKR(data.totals.value) : '—'} />
        <KpiCard icon={ShieldCheck} color="#16a34a" label="Kaat (dukaan ko)" value={data ? formatPKR(data.totals.deductions) : '—'} hint="Testing / galai ka farq" />
        <KpiCard icon={Wrench} color={(openRepairsQ.data?.total ?? 0) > 0 ? '#e11d48' : '#64748b'} label="Repair baqi" value={openRepairsQ.data?.total ?? '—'} hint="Customer ko wapas dena hai"
          onClick={() => { setTab('repair'); setOpenOnly(true); }} active={tab === 'repair' && openOnly} />
      </KpiRow>

      <FilterBar
        search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Customer, phone, CNIC, parchi #, zewar…" label="Search" />}
        chips={filtered ? <>
          {openOnly && <FilterChip onRemove={() => setOpenOnly(false)}>Sirf baqi repair</FilterChip>}
          {query && <FilterChip onRemove={() => setSearch('')}>"{query}"</FilterChip>}
        </> : undefined}
        onClear={() => { setSearch(''); setOpenOnly(false); }}>
        <DateRangeMenu value={range} onChange={setRange} startHour={startHour} defaultPreset="thisMonth" />
        {tab === 'repair' && (
          <div className="inline-flex h-11 items-center rounded-2xl bg-slate-100/80 px-3">
            <Switch size="sm" label="Sirf baqi" checked={openOnly} onChange={(e) => setOpenOnly(e.target.checked)} />
          </div>
        )}
      </FilterBar>

      <ViewTabs value={tab} onChange={setTab}
        hint={<>{can && <><Kbd>N</Kbd> naya · </>}<Kbd>/</Kbd> search · <Kbd>1</Kbd>-<Kbd>2</Kbd> tabs</>}
        tabs={[...(canViewBuy ? [{ id: 'buy' as Tab, label: 'Sona khareeda', icon: Repeat }] : []), { id: 'repair' as Tab, label: 'Repair', icon: Wrench, count: openRepairsQ.data?.total ?? null }]} />

      {listQ.isLoading ? <Skeleton className="h-64 rounded-3xl" />
        : listQ.isError && !data ? <LoadFailed what="Record" retry={() => listQ.refetch()} />
          : !data?.items.length ? (
            <EmptyList icon={tab === 'buy' ? Repeat : Wrench} title={filtered ? 'Is filter me kuch nahi' : tab === 'buy' ? 'Is period me koi sona nahi khareeda' : 'Koi repair nahi'}
              text={tab === 'buy' ? 'Customer ka sona tol kar, karat test karke aur kaat laga kar khareedein — sona metal stock me jata hai.' : 'Customer ka zewar repair ke liye lein, charges likhein aur parchi dein.'}>
              {can && <Button onClick={() => setForm(tab)} leftIcon={<Plus className="h-4 w-4" />}>{tab === 'buy' ? 'Sona khareedein' : 'Repair lein'}</Button>}
            </EmptyList>
          ) : (
            <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
              <Table minWidth="52rem">
                <THead><Tr><Th>Kab</Th><Th>Customer</Th><Th>Zewar</Th><Th>Karat</Th><Th align="right">Wazan</Th><Th align="right">{tab === 'buy' ? 'Diya' : 'Charges'}</Th><Th align="right">Kaam</Th></Tr></THead>
                <TBody>
                  {data.items.map((e) => (
                    <Tr key={e.id}>
                      <Td className="whitespace-nowrap">{dayTime(e.exchangeDate)}<span className="block text-[0.6875rem] text-slate-400">{e.exchangeNumber}</span></Td>
                      <Td><span className="block font-medium text-slate-900">{e.customerName}</span><span className="block text-[0.75rem] text-slate-500">{[e.customerPhone, e.customerCnic].filter(Boolean).join(' · ')}</span></Td>
                      <Td className="max-w-[16rem]"><span className="block truncate">{e.itemDescription}</span><span className="block text-[0.75rem] text-slate-500">{exchangeLabel(e.exchangeType)}{e.purpose === 'SALE' ? ' · bill par' : e.purpose === 'ORDER' ? ' · order advance' : ''}</span></Td>
                      <Td><KaratPill purity={e.testedPurity ?? e.claimedPurity} /></Td>
                      <Td align="right">{grams(e.netWeight ?? e.grossWeight)}</Td>
                      <Td align="right" className="font-semibold">{formatPKR(e.netValue)}{e.deductions > 0 && <span className="block text-[0.6875rem] font-normal text-slate-500">kaat {formatPKR(e.deductions)}</span>}</Td>
                      <Td align="right">
                        <div className="flex items-center justify-end gap-1.5">
                          <PrintButton doc={() => slip(e)} size="sm" label="Parchi" />
                          {isOpenRepair(e) && canRepair && <Button size="sm" onClick={() => setDeliver(e)} leftIcon={<CheckCircle2 className="h-4 w-4" />}>Wapas dein</Button>}
                          {REPAIR_TYPES.includes(e.exchangeType) && e.purpose === 'REPAIR_DONE' && <span className="text-[0.75rem] font-semibold text-emerald-700">De diya</span>}
                        </div>
                      </Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            </div>
          )}
      {data && <Pager page={page} pages={data.pages} onPage={setPage} />}

      {form && <ExchangeForm kind={form} onClose={() => setForm(null)} onSaved={(e) => {
        setForm(null);
        [KEYS.exchanges, KEYS.metal, 'cash-register', 'jewelry-dashboard'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
        if ('paidFromDrawer' in e && e.paidFromDrawer === false) toast.warning('Register band hai — drawer se nikla cash record nahi hua');
      }} />}
      {deliver && (
        <TakePaymentModal title={`${deliver.customerName} ko zewar wapas`} description={`${deliver.itemDescription} · repair ${formatPKR(deliver.netValue)}`}
          amount={deliver.netValue} max={deliver.netValue} allowZero confirmLabel="Wapas dein aur bill banayein" loading={deliverM.isPending}
          onConfirm={(amount, method) => deliverM.mutate({ e: deliver, amount, method })} onClose={() => setDeliver(null)} />
      )}

      {guide.isOpen && (
        <PageGuide title="Purana sona aur repair — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Scale, color: '#d97706', title: 'Tolna aur test', text: 'Kul wazan aur nag ka wazan likhein, karat test karke chunein. Qeemat aaj ke khareed rate se khud banti hai.' },
            { icon: ShieldCheck, color: '#16a34a', title: 'Kaat', text: 'Galai ya testing ka kaat % likhein — customer ko kam milta hai, farq dukaan ka.' },
            { icon: Wallet, color: '#0891b2', title: 'Cash drawer se', text: '"Cash drawer se diya" on ho to paisa register se nikalta hai, taake shaam ka hisaab sahi rahe.' },
            { icon: Wrench, color: '#7c3aed', title: 'Repair', text: 'Zewar, wazan aur charges likh kar parchi dein. Wapas dete waqt payment lein — bill khud banta hai.' },
            { icon: Printer, color: '#ea580c', title: 'Parchi', text: 'Har row se parchi print karein — khareed par customer ka CNIC aur dastakhat.' },
          ]}
          tips={['Bill par liya gaya purana sona bhi yahan "bill par" ke saath dikhta hai.', 'Purana sona khareedte waqt CNIC zaroor likhein.']}
          shortcuts={[['N', 'naya'], ['/', 'dhoondein'], ['1', 'khareeda'], ['2', 'repair'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}

function ExchangeForm({ kind, onClose, onSaved }: { kind: Tab; onClose: () => void; onSaved: (e: Exchange & { paidFromDrawer?: boolean }) => void }) {
  const { rates } = useMetalRates();
  const repair = kind === 'repair';
  const [f, setF] = useState({
    exchangeType: repair ? 'REPAIR' : 'OLD_GOLD_EXCHANGE', customerName: '', customerPhone: '', customerCnic: '', itemDescription: '',
    claimedPurity: 'KARAT_22' as Purity, testedPurity: 'KARAT_22' as Purity, grossWeight: '', stoneWeight: '', rate: '', kaat: '0', testing: '', charge: '',
    testedBy: '', notes: '', paidInCash: true,
  });
  const [error, setError] = useState('');
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));
  const r = rateFor(rates, metalOf(f.testedPurity), f.testedPurity);
  const autoRate = r ? r.buyRate || r.ratePerGram : 0;
  const rate = f.rate ? Number(f.rate) : autoRate;
  const net = r3(Math.max((Number(f.grossWeight) || 0) - (Number(f.stoneWeight) || 0), 0));
  const gross = r2(net * rate);
  const kaat = r2((gross * Math.min(Number(f.kaat) || 0, 50)) / 100);
  const pay = r2(Math.max(gross - kaat - (Number(f.testing) || 0), 0));

  const save = useMutation({
    mutationFn: () => exchangesApi.create({
      exchangeType: f.exchangeType, customerName: f.customerName.trim(), customerPhone: f.customerPhone.trim(), customerCnic: f.customerCnic.trim() || undefined,
      itemDescription: f.itemDescription.trim(), metalType: metalOf(f.testedPurity), claimedPurity: f.claimedPurity, testedPurity: f.testedPurity,
      grossWeight: Number(f.grossWeight), stoneWeight: Number(f.stoneWeight) || 0,
      ...(repair ? { repairCharge: Number(f.charge) || 0 } : { ratePerGram: rate, deductionPct: Number(f.kaat) || 0, testingCharges: Number(f.testing) || 0, paidInCash: f.paidInCash }),
      testedBy: f.testedBy.trim() || undefined, notes: f.notes.trim() || undefined,
    }),
    onSuccess: (e) => { toast.success(repair ? 'Repair darj — parchi print karein' : 'Sona khareeda gaya'); onSaved(e); },
    onError: (e) => setError(apiError(e, 'Save nahi hua')),
  });
  const submit = () => {
    if (!f.customerName.trim()) return setError('Customer ka naam likhein');
    if (repair && !/^[\d+\-\s]{7,20}$/.test(f.customerPhone.trim())) return setError('Customer ka phone likhein');
    if (!f.itemDescription.trim()) return setError('Zewar ki tafseel likhein');
    if (!(Number(f.grossWeight) > 0)) return setError('Wazan likhein');
    if ((Number(f.stoneWeight) || 0) >= Number(f.grossWeight)) return setError('Nag ka wazan kul wazan se kam ho');
    if (!repair && !(rate > 0)) return setError('Rate likhein — is karat ka aaj ka rate set nahi');
    setError('');
    save.mutate();
  };

  return (
    <Modal open onClose={onClose} size="lg" title={repair ? 'Repair ke liye zewar lein' : 'Customer se sona khareedein'}
      description={repair ? 'Zewar, wazan aur charges — parchi customer ko' : 'Tol, test, kaat — qeemat khud banti hai'}
      footer={<><Button variant="ghost" onClick={onClose}>Rehne dein</Button><Button onClick={submit} loading={save.isPending}>{repair ? 'Repair darj karein' : `Khareedein · ${formatPKR(pay)}`}</Button></>}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); submit(); }}
        onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); submit(); } }}>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="Customer" required autoFocus value={f.customerName} onChange={(e) => set({ customerName: e.target.value })} maxLength={80} />
          <Input label="Phone" required={repair} inputMode="tel" value={f.customerPhone} onChange={(e) => set({ customerPhone: e.target.value })} placeholder="03xx xxxxxxx" />
          <Input label="CNIC" value={f.customerCnic} onChange={(e) => set({ customerCnic: e.target.value })} placeholder="35202-xxxxxxx-x" hint={repair ? undefined : 'Khareed par zaroor likhein'} />
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_14rem]">
          <Input label="Zewar" required value={f.itemDescription} onChange={(e) => set({ itemDescription: e.target.value })} placeholder={repair ? 'Jaise: toota hua bunda, size chhota karna' : 'Jaise: purani choori 2 adad'} maxLength={200} />
          <Select label="Kaam" value={f.exchangeType} onChange={(e) => set({ exchangeType: e.target.value })}
            options={(repair ? REPAIR_TYPES : BUY_TYPES).map((t) => ({ value: t, label: exchangeLabel(t) }))} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <ChipPicker label="Customer ne bataya" value={f.claimedPurity} onChange={(p) => set({ claimedPurity: p, testedPurity: p })} options={COMMON_PURITIES.map((p) => ({ value: p, label: purityLabel(p) }))} />
          <ChipPicker label="Test me nikla" value={f.testedPurity} onChange={(p) => set({ testedPurity: p, rate: '' })} options={COMMON_PURITIES.map((p) => ({ value: p, label: purityLabel(p) }))} />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="Kul wazan (g)" required inputMode="decimal" value={f.grossWeight} onChange={(e) => set({ grossWeight: e.target.value.replace(/[^\d.]/g, '') })} />
          <Input label="Nag ka wazan (g)" inputMode="decimal" value={f.stoneWeight} onChange={(e) => set({ stoneWeight: e.target.value.replace(/[^\d.]/g, '') })} hint={`Asal ${grams(net)} · khalis ${grams(net * (PURITY_FACTOR[f.testedPurity] ?? 1))}`} />
          {repair
            ? <Input label="Repair charges (Rs)" inputMode="decimal" value={f.charge} onChange={(e) => set({ charge: e.target.value.replace(/[^\d.]/g, '') })} hint="Wapas dete waqt bill" />
            : <Input label="Rate fi gram" inputMode="decimal" value={f.rate || (autoRate ? String(autoRate) : '')} onChange={(e) => set({ rate: e.target.value.replace(/[^\d.]/g, '') })} hint={autoRate ? 'Aaj ka khareed rate' : 'Rate set nahi — khud likhein'} />}
        </div>
        {!repair && (
          <div className="grid gap-3 sm:grid-cols-3">
            <Input label="Kaat %" inputMode="decimal" value={f.kaat} onChange={(e) => set({ kaat: e.target.value.replace(/[^\d.]/g, '') })} hint={kaat ? `− ${formatPKR(kaat)}` : 'Galai / testing ka farq'} />
            <Input label="Testing charges (Rs)" inputMode="decimal" value={f.testing} onChange={(e) => set({ testing: e.target.value.replace(/[^\d.]/g, '') })} />
            <Input label="Kis ne test kiya" value={f.testedBy} onChange={(e) => set({ testedBy: e.target.value })} maxLength={60} />
          </div>
        )}
        <Textarea label="Note" rows={2} value={f.notes} onChange={(e) => set({ notes: e.target.value })} maxLength={300} />
        {!repair && (
          <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-amber-50 px-4 py-3 ring-1 ring-amber-200">
            <div className="text-[0.875rem] text-amber-900">
              <span className="block">{grams(net)} × {formatPKR(rate)} = {formatPKR(gross)}{kaat ? ` − kaat ${formatPKR(kaat)}` : ''}{Number(f.testing) ? ` − testing ${formatPKR(Number(f.testing))}` : ''}</span>
              <span className="block text-[1.0625rem] font-bold">Customer ko: {formatPKR(pay)}</span>
            </div>
            <div className="ml-auto"><Switch size="sm" label="Cash drawer se diya" checked={f.paidInCash} onChange={(e) => set({ paidInCash: e.target.checked })} /></div>
          </div>
        )}
        {error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-[0.8125rem] font-medium text-rose-700">{error}</p>}
        <p className="text-[0.75rem] text-slate-500">Save: <Kbd>Ctrl</Kbd>+<Kbd>S</Kbd></p>
      </form>
    </Modal>
  );
}
