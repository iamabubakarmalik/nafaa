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
import { t as tr } from '@core/i18n';

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
    onSuccess: (r) => { toast.success(r.created || r.models ? tr('{{created}} company aur {{models}} model daal diye', { created: r.created, models: r.models }) : tr('Sab pehle se maujood hain')); refresh(); },
    onError: (e) => toast.error(apiError(e, tr('Nahi hua'))),
  });
  const saveMake = useMutation({
    mutationFn: (v: VehicleMakeInput) => (makeForm && makeForm !== 'new' ? vehicleMakesApi.update(makeForm.id, v) : vehicleMakesApi.create(v)),
    onSuccess: (m) => { toast.success(tr('{{name}} save ho gayi', { name: m.name })); setMakeId(m.id); setMakeForm(null); refresh(); },
    onError: (e) => toast.error(apiError(e, tr('Company save nahi hui'))),
  });
  const saveModel = useMutation({
    mutationFn: (v: VehicleModelInput) => (modelForm && modelForm !== 'new' ? vehicleModelsApi.update(modelForm.id, v) : vehicleModelsApi.create(v)),
    onSuccess: (m) => { toast.success(tr('{{name}} save ho gaya', { name: m.name })); setModelForm(null); refresh(); },
    onError: (e) => toast.error(apiError(e, tr('Model save nahi hua'))),
  });
  const toggleMake = useMutation({
    mutationFn: (m: VehicleMake) => (m.isActive ? vehicleMakesApi.remove(m.id) : vehicleMakesApi.update(m.id, { isActive: true })),
    onSuccess: (_r, m) => { toast.success(m.isActive ? tr('{{name}} band — purani gaariyan aur parts waise hi', { name: m.name }) : `${m.name} chalu`); refresh(); },
    onError: (e) => toast.error(apiError(e, tr('Nahi hua'))),
  });
  const toggleModel = useMutation({
    mutationFn: (m: VehicleModel) => (m.isActive ? vehicleModelsApi.remove(m.id) : vehicleModelsApi.update(m.id, { isActive: true })),
    onSuccess: (_r, m) => { toast.success(m.isActive ? `${m.name} band` : `${m.name} chalu`); refresh(); },
    onError: (e) => toast.error(apiError(e, tr('Nahi hua'))),
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
        title={tr('Company aur model')}
        chip={<><Car /> {' '}{tr('Gaariyan')}</>}
        meta={tr('Parts kis gaari me lagte hain aur job me gaari chunna — isi list se')}
        actions={<>
          {canEdit && <button type="button" onClick={() => seed.mutate()} disabled={seed.isPending} className={heroButton}><Sparkles className="h-4 w-4" /><span className="hidden sm:inline">{tr('Pakistani list daalein')}</span></button>}
          <Link to="/autoparts/parts" className={heroButton}><Package className="h-4 w-4" /><span className="hidden sm:inline">{tr('Parts')}</span></Link>
          <button type="button" onClick={guide.open} title={tr('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canEdit && <button type="button" onClick={() => setMakeForm('new')} title={tr('Nayi company (N)')} className={heroPrimaryButton}><Plus className="h-4 w-4" /> {' '}{tr('Company')}</button>}
        </>}
        loading={loading}
        stats={[{ label: tr('Company'), value: total.makes }, { label: tr('Model'), value: total.models }, { label: tr('Bike / rickshaw model'), value: bikes }]}
      />

      <KpiRow cols={3}>
        <KpiCard icon={Factory} color="#2563eb" label={tr('Company')} value={total.makes} hint={tr('Toyota, Honda, Suzuki…')} />
        <KpiCard icon={Car} color="#0891b2" label={tr('Car / jeep model')} value={total.models - bikes} />
        <KpiCard icon={Bike} color="#d97706" label={tr('Bike / rickshaw')} value={bikes} />
      </KpiRow>

      <FilterBar search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder={tr('Company ya model — Corolla, CD 70…')} label={tr('Search')} />}>
        <button type="button" onClick={() => setShowOff(!showOff)} aria-pressed={showOff}
          className={cn('inline-flex h-11 items-center gap-1.5 rounded-2xl px-4 text-[0.8125rem] font-semibold ring-1', showOff ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-700 ring-slate-200')}>
          <Power className="h-4 w-4" />{tr('Band bhi dikhayein')}
        </button>
      </FilterBar>

      {loading ? <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]"><Skeleton className="h-96 rounded-3xl" /><Skeleton className="h-96 rounded-3xl" /></div>
        : !makesQ.data?.length ? (
          <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
            <Factory className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 font-semibold text-slate-900">{tr('Abhi koi company nahi')}</p>
            <p className="mt-1 text-sm text-slate-500">{tr('Ek click me Toyota, Honda, Suzuki, Yamaha… aur un ke aam model daal lein.')}</p>
            {canEdit && <Button className="mt-4" loading={seed.isPending} onClick={() => seed.mutate()} leftIcon={<Sparkles className="h-4 w-4" />}>{tr('Pakistani list daalein')}</Button>}
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
            <ul className="max-h-[36rem] overflow-y-auto rounded-3xl bg-white p-2 shadow-sm ring-1 ring-slate-200/80">
              {makes.length === 0 && <li className="px-3 py-6 text-center text-[0.8125rem] text-slate-500">{tr('Koi company nahi mili')}</li>}
              {makes.map((m) => {
                const count = (modelsQ.data ?? []).filter((x) => x.makeId === m.id && x.isActive).length;
                return (
                  <li key={m.id}>
                    <button type="button" onClick={() => setMakeId(m.id)}
                      className={cn('flex w-full items-center gap-2 rounded-xl px-3 py-2 text-start text-[0.875rem]', make?.id === m.id ? 'bg-brand-50 text-brand-900 ring-1 ring-brand-200' : 'hover:bg-slate-50', !m.isActive && 'opacity-60')}>
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
                    <h2 className="truncate text-[1.0625rem] font-bold text-slate-900">{make.name}{!make.isActive && <span className="ms-2 text-[0.75rem] font-medium text-slate-500">{tr('(band)')}</span>}</h2>
                    <p className="text-[0.75rem] text-slate-500">{tr('{{value}}{{count}} model', { value: make.country ? `${make.country} · ` : '', count: models.length })}</p>
                  </div>
                  {canEdit && <>
                    <Button size="sm" variant="ghost" leftIcon={<Pencil className="h-3.5 w-3.5" />} onClick={() => setMakeForm(make)}>{tr('Badlein')}</Button>
                    <Button size="sm" variant="ghost" leftIcon={<Power className="h-3.5 w-3.5" />} loading={toggleMake.isPending} onClick={() => toggleMake.mutate(make)}>{make.isActive ? tr('Band') : tr('Chalu')}</Button>
                    <Button size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={() => setModelForm('new')}>{tr('Model (M)')}</Button>
                  </>}
                </header>
              )}
              {models.length === 0 ? <p className="px-4 py-10 text-center text-[0.8125rem] text-slate-500">{tr('Is company ka koi model nahi — “Model” se jorein')}</p> : (
                <ul className="grid gap-2 p-3 sm:grid-cols-2 xl:grid-cols-3">
                  {models.map((m) => (
                    <li key={m.id} className={cn('flex items-center gap-2 rounded-2xl px-3 py-2.5 ring-1 ring-slate-200', !m.isActive && 'opacity-60')}>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">{BIKES.includes(m.vehicleType) ? <Bike className="h-4 w-4" /> : <Car className="h-4 w-4" />}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold text-slate-900">{m.name}</span>
                        <span className="block truncate text-[0.75rem] text-slate-500">{vehicleTypeOf(m.vehicleType)}{m.yearFrom || m.yearTo ? ` · ${m.yearFrom ?? ''}–${m.yearTo ?? 'ab tak'}` : ''}{m.engineOptions.length ? ` · ${m.engineOptions.join(', ')}` : ''}</span>
                      </span>
                      {canEdit && <>
                        <button type="button" onClick={() => setModelForm(m)} aria-label={tr('{{name}} badlein', { name: m.name })} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"><Pencil className="h-3.5 w-3.5" /></button>
                        <button type="button" onClick={() => toggleModel.mutate(m)} aria-label={m.isActive ? tr('{{name}} band karein', { name: m.name }) : tr('{{name}} chalu karein', { name: m.name })} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"><Power className="h-3.5 w-3.5" /></button>
                      </>}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}

      <p className="hidden items-center gap-1 px-1 text-[0.75rem] text-slate-500 sm:flex">{canEdit && <><Kbd>N</Kbd> {' '}{tr('company ·')}{' '} <Kbd>M</Kbd> {' '}{tr('model ·')}{' '} </>}<Kbd>/</Kbd> {' '}{tr('search ·')}{' '} <Kbd>G</Kbd> {' '}{tr('guide')}</p>

      {makeForm && <MakeModal make={makeForm === 'new' ? null : makeForm} pending={saveMake.isPending} onSave={(v) => saveMake.mutate(v)} onClose={() => setMakeForm(null)} />}
      {modelForm && make && (
        <ModelModal makes={(makesQ.data ?? []).filter((m) => m.isActive || m.id === make.id)} makeId={make.id} model={modelForm === 'new' ? null : modelForm}
          pending={saveModel.isPending} onSave={(v) => saveModel.mutate(v)} onClose={() => setModelForm(null)} />
      )}

      {guide.isOpen && (
        <PageGuide title={tr('Company aur model — aasaan tareeqa')} onClose={guide.close}
          steps={[
            { icon: Sparkles, color: '#7c3aed', title: tr('Ek click'), text: tr('"Pakistani list daalein" se Toyota, Honda, Suzuki, Yamaha, United… aur un ke aam model aa jate hain. Pehle se maujood cheez nahi badalti.') },
            { icon: Package, color: '#ea580c', title: tr('Parts ke liye'), text: tr('Part ke "Gaari" step me yahi company aur model chune jate hain — counter par "corolla brake" se part milta hai.') },
            { icon: Power, color: '#64748b', title: tr('Band karein'), text: tr('Jo company ya model nahi chahiye band kar dein — purani gaariyan aur parts waise hi rehte hain.') },
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
    <Modal open onClose={onClose} size="sm" title={make ? tr('{{name}} badlein', { name: make.name }) : tr('Nayi company')}
      footer={<><Button variant="secondary" onClick={onClose}>{tr('Rehne dein')}</Button><Button onClick={submit} disabled={bad} loading={pending}>{tr('Save')}</Button></>}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <Input label={tr('Naam')} required value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder={tr('Toyota')} error={name && bad ? tr('Kam se kam 2 harf') : undefined} />
        <Input label={tr('Mulk')} value={country} onChange={(e) => setCountry(e.target.value)} placeholder={tr('Japan')} hint={tr('Marzi hai')} />
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
    <Modal open onClose={onClose} size="md" title={model ? tr('{{name}} badlein', { name: model.name }) : tr('Naya model')}
      footer={<><Button variant="secondary" onClick={onClose}>{tr('Rehne dein')}</Button><Button onClick={submit} disabled={bad} loading={pending}>{tr('Save')}</Button></>}>
      <form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <Select label={tr('Company')} value={f.makeId} onChange={(e) => set({ makeId: e.target.value })} options={makes.map((m) => ({ value: m.id, label: m.name }))} />
        <Input label={tr('Model')} required value={f.name} onChange={(e) => set({ name: e.target.value })} autoFocus placeholder={tr('Corolla')} />
        <Select label={tr('Gaari ki type')} value={f.type} onChange={(e) => set({ type: e.target.value as VehicleType })} options={VEHICLE_TYPES.map((t) => ({ value: t, label: vehicleTypeOf(t) }))} />
        <Input label={tr('Engine')} value={f.engines} onChange={(e) => set({ engines: e.target.value })} placeholder={tr('1300cc, 1600cc')} hint={tr('Comma se alag — marzi hai')} />
        <Input label={tr('Saal se')} inputMode="numeric" value={f.from} onChange={(e) => set({ from: digits(e.target.value).slice(0, 4) })} placeholder="2014" />
        <Input label={tr('Saal tak')} inputMode="numeric" value={f.to} onChange={(e) => set({ to: digits(e.target.value).slice(0, 4) })} placeholder={tr('Ab tak')} error={badYears ? tr('“Se” se kam hai') : undefined} />
      </form>
    </Modal>
  );
}
