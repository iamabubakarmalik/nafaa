/**
 * Sports product editor on the shared editor: sport and type, age group,
 * bat / ball / kit specs that show only for that kind of item, MRP and the
 * team rate (with minimum pieces and team discount), sizes for kits and
 * shoes as variants with their own barcode and opening stock, warranty and
 * marks.
 */

import { Award, BadgePercent, Shirt, Trophy, Users } from 'lucide-react';
import { ProductEditorPage } from '@modules/inventory/products/editor/ProductEditorPage';
import { basicStep, priceStep, stockStep } from '@modules/inventory/products/editor/coreSteps';
import { Chip, Section, Toggle, inputClass } from '@modules/inventory/products/editor/fields';
import type { CoreOptions, EditorConfig, StepContext, StepDef } from '@modules/inventory/products/editor/types';
import { sportsProductsApi } from '../api/products.api';
import { AGE_GROUPS, APPAREL_SIZES, BAT_SIZES, KIDS_SIZES, META_KEY, SPORTS, SPORT_TYPES, isApparel, isBat, opt, typeLabel } from '../components/meta';

export interface SportsExtra {
  sport: string; categoryType: string; ageGroup: string;
  batWood: string; batGrade: string; batSize: string; batWeightGrams: string; handleType: string;
  ballType: string; ballWeight: string; size: string; material: string; fit: string; weight: string;
  mrp: number | null; teamPrice: number | null; minTeamOrder: string; bulkDiscountPct: string;
  isTeamOrderable: boolean; hasCustomization: boolean;
  warrantyMonths: number; warrantyType: string; careInstructions: string;
  isNewArrival: boolean; isBestSeller: boolean; isProfessional: boolean;
}

const initial: SportsExtra = {
  sport: 'Cricket', categoryType: 'CRICKET_BAT', ageGroup: 'ADULT', batWood: '', batGrade: '', batSize: '', batWeightGrams: '', handleType: '',
  ballType: '', ballWeight: '', size: '', material: '', fit: '', weight: '', mrp: null, teamPrice: null, minTeamOrder: '', bulkDiscountPct: '',
  isTeamOrderable: false, hasCustomization: false, warrantyMonths: 0, warrantyType: '', careInstructions: '',
  isNewArrival: true, isBestSeller: false, isProfessional: false,
};

const label = (t: string) => <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">{t}</span>;
const num = (v: string) => v.replace(/[^\d.]/g, '');

function Field({ ctx, k, title, ph, max = 60, hint }: { ctx: StepContext<SportsExtra>; k: keyof SportsExtra; title: string; ph?: string; max?: number; hint?: string }) {
  return (
    <label className="block">
      {label(title)}
      <input value={String(ctx.draft.extra[k] ?? '')} onChange={(e) => ctx.setExtra({ [k]: e.target.value } as Partial<SportsExtra>)} placeholder={ph} className={inputClass} maxLength={max} />
      {hint && <span className="mt-1 block text-[0.75rem] text-slate-500">{hint}</span>}
    </label>
  );
}

/* ── Basic step additions: sport, type, age group ── */
function Identity({ ctx }: { ctx: StepContext<SportsExtra> }) {
  const x = ctx.draft.extra;
  const types = SPORT_TYPES.filter((t) => t.sport === x.sport || t.sport === 'Other');
  return (
    <div className="space-y-4">
      <div>
        {label('Sport')}
        <div className="flex flex-wrap gap-1.5">
          {SPORTS.map((s) => <Chip key={s} on={x.sport === s} onClick={() => ctx.setExtra({ sport: s, categoryType: SPORT_TYPES.find((t) => t.sport === s)?.value ?? 'OTHER' })}>{s}</Chip>)}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          {label('Item ki type')}
          <select value={x.categoryType} onChange={(e) => ctx.setExtra({ categoryType: e.target.value })} className={inputClass}>
            {types.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <span className="mt-1 block text-[0.75rem] text-slate-500">Bat, ball ya kit ki tafseel isi se khulti hai</span>
        </label>
        <div>
          {label('Kis ke liye')}
          <div className="flex flex-wrap gap-1.5">{AGE_GROUPS.map((a) => <Chip key={a.value} on={x.ageGroup === a.value} onClick={() => ctx.setExtra({ ageGroup: a.value })}>{a.label}</Chip>)}</div>
        </div>
      </div>
    </div>
  );
}

/* ── Price step addition: MRP and team rate ── */
function TeamRate({ ctx }: { ctx: StepContext<SportsExtra> }) {
  const x = ctx.draft.extra;
  const money = (k: 'mrp' | 'teamPrice') => (e: React.ChangeEvent<HTMLInputElement>) => { const v = num(e.target.value); ctx.setExtra({ [k]: v ? Number(v) : null } as Partial<SportsExtra>); };
  return (
    <div className="space-y-4">
      <Section icon={BadgePercent} title="MRP" hint="MRP se kam rate ho to Sale ka nishan lagta hai">
        <input inputMode="decimal" value={x.mrp ?? ''} onChange={money('mrp')} placeholder="0" className={`${inputClass} w-40 tabular-nums`} />
      </Section>
      <Section icon={Users} title="Team / school order" hint="Bulk order me yahi rate khud lagta hai">
        <Toggle on={x.isTeamOrderable} onChange={(v) => ctx.setExtra({ isTeamOrderable: v })} title="Team order me bikta hai" hint="Kit, ball, bat — team ke liye" />
        {x.isTeamOrderable && (
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <label className="block">{label('Team rate (har piece)')}<input inputMode="decimal" value={x.teamPrice ?? ''} onChange={money('teamPrice')} placeholder="0" className={`${inputClass} tabular-nums`} /></label>
            <label className="block">{label('Kam se kam piece')}<input inputMode="numeric" value={x.minTeamOrder} onChange={(e) => ctx.setExtra({ minTeamOrder: e.target.value.replace(/\D/g, '') })} placeholder="11" className={`${inputClass} tabular-nums`} /></label>
            <label className="block">{label('Team discount %')}<input inputMode="decimal" value={x.bulkDiscountPct} onChange={(e) => ctx.setExtra({ bulkDiscountPct: num(e.target.value) })} placeholder="0" className={`${inputClass} tabular-nums`} /></label>
          </div>
        )}
      </Section>
    </div>
  );
}

const core: CoreOptions = {
  units: [{ value: 'pcs', label: 'Piece' }, { value: 'pair', label: 'Jora' }, { value: 'set', label: 'Set' }, { value: 'box', label: 'Dabba' }, { value: 'kg', label: 'Kg' }],
  skuPrefix: 'SP',
  packs: true,
  variants: { presets: [{ group: 'Kit size', values: APPAREL_SIZES }, { group: 'Bachon ki kit', values: KIDS_SIZES }, { group: 'Bat size', values: BAT_SIZES }] },
  markups: [20, 30, 40, 50, 80, 100],
};

const specs: StepDef<SportsExtra> = {
  id: 'sports', title: 'Tafseel', hint: 'Bat, ball, kit, warranty', icon: Trophy,
  validate: (d) => {
    const e: Record<string, string> = {};
    if (Number(d.extra.bulkDiscountPct) > 100) e.bulkDiscountPct = 'Discount 100% se zyada nahi';
    if (d.extra.warrantyMonths < 0 || d.extra.warrantyMonths > 60) e.warrantyMonths = 'Warranty 0 se 60 mahine';
    return e;
  },
  render: (ctx) => {
    const x = ctx.draft.extra;
    return (
      <div className="space-y-4">
        {isBat(x.categoryType) && (
          <Section icon={Trophy} title="Bat">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field ctx={ctx} k="batWood" title="Lakri" ph="English willow, Kashmir willow" />
              <Field ctx={ctx} k="batGrade" title="Grade" ph="1, 2, Players" max={20} />
              <Field ctx={ctx} k="batSize" title="Size" ph="SH, LH, Size 6" max={20} />
              <label className="block">{label('Wazan (gram)')}<input inputMode="numeric" value={x.batWeightGrams} onChange={(e) => ctx.setExtra({ batWeightGrams: e.target.value.replace(/\D/g, '') })} placeholder="1180" className={`${inputClass} tabular-nums`} /></label>
              <Field ctx={ctx} k="handleType" title="Handle" ph="Round, oval" max={30} />
            </div>
          </Section>
        )}
        {/BALL|SHUTTLE/.test(x.categoryType) && x.categoryType !== 'FOOTBALL_SHOES' && (
          <Section icon={Trophy} title="Ball">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field ctx={ctx} k="ballType" title="Type" ph="Hard, tape, tennis, size 5" />
              <Field ctx={ctx} k="ballWeight" title="Wazan" ph="156 g" max={20} />
            </div>
          </Section>
        )}
        {isApparel(x.categoryType) && (
          <Section icon={Shirt} title="Kit / jersey" hint="Sizes Stock step me variant bana kar daalein">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field ctx={ctx} k="material" title="Kapra" ph="Dri-fit, polyester" />
              <Field ctx={ctx} k="fit" title="Fitting" ph="Regular, slim" max={30} />
            </div>
            <div className="mt-3"><Toggle on={x.hasCustomization} onChange={(v) => ctx.setExtra({ hasCustomization: v })} title="Naam / number print hota hai" hint="Team order me printing ka rate alag lagta hai" /></div>
          </Section>
        )}
        <Section icon={Award} title="Warranty aur nishan">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field ctx={ctx} k="weight" title="Wazan / size" ph="5 kg, 20 inch" max={30} />
            <label className="block">
              {label('Warranty (mahine)')}
              <input inputMode="numeric" value={x.warrantyMonths || ''} onChange={(e) => ctx.setExtra({ warrantyMonths: Number(e.target.value.replace(/\D/g, '')) || 0 })} placeholder="0" className={`${inputClass} tabular-nums`} />
              {ctx.errors.warrantyMonths && <span className="mt-1 block text-[0.75rem] text-rose-600">{ctx.errors.warrantyMonths}</span>}
            </label>
            <Field ctx={ctx} k="warrantyType" title="Warranty kis cheez ki" ph="Handle crack, silai" />
          </div>
          <div className="mt-3"><Field ctx={ctx} k="careInstructions" title="Dekh bhaal" ph="Naye bat ko oil aur knocking karein" max={200} /></div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Chip on={x.isNewArrival} onClick={() => ctx.setExtra({ isNewArrival: !x.isNewArrival })}>Naya maal</Chip>
            <Chip on={x.isBestSeller} onClick={() => ctx.setExtra({ isBestSeller: !x.isBestSeller })}>Best seller</Chip>
            <Chip on={x.isProfessional} onClick={() => ctx.setExtra({ isProfessional: !x.isProfessional })}>Pro / match ka</Chip>
          </div>
        </Section>
      </div>
    );
  },
};

const s = (v?: string | null) => v ?? '';

const config: EditorConfig<SportsExtra> = {
  label: 'Sports',
  draftKey: 'nafaa.product-editor.sports',
  paths: { list: '/sports-products', detail: (id) => `/sports-products/${id}`, create: '/sports-products/new' },
  core,
  extra: {
    initial,
    load: async (productId) => {
      const p = await sportsProductsApi.byProduct(productId).catch(() => null);
      if (!p) return {};
      return {
        sport: s(p.sport) || 'Other', categoryType: s(p.categoryType) || 'OTHER', ageGroup: p.ageGroup ?? 'ADULT',
        batWood: s(p.batWood), batGrade: s(p.batGrade), batSize: s(p.batSize), batWeightGrams: p.batWeightGrams ? String(p.batWeightGrams) : '', handleType: s(p.handleType),
        ballType: s(p.ballType), ballWeight: s(p.ballWeight), size: s(p.size), material: s(p.material), fit: s(p.fit), weight: s(p.weight),
        mrp: p.mrp ?? null, teamPrice: p.teamPrice ?? null, minTeamOrder: p.minTeamOrder ? String(p.minTeamOrder) : '', bulkDiscountPct: p.bulkDiscountPct ? String(p.bulkDiscountPct) : '',
        isTeamOrderable: p.isTeamOrderable, hasCustomization: p.hasCustomization, warrantyMonths: p.warrantyMonths ?? 0, warrantyType: s(p.warrantyType),
        careInstructions: s(p.careInstructions), isNewArrival: p.isNewArrival, isBestSeller: p.isBestSeller, isProfessional: p.isProfessional,
      };
    },
    save: async (productId, d) => {
      const x = d.extra;
      await sportsProductsApi.upsert({
        productId, sport: x.sport, categoryType: x.categoryType, ageGroup: x.ageGroup,
        batWood: opt(x.batWood), batGrade: opt(x.batGrade), batSize: opt(x.batSize), batWeightGrams: x.batWeightGrams ? Number(x.batWeightGrams) : undefined, handleType: opt(x.handleType),
        ballType: opt(x.ballType), ballWeight: opt(x.ballWeight), size: opt(x.size), material: opt(x.material), fit: opt(x.fit), weight: opt(x.weight),
        mrp: x.mrp ?? undefined, teamPrice: x.isTeamOrderable ? x.teamPrice ?? undefined : undefined,
        minTeamOrder: x.isTeamOrderable && x.minTeamOrder ? Number(x.minTeamOrder) : undefined,
        bulkDiscountPct: x.isTeamOrderable && x.bulkDiscountPct ? Number(x.bulkDiscountPct) : undefined,
        isTeamOrderable: x.isTeamOrderable, hasCustomization: x.hasCustomization, warrantyMonths: x.warrantyMonths, warrantyType: opt(x.warrantyType),
        careInstructions: opt(x.careInstructions), isNewArrival: x.isNewArrival, isBestSeller: x.isBestSeller, isProfessional: x.isProfessional, isFeatured: d.core.isFeatured,
      });
    },
  },
  steps: [
    basicStep<SportsExtra>(core, { extra: (ctx) => <Identity ctx={ctx} />, namePlaceholder: 'Jaise: CA Plus 15000 English Willow Bat', categorySuggestions: ['Cricket', 'Football', 'Badminton', 'Gym', 'Kits', 'Trophies'] }),
    priceStep<SportsExtra>(core, { extra: (ctx) => <TeamRate ctx={ctx} /> }),
    stockStep<SportsExtra>(core, { quick: [1, 6, 12, 24, 50] }),
    specs,
  ],
  summary: (d) => (
    <div className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-[0.8125rem]">
      <p className="text-slate-600">{[d.extra.sport, typeLabel(d.extra.categoryType)].filter(Boolean).join(' · ')}</p>
      {d.extra.isTeamOrderable && d.extra.teamPrice ? <p className="text-teal-700">Team rate Rs {d.extra.teamPrice}</p> : null}
      {d.core.variants.length > 0 && <p className="text-violet-700">{d.core.variants.length} size</p>}
    </div>
  ),
  refresh: [META_KEY],
  guide: [
    { icon: Users, color: '#0d9488', title: 'Team rate', text: 'Price step me "Team order me bikta hai" lagayein aur team rate likhein — team order banate waqt khud aata hai.' },
    { icon: Shirt, color: '#7c3aed', title: 'Kit ke sizes', text: 'Stock step me "Variants" se S, M, L… banayein; har size ka apna barcode aur stock.' },
  ],
};

export default function SportsProductWizardPage() {
  return <ProductEditorPage config={config} />;
}
