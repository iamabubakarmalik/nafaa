/**
 * Medicine editor on the shared product editor: brand name and form, the
 * formula (salts with strength, which gives the generic name and the
 * substitutes), packing for loose and strip/box sale, schedule and storage,
 * and opening stock by batch with expiry.
 */

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Beaker, FileText, Plus, ShieldAlert, Snowflake, Star, Thermometer, Trash2 } from 'lucide-react';
import { cn } from '@core/lib/cn';
import { ProductEditorPage } from '@modules/inventory/products/editor/ProductEditorPage';
import { basicStep, priceStep, stockStep } from '@modules/inventory/products/editor/coreSteps';
import { Chip, NumberField, Section, TextField, Tiles, Toggle, inputClass } from '@modules/inventory/products/editor/fields';
import type { CoreOptions, EditorConfig, Errors, StepContext, StepDef } from '@modules/inventory/products/editor/types';
import { medicinesApi, type StorageCondition } from '../api/medicines.api';
import { saltsApi, type Salt } from '../api/salts.api';
import { MEDICINE_FACTS_KEY } from '../hooks/useMedicineFacts';
import { DOSAGE_FORMS, REGISTER_CLASSES, SCHEDULES, SCHEDULE_META, STORAGE_META } from '../lib/meta';

interface SaltLine { saltId: string; name: string; strength: string; isMainSalt: boolean }

export interface PharmacyExtra {
  dosageForm: string; packSize: string; manufacturer: string; registrationNumber: string; isGeneric: boolean;
  salts: SaltLine[];
  scheduleClass: string; requiresPrescription: boolean; isNarcotic: boolean;
  storageCondition: StorageCondition; requiresColdChain: boolean; minTemperature: number | null; maxTemperature: number | null;
  indication: string; storageInstructions: string;
}

const initial: PharmacyExtra = {
  dosageForm: 'Tablet', packSize: '', manufacturer: '', registrationNumber: '', isGeneric: false, salts: [],
  scheduleClass: 'OTC', requiresPrescription: false, isNarcotic: false,
  storageCondition: 'ROOM_TEMPERATURE', requiresColdChain: false, minTemperature: null, maxTemperature: null,
  indication: '', storageInstructions: '',
};

const STRENGTHS = ['5mg', '10mg', '20mg', '50mg', '100mg', '250mg', '500mg', '1g', '125mg/5ml', '250mg/5ml'];
const opt = (v: string) => v.trim() || undefined;
const isRegister = (x: PharmacyExtra) => x.isNarcotic || REGISTER_CLASSES.includes(x.scheduleClass);

/* ── Basic step addition: form, maker, DRAP number ── */
function Identity({ ctx }: { ctx: StepContext<PharmacyExtra> }) {
  const x = ctx.draft.extra;
  return (
    <div className="space-y-4">
      <div>
        <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Shakal (form)</span>
        <div className="flex flex-wrap gap-1.5">
          {DOSAGE_FORMS.map((f) => <Chip key={f} on={x.dosageForm === f} onClick={() => ctx.setExtra({ dosageForm: x.dosageForm === f ? '' : f })}>{f}</Chip>)}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <TextField label="Company" value={x.manufacturer} onChange={(manufacturer) => ctx.setExtra({ manufacturer })} placeholder="GSK, Getz, Searle…" hint="Card aur substitute list par dikhti hai" />
        <TextField label="Pack" value={x.packSize} onChange={(packSize) => ctx.setExtra({ packSize })} placeholder="10 x 10 tablets, 60 ml" hint="Dabbe par likha pack" />
        <TextField label="DRAP registration" value={x.registrationNumber} onChange={(registrationNumber) => ctx.setExtra({ registrationNumber })} placeholder="Reg. No. 012345" />
      </div>
      <Toggle on={x.isGeneric} onChange={(isGeneric) => ctx.setExtra({ isGeneric })} title="Generic dawai" hint="Brand ke bagair, sirf formula ke naam se bikti hai" />
    </div>
  );
}

/* ── Formula step: salts with strength ── */
function Formula({ ctx }: { ctx: StepContext<PharmacyExtra> }) {
  const qc = useQueryClient();
  const x = ctx.draft.extra;
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const { data: salts = [] } = useQuery({ queryKey: ['pharmacy-salts', 'all'], queryFn: () => saltsApi.list().catch(() => [] as Salt[]), staleTime: 5 * 60_000 });
  const taken = new Set(x.salts.map((s) => s.saltId));
  const q = query.trim().toLowerCase();
  const matches = q ? salts.filter((s) => s.isActive && !taken.has(s.id) && [s.name, s.genericName, s.code].some((v) => (v ?? '').toLowerCase().includes(q))).slice(0, 8) : [];
  const exact = salts.some((s) => s.name.toLowerCase() === q);
  const add = (s: Pick<Salt, 'id' | 'name' | 'scheduleClass' | 'isNarcotic' | 'requiresPrescription'>) => {
    const salts2 = [...x.salts, { saltId: s.id, name: s.name, strength: '', isMainSalt: x.salts.length === 0 }];
    // A controlled salt makes the medicine controlled; the owner can still loosen it on the next step.
    const upgrade = s.isNarcotic ? { isNarcotic: true, requiresPrescription: true, scheduleClass: s.scheduleClass }
      : s.requiresPrescription && !x.requiresPrescription ? { requiresPrescription: true } : {};
    ctx.setExtra({ salts: salts2, ...upgrade });
    setQuery('');
  };
  const create = async () => {
    const name = query.trim();
    if (name.length < 2) return;
    setBusy(true);
    try {
      const s = await saltsApi.create({ name });
      qc.invalidateQueries({ queryKey: ['pharmacy-salts'] });
      add(s);
      toast.success(`Salt "${s.name}" ban gaya`);
    } catch (e) {
      toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Salt nahi bana');
    } finally { setBusy(false); }
  };
  const update = (i: number, patch: Partial<SaltLine>) => ctx.setExtra({ salts: x.salts.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
  const generic = x.salts.map((s) => [s.name, s.strength].filter(Boolean).join(' ')).join(' + ');

  return (
    <div className="space-y-4">
      <Section icon={Beaker} title="Formula (salt)" hint="Dawai me kya hai aur kitna — isi se generic naam banta hai aur stock khatam ho to substitute milta hai">
        <div className="relative">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Salt likhein: Paracetamol, Amoxicillin…" className={inputClass}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (matches[0]) add(matches[0]); else if (!exact) void create(); } }} />
          {q && (
            <div className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-slate-200">
              {matches.map((s) => (
                <button key={s.id} type="button" onClick={() => add(s)} className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[0.875rem] hover:bg-brand-50">
                  <span className="font-medium text-slate-900">{s.name}{s.genericName && <span className="ml-1.5 text-slate-500">({s.genericName})</span>}</span>
                  {s.isNarcotic && <span className="rounded bg-rose-100 px-1.5 text-[0.6875rem] font-semibold text-rose-700">Narcotic</span>}
                </button>
              ))}
              {!exact && (
                <button type="button" onClick={() => void create()} disabled={busy} className="flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2 text-left text-[0.875rem] font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-60">
                  <Plus className="h-4 w-4" />"{query.trim()}" naya salt banayein
                </button>
              )}
            </div>
          )}
        </div>
        {x.salts.length === 0 ? (
          <p className="mt-3 rounded-xl bg-slate-50 px-3 py-4 text-center text-[0.8125rem] text-slate-500">Abhi koi salt nahi — upar likh kar jorein. Bagair salt ke bhi save ho jata hai.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {x.salts.map((s, i) => (
              <li key={s.saltId} className="rounded-xl p-3 ring-1 ring-slate-200">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="min-w-0 flex-1 text-[0.9375rem] font-semibold text-slate-900">{s.name}</span>
                  <button type="button" title="Asal salt" onClick={() => ctx.setExtra({ salts: x.salts.map((y, j) => ({ ...y, isMainSalt: j === i })) })}
                    className={cn('inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[0.75rem] font-semibold', s.isMainSalt ? 'bg-amber-100 text-amber-800' : 'text-slate-500 hover:bg-slate-100')}>
                    <Star className="h-3.5 w-3.5" />{s.isMainSalt ? 'Asal' : 'Asal banayein'}
                  </button>
                  <button type="button" aria-label="Hatayein" onClick={() => ctx.setExtra({ salts: x.salts.filter((_, j) => j !== i).map((y, j, arr) => ({ ...y, isMainSalt: arr.some((z) => z.isMainSalt) ? y.isMainSalt : j === 0 })) })}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <input value={s.strength} onChange={(e) => update(i, { strength: e.target.value })} placeholder="Strength: 500mg" className={cn(inputClass, 'h-9 w-36 text-[0.875rem]')} />
                  {STRENGTHS.map((v) => <Chip key={v} on={s.strength === v} onClick={() => update(i, { strength: v })}>{v}</Chip>)}
                </div>
              </li>
            ))}
          </ul>
        )}
        {ctx.errors.salts && <p className="mt-2 text-[0.8125rem] font-medium text-rose-600">{ctx.errors.salts}</p>}
        {generic && <p className="mt-3 text-[0.8125rem] text-slate-600">Generic naam: <strong className="text-slate-900">{generic}</strong></p>}
      </Section>
      <Section title="Kis bimari me" hint="Marzi hai — counter par poochne walon ke kaam aata hai">
        <textarea value={x.indication} onChange={(e) => ctx.setExtra({ indication: e.target.value })} rows={2} placeholder="Bukhar, dard…" className={cn(inputClass, 'h-auto py-2.5')} />
      </Section>
    </div>
  );
}

/* ── Schedule and storage step ── */
function Rules({ ctx }: { ctx: StepContext<PharmacyExtra> }) {
  const x = ctx.draft.extra;
  const set = ctx.setExtra;
  const cold = x.requiresColdChain || x.storageCondition === 'REFRIGERATED' || x.storageCondition === 'FROZEN';
  return (
    <div className="space-y-4">
      <Section icon={ShieldAlert} title="Schedule" hint="Bagair nuskhe ke bik sakti hai ya nahi — POS par isi hisaab se poocha jata hai">
        <Tiles value={x.scheduleClass} onChange={(scheduleClass) => set({ scheduleClass, ...(REGISTER_CLASSES.includes(scheduleClass) && { requiresPrescription: true }) })}
          columns="grid-cols-2 sm:grid-cols-4" options={SCHEDULES.map((k) => ({ value: k, label: SCHEDULE_META[k].label, hint: SCHEDULE_META[k].hint }))} />
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Toggle on={x.requiresPrescription || isRegister(x)} onChange={(requiresPrescription) => set({ requiresPrescription })} icon={FileText}
            title="Nuskhe par bikti hai (Rx)" hint={isRegister(x) ? 'Register wali dawai hamesha nuskhe par' : 'POS par yaad dihani aati hai'} />
          <Toggle on={x.isNarcotic} onChange={(isNarcotic) => set({ isNarcotic, ...(isNarcotic && { requiresPrescription: true }) })} icon={ShieldAlert}
            title="Narcotic register me likhein" hint="Har sale par doctor aur mareez ka naam poocha jayega" />
        </div>
      </Section>
      <Section icon={Thermometer} title="Kahan rakhein" hint="Fridge wali dawai ka temperature Cold Chain log me roz likhein">
        <Tiles value={x.storageCondition} onChange={(storageCondition) => set({ storageCondition, ...((storageCondition === 'REFRIGERATED' || storageCondition === 'FROZEN') && { requiresColdChain: true }) })}
          columns="grid-cols-2 sm:grid-cols-4" options={Object.entries(STORAGE_META).map(([value, label]) => ({ value: value as StorageCondition, label }))} />
        <div className="mt-3">
          <Toggle on={x.requiresColdChain} onChange={(requiresColdChain) => set({ requiresColdChain })} icon={Snowflake} title="Thandi rakhni hai (cold chain)" hint="Card par Fridge ka nishan lagta hai" />
        </div>
        {cold && (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <NumberField label="Kam se kam °C" allowEmpty value={x.minTemperature} onChange={(minTemperature) => set({ minTemperature })} suffix="°C" error={ctx.errors.temperature} />
            <NumberField label="Zyada se zyada °C" allowEmpty value={x.maxTemperature} onChange={(maxTemperature) => set({ maxTemperature })} suffix="°C" />
          </div>
        )}
        <label className="mt-3 block">
          <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Rakhne ki hidayat</span>
          <input value={x.storageInstructions} onChange={(e) => set({ storageInstructions: e.target.value })} placeholder="Dhoop se door, bachon ki pohanch se door" className={inputClass} />
        </label>
      </Section>
    </div>
  );
}

const core: CoreOptions = {
  units: [
    { value: 'tablet', label: 'Tablet' }, { value: 'capsule', label: 'Capsule' }, { value: 'strip', label: 'Strip' },
    { value: 'bottle', label: 'Bottle' }, { value: 'tube', label: 'Tube' }, { value: 'vial', label: 'Vial' },
    { value: 'ampoule', label: 'Ampoule' }, { value: 'sachet', label: 'Sachet' }, { value: 'box', label: 'Box' },
    { value: 'pcs', label: 'Adad (pcs)' }, { value: 'ml', label: 'ml' }, { value: 'gram', label: 'Gram' },
  ],
  skuPrefix: 'MED',
  packs: true,
  variants: false,
  batches: true,
  markups: [10, 15, 17, 20, 25],
};

const formulaStep: StepDef<PharmacyExtra> = {
  id: 'formula', title: 'Formula', hint: 'Salt aur strength', icon: Beaker, render: (ctx) => <Formula ctx={ctx} />,
  validate: (d): Errors => (d.extra.salts.some((s) => !s.strength.trim()) ? { salts: 'Har salt ki strength likhein (jaise 500mg)' } : {}),
};
const rulesStep: StepDef<PharmacyExtra> = {
  id: 'rules', title: 'Schedule', hint: 'Rx, narcotic, fridge', icon: ShieldAlert, render: (ctx) => <Rules ctx={ctx} />,
  validate: (d): Errors => (d.extra.minTemperature != null && d.extra.maxTemperature != null && d.extra.minTemperature > d.extra.maxTemperature
    ? { temperature: 'Kam se kam wala zyada wale se bara hai' } : {}),
};

const config: EditorConfig<PharmacyExtra> = {
  label: 'Pharmacy',
  draftKey: 'nafaa.product-editor.pharmacy',
  paths: { list: '/pharmacy/medicines', detail: (id) => `/pharmacy-medicines/${id}`, create: '/pharmacy-medicines/new' },
  core,
  extra: {
    initial,
    load: async (productId) => {
      const m = await medicinesApi.byProduct(productId).catch(() => null);
      if (!m) return {};
      const ps = ((m.product?.productSalts ?? []) as Array<{ saltId: string; strength: string | null; isMainSalt: boolean; salt?: { name: string } }>);
      return {
        dosageForm: m.dosageForm ?? '', packSize: m.packSize ?? '', manufacturer: m.manufacturer ?? '', registrationNumber: m.registrationNumber ?? '',
        isGeneric: m.isGeneric, scheduleClass: m.scheduleClass, requiresPrescription: m.requiresPrescription, isNarcotic: m.isNarcotic,
        storageCondition: m.storageCondition, requiresColdChain: m.requiresColdChain, minTemperature: m.minTemperature ?? null, maxTemperature: m.maxTemperature ?? null,
        indication: m.indication ?? '', storageInstructions: m.storageInstructions ?? '',
        salts: ps.map((s) => ({ saltId: s.saltId, name: s.salt?.name ?? '', strength: s.strength ?? '', isMainSalt: s.isMainSalt })),
      };
    },
    save: async (productId, d) => {
      const x = d.extra;
      await medicinesApi.upsert({
        productId, dosageForm: opt(x.dosageForm), packSize: opt(x.packSize), manufacturer: opt(x.manufacturer), registrationNumber: opt(x.registrationNumber),
        isGeneric: x.isGeneric, scheduleClass: x.scheduleClass, requiresPrescription: x.requiresPrescription || isRegister(x), isNarcotic: x.isNarcotic,
        storageCondition: x.storageCondition, requiresColdChain: x.requiresColdChain,
        isRefrigerated: x.storageCondition === 'REFRIGERATED' || x.storageCondition === 'FROZEN',
        minTemperature: x.minTemperature ?? undefined, maxTemperature: x.maxTemperature ?? undefined,
        indication: opt(x.indication), storageInstructions: opt(x.storageInstructions),
      });
      await saltsApi.assign(productId, x.salts.map((s) => ({ saltId: s.saltId, strength: s.strength.trim(), isMainSalt: s.isMainSalt })));
    },
  },
  steps: [
    basicStep<PharmacyExtra>(core, { extra: (ctx) => <Identity ctx={ctx} />, namePlaceholder: 'Jaise: Panadol 500mg Tablet', categorySuggestions: ['Bukhar aur dard', 'Antibiotic', 'Pait', 'Khansi aur zukam', 'Sugar', 'BP aur dil', 'Vitamin', 'Bachon ki dawai', 'Cream aur lotion', 'Surgical'] }),
    formulaStep,
    priceStep<PharmacyExtra>(core),
    rulesStep,
    stockStep<PharmacyExtra>(core, { quick: [10, 30, 100, 300, 1000] }),
  ],
  summary: (d) => {
    const x = d.extra;
    const generic = x.salts.map((s) => [s.name, s.strength].filter(Boolean).join(' ')).join(' + ');
    return (
      <div className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-[0.8125rem]">
        {generic && <p className="text-slate-700">{generic}</p>}
        <p className="text-slate-600">{[x.dosageForm, x.manufacturer, SCHEDULE_META[x.scheduleClass]?.label].filter(Boolean).join(' · ')}</p>
        {isRegister(x) && <p className="font-medium text-rose-700">Register wali dawai</p>}
        {x.requiresColdChain && <p className="text-sky-700">Fridge me rakhein</p>}
      </div>
    );
  },
  refresh: [MEDICINE_FACTS_KEY, 'pharmacy-medicines', 'pharmacy-product-detail', 'pharmacy-salts'],
  guide: [
    { icon: Beaker, color: '#0891b2', title: 'Formula', text: 'Salt aur strength likhein — POS par salt se dhoondna aur stock khatam hone par substitute isi se milta hai.' },
    { icon: ShieldAlert, color: '#e11d48', title: 'Schedule', text: 'Narcotic / controlled dawai ki har sale register me jati hai; POS par doctor aur mareez ka naam poocha jata hai.' },
    { icon: FileText, color: '#d97706', title: 'Strip aur box', text: 'Base unit tablet rakhein aur Price step me "Strip = 10" aur "Box = 100" packing jorein — khuli goli aur poora patta dono bikte hain.' },
  ],
};

export default function PharmacyProductEditor() {
  return <ProductEditorPage config={config} />;
}
