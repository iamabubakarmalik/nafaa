/**
 * Milk tests: fat, SNF, water and adulteration at collection, in the tank
 * or after a complaint. A test is a record only; milk sent back is marked
 * on the collection slip itself.
 */

import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, Beaker, CheckCircle2, Download, Droplets, GraduationCap, ListChecks, Plus, XCircle } from 'lucide-react';
import {
  Button, Checkbox, DateRangeMenu, FilterBar, FilterChip, Input, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Select, Skeleton, Textarea, ViewTabs,
  heroButton, heroIconButton, heroPrimaryButton, resolveRange, type DateRangeValue,
} from '@/design-system/components';
import { downloadCsv } from '@core/lib/csv';
import { rangeLabel } from '@core/lib/dateRange';
import { useBusinessDayStart } from '@core/lib/business-day';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { farmersApi } from '../api/farmers.api';
import { qualityTestsApi, type QualityTest } from '../api/quality-tests.api';
import { Empty, ListCard, ListLoading, Pill } from '../components/ui';
import { useDebounced, usePageKeys } from '../hooks/usePageKeys';
import { DAIRY_KEYS, QUALITY, dateTime, errorText, numIn } from '../lib/meta';

type Tab = 'all' | 'failed' | 'passed';
const SOURCES: Record<string, string> = { FARMER: 'Gawale ka doodh', INCOMING_BATCH: 'Aaya hua doodh', STORAGE_TANK: 'Tanki / stock', CUSTOMER_COMPLAINT: 'Customer ki shikayat', RANDOM: 'Achanak check' };
const ADULTERATION = ['Paani', 'Starch', 'Urea', 'Detergent', 'Cheeni', 'Formalin'];

export default function QualityTestsPage() {
  const guide = usePageGuide();
  const startHour = useBusinessDayStart();
  const canAdd = usePermission(PERMISSIONS.PURCHASES_CREATE);
  const searchRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const q = useDebounced(search.trim());
  const [period, setPeriod] = useState<DateRangeValue>({ preset: 'month', custom: { from: '', to: '' } });
  const [adding, setAdding] = useState(false);
  const range = resolveRange(period, startHour);

  const listQ = useQuery({ queryKey: [DAIRY_KEYS.tests, range?.from, range?.to, q], queryFn: () => qualityTestsApi.all({ from: range?.from, to: range?.to, search: q || undefined }) });
  const sumQ = useQuery({ queryKey: [DAIRY_KEYS.tests, 'summary', range?.from, range?.to], queryFn: () => qualityTestsApi.totals({ from: range?.from, to: range?.to }) });
  const all = useMemo(() => listQ.data ?? [], [listQ.data]);
  const rows = all.filter((t) => (tab === 'all' ? true : tab === 'failed' ? !t.passed : t.passed));
  const s = sumQ.data;
  usePageKeys(searchRef, canAdd ? { n: () => setAdding(true) } : {});
  const label = range ? rangeLabel(range.from, range.to) : 'Sab waqt';

  const exportCsv = () => {
    if (!rows.length) { toast.error('Is filter me koi test nahi'); return; }
    downloadCsv('doodh-tests.csv', [
      ['Test', 'Waqt', 'Kahan se', 'Naam', 'Fat', 'SNF', 'Paani %', 'Temp', 'Milawat', 'Quality', 'Pass', 'Kya kiya'],
      ...rows.map((t) => [t.testNumber, t.testedAt, SOURCES[t.sourceType] ?? t.sourceType, t.sourceName, t.fatContent, t.snfContent, t.waterContent, t.temperature, t.adulterationTypes.join(' '), t.quality ? QUALITY[t.quality]?.label : '', t.passed ? 'Haan' : 'Nahi', t.actionTaken]),
    ]);
  };

  return (
    <PageShell>
      {guide.isOpen && (
        <PageGuide title="Doodh ki quality — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Droplets, color: '#0ea5e9', title: 'Fat aur SNF', text: 'Lactometer ya machine se fat aur SNF likhein. Gawale ka ausat fat us ke page par dikhta hai.' },
            { icon: AlertTriangle, color: '#e11d48', title: 'Milawat', text: 'Paani ya kuch aur mila ho to nishan lagayein — test fail likha jata hai.' },
            { icon: XCircle, color: '#64748b', title: 'Doodh wapas', text: 'Doodh wapas kiya to Doodh ki entry me Quality "Wapas kiya" chunein — paisa aur stock nahi banta.' },
          ]}
          shortcuts={[['/', 'search'], ['N', 'naya test'], ['G', 'guide']]} />
      )}

      <PageHero title="Doodh ki quality" chip={<>{label}</>} busy={listQ.isFetching && !listQ.isLoading} loading={!s}
        meta="Fat, SNF, paani aur milawat ke test"
        actions={<>
          <button type="button" onClick={exportCsv} className={heroButton}><Download className="h-4 w-4" />CSV</button>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canAdd && <button type="button" onClick={() => setAdding(true)} className={heroPrimaryButton}><Plus className="h-4 w-4" />Naya test</button>}
        </>}
        stats={[
          { label: 'Test', value: String(s?.total ?? 0) },
          { label: 'Ausat fat', value: s?.avgFat ? `${s.avgFat.toFixed(1)}%` : '—' },
          { label: 'Ausat SNF', value: s?.avgSnf ? `${s.avgSnf.toFixed(1)}%` : '—' },
        ]} />

      <KpiRow cols={4}>
        {!s ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : (
          <>
            <KpiCard icon={Beaker} color="#2563eb" label="Sab test" value={s.total} onClick={() => setTab('all')} active={tab === 'all'} />
            <KpiCard icon={CheckCircle2} color="#16a34a" label="Pass" value={s.passed} onClick={() => setTab('passed')} active={tab === 'passed'} />
            <KpiCard icon={XCircle} color="#e11d48" label="Fail" value={s.failed} onClick={() => setTab('failed')} active={tab === 'failed'} />
            <KpiCard icon={AlertTriangle} color="#d97706" label="Milawat mili" value={s.adulteration} />
          </>
        )}
      </KpiRow>

      <FilterBar search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Test number ya gawale ka naam…" />}
        chips={search.trim() ? <FilterChip onRemove={() => setSearch('')}>"{search.trim()}"</FilterChip> : undefined} onClear={() => setSearch('')}>
        <DateRangeMenu value={period} onChange={setPeriod} startHour={startHour} label="Date" />
      </FilterBar>
      <ViewTabs value={tab} onChange={setTab} tabs={[{ id: 'all', label: 'Sab', icon: ListChecks, count: all.length }, { id: 'failed', label: 'Fail', icon: XCircle, count: all.filter((t) => !t.passed).length }, { id: 'passed', label: 'Pass', icon: CheckCircle2, count: all.filter((t) => t.passed).length }]} />

      <ListCard>
        {listQ.isLoading ? <ListLoading /> : rows.length === 0 ? (
          <Empty icon={Beaker} title="Is filter me koi test nahi" text="Gawale ka doodh aate waqt fat aur SNF check kar ke likhein." action={canAdd ? <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setAdding(true)}>Naya test</Button> : undefined} />
        ) : (
          <ul className="divide-y divide-slate-100">
            {rows.map((t) => (
              <li key={t.id} className="grid gap-2 px-4 py-3 sm:px-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1.4fr)_minmax(0,1fr)_auto] lg:items-center">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900">{t.sourceName || SOURCES[t.sourceType] || t.sourceType} <span className="font-mono text-[0.75rem] font-normal text-slate-400">{t.testNumber}</span></p>
                  <p className="truncate text-[0.75rem] text-slate-500">{SOURCES[t.sourceType] ?? t.sourceType} · {dateTime(t.testedAt)}</p>
                </div>
                <p className="text-[0.8125rem] tabular-nums text-slate-700">{[t.fatContent != null && `Fat ${t.fatContent}%`, t.snfContent != null && `SNF ${t.snfContent}%`, t.waterContent != null && `Paani ${t.waterContent}%`, t.temperature != null && `${t.temperature}°C`].filter(Boolean).join(' · ') || '—'}</p>
                <p className="truncate text-[0.8125rem] text-slate-600">{t.adulterationDetected ? <span className="font-semibold text-rose-700">Milawat: {t.adulterationTypes.join(', ') || 'haan'}</span> : t.actionTaken || '—'}</p>
                <div className="flex justify-end gap-1.5">
                  {t.quality && <Pill tone={QUALITY[t.quality]?.tone ?? ''}>{QUALITY[t.quality]?.label}</Pill>}
                  <Pill tone={t.passed ? 'bg-success-50 text-success-700 ring-success-200' : 'bg-rose-50 text-rose-700 ring-rose-200'}>{t.passed ? 'Pass' : 'Fail'}</Pill>
                </div>
              </li>
            ))}
          </ul>
        )}
      </ListCard>

      {adding && <TestModal onClose={() => setAdding(false)} />}
    </PageShell>
  );
}

function TestModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const farmersQ = useQuery({ queryKey: [DAIRY_KEYS.farmers, 'active'], queryFn: () => farmersApi.all({ active: true }), staleTime: 60_000 });
  const [f, setF] = useState({ sourceType: 'FARMER', sourceId: '', sourceName: '', fat: '', snf: '', water: '', temp: '', quality: '', action: '', notes: '' });
  const [types, setTypes] = useState<string[]>([]);
  const [err, setErr] = useState<Record<string, string>>({});
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));
  const save = useMutation({
    mutationFn: () => qualityTestsApi.create({
      sourceType: f.sourceType, sourceId: f.sourceType === 'FARMER' ? f.sourceId || undefined : undefined, sourceName: f.sourceName.trim() || undefined,
      fatContent: numIn(f.fat) ?? undefined, snfContent: numIn(f.snf) ?? undefined, waterContent: numIn(f.water) ?? undefined, temperature: numIn(f.temp) ?? undefined,
      adulterationDetected: types.length > 0, adulterationTypes: types, quality: f.quality || undefined, actionTaken: f.action.trim() || undefined, notes: f.notes.trim() || undefined,
    } as Partial<QualityTest>),
    onSuccess: (t) => { qc.invalidateQueries({ queryKey: [DAIRY_KEYS.tests] }); toast.success(t.passed ? 'Test pass likha' : 'Test fail likha'); onClose(); },
    onError: (e) => toast.error(errorText(e, 'Save nahi hua')),
  });
  const submit = () => {
    const e: Record<string, string> = {};
    const fat = numIn(f.fat); const snf = numIn(f.snf); const water = numIn(f.water);
    if (fat != null && (fat < 0 || fat > 15)) e.fat = '0 se 15';
    if (snf != null && (snf < 0 || snf > 15)) e.snf = '0 se 15';
    if (water != null && (water < 0 || water > 100)) e.water = '0 se 100';
    if (f.sourceType === 'FARMER' && !f.sourceId) e.source = 'Gawala chunein';
    if (fat == null && snf == null && water == null && !types.length && !f.quality) e.fat = 'Kam se kam fat, SNF ya milawat likhein';
    setErr(e);
    if (Object.keys(e).length) return;
    save.mutate();
  };
  return (
    <Modal open onClose={onClose} size="lg" title="Naya quality test"
      footer={<><Button variant="secondary" onClick={onClose}>Wapas</Button><Button loading={save.isPending} onClick={submit}>Save</Button></>}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); submit(); }}
        onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); submit(); } }}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Select label="Kahan se" value={f.sourceType} onChange={(e) => set({ sourceType: e.target.value })} options={Object.entries(SOURCES).map(([value, label]) => ({ value, label }))} />
          {f.sourceType === 'FARMER'
            ? <Select label="Gawala" value={f.sourceId} onChange={(e) => set({ sourceId: e.target.value })} error={err.source} options={[{ value: '', label: 'Chunein…' }, ...(farmersQ.data ?? []).map((x) => ({ value: x.id, label: x.name }))]} />
            : <Input label="Naam / detail" value={f.sourceName} onChange={(e) => set({ sourceName: e.target.value })} placeholder="Tanki 1, customer ka naam" />}
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          <Input label="Fat %" inputMode="decimal" autoFocus value={f.fat} onChange={(e) => set({ fat: e.target.value })} error={err.fat} />
          <Input label="SNF %" inputMode="decimal" value={f.snf} onChange={(e) => set({ snf: e.target.value })} error={err.snf} />
          <Input label="Paani %" inputMode="decimal" value={f.water} onChange={(e) => set({ water: e.target.value })} error={err.water} />
          <Input label="Temp °C" inputMode="decimal" value={f.temp} onChange={(e) => set({ temp: e.target.value })} />
        </div>
        <div>
          <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Milawat mili?</span>
          <div className="flex flex-wrap gap-3">{ADULTERATION.map((a) => <Checkbox key={a} label={a} checked={types.includes(a)} onChange={(e) => setTypes((x) => (e.target.checked ? [...x, a] : x.filter((y) => y !== a)))} />)}</div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Select label="Grade" value={f.quality} onChange={(e) => set({ quality: e.target.value })} options={[{ value: '', label: '—' }, ...Object.entries(QUALITY).map(([value, x]) => ({ value, label: x.label }))]} />
          <Input label="Kya kiya" value={f.action} onChange={(e) => set({ action: e.target.value })} placeholder="Rate kam kiya, doodh wapas" />
        </div>
        <Textarea label="Note" rows={2} value={f.notes} onChange={(e) => set({ notes: e.target.value })} />
      </form>
    </Modal>
  );
}
