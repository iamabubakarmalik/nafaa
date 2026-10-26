/**
 * Salts (generic names): every formula the shop stocks, the brands that
 * carry it with price and shelf stock (so the counter can offer a cheaper
 * or available substitute), its schedule, and which salts clash with each
 * other. Salts are switched off, never deleted.
 */

import { useMemo, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, ArrowDownWideNarrow, Baby, Beaker, GraduationCap, HeartPulse, Pencil, Pill, Plus, Power, ShieldAlert, Trash2, Zap } from 'lucide-react';
import {
  Button, FilterBar, FilterChip, FilterMenu, Input, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Select, Skeleton, Table, TBody,
  Td, Textarea, Th, THead, Tr, ViewTabs, heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { interactionsApi, type DrugInteraction } from '../api/interactions.api';
import { saltsApi, type DrugScheduleClass, type Salt } from '../api/salts.api';
import { useDebounced, usePageKeys } from '../hooks/usePageKeys';
import { REGISTER_CLASSES, SCHEDULES, SCHEDULE_META } from '../lib/meta';

type Tab = 'all' | 'rx' | 'register' | 'off' | 'clash';
const SEVERITY: Record<DrugInteraction['severity'], { label: string; tone: string }> = {
  MINOR: { label: 'Halka', tone: 'bg-slate-100 text-slate-700' },
  MODERATE: { label: 'Darmiyana', tone: 'bg-amber-50 text-amber-800' },
  MAJOR: { label: 'Sakht', tone: 'bg-rose-50 text-rose-700' },
  CONTRAINDICATED: { label: 'Ek saath mana', tone: 'bg-rose-600 text-white' },
};
const apiError = (e: unknown) => { const m = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message; return (Array.isArray(m) ? m[0] : m) ?? 'Save nahi hua'; };
const isRegister = (s: Salt) => s.isNarcotic || REGISTER_CLASSES.includes(s.scheduleClass);

interface ProductRow { product: { id: string; name: string; price: number; stock: number; isActive: boolean; brand?: { name: string } | null }; strength: string }

function SaltModal({ salt, onClose, onSaved }: { salt: Salt | null; onClose: () => void; onSaved: () => void }) {
  const [d, setD] = useState({
    name: salt?.name ?? '', genericName: salt?.genericName ?? '', category: salt?.category ?? '', standardDose: salt?.standardDose ?? '', maxDailyDose: salt?.maxDailyDose ?? '',
    scheduleClass: (salt?.scheduleClass ?? 'OTC') as DrugScheduleClass, requiresPrescription: salt?.requiresPrescription ?? false, isNarcotic: salt?.isNarcotic ?? false,
    isPregnancySafe: salt?.isPregnancySafe ?? false, isPediatricSafe: salt?.isPediatricSafe ?? false, sideEffects: salt?.sideEffects ?? '', warnings: salt?.warnings ?? '',
  });
  const [tried, setTried] = useState(false);
  const set = <K extends keyof typeof d>(k: K, v: (typeof d)[K]) => setD((x) => ({ ...x, [k]: v }));
  const save = useMutation({
    mutationFn: () => {
      const opt = (v: string) => v.trim() || undefined;
      const body = {
        name: d.name.trim(), genericName: opt(d.genericName), category: opt(d.category), standardDose: opt(d.standardDose), maxDailyDose: opt(d.maxDailyDose),
        scheduleClass: d.scheduleClass, requiresPrescription: d.requiresPrescription || d.isNarcotic, isNarcotic: d.isNarcotic,
        isPregnancySafe: d.isPregnancySafe, isPediatricSafe: d.isPediatricSafe, sideEffects: opt(d.sideEffects), warnings: opt(d.warnings),
      };
      return salt ? saltsApi.update(salt.id, body) : saltsApi.create(body);
    },
    onSuccess: () => { toast.success(salt ? 'Salt update ho gaya' : 'Salt ban gaya'); onSaved(); },
    onError: (e) => toast.error(apiError(e)),
  });
  const submit = (e: FormEvent) => { e.preventDefault(); setTried(true); if (d.name.trim().length < 2) return; save.mutate(); };
  return (
    <Modal open onClose={onClose} size="lg" title={salt ? `${salt.name} — badlein` : 'Naya salt'} description="Generic naam — jaise Paracetamol, Amoxicillin. Strength har dawai par alag likhi jati hai."
      footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Wapas</Button><Button type="submit" form="salt-form" loading={save.isPending}>Save</Button></div>}>
      <form id="salt-form" onSubmit={submit} className="grid gap-3 sm:grid-cols-2"
        onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); e.currentTarget.requestSubmit(); } }}>
        <Input label="Naam" required autoFocus value={d.name} onChange={(e) => set('name', e.target.value)} placeholder="Paracetamol" error={tried && d.name.trim().length < 2 ? 'Naam likhein' : undefined} />
        <Input label="Doosra naam" value={d.genericName} onChange={(e) => set('genericName', e.target.value)} placeholder="Acetaminophen" hint="Search me bhi milega" />
        <Input label="Group" value={d.category} onChange={(e) => set('category', e.target.value)} placeholder="Dard, Antibiotic…" />
        <Select label="Schedule" value={d.scheduleClass} onChange={(e) => set('scheduleClass', e.target.value as DrugScheduleClass)} options={SCHEDULES.map((k) => ({ value: k, label: SCHEDULE_META[k].label }))} hint={SCHEDULE_META[d.scheduleClass]?.hint} />
        <Input label="Aam dose" value={d.standardDose} onChange={(e) => set('standardDose', e.target.value)} placeholder="500mg 3 dafa" />
        <Input label="Din me zyada se zyada" value={d.maxDailyDose} onChange={(e) => set('maxDailyDose', e.target.value)} placeholder="4g" />
        <div className="grid gap-2 sm:col-span-2 sm:grid-cols-2">
          {([['requiresPrescription', 'Nuskhe par', 'Rx'], ['isNarcotic', 'Narcotic / register', 'Har sale register me'], ['isPregnancySafe', 'Hamal me theek', ''], ['isPediatricSafe', 'Bachon ke liye theek', '']] as const).map(([k, label, hint]) => (
            <label key={k} className="flex items-center gap-2.5 rounded-xl p-2.5 ring-1 ring-slate-200">
              <input type="checkbox" checked={d[k]} onChange={(e) => set(k, e.target.checked)} className="h-4 w-4 rounded border-slate-300 accent-brand-600" />
              <span className="text-[0.875rem] font-medium text-slate-800">{label}{hint && <span className="block text-[0.75rem] font-normal text-slate-500">{hint}</span>}</span>
            </label>
          ))}
        </div>
        <Textarea label="Side effects" rows={2} value={d.sideEffects} onChange={(e) => set('sideEffects', e.target.value)} />
        <Textarea label="Ehtiyat" rows={2} value={d.warnings} onChange={(e) => set('warnings', e.target.value)} />
      </form>
    </Modal>
  );
}

function BrandsModal({ salt, onClose }: { salt: Salt; onClose: () => void }) {
  const { data = [], isLoading } = useQuery({ queryKey: ['pharmacy-salt-products', salt.id], queryFn: () => saltsApi.productsBySalt(salt.id) as Promise<ProductRow[]> });
  const rows = [...data].filter((r) => r.product.isActive).sort((a, b) => Number(b.product.stock > 0) - Number(a.product.stock > 0) || a.product.price - b.product.price);
  return (
    <Modal open onClose={onClose} size="lg" title={`${salt.name} — brands`} description="Isi formula ki dawaiyan, sasti aur shelf wali pehle — grahak ki dawai na ho to inme se dein">
      {isLoading ? <Skeleton className="h-40 rounded-xl" /> : rows.length === 0 ? (
        <p className="rounded-xl bg-slate-50 px-4 py-8 text-center text-[0.875rem] text-slate-600">Kisi dawai me ye salt nahi jora — dawai ke Formula step me jorein.</p>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl ring-1 ring-slate-200">
          {rows.map((r) => (
            <li key={r.product.id}>
              <Link to={`/pharmacy-medicines/${r.product.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50">
                <Pill className="h-4 w-4 shrink-0 text-brand-600" />
                <span className="min-w-0 flex-1"><span className="block truncate font-medium text-slate-900">{r.product.name}</span><span className="block text-[0.75rem] text-slate-500">{[r.strength, r.product.brand?.name].filter(Boolean).join(' · ')}</span></span>
                <span className={cn('text-[0.75rem] font-medium tabular-nums', r.product.stock > 0 ? 'text-emerald-700' : 'text-rose-600')}>{r.product.stock > 0 ? `${Number(Number(r.product.stock).toFixed(2))} stock` : 'khatam'}</span>
                <span className="w-24 text-right font-semibold tabular-nums">{formatPKR(r.product.price)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

function ClashModal({ salts, onClose, onSaved }: { salts: Salt[]; onClose: () => void; onSaved: () => void }) {
  const [d, setD] = useState({ saltAId: '', saltBId: '', severity: 'MODERATE' as DrugInteraction['severity'], description: '', management: '' });
  const options = [{ value: '', label: 'Chunein' }, ...salts.filter((s) => s.isActive).map((s) => ({ value: s.id, label: s.name }))];
  const save = useMutation({
    mutationFn: () => interactionsApi.create({ ...d, description: d.description.trim(), management: d.management.trim() || undefined }),
    onSuccess: () => { toast.success('Asar likh diya — nuskhe par warning aayegi'); onSaved(); },
    onError: (e) => toast.error(apiError(e)),
  });
  const ok = d.saltAId && d.saltBId && d.saltAId !== d.saltBId && d.description.trim().length >= 3;
  return (
    <Modal open onClose={onClose} size="lg" title="Do salts ka aapas me asar" description="Nuskhe me dono hon to pharmacist ko warning dikhegi"
      footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Wapas</Button><Button disabled={!ok} loading={save.isPending} onClick={() => save.mutate()}>Save</Button></div>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Select label="Pehla salt" value={d.saltAId} onChange={(e) => setD({ ...d, saltAId: e.target.value })} options={options} />
        <Select label="Doosra salt" value={d.saltBId} onChange={(e) => setD({ ...d, saltBId: e.target.value })} options={options} error={d.saltAId && d.saltAId === d.saltBId ? 'Do alag salt chunein' : undefined} />
        <Select label="Kitna sakht" value={d.severity} onChange={(e) => setD({ ...d, severity: e.target.value as DrugInteraction['severity'] })} options={Object.entries(SEVERITY).map(([value, v]) => ({ value, label: v.label }))} wrapperClassName="sm:col-span-2" />
        <Textarea label="Kya hota hai" required rows={2} value={d.description} onChange={(e) => setD({ ...d, description: e.target.value })} placeholder="Khoon patla hone ka khatra badhta hai" />
        <Textarea label="Kya karein" rows={2} value={d.management} onChange={(e) => setD({ ...d, management: e.target.value })} placeholder="Doctor se poochein, dose kam" />
      </div>
    </Modal>
  );
}

export default function SaltsPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const searchRef = useRef<HTMLInputElement>(null);
  const canEdit = usePermission(PERMISSIONS.PRODUCTS_EDIT);
  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const [schedule, setSchedule] = useState('');
  const [sort, setSort] = useState<'name' | 'brands'>('brands');
  const [editing, setEditing] = useState<Salt | 'new' | null>(null);
  const [brands, setBrands] = useState<Salt | null>(null);
  const [clash, setClash] = useState(false);
  const q = useDebounced(search.trim());
  usePageKeys(searchRef, { n: () => canEdit && setEditing('new') });

  const { data: salts = [], isLoading, isFetching } = useQuery({ queryKey: ['pharmacy-salts', 'page', q], queryFn: () => saltsApi.list({ search: q || undefined }) });
  const { data: clashes = [] } = useQuery({ queryKey: ['pharmacy-interactions', 'all'], queryFn: () => interactionsApi.list() });
  const refresh = () => { qc.invalidateQueries({ queryKey: ['pharmacy-salts'] }); qc.invalidateQueries({ queryKey: ['pharmacy-interactions'] }); };
  const toggle = useMutation({
    mutationFn: (s: Salt) => (s.isActive ? saltsApi.remove(s.id) : saltsApi.update(s.id, { name: s.name, isActive: true })),
    onSuccess: (_r, s) => { toast.success(s.isActive ? `${s.name} band` : `${s.name} chalu`); refresh(); },
    onError: (e) => toast.error(apiError(e)),
  });
  const dropClash = useMutation({ mutationFn: (id: string) => interactionsApi.remove(id), onSuccess: refresh, onError: (e) => toast.error(apiError(e)) });

  const brandCount = (s: Salt) => s._count?.productSalts ?? 0;
  const counts = { all: salts.filter((s) => s.isActive).length, rx: salts.filter((s) => s.isActive && s.requiresPrescription).length, register: salts.filter((s) => s.isActive && isRegister(s)).length, off: salts.filter((s) => !s.isActive).length };
  const rows = useMemo(() => salts
    .filter((s) => (tab === 'off' ? !s.isActive : s.isActive && (tab !== 'rx' || s.requiresPrescription) && (tab !== 'register' || isRegister(s))))
    .filter((s) => !schedule || s.scheduleClass === schedule)
    .sort((a, b) => (sort === 'name' ? a.name.localeCompare(b.name) : brandCount(b) - brandCount(a) || a.name.localeCompare(b.name))), [salts, tab, schedule, sort]);
  const unused = salts.filter((s) => s.isActive && brandCount(s) === 0).length;

  return (
    <PageShell>
      {editing && <SaltModal salt={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); refresh(); }} />}
      {brands && <BrandsModal salt={brands} onClose={() => setBrands(null)} />}
      {clash && <ClashModal salts={salts} onClose={() => setClash(false)} onSaved={() => { setClash(false); refresh(); }} />}
      {guide.isOpen && (
        <PageGuide title="Salts — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Beaker, color: '#0891b2', title: 'Salt kya hai', text: 'Dawai ka asal formula (generic) — Panadol aur Calpol dono Paracetamol hain. Har dawai par salt aur strength likhein.' },
            { icon: Pill, color: '#16a34a', title: 'Brands', text: 'Salt par click karein — isi formula ki saari dawaiyan, sasti aur shelf wali pehle. Grahak ki dawai na ho to yahan se substitute.' },
            { icon: ShieldAlert, color: '#e11d48', title: 'Register wale', text: 'Narcotic / controlled salt ki dawai bechte waqt doctor aur mareez ka naam register me jata hai.' },
            { icon: Zap, color: '#d97706', title: 'Aapas me asar', text: '"Asar" tab me likhein ke kaun se do salt saath nahi chalte — nuskha likhte waqt warning aati hai.' },
          ]}
          shortcuts={[['/', 'search'], ['N', 'naya salt'], ['G', 'guide']]} />
      )}

      <PageHero title="Salts / formula" chip={<><Beaker />{counts.all} salt</>} busy={isFetching && !isLoading} loading={isLoading}
        meta="Generic naam, brands aur aapas ka asar"
        actions={<>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canEdit && <button type="button" onClick={() => setEditing('new')} className={heroPrimaryButton}><Plus className="h-4 w-4" />Naya salt</button>}
        </>}
        stats={[
          { label: 'Chalu salts', value: String(counts.all) },
          { label: 'Nuskhe wale', value: String(counts.rx) },
          { label: 'Register wale', value: String(counts.register) },
          { label: 'Aapas me asar', value: String(clashes.length) },
        ]} />

      <KpiRow cols={4}>
        {isLoading ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : (
          <>
            <KpiCard icon={Beaker} color="#0891b2" label="Chalu" value={counts.all} hint={unused ? `${unused} kisi dawai me nahi` : 'Sab kisi dawai me'} onClick={() => setTab('all')} active={tab === 'all'} />
            <KpiCard icon={HeartPulse} color="#d97706" label="Nuskhe par" value={counts.rx} onClick={() => setTab('rx')} active={tab === 'rx'} />
            <KpiCard icon={ShieldAlert} color="#e11d48" label="Register wale" value={counts.register} onClick={() => setTab('register')} active={tab === 'register'} />
            <KpiCard icon={Zap} color="#7c3aed" label="Aapas me asar" value={clashes.length} onClick={() => setTab('clash')} active={tab === 'clash'} />
          </>
        )}
      </KpiRow>

      <FilterBar
        search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Salt ka naam ya doosra naam…" />}
        chips={(schedule || search.trim()) ? <>
          {schedule && <FilterChip onRemove={() => setSchedule('')}>{SCHEDULE_META[schedule]?.label}</FilterChip>}
          {search.trim() && <FilterChip onRemove={() => setSearch('')}>"{search.trim()}"</FilterChip>}
        </> : undefined}
        onClear={() => { setSearch(''); setSchedule(''); }}>
        <FilterMenu icon={ShieldAlert} label="Schedule" value={schedule || 'all'} active={!!schedule} options={[{ value: 'all', label: 'Sab' }, ...SCHEDULES.map((k) => ({ value: k, label: SCHEDULE_META[k].label, hint: SCHEDULE_META[k].hint }))]} onChange={(v) => setSchedule(v === 'all' ? '' : v)} />
        <FilterMenu icon={ArrowDownWideNarrow} label="Sort" value={sort} align="right" width="w-56" onChange={setSort} options={[{ value: 'brands', label: 'Zyada brands pehle' }, { value: 'name', label: 'Naam se' }]} />
      </FilterBar>

      <ViewTabs value={tab} onChange={setTab}
        right={tab === 'clash' && canEdit ? <Button size="sm" onClick={() => setClash(true)} leftIcon={<Plus className="h-4 w-4" />}>Asar likhein</Button> : undefined}
        tabs={[{ id: 'all', label: 'Sab', count: counts.all }, { id: 'rx', label: 'Nuskhe wale', count: counts.rx }, { id: 'register', label: 'Register', count: counts.register }, { id: 'clash', label: 'Aapas me asar', icon: Zap, count: clashes.length }, { id: 'off', label: 'Band', count: counts.off }]} />

      <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
        {isLoading ? <div className="space-y-2 p-4">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
          : tab === 'clash' ? (
            clashes.length === 0 ? <p className="px-6 py-14 text-center text-[0.875rem] text-slate-500">Abhi kuch nahi likha. Jaise: Warfarin + Aspirin — khoon patla hone ka khatra.</p> : (
              <ul className="divide-y divide-slate-100">
                {clashes.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-slate-900">{c.saltA?.name} + {c.saltB?.name}</span>
                      <span className="block text-[0.8125rem] text-slate-600">{c.description}{c.management && ` — ${c.management}`}</span>
                    </span>
                    <span className={cn('rounded-full px-2.5 py-0.5 text-[0.75rem] font-semibold', SEVERITY[c.severity].tone)}>{SEVERITY[c.severity].label}</span>
                    {canEdit && <button type="button" aria-label="Hatayein" onClick={() => dropClash.mutate(c.id)} className="flex h-8 w-8 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>}
                  </li>
                ))}
              </ul>
            )
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-16 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700"><Beaker className="h-7 w-7" /></span>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">{search || schedule ? 'Is filter me koi salt nahi' : 'Abhi koi salt nahi'}</h3>
              <p className="mt-1 text-[0.875rem] text-slate-500">Dawai banate waqt Formula step me salt likhein — yahan khud aa jayega.</p>
            </div>
          ) : (
            <Table minWidth="48rem">
              <THead><Tr>
                <Th className="px-5 py-2.5">Salt</Th><Th className="px-3 py-2.5">Schedule</Th><Th className="px-3 py-2.5">Dose</Th><Th align="right" className="px-3 py-2.5">Brands</Th><Th className="px-5 py-2.5"/>
              </Tr></THead>
              <TBody>
                {rows.map((s) => {
                  const meta = SCHEDULE_META[s.scheduleClass];
                  const n = brandCount(s);
                  return (
                    <Tr key={s.id} className={cn(!s.isActive && 'opacity-60')}>
                      <Td className="px-5 py-2.5">
                        <button type="button" onClick={() => setBrands(s)} className="font-semibold text-slate-900 hover:text-brand-700">{s.name}</button>
                        <p className="flex flex-wrap items-center gap-1.5 text-[0.75rem] text-slate-500">
                          {s.genericName && <span>{s.genericName}</span>}{s.category && <span>· {s.category}</span>}
                          {s.isPediatricSafe && <span className="inline-flex items-center gap-0.5 text-emerald-700"><Baby className="h-3 w-3" />bachon ke liye</span>}
                        </p>
                      </Td>
                      <Td className="px-3 py-2.5">{meta && <span className={cn('rounded-md px-1.5 py-0.5 text-[0.75rem] font-semibold ring-1', meta.tone)}>{meta.label}</span>}{isRegister(s) && <ShieldAlert className="ml-1.5 inline h-4 w-4 text-rose-600" />}</Td>
                      <Td className="px-3 py-2.5 text-slate-600">{[s.standardDose, s.maxDailyDose && `zyada ${s.maxDailyDose}`].filter(Boolean).join(' · ') || '—'}</Td>
                      <Td align="right" className="px-3 py-2.5"><button type="button" onClick={() => setBrands(s)} className={cn('font-semibold tabular-nums hover:underline', n ? 'text-brand-700' : 'text-slate-400')}>{n}</button></Td>
                      <Td className="px-5 py-2.5">
                        {canEdit && (
                          <div className="flex justify-end gap-1">
                            <button type="button" onClick={() => setEditing(s)} title="Badlein" aria-label="Badlein" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"><Pencil className="h-4 w-4" /></button>
                            <button type="button" onClick={() => toggle.mutate(s)} title={s.isActive ? 'Band karein' : 'Chalu karein'} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"><Power className="h-4 w-4" /></button>
                          </div>
                        )}
                      </Td>
                    </Tr>
                  );
                })}
              </TBody>
            </Table>
          )}
      </section>
    </PageShell>
  );
}
