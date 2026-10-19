/**
 * Vehicle companies and their models, on one page: the list parts are
 * fitted to and vehicles are picked from. Pakistani companies with their
 * common cars and bikes can be added in one click; anything missing is
 * added by hand. Nothing is deleted — a company or model is switched off.
 *
 * Keys: N new company · M new model · / search · G guide.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Bike, Car, Factory, GraduationCap, Package, Pencil, Plus, Power, Sparkles } from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import {
  Button, FilterBar, Input, Kbd, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Select, Skeleton,
  heroButton, heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { vehicleMakesApi, type VehicleMake, type VehicleMakeInput } from '../api/vehicle-makes.api';
import { vehicleModelsApi, type VehicleModel, type VehicleModelInput, type VehicleType } from '../api/vehicle-models.api';
import { MAKES_KEY, MODELS_KEY, VEHICLE_TYPES, apiError, digits, vehicleTypeOf } from '../components/meta';

const BIKES: VehicleType[] = ['MOTORCYCLE', 'SCOOTER', 'RICKSHAW'];

export default function VehicleMakesPage() {
  const qc = useQueryClient();
  const canEdit = usePermission(PERMISSIONS.PRODUCTS_EDIT);
  const guide = usePageGuide();
  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [showOff, setShowOff] = useState(false);
  const [makeId, setMakeId] = useState('');
  const [makeForm, setMakeForm] = useState<VehicleMake | 'new' | null>(null);
  const [modelForm, setModelForm] = useState<VehicleModel | 'new' | null>(null);

  const makesQ = useQuery({ queryKey: [MAKES_KEY, 'all'], queryFn: () => vehicleMakesApi.list() });
  const modelsQ = useQuery({ queryKey: [MODELS_KEY, 'all'], queryFn: () => vehicleModelsApi.list() });
  const refresh = () => [MAKES_KEY, MODELS_KEY].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

  const makes = useMemo(() => {
    const q = search.trim().toLowerCase();
    const modelHit = new Set((modelsQ.data ?? []).filter((m) => q && m.name.toLowerCase().includes(q)).map((m) => m.makeId));
    return (makesQ.data ?? []).filter((m) => (showOff || m.isActive) && (!q || m.name.toLowerCase().includes(q) || modelHit.has(m.id)));
  }, [makesQ.data, modelsQ.data, search, showOff]);
  const make = makesQ.data?.find((m) => m.id === makeId) ?? makes[0];
  const models = (modelsQ.data ?? []).filter((m) => m.makeId === make?.id && (showOff || m.isActive))
    .filter((m) => !search.trim() || make?.name.toLowerCase().includes(search.trim().toLowerCase()) || m.name.toLowerCase().includes(search.trim().toLowerCase()));
  const total = { makes: (makesQ.data ?? []).filter((m) => m.isActive).length, models: (modelsQ.data ?? []).filter((m) => m.isActive).length };
  const bikes = (modelsQ.data ?? []).filter((m) => m.isActive && BIKES.includes(m.vehicleType)).length;

  const seed = useMutation({
    mutationFn: () => vehicleMakesApi.seedPakistani(),
    onSuccess: (r) => { toast.success(r.created || r.models ? `${r.created} company aur ${r.models} model daal diye` : 'Sab pehle se maujood hain'); refresh(); },
    onError: (e) => toast.error(apiError(e, 'Nahi hua')),
  });
  const saveMake = useMutation({
    mutationFn: (v: VehicleMakeInput) => (makeForm && makeForm !== 'new' ? vehicleMakesApi.update(makeForm.id, v) : vehicleMakesApi.create(v)),
    onSuccess: (m) => { toast.success(`${m.name} save ho gayi`); setMakeId(m.id); setMakeForm(null); refresh(); },
    onError: (e) => toast.error(apiError(e, 'Company save nahi hui')),
  });
  const saveModel = useMutation({
    mutationFn: (v: VehicleModelInput) => (modelForm && modelForm !== 'new' ? vehicleModelsApi.update(modelForm.id, v) : vehicleModelsApi.create(v)),
    onSuccess: (m) => { toast.success(`${m.name} save ho gaya`); setModelForm(null); refresh(); },
    onError: (e) => toast.error(apiError(e, 'Model save nahi hua')),
  });
  const toggleMake = useMutation({
    mutationFn: (m: VehicleMake) => (m.isActive ? vehicleMakesApi.remove(m.id) : vehicleMakesApi.update(m.id, { isActive: true })),
    onSuccess: (_r, m) => { toast.success(m.isActive ? `${m.name} band — purani gaariyan aur parts waise hi` : `${m.name} chalu`); refresh(); },
    onError: (e) => toast.error(apiError(e, 'Nahi hua')),
  });
  const toggleModel = useMutation({
    mutationFn: (m: VehicleModel) => (m.isActive ? vehicleModelsApi.remove(m.id) : vehicleModelsApi.update(m.id, { isActive: true })),
    onSuccess: (_r, m) => { toast.success(m.isActive ? `${m.name} band` : `${m.name} chalu`); refresh(); },
    onError: (e) => toast.error(apiError(e, 'Nahi hua')),
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen() || !canEdit) return;
      if (e.key === 'n' || e.key === 'N') { e.preventDefault(); setMakeForm('new'); }
      if ((e.key === 'm' || e.key === 'M') && make) { e.preventDefault(); setModelForm('new'); }
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canEdit, make]);

  const loading = makesQ.isLoading || modelsQ.isLoading;
  return (
    <PageShell>
      <PageHero
        title="Company aur model"
        chip={<><Car /> Gaariyan</>}
        meta="Parts kis gaari me lagte hain aur job me gaari chunna — isi list se"
        actions={<>
          {canEdit && <button type="button" onClick={() => seed.mutate()} disabled={seed.isPending} className={heroButton}><Sparkles className="h-4 w-4" /><span className="hidden sm:inline">Pakistani list daalein</span></button>}
          <Link to="/autoparts/parts" className={heroButton}><Package className="h-4 w-4" /><span className="hidden sm:inline">Parts</span></Link>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canEdit && <button type="button" onClick={() => setMakeForm('new')} title="Nayi company (N)" className={heroPrimaryButton}><Plus className="h-4 w-4" /> Company</button>}
        </>}
        loading={loading}
        stats={[{ label: 'Company', value: total.makes }, { label: 'Model', value: total.models }, { label: 'Bike / rickshaw model', value: bikes }]}
      />

      <KpiRow cols={3}>
        <KpiCard icon={Factory} color="#2563eb" label="Company" value={total.makes} hint="Toyota, Honda, Suzuki…" />
        <KpiCard icon={Car} color="#0891b2" label="Car / jeep model" value={total.models - bikes} />
        <KpiCard icon={Bike} color="#d97706" label="Bike / rickshaw" value={bikes} />
      </KpiRow>

      <FilterBar search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Company ya model — Corolla, CD 70…" label="Search" />}>
        <button type="button" onClick={() => setShowOff(!showOff)} aria-pressed={showOff}
          className={cn('inline-flex h-11 items-center gap-1.5 rounded-2xl px-4 text-[0.8125rem] font-semibold ring-1', showOff ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-700 ring-slate-200')}>
          <Power className="h-4 w-4" />Band bhi dikhayein
        </button>
      </FilterBar>

      {loading ? <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]"><Skeleton className="h-96 rounded-3xl" /><Skeleton className="h-96 rounded-3xl" /></div>
        : !makesQ.data?.length ? (
          <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
            <Factory className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 font-semibold text-slate-900">Abhi koi company nahi</p>
            <p className="mt-1 text-sm text-slate-500">Ek click me Toyota, Honda, Suzuki, Yamaha… aur un ke aam model daal lein.</p>
            {canEdit && <Button className="mt-4" loading={seed.isPending} onClick={() => seed.mutate()} leftIcon={<Sparkles className="h-4 w-4" />}>Pakistani list daalein</Button>}
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
            <ul className="max-h-[36rem] overflow-y-auto rounded-3xl bg-white p-2 shadow-sm ring-1 ring-slate-200/80">
              {makes.length === 0 && <li className="px-3 py-6 text-center text-[0.8125rem] text-slate-500">Koi company nahi mili</li>}
              {makes.map((m) => {
                const count = (modelsQ.data ?? []).filter((x) => x.makeId === m.id && x.isActive).length;
                return (
                  <li key={m.id}>
                    <button type="button" onClick={() => setMakeId(m.id)}
                      className={cn('flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[0.875rem]', make?.id === m.id ? 'bg-brand-50 text-brand-900 ring-1 ring-brand-200' : 'hover:bg-slate-50', !m.isActive && 'opacity-60')}>
                      <span className="min-w-0 flex-1 truncate font-medium">{m.name}</span>
                      <span className="text-[0.75rem] tabular-nums text-slate-500">{count}</span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <section className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
              {make && (
                <header className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-[1.0625rem] font-bold text-slate-900">{make.name}{!make.isActive && <span className="ml-2 text-[0.75rem] font-medium text-slate-500">(band)</span>}</h2>
                    <p className="text-[0.75rem] text-slate-500">{make.country ? `${make.country} · ` : ''}{models.length} model</p>
                  </div>
                  {canEdit && <>
                    <Button size="sm" variant="ghost" leftIcon={<Pencil className="h-3.5 w-3.5" />} onClick={() => setMakeForm(make)}>Badlein</Button>
                    <Button size="sm" variant="ghost" leftIcon={<Power className="h-3.5 w-3.5" />} loading={toggleMake.isPending} onClick={() => toggleMake.mutate(make)}>{make.isActive ? 'Band' : 'Chalu'}</Button>
                    <Button size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={() => setModelForm('new')}>Model (M)</Button>
                  </>}
                </header>
              )}
              {models.length === 0 ? <p className="px-4 py-10 text-center text-[0.8125rem] text-slate-500">Is company ka koi model nahi — “Model” se jorein</p> : (
                <ul className="grid gap-2 p-3 sm:grid-cols-2 xl:grid-cols-3">
                  {models.map((m) => (
                    <li key={m.id} className={cn('flex items-center gap-2 rounded-2xl px-3 py-2.5 ring-1 ring-slate-200', !m.isActive && 'opacity-60')}>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">{BIKES.includes(m.vehicleType) ? <Bike className="h-4 w-4" /> : <Car className="h-4 w-4" />}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold text-slate-900">{m.name}</span>
                        <span className="block truncate text-[0.75rem] text-slate-500">{vehicleTypeOf(m.vehicleType)}{m.yearFrom || m.yearTo ? ` · ${m.yearFrom ?? ''}–${m.yearTo ?? 'ab tak'}` : ''}{m.engineOptions.length ? ` · ${m.engineOptions.join(', ')}` : ''}</span>
                      </span>
                      {canEdit && <>
                        <button type="button" onClick={() => setModelForm(m)} aria-label={`${m.name} badlein`} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"><Pencil className="h-3.5 w-3.5" /></button>
                        <button type="button" onClick={() => toggleModel.mutate(m)} aria-label={m.isActive ? `${m.name} band karein` : `${m.name} chalu karein`} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"><Power className="h-3.5 w-3.5" /></button>
                      </>}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}

      <p className="hidden items-center gap-1 px-1 text-[0.75rem] text-slate-500 sm:flex">{canEdit && <><Kbd>N</Kbd> company · <Kbd>M</Kbd> model · </>}<Kbd>/</Kbd> search · <Kbd>G</Kbd> guide</p>

      {makeForm && <MakeModal make={makeForm === 'new' ? null : makeForm} pending={saveMake.isPending} onSave={(v) => saveMake.mutate(v)} onClose={() => setMakeForm(null)} />}
      {modelForm && make && (
        <ModelModal makes={(makesQ.data ?? []).filter((m) => m.isActive || m.id === make.id)} makeId={make.id} model={modelForm === 'new' ? null : modelForm}
          pending={saveModel.isPending} onSave={(v) => saveModel.mutate(v)} onClose={() => setModelForm(null)} />
      )}

      {guide.isOpen && (
        <PageGuide title="Company aur model — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Sparkles, color: '#7c3aed', title: 'Ek click', text: '"Pakistani list daalein" se Toyota, Honda, Suzuki, Yamaha, United… aur un ke aam model aa jate hain. Pehle se maujood cheez nahi badalti.' },
            { icon: Package, color: '#ea580c', title: 'Parts ke liye', text: 'Part ke "Gaari" step me yahi company aur model chune jate hain — counter par "corolla brake" se part milta hai.' },
            { icon: Power, color: '#64748b', title: 'Band karein', text: 'Jo company ya model nahi chahiye band kar dein — purani gaariyan aur parts waise hi rehte hain.' },
          ]}
          shortcuts={[['N', 'company'], ['M', 'model'], ['/', 'dhoondein'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}

function MakeModal({ make, pending, onSave, onClose }: { make: VehicleMake | null; pending: boolean; onSave: (v: VehicleMakeInput) => void; onClose: () => void }) {
  const [name, setName] = useState(make?.name ?? '');
  const [country, setCountry] = useState(make?.country ?? '');
  const bad = name.trim().length < 2;
  const submit = () => { if (!bad && !pending) onSave({ name: name.trim(), country: country.trim() || undefined }); };
  return (
    <Modal open onClose={onClose} size="sm" title={make ? `${make.name} badlein` : 'Nayi company'}
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button onClick={submit} disabled={bad} loading={pending}>Save</Button></>}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <Input label="Naam" required value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="Toyota" error={name && bad ? 'Kam se kam 2 harf' : undefined} />
        <Input label="Mulk" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Japan" hint="Marzi hai" />
      </form>
    </Modal>
  );
}

function ModelModal({ makes, makeId, model, pending, onSave, onClose }: {
  makes: VehicleMake[]; makeId: string; model: VehicleModel | null; pending: boolean; onSave: (v: VehicleModelInput) => void; onClose: () => void;
}) {
  const [f, setF] = useState({
    makeId: model?.makeId ?? makeId, name: model?.name ?? '', type: model?.vehicleType ?? ('CAR' as VehicleType),
    from: model?.yearFrom ? String(model.yearFrom) : '', to: model?.yearTo ? String(model.yearTo) : '', engines: model?.engineOptions.join(', ') ?? '',
  });
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));
  const badYears = !!f.from && !!f.to && Number(f.from) > Number(f.to);
  const bad = f.name.trim().length < 1 || badYears;
  const submit = () => {
    if (bad || pending) return;
    onSave({
      makeId: f.makeId, name: f.name.trim(), vehicleType: f.type, yearFrom: f.from ? Number(f.from) : undefined, yearTo: f.to ? Number(f.to) : undefined,
      engineOptions: f.engines.split(',').map((x) => x.trim()).filter(Boolean),
    });
  };
  return (
    <Modal open onClose={onClose} size="md" title={model ? `${model.name} badlein` : 'Naya model'}
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button onClick={submit} disabled={bad} loading={pending}>Save</Button></>}>
      <form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <Select label="Company" value={f.makeId} onChange={(e) => set({ makeId: e.target.value })} options={makes.map((m) => ({ value: m.id, label: m.name }))} />
        <Input label="Model" required value={f.name} onChange={(e) => set({ name: e.target.value })} autoFocus placeholder="Corolla" />
        <Select label="Gaari ki type" value={f.type} onChange={(e) => set({ type: e.target.value as VehicleType })} options={VEHICLE_TYPES.map((t) => ({ value: t, label: vehicleTypeOf(t) }))} />
        <Input label="Engine" value={f.engines} onChange={(e) => set({ engines: e.target.value })} placeholder="1300cc, 1600cc" hint="Comma se alag — marzi hai" />
        <Input label="Saal se" inputMode="numeric" value={f.from} onChange={(e) => set({ from: digits(e.target.value).slice(0, 4) })} placeholder="2014" />
        <Input label="Saal tak" inputMode="numeric" value={f.to} onChange={(e) => set({ to: digits(e.target.value).slice(0, 4) })} placeholder="Ab tak" error={badYears ? '“Se” se kam hai' : undefined} />
      </form>
    </Modal>
  );
}
