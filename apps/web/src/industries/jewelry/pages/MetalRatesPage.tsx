/**
 * Today's metal rates. The shop types the 24K rate (per tola, as the
 * market quotes it, or per gram); 22K, 21K and 18K follow from their purity
 * and can be changed. The buying rate for old gold is the selling rate less
 * a percent. Every bill and every piece's price uses these rates. History
 * of past rates with filter and print.
 *
 * Keys: Ctrl+S save · 1 rates · 2 history · G guide.
 */

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Coins, GraduationCap, History, Percent, Save, TrendingDown, TrendingUp } from 'lucide-react';
import {
  Button, FilterBar, FilterMenu, Kbd, KpiCard, KpiRow, PageHero, PageShell, Skeleton, Table, TBody, THead, Td, Th, Tr, ViewTabs, heroIconButton,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton, type PrintDoc } from '@core/print';
import { formatPKR } from '@core/lib/format';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { metalRatesApi, type MetalRate, type Purity } from '../api/metal-rates.api';
import { EmptyList, LoadFailed } from '../components/ui';
import { KEYS, PURITY_FACTOR, TOLA, apiError, dayTime, metalOf, purityLabel, r2 } from '../lib/meta';

type Tab = 'rates' | 'history';
const GOLD: Purity[] = ['KARAT_24', 'KARAT_22', 'KARAT_21', 'KARAT_18'];
const SILVER: Purity = 'SILVER_999';
const ALL: Purity[] = [...GOLD, SILVER];

const perGram = (v: number, unit: 'tola' | 'gram') => (unit === 'tola' ? v / TOLA : v);
const fromGram = (g: number, unit: 'tola' | 'gram') => Math.round(unit === 'tola' ? g * TOLA : g);

export default function MetalRatesPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const canEdit = usePermission(PERMISSIONS.PRODUCTS_EDIT);
  const [tab, setTab] = useState<Tab>('rates');
  const [unit, setUnit] = useState<'tola' | 'gram'>('tola');
  const [base, setBase] = useState('');
  const [own, setOwn] = useState<Partial<Record<Purity, string>>>({});
  const [silver, setSilver] = useState('');
  const [buyCut, setBuyCut] = useState('2');
  const [filter, setFilter] = useState<string>('');

  const currentQ = useQuery({ queryKey: [KEYS.rates, 'current'], queryFn: metalRatesApi.current, staleTime: 60_000 });
  const historyQ = useQuery({ queryKey: [KEYS.rates, 'history', filter], queryFn: () => metalRatesApi.history({ limit: 100, ...(filter && { purity: filter, metalType: metalOf(filter) }) }) });
  const current = useMemo(() => new Map((currentQ.data ?? []).map((r) => [r.purity, r])), [currentQ.data]);
  const previous = useMemo(() => {
    // Last inactive rate per karat, to show the change.
    const m = new Map<string, MetalRate>();
    for (const r of historyQ.data ?? []) if (!r.isActive && !m.has(r.purity)) m.set(r.purity, r);
    return m;
  }, [historyQ.data]);
  const latest = (currentQ.data ?? []).reduce<string | null>((a, r) => (!a || r.effectiveDate > a ? r.effectiveDate : a), null);

  // Fill the form from today's rates once.
  useEffect(() => {
    if (!currentQ.data || base) return;
    const k24 = current.get('KARAT_24');
    if (k24) setBase(String(fromGram(k24.ratePerGram, unit)));
    const s = current.get(SILVER);
    if (s) setSilver(String(fromGram(s.ratePerGram, unit)));
    const k22 = current.get('KARAT_22');
    if (k22?.buyRate && k22.ratePerGram) setBuyCut(String(r2((1 - k22.buyRate / k22.ratePerGram) * 100)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQ.data]);

  const baseGram = perGram(Number(base) || 0, unit);
  const derived = (p: Purity) => {
    const typed = own[p];
    if (typed !== undefined && typed !== '') return perGram(Number(typed) || 0, unit);
    return p === 'KARAT_24' ? baseGram : baseGram * ((PURITY_FACTOR[p] ?? 1) / PURITY_FACTOR.KARAT_24);
  };
  const cut = Math.min(Math.max(Number(buyCut) || 0, 0), 20);
  const rows = [
    ...GOLD.map((p) => ({ purity: p, gram: r2(derived(p)) })),
    ...(Number(silver) > 0 ? [{ purity: SILVER, gram: r2(perGram(Number(silver), unit)) }] : []),
  ].filter((r) => r.gram > 0);

  const save = useMutation({
    mutationFn: () => metalRatesApi.bulk(rows.map((r) => ({
      metalType: metalOf(r.purity), purity: r.purity, ratePerGram: r.gram, buyRate: r2(r.gram * (1 - cut / 100)), source: 'Dukaan',
    }))),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEYS.rates] });
      qc.invalidateQueries({ queryKey: ['jewelry-dashboard'] });
      setOwn({});
      toast.success('Aaj ka rate save ho gaya — POS par naya rate lagega');
    },
    onError: (e) => toast.error(apiError(e, 'Rate save nahi hua')),
  });
  const submit = () => {
    if (!canEdit) { toast.error('Rate badalne ki permission nahi'); return; }
    if (!(baseGram > 0)) { toast.error('24K ka rate likhein'); return; }
    save.mutate();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (tab === 'rates') submit(); return; }
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if (e.key === '1') setTab('rates');
      if (e.key === '2') setTab('history');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const printDoc = (): PrintDoc => ({
    title: 'Aaj ka rate',
    subtitle: latest ? dayTime(latest) : undefined,
    sections: [{
      kind: 'table',
      columns: [{ label: 'Karat' }, { label: 'Fi gram', align: 'right' }, { label: 'Fi tola', align: 'right' }, { label: 'Khareed / g', align: 'right', wideOnly: true }],
      rows: ALL.filter((p) => current.has(p)).map((p) => {
        const r = current.get(p)!;
        return [purityLabel(p), formatPKR(r.ratePerGram), formatPKR(r.ratePerTola ?? r.ratePerGram * TOLA), r.buyRate ? formatPKR(r.buyRate) : '—'];
      }),
    }],
  });

  const stale = latest ? (Date.now() - new Date(latest).getTime()) / 86_400_000 >= 1 : true;

  return (
    <PageShell>
      <PageHero
        title="Aaj ka rate"
        chip={<><Coins /> Sona · chandi</>}
        meta={latest ? `Aakhri dafa ${dayTime(latest)}${stale ? ' — aaj update karein' : ''}` : 'Abhi koi rate nahi — pehla rate likhein'}
        busy={currentQ.isFetching && !currentQ.isLoading}
        loading={currentQ.isLoading}
        actions={<>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} disabled={!current.size} /></span>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
        </>}
        stats={[
          { label: '24K fi tola', value: current.get('KARAT_24') ? formatPKR(current.get('KARAT_24')!.ratePerTola ?? 0) : '—' },
          { label: '22K fi tola', value: current.get('KARAT_22') ? formatPKR(current.get('KARAT_22')!.ratePerTola ?? 0) : '—' },
          { label: 'Chandi fi tola', value: current.get(SILVER) ? formatPKR(current.get(SILVER)!.ratePerTola ?? 0) : '—' },
        ]}
      />

      <KpiRow cols={5}>
        {currentQ.isLoading ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : ALL.map((p) => {
          const r = current.get(p);
          const prev = previous.get(p);
          const diff = r && prev ? r2(r.ratePerGram - prev.ratePerGram) : 0;
          return (
            <KpiCard key={p} icon={diff < 0 ? TrendingDown : TrendingUp} color={p === SILVER ? '#64748b' : '#d97706'} label={`${purityLabel(p)} fi gram`}
              value={r ? formatPKR(r.ratePerGram) : '—'}
              hint={!r ? 'Set nahi' : diff ? `${diff > 0 ? '+' : ''}${formatPKR(diff)} pichle se` : `Tola ${formatPKR(r.ratePerTola ?? 0)}`}
              onClick={() => { setFilter(p); setTab('history'); }} active={tab === 'history' && filter === p} />
          );
        })}
      </KpiRow>

      <ViewTabs value={tab} onChange={setTab}
        hint={<><Kbd>Ctrl</Kbd>+<Kbd>S</Kbd> save · <Kbd>1</Kbd>-<Kbd>2</Kbd> tabs</>}
        tabs={[{ id: 'rates', label: 'Rate likhein', icon: Coins }, { id: 'history', label: 'Purane rate', icon: History, count: historyQ.data?.length ?? null }]} />

      {tab === 'rates' ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <section className="space-y-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[1rem] font-bold text-slate-900">Aaj ka rate likhein</h2>
              <div role="radiogroup" aria-label="Rate kis hisaab se" className="ml-auto inline-flex rounded-xl bg-slate-100 p-1">
                {(['tola', 'gram'] as const).map((u) => (
                  <button key={u} type="button" role="radio" aria-checked={unit === u} onClick={() => {
                    setUnit(u);
                    if (base) setBase(String(fromGram(baseGram, u)));
                    if (silver) setSilver(String(fromGram(perGram(Number(silver), unit), u)));
                    setOwn({});
                  }} className={`h-8 rounded-lg px-3 text-[0.8125rem] font-semibold ${unit === u ? 'bg-white shadow text-slate-900' : 'text-slate-600'}`}>Fi {u}</button>
                ))}
              </div>
            </div>
            <label className="block">
              <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">24K sona — fi {unit} <span className="text-rose-600">*</span></span>
              <input inputMode="decimal" autoFocus value={base} onChange={(e) => { setBase(e.target.value.replace(/[^\d.]/g, '')); setOwn({}); }} placeholder={unit === 'tola' ? '355000' : '30450'}
                className="h-12 w-full rounded-xl border border-slate-300 px-4 text-[1.125rem] font-bold tabular-nums outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20" />
              <span className="mt-1 block text-[0.75rem] text-slate-500">Sarafa market ka rate. Neeche ke karat isi se bante hain — chahein to badal dein.</span>
            </label>
            <div className="grid gap-3 sm:grid-cols-3">
              {GOLD.slice(1).map((p) => (
                <label key={p} className="block">
                  <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">{purityLabel(p)} — fi {unit}</span>
                  <input inputMode="decimal" value={own[p] ?? (baseGram ? String(fromGram(derived(p), unit)) : '')}
                    onChange={(e) => setOwn({ ...own, [p]: e.target.value.replace(/[^\d.]/g, '') })}
                    className="h-10 w-full rounded-xl border border-slate-300 px-3 text-[0.9375rem] font-semibold tabular-nums outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20" />
                  <span className="mt-1 block text-[0.6875rem] text-slate-500">{Math.round((PURITY_FACTOR[p] ?? 0) * 1000) / 10}% khalis</span>
                </label>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Chandi — fi {unit}</span>
                <input inputMode="decimal" value={silver} onChange={(e) => setSilver(e.target.value.replace(/[^\d.]/g, ''))} placeholder="Ikhtiyari"
                  className="h-10 w-full rounded-xl border border-slate-300 px-3 text-[0.9375rem] font-semibold tabular-nums outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20" />
              </label>
              <label className="block">
                <span className="mb-1.5 flex items-center gap-1 text-[0.8125rem] font-medium text-slate-700"><Percent className="h-3.5 w-3.5" />Purana sona kitna kam par khareedein</span>
                <input inputMode="decimal" value={buyCut} onChange={(e) => setBuyCut(e.target.value.replace(/[^\d.]/g, ''))}
                  className="h-10 w-full rounded-xl border border-slate-300 px-3 text-[0.9375rem] font-semibold tabular-nums outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20" />
                <span className="mt-1 block text-[0.6875rem] text-slate-500">Khareed rate = bechne ka rate − {cut}% (kaat alag se exchange par)</span>
              </label>
            </div>
            <div className="flex justify-end">
              <Button onClick={submit} loading={save.isPending} disabled={!canEdit || !(baseGram > 0)} leftIcon={<Save className="h-4 w-4" />}>Rate save karein</Button>
            </div>
            {!canEdit && <p className="text-right text-[0.75rem] text-slate-500">Rate badalne ke liye "Products edit" ki permission chahiye.</p>}
          </section>

          <aside className="space-y-3 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80">
            <h3 className="text-[0.9375rem] font-bold text-slate-900">Save hone wale rate</h3>
            {rows.length === 0 ? <p className="text-[0.8125rem] text-slate-500">24K ka rate likhein</p> : (
              <ul className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <li key={r.purity} className="flex items-center justify-between gap-2 py-2 text-[0.875rem]">
                    <span className="font-semibold text-slate-800">{purityLabel(r.purity)}</span>
                    <span className="text-right tabular-nums">
                      <span className="block font-semibold">{formatPKR(r.gram)}/g</span>
                      <span className="block text-[0.75rem] text-slate-500">{formatPKR(r.gram * TOLA)}/tola · khareed {formatPKR(r2(r.gram * (1 - cut / 100)))}/g</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        </div>
      ) : (<>
        <FilterBar search={<p className="flex min-w-0 flex-1 items-center text-[0.8125rem] text-slate-500">Har badla hua rate yahan rehta hai — purane bill usi din ke rate par hain</p>}>
          <FilterMenu icon={Coins} label={filter ? purityLabel(filter) : 'Sab karat'} value={filter} active={!!filter} onChange={setFilter}
            options={[{ value: '', label: 'Sab karat' }, ...ALL.map((p) => ({ value: p as string, label: purityLabel(p) }))]} />
        </FilterBar>
        {historyQ.isLoading ? <Skeleton className="h-64 rounded-3xl" />
          : historyQ.isError ? <LoadFailed what="Rate" retry={() => historyQ.refetch()} />
            : !historyQ.data?.length ? <EmptyList icon={History} title="Abhi koi rate nahi" text="Pehla rate likhte hi yahan history banti jayegi." />
              : (
                <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
                  <Table minWidth="40rem">
                    <THead><Tr><Th>Kab</Th><Th>Karat</Th><Th align="right">Fi gram</Th><Th align="right">Fi tola</Th><Th align="right">Khareed / g</Th><Th>Halat</Th></Tr></THead>
                    <TBody>
                      {historyQ.data.map((r) => (
                        <Tr key={r.id}>
                          <Td>{dayTime(r.effectiveDate)}</Td>
                          <Td className="font-semibold">{purityLabel(r.purity)}</Td>
                          <Td align="right">{formatPKR(r.ratePerGram)}</Td>
                          <Td align="right">{formatPKR(r.ratePerTola ?? r.ratePerGram * TOLA)}</Td>
                          <Td align="right">{r.buyRate ? formatPKR(r.buyRate) : '—'}</Td>
                          <Td>{r.isActive ? <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[0.6875rem] font-semibold text-emerald-700">Aaj ka</span> : <span className="text-[0.75rem] text-slate-500">Purana</span>}</Td>
                        </Tr>
                      ))}
                    </TBody>
                  </Table>
                </div>
              )}
      </>)}

      {guide.isOpen && (
        <PageGuide title="Aaj ka rate — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Coins, color: '#d97706', title: 'Roz subah', text: 'Sarafa market ka 24K rate fi tola likhein. 22K, 21K aur 18K khud ban jate hain; dukaan ka apna rate ho to badal dein.' },
            { icon: Percent, color: '#a16207', title: 'Khareed rate', text: 'Purana sona bechne ke rate se kuch kam par liya jata hai. Woh percent yahan likhein — exchange par kaat alag se lagti hai.' },
            { icon: History, color: '#0891b2', title: 'Purane rate', text: 'Har din ka rate history me rehta hai. Purane bill usi waqt ke rate par bane rehte hain.' },
          ]}
          tips={['Rate badalte hi POS aur zewar ki qeemat naye rate par aa jati hai.', '1 tola = 11.664 gram.']}
          shortcuts={[['Ctrl+S', 'save'], ['1', 'rate likhein'], ['2', 'purane rate'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}
