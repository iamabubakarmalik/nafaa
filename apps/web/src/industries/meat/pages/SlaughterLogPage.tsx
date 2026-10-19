/**
 * Slaughter / dressing log with the halal record. A slaughter takes live kg
 * out of the live-stock item (birds) or closes a tagged animal, and puts the
 * dressed meat, offal and bones into stock at the same total cost. Yield and
 * halal, certificate and vet checks are summed for any period.
 *
 * Keys: N new slaughter · / search · 1 log · 2 analytics · G guide.
 */

import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { BarChart3, Bird, Eye, FileSpreadsheet, GraduationCap, Heart, Pencil, Plus, Scale, ShieldCheck, Stethoscope, Trash2 } from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton, type PrintDoc } from '@core/print';
import {
  Button, DateRangeMenu, FilterBar, FilterMenu, Input, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Segmented, Skeleton, Switch, ViewTabs,
  heroButton, heroIconButton, heroPrimaryButton, resolveRange, type DateRangeValue,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { downloadCsv } from '@core/lib/csv';
import { useBusinessDayStart } from '@core/lib/business-day';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { liveAnimalsApi, type LiveAnimal } from '../api/live-animals.api';
import { slaughterApi, type SlaughterInput, type SlaughterLog } from '../api/slaughter.api';
import { ItemPick, PickedChip } from '../components/pickers';
import { FormRow, ListFrame, Pill, inputBox, usePageKeys } from '../components/ui';
import { ANIMALS, KEYS, MONEY_KEYS, animalOf, apiError, dateTime, decimal, kg, pct, todayKey } from '../lib/meta';

type View = 'log' | 'analytics';
interface Pick { id: string; name: string }
interface Extra { item: Pick; kg: string }

const METHODS = [{ value: 'HALAL_HAND', label: 'Halal (haath se)' }, { value: 'HALAL_MACHINE', label: 'Halal (machine)' }, { value: 'STANDARD', label: 'Aam' }];

function NewSlaughter({ animalId, onClose, onDone }: { animalId: string | null; onClose: () => void; onDone: () => void }) {
  const animals = useQuery({ queryKey: [KEYS.animals, { isSlaughtered: 'false' }], queryFn: () => liveAnimalsApi.list({ isSlaughtered: 'false' }) });
  const [mode, setMode] = useState<'birds' | 'animal'>(animalId ? 'animal' : 'birds');
  const [animal, setAnimal] = useState<LiveAnimal | null>(null);
  const [type, setType] = useState('CHICKEN');
  const [source, setSource] = useState<Pick | null>(null);
  const [meat, setMeat] = useState<Pick | null>(null);
  const [liveKg, setLiveKg] = useState('');
  const [dressedKg, setDressedKg] = useState('');
  const [extras, setExtras] = useState<Extra[]>([]);
  const [method, setMethod] = useState('HALAL_HAND');
  const [by, setBy] = useState('');
  const [isHalal, setIsHalal] = useState(true);
  const [cert, setCert] = useState('');
  const [vet, setVet] = useState(false);
  const [date, setDate] = useState(todayKey());
  const [tried, setTried] = useState(false);

  useEffect(() => {
    const a = (animals.data ?? []).find((x) => x.id === animalId);
    if (a) { setAnimal(a); setLiveKg(String(a.weightKg)); }
  }, [animals.data, animalId]);

  const out = (Number(dressedKg) || 0) + extras.reduce((s, e) => s + (Number(e.kg) || 0), 0);
  const yieldPct = Number(liveKg) > 0 && Number(dressedKg) > 0 ? (Number(dressedKg) / Number(liveKg)) * 100 : null;
  const errors: Record<string, string> = {};
  if (mode === 'animal' && !animal) errors.animal = 'Janwar chunein';
  if (mode === 'birds' && !source) errors.source = 'Zinda maal ka item chunein — stock usi se nikalta hai';
  if (!(Number(liveKg) > 0)) errors.liveKg = 'Zinda wazan likhein';
  if (!meat) errors.meat = 'Gosht kis item me stock me aaye — chunein';
  if (!(Number(dressedKg) > 0)) errors.dressedKg = 'Gosht ka wazan likhein';
  if (out > (Number(liveKg) || 0) + 0.0005) errors.out = 'Gosht aur baqi cheezein zinda wazan se zyada nahi ho saktin';
  if (extras.some((e) => !(Number(e.kg) > 0))) errors.extras = 'Har cheez ka kg likhein ya line hatayein';
  const err = (k: string) => (tried ? errors[k] : undefined);

  const save = useMutation({
    mutationFn: () => slaughterApi.create({
      liveAnimalId: mode === 'animal' ? animal?.id : undefined, animalType: mode === 'animal' ? animal?.animalType : type,
      sourceProductId: mode === 'birds' ? source?.id : undefined, stockProductId: meat?.id, liveWeightKg: Number(liveKg), dressedWeightKg: Number(dressedKg),
      extras: extras.map((e) => ({ productId: e.item.id, kg: Number(e.kg) })), slaughterMethod: method, slaughteredBy: by.trim() || undefined,
      isHalal, halalCertNumber: cert.trim() || undefined, vetInspection: vet, slaughterDate: date,
    } as SlaughterInput),
    onSuccess: (r) => { toast.success(`${r.slaughterNumber} — ${kg(Number(dressedKg))} gosht stock me`); onDone(); onClose(); },
    onError: (e) => toast.error(apiError(e, 'Zibah save nahi hua')),
  });
  const submit = () => { setTried(true); const first = Object.values(errors)[0]; if (first) { toast.error(first); return; } save.mutate(); };

  return (
    <Modal open onClose={onClose} size="lg" title="Zibah / dressing" description="Zinda maal stock se nikalta hai, gosht usi cost par stock me aata hai"
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button loading={save.isPending} onClick={submit} leftIcon={<ShieldCheck className="h-4 w-4" />}>Save{yieldPct ? ` · yield ${pct(yieldPct)}` : ''}</Button></>}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <Segmented<'birds' | 'animal'> label="Kya zibah hua" value={mode} onChange={setMode}
          items={[{ value: 'birds', label: <span className="inline-flex items-center gap-1.5"><Bird className="h-3.5 w-3.5" />Murgi (wazan se)</span> }, { value: 'animal', label: <span className="inline-flex items-center gap-1.5"><Heart className="h-3.5 w-3.5" />Tag wala janwar</span> }]} />
        {mode === 'animal' ? (
          <FormRow label="Janwar" error={err('animal')}>
            <select value={animal?.id ?? ''} onChange={(e) => { const a = (animals.data ?? []).find((x) => x.id === e.target.value) ?? null; setAnimal(a); if (a) setLiveKg(String(a.weightKg)); }} className={inputBox} aria-invalid={!!err('animal')}>
              <option value="">Baara se chunein…</option>
              {(animals.data ?? []).map((a) => <option key={a.id} value={a.id}>{a.tagNumber} · {animalOf(a.animalType).label} · {kg(a.weightKg)}</option>)}
            </select>
          </FormRow>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <FormRow label="Zinda maal ka item" error={err('source')}>{source ? <PickedChip title={source.name} onClear={() => setSource(null)} /> : <ItemPick onPick={(i) => setSource({ id: i.id, name: i.name })} placeholder="Zinda murgi…" />}</FormRow>
            <FormRow label="Janwar">
              <select value={type} onChange={(e) => setType(e.target.value)} className={inputBox}>{ANIMALS.map((a) => <option key={a.value} value={a.value}>{a.emoji} {a.label}</option>)}</select>
            </FormRow>
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-3">
          <FormRow label="Zinda wazan (kg)" error={err('liveKg')}><input data-autofocus inputMode="decimal" value={liveKg} onChange={(e) => setLiveKg(decimal(e.target.value))} className={cn(inputBox, 'text-right font-semibold')} aria-invalid={!!err('liveKg')} /></FormRow>
          <FormRow label="Gosht ka item" error={err('meat')}>{meat ? <PickedChip title={meat.name} onClear={() => setMeat(null)} /> : <ItemPick onPick={(i) => setMeat({ id: i.id, name: i.name })} placeholder="Murgi dressed, bakra gosht…" />}</FormRow>
          <FormRow label="Gosht (kg)" error={err('dressedKg')} hint={yieldPct ? `Yield ${pct(yieldPct)}` : 'Murgi ~70%, bakra ~50%'}><input inputMode="decimal" value={dressedKg} onChange={(e) => setDressedKg(decimal(e.target.value))} className={cn(inputBox, 'text-right font-semibold')} aria-invalid={!!err('dressedKg')} /></FormRow>
        </div>
        <div className="space-y-2">
          <p className="text-[0.8125rem] font-medium text-slate-700">Aur kya nikla (kaleji, paaye, siri, khaal) — marzi</p>
          {extras.map((e, i) => (
            <div key={e.item.id} className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate rounded-lg bg-slate-50 px-3 py-2 text-[0.875rem] ring-1 ring-slate-200">{e.item.name}</span>
              <input inputMode="decimal" aria-label={`${e.item.name} kg`} value={e.kg} onChange={(ev) => setExtras((xs) => xs.map((x, j) => (j === i ? { ...x, kg: decimal(ev.target.value) } : x)))} placeholder="kg" className="h-10 w-24 rounded-lg bg-slate-100 px-2 text-right outline-none focus:bg-white focus:ring-2 focus:ring-brand-500" />
              <button type="button" aria-label="Hatayein" onClick={() => setExtras((xs) => xs.filter((_, j) => j !== i))} className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
          <ItemPick onPick={(i) => setExtras((xs) => [...xs, { item: { id: i.id, name: i.name }, kg: '' }])} exclude={[meat?.id ?? '', source?.id ?? '', ...extras.map((e) => e.item.id)]} placeholder="Item jorein: kaleji, paaye…" />
          {(err('out') || err('extras')) && <p className="text-[0.75rem] font-medium text-rose-600">{err('out') ?? err('extras')}</p>}
          {Number(liveKg) > 0 && <p className="text-[0.75rem] text-slate-500">Waste (khoon, par, ojhri): {kg(Math.max(Number(liveKg) - out, 0))} — is ki cost gosht me shamil hoti hai.</p>}
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <FormRow label="Tareeqa"><select value={method} onChange={(e) => setMethod(e.target.value)} className={inputBox}>{METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</select></FormRow>
          <FormRow label="Kis ne zibah kiya"><input value={by} onChange={(e) => setBy(e.target.value)} maxLength={120} className={inputBox} placeholder="Qasai ka naam" /></FormRow>
          <FormRow label="Tareekh"><input type="date" max={todayKey()} value={date} onChange={(e) => setDate(e.target.value)} className={inputBox} /></FormRow>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Switch checked={isHalal} onChange={(e) => setIsHalal(e.target.checked)} label="Halal zabiha" />
          <Switch checked={vet} onChange={(e) => setVet(e.target.checked)} label="Vet ne dekha" />
          <input value={cert} onChange={(e) => setCert(e.target.value)} maxLength={80} placeholder="Halal certificate # (marzi)" aria-label="Halal certificate" className={inputBox} />
        </div>
      </form>
    </Modal>
  );
}

function Detail({ id, onClose }: { id: string; onClose: () => void }) {
  const { cost } = useMasked();
  const d = useQuery({ queryKey: [KEYS.slaughter, 'one', id], queryFn: () => slaughterApi.getOne(id) });
  const s = d.data;
  return (
    <Modal open onClose={onClose} size="md" title={s ? s.slaughterNumber : 'Zibah'} description={s ? `${animalOf(s.animalType).label}${s.animalTag ? ` · ${s.animalTag}` : ''} · ${dateTime(s.slaughterDate)}` : undefined}
      footer={<Button variant="secondary" onClick={onClose}>Band karein</Button>}>
      {!s ? <Skeleton className="h-40 rounded-xl" /> : (
        <div className="space-y-3 text-[0.875rem]">
          <p>Zinda {kg(s.liveWeightKg)} → gosht {kg(s.dressedWeightKg)} · yield {pct(s.yieldPct)}</p>
          <ul className="divide-y divide-slate-100 rounded-xl ring-1 ring-slate-200">
            {s.moves.map((m, i) => (
              <li key={i} className="flex justify-between px-3 py-2"><span>{m.name}</span><span className={cn('tabular-nums', m.qty < 0 ? 'text-rose-600' : 'text-emerald-700')}>{m.qty > 0 ? '+' : ''}{kg(m.qty, m.unit)} · {cost(m.unitCost)}/{m.unit}</span></li>
            ))}
            {!s.moves.length && <li className="px-3 py-3 text-slate-500">Is record se stock nahi badla (sirf halal record)</li>}
          </ul>
          <p className="text-slate-600">{[s.isHalal ? 'Halal' : 'Halal nahi likha', s.halalCertNumber && `Certificate ${s.halalCertNumber}`, s.vetInspection && 'Vet ne dekha', s.slaughteredBy && `Qasai: ${s.slaughteredBy}`].filter(Boolean).join(' · ')}</p>
        </div>
      )}
    </Modal>
  );
}

function EditRecord({ s, onClose, onDone }: { s: SlaughterLog; onClose: () => void; onDone: () => void }) {
  const [cert, setCert] = useState(s.halalCertNumber ?? '');
  const [authority, setAuthority] = useState(s.religiousAuthority ?? '');
  const [vetName, setVetName] = useState(s.vetInspectorName ?? '');
  const [vet, setVet] = useState(s.vetInspection);
  const [halal, setHalal] = useState(s.isHalal);
  const [notes, setNotes] = useState(s.notes ?? '');
  const save = useMutation({
    mutationFn: () => slaughterApi.update(s.id, { halalCertNumber: cert, religiousAuthority: authority, vetInspectorName: vetName, vetInspection: vet, isHalal: halal, notes }),
    onSuccess: () => { toast.success('Record save'); onDone(); onClose(); },
    onError: (e) => toast.error(apiError(e, 'Save nahi hua')),
  });
  return (
    <Modal open onClose={onClose} size="sm" title={`${s.slaughterNumber} — halal record`} description="Wazan aur stock nahi badalte, sirf record"
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button loading={save.isPending} onClick={() => save.mutate()}>Save</Button></>}>
      <div className="space-y-3">
        <Switch checked={halal} onChange={(e) => setHalal(e.target.checked)} label="Halal zabiha" />
        <Input label="Halal certificate #" value={cert} onChange={(e) => setCert(e.target.value)} maxLength={80} />
        <Input label="Kis idare ne" value={authority} onChange={(e) => setAuthority(e.target.value)} maxLength={120} />
        <Switch checked={vet} onChange={(e) => setVet(e.target.checked)} label="Vet ne dekha" />
        {vet && <Input label="Vet ka naam" value={vetName} onChange={(e) => setVetName(e.target.value)} maxLength={120} />}
        <Input label="Note" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />
      </div>
    </Modal>
  );
}

export default function SlaughterLogPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const startHour = useBusinessDayStart();
  const [params, setParams] = useSearchParams();
  const canWrite = usePermission(PERMISSIONS.STOCK_ADJUSTMENTS_MANAGE);
  const searchRef = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<View>('log');
  const [range, setRange] = useState<DateRangeValue>({ preset: 'month', custom: { from: '', to: '' } });
  const [type, setType] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState<{ animalId: string | null } | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [edit, setEdit] = useState<SlaughterLog | null>(null);

  useEffect(() => { const t = setTimeout(() => setQuery(search.trim()), 250); return () => clearTimeout(t); }, [search]);
  useEffect(() => {
    const a = params.get('animal');
    if (a && canWrite) { setCreating({ animalId: a }); params.delete('animal'); setParams(params, { replace: true }); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const period = resolveRange(range, startHour);
  const q = { animalType: type || undefined, search: query || undefined, from: period?.from, to: period?.to };
  const listQ = useQuery({ queryKey: [KEYS.slaughter, q], queryFn: () => slaughterApi.list(q), placeholderData: (p) => p });
  const halalQ = useQuery({ queryKey: ['halal-compliance', period?.from, period?.to], queryFn: () => slaughterApi.halalCompliance(period?.from, period?.to) });
  const rows = listQ.data ?? [];
  const h = halalQ.data;
  const refresh = () => [KEYS.slaughter, 'halal-compliance', KEYS.animals, 'live-animals-summary', ...MONEY_KEYS].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

  usePageKeys({ n: canWrite ? () => setCreating({ animalId: null }) : undefined, '1': () => setView('log'), '2': () => setView('analytics'), g: guide.open }, searchRef);

  const printDoc = (): PrintDoc => ({
    title: 'Zibah aur halal record', subtitle: period ? `${period.from} → ${period.to}` : 'Sab',
    meta: h ? [['Zibah', String(h.total)], ['Halal', pct(h.halalPct)], ['Yield', pct(h.yieldPct)]] : [],
    sections: [{ kind: 'table', columns: [{ label: '#' }, { label: 'Tareekh' }, { label: 'Janwar' }, { label: 'Zinda', align: 'right' }, { label: 'Gosht', align: 'right' }, { label: 'Yield', align: 'right' }, { label: 'Halal' }, { label: 'Certificate', wideOnly: true }],
      rows: rows.map((s) => [s.slaughterNumber, dateTime(s.slaughterDate), `${animalOf(s.animalType).label} ${s.animalTag ?? ''}`, kg(s.liveWeightKg), kg(s.dressedWeightKg), pct(s.yieldPct), s.isHalal ? 'Haan' : 'Nahi', s.halalCertNumber ?? '']) }],
  });

  return (
    <PageShell>
      <PageHero
        title="Zibah aur halal record"
        chip={<><ShieldCheck /> Halal</>}
        meta="Har zibah ka wazan, yield aur halal record — gosht usi waqt stock me"
        busy={listQ.isFetching && !listQ.isLoading}
        loading={halalQ.isLoading}
        actions={<>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} disabled={!rows.length} /></span>
          <button type="button" title="CSV" className={heroIconButton} disabled={!rows.length}
            onClick={() => downloadCsv('zibah.csv', [['#', 'Tareekh', 'Janwar', 'Tag', 'Zinda kg', 'Gosht kg', 'Yield %', 'Halal', 'Certificate', 'Vet', 'Qasai'], ...rows.map((s) => [s.slaughterNumber, dateTime(s.slaughterDate), animalOf(s.animalType).label, s.animalTag, s.liveWeightKg, s.dressedWeightKg, s.yieldPct, s.isHalal ? 'Haan' : 'Nahi', s.halalCertNumber, s.vetInspection ? 'Haan' : '', s.slaughteredBy])])}>
            <FileSpreadsheet className="h-4 w-4" />
          </button>
          <Link to="/meat/live-animals" className={heroButton}><Heart className="h-4 w-4" /><span className="hidden sm:inline">Zinda maal</span></Link>
          <Link to="/meat/cutting" className={heroButton}><Scale className="h-4 w-4" /><span className="hidden sm:inline">Cutting</span></Link>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canWrite && <button type="button" onClick={() => setCreating({ animalId: null })} title="Naya zibah (N)" className={heroPrimaryButton}><Plus className="h-4 w-4" /> Zibah likhein</button>}
        </>}
        stats={h ? [{ label: 'Zibah', value: h.total }, { label: 'Zinda → gosht', value: `${kg(h.liveKg)} → ${kg(h.dressedKg)}` }, { label: 'Yield', value: pct(h.yieldPct) }] : [{ label: 'Zibah', value: '—' }]}
      />

      <KpiRow cols={4}>
        {!h ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={ShieldCheck} color="#16a34a" label="Halal" value={pct(h.halalPct)} hint={`${h.halal} / ${h.total}`} />
          <KpiCard icon={ShieldCheck} color="#0891b2" label="Certificate ke saath" value={pct(h.certPct)} hint={`${h.withCert} record`} />
          <KpiCard icon={Stethoscope} color="#7c3aed" label="Vet check" value={pct(h.vetPct)} hint={`${h.withVet} record`} />
          <KpiCard icon={Scale} color="#d97706" label="Yield" value={pct(h.yieldPct)} hint="Gosht / zinda wazan" />
        </>}
      </KpiRow>

      <FilterBar search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Zibah #, tag, qasai…" label="Search" />}>
        <DateRangeMenu value={range} onChange={setRange} startHour={startHour} defaultPreset="month" />
        <FilterMenu icon={Bird} label={type ? animalOf(type).label : 'Sab janwar'} value={type} active={!!type} onChange={setType}
          options={[{ value: '', label: 'Sab janwar' }, ...ANIMALS.map((a) => ({ value: a.value, label: `${a.emoji} ${a.label}` }))]} />
      </FilterBar>

      <ViewTabs value={view} onChange={setView} hint={<>{canWrite ? 'N naya · ' : ''}/ search · 1-2 tabs</>}
        tabs={[{ id: 'log', label: 'Record', icon: ShieldCheck, count: rows.length }, { id: 'analytics', label: 'Analytics', icon: BarChart3 }]} />

      {view === 'analytics' ? (
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80">
          <h3 className="font-semibold text-slate-900">Janwar ke hisaab se yield</h3>
          <ul className="mt-3 divide-y divide-slate-100">
            {Object.entries(rows.reduce<Record<string, { n: number; live: number; dressed: number }>>((acc, s) => {
              const r = acc[s.animalType] ?? { n: 0, live: 0, dressed: 0 };
              r.n += 1; r.live += s.liveWeightKg; r.dressed += s.dressedWeightKg ?? 0; acc[s.animalType] = r; return acc;
            }, {})).map(([t, r]) => (
              <li key={t} className="flex items-center justify-between py-2 text-[0.875rem]"><span>{animalOf(t).emoji} {animalOf(t).label} · {r.n}</span><span className="tabular-nums">{kg(r.live)} → {kg(r.dressed)} · <strong>{pct(r.live ? (r.dressed / r.live) * 100 : null)}</strong></span></li>
            ))}
            {!rows.length && <li className="py-6 text-center text-sm text-slate-500">Is period me koi zibah nahi</li>}
          </ul>
        </div>
      ) : (
        <ListFrame loading={listQ.isLoading} error={listQ.isError && !listQ.data} onRetry={() => listQ.refetch()}
          empty={!rows.length ? { icon: ShieldCheck, title: 'Is period me koi zibah nahi', text: 'Mandi se aayi murgi ya baara ka janwar zibah karein to yahan likhein — gosht stock me aa jata hai.', actions: canWrite ? <Button onClick={() => setCreating({ animalId: null })} leftIcon={<Plus className="h-4 w-4" />}>Zibah likhein</Button> : undefined } : null}>
          {rows.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-5">
              <span className="text-2xl" aria-hidden>{animalOf(s.animalType).emoji}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-semibold text-slate-900">{s.slaughterNumber}</span>
                  <span className="text-[0.8125rem] text-slate-600">{animalOf(s.animalType).label}{s.animalTag ? ` · ${s.animalTag}` : ''}</span>
                  {s.isHalal ? <Pill tone="emerald">Halal</Pill> : <Pill tone="rose">Halal nahi likha</Pill>}
                  {s.halalCertNumber && <Pill tone="sky">Cert {s.halalCertNumber}</Pill>}
                  {s.vetInspection && <Pill tone="violet">Vet</Pill>}
                </div>
                <p className="mt-0.5 text-[0.75rem] text-slate-500">{dateTime(s.slaughterDate)}{s.slaughteredBy ? ` · ${s.slaughteredBy}` : ''}</p>
              </div>
              <div className="text-right text-[0.8125rem]">
                <p className="font-semibold tabular-nums">{kg(s.liveWeightKg)} → {kg(s.dressedWeightKg)}</p>
                <p className="text-slate-500">Yield {pct(s.yieldPct)}</p>
              </div>
              <div className="flex gap-1.5">
                <Button size="sm" variant="ghost" leftIcon={<Eye className="h-3.5 w-3.5" />} onClick={() => setOpen(s.id)}>Stock</Button>
                {canWrite && <Button size="sm" variant="ghost" leftIcon={<Pencil className="h-3.5 w-3.5" />} onClick={() => setEdit(s)}>Record</Button>}
              </div>
            </li>
          ))}
        </ListFrame>
      )}

      {creating && <NewSlaughter animalId={creating.animalId} onClose={() => setCreating(null)} onDone={refresh} />}
      {open && <Detail id={open} onClose={() => setOpen(null)} />}
      {edit && <EditRecord s={edit} onClose={() => setEdit(null)} onDone={refresh} />}

      {guide.isOpen && (
        <PageGuide title="Zibah aur halal record" onClose={guide.close}
          steps={[
            { icon: Bird, color: '#d97706', title: 'Murgi', text: '"Zinda murgi" item aur kitne kg zibah hue likhein, phir "Murgi dressed" me kitna gosht nikla. Zinda maal stock se nikalta hai, gosht usi cost par aata hai.' },
            { icon: Heart, color: '#dc2626', title: 'Tag wala janwar', text: 'Baara ka janwar chunein — us ki purchase qeemat gosht ki cost banti hai. Kaleji, paaye, siri bhi alag item me stock me daal sakte hain.' },
            { icon: ShieldCheck, color: '#16a34a', title: 'Halal record', text: 'Halal, certificate aur vet check likhein — upar har period ka percentage dikhta hai. Baad me "Record" se badal sakte hain.' },
          ]}
          tips={['Cost sale value ke hisaab se lagti hai — boneless par zyada, haddi par kam.', 'Zibah ke liye "Stock adjustment" ki ijazat chahiye.']}
          shortcuts={[['N', 'naya zibah'], ['/', 'dhoondein'], ['1', 'record'], ['2', 'analytics'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}
