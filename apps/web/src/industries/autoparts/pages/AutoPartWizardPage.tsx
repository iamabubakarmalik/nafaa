/**
 * Auto part editor on the shared product editor: name and part number (the
 * part number is the SKU unless one is typed), OEM and other numbers, the
 * part's group, genuine/local/used, brand, warranty, the vehicles it fits,
 * and opening stock.
 */

import { useState } from 'react';
import { BadgeCheck, Car, Hash, ShieldCheck, Star, X, Zap } from 'lucide-react';
import { ProductEditorPage } from '@modules/inventory/products/editor/ProductEditorPage';
import { basicStep, priceStep, stockStep } from '@modules/inventory/products/editor/coreSteps';
import { Chip, NumberField, Section, TextField, Tiles, Toggle, inputClass } from '@modules/inventory/products/editor/fields';
import type { CoreOptions, EditorConfig, Errors, StepContext, StepDef } from '@modules/inventory/products/editor/types';
import { partProfilesApi, type PartCategory, type PartCondition, type PartFitment } from '../api/part-profiles.api';
import { FitmentEditor } from '../components/FitmentEditor';
import { CATEGORIES, CONDITIONS, categoryOf, conditionOf } from '../components/meta';
import { PART_FACTS_KEY } from '../hooks/usePartFacts';

export interface PartExtra {
  partNumber: string; oemNumber: string; alternateNumbers: string[]; category: PartCategory; condition: PartCondition;
  brand: string; countryOfOrigin: string; warrantyMonths: number; warrantyKm: number | null;
  isFastMoving: boolean; isCritical: boolean; universal: boolean; fitments: PartFitment[];
}

const initial: PartExtra = {
  partNumber: '', oemNumber: '', alternateNumbers: [], category: 'OTHER', condition: 'NEW', brand: '', countryOfOrigin: '',
  warrantyMonths: 0, warrantyKm: null, isFastMoving: false, isCritical: false, universal: false, fitments: [],
};

const opt = (v: string) => v.trim() || undefined;
const POPULAR: PartCategory[] = ['ENGINE', 'BRAKES', 'FILTERS', 'OILS_FLUIDS', 'SUSPENSION', 'ELECTRICAL', 'LIGHTING', 'BATTERY', 'TIRES_WHEELS', 'BODY', 'IGNITION', 'BELTS_HOSES'];
const BRANDS = ['Toyota Genuine', 'Honda Genuine', 'Suzuki Genuine', 'Denso', 'Bosch', 'NGK', 'Shell', 'Total', 'Zic', 'Exide', 'AGS', 'Osaka'];
const ORIGINS = ['Japan', 'China', 'Taiwan', 'Thailand', 'Pakistan', 'Korea'];

/* ── Basic step addition: numbers and group ── */
function Numbers({ ctx }: { ctx: StepContext<PartExtra> }) {
  const x = ctx.draft.extra;
  const [alt, setAlt] = useState('');
  const [more, setMore] = useState(POPULAR.includes(x.category) ? false : x.category !== 'OTHER');
  const addAlt = () => {
    const v = alt.trim();
    if (!v || x.alternateNumbers.includes(v)) { setAlt(''); return; }
    ctx.setExtra({ alternateNumbers: [...x.alternateNumbers, v] });
    setAlt('');
  };
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label="Part number" value={x.partNumber} onChange={(partNumber) => ctx.setExtra({ partNumber })} placeholder="04465-02220"
          hint="Dabbe ya part par likha number — SKU khali ho to yahi SKU banta hai" />
        <TextField label="OEM number" value={x.oemNumber} onChange={(oemNumber) => ctx.setExtra({ oemNumber })} placeholder="Company ka asal number" hint="Marzi hai" />
      </div>
      <div>
        <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Doosre number (cross reference)</span>
        <div className="flex gap-2">
          <input value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="Doosri company ka number likh kar Enter" className={inputClass}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addAlt(); } }} />
          <button type="button" onClick={addAlt} className="h-11 shrink-0 rounded-xl bg-slate-100 px-4 text-[0.875rem] font-semibold text-slate-700 hover:bg-slate-200">Jorein</button>
        </div>
        {x.alternateNumbers.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {x.alternateNumbers.map((a) => (
              <span key={a} className="inline-flex items-center gap-1 rounded-full bg-slate-100 py-1 pl-3 pr-1 font-mono text-[0.75rem] text-slate-700">
                {a}
                <button type="button" aria-label="Hatayein" onClick={() => ctx.setExtra({ alternateNumbers: x.alternateNumbers.filter((y) => y !== a) })}
                  className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-slate-200"><X className="h-3 w-3" /></button>
              </span>
            ))}
          </div>
        )}
      </div>
      <div>
        <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Part ka group</span>
        <div className="flex flex-wrap gap-1.5">
          {(more ? CATEGORIES : POPULAR).map((c) => <Chip key={c} on={x.category === c} onClick={() => ctx.setExtra({ category: x.category === c ? 'OTHER' : c })}>{categoryOf(c)}</Chip>)}
          {!more && <Chip on={false} onClick={() => setMore(true)}>Aur…</Chip>}
        </div>
      </div>
    </div>
  );
}

/* ── Details step: quality, brand, warranty ── */
function Quality({ ctx }: { ctx: StepContext<PartExtra> }) {
  const x = ctx.draft.extra;
  const set = ctx.setExtra;
  return (
    <div className="space-y-4">
      <Section icon={BadgeCheck} title="Part kaisa hai" hint="Card aur bill par likha aata hai — customer ko pata ho ke genuine hai ya local">
        <Tiles value={x.condition} onChange={(condition) => set({ condition })} columns="grid-cols-2 sm:grid-cols-4"
          options={CONDITIONS.map((c) => ({ value: c, label: conditionOf(c).label, hint: conditionOf(c).hint }))} />
      </Section>
      <Section icon={Star} title="Brand aur kahan ka bana">
        <TextField label="Brand" value={x.brand} onChange={(brand) => set({ brand })} placeholder="Denso, Bosch, Toyota Genuine…" />
        <div className="mt-2 flex flex-wrap gap-1.5">{BRANDS.map((b) => <Chip key={b} on={x.brand === b} onClick={() => set({ brand: x.brand === b ? '' : b })}>{b}</Chip>)}</div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="mr-1 self-center text-[0.8125rem] text-slate-600">Bana:</span>
          {ORIGINS.map((o) => <Chip key={o} on={x.countryOfOrigin === o} onClick={() => set({ countryOfOrigin: x.countryOfOrigin === o ? '' : o })}>{o}</Chip>)}
        </div>
      </Section>
      <Section icon={ShieldCheck} title="Warranty" hint="Counter par bechte waqt bill me khud lag jati hai">
        <div className="grid gap-3 sm:grid-cols-2">
          <NumberField label="Kitne mahine" value={x.warrantyMonths} onChange={(v) => set({ warrantyMonths: Math.max(0, Math.round(v ?? 0)) })} suffix="mahine" error={ctx.errors.warranty} />
          <NumberField label="Ya kitne km" allowEmpty value={x.warrantyKm} onChange={(warrantyKm) => set({ warrantyKm })} suffix="km" hint="Marzi hai" />
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">{[0, 1, 3, 6, 12].map((m) => <Chip key={m} on={x.warrantyMonths === m} onClick={() => set({ warrantyMonths: m })}>{m ? `${m} mahine` : 'Koi nahi'}</Chip>)}</div>
      </Section>
      <div className="grid gap-2 sm:grid-cols-2">
        <Toggle on={x.isFastMoving} onChange={(isFastMoving) => set({ isFastMoving })} icon={Zap} title="Zyada bikne wala" hint="Counter par aage aur “Zyada bikta” ka nishan" />
        <Toggle on={x.isCritical} onChange={(isCritical) => set({ isCritical })} icon={Hash} title="Hamesha stock me rakhna hai" hint="Khatam hone se pehle mangwayein" />
      </div>
    </div>
  );
}

const core: CoreOptions = {
  units: [
    { value: 'pcs', label: 'Adad (pcs)' }, { value: 'set', label: 'Set' }, { value: 'pair', label: 'Joda' }, { value: 'liter', label: 'Liter' },
    { value: 'ml', label: 'ml' }, { value: 'meter', label: 'Meter' }, { value: 'feet', label: 'Feet' }, { value: 'kg', label: 'Kg' },
  ],
  skuPrefix: 'AP',
  packs: true,
  variants: false,
  batches: false,
  markups: [10, 15, 20, 25, 30],
};

const fitStep: StepDef<PartExtra> = {
  id: 'fitment', title: 'Gaari', hint: 'Kis gaari ka part', icon: Car,
  render: (ctx) => <FitmentEditor universal={ctx.draft.extra.universal} fitments={ctx.draft.extra.fitments} onChange={(v) => ctx.setExtra(v)} />,
};
const qualityStep: StepDef<PartExtra> = {
  id: 'quality', title: 'Quality', hint: 'Genuine, brand, warranty', icon: BadgeCheck, render: (ctx) => <Quality ctx={ctx} />,
  validate: (d): Errors => (d.extra.warrantyMonths > 120 ? { warranty: '120 mahine se zyada nahi' } : {}),
};

const config: EditorConfig<PartExtra> = {
  label: 'Auto Parts',
  draftKey: 'nafaa.product-editor.autoparts',
  paths: { list: '/autoparts/parts', detail: (id) => `/autoparts-parts/${id}`, create: '/autoparts-parts/new' },
  core,
  extra: {
    initial,
    load: async (productId) => {
      const p = await partProfilesApi.byProduct(productId).catch(() => null);
      if (!p) return {};
      const c = p.compatibility;
      return {
        partNumber: p.partNumber ?? '', oemNumber: p.oemNumber ?? '', alternateNumbers: p.alternateNumbers ?? [], category: p.category, condition: p.condition,
        brand: p.brand ?? '', countryOfOrigin: p.countryOfOrigin ?? '', warrantyMonths: p.warrantyMonths ?? 0, warrantyKm: p.warrantyKm ?? null,
        isFastMoving: p.isFastMoving, isCritical: p.isCritical, universal: !!c?.isUniversal, fitments: Array.isArray(c?.fitments) ? c!.fitments! : [],
      };
    },
    save: async (productId, d) => {
      const x = d.extra;
      await partProfilesApi.upsert({
        productId, partNumber: opt(x.partNumber), oemNumber: opt(x.oemNumber), alternateNumbers: x.alternateNumbers, category: x.category,
        condition: x.condition, brand: opt(x.brand), countryOfOrigin: opt(x.countryOfOrigin), warrantyMonths: x.warrantyMonths,
        warrantyKm: x.warrantyKm ?? undefined, isFastMoving: x.isFastMoving, isCritical: x.isCritical,
        compatibility: { isUniversal: x.universal, fitments: x.universal ? [] : x.fitments },
      });
    },
    // The part number is the SKU unless the owner typed one.
    product: (d, payload) => (!String(payload.sku ?? '').trim() && d.extra.partNumber.trim() ? { ...payload, sku: d.extra.partNumber.trim() } : payload),
  },
  steps: [
    basicStep<PartExtra>(core, {
      extra: (ctx) => <Numbers ctx={ctx} />, namePlaceholder: 'Jaise: Brake pad Corolla 2015 (front)',
      categorySuggestions: ['Engine parts', 'Brake', 'Filter', 'Oil aur lubricants', 'Suspension', 'Bijli ka saman', 'Lights', 'Battery', 'Tyre aur tube', 'Body parts', 'Bike parts'],
    }),
    priceStep<PartExtra>(core),
    fitStep,
    qualityStep,
    stockStep<PartExtra>(core, { quick: [1, 2, 5, 10, 20, 50] }),
  ],
  summary: (d) => {
    const x = d.extra;
    const fits = x.universal ? 'Har gaari' : x.fitments.map((f) => [f.makeName, f.modelName].filter(Boolean).join(' ')).join(', ');
    return (
      <div className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-[0.8125rem]">
        {x.partNumber && <p className="font-mono text-slate-700">{x.partNumber}{x.oemNumber ? ` · OEM ${x.oemNumber}` : ''}</p>}
        <p className="text-slate-600">{[categoryOf(x.category), conditionOf(x.condition).label, x.brand].filter(Boolean).join(' · ')}</p>
        {fits && <p className="text-slate-600">{fits}</p>}
        {x.warrantyMonths > 0 && <p className="text-emerald-700">{x.warrantyMonths} mahine warranty</p>}
      </div>
    );
  },
  refresh: [PART_FACTS_KEY, 'autoparts-part-detail'],
  guide: [
    { icon: Hash, color: '#2563eb', title: 'Part number', text: 'Dabbe par likha number likhein. Counter par is number se, OEM se ya doosre number se part mil jata hai.' },
    { icon: Car, color: '#0891b2', title: 'Kis gaari ka', text: 'Company, model aur saal jorein — counter par “corolla brake” likhne se yahi part aata hai.' },
    { icon: BadgeCheck, color: '#16a34a', title: 'Genuine ya local', text: 'Quality step me batayein — card aur bill par likha aata hai, customer ko dhoka nahi hota.' },
  ],
};

export default function AutoPartWizardPage() {
  return <ProductEditorPage config={config} />;
}
