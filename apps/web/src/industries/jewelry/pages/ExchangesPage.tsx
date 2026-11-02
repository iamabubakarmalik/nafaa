/**
 * Old gold bought across the counter.
 *
 * Buying: weigh, test the karat, take the stones off, value at today's
 * buying rate less kaat; the metal goes into metal stock and cash paid
 * leaves the drawer. A slip for the customer (with CNIC) prints from the
 * row. Gold weighed in at the counter for a bill shows here too; if no bill
 * used it, it can be handed back to the customer. Repairs have their own
 * page; the old ?tab=repair link opens it.
 *
 * Keys: N new · / search · G guide.
 */

import { useEffect, useRef, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { GraduationCap, Plus, Printer, Repeat, Scale, ShieldCheck, Undo2, Wallet } from 'lucide-react';
import {
  Button, DateRangeMenu, FilterBar, FilterChip, Input, Kbd, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Select, Skeleton,
  Switch, Table, TBody, THead, Td, Th, Tr, Textarea, heroIconButton, heroPrimaryButton, resolveRange, type DateRangeValue,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton, type PrintDoc } from '@core/print';
import { formatPKR } from '@core/lib/format';
import { useBusinessDayStart } from '@core/lib/business-day';
import { rangeLabel } from '@core/lib/dateRange';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { exchangesApi, type Exchange } from '../api/exchanges.api';
import type { Purity } from '../api/metal-rates.api';
import { ChipPicker, EmptyList, KaratPill, LoadFailed, Pager } from '../components/ui';
import { useMetalRates } from '../hooks/useJewelryFacts';
import { COMMON_PURITIES, KEYS, PURITY_FACTOR, apiError, dayTime, exchangeLabel, grams, metalOf, purityLabel, r2, r3, rateFor } from '../lib/meta';
import { t as tr } from '@core/i18n';

const BUY_TYPES = ['OLD_GOLD_EXCHANGE', 'BROKEN_JEWELRY', 'COIN_EXCHANGE', 'PURE_METAL_DEPOSIT', 'OLD_SILVER_EXCHANGE'];
/** Gold weighed in for a bill that no bill has used yet. */
const isOpenBillGold = (e: Exchange) => e.purpose === 'SALE' && !e.saleId;
const PURPOSE_NOTE: Record<string, string> = { SALE: tr(' · bill par'), ORDER: tr(' · order advance'), RETURNED: tr(' · customer ko wapas') };

function slip(e: Exchange): PrintDoc {
  const forBill = e.purpose === 'SALE';
  return {
    title: forBill ? 'Purana sona — bill ke liye parchi' : 'Purana sona — khareed parchi', // i18n-ignore
    subtitle: `${e.exchangeNumber} · ${dayTime(e.exchangeDate)}`,
    meta: [['Customer', e.customerName], ...(e.customerPhone ? [['Phone', e.customerPhone] as [string, string]] : []), ...(e.customerCnic ? [['CNIC', e.customerCnic] as [string, string]] : [])], // i18n-ignore
    sections: [{
      kind: 'rows',
      rows: [
        { label: 'Zewar', value: e.itemDescription }, // i18n-ignore
        { label: 'Type', value: exchangeLabel(e.exchangeType) }, // i18n-ignore
        { label: 'Karat', value: purityLabel(e.testedPurity ?? e.claimedPurity) }, // i18n-ignore
        { label: 'Kul wazan', value: grams(e.grossWeight) }, // i18n-ignore
        ...(e.stoneWeight ? [{ label: 'Nag', value: grams(e.stoneWeight) }] : []), // i18n-ignore
        { label: 'Asal wazan', value: grams(e.netWeight ?? e.grossWeight) }, // i18n-ignore
        { label: 'Rate fi gram', value: formatPKR(e.ratePerGram) }, // i18n-ignore
        { label: 'Qeemat', value: formatPKR(e.grossValue) }, // i18n-ignore
        ...(e.deductions ? [{ label: 'Kaat', value: `− ${formatPKR(e.deductions)}`, sub: true }] : []), // i18n-ignore
        ...(e.testingCharges ? [{ label: 'Testing', value: `− ${formatPKR(e.testingCharges)}`, sub: true }] : []), // i18n-ignore
        { label: forBill ? 'Bill me katega' : 'Customer ko diya', value: formatPKR(e.netValue), strong: true }, // i18n-ignore
      ],
    }],
    footer: forBill ? 'Yeh qeemat bill me trade-in ke taur par kategi.' : 'Customer ne zewar apni marzi se becha. Dastakhat: ____________', // i18n-ignore
  };
}

export default function ExchangesPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const startHour = useBusinessDayStart();
  const [params] = useSearchParams();
  const canBuy = usePermission(PERMISSIONS.PURCHASES_CREATE);
  const canCounter = usePermission(PERMISSIONS.POS_USE);
  const searchRef = useRef<HTMLInputElement>(null);

  const [range, setRange] = useState<DateRangeValue>({ preset: 'thisMonth', custom: { from: '', to: '' } });
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(false);
  const [giveBack, setGiveBack] = useState<Exchange | null>(null);

  useEffect(() => { const t = setTimeout(() => setQuery(search.trim()), 250); return () => clearTimeout(t); }, [search]);
  useEffect(() => { setPage(1); }, [range, query]);

  const period = resolveRange(range, startHour);
  const q = { kind: 'buy' as const, page, limit: 30, search: query || undefined, ...(period ?? {}) };
  const listQ = useQuery({ queryKey: [KEYS.exchanges, 'page', q], queryFn: () => exchangesApi.page(q), placeholderData: (p) => p });
  const data = listQ.data;
  const filtered = !!query;

  const giveBackM = useMutation({
    mutationFn: (e: Exchange) => exchangesApi.giveBack(e.id),
    onSuccess: () => { toast.success(tr('Purana sona customer ko wapas — metal stock se nikal gaya')); setGiveBack(null); [KEYS.exchanges, KEYS.metal].forEach((k) => qc.invalidateQueries({ queryKey: [k] })); },
    onError: (e) => toast.error(apiError(e, tr('Wapas nahi hua'))),
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if ((e.key === 'n' || e.key === 'N') && canBuy) { e.preventDefault(); setForm(true); }
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canBuy]);

  if (params.get('tab') === 'repair') return <Navigate to="/jewelry/repairs" replace />;

  const printDoc = async (): Promise<PrintDoc> => {
    const all = await exchangesApi.page({ ...q, page: 1, limit: 100 });
    return {
      title: tr('Purana sona khareeda'),
      subtitle: period ? rangeLabel(period.from, period.to) : tr('Sab tareekhen'),
      meta: [[tr('Kul'), String(all.total)], [tr('Wazan'), grams(all.totals.grams)], [tr('Qeemat'), formatPKR(all.totals.value)]],
      sections: [{
        kind: 'table',
        columns: [{ label: tr('Kab') }, { label: '#', wideOnly: true }, { label: tr('Customer') }, { label: tr('Karat') }, { label: tr('Grams'), align: 'right' }, { label: 'Rs', align: 'right' }],
        rows: all.items.map((e) => [dayTime(e.exchangeDate), e.exchangeNumber, e.customerName, purityLabel(e.testedPurity ?? e.claimedPurity), String(r3(e.netWeight ?? e.grossWeight)), formatPKR(e.netValue)]),
      }],
    };
  };

  return (
    <PageShell>
      <PageHero
        title={tr('Purana sona')}
        chip={<><Repeat /> {' '}{tr('Exchange')}</>}
        meta={tr('Customer se sona khareedein — tol, test, kaat aur parchi')}
        busy={listQ.isFetching && !listQ.isLoading}
        loading={listQ.isLoading}
        actions={<>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} disabled={!data?.items.length} /></span>
          <button type="button" onClick={guide.open} title={tr('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canBuy && <button type="button" onClick={() => setForm(true)} title={tr('Naya (N)')} className={heroPrimaryButton}><Plus className="h-4 w-4" /> {' '}{tr('Sona khareedein')}</button>}
        </>}
        stats={data ? [
          { label: tr('Khareeda'), value: data.total, hint: period ? rangeLabel(period.from, period.to) : undefined },
          { label: tr('Wazan'), value: grams(data.totals.grams), hint: tr('Khalis {{fine}}', { fine: grams(data.totals.fine) }) },
          { label: tr('Diya'), value: formatPKR(data.totals.value) },
        ] : [{ label: tr('Khareeda'), value: '—' }]}
      />

      <KpiRow cols={3}>
        <KpiCard icon={Scale} color="#d97706" label={tr('Wazan aaya')} value={data ? grams(data.totals.grams) : '—'} hint={tr('Is period me')} />
        <KpiCard icon={Wallet} color="#0891b2" label={tr('Customer ko diya')} value={data ? formatPKR(data.totals.value) : '—'} hint={tr('Bill par liya sona bhi shamil')} />
        <KpiCard icon={ShieldCheck} color="#16a34a" label={tr('Kaat (dukaan ko)')} value={data ? formatPKR(data.totals.deductions) : '—'} hint={tr('Testing / galai ka farq')} />
      </KpiRow>

      <FilterBar
        search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder={tr('Customer, phone, CNIC, parchi #, zewar…')} label={tr('Search')} />}
        chips={filtered ? <FilterChip onRemove={() => setSearch('')}>"{query}"</FilterChip> : undefined}
        onClear={() => setSearch('')}>
        <DateRangeMenu value={range} onChange={setRange} startHour={startHour} defaultPreset="thisMonth" />
      </FilterBar>

      {listQ.isLoading ? <Skeleton className="h-64 rounded-3xl" />
        : listQ.isError && !data ? <LoadFailed what={tr('Record')} retry={() => listQ.refetch()} />
          : !data?.items.length ? (
            <EmptyList icon={Repeat} title={filtered ? tr('Is filter me kuch nahi') : tr('Is period me koi sona nahi khareeda')}
              text={tr('Customer ka sona tol kar, karat test karke aur kaat laga kar khareedein — sona metal stock me jata hai.')}>
              {canBuy && <Button onClick={() => setForm(true)} leftIcon={<Plus className="h-4 w-4" />}>{tr('Sona khareedein')}</Button>}
            </EmptyList>
          ) : (
            <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
              <Table minWidth="52rem">
                <THead><Tr><Th>{tr('Kab')}</Th><Th>{tr('Customer')}</Th><Th>{tr('Zewar')}</Th><Th>{tr('Karat')}</Th><Th align="right">{tr('Wazan')}</Th><Th align="right">{tr('Qeemat')}</Th><Th align="right">{tr('Kaam')}</Th></Tr></THead>
                <TBody>
                  {data.items.map((e) => (
                    <Tr key={e.id}>
                      <Td className="whitespace-nowrap">{dayTime(e.exchangeDate)}<span className="block text-[0.6875rem] text-slate-400">{e.exchangeNumber}</span></Td>
                      <Td><span className="block font-medium text-slate-900">{e.customerName}</span><span className="block text-[0.75rem] text-slate-500">{[e.customerPhone, e.customerCnic].filter(Boolean).join(' · ')}</span></Td>
                      <Td className="max-w-[16rem]"><span className="block truncate">{e.itemDescription}</span><span className="block text-[0.75rem] text-slate-500">{exchangeLabel(e.exchangeType)}{isOpenBillGold(e) ? tr(' · bill ka intezar') : PURPOSE_NOTE[e.purpose ?? ''] ?? ''}</span></Td>
                      <Td><KaratPill purity={e.testedPurity ?? e.claimedPurity} /></Td>
                      <Td align="right">{grams(e.netWeight ?? e.grossWeight)}</Td>
                      <Td align="right" className="font-semibold">{formatPKR(e.netValue)}{e.deductions > 0 && <span className="block text-[0.6875rem] font-normal text-slate-500">{tr('kaat {{deductions}}', { deductions: formatPKR(e.deductions) })}</span>}</Td>
                      <Td align="right">
                        <div className="flex items-center justify-end gap-1.5">
                          <PrintButton doc={() => slip(e)} size="sm" label={tr('Parchi')} />
                          {isOpenBillGold(e) && canCounter && <Button size="sm" variant="secondary" onClick={() => setGiveBack(e)} leftIcon={<Undo2 className="h-4 w-4" />}>{tr('Wapas dein')}</Button>}
                        </div>
                      </Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            </div>
          )}
      {data && <Pager page={page} pages={data.pages} onPage={setPage} />}

      {form && <ExchangeForm onClose={() => setForm(false)} onSaved={(e) => {
        setForm(false);
        [KEYS.exchanges, KEYS.metal, 'cash-register', 'jewelry-dashboard'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
        if ('paidFromDrawer' in e && e.paidFromDrawer === false) toast.warning(tr('Register band hai — drawer se nikla cash record nahi hua'));
      }} />}
      {giveBack && (
        <Modal open onClose={() => setGiveBack(null)} title={tr('{{exchangeNumber}} wapas karein?', { exchangeNumber: giveBack.exchangeNumber })}
          description={tr('{{customerName}} ka {{grams}} sona bill ke liye liya tha — bill nahi bana', { customerName: giveBack.customerName, grams: grams(giveBack.netWeight ?? giveBack.grossWeight) })}
          footer={<><Button variant="ghost" onClick={() => setGiveBack(null)}>{tr('Rehne dein')}</Button><Button loading={giveBackM.isPending} onClick={() => giveBackM.mutate(giveBack)}>{tr('Customer ko wapas')}</Button></>}>
          <p className="text-[0.875rem] text-slate-600">{tr('Sona metal stock se nikal jayega aur yeh record band ho jayega. Paise ka koi lena dena nahi hota.')}</p>
        </Modal>
      )}

      {guide.isOpen && (
        <PageGuide title={tr('Purana sona — aasaan tareeqa')} onClose={guide.close}
          steps={[
            { icon: Scale, color: '#d97706', title: tr('Tolna aur test'), text: tr('Kul wazan aur nag ka wazan likhein, karat test karke chunein. Qeemat aaj ke khareed rate se khud banti hai.') },
            { icon: ShieldCheck, color: '#16a34a', title: tr('Kaat'), text: tr('Galai ya testing ka kaat % likhein — customer ko kam milta hai, farq dukaan ka.') },
            { icon: Wallet, color: '#0891b2', title: tr('Cash drawer se'), text: tr('"Cash drawer se diya" on ho to paisa register se nikalta hai, taake shaam ka hisaab sahi rahe.') },
            { icon: Printer, color: '#ea580c', title: tr('Parchi'), text: tr('Har row se parchi print karein — khareed par customer ka CNIC aur dastakhat.') },
          ]}
          tips={[tr('Counter par bill ke liye liya gaya purana sona bhi yahan "bill par" ke saath dikhta hai.'), tr('Bill na bane to "Wapas dein" se sona customer ko lauta dein.'), tr('Repair ab alag "Repair" page par hai.')]}
          shortcuts={[['N', tr('naya')], ['/', tr('dhoondein')], ['G', tr('guide')]]}
        />
      )}
    </PageShell>
  );
}

function ExchangeForm({ onClose, onSaved }: { onClose: () => void; onSaved: (e: Exchange & { paidFromDrawer?: boolean }) => void }) {
  const { rates } = useMetalRates();
  const [f, setF] = useState({
    exchangeType: 'OLD_GOLD_EXCHANGE', customerName: '', customerPhone: '', customerCnic: '', itemDescription: '',
    claimedPurity: 'KARAT_22' as Purity, testedPurity: 'KARAT_22' as Purity, grossWeight: '', stoneWeight: '', rate: '', kaat: '0', testing: '',
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
      ratePerGram: rate, deductionPct: Number(f.kaat) || 0, testingCharges: Number(f.testing) || 0, paidInCash: f.paidInCash,
      testedBy: f.testedBy.trim() || undefined, notes: f.notes.trim() || undefined,
    }),
    onSuccess: (e) => { toast.success(tr('Sona khareeda gaya')); onSaved(e); },
    onError: (e) => setError(apiError(e, tr('Save nahi hua'))),
  });
  const submit = () => {
    if (!f.customerName.trim()) return setError(tr('Customer ka naam likhein'));
    if (!f.itemDescription.trim()) return setError(tr('Zewar ki tafseel likhein'));
    if (!(Number(f.grossWeight) > 0)) return setError(tr('Wazan likhein'));
    if ((Number(f.stoneWeight) || 0) >= Number(f.grossWeight)) return setError(tr('Nag ka wazan kul wazan se kam ho'));
    if (!(rate > 0)) return setError(tr('Rate likhein — is karat ka aaj ka rate set nahi'));
    setError('');
    save.mutate();
  };

  return (
    <Modal open onClose={onClose} size="lg" title={tr('Customer se sona khareedein')}
      description={tr('Tol, test, kaat — qeemat khud banti hai')}
      footer={<><Button variant="ghost" onClick={onClose}>{tr('Rehne dein')}</Button><Button onClick={submit} loading={save.isPending}>{tr('Khareedein · {{pay}}', { pay: formatPKR(pay) })}</Button></>}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); submit(); }}
        onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); submit(); } }}>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label={tr('Customer')} required autoFocus value={f.customerName} onChange={(e) => set({ customerName: e.target.value })} maxLength={80} />
          <Input label={tr('Phone')} inputMode="tel" value={f.customerPhone} onChange={(e) => set({ customerPhone: e.target.value })} placeholder={tr('03xx xxxxxxx')} />
          <Input label={tr('CNIC')} value={f.customerCnic} onChange={(e) => set({ customerCnic: e.target.value })} placeholder="35202-xxxxxxx-x" hint={tr('Khareed par zaroor likhein')} />
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_14rem]">
          <Input label={tr('Zewar')} required value={f.itemDescription} onChange={(e) => set({ itemDescription: e.target.value })} placeholder={tr('Jaise: purani choori 2 adad')} maxLength={200} />
          <Select label={tr('Kaam')} value={f.exchangeType} onChange={(e) => set({ exchangeType: e.target.value })}
            options={BUY_TYPES.map((t) => ({ value: t, label: exchangeLabel(t) }))} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <ChipPicker label={tr('Customer ne bataya')} value={f.claimedPurity} onChange={(p) => set({ claimedPurity: p, testedPurity: p })} options={COMMON_PURITIES.map((p) => ({ value: p, label: purityLabel(p) }))} />
          <ChipPicker label={tr('Test me nikla')} value={f.testedPurity} onChange={(p) => set({ testedPurity: p, rate: '' })} options={COMMON_PURITIES.map((p) => ({ value: p, label: purityLabel(p) }))} />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label={tr('Kul wazan (g)')} required inputMode="decimal" value={f.grossWeight} onChange={(e) => set({ grossWeight: e.target.value.replace(/[^\d.]/g, '') })} />
          <Input label={tr('Nag ka wazan (g)')} inputMode="decimal" value={f.stoneWeight} onChange={(e) => set({ stoneWeight: e.target.value.replace(/[^\d.]/g, '') })} hint={tr('Asal {{net}} · khalis {{grams}}', { net: grams(net), grams: grams(net * (PURITY_FACTOR[f.testedPurity] ?? 1)) })} />
          <Input label={tr('Rate fi gram')} inputMode="decimal" value={f.rate || (autoRate ? String(autoRate) : '')} onChange={(e) => set({ rate: e.target.value.replace(/[^\d.]/g, '') })} hint={autoRate ? tr('Aaj ka khareed rate') : tr('Rate set nahi — khud likhein')} />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label={tr('Kaat %')} inputMode="decimal" value={f.kaat} onChange={(e) => set({ kaat: e.target.value.replace(/[^\d.]/g, '') })} hint={kaat ? `− ${formatPKR(kaat)}` : tr('Galai / testing ka farq')} />
          <Input label={tr('Testing charges (Rs)')} inputMode="decimal" value={f.testing} onChange={(e) => set({ testing: e.target.value.replace(/[^\d.]/g, '') })} />
          <Input label={tr('Kis ne test kiya')} value={f.testedBy} onChange={(e) => set({ testedBy: e.target.value })} maxLength={60} />
        </div>
        <Textarea label={tr('Note')} rows={2} value={f.notes} onChange={(e) => set({ notes: e.target.value })} maxLength={300} />
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-amber-50 px-4 py-3 ring-1 ring-amber-200">
          <div className="text-[0.875rem] text-amber-900">
            <span className="block">{grams(net)} × {formatPKR(rate)} = {formatPKR(gross)}{kaat ? tr(' − kaat {{kaat}}', { kaat: formatPKR(kaat) }) : ''}{Number(f.testing) ? tr(' − testing {{formatPKR}}', { formatPKR: formatPKR(Number(f.testing)) }) : ''}</span>
            <span className="block text-[1.0625rem] font-bold">{tr('Customer ko: {{pay}}', { pay: formatPKR(pay) })}</span>
          </div>
          <div className="ms-auto"><Switch size="sm" label={tr('Cash drawer se diya')} checked={f.paidInCash} onChange={(e) => set({ paidInCash: e.target.checked })} /></div>
        </div>
        {error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-[0.8125rem] font-medium text-rose-700">{error}</p>}
        <p className="text-[0.75rem] text-slate-500">{tr('Save:')}{' '} <Kbd>Ctrl</Kbd>+<Kbd>S</Kbd></p>
      </form>
    </Modal>
  );
}
