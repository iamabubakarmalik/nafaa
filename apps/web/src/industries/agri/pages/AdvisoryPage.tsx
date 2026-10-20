/**
 * Crop advisory: what a farmer brought in (crop, stage, problem), what the
 * shop advised and which products, and when to check back. A printed slip
 * goes home with the farmer; the follow-up tab lists visits that are due.
 */

import { useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  BarChart3, CalendarClock, CalendarDays, CheckCircle2, ClipboardList, Download, GraduationCap, Leaf, ListChecks, Package, Pencil, Plus, Sprout, X,
} from 'lucide-react';
import {
  Button, FilterBar, FilterChip, FilterMenu, Input, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Select, Skeleton, Table, TBody, THead, Td, Textarea, Th, Tr, ViewTabs,
  heroButton, heroIconButton, heroPrimaryButton, type FilterOption,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { downloadCsv } from '@core/lib/csv';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { PrintButton } from '@core/print/PrintButton';
import type { PrintDoc } from '@core/print/types';
import { advisoryApi, type AdvisoryInput, type AdvisoryTab, type CropAdvisory } from '../api/advisory.api';
import { farmersApi, type Farmer } from '../api/farmers.api';
import { FarmerPick } from '../components/FarmerPick';
import { Pager } from '../components/Pager';
import { ProductPick } from '../components/ProductPick';
import { useDebounced, usePageKeys, useSaveKey } from '../hooks/usePageKeys';
import { CROPS, SEASON_LABEL, dayPhrase, daysTo, errorText, seasonLabel, shortDate, isoDay } from '../lib/meta';

type View = AdvisoryTab | 'analytics';
const KEY = 'agri-advisory';
const SEASON_OPTIONS: Array<FilterOption<string>> = [{ value: '', label: 'Har season' }, ...['RABI', 'KHARIF', 'ZAID'].map((v) => ({ value: v, label: SEASON_LABEL[v] }))];
const STAGES = ['Zameen ki tayyari', 'Bijai', 'Ugaao', 'Barhwar', 'Phool', 'Phal / daana', 'Pakai', 'Katai'];

/** Advice lines, whatever shape an older row stored them in. */
function lines(v: unknown): string[] {
  if (!Array.isArray(v)) return typeof v === 'string' && v.trim() ? [v.trim()] : [];
  return v.map((x) => (typeof x === 'string' ? x : (x as { text?: string; title?: string; name?: string })?.text ?? (x as { title?: string })?.title ?? (x as { name?: string })?.name ?? '')).filter(Boolean);
}
function products(v: unknown): Array<{ productId?: string; name: string }> {
  if (!Array.isArray(v)) return [];
  return v.map((x) => (typeof x === 'string' ? { name: x } : { productId: (x as { productId?: string })?.productId, name: String((x as { name?: string })?.name ?? '') })).filter((p) => p.name);
}
const farmerName = (a: CropAdvisory) => a.farmer?.fullName ?? 'Farmer ke bagair';

function slip(a: CropAdvisory): PrintDoc {
  const recs = lines(a.recommendations);
  const prods = products(a.productSuggestions);
  return {
    title: `Fasal ka mashwara ${a.advisoryNumber}`,
    subtitle: [farmerName(a), a.farmer?.phone, a.farmer?.village].filter(Boolean).join(' · '),
    meta: [['Date', shortDate(a.createdAt)], ['Follow-up', a.followUpDate ? shortDate(a.followUpDate) : '—']],
    sections: [
      { kind: 'rows', rows: [
        { label: 'Fasal', value: [a.cropName, a.cropVariety].filter(Boolean).join(' · ') },
        ...(a.season ? [{ label: 'Season', value: seasonLabel(a.season) }] : []),
        ...(a.landAreaAcres ? [{ label: 'Zameen', value: `${a.landAreaAcres} acre` }] : []),
        ...(a.stage ? [{ label: 'Marhala', value: a.stage }] : []),
      ] },
      ...(a.currentIssues ? [{ kind: 'text' as const, title: 'Masla', text: a.currentIssues }] : []),
      ...(recs.length ? [{ kind: 'table' as const, title: 'Mashwara', columns: [{ label: '#' }, { label: 'Kya karna hai' }], rows: recs.map((r, i) => [String(i + 1), r]) }] : []),
      ...(prods.length ? [{ kind: 'table' as const, title: 'Maal', columns: [{ label: 'Cheez' }], rows: prods.map((p) => [p.name]) }] : []),
    ],
    footer: 'Spray ke waqt mask aur dastane pehnein. Label par likhi miqdaar se zyada na dalein.',
  };
}

export default function AdvisoryPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const canManage = usePermission(PERMISSIONS.AGRI_ADVISORY_MANAGE);
  const [params, setParams] = useSearchParams();
  const farmerId = params.get('farmer') ?? undefined;
  const searchRef = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<View>(farmerId ? 'all' : 'open');
  const [season, setSeason] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<CropAdvisory | null>(null);
  const [form, setForm] = useState<CropAdvisory | 'new' | null>(null);
  const q = useDebounced(search.trim());
  const tab: AdvisoryTab = view === 'analytics' ? 'all' : view;

  const { data, isLoading, isFetching } = useQuery({
    queryKey: [KEY, q, tab, season, farmerId, page],
    queryFn: () => advisoryApi.page({ search: q || undefined, tab, season: season || undefined, farmerId, page, limit: 25 }),
    placeholderData: keepPreviousData,
  });
  usePageKeys(searchRef, canManage ? { n: () => setForm('new') } : {});
  const rows = data?.items ?? [];
  const c = data?.counts;
  const setTab = (v: View) => { setView(v); setPage(1); };
  const changed = (a?: CropAdvisory) => { qc.invalidateQueries({ queryKey: [KEY] }); if (a) setOpen(a); };

  const done = useMutation({
    mutationFn: (id: string) => advisoryApi.complete(id),
    onSuccess: (a) => { toast.success('Mashwara mukammal'); changed({ ...open!, ...a }); },
    onError: (e) => toast.error(errorText(e, 'Mukammal nahi hua')),
  });

  const exportCsv = () => {
    if (!rows.length) { toast.error('Is list me kuch nahi'); return; }
    downloadCsv('fasal-mashwara.csv', [
      ['Number', 'Date', 'Farmer', 'Phone', 'Fasal', 'Season', 'Acre', 'Marhala', 'Masla', 'Mashwara', 'Maal', 'Follow-up', 'Mukammal'],
      ...rows.map((a) => [a.advisoryNumber, isoDay(a.createdAt), farmerName(a), a.farmer?.phone, a.cropName, seasonLabel(a.season), a.landAreaAcres, a.stage, a.currentIssues, lines(a.recommendations).join(' / '), products(a.productSuggestions).map((p) => p.name).join(' / '), isoDay(a.followUpDate), a.completed ? 'Haan' : 'Nahi']),
    ]);
  };
  const listDoc = (): PrintDoc => ({
    title: 'Fasal ka mashwara', subtitle: tab === 'due' ? 'Follow-up baqi' : tab === 'done' ? 'Mukammal' : tab === 'open' ? 'Khule' : 'Sab',
    sections: [{ kind: 'table', columns: [{ label: 'Number' }, { label: 'Farmer' }, { label: 'Fasal' }, { label: 'Masla', wideOnly: true }, { label: 'Follow-up' }], rows: rows.map((a) => [a.advisoryNumber, farmerName(a), a.cropName, a.currentIssues ?? '', a.followUpDate ? shortDate(a.followUpDate) : '—']) }],
  });

  const chips = (search.trim() || season || farmerId) ? (
    <>
      {search.trim() && <FilterChip onRemove={() => setSearch('')}>"{search.trim()}"</FilterChip>}
      {season && <FilterChip onRemove={() => setSeason('')}>{SEASON_LABEL[season]}</FilterChip>}
      {farmerId && <FilterChip onRemove={() => { params.delete('farmer'); setParams(params); }}>Ek farmer</FilterChip>}
    </>
  ) : undefined;

  return (
    <PageShell>
      {guide.isOpen && (
        <PageGuide title="Fasal ka mashwara — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Plus, color: '#2563eb', title: 'Likhein', text: 'Farmer, fasal, marhala aur masla likhein — jaise "kapas par safed makhi".' },
            { icon: Leaf, color: '#16a34a', title: 'Mashwara aur maal', text: 'Har line par ek kaam likhein aur jo maal bataya woh chunein. Slip print kar ke farmer ko dein.' },
            { icon: CalendarClock, color: '#d97706', title: 'Follow-up', text: 'Wapas dekhne ki date dein. "Follow-up" tab me aaj aur guzri dates dikhti hain.' },
            { icon: CheckCircle2, color: '#7c3aed', title: 'Mukammal', text: 'Fasal theek ho jaye to mukammal karein — record mehfooz rehta hai.' },
          ]}
          shortcuts={[['/', 'search'], ['N', 'naya mashwara'], ['G', 'guide']]} />
      )}

      <PageHero title="Fasal ka mashwara" chip={`${c?.open ?? 0} khule`} busy={isFetching && !isLoading} loading={isLoading}
        meta="Farmer ki fasal ka masla, mashwara aur follow-up"
        actions={<>
          <button type="button" onClick={exportCsv} className={heroButton}><Download className="h-4 w-4" />CSV</button>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={listDoc} label="Print" /></span>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canManage && <button type="button" onClick={() => setForm('new')} className={heroPrimaryButton}><Plus className="h-4 w-4" />Naya mashwara</button>}
        </>}
        stats={[
          { label: 'Khule', value: c?.open ?? 0 },
          { label: 'Follow-up baqi', value: c?.due ?? 0 },
          { label: 'Mukammal', value: c?.done ?? 0 },
        ]} />

      <KpiRow cols={4}>
        {isLoading ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : (
          <>
            <KpiCard icon={ListChecks} color="#2563eb" label="Khule" value={c?.open ?? 0} onClick={() => setTab('open')} active={view === 'open'} />
            <KpiCard icon={CalendarClock} color="#d97706" label="Follow-up aaj / guzra" value={c?.due ?? 0} onClick={() => setTab('due')} active={view === 'due'} />
            <KpiCard icon={CheckCircle2} color="#16a34a" label="Mukammal" value={c?.done ?? 0} onClick={() => setTab('done')} active={view === 'done'} />
            <KpiCard icon={Sprout} color="#65a30d" label="Sab se zyada" value={data?.analytics.crops[0]?.crop ?? '—'} />
          </>
        )}
      </KpiRow>

      <FilterBar search={<SearchField ref={searchRef} value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Number, fasal, masla ya marhala…" />}
        chips={chips} onClear={() => { setSearch(''); setSeason(''); if (farmerId) { params.delete('farmer'); setParams(params); } }}>
        <FilterMenu icon={CalendarDays} label={season ? SEASON_LABEL[season] : 'Season'} value={season} options={SEASON_OPTIONS} onChange={(v) => { setSeason(v); setPage(1); }} active={!!season} align="right" />
      </FilterBar>

      <ViewTabs value={view} onChange={setTab} tabs={[
        { id: 'open', label: 'Khule', icon: ListChecks, count: c?.open ?? 0 },
        { id: 'due', label: 'Follow-up', icon: CalendarClock, count: c?.due ?? 0 },
        { id: 'done', label: 'Mukammal', icon: CheckCircle2, count: c?.done ?? 0 },
        { id: 'all', label: 'Sab', icon: ClipboardList, count: c?.all ?? 0 },
        { id: 'analytics', label: 'Analytics', icon: BarChart3 },
      ]} />

      {view === 'analytics' ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Bars title="Kis fasal ka mashwara" rows={(data?.analytics.crops ?? []).map((x) => ({ label: x.crop, value: x.notes }))} tone="bg-lime-500" />
          <Bars title="Kis marhale par" rows={(data?.analytics.stages ?? []).map((x) => ({ label: x.stage, value: x.notes }))} tone="bg-sky-500" />
        </div>
      ) : (
        <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
          {isLoading ? <div className="space-y-2 p-4">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
            : rows.length === 0 ? (
              <div className="flex flex-col items-center px-6 py-16 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-lime-50 text-lime-700"><Leaf className="h-7 w-7" /></span>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">{search ? 'Is search me kuch nahi' : view === 'due' ? 'Koi follow-up baqi nahi' : 'Is list me kuch nahi'}</h3>
                <p className="mt-1 text-[0.875rem] text-slate-500">Farmer fasal ka masla le kar aaye to yahan likhein aur slip de dein.</p>
                {canManage && <Button className="mt-4" onClick={() => setForm('new')} leftIcon={<Plus className="h-4 w-4" />}>Naya mashwara</Button>}
              </div>
            ) : (
              <>
                <Table minWidth="54rem">
                  <THead><Tr><Th>Number</Th><Th>Farmer</Th><Th>Fasal</Th><Th>Masla</Th><Th>Follow-up</Th><Th>Status</Th></Tr></THead>
                  <TBody>{rows.map((a) => {
                    const d = a.followUpDate ? daysTo(a.followUpDate) : null;
                    return (
                      <Tr key={a.id} interactive onClick={() => setOpen(a)}>
                        <Td><p className="font-semibold text-slate-900">{a.advisoryNumber}</p><p className="text-[0.75rem] text-slate-500">{shortDate(a.createdAt)}</p></Td>
                        <Td><p className="font-medium text-slate-900">{farmerName(a)}</p><p className="text-[0.75rem] text-slate-500">{[a.farmer?.phone, a.farmer?.village].filter(Boolean).join(' · ')}</p></Td>
                        <Td><p className="font-medium text-slate-800">{a.cropName}</p><p className="text-[0.75rem] text-slate-500">{[a.cropVariety, a.stage, a.landAreaAcres ? `${a.landAreaAcres} acre` : ''].filter(Boolean).join(' · ')}</p></Td>
                        <Td className="max-w-[16rem] text-[0.8125rem] text-slate-600"><p className="truncate">{a.currentIssues || '—'}</p></Td>
                        <Td className={cn('text-[0.8125rem]', !a.completed && d !== null && d <= 0 ? 'font-semibold text-amber-700' : 'text-slate-600')}>{a.followUpDate ? `${shortDate(a.followUpDate)} · ${dayPhrase(d)}` : '—'}</Td>
                        <Td><span className={cn('rounded-md px-1.5 py-0.5 text-[0.6875rem] font-semibold ring-1', a.completed ? 'bg-emerald-50 text-emerald-800 ring-emerald-200' : 'bg-sky-50 text-sky-800 ring-sky-200')}>{a.completed ? 'Mukammal' : 'Khula'}</span></Td>
                      </Tr>
                    );
                  })}</TBody>
                </Table>
                <Pager page={data?.page ?? 1} limit={data?.limit ?? 25} total={data?.total ?? 0} onPage={setPage} />
              </>
            )}
        </section>
      )}

      {open && !form && (
        <Modal open onClose={() => setOpen(null)} size="lg" title={`${open.advisoryNumber} · ${open.cropName}`}
          description={[farmerName(open), open.farmer?.phone, seasonLabel(open.season) !== '—' ? seasonLabel(open.season) : '', open.landAreaAcres ? `${open.landAreaAcres} acre` : ''].filter(Boolean).join(' · ')}
          footer={<>
            <span className="mr-auto"><PrintButton doc={() => slip(open)} label="Slip print" /></span>
            {canManage && <Button variant="secondary" onClick={() => setForm(open)} leftIcon={<Pencil className="h-4 w-4" />}>Badlein</Button>}
            {canManage && !open.completed && <Button loading={done.isPending} onClick={() => done.mutate(open.id)} leftIcon={<CheckCircle2 className="h-4 w-4" />}>Mukammal</Button>}
          </>}>
          <AdvisoryView a={open} />
        </Modal>
      )}
      {form && <AdvisoryForm editing={form === 'new' ? null : form} farmerId={farmerId} onClose={() => setForm(null)} onSaved={(a) => { setForm(null); changed(a); }} />}
    </PageShell>
  );
}

function Bars({ title, rows, tone }: { title: string; rows: Array<{ label: string; value: number }>; tone: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80">
      <h3 className="mb-3 text-[0.9375rem] font-semibold text-slate-900">{title}</h3>
      {rows.length === 0 ? <p className="py-6 text-center text-[0.8125rem] text-slate-500">Abhi kuch nahi</p> : (
        <ul className="space-y-2">{rows.map((r) => (
          <li key={r.label} className="text-[0.8125rem]">
            <div className="flex justify-between"><span className="font-medium text-slate-700">{r.label}</span><span className="tabular-nums text-slate-600">{r.value}</span></div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100"><div className={cn('h-full rounded-full', tone)} style={{ width: `${(r.value / max) * 100}%` }} /></div>
          </li>
        ))}</ul>
      )}
    </section>
  );
}

function AdvisoryView({ a }: { a: CropAdvisory }) {
  const recs = lines(a.recommendations);
  const prods = products(a.productSuggestions);
  const facts: Array<[string, string]> = [
    ['Variety', a.cropVariety ?? ''], ['Marhala', a.stage ?? ''], ['Bijai', a.sowingDate ? shortDate(a.sowingDate) : ''],
    ['Katai (andaza)', a.expectedHarvest ? shortDate(a.expectedHarvest) : ''], ['Follow-up', a.followUpDate ? `${shortDate(a.followUpDate)} · ${dayPhrase(daysTo(a.followUpDate))}` : ''],
    ['Mashwara diya', a.advisorName ?? ''],
  ].filter(([, v]) => v) as Array<[string, string]>;
  return (
    <div className="space-y-4">
      <dl className="grid gap-x-4 gap-y-2 sm:grid-cols-3">
        {facts.map(([k, v]) => <div key={k}><dt className="text-[0.75rem] text-slate-500">{k}</dt><dd className="text-[0.875rem] font-medium text-slate-800">{v}</dd></div>)}
      </dl>
      {a.currentIssues && <div className="rounded-xl bg-amber-50 px-3 py-2 text-[0.875rem] text-amber-900"><span className="font-semibold">Masla: </span>{a.currentIssues}</div>}
      <div>
        <h4 className="mb-1.5 text-[0.8125rem] font-semibold text-slate-700">Mashwara</h4>
        {recs.length ? <ol className="list-decimal space-y-1 pl-5 text-[0.875rem] text-slate-700">{recs.map((r, i) => <li key={i}>{r}</li>)}</ol> : <p className="text-[0.8125rem] text-slate-500">Abhi kuch nahi likha</p>}
      </div>
      {prods.length > 0 && (
        <div>
          <h4 className="mb-1.5 text-[0.8125rem] font-semibold text-slate-700">Bataya gaya maal</h4>
          <div className="flex flex-wrap gap-1.5">{prods.map((p, i) => (
            p.productId
              ? <Link key={i} to={`/agri-products/${p.productId}`} className="inline-flex items-center gap-1 rounded-lg bg-lime-50 px-2 py-1 text-[0.8125rem] font-medium text-lime-800 ring-1 ring-lime-200 hover:underline"><Package className="h-3.5 w-3.5" />{p.name}</Link>
              : <span key={i} className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-[0.8125rem] text-slate-700"><Package className="h-3.5 w-3.5" />{p.name}</span>
          ))}</div>
        </div>
      )}
      {a.notes && <p className="rounded-xl bg-slate-50 px-3 py-2 text-[0.8125rem] text-slate-600">{a.notes}</p>}
    </div>
  );
}

type FarmerRef = { id: string; fullName: string; phone: string; village?: string | null };

interface Draft {
  /** undefined until picked: a new note from a farmer's page starts with that farmer. */
  farmer: FarmerRef | null | undefined; cropName: string; cropVariety: string; season: string; landAreaAcres: string; stage: string;
  sowingDate: string; expectedHarvest: string; currentIssues: string; recommendations: string; products: Array<{ productId: string; name: string }>;
  followUpDate: string; notes: string;
}

function AdvisoryForm({ editing, farmerId, onClose, onSaved }: { editing: CropAdvisory | null; farmerId?: string; onClose: () => void; onSaved: (a: CropAdvisory) => void }) {
  const [d, setD] = useState<Draft>(() => ({
    farmer: editing ? editing.farmer ?? null : undefined,
    cropName: editing?.cropName ?? '', cropVariety: editing?.cropVariety ?? '', season: editing?.season ?? '', landAreaAcres: editing?.landAreaAcres ? String(editing.landAreaAcres) : '',
    stage: editing?.stage ?? '', sowingDate: isoDay(editing?.sowingDate), expectedHarvest: isoDay(editing?.expectedHarvest),
    currentIssues: editing?.currentIssues ?? '', recommendations: lines(editing?.recommendations).join('\n'),
    products: products(editing?.productSuggestions).filter((p): p is { productId: string; name: string } => !!p.productId),
    followUpDate: isoDay(editing?.followUpDate), notes: editing?.notes ?? '',
  }));
  const [tried, setTried] = useState(false);
  const farmerQ = useQuery({ queryKey: ['agri-farmer', farmerId], queryFn: () => farmersApi.getOne(farmerId!), enabled: !editing && !!farmerId });
  const farmer: FarmerRef | null = d.farmer === undefined ? farmerQ.data ?? null : d.farmer;
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }));
  const errors = useMemo(() => {
    const e: Partial<Record<keyof Draft, string>> = {};
    if (!d.cropName.trim()) e.cropName = 'Fasal ka naam likhein';
    if (d.landAreaAcres && !(Number(d.landAreaAcres) >= 0)) e.landAreaAcres = 'Zameen sahi likhein';
    if (d.sowingDate && d.expectedHarvest && d.expectedHarvest < d.sowingDate) e.expectedHarvest = 'Katai bijai se pehle nahi ho sakti';
    return e;
  }, [d]);
  const show = (k: keyof Draft) => (tried ? errors[k] : undefined);

  const save = useMutation({
    mutationFn: () => {
      const body: AdvisoryInput = {
        farmerId: farmer?.id ?? null, cropName: d.cropName.trim(), cropVariety: d.cropVariety.trim(), season: d.season || undefined,
        landAreaAcres: d.landAreaAcres ? Number(d.landAreaAcres) : null, stage: d.stage.trim(), sowingDate: d.sowingDate || null, expectedHarvest: d.expectedHarvest || null,
        currentIssues: d.currentIssues.trim(), recommendations: d.recommendations.split('\n').map((x) => x.trim()).filter(Boolean),
        productSuggestions: d.products, followUpDate: d.followUpDate || null, notes: d.notes.trim(),
      };
      return editing ? advisoryApi.update(editing.id, body) : advisoryApi.create(body);
    },
    onSuccess: (a) => {
      toast.success(editing ? 'Mashwara badal gaya' : 'Mashwara likh liya');
      onSaved({ ...a, farmer: farmer ? { id: farmer.id, fullName: farmer.fullName, phone: farmer.phone, village: farmer.village ?? null } : null });
    },
    onError: (e) => toast.error(errorText(e, 'Save nahi hua')),
  });
  const submit = () => {
    setTried(true);
    if (Object.keys(errors).length) { toast.error(Object.values(errors)[0]!); return; }
    if (!save.isPending) save.mutate();
  };
  useSaveKey(submit);

  return (
    <Modal open onClose={onClose} size="lg" closeOnBackdrop={false} title={editing ? `${editing.advisoryNumber} — badlein` : 'Naya fasal ka mashwara'}
      description="Ctrl+S se save"
      footer={<><Button variant="secondary" onClick={onClose}>Wapas</Button><Button loading={save.isPending} onClick={submit}>Save</Button></>}>
      <div className="space-y-4">
        <div>
          <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Farmer</span>
          <FarmerPick value={farmer as Farmer | null} onChange={(f) => set('farmer', f)} />
          <p className="mt-1 text-[0.75rem] text-slate-500">Marzi hai — chunein to farmer ke record me dikhega</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="Fasal" required list="agri-crops" value={d.cropName} onChange={(e) => set('cropName', e.target.value)} placeholder="Kapas" error={show('cropName')} hint="List se chunein ya likhein" data-autofocus />
          <datalist id="agri-crops">{CROPS.map((x) => <option key={x} value={x} />)}</datalist>
          <Input label="Variety" value={d.cropVariety} onChange={(e) => set('cropVariety', e.target.value)} placeholder="FH-142" hint="Beej ka naam" />
          <Select label="Season" value={d.season} onChange={(e) => set('season', e.target.value)} options={[{ value: '', label: '—' }, ...['RABI', 'KHARIF', 'ZAID'].map((v) => ({ value: v, label: SEASON_LABEL[v] }))]} />
          <Input label="Zameen (acre)" inputMode="decimal" value={d.landAreaAcres} onChange={(e) => set('landAreaAcres', e.target.value.replace(/[^\d.]/g, ''))} placeholder="5" error={show('landAreaAcres')} hint="Dawa ki miqdaar isi se" />
          <Input label="Marhala" list="agri-stages" value={d.stage} onChange={(e) => set('stage', e.target.value)} placeholder="Phool" hint="Fasal abhi kis haal me" />
          <datalist id="agri-stages">{STAGES.map((x) => <option key={x} value={x} />)}</datalist>
          <Input label="Follow-up" type="date" value={d.followUpDate} onChange={(e) => set('followUpDate', e.target.value)} hint="Kab wapas dekhna hai" />
          <Input label="Bijai" type="date" value={d.sowingDate} onChange={(e) => set('sowingDate', e.target.value)} />
          <Input label="Katai (andaza)" type="date" value={d.expectedHarvest} onChange={(e) => set('expectedHarvest', e.target.value)} error={show('expectedHarvest')} />
        </div>
        <Textarea label="Masla" rows={2} value={d.currentIssues} onChange={(e) => set('currentIssues', e.target.value)} placeholder="Patte peele, safed makhi, sundi…" hint="Farmer ne kya bataya" />
        <Textarea label="Mashwara" rows={4} value={d.recommendations} onChange={(e) => set('recommendations', e.target.value)} placeholder={'Har line par ek kaam\nImidacloprid 250 ml per acre spray\n7 din baad dobara dekhein'} hint="Har line slip par alag number se chhapegi" />
        <div>
          <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Bataya gaya maal</span>
          <ProductPick onPick={(i) => { if (!d.products.some((p) => p.productId === i.id)) set('products', [...d.products, { productId: i.id, name: i.name }]); }} />
          {d.products.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">{d.products.map((p) => (
              <span key={p.productId} className="inline-flex items-center gap-1 rounded-lg bg-lime-50 py-1 pl-2 pr-1 text-[0.8125rem] font-medium text-lime-800 ring-1 ring-lime-200">
                {p.name}
                <button type="button" aria-label={`${p.name} hatayein`} onClick={() => set('products', d.products.filter((x) => x.productId !== p.productId))} className="rounded p-0.5 hover:bg-lime-100"><X className="h-3.5 w-3.5" /></button>
              </span>
            ))}</div>
          )}
        </div>
        <Textarea label="Note" rows={2} value={d.notes} onChange={(e) => set('notes', e.target.value)} hint="Marzi hai — sirf dukaan ke liye" />
      </div>
    </Modal>
  );
}
