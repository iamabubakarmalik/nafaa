/**
 * Raw metal (kachcha sona / chandi) by karat: what is in the safe and its
 * value at today's rate, and every movement — purchases, opening stock,
 * old gold taken in, gold given to and taken back from karigars. Purchases,
 * opening stock and corrections are added here; the rest comes from their
 * own screens.
 *
 * Keys: N new entry · / search · 1 entries · 2 balance · G guide.
 */

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowDownLeft, ArrowUpRight, Coins, Filter, GraduationCap, Layers, ListChecks, Plus, Scale, Hammer, Repeat } from 'lucide-react';
import {
  Button, DateRangeMenu, FilterBar, FilterChip, FilterMenu, Input, Kbd, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Select, Skeleton,
  Table, TBody, THead, Td, Th, Tr, Textarea, ViewTabs, heroIconButton, heroPrimaryButton, resolveRange, type DateRangeValue,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton, type PrintDoc } from '@core/print';
import { formatPKR } from '@core/lib/format';
import { useBusinessDayStart } from '@core/lib/business-day';
import { rangeLabel } from '@core/lib/dateRange';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { metalStockApi, type MetalStockEntry } from '../api/metal-stock.api';
import type { Purity } from '../api/metal-rates.api';
import { ChipPicker, EmptyList, KaratPill, LoadFailed, Pager } from '../components/ui';
import { useMetalRates } from '../hooks/useJewelryFacts';
import { ALL_PURITIES, COMMON_PURITIES, ENTRY_LABEL, KEYS, apiError, dayTime, entryLabel, grams, metalOf, purityLabel, r2, r3, rateFor, tola } from '../lib/meta';
import { t as tr } from '@core/i18n';

type Tab = 'entries' | 'balance';
const MANUAL: Array<{ value: string; label: string; hint: string }> = [
  { value: 'PURCHASE', label: tr('Khareed'), hint: tr('Supplier / sarafa se aaya') },
  { value: 'OPENING', label: tr('Shuru ka stock'), hint: tr('Pehli dafa ginti') },
  { value: 'ADJUSTMENT', label: tr('Kami'), hint: tr('Tol me kam, galai ka loss') },
  { value: 'SALE', label: tr('Becha'), hint: tr('Kachcha sona bech diya') },
];

export default function MetalStockPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const startHour = useBusinessDayStart();
  const { cost, costHidden } = useMasked();
  const canAdd = usePermission(PERMISSIONS.STOCK_ADJUSTMENTS_MANAGE);
  const { rates } = useMetalRates();
  const searchRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<Tab>('entries');
  const [purity, setPurity] = useState('');
  const [type, setType] = useState('');
  const [range, setRange] = useState<DateRangeValue>({ preset: 'all', custom: { from: '', to: '' } });
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);

  useEffect(() => { const t = setTimeout(() => setQuery(search.trim()), 250); return () => clearTimeout(t); }, [search]);
  useEffect(() => { setPage(1); }, [purity, type, range, query]);

  const period = resolveRange(range, startHour);
  const q = { page, limit: 30, purity: purity || undefined, metalType: purity ? metalOf(purity) : undefined, entryType: type || undefined, search: query || undefined, ...(period ?? {}) };
  const listQ = useQuery({ queryKey: [KEYS.metal, 'page', q], queryFn: () => metalStockApi.page(q), placeholderData: (p) => p, enabled: tab === 'entries' });
  const balQ = useQuery({ queryKey: [KEYS.metal, 'balance'], queryFn: metalStockApi.balance });

  const balances = (balQ.data ?? []).map((b) => {
    const rate = rateFor(rates, b.metalType, b.purity);
    return { ...b, value: rate ? r2(b.balanceGrams * (rate.buyRate || rate.ratePerGram)) : null };
  });
  const goldGrams = r3(balances.filter((b) => b.metalType === 'GOLD').reduce((s, b) => s + b.balanceGrams, 0));
  const silverGrams = r3(balances.filter((b) => b.metalType === 'SILVER').reduce((s, b) => s + b.balanceGrams, 0));
  const totalValue = r2(balances.reduce((s, b) => s + (b.value ?? 0), 0));

  const filtered = !!purity || !!type || !!query || range.preset !== 'all';
  const clear = () => { setPurity(''); setType(''); setSearch(''); setRange({ preset: 'all', custom: { from: '', to: '' } }); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if ((e.key === 'n' || e.key === 'N') && canAdd) { e.preventDefault(); setAdding(true); }
      if (e.key === '1') setTab('entries');
      if (e.key === '2') setTab('balance');
      if (e.key === '/') { e.preventDefault(); setTab('entries'); window.setTimeout(() => searchRef.current?.focus(), 0); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canAdd]);

  const printDoc = async (): Promise<PrintDoc> => {
    const all = tab === 'entries' ? await metalStockApi.page({ ...q, page: 1, limit: 100 }) : null;
    return {
      title: tab === 'entries' ? tr('Metal stock — entries') : tr('Metal stock — baqi'),
      subtitle: period ? rangeLabel(period.from, period.to) : tr('Sab tareekhen'),
      meta: [[tr('Sona'), grams(goldGrams)], [tr('Chandi'), grams(silverGrams)]],
      sections: [all ? {
        kind: 'table',
        columns: [{ label: tr('Kab') }, { label: tr('Kya') }, { label: tr('Karat') }, { label: tr('Grams'), align: 'right' }, { label: tr('Kis se'), wideOnly: true }, { label: tr('Ref'), wideOnly: true }],
        rows: all.items.map((e) => [dayTime(e.entryDate), entryLabel(e.entryType).label, purityLabel(e.purity), `${entryLabel(e.entryType).in ? '+' : '−'}${r3(e.grams)}`, e.source ?? '', e.reference ?? '']),
      } : {
        kind: 'table',
        columns: [{ label: tr('Karat') }, { label: tr('Grams'), align: 'right' }, { label: tr('Tola'), align: 'right' }, { label: tr('Qeemat'), align: 'right' }],
        rows: balances.map((b) => [purityLabel(b.purity), String(r3(b.balanceGrams)), tola(b.balanceGrams), b.value != null && !costHidden ? formatPKR(b.value) : '—']),
      }],
    };
  };

  const data = listQ.data;
  return (
    <PageShell>
      <PageHero
        title={tr('Metal stock')}
        chip={<><Scale /> {' '}{tr('Kachcha sona · chandi')}</>}
        meta={tr('Tijori ka sona aur chandi, karat ke hisaab se — har aana jana record me')}
        busy={(listQ.isFetching && !listQ.isLoading) || balQ.isFetching}
        loading={balQ.isLoading}
        actions={<>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} /></span>
          <button type="button" onClick={guide.open} title={tr('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canAdd && <button type="button" onClick={() => setAdding(true)} title={tr('Nayi entry (N)')} className={heroPrimaryButton}><Plus className="h-4 w-4" /> {' '}{tr('Entry')}</button>}
        </>}
        stats={[
          { label: tr('Sona'), value: grams(goldGrams), hint: tola(goldGrams) },
          { label: tr('Chandi'), value: grams(silverGrams), hint: tola(silverGrams) },
          { label: tr('Aaj ki qeemat'), value: cost(totalValue), hint: tr('Khareed rate par') },
        ]}
      />

      <KpiRow cols={5}>
        {balQ.isLoading ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />)
          : balances.length === 0 ? <KpiCard icon={Scale} color="#64748b" label={tr('Metal')} value="0 g" hint={tr('Abhi koi entry nahi')} />
            : balances.slice(0, 5).map((b) => (
              <KpiCard key={`${b.metalType}_${b.purity}`} icon={Coins} color={b.metalType === 'SILVER' ? '#64748b' : '#d97706'} label={purityLabel(b.purity)}
                value={grams(b.balanceGrams)} hint={b.value != null ? cost(b.value) : tr('Rate set nahi')}
                onClick={() => { setPurity(b.purity); setTab('entries'); }} active={tab === 'entries' && purity === b.purity} />
            ))}
      </KpiRow>

      {tab === 'entries' && (
        <FilterBar
          search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder={tr('Kis se, reference, entry #…')} label={tr('Search')} />}
          chips={filtered ? <>
            {purity && <FilterChip onRemove={() => setPurity('')}>{purityLabel(purity)}</FilterChip>}
            {type && <FilterChip onRemove={() => setType('')}>{entryLabel(type).label}</FilterChip>}
            {range.preset !== 'all' && period && <FilterChip onRemove={() => setRange({ preset: 'all', custom: { from: '', to: '' } })}>{rangeLabel(period.from, period.to)}</FilterChip>}
            {query && <FilterChip onRemove={() => setSearch('')}>"{query}"</FilterChip>}
          </> : undefined}
          onClear={clear}>
          <FilterMenu icon={Coins} label={purity ? purityLabel(purity) : tr('Karat')} value={purity} active={!!purity} onChange={setPurity}
            options={[{ value: '', label: tr('Sab karat') }, ...ALL_PURITIES.filter((p) => p !== 'OTHER').map((p) => ({ value: p as string, label: purityLabel(p) }))]} />
          <FilterMenu icon={Filter} label={type ? entryLabel(type).label : tr('Entry')} value={type} active={!!type} onChange={setType}
            options={[{ value: '', label: tr('Sab entries') }, ...Object.entries(ENTRY_LABEL).map(([v, m]) => ({ value: v, label: m.label, icon: m.in ? ArrowDownLeft : ArrowUpRight }))]} />
          <DateRangeMenu value={range} onChange={setRange} startHour={startHour} />
        </FilterBar>
      )}

      <ViewTabs value={tab} onChange={setTab}
        hint={<>{canAdd && <><Kbd>N</Kbd> {' '}{tr('entry ·')}{' '} </>}<Kbd>/</Kbd> {' '}{tr('search ·')}{' '} <Kbd>1</Kbd>-<Kbd>2</Kbd> {' '}{tr('tabs')}</>}
        tabs={[{ id: 'entries', label: tr('Entries'), icon: ListChecks, count: data?.total ?? null }, { id: 'balance', label: tr('Baqi'), icon: Layers }]} />

      {tab === 'balance' ? (
        balQ.isError ? <LoadFailed what={tr('Metal stock')} retry={() => balQ.refetch()} />
          : !balances.length ? <EmptyList icon={Scale} title={tr('Tijori me abhi kuch nahi')} text={tr('Shuru ka stock ya khareed ki entry daalein — purana sona aur karigar ka hisaab khud judta hai.')} />
            : (
              <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
                <Table minWidth="36rem">
                  <THead><Tr><Th>{tr('Karat')}</Th><Th align="right">{tr('Grams')}</Th><Th align="right">{tr('Tola')}</Th><Th align="right">{tr('Aaj ki qeemat')}</Th><Th>{tr('Aakhri entry')}</Th></Tr></THead>
                  <TBody>
                    {balances.map((b) => (
                      <Tr key={`${b.metalType}_${b.purity}`} interactive onClick={() => { setPurity(b.purity); setTab('entries'); }}>
                        <Td><KaratPill purity={b.purity} /></Td>
                        <Td align="right" className={b.balanceGrams < 0 ? 'font-semibold text-rose-600' : 'font-semibold'}>{r3(b.balanceGrams)}</Td>
                        <Td align="right">{tola(b.balanceGrams)}</Td>
                        <Td align="right">{b.value != null ? cost(b.value) : '—'}</Td>
                        <Td>{dayTime(b.lastEntryDate)}</Td>
                      </Tr>
                    ))}
                  </TBody>
                </Table>
              </div>
            )
      ) : (<>
        {data && data.total > 0 && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl bg-white px-4 py-2.5 text-[0.8125rem] shadow-sm ring-1 ring-slate-200/80">
            <span className="font-semibold text-slate-900">{tr('{{total}} entries', { total: data.total })}</span>
            <span className="text-emerald-700">{tr('Aaya {{grams}}', { grams: grams(data.totals.in) })}</span>
            <span className="text-rose-700">{tr('Gaya {{out}}', { out: grams(data.totals.out) })}</span>
          </div>
        )}
        {listQ.isLoading ? <Skeleton className="h-64 rounded-3xl" />
          : listQ.isError && !data ? <LoadFailed what={tr('Entries')} retry={() => listQ.refetch()} />
            : !data?.items.length ? (
              <EmptyList icon={Scale} title={filtered ? tr('Is filter me koi entry nahi') : tr('Abhi koi entry nahi')} text={tr('Khareed, shuru ka stock, purana sona aur karigar ka lena dena yahan aata hai.')}>
                {canAdd && <Button onClick={() => setAdding(true)} leftIcon={<Plus className="h-4 w-4" />}>{tr('Pehli entry')}</Button>}
                {filtered && <Button variant="ghost" onClick={clear}>{tr('Filter saaf karein')}</Button>}
              </EmptyList>
            ) : (
              <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
                <Table minWidth="48rem">
                  <THead><Tr><Th>{tr('Kab')}</Th><Th>{tr('Kya')}</Th><Th>{tr('Karat')}</Th><Th align="right">{tr('Grams')}</Th><Th align="right">{tr('Baqi')}</Th><Th>{tr('Kis se / ref')}</Th></Tr></THead>
                  <TBody>
                    {data.items.map((e: MetalStockEntry) => {
                      const m = entryLabel(e.entryType);
                      const Icon = e.entryType === 'EXCHANGE_IN' ? Repeat : e.karigarId ? Hammer : m.in ? ArrowDownLeft : ArrowUpRight;
                      return (
                        <Tr key={e.id}>
                          <Td className="whitespace-nowrap">{dayTime(e.entryDate)}<span className="block text-[0.6875rem] text-slate-400">{e.entryNumber}</span></Td>
                          <Td><span className={`inline-flex items-center gap-1 font-medium ${m.in ? 'text-emerald-700' : 'text-rose-700'}`}><Icon className="h-3.5 w-3.5" />{m.label}</span></Td>
                          <Td><KaratPill purity={e.purity} /></Td>
                          <Td align="right" className={m.in ? 'font-semibold text-emerald-700' : 'font-semibold text-rose-700'}>{m.in ? '+' : '−'}{r3(e.grams)}</Td>
                          <Td align="right">{r3(e.balanceGrams)}</Td>
                          <Td className="max-w-[16rem]"><span className="block truncate">{e.source || '—'}</span><span className="block truncate text-[0.75rem] text-slate-500">{[e.reference, e.notes].filter(Boolean).join(' · ')}</span></Td>
                        </Tr>
                      );
                    })}
                  </TBody>
                </Table>
              </div>
            )}
        {data && <Pager page={page} pages={data.pages} onPage={setPage} />}
      </>)}

      {adding && <EntryModal onClose={() => setAdding(false)} onSaved={() => { setAdding(false); qc.invalidateQueries({ queryKey: [KEYS.metal] }); qc.invalidateQueries({ queryKey: ['jewelry-dashboard'] }); }} />}

      {guide.isOpen && (
        <PageGuide title={tr('Metal stock — aasaan tareeqa')} onClose={guide.close}
          steps={[
            { icon: Plus, color: '#16a34a', title: tr('Pehli dafa'), text: tr('Tijori ka sona karat ke hisaab se tol kar "Shuru ka stock" ki entry daalein.') },
            { icon: ArrowDownLeft, color: '#0891b2', title: tr('Khareed'), text: tr('Sarafa ya supplier se kachcha sona aaye to "Khareed" — grams aur rate likhein.') },
            { icon: Repeat, color: '#a16207', title: tr('Purana sona'), text: tr('Exchange aur bill par liya gaya purana sona khud yahan aa jata hai.') },
            { icon: Hammer, color: '#7c3aed', title: tr('Karigar'), text: tr('Karigar ko diya aur us se wapas aaya sona Karigar page se — yahan khud judta hai.') },
          ]}
          tips={[tr('Tol me farq aaye to "Kami" ki entry wajah ke saath daalein.'), tr('Qeemat aaj ke khareed rate par dikhti hai.')]}
          shortcuts={[['N', tr('nayi entry')], ['/', tr('dhoondein')], ['1', tr('entries')], ['2', tr('baqi')], ['G', tr('guide')]]}
        />
      )}
    </PageShell>
  );
}

function EntryModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [entryType, setEntryType] = useState('PURCHASE');
  const [purity, setPurity] = useState<Purity>('KARAT_24');
  const [gramsIn, setGrams] = useState('');
  const [rate, setRate] = useState('');
  const [source, setSource] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const save = useMutation({
    mutationFn: () => metalStockApi.addEntry({
      entryType, metalType: metalOf(purity), purity, grams: Number(gramsIn), ratePerGram: rate ? Number(rate) : undefined,
      source: source.trim() || undefined, reference: reference.trim() || undefined, notes: notes.trim() || undefined,
    }),
    onSuccess: () => { toast.success(tr('Entry save ho gayi')); onSaved(); },
    onError: (e) => setError(apiError(e, tr('Entry save nahi hui'))),
  });
  const submit = () => {
    if (!(Number(gramsIn) > 0)) { setError(tr('Grams likhein')); return; }
    if (entryType === 'ADJUSTMENT' && !notes.trim()) { setError(tr('Kami ki wajah likhein')); return; }
    setError('');
    save.mutate();
  };
  return (
    <Modal open onClose={onClose} title={tr('Metal ki entry')} description={tr('Khareed, shuru ka stock ya kami')} size="md"
      footer={<><Button variant="ghost" onClick={onClose}>{tr('Rehne dein')}</Button><Button onClick={submit} loading={save.isPending}>{tr('Save karein')}</Button></>}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); submit(); }}
        onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); submit(); } }}>
        <Select label={tr('Entry')} value={entryType} onChange={(e) => setEntryType(e.target.value)} options={MANUAL.map((m) => ({ value: m.value, label: `${m.label} — ${m.hint}` }))} />
        <ChipPicker label={tr('Karat')} value={purity} onChange={setPurity} options={COMMON_PURITIES.map((p) => ({ value: p, label: purityLabel(p) }))} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label={tr('Grams')} required autoFocus inputMode="decimal" value={gramsIn} onChange={(e) => setGrams(e.target.value.replace(/[^\d.]/g, ''))}
            hint={Number(gramsIn) > 0 ? tola(Number(gramsIn)) : tr('Kaante ka wazan')} />
          <Input label={tr('Rate fi gram')} inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value.replace(/[^\d.]/g, ''))} hint={tr('Khareed ka rate (ikhtiyari)')} />
          <Input label={entryType === 'PURCHASE' ? tr('Kis se liya') : tr('Kis se / kahan')} value={source} onChange={(e) => setSource(e.target.value)} maxLength={80} />
          <Input label={tr('Reference')} value={reference} onChange={(e) => setReference(e.target.value)} placeholder={tr('Bill / parchi number')} maxLength={60} />
        </div>
        <Textarea label={entryType === 'ADJUSTMENT' ? tr('Wajah') : tr('Note')} value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={300} required={entryType === 'ADJUSTMENT'} />
        {Number(gramsIn) > 0 && Number(rate) > 0 && <p className="text-[0.8125rem] text-slate-600">{tr('Kul qeemat:')}{' '} <b>{formatPKR(Number(gramsIn) * Number(rate))}</b></p>}
        {error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-[0.8125rem] font-medium text-rose-700">{error}</p>}
        <p className="text-[0.75rem] text-slate-500">{tr('Save:')}{' '} <Kbd>Ctrl</Kbd>+<Kbd>S</Kbd></p>
      </form>
    </Modal>
  );
}
