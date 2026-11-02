/**
 * Live animals: every puppy, kitten, bird or fish the shop has for sale,
 * with its health (vaccine, deworming), cage and price. Animals are sold
 * at the counter (their card is on the POS); a void or return puts them
 * back on sale. Records are never deleted: an animal goes back, is
 * adopted, or dies (its cost is written off as a loss).
 */

import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  BarChart3, CheckCircle2, Download, GraduationCap, HeartPulse, ListChecks, PawPrint, Plus, ShieldAlert, ShoppingCart, Skull, Tag, Wallet,
} from 'lucide-react';
import {
  DateRangeMenu, FilterBar, FilterChip, FilterMenu, KpiCard, KpiRow, PageHero, PageShell, SearchField, Skeleton, ViewTabs,
  heroButton, heroIconButton, heroPrimaryButton, resolveRange, type DateRangeValue,
} from '@/design-system/components';
import { downloadCsv } from '@core/lib/csv';
import { useBusinessDayStart } from '@core/lib/business-day';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton } from '@core/print/PrintButton';
import type { PrintDoc } from '@core/print/types';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { liveAnimalsApi, type PetLiveAnimal, type PetSaleStatus } from '../api/live-animals.api';
import { BarList, Empty, ListCard, ListLoading, Pager, Pill, primaryBtn } from '../components/ui';
import { useDebounced, usePageKeys } from '../hooks/usePageKeys';
import { ANIMAL_STATUS, PET_KEYS, SPECIES_OPTIONS, ageText, daysFromToday, speciesLabel } from '../lib/meta';
import { t as tr } from '@core/i18n';

type Tab = 'ON_SALE' | 'SOLD' | 'all' | 'analytics';
const LIMIT = 24;
const STATUS_OPTIONS = [{ value: '', label: tr('Sab halat') }, ...Object.entries(ANIMAL_STATUS).map(([value, s]) => ({ value, label: s.label }))];
const VACC_OPTIONS = [{ value: '', label: tr('Sab') }, { value: 'true', label: tr('Vaccine lagi') }, { value: 'false', label: tr('Vaccine baqi') }];

export default function LiveAnimalsPage() {
  const navigate = useNavigate();
  const guide = usePageGuide();
  const startHour = useBusinessDayStart();
  const { sales: money, cost: costMoney, costHidden } = useMasked();
  const canAdd = usePermission(PERMISSIONS.PRODUCTS_CREATE);
  const searchRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>('ON_SALE');
  const [search, setSearch] = useState('');
  const q = useDebounced(search.trim());
  const [species, setSpecies] = useState('');
  const [status, setStatus] = useState('');
  const [vacc, setVacc] = useState('');
  const [period, setPeriod] = useState<DateRangeValue>({ preset: 'thisMonth', custom: { from: '', to: '' } });
  const [page, setPage] = useState(1);
  const range = resolveRange(period, startHour);

  const params = {
    search: q || undefined, species: species || undefined, page, limit: LIMIT,
    status: tab === 'ON_SALE' || tab === 'SOLD' ? tab : status || undefined,
    vaccinated: vacc === '' ? undefined : vacc === 'true',
  };
  const listQ = useQuery({ queryKey: [PET_KEYS.animals, 'paged', params], queryFn: () => liveAnimalsApi.paged(params), enabled: tab !== 'analytics', placeholderData: (p) => p });
  const sumQ = useQuery({ queryKey: [PET_KEYS.animals, 'summary'], queryFn: () => liveAnimalsApi.summary() });
  const vaccQ = useQuery({ queryKey: [PET_KEYS.animals, 'no-vaccine'], queryFn: () => liveAnimalsApi.paged({ status: 'ON_SALE', vaccinated: false, limit: 1 }) });
  const anaQ = useQuery({ queryKey: [PET_KEYS.animals, 'analytics', range], queryFn: () => liveAnimalsApi.analytics({ from: range?.from, to: range?.to }), enabled: tab === 'analytics' });
  const rows = listQ.data?.items ?? [];
  const s = sumQ.data;
  usePageKeys(searchRef, { n: () => canAdd && navigate('/petshop/live-animals/new'), a: () => setTab('analytics') });

  const exportCsv = () => {
    if (!rows.length) { toast.error(tr('Is filter me koi janwar nahi')); return; }
    downloadCsv('live-animals.csv', [
      [tr('Number'), tr('Naam'), tr('Janwar'), tr('Nasal'), tr('Jins'), tr('Umar (mahine)'), tr('Rang'), tr('Cage'), tr('Vaccine'), tr('Deworm'), tr('Rate'), ...(costHidden ? [] : [tr('Cost')]), tr('Halat'), tr('Bika')],
      ...rows.map((a) => [a.animalNumber, a.name ?? '', speciesLabel(a.species), a.breed ?? '', a.gender ?? '', a.ageMonths ?? '', a.color ?? '', a.currentCage ?? '',
        a.isVaccinated ? tr('Haan') : tr('Nahi'), a.isDewormed ? tr('Haan') : tr('Nahi'), a.askingPrice, ...(costHidden ? [] : [a.costPrice ?? '']), ANIMAL_STATUS[a.status]?.label, a.soldPrice ?? '']),
    ]);
  };
  const printList = (): PrintDoc => ({
    title: tr('Live animals'), meta: [[tr('Kitne'), String(rows.length)]],
    sections: [{
      kind: 'table', title: tr('Janwar'),
      columns: [{ label: tr('Number') }, { label: tr('Janwar') }, { label: tr('Umar'), wideOnly: true }, { label: tr('Cage') }, { label: tr('Vaccine') }, { label: tr('Rate'), align: 'right' }],
      rows: rows.map((a) => [a.animalNumber, [a.name, a.breed || speciesLabel(a.species)].filter(Boolean).join(' · '), ageText(a.ageMonths), a.currentCage ?? '', a.isVaccinated ? tr('Haan') : tr('Nahi'), money(a.askingPrice)]),
    }],
  });
  const clear = () => { setSearch(''); setSpecies(''); setStatus(''); setVacc(''); setPage(1); };
  const filtered = !!(search.trim() || species || status || vacc);

  return (
    <PageShell>
      {guide.isOpen && (
        <PageGuide title={tr('Zinda janwar')} onClose={guide.close}
          steps={[
            { icon: Plus, color: '#0284c7', title: tr('Darj karein'), text: tr('"Naya janwar" me nasal, umar, cage, vaccine aur cost / rate likhein. Har janwar ka apna number banta hai.') },
            { icon: ShoppingCart, color: '#16a34a', title: tr('Bechna'), text: tr('Counter par "Janwar" filter me card dabayein — bill banta hai, janwar "bik gaya" ho jata hai. Return ya void par wapas bikne ke liye aata hai.') },
            { icon: HeartPulse, color: '#e11d48', title: tr('Sehat'), text: tr('Janwar khol kar vaccine / deworming likhein. Doctor ki fees abhi di to kharche me likhi jati hai.') },
            { icon: Skull, color: '#64748b', title: tr('Mar gaya'), text: tr('"Mar gaya" likhne par uski cost loss me jati hai aur counter se hat jata hai. Record mit-ta nahi.') },
          ]}
          shortcuts={[['N', tr('naya janwar')], ['/', 'search'], ['A', 'analytics'], ['G', 'guide']]} />
      )}

      <PageHero title={tr('Live animals')} busy={listQ.isFetching && !listQ.isLoading} loading={sumQ.isLoading} meta={tr('Har janwar ka record — sehat, cage, rate')}
        actions={<>
          <button type="button" onClick={exportCsv} className={heroButton}><Download className="h-4 w-4" />{tr('CSV')}</button>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printList} label={tr('Print')} /></span>
          <button type="button" onClick={guide.open} title={tr('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canAdd && <Link to="/petshop/live-animals/new" className={heroPrimaryButton}><Plus className="h-4 w-4" />{tr('Naya janwar')}</Link>}
        </>}
        stats={[
          { label: tr('Bikne ke liye'), value: String((s?.available ?? 0) + (s?.reserved ?? 0)) },
          { label: tr('Stock ka rate'), value: money(s?.inventoryValue ?? 0) },
          { label: tr('Is mahine bike'), value: String(s?.monthly.count ?? 0) },
        ]} />

      <KpiRow cols={5}>
        {sumQ.isLoading ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : (<>
          <KpiCard icon={PawPrint} color="#16a34a" label={tr('Bikne ke liye')} value={s?.available ?? 0} active={tab === 'ON_SALE'} onClick={() => { setTab('ON_SALE'); setPage(1); }} />
          <KpiCard icon={Tag} color="#d97706" label={tr('Rok liye')} value={s?.reserved ?? 0} active={tab === 'all' && status === 'RESERVED'} onClick={() => { setTab('all'); setStatus('RESERVED'); setPage(1); }} />
          <KpiCard icon={ShieldAlert} color="#e11d48" label={tr('Vaccine baqi')} value={vaccQ.data?.total ?? 0} active={vacc === 'false'} onClick={() => { setTab('ON_SALE'); setVacc('false'); setPage(1); }} />
          <KpiCard icon={CheckCircle2} color="#0284c7" label={tr('Is mahine bike')} value={s?.monthly.count ?? 0} hint={money(s?.monthly.revenue ?? 0)} />
          <KpiCard icon={Wallet} color="#7c3aed" label={tr('Stock ki cost')} value={costMoney(s?.inventoryCost ?? 0)} hint={tr('Bikne wale janwar')} />
        </>)}
      </KpiRow>

      <FilterBar
        search={<SearchField ref={searchRef} value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder={tr('Number, naam, nasal, rang ya cage…')} />}
        chips={filtered ? <>
          {search.trim() && <FilterChip onRemove={() => setSearch('')}>"{search.trim()}"</FilterChip>}
          {species && <FilterChip onRemove={() => setSpecies('')}>{speciesLabel(species)}</FilterChip>}
          {status && <FilterChip onRemove={() => setStatus('')}>{ANIMAL_STATUS[status as PetSaleStatus]?.label}</FilterChip>}
          {vacc && <FilterChip onRemove={() => setVacc('')}>{vacc === 'true' ? tr('Vaccine lagi') : tr('Vaccine baqi')}</FilterChip>}
        </> : undefined}
        onClear={clear}>
        <FilterMenu icon={PawPrint} label={species ? speciesLabel(species) : tr('Janwar')} value={species} active={!!species} options={[{ value: '', label: tr('Sab janwar') }, ...SPECIES_OPTIONS]} onChange={(v) => { setSpecies(v); setPage(1); }} />
        <FilterMenu icon={ShieldAlert} label={vacc ? (vacc === 'true' ? tr('Vaccine lagi') : tr('Vaccine baqi')) : tr('Vaccine')} value={vacc} active={!!vacc} options={VACC_OPTIONS} onChange={(v) => { setVacc(v); setPage(1); }} />
        {tab === 'all' && <FilterMenu icon={ListChecks} label={status ? ANIMAL_STATUS[status as PetSaleStatus]?.label : tr('Halat')} value={status} active={!!status} options={STATUS_OPTIONS} onChange={(v) => { setStatus(v); setPage(1); }} />}
        {tab === 'analytics' && <DateRangeMenu value={period} onChange={setPeriod} startHour={startHour} label={tr('Bikne ki date')} />}
      </FilterBar>

      <ViewTabs value={tab} onChange={(t) => { setTab(t); setPage(1); }} hint={tr('Janwar par click kar ke sehat, rate aur record')}
        tabs={[
          { id: 'ON_SALE', label: tr('Bikne ke liye'), icon: PawPrint, count: (s?.available ?? 0) + (s?.reserved ?? 0) },
          { id: 'SOLD', label: tr('Bik gaye'), icon: CheckCircle2, count: s?.sold ?? null },
          { id: 'all', label: tr('Sab'), icon: ListChecks },
          { id: 'analytics', label: tr('Analytics'), icon: BarChart3 },
        ]} />

      {tab === 'analytics' ? (
        anaQ.isLoading || !anaQ.data ? <ListLoading /> : (
          <div className="space-y-4">
            <KpiRow cols={4}>
              <KpiCard icon={CheckCircle2} color="#16a34a" label={tr('Bike')} value={anaQ.data.sold} hint={anaQ.data.avgDaysToSell !== null ? tr('Aam taur par {{avgDaysToSell}} din me', { avgDaysToSell: anaQ.data.avgDaysToSell }) : undefined} />
              <KpiCard icon={Wallet} color="#0284c7" label={tr('Sale')} value={money(anaQ.data.revenue)} />
              <KpiCard icon={Tag} color="#7c3aed" label={tr('Profit (cost ke baad)')} value={costMoney(anaQ.data.profit)} />
              <KpiCard icon={Skull} color="#e11d48" label={tr('Mare / loss')} value={anaQ.data.deaths} hint={costMoney(anaQ.data.deathLoss)} />
            </KpiRow>
            <div className="grid gap-4 lg:grid-cols-2">
              <BarList title={tr('Kaun se janwar bike')} money={money} rows={anaQ.data.bySpecies.map((r) => ({ key: r.species, label: speciesLabel(r.species), count: r.sold, value: r.revenue }))} />
              <BarList title={tr('Abhi stock me (rate)')} money={money} rows={anaQ.data.inStock.map((r) => ({ key: r.species, label: speciesLabel(r.species), count: r.count, value: r.value }))} />
            </div>
          </div>
        )
      ) : (
        <ListCard footer={listQ.data && <Pager page={page} total={listQ.data.total} limit={LIMIT} onPage={setPage} />}>
          {listQ.isLoading ? <ListLoading /> : rows.length === 0 ? (
            <Empty icon={PawPrint} title={filtered ? tr('Is filter me koi janwar nahi') : tr('Abhi koi janwar darj nahi')} text={tr('Puppy, kitten, tota ya machhli — har janwar ka record banayein, counter par uska card aa jayega.')}
              action={canAdd ? <Link to="/petshop/live-animals/new" className={primaryBtn}><Plus className="h-4 w-4" />{tr('Naya janwar')}</Link> : undefined} />
          ) : (
            <ul className="grid gap-3 p-3 sm:grid-cols-2 sm:p-4 xl:grid-cols-3">
              {rows.map((a) => <AnimalCard key={a.id} a={a} money={money} />)}
            </ul>
          )}
        </ListCard>
      )}
    </PageShell>
  );
}

function AnimalCard({ a, money }: { a: PetLiveAnimal; money: (n: number) => string }) {
  const inStore = daysFromToday(a.acquiredDate);
  const days = inStore === null ? null : -inStore;
  return (
    <li>
      <Link to={`/petshop/live-animals/${a.id}`} className="flex gap-3 rounded-2xl p-3 ring-1 ring-slate-200 transition hover:bg-slate-50 hover:ring-slate-300">
        <span className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-amber-50 text-3xl">
          {a.imageUrls?.[0] ? <img src={a.imageUrls[0]} alt="" className="h-full w-full object-cover" /> : speciesLabel(a.species).split(' ')[0]}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-start justify-between gap-2">
            <span className="truncate font-semibold text-slate-900">{a.name || a.breed || speciesLabel(a.species)}</span>
            <Pill tone={ANIMAL_STATUS[a.status]?.tone ?? ''} className="shrink-0">{ANIMAL_STATUS[a.status]?.label}</Pill>
          </span>
          <span className="block truncate text-[0.75rem] text-slate-500">{[a.animalNumber, a.breed, a.gender, ageText(a.ageMonths)].filter(Boolean).join(' · ')}</span>
          <span className="mt-1 flex flex-wrap gap-1 text-[0.6875rem] font-semibold">
            <span className={a.isVaccinated ? 'rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-700' : 'rounded bg-rose-50 px-1.5 py-0.5 text-rose-700'}>{a.isVaccinated ? tr('Vaccine') : tr('Vaccine nahi')}</span>
            {a.isDewormed && <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-700">{tr('Deworm')}</span>}
            {a.currentCage && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-600">{tr('Cage {{currentCage}}', { currentCage: a.currentCage })}</span>}
            {days !== null && days > 60 && a.status === 'AVAILABLE' && <span className="rounded bg-amber-50 px-1.5 py-0.5 text-amber-800">{tr('{{days}} din se', { days })}</span>}
          </span>
          <span className="mt-1 block text-[0.9375rem] font-bold tabular-nums text-slate-900">{money(a.status === 'SOLD' ? a.soldPrice ?? a.askingPrice : a.askingPrice)}</span>
        </span>
      </Link>
    </li>
  );
}
