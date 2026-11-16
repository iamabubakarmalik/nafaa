/**
 * Pharmacy product editor on the shared product editor. A medical store sells
 * medicines and general items (shampoo, diapers, sugar-free biscuits), so the
 * first choice is "Dawai" or "Aam saman". A medicine gets the medicine steps:
 * details (form, company, pack, DRAP number) with the formula (salts with
 * strength, which gives the generic name and the substitutes), and schedule
 * and storage. A general item skips them. The dosage form follows the category
 * ("Tablets" gives Tablet) and can be changed in the medicine details.
 */

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Beaker, FileText, Pill, Plus, ShieldAlert, Snowflake, Star, Thermometer, Trash2 } from 'lucide-react';
import { cn } from '@core/lib/cn';
import { ProductEditorPage } from '@modules/inventory/products/editor/ProductEditorPage';
import { basicStep, priceStep, stockStep } from '@modules/inventory/products/editor/coreSteps';
import { Chip, NumberField, Section, TextField, Tiles, Toggle, inputClass } from '@modules/inventory/products/editor/fields';
import type { CoreOptions, EditorConfig, EditorDraft, Errors, StepContext, StepDef } from '@modules/inventory/products/editor/types';
import { useCategoryNameSync } from '@modules/inventory/categories/lib/kinds';
import { MEDICINE_CATEGORY_SUGGESTIONS, MEDICINE_UNITS, PHARMACY_GENERAL_CATEGORY_SUGGESTIONS, formForCategory } from '@nafaa/core/industries/pharmacy';
import { medicinesApi, type StorageCondition } from '../api/medicines.api';
import { saltsApi, type Salt } from '../api/salts.api';
import { MEDICINE_FACTS_KEY } from '../hooks/useMedicineFacts';
import { DOSAGE_FORMS, REGISTER_CLASSES, SCHEDULES, SCHEDULE_META, STORAGE_META } from '../lib/meta';
import { t } from '@core/i18n';

interface SaltLine { saltId: string; name: string; strength: string; isMainSalt: boolean }

export interface PharmacyExtra {
  /** Medicine or general item. Editor only: a medicine is a product with medicine details saved. */
  isMedicine: boolean;
  /** Saved medicine details of this product; removed when it becomes a general item. */
  medicineId: string | null;
  dosageForm: string; packSize: string; manufacturer: string; registrationNumber: string; isGeneric: boolean;
  salts: SaltLine[];
  scheduleClass: string; requiresPrescription: boolean; isNarcotic: boolean;
  storageCondition: StorageCondition; requiresColdChain: boolean; minTemperature: number | null; maxTemperature: number | null;
  indication: string; storageInstructions: string;
}

const initial: PharmacyExtra = {
  isMedicine: true, medicineId: null,
  dosageForm: '', packSize: '', manufacturer: '', registrationNumber: '', isGeneric: false, salts: [],
  scheduleClass: 'OTC', requiresPrescription: false, isNarcotic: false,
  storageCondition: 'ROOM_TEMPERATURE', requiresColdChain: false, minTemperature: null, maxTemperature: null,
  indication: '', storageInstructions: '',
};

/** Therapeutic groups some shops file medicines by, offered after the dosage forms. */
const THERAPY_SUGGESTIONS = ['Bukhar aur dard', 'Antibiotic', 'Khansi aur zukam', 'Pait', 'Sugar', 'BP aur dil', 'Bachon ki dawai'];

const STRENGTHS = ['5mg', '10mg', '20mg', '50mg', '100mg', '250mg', '500mg', '1g', '125mg/5ml', '250mg/5ml'];
const opt = (v: string) => v.trim() || undefined;
const isRegister = (x: PharmacyExtra) => x.isNarcotic || REGISTER_CLASSES.includes(x.scheduleClass);
/** Drafts saved before the choice existed are medicines. */
const isMed = (x: PharmacyExtra) => x.isMedicine !== false;

/* ── Basic step addition: medicine or general item; the form follows the category ── */
function ItemType({ ctx }: { ctx: StepContext<PharmacyExtra> }) {
  const x = ctx.draft.extra;
  const med = isMed(x);
  useCategoryNameSync(ctx.draft.core.categoryId, (names) => (isMed(ctx.draft.extra) ? formForCategory(names, ctx.draft.extra.dosageForm) : null), (dosageForm) => ctx.setExtra({ dosageForm }));
  const pick = (v: 'med' | 'general') => {
    const isMedicine = v === 'med';
    if (isMedicine === med) return;
    ctx.setExtra({ isMedicine });
    // A new product starts on a fitting unit: pieces for a general item, tablets for a medicine.
    if (!ctx.isEdit) {
      const unit = ctx.draft.core.unit;
      if (!isMedicine && MEDICINE_UNITS.includes(unit)) ctx.setCore({ unit: 'pcs' });
      if (isMedicine && unit === 'pcs') ctx.setCore({ unit: 'tablet' });
    }
  };
  return (
    <div>
      <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">{t('Ye kya hai')}</span>
      <Tiles value={med ? 'med' : 'general'} onChange={pick} columns="grid-cols-2"
        options={[
          { value: 'med', label: t('Dawai'), hint: t('Formula, schedule aur DRAP'), icon: '💊' },
          { value: 'general', label: t('Aam saman'), hint: t('Shampoo, diaper, biscuit — sirf naam aur rate'), icon: '🧴' },
        ]} />
      {!med && x.medicineId && (
        <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">
          {t('Save karne par is ki dawai wali details (formula, schedule, DRAP) hat jayengi. Stock aur bills wese hi rahenge.')}
        </p>
      )}
    </div>
  );
}

/* ── Medicine details: form, company, pack, DRAP number ── */
function MedicineDetails({ ctx }: { ctx: StepContext<PharmacyExtra> }) {
  const x = ctx.draft.extra;
  // A saved form outside the list (e.g. from an older import) stays selectable.
  const forms = x.dosageForm && !DOSAGE_FORMS.includes(x.dosageForm) ? [x.dosageForm, ...DOSAGE_FORMS] : DOSAGE_FORMS;
  return (
    <Section icon={Pill} title={t('Dawai ki details')} hint={t('Card, label aur substitute list par nazar aati hain — sab marzi hai')}>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">{t('Form')}</span>
          <select value={x.dosageForm} onChange={(e) => ctx.setExtra({ dosageForm: e.target.value })} className={inputClass}>
            <option value="">{t('Chunna nahi')}</option>
            {forms.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
          <span className="mt-1.5 block text-xs text-slate-500">{t('Category se khud bhar jati hai — "Tablets" chunein to Tablet')}</span>
        </label>
        <TextField label={t('Company')} value={x.manufacturer} onChange={(manufacturer) => ctx.setExtra({ manufacturer })} placeholder={t('GSK, Getz, Searle…')} />
        <TextField label={t('Pack')} value={x.packSize} onChange={(packSize) => ctx.setExtra({ packSize })} placeholder={t('10 x 10 tablets, 60 ml')} hint={t('Dabbe par likha pack')} />
        <TextField label={t('DRAP registration')} value={x.registrationNumber} onChange={(registrationNumber) => ctx.setExtra({ registrationNumber })} placeholder={t('Reg. No. 012345')} />
      </div>
      <div className="mt-3">
        <Toggle on={x.isGeneric} onChange={(isGeneric) => ctx.setExtra({ isGeneric })} title={t('Generic dawai')} hint={t('Brand ke bagair, sirf formula ke naam se bikti hai')} />
      </div>
    </Section>
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
      toast.success(t('Salt "{{name}}" ban gaya', { name: s.name }));
    } catch (e) {
      toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? t('Salt nahi bana'));
    } finally { setBusy(false); }
  };
  const update = (i: number, patch: Partial<SaltLine>) => ctx.setExtra({ salts: x.salts.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
  const generic = x.salts.map((s) => [s.name, s.strength].filter(Boolean).join(' ')).join(' + ');

  return (
    <div className="space-y-4">
      <MedicineDetails ctx={ctx} />
      <Section icon={Beaker} title={t('Formula (salt)')} hint={t('Dawai me kya hai aur kitna — isi se generic naam banta hai aur stock khatam ho to substitute milta hai')}>
        <div className="relative">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('Salt likhein: Paracetamol, Amoxicillin…')} className={inputClass}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (matches[0]) add(matches[0]); else if (!exact) void create(); } }} />
          {q && (
            <div className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-slate-200">
              {matches.map((s) => (
                <button key={s.id} type="button" onClick={() => add(s)} className="flex w-full items-center justify-between gap-2 px-3 py-2 text-start text-[0.875rem] hover:bg-brand-50">
                  <span className="font-medium text-slate-900">{s.name}{s.genericName && <span className="ms-1.5 text-slate-500">({s.genericName})</span>}</span>
                  {s.isNarcotic && <span className="rounded bg-rose-100 px-1.5 text-[0.6875rem] font-semibold text-rose-700">{t('Narcotic')}</span>}
                </button>
              ))}
              {!exact && (
                <button type="button" onClick={() => void create()} disabled={busy} className="flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2 text-start text-[0.875rem] font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-60">
                  <Plus className="h-4 w-4" />{t('"{{value}}" naya salt banayein', { value: query.trim() })}
                </button>
              )}
            </div>
          )}
        </div>
        {x.salts.length === 0 ? (
          <p className="mt-3 rounded-xl bg-slate-50 px-3 py-4 text-center text-[0.8125rem] text-slate-500">{t('Abhi koi salt nahi — upar likh kar jorein. Bagair salt ke bhi save ho jata hai.')}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {x.salts.map((s, i) => (
              <li key={s.saltId} className="rounded-xl p-3 ring-1 ring-slate-200">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="min-w-0 flex-1 text-[0.9375rem] font-semibold text-slate-900">{s.name}</span>
                  <button type="button" title={t('Asal salt')} onClick={() => ctx.setExtra({ salts: x.salts.map((y, j) => ({ ...y, isMainSalt: j === i })) })}
                    className={cn('inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[0.75rem] font-semibold', s.isMainSalt ? 'bg-amber-100 text-amber-800' : 'text-slate-500 hover:bg-slate-100')}>
                    <Star className="h-3.5 w-3.5" />{s.isMainSalt ? t('Asal') : t('Asal banayein')}
                  </button>
                  <button type="button" aria-label={t('Hatayein')} onClick={() => ctx.setExtra({ salts: x.salts.filter((_, j) => j !== i).map((y, j, arr) => ({ ...y, isMainSalt: arr.some((z) => z.isMainSalt) ? y.isMainSalt : j === 0 })) })}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <input value={s.strength} onChange={(e) => update(i, { strength: e.target.value })} placeholder={t('Strength: 500mg')} className={cn(inputClass, 'h-9 w-36 text-[0.875rem]')} />
                  {STRENGTHS.map((v) => <Chip key={v} on={s.strength === v} onClick={() => update(i, { strength: v })}>{v}</Chip>)}
                </div>
              </li>
            ))}
          </ul>
        )}
        {ctx.errors.salts && <p className="mt-2 text-[0.8125rem] font-medium text-rose-600">{ctx.errors.salts}</p>}
        {generic && <p className="mt-3 text-[0.8125rem] text-slate-600">{t('Generic naam:')}{' '} <strong className="text-slate-900">{generic}</strong></p>}
      </Section>
      <Section title={t('Kis bimari me')} hint={t('Marzi hai — counter par poochne walon ke kaam aata hai')}>
        <textarea value={x.indication} onChange={(e) => ctx.setExtra({ indication: e.target.value })} rows={2} placeholder={t('Bukhar, dard…')} className={cn(inputClass, 'h-auto py-2.5')} />
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
      <Section icon={ShieldAlert} title={t('Schedule')} hint={t('Bagair nuskhe ke bik sakti hai ya nahi — POS par isi hisaab se poocha jata hai')}>
        <Tiles value={x.scheduleClass} onChange={(scheduleClass) => set({ scheduleClass, ...(REGISTER_CLASSES.includes(scheduleClass) && { requiresPrescription: true }) })}
          columns="grid-cols-2 sm:grid-cols-4" options={SCHEDULES.map((k) => ({ value: k, label: SCHEDULE_META[k].label, hint: SCHEDULE_META[k].hint }))} />
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Toggle on={x.requiresPrescription || isRegister(x)} onChange={(requiresPrescription) => set({ requiresPrescription })} icon={FileText}
            title={t('Nuskhe par bikti hai (Rx)')} hint={isRegister(x) ? t('Register wali dawai hamesha nuskhe par') : t('POS par yaad dihani aati hai')} />
          <Toggle on={x.isNarcotic} onChange={(isNarcotic) => set({ isNarcotic, ...(isNarcotic && { requiresPrescription: true }) })} icon={ShieldAlert}
            title={t('Narcotic register me likhein')} hint={t('Har sale par doctor aur mareez ka naam poocha jayega')} />
        </div>
      </Section>
      <Section icon={Thermometer} title={t('Kahan rakhein')} hint={t('Fridge wali dawai ka temperature Cold Chain log me roz likhein')}>
        <Tiles value={x.storageCondition} onChange={(storageCondition) => set({ storageCondition, ...((storageCondition === 'REFRIGERATED' || storageCondition === 'FROZEN') && { requiresColdChain: true }) })}
          columns="grid-cols-2 sm:grid-cols-4" options={Object.entries(STORAGE_META).map(([value, label]) => ({ value: value as StorageCondition, label }))} />
        <div className="mt-3">
          <Toggle on={x.requiresColdChain} onChange={(requiresColdChain) => set({ requiresColdChain })} icon={Snowflake} title={t('Thandi rakhni hai (cold chain)')} hint={t('Card par Fridge ka nishan lagta hai')} />
        </div>
        {cold && (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <NumberField label={t('Kam se kam °C')} allowEmpty value={x.minTemperature} onChange={(minTemperature) => set({ minTemperature })} suffix="°C" error={ctx.errors.temperature} />
            <NumberField label={t('Zyada se zyada °C')} allowEmpty value={x.maxTemperature} onChange={(maxTemperature) => set({ maxTemperature })} suffix="°C" />
          </div>
        )}
        <label className="mt-3 block">
          <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">{t('Rakhne ki hidayat')}</span>
          <input value={x.storageInstructions} onChange={(e) => set({ storageInstructions: e.target.value })} placeholder={t('Dhoop se door, bachon ki pohanch se door')} className={inputClass} />
        </label>
      </Section>
    </div>
  );
}

const core: CoreOptions = {
  units: [
    { value: 'tablet', label: t('Tablet') }, { value: 'capsule', label: t('Capsule') }, { value: 'strip', label: t('Strip') },
    { value: 'bottle', label: t('Bottle') }, { value: 'tube', label: t('Tube') }, { value: 'vial', label: t('Vial') },
    { value: 'ampoule', label: t('Ampoule') }, { value: 'sachet', label: t('Sachet') }, { value: 'box', label: t('Box') },
    { value: 'pcs', label: t('Adad (pcs)') }, { value: 'ml', label: 'ml' }, { value: 'gram', label: t('Gram') },
  ],
  skuPrefix: 'MED',
  packs: true,
  variants: false,
  batches: true,
  markups: [10, 15, 17, 20, 25],
};

const formulaStep: StepDef<PharmacyExtra> = {
  id: 'formula', title: t('Dawai details'), hint: t('Form, company, salt'), icon: Beaker, render: (ctx) => <Formula ctx={ctx} />,
  when: (d) => isMed(d.extra),
  validate: (d): Errors => (d.extra.salts.some((s) => !s.strength.trim()) ? { salts: t('Har salt ki strength likhein (jaise 500mg)') } : {}),
};
const rulesStep: StepDef<PharmacyExtra> = {
  id: 'rules', title: t('Schedule'), hint: t('Rx, narcotic, fridge'), icon: ShieldAlert, render: (ctx) => <Rules ctx={ctx} />,
  when: (d) => isMed(d.extra),
  validate: (d): Errors => (d.extra.minTemperature != null && d.extra.maxTemperature != null && d.extra.minTemperature > d.extra.maxTemperature
    ? { temperature: t('Kam se kam wala zyada wale se bara hai') } : {}),
};

const config: EditorConfig<PharmacyExtra> = {
  label: t('Pharmacy'),
  draftKey: 'nafaa.product-editor.pharmacy',
  paths: { list: '/pharmacy/medicines', detail: (id) => `/pharmacy-medicines/${id}`, create: '/pharmacy-medicines/new' },
  core,
  extra: {
    initial,
    load: async (productId) => {
      // A failed request keeps the defaults (medicine) so nothing is removed on save.
      const m = await medicinesApi.byProduct(productId).catch(() => undefined);
      if (m === undefined) return {};
      // No medicine details saved: a general item (e.g. added from the POS or a grocery import).
      // An empty answer can arrive as the bare response envelope, so the id decides.
      if (!m?.id) return { isMedicine: false };
      const ps = ((m.product?.productSalts ?? []) as Array<{ saltId: string; strength: string | null; isMainSalt: boolean; salt?: { name: string } }>);
      return {
        isMedicine: true, medicineId: m.id,
        dosageForm: m.dosageForm ?? '', packSize: m.packSize ?? '', manufacturer: m.manufacturer ?? '', registrationNumber: m.registrationNumber ?? '',
        isGeneric: m.isGeneric, scheduleClass: m.scheduleClass, requiresPrescription: m.requiresPrescription, isNarcotic: m.isNarcotic,
        storageCondition: m.storageCondition, requiresColdChain: m.requiresColdChain, minTemperature: m.minTemperature ?? null, maxTemperature: m.maxTemperature ?? null,
        indication: m.indication ?? '', storageInstructions: m.storageInstructions ?? '',
        salts: ps.map((s) => ({ saltId: s.saltId, name: s.salt?.name ?? '', strength: s.strength ?? '', isMainSalt: s.isMainSalt })),
      };
    },
    save: async (productId, d) => {
      const x = d.extra;
      if (!isMed(x)) {
        // Turned into a general item: drop its salts and medicine details; stock and bills stay.
        if (x.medicineId) {
          await saltsApi.assign(productId, []);
          await medicinesApi.remove(x.medicineId);
        }
        return;
      }
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
    basicStep<PharmacyExtra>(core, {
      extra: (ctx) => <ItemType ctx={ctx} />,
      namePlaceholder: t('Jaise: Panadol 500mg Tablet, Johnson baby shampoo'),
      categorySuggestions: (d: EditorDraft<PharmacyExtra>) => (isMed(d.extra) ? [...MEDICINE_CATEGORY_SUGGESTIONS, ...THERAPY_SUGGESTIONS] : PHARMACY_GENERAL_CATEGORY_SUGGESTIONS),
    }),
    formulaStep,
    priceStep<PharmacyExtra>(core),
    rulesStep,
    stockStep<PharmacyExtra>(core, { quick: [10, 30, 100, 300, 1000] }),
  ],
  summary: (d) => {
    const x = d.extra;
    if (!isMed(x)) return <p className="mt-3 border-t border-slate-100 pt-3 text-[0.8125rem] text-slate-600">{t('Aam saman (dawai nahi)')}</p>;
    const generic = x.salts.map((s) => [s.name, s.strength].filter(Boolean).join(' ')).join(' + ');
    return (
      <div className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-[0.8125rem]">
        {generic && <p className="text-slate-700">{generic}</p>}
        <p className="text-slate-600">{[x.dosageForm, x.manufacturer, SCHEDULE_META[x.scheduleClass]?.label].filter(Boolean).join(' · ')}</p>
        {isRegister(x) && <p className="font-medium text-rose-700">{t('Register wali dawai')}</p>}
        {x.requiresColdChain && <p className="text-sky-700">{t('Fridge me rakhein')}</p>}
      </div>
    );
  },
  refresh: [MEDICINE_FACTS_KEY, 'pharmacy-medicines', 'pharmacy-product-detail', 'pharmacy-salts'],
  guide: [
    { icon: Pill, color: '#0d9488', title: t('Dawai ya aam saman'), text: t('Shampoo, diaper ya biscuit ke liye "Aam saman" chunein — formula aur schedule ke steps nahi aate. Dawai ki form category se khud lagti hai.') },
    { icon: Beaker, color: '#0891b2', title: t('Formula'), text: t('Salt aur strength likhein — POS par salt se dhoondna aur stock khatam hone par substitute isi se milta hai.') },
    { icon: ShieldAlert, color: '#e11d48', title: t('Schedule'), text: t('Narcotic / controlled dawai ki har sale register me jati hai; POS par doctor aur mareez ka naam poocha jata hai.') },
    { icon: FileText, color: '#d97706', title: t('Strip aur box'), text: t('Base unit tablet rakhein aur Price step me "Strip = 10" aur "Box = 100" packing jorein — khuli goli aur poora patta dono bikte hain.') },
  ],
};

export default function PharmacyProductEditor() {
  return <ProductEditorPage config={config} />;
}
