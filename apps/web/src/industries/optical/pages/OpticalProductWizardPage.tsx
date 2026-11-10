/**
 * Optical product editor on the shared product editor: what it is (frame,
 * sunglasses, stock lens, contact lens, solution), brand, model and colour,
 * frame size and shape, lens type and coating, contact lens fit, which
 * powers a lens can be made in, and warranty. Colours can be variants;
 * contact lenses and solutions keep batches with expiry.
 */

import { Glasses, Ruler, ShieldCheck, Sparkles, Eye } from 'lucide-react';
import { ProductEditorPage } from '@modules/inventory/products/editor/ProductEditorPage';
import { basicStep, priceStep, stockStep } from '@modules/inventory/products/editor/coreSteps';
import { Chip, NumberField, Section, TextField, Toggle } from '@modules/inventory/products/editor/fields';
import type { CoreOptions, EditorConfig, Errors, StepContext, StepDef } from '@modules/inventory/products/editor/types';
import { opticalProductsApi, type OpticalCategoryType, type OpticalFrameMaterial, type OpticalFrameShape, type OpticalGender } from '../api/products.api';
import { FACTS_KEY, KINDS, kindOf, typeLabel, type OpticalKind } from '../hooks/useOpticalFacts';
import { COATINGS, LENS_INDEX, LENS_MATERIAL } from '../lib/meta';
import { t as tr } from '@core/i18n';
import { useCategoryKindSync } from '@modules/inventory/categories/lib/kinds';

export interface OpticalExtra {
  categoryType: OpticalCategoryType | '';
  brand: string; modelNumber: string; collectionName: string; colorName: string; colorHex: string;
  frameShape: OpticalFrameShape | ''; frameMaterial: OpticalFrameMaterial | ''; gender: OpticalGender | '';
  frameSizeMm: number | null; bridgeSizeMm: number | null; templeLengthMm: number | null;
  lensType: string; lensIndex: string; lensMaterial: string; lensCoatings: string[];
  hasBlueCut: boolean; isPhotochromic: boolean; isPolarized: boolean; hasUvProtection: boolean;
  clDuration: string; clBaseCurve: string; clDiameter: string; clWaterContent: string; clForAstigmatism: boolean;
  supportsMinSph: number | null; supportsMaxSph: number | null; supportsMaxCyl: number | null; supportsProgressive: boolean;
  warrantyMonths: number | null;
}

const initial: OpticalExtra = {
  categoryType: '', brand: '', modelNumber: '', collectionName: '', colorName: '', colorHex: '',
  frameShape: '', frameMaterial: '', gender: '', frameSizeMm: null, bridgeSizeMm: null, templeLengthMm: null,
  lensType: '', lensIndex: '', lensMaterial: '', lensCoatings: [], hasBlueCut: false, isPhotochromic: false, isPolarized: false, hasUvProtection: false,
  clDuration: '', clBaseCurve: '', clDiameter: '', clWaterContent: '', clForAstigmatism: false,
  supportsMinSph: null, supportsMaxSph: null, supportsMaxCyl: null, supportsProgressive: false, warrantyMonths: 6,
};

const SHAPES: Array<[OpticalFrameShape, string]> = [['ROUND', 'Gol'], ['SQUARE', 'Square'], ['RECTANGLE', 'Lamba'], ['OVAL', 'Oval'], ['CAT_EYE', 'Cat eye'], ['AVIATOR', 'Aviator'], ['WAYFARER', 'Wayfarer'], ['BROWLINE', 'Browline'], ['GEOMETRIC', 'Geometric']];
const MATERIALS: Array<[OpticalFrameMaterial, string]> = [['ACETATE', 'Acetate'], ['METAL', 'Metal'], ['TITANIUM', 'Titanium'], ['STAINLESS_STEEL', 'Steel'], ['PLASTIC', 'Plastic'], ['TR90', 'TR90'], ['MIXED', 'Mix']];
const GENDERS: Array<[OpticalGender, string]> = [['MENS', 'Mard'], ['WOMENS', 'Aurat'], ['UNISEX', 'Dono'], ['KIDS', 'Bachay']];
const BRANDS = ['Ray-Ban', 'Oakley', 'Vogue', 'Police', 'Carrera', 'Titan', 'Essilor', 'Hoya', 'Zeiss', 'Acuvue', 'Bausch + Lomb', 'FreshLook'];
const CL_DURATION = ['Daily', 'Monthly', 'Quarterly', 'Yearly'];
const COLOURS = ['Black', 'Brown', 'Gold', 'Silver', 'Gunmetal', 'Tortoise', 'Blue', 'Transparent'];

const opt = (v: string) => v.trim() || undefined;
const num = (v: number | null) => (v != null && Number.isFinite(v) ? v : undefined);

function Kind({ ctx }: { ctx: StepContext<OpticalExtra> }) {
  // The item type comes from the shop category's kind (nearest parent); the editor shows no separate picker.
  useCategoryKindSync(ctx.draft.core.categoryId, ctx.draft.extra.categoryType, (kind) => ctx.setExtra({ categoryType: kind as OpticalCategoryType }));
  return null;
}

function Specs({ ctx }: { ctx: StepContext<OpticalExtra> }) {
  const x = ctx.draft.extra;
  const set = ctx.setExtra;
  const kind: OpticalKind | null = kindOf(x.categoryType || null);
  const frame = kind === 'frame' || kind === 'sun';
  const lens = kind === 'lens' || kind === 'sun';
  const contact = kind === 'contact';
  return (
    <div className="space-y-4">
      <Section icon={Sparkles} title={tr('Brand aur model')} hint={tr('Counter aur bill par naam ke neeche dikhta hai')}>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label={tr('Brand')} value={x.brand} onChange={(brand) => set({ brand })} placeholder={tr('Ray-Ban, Titan, Acuvue')} />
          <TextField label={tr('Model number')} value={x.modelNumber} onChange={(modelNumber) => set({ modelNumber })} placeholder={tr('RB2140')} />
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">{BRANDS.map((b) => <Chip key={b} on={x.brand === b} onClick={() => set({ brand: x.brand === b ? '' : b })}>{b}</Chip>)}</div>
        {frame && (
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_8rem]">
            <TextField label={tr('Rang')} value={x.colorName} onChange={(colorName) => set({ colorName })} placeholder={tr('Black, Gold')} hint={tr('Har rang ka stock alag ho to Stock step me rang ko variant banayein')} />
            <label className="block"><span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">{tr('Rang (nishan)')}</span>
              <input type="color" value={x.colorHex || '#000000'} onChange={(e) => set({ colorHex: e.target.value })} className="h-11 w-full rounded-xl border border-slate-300 bg-white p-1" /></label>
          </div>
        )}
      </Section>

      {frame && (
        <Section icon={Ruler} title={tr('Frame')} hint={tr('Size frame ki dandi par likha hota hai: 52□18-145')}>
          <div className="grid gap-3 sm:grid-cols-3">
            <NumberField label={tr('Lens width')} allowEmpty value={x.frameSizeMm} onChange={(v) => set({ frameSizeMm: v == null ? null : Math.round(v) })} suffix="mm" placeholder="52" />
            <NumberField label={tr('Bridge')} allowEmpty value={x.bridgeSizeMm} onChange={(v) => set({ bridgeSizeMm: v == null ? null : Math.round(v) })} suffix="mm" placeholder="18" />
            <NumberField label={tr('Dandi (temple)')} allowEmpty value={x.templeLengthMm} onChange={(v) => set({ templeLengthMm: v == null ? null : Math.round(v) })} suffix="mm" placeholder="145" />
          </div>
          {ctx.errors.size && <p className="mt-1 text-[0.8125rem] font-medium text-rose-600">{ctx.errors.size}</p>}
          <span className="mb-1.5 mt-3 block text-[0.8125rem] font-medium text-slate-700">{tr('Shape')}</span>
          <div className="flex flex-wrap gap-1.5">{SHAPES.map(([v, l]) => <Chip key={v} on={x.frameShape === v} onClick={() => set({ frameShape: x.frameShape === v ? '' : v })}>{l}</Chip>)}</div>
          <span className="mb-1.5 mt-3 block text-[0.8125rem] font-medium text-slate-700">{tr('Material')}</span>
          <div className="flex flex-wrap gap-1.5">{MATERIALS.map(([v, l]) => <Chip key={v} on={x.frameMaterial === v} onClick={() => set({ frameMaterial: x.frameMaterial === v ? '' : v })}>{l}</Chip>)}</div>
          <span className="mb-1.5 mt-3 block text-[0.8125rem] font-medium text-slate-700">{tr('Kis ke liye')}</span>
          <div className="flex flex-wrap gap-1.5">{GENDERS.map(([v, l]) => <Chip key={v} on={x.gender === v} onClick={() => set({ gender: x.gender === v ? '' : v })}>{l}</Chip>)}</div>
        </Section>
      )}

      {lens && (
        <Section icon={Glasses} title={tr('Lens')} hint={tr('Index jitna zyada, lens utna patla')}>
          <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">{tr('Index')}</span>
          <div className="flex flex-wrap gap-1.5">{LENS_INDEX.map((v) => <Chip key={v} on={x.lensIndex === v} onClick={() => set({ lensIndex: x.lensIndex === v ? '' : v })}>{v}</Chip>)}</div>
          <span className="mb-1.5 mt-3 block text-[0.8125rem] font-medium text-slate-700">{tr('Material')}</span>
          <div className="flex flex-wrap gap-1.5">{LENS_MATERIAL.map((v) => <Chip key={v} on={x.lensMaterial === v} onClick={() => set({ lensMaterial: x.lensMaterial === v ? '' : v })}>{v}</Chip>)}</div>
          <span className="mb-1.5 mt-3 block text-[0.8125rem] font-medium text-slate-700">{tr('Coating')}</span>
          <div className="flex flex-wrap gap-1.5">{COATINGS.map((v) => <Chip key={v} on={x.lensCoatings.includes(v)} onClick={() => set({ lensCoatings: x.lensCoatings.includes(v) ? x.lensCoatings.filter((c) => c !== v) : [...x.lensCoatings, v] })}>{v}</Chip>)}</div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Toggle on={x.hasBlueCut} onChange={(hasBlueCut) => set({ hasBlueCut })} title={tr('Blue cut')} hint={tr('Computer / mobile ke liye')} />
            <Toggle on={x.isPhotochromic} onChange={(isPhotochromic) => set({ isPhotochromic })} title={tr('Photochromic')} hint={tr('Dhoop me kala')} />
            <Toggle on={x.isPolarized} onChange={(isPolarized) => set({ isPolarized })} title={tr('Polarized')} hint={tr('Chamak kam')} />
            <Toggle on={x.hasUvProtection} onChange={(hasUvProtection) => set({ hasUvProtection })} title={tr('UV 400')} />
          </div>
          {kind === 'lens' && (
            <>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <NumberField label={tr('Kam se kam SPH')} allowEmpty value={x.supportsMinSph} onChange={(supportsMinSph) => set({ supportsMinSph })} placeholder="-6.00" />
                <NumberField label={tr('Zyada se zyada SPH')} allowEmpty value={x.supportsMaxSph} onChange={(supportsMaxSph) => set({ supportsMaxSph })} placeholder="+4.00" />
                <NumberField label={tr('Zyada se zyada CYL')} allowEmpty value={x.supportsMaxCyl} onChange={(supportsMaxCyl) => set({ supportsMaxCyl })} placeholder="-2.00" />
              </div>
              {ctx.errors.range && <p className="mt-1 text-[0.8125rem] font-medium text-rose-600">{ctx.errors.range}</p>}
              <div className="mt-2"><Toggle on={x.supportsProgressive} onChange={(supportsProgressive) => set({ supportsProgressive })} title={tr('Progressive ban sakta hai')} /></div>
            </>
          )}
        </Section>
      )}

      {contact && (
        <Section icon={Eye} title={tr('Contact lens')} hint={tr('Dabbe par likha fit — customer ke nuskhe se milayein')}>
          <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">{tr('Kitne din chalta hai')}</span>
          <div className="flex flex-wrap gap-1.5">{CL_DURATION.map((v) => <Chip key={v} on={x.clDuration === v} onClick={() => set({ clDuration: x.clDuration === v ? '' : v })}>{v}</Chip>)}</div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <TextField label={tr('Base curve (BC)')} value={x.clBaseCurve} onChange={(clBaseCurve) => set({ clBaseCurve })} placeholder="8.6" />
            <TextField label={tr('Diameter (DIA)')} value={x.clDiameter} onChange={(clDiameter) => set({ clDiameter })} placeholder="14.2" />
            <TextField label={tr('Pani (water %)')} value={x.clWaterContent} onChange={(clWaterContent) => set({ clWaterContent })} placeholder="38%" />
          </div>
          <div className="mt-3"><Toggle on={x.clForAstigmatism} onChange={(clForAstigmatism) => set({ clForAstigmatism })} title={tr('Toric (cylinder wale ke liye)')} /></div>
          <p className="mt-2 text-[0.75rem] text-slate-500">{tr('Expiry ke liye Stock step me batch aur expiry date likhein — counter pehle purani expiry wala bechta hai.')}</p>
        </Section>
      )}

      <Section icon={ShieldCheck} title={tr('Warranty')}>
        <NumberField label={tr('Warranty')} allowEmpty value={x.warrantyMonths} onChange={(v) => set({ warrantyMonths: v == null ? null : Math.round(v) })} suffix="mahine" hint={tr('0 = koi warranty nahi')} />
      </Section>
    </div>
  );
}

function specErrors(x: OpticalExtra): Errors {
  const e: Errors = {};
  const bad = (v: number | null, lo: number, hi: number) => v != null && (v < lo || v > hi);
  if (bad(x.frameSizeMm, 30, 80) || bad(x.bridgeSizeMm, 10, 30) || bad(x.templeLengthMm, 100, 160)) e.size = tr('Size sahi likhein: lens 30-80, bridge 10-30, dandi 100-160 mm');
  if (x.supportsMinSph != null && x.supportsMaxSph != null && x.supportsMinSph > x.supportsMaxSph) e.range = tr('Kam se kam SPH zyada wale se bara hai');
  if (x.warrantyMonths != null && (x.warrantyMonths < 0 || x.warrantyMonths > 60)) e.size = tr('Warranty 0 se 60 mahine');
  return e;
}

const core: CoreOptions = {
  units: [{ value: 'pcs', label: tr('Piece') }, { value: 'pair', label: tr('Pair') }, { value: 'box', label: tr('Box') }, { value: 'pack', label: tr('Pack') }, { value: 'bottle', label: tr('Bottle') }],
  skuPrefix: 'OPT',
  packs: true,
  variants: { presets: [{ group: tr('Rang'), values: COLOURS }, { group: tr('Contact lens power'), values: ['-1.00', '-1.50', '-2.00', '-2.50', '-3.00', '-4.00'] }] },
  batches: true,
  markups: [30, 50, 80, 100],
};

const specsStep: StepDef<OpticalExtra> = {
  id: 'specs', title: tr('Tafseel'), hint: tr('Brand, size, lens'), icon: Glasses, render: (ctx) => <Specs ctx={ctx} />,
  validate: (d) => specErrors(d.extra),
};

const config: EditorConfig<OpticalExtra> = {
  label: tr('Optical'),
  draftKey: 'nafaa.product-editor.optical',
  paths: { list: '/products', detail: (id) => `/optical-products/${id}`, create: '/optical-products/new' },
  core,
  extra: {
    initial,
    load: async (productId) => {
      const p = await opticalProductsApi.byProduct(productId).catch(() => null);
      if (!p) return {};
      return {
        categoryType: p.categoryType ?? '', brand: p.brand ?? '', modelNumber: p.modelNumber ?? '', collectionName: p.collectionName ?? '', colorName: p.colorName ?? '', colorHex: p.colorHex ?? '',
        frameShape: p.frameShape ?? '', frameMaterial: p.frameMaterial ?? '', gender: p.gender ?? '', frameSizeMm: p.frameSizeMm, bridgeSizeMm: p.bridgeSizeMm, templeLengthMm: p.templeLengthMm,
        lensType: p.lensType ?? '', lensIndex: p.lensIndex ?? '', lensMaterial: p.lensMaterial ?? '', lensCoatings: p.lensCoatings ?? [],
        hasBlueCut: p.hasBlueCut, isPhotochromic: p.isPhotochromic, isPolarized: p.isPolarized, hasUvProtection: !!p.hasUvProtection,
        clDuration: p.clDuration ?? '', clBaseCurve: p.clBaseCurve ?? '', clDiameter: p.clDiameter ?? '', clWaterContent: p.clWaterContent ?? '', clForAstigmatism: p.clForAstigmatism,
        supportsMinSph: p.supportsMinSph, supportsMaxSph: p.supportsMaxSph, supportsMaxCyl: p.supportsMaxCyl, supportsProgressive: p.supportsProgressive, warrantyMonths: p.warrantyMonths,
      };
    },
    save: async (productId, d) => {
      const x = d.extra;
      const kind = kindOf(x.categoryType || null);
      const body = {
        productId, categoryType: x.categoryType || undefined,
        brand: opt(x.brand), modelNumber: opt(x.modelNumber), collectionName: opt(x.collectionName), colorName: opt(x.colorName), colorHex: opt(x.colorHex),
        frameShape: x.frameShape || undefined, frameMaterial: x.frameMaterial || undefined, gender: x.gender || undefined,
        frameSizeMm: num(x.frameSizeMm), bridgeSizeMm: num(x.bridgeSizeMm), templeLengthMm: num(x.templeLengthMm),
        lensType: opt(x.lensType), lensIndex: opt(x.lensIndex), lensMaterial: opt(x.lensMaterial), lensCoatings: x.lensCoatings,
        hasBlueCut: x.hasBlueCut, isPhotochromic: x.isPhotochromic, isPolarized: x.isPolarized, hasUvProtection: x.hasUvProtection,
        isContactLens: kind === 'contact', clDuration: opt(x.clDuration), clBaseCurve: opt(x.clBaseCurve), clDiameter: opt(x.clDiameter), clWaterContent: opt(x.clWaterContent), clForAstigmatism: x.clForAstigmatism,
        supportsMinSph: num(x.supportsMinSph), supportsMaxSph: num(x.supportsMaxSph), supportsMaxCyl: num(x.supportsMaxCyl), supportsProgressive: x.supportsProgressive,
        warrantyMonths: num(x.warrantyMonths), retailPrice: num(d.core.price), costPrice: num(d.core.costPrice),
      };
      await opticalProductsApi.upsert(Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined)) as typeof body);
    },
  },
  steps: [
    { ...basicStep<OpticalExtra>(core, {
      extra: (ctx) => <Kind ctx={ctx} />,
      namePlaceholder: tr('Jaise: Ray-Ban RB2140 Black ya Acuvue Oasys'),
      categorySuggestions: ['Frames', 'Sunglasses', 'Lens', 'Contact lens', 'Solution', 'Accessories'],
    }) },
    specsStep,
    priceStep<OpticalExtra>(core),
    stockStep<OpticalExtra>(core, { quick: [1, 5, 10, 20] }),
  ],
  summary: (d) => {
    const x = d.extra;
    const line = [typeLabel(x.categoryType || null), [x.brand, x.modelNumber].filter(Boolean).join(' '), x.colorName, x.frameSizeMm ? [x.frameSizeMm, x.bridgeSizeMm, x.templeLengthMm].filter(Boolean).join('-') : '', x.lensIndex, x.clDuration].filter(Boolean);
    return line.length ? <p className="mt-3 border-t border-slate-100 pt-3 text-[0.8125rem] text-slate-700">{line.join(' · ')}</p> : null;
  },
  refresh: [FACTS_KEY, 'optical-product-detail'],
  guide: [
    { icon: Glasses, color: '#0891b2', title: tr('Frame'), text: tr('Brand, model, rang aur size (52-18-145). Har rang ka stock alag ho to rang ko variant banayein.') },
    { icon: Eye, color: '#7c3aed', title: tr('Contact lens'), text: tr('BC, DIA aur din — Stock step me batch aur expiry likhein; counter pehle purani expiry bechta hai.') },
  ],
};

export default function OpticalProductWizardPage() {
  return <ProductEditorPage config={config} />;
}
