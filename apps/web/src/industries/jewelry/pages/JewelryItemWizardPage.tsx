/**
 * Jewelry piece editor on the shared editor: type and karat, weights
 * (gross, stones, net), banwai per gram / fixed / percent, kaat (wastage),
 * polish and hallmark charges, stones, and the price at today's rate that
 * the counter uses. Hallmark, certificate, buy-back and return terms in the
 * last step.
 */

import { Award, Gem, Plus, Scale, ShieldCheck, Trash2, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { useCategoryKindSync } from '@modules/inventory/categories/lib/kinds';
import { ProductEditorPage } from '@modules/inventory/products/editor/ProductEditorPage';
import { basicStep, priceStep, stockStep } from '@modules/inventory/products/editor/coreSteps';
import { Chip, NumberField, Section, TextField, Toggle, inputClass } from '@modules/inventory/products/editor/fields';
import type { CoreOptions, EditorConfig, Errors, StepContext, StepDef } from '@modules/inventory/products/editor/types';
import { jewelryProductsApi, type GemstoneType, type JewelryCategory, type JewelryStyle } from '../api/products.api';
import type { MetalType, Purity } from '../api/metal-rates.api';
import { useMetalRates } from '../hooks/useJewelryFacts';
import {
  COMMON_PURITIES, KEYS, PURITY_LABEL, TOLA, categoryLabel, grams, metalOf, piecePrice, purityLabel, r3, rateFor,
} from '../lib/meta';
import { Trans, t } from '@core/i18n';

interface Stone { type: GemstoneType; count: number; caret: number; totalValue: number }

export interface JewelryExtra {
  category: JewelryCategory; style: JewelryStyle; metalType: MetalType; purity: Purity;
  itemCode: string; designNumber: string; size: string;
  grossWeight: number; stoneWeight: number; netWeight: number;
  makingChargePerGram: number; makingChargeFixed: number; makingChargePct: number;
  wastagePct: number; wastageGrams: number; polishCharge: number; hallmarkCharge: number; otherCharges: number;
  stones: Stone[];
  hallmarkNumber: string; certificateNumber: string; isCertified: boolean;
  isBuyBackEligible: boolean; buyBackPct: number; isReturnable: boolean; returnDays: number;
  karigarName: string; isBridalCollection: boolean;
}

const initial: JewelryExtra = {
  category: 'OTHER', style: 'TRADITIONAL', metalType: 'GOLD', purity: 'KARAT_22', itemCode: '', designNumber: '', size: '',
  grossWeight: 0, stoneWeight: 0, netWeight: 0, makingChargePerGram: 0, makingChargeFixed: 0, makingChargePct: 0,
  wastagePct: 0, wastageGrams: 0, polishCharge: 0, hallmarkCharge: 0, otherCharges: 0, stones: [],
  hallmarkNumber: '', certificateNumber: '', isCertified: false, isBuyBackEligible: true, buyBackPct: 90, isReturnable: true, returnDays: 7,
  karigarName: '', isBridalCollection: false,
};

const STYLES: Array<[JewelryStyle, string]> = [
  ['TRADITIONAL', t('Desi / traditional')], ['MODERN', t('Modern')], ['BRIDAL', t('Bridal')], ['DAILY_WEAR', t('Roz pehnne wala')], ['PARTY_WEAR', t('Party')],
  ['KUNDAN', t('Kundan')], ['POLKI', t('Polki')], ['MEENAKARI', t('Meenakari')], ['JADAU', t('Jadau')], ['ANTIQUE', t('Antique')], ['TURKISH', t('Turkish')],
  ['ITALIAN', t('Italian')], ['DUBAI', t('Dubai')], ['HANDMADE', t('Haath ka bana')], ['MACHINE_MADE', t('Machine ka bana')], ['OTHER', t('Doosra')],
];
const STONES: Array<[GemstoneType, string]> = [
  ['CZ', t('Zircon / CZ')], ['DIAMOND', t('Heera')], ['RUBY', t('Yaqoot (ruby)')], ['EMERALD', t('Zamurrad')], ['SAPPHIRE', t('Neelam')], ['PEARL', t('Moti')],
  ['KUNDAN_STONE', t('Kundan')], ['TURQUOISE', t('Feroza')], ['CORAL', t('Marjan')], ['OTHER', t('Doosra')],
];
const opt = (s: string) => s.trim() || undefined;
const stonesTotal = (x: JewelryExtra) => x.stones.reduce((s, g) => s + (Number(g.totalValue) || 0), 0);

/* ── Basic step additions: type, karat, style, codes ── */
function Identity({ ctx }: { ctx: StepContext<JewelryExtra> }) {
  const x = ctx.draft.extra;
  // The jewelry type comes from the shop category's kind (nearest parent); the editor shows no separate picker.
  useCategoryKindSync(ctx.draft.core.categoryId, x.category, (category) => ctx.setExtra({ category: category as JewelryCategory }));
  return (
    <div className="space-y-4">
      <div>
        <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">{t('Karat / metal')}</span>
        <div className="flex flex-wrap gap-1.5">
          {COMMON_PURITIES.map((p) => (
            <Chip key={p} on={x.purity === p} onClick={() => ctx.setExtra({ purity: p, metalType: metalOf(p) })}>{PURITY_LABEL[p]}</Chip>
          ))}
        </div>
        <span className="mt-1 block text-[0.75rem] text-slate-500">{t('Qeemat isi karat ke aaj ke rate se lagti hai')}</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">{t('Design')}</span>
          <select value={x.style} onChange={(e) => ctx.setExtra({ style: e.target.value as JewelryStyle })} className={inputClass}>
            {STYLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
        <TextField label={t('Design number')} value={x.designNumber} onChange={(v) => ctx.setExtra({ designNumber: v })} placeholder={t('D-1042')} hint={t('Search me milta hai')} />
        <TextField label={t('Size')} value={x.size} onChange={(v) => ctx.setExtra({ size: v })} placeholder={t('Angoothi 16, choori 2.6')} />
      </div>
    </div>
  );
}

/* ── Weight and charges, with the live price at today's rate ── */
function Weights({ ctx }: { ctx: StepContext<JewelryExtra> }) {
  const x = ctx.draft.extra;
  const { rates, isLoading } = useMetalRates();
  const rate = rateFor(rates, x.metalType, x.purity);
  const price = rate ? piecePrice({
    netWeight: x.netWeight, ratePerGram: rate.ratePerGram, makingChargePerGram: x.makingChargePerGram, makingChargeFixed: x.makingChargeFixed,
    makingChargePct: x.makingChargePct, wastagePct: x.wastagePct, wastageGrams: x.wastageGrams,
    polishCharges: x.polishCharge + x.otherCharges, hallmarkCharges: x.hallmarkCharge, stoneValue: stonesTotal(x),
  }) : null;
  const setWeight = (patch: Partial<Pick<JewelryExtra, 'grossWeight' | 'stoneWeight'>>) => {
    const next = { grossWeight: x.grossWeight, stoneWeight: x.stoneWeight, ...patch };
    ctx.setExtra({ ...patch, netWeight: r3(Math.max(next.grossWeight - next.stoneWeight, 0)) });
  };
  const setStone = (i: number, patch: Partial<Stone>) => ctx.setExtra({ stones: x.stones.map((s, j) => (j === i ? { ...s, ...patch } : s)) });

  return (
    <div className="space-y-4">
      <Section icon={Scale} title={t('Wazan')} hint={t('Kaante par tol kar likhein — nag ka wazan alag')}>
        <div className="grid gap-3 sm:grid-cols-3">
          <NumberField label={t('Kul wazan')} suffix="g" value={x.grossWeight} onChange={(v) => setWeight({ grossWeight: v ?? 0 })} required
            error={ctx.errors.grossWeight} hint={x.grossWeight ? t('{{value}} tola', { value: (x.grossWeight / TOLA).toFixed(3) }) : t('Nag samait')} />
          <NumberField label={t('Nag / moti ka wazan')} suffix="g" value={x.stoneWeight} onChange={(v) => setWeight({ stoneWeight: v ?? 0 })} allowEmpty hint={t('Sone me nahi gina jata')} />
          <NumberField label={t('Asal (net) wazan')} suffix="g" value={x.netWeight} onChange={(v) => ctx.setExtra({ netWeight: v ?? 0 })} required
            error={ctx.errors.netWeight} hint={t('Isi par rate lagta hai')} />
        </div>
      </Section>

      <Section icon={Gem} title={t('Banwai aur kaat')} hint={t('Jo dukaan leti hai — ek ya zyada tareeqe')}>
        <div className="grid gap-3 sm:grid-cols-3">
          <NumberField label={t('Banwai per gram')} prefix="Rs" value={x.makingChargePerGram} onChange={(v) => ctx.setExtra({ makingChargePerGram: v ?? 0 })} allowEmpty />
          <NumberField label={t('Banwai fixed')} prefix="Rs" value={x.makingChargeFixed} onChange={(v) => ctx.setExtra({ makingChargeFixed: v ?? 0 })} allowEmpty />
          <NumberField label={t('Banwai %')} suffix="%" value={x.makingChargePct} onChange={(v) => ctx.setExtra({ makingChargePct: v ?? 0 })} allowEmpty hint={t('Sone ki qeemat ka')} />
          <NumberField label={t('Kaat / wastage %')} suffix="%" value={x.wastagePct} onChange={(v) => ctx.setExtra({ wastagePct: v ?? 0 })} allowEmpty error={ctx.errors.wastagePct} />
          <NumberField label={t('Kaat grams me')} suffix="g" value={x.wastageGrams} onChange={(v) => ctx.setExtra({ wastageGrams: v ?? 0 })} allowEmpty hint={t('Aaj ke rate par')} />
          <NumberField label={t('Polish')} prefix="Rs" value={x.polishCharge} onChange={(v) => ctx.setExtra({ polishCharge: v ?? 0 })} allowEmpty />
          <NumberField label={t('Hallmark')} prefix="Rs" value={x.hallmarkCharge} onChange={(v) => ctx.setExtra({ hallmarkCharge: v ?? 0 })} allowEmpty />
          <NumberField label={t('Doosre charges')} prefix="Rs" value={x.otherCharges} onChange={(v) => ctx.setExtra({ otherCharges: v ?? 0 })} allowEmpty />
        </div>
      </Section>

      <Section icon={Gem} title={t('Nag (stones)')} hint={t('Har nag ki qeemat bill me alag aati hai')}
        actions={<button type="button" onClick={() => ctx.setExtra({ stones: [...x.stones, { type: 'CZ', count: 1, caret: 0, totalValue: 0 }] })}
          className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[0.8125rem] font-semibold text-brand-700 hover:bg-brand-50"><Plus className="h-4 w-4" />{t('Nag')}</button>}>
        {x.stones.length === 0 ? <p className="text-[0.8125rem] text-slate-500">{t('Koi nag nahi')}</p> : (
          <div className="space-y-2">
            {x.stones.map((s, i) => (
              <div key={i} className="grid grid-cols-2 items-end gap-2 rounded-xl bg-slate-50 p-2 ring-1 ring-slate-200 sm:grid-cols-[1.4fr_0.7fr_0.8fr_1fr_auto]">
                <label className="block">
                  <span className="mb-1 block text-[0.75rem] font-medium text-slate-600">{t('Nag')}</span>
                  <select value={s.type} onChange={(e) => setStone(i, { type: e.target.value as GemstoneType })} className={cn(inputClass, 'h-9')}>
                    {STONES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </label>
                <NumberField label={t('Ginti')} value={s.count} onChange={(v) => setStone(i, { count: Math.max(Math.round(v ?? 1), 1) })} />
                <NumberField label={t('Carat')} value={s.caret} onChange={(v) => setStone(i, { caret: v ?? 0 })} allowEmpty />
                <NumberField label={t('Qeemat')} prefix="Rs" value={s.totalValue} onChange={(v) => setStone(i, { totalValue: v ?? 0 })} allowEmpty />
                <button type="button" aria-label={t('Nag hatayein')} onClick={() => ctx.setExtra({ stones: x.stones.filter((_, j) => j !== i) })}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        )}
      </Section>

      <div className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200">
        <div className="flex flex-wrap items-center gap-2">
          <TrendingUp className="h-4 w-4 text-amber-700" />
          <span className="text-[0.875rem] font-semibold text-amber-900">{t('Aaj ki qeemat')}</span>
          {rate && <span className="text-[0.75rem] text-amber-800">{t('{{purity}} @ {{ratePerGram}}/g', { purity: purityLabel(x.purity), ratePerGram: formatPKR(rate.ratePerGram) })}</span>}
        </div>
        {isLoading ? <p className="mt-2 text-[0.8125rem] text-amber-800">{t('Rate load ho raha hai…')}</p> : !price ? (
          <p className="mt-2 text-[0.8125rem] text-amber-900"><Trans text="{{purity}} ka aaj ka rate set nahi. {{link}} — tab tak qeemat khud likhein." values={{ purity: purityLabel(x.purity), link: <Link to="/jewelry/metal-rates" className="font-semibold underline">{t('Rate likhein')}</Link> }} /></p>
        ) : (
          <>
            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[0.8125rem] sm:grid-cols-5">
              <div><dt className="text-amber-800">{t('Sona')}</dt><dd className="font-semibold tabular-nums">{formatPKR(price.metal)}</dd></div>
              <div><dt className="text-amber-800">{t('Banwai')}</dt><dd className="font-semibold tabular-nums">{formatPKR(price.making)}</dd></div>
              <div><dt className="text-amber-800">{t('Kaat')}</dt><dd className="font-semibold tabular-nums">{formatPKR(price.wastage)}</dd></div>
              <div><dt className="text-amber-800">{t('Nag + charges')}</dt><dd className="font-semibold tabular-nums">{formatPKR(price.stones + price.other)}</dd></div>
              <div><dt className="text-amber-800">{t('Kul')}</dt><dd className="text-[1rem] font-bold tabular-nums text-amber-950">{formatPKR(price.total)}</dd></div>
            </dl>
            <button type="button" onClick={() => ctx.setCore({ price: Math.round(price.total) })} disabled={Math.round(price.total) === Math.round(ctx.draft.core.price)}
              className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-xl bg-amber-600 px-3 text-[0.8125rem] font-semibold text-white hover:bg-amber-700 disabled:opacity-50">
              {Math.round(price.total) === Math.round(ctx.draft.core.price) ? t('Sale price yehi hai') : t('Sale price {{formatPKR}} lagayein', { formatPKR: formatPKR(Math.round(price.total)) })}
            </button>
            <p className="mt-1.5 text-[0.75rem] text-amber-800">{t('POS par qeemat hamesha aaj ke rate se dobara banti hai — yahan ki price sirf list aur reports ke liye hai.')}</p>
          </>
        )}
      </div>
    </div>
  );
}

const weightsStep: StepDef<JewelryExtra> = {
  id: 'weight', title: t('Wazan aur banwai'), hint: t('Grams, banwai, kaat, nag'), icon: Scale,
  validate: (d) => {
    const e: Errors = {};
    const x = d.extra;
    if (!['IMITATION', 'OTHER'].includes(x.metalType)) {
      if (!(x.grossWeight > 0)) e.grossWeight = t('Kul wazan likhein');
      if (!(x.netWeight > 0)) e.netWeight = t('Asal wazan likhein');
    }
    if (x.netWeight > x.grossWeight + 0.0005) e.netWeight = t('Asal wazan kul wazan se zyada nahi ho sakta');
    if (x.wastagePct > 30) e.wastagePct = t('Kaat 30% se zyada? Check karein');
    return e;
  },
  render: (ctx) => <Weights ctx={ctx} />,
};

const termsStep: StepDef<JewelryExtra> = {
  id: 'terms', title: t('Hallmark aur wapsi'), hint: t('Hallmark, buy-back, karigar'), icon: ShieldCheck,
  render: (ctx) => {
    const x = ctx.draft.extra;
    return (
      <div className="space-y-4">
        <Section icon={Award} title={t('Hallmark aur certificate')}>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label={t('Hallmark number')} value={x.hallmarkNumber} onChange={(v) => ctx.setExtra({ hallmarkNumber: v })} placeholder={t('PSQCA / lab number')} hint={t('Bill par chhapta hai')} />
            <TextField label={t('Certificate number')} value={x.certificateNumber} onChange={(v) => ctx.setExtra({ certificateNumber: v, isCertified: !!v.trim() || x.isCertified })} />
          </div>
        </Section>
        <Section icon={ShieldCheck} title={t('Wapsi aur buy-back')} hint={t('Customer ko bill par yahi likha milta hai')}>
          <div className="grid gap-2 sm:grid-cols-2">
            <Toggle on={x.isBuyBackEligible} onChange={(v) => ctx.setExtra({ isBuyBackEligible: v })} title={t('Buy-back hota hai')} hint={t('Dukaan wapas khareedti hai')} />
            <Toggle on={x.isReturnable} onChange={(v) => ctx.setExtra({ isReturnable: v })} title={t('Wapsi ho sakti hai')} hint={t('Bill ke saath, tay dinon me')} />
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {x.isBuyBackEligible && <NumberField label={t('Buy-back kitne % par')} suffix="%" value={x.buyBackPct} onChange={(v) => ctx.setExtra({ buyBackPct: Math.min(v ?? 0, 100) })} hint={t('Sone ki aaj ki qeemat ka')} />}
            {x.isReturnable && <NumberField label={t('Wapsi kitne din me')} suffix="din" value={x.returnDays} onChange={(v) => ctx.setExtra({ returnDays: Math.round(v ?? 0) })} />}
          </div>
        </Section>
        <Section icon={Gem} title={t('Aur')}>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label={t('Karigar')} value={x.karigarName} onChange={(v) => ctx.setExtra({ karigarName: v })} placeholder={t('Kis ne banaya')} />
            <TextField label={t('Item code')} value={x.itemCode} onChange={(v) => ctx.setExtra({ itemCode: v })} placeholder={t('Dukaan ka andar ka code')} />
          </div>
          <div className="mt-3"><Toggle on={x.isBridalCollection} onChange={(v) => ctx.setExtra({ isBridalCollection: v })} title={t('Bridal collection')} hint={t('Shaadi ke set — POS par alag filter')} /></div>
        </Section>
      </div>
    );
  },
};

const core: CoreOptions = {
  units: [{ value: 'pcs', label: t('Piece') }, { value: 'set', label: t('Set') }, { value: 'pair', label: t('Jora') }],
  skuPrefix: 'JW',
  packs: false,
  variants: false,
};

const config: EditorConfig<JewelryExtra> = {
  label: t('Jewelry'),
  draftKey: 'nafaa.product-editor.jewelry',
  paths: { list: '/jewelry/products', detail: (id) => `/jewelry-items/${id}`, create: '/jewelry-items/new' },
  core,
  extra: {
    initial,
    load: async (productId) => {
      const p = await jewelryProductsApi.byProduct(productId).catch(() => null);
      if (!p) return {};
      return {
        category: p.category, style: p.style, metalType: p.metalType, purity: p.purity, itemCode: p.itemCode ?? '', designNumber: p.designNumber ?? '',
        size: p.size ?? '', grossWeight: p.grossWeight, stoneWeight: p.stoneWeight, netWeight: p.netWeight,
        makingChargePerGram: p.makingChargePerGram, makingChargeFixed: p.makingChargeFixed, makingChargePct: p.makingChargePct,
        wastagePct: p.wastagePct, wastageGrams: p.wastageGrams, polishCharge: p.polishCharge, hallmarkCharge: p.hallmarkCharge,
        otherCharges: (p.otherCharges ?? 0) + (p.designerCharge ?? 0),
        stones: (p.gemstones ?? []).map((g) => ({ type: g.type, count: g.count ?? 1, caret: g.caret ?? 0, totalValue: g.totalValue ?? 0 })),
        hallmarkNumber: p.hallmarkNumber ?? '', certificateNumber: p.certificateNumber ?? '', isCertified: p.isCertified,
        isBuyBackEligible: p.isBuyBackEligible, buyBackPct: p.buyBackPct, isReturnable: p.isReturnable, returnDays: p.returnDays,
        karigarName: p.karigarName ?? '', isBridalCollection: p.isBridalCollection,
      };
    },
    save: async (productId, d) => {
      const x = d.extra;
      await jewelryProductsApi.upsert({
        productId, category: x.category, style: x.style, metalType: x.metalType, purity: x.purity,
        itemCode: opt(x.itemCode), designNumber: opt(x.designNumber), size: opt(x.size),
        grossWeight: x.grossWeight, stoneWeight: x.stoneWeight, netWeight: x.netWeight,
        makingChargePerGram: x.makingChargePerGram, makingChargeFixed: x.makingChargeFixed, makingChargePct: x.makingChargePct,
        wastagePct: x.wastagePct, wastageGrams: x.wastageGrams, polishCharge: x.polishCharge, hallmarkCharge: x.hallmarkCharge,
        designerCharge: 0, otherCharges: x.otherCharges,
        hasStones: x.stones.length > 0, hasDiamond: x.stones.some((s) => s.type === 'DIAMOND'), hasPearl: x.stones.some((s) => s.type === 'PEARL'),
        hasGemstone: x.stones.some((s) => !['CZ', 'DIAMOND', 'PEARL'].includes(s.type)), stoneCount: x.stones.reduce((s, g) => s + g.count, 0),
        gemstones: x.stones.map((s) => ({ type: s.type, count: s.count, caret: s.caret, totalValue: s.totalValue })),
        hallmarkNumber: opt(x.hallmarkNumber), certificateNumber: opt(x.certificateNumber), isCertified: x.isCertified || !!x.certificateNumber.trim(),
        isBuyBackEligible: x.isBuyBackEligible, buyBackPct: x.buyBackPct, isReturnable: x.isReturnable, returnDays: x.returnDays,
        karigarName: opt(x.karigarName), isBridalCollection: x.isBridalCollection, isFeatured: d.core.isFeatured,
      });
    },
  },
  steps: [
    basicStep<JewelryExtra>(core, { extra: (ctx) => <Identity ctx={ctx} />, namePlaceholder: t('Jaise: 22K Turkish choori jora'), categorySuggestions: ['Sona', 'Chandi', 'Bridal', 'Roz pehnne wala'] }),
    weightsStep,
    priceStep<JewelryExtra>(core),
    stockStep<JewelryExtra>(core, { quick: [1, 2, 3, 5] }),
    termsStep,
  ],
  summary: (d) => (
    <div className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-[0.8125rem]">
      <p className="text-slate-600">{[categoryLabel(d.extra.category), purityLabel(d.extra.purity)].join(' · ')}</p>
      {d.extra.netWeight > 0 && <p className="font-semibold text-amber-800">{t('{{netWeight}} · {{value}} tola', { netWeight: grams(d.extra.netWeight), value: (d.extra.netWeight / TOLA).toFixed(3) })}</p>}
      {d.extra.stones.length > 0 && <p className="text-violet-700">{t('{{value}} nag · {{formatPKR}}', { value: d.extra.stones.reduce((s, g) => s + g.count, 0), formatPKR: formatPKR(stonesTotal(d.extra)) })}</p>}
      {d.extra.hallmarkNumber && <p className="text-emerald-700">{t('Hallmark {{hallmarkNumber}}', { hallmarkNumber: d.extra.hallmarkNumber })}</p>}
    </div>
  ),
  refresh: [KEYS.profiles],
  guide: [
    { icon: Scale, color: '#d97706', title: t('Wazan'), text: t('Kul wazan aur nag ka wazan likhein — asal wazan khud ban jata hai. Rate asal wazan par lagta hai.') },
    { icon: TrendingUp, color: '#16a34a', title: t('Aaj ki qeemat'), text: t('Wazan step me aaj ke rate se poori qeemat dikhti hai. POS par har roz naye rate se khud banti hai.') },
  ],
};

export default function JewelryItemWizardPage() {
  return <ProductEditorPage config={config} />;
}
