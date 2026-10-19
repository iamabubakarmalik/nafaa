/**
 * Mobile product editor on the shared steps: phone or accessory, model and
 * warranty, storage/RAM/colour variants, and for a phone the IMEIs of the
 * units on hand (scan, paste or type) with PTA status. A phone's stock comes
 * only from its IMEIs; an accessory keeps a plain count.
 */

import { useMemo, useState } from 'react';
import { AlertTriangle, ClipboardPaste, Plus, ScanLine, ShieldCheck, Smartphone, Trash2 } from 'lucide-react';
import { cn } from '@core/lib/cn';
import BarcodeScanner from '@core/components/barcode/BarcodeScanner';
import { ProductEditorPage } from '@modules/inventory/products/editor/ProductEditorPage';
import { basicStep, priceStep, stockStep } from '@modules/inventory/products/editor/coreSteps';
import { Chip, Section, TextField, Tiles, inputClass } from '@modules/inventory/products/editor/fields';
import type { CoreOptions, EditorConfig, EditorDraft, StepContext, StepDef } from '@modules/inventory/products/editor/types';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { productVariantsApi } from '@modules/inventory/products/api/product-variants.api';
import { imeiApi, type PtaStatus } from '../api/imei.api';
import { PTA_HINT, PTA_LIST, isLuhnValid, ptaOf } from '../components/meta';

interface ImeiLine { imei1: string; imei2: string; variant: string; pta: PtaStatus }

interface MobileExtra {
  phone: boolean;
  model: string;
  warrantyMonths: number;
  pta: PtaStatus;
  imeis: ImeiLine[];
  /** Edit only: phones of this model already on the shelf. */
  onShelf: number;
}

const initial: MobileExtra = { phone: true, model: '', warrantyMonths: 12, pta: 'APPROVED', imeis: [], onShelf: 0 };
const WARRANTY = [0, 1, 3, 6, 12, 24];
const MODEL_PREFIX = /^Model:\s*/i;

/* ── Basic step: what it is ── */
function Identity({ ctx }: { ctx: StepContext<MobileExtra> }) {
  const x = ctx.draft.extra;
  return (
    <div className="space-y-4">
      <div>
        <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Ye kya hai</span>
        <Tiles value={x.phone ? 'phone' : 'acc'} onChange={(v) => ctx.setExtra({ phone: v === 'phone' })} columns="grid-cols-2"
          options={[
            { value: 'phone', label: 'Phone / tablet', hint: 'Har piece ka IMEI — stock IMEI se', icon: '📱' },
            { value: 'acc', label: 'Accessory', hint: 'Charger, cover, handsfree — sirf ginti', icon: '🔌' },
          ]} />
      </div>
      <TextField label="Model number" value={x.model} onChange={(model) => ctx.setExtra({ model })} placeholder="Jaise: SM-A155F, A2846"
        hint="Marzi hai — search aur warranty claim me kaam aata hai" />
      {x.phone && (
        <div>
          <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Dukaan ki warranty (naye IMEI par lagegi)</span>
          <div className="flex flex-wrap gap-1.5">
            {WARRANTY.map((m) => <Chip key={m} on={x.warrantyMonths === m} onClick={() => ctx.setExtra({ warrantyMonths: m })}>{m === 0 ? 'Koi nahi' : m < 12 ? `${m} mahine` : `${m / 12} saal`}</Chip>)}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Stock step addition: IMEIs ── */
function Imeis({ ctx }: { ctx: StepContext<MobileExtra> }) {
  const x = ctx.draft.extra;
  const variants = ctx.draft.core.variants.filter((v) => v.isActive).map((v) => v.name.trim()).filter(Boolean);
  const [scan, setScan] = useState(false);
  const [paste, setPaste] = useState('');
  const known = useMemo(() => new Set(x.imeis.flatMap((l) => [l.imei1, l.imei2].filter(Boolean))), [x.imeis]);
  const blank = (imei1 = '', imei2 = ''): ImeiLine => ({ imei1, imei2, variant: variants.length === 1 ? variants[0] : '', pta: x.pta });
  const update = (i: number, patch: Partial<ImeiLine>) => ctx.setExtra({ imeis: x.imeis.map((l, j) => (j === i ? { ...l, ...patch } : l)) });
  const parsed = paste.split('\n').map((l) => l.replace(/[^\d,\s\t]/g, '').split(/[,\s\t]+/).filter(Boolean)).filter((p) => p[0]);
  const fresh = parsed.filter((p) => !known.has(p[0]));
  const stockTyped = ctx.draft.core.stock > 0 || ctx.draft.core.variants.some((v) => !v.id && v.stock > 0);

  if (!x.phone) return null;
  return (
    <Section icon={Smartphone} title="IMEI" hint="Har phone ka apna IMEI — isi se stock, bill, warranty aur chori ka record chalta hai">
      {scan && <BarcodeScanner onDetected={(c: string) => { const d = c.replace(/\D/g, ''); if (d.length === 15 && !known.has(d)) ctx.setExtra({ imeis: [...x.imeis, blank(d)] }); }} onClose={() => setScan(false)} />}
      <div className="space-y-3">
        {ctx.isEdit && <p className="text-[0.8125rem] text-slate-600">Abhi shelf par <strong>{x.onShelf}</strong> phone hain. Yahan sirf <strong>naye</strong> IMEI daalein — purane IMEI page par hain.</p>}
        {stockTyped && (
          <p className="flex items-start gap-1.5 rounded-xl bg-amber-50 px-3 py-2 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />Phone ka stock IMEI se banta hai — upar wala stock 0 rakhein, IMEI yahan daalein.
          </p>
        )}
        <div>
          <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">PTA (naye IMEI par)</span>
          <div className="flex flex-wrap gap-1.5">
            {PTA_LIST.map((p) => <Chip key={p} on={x.pta === p} onClick={() => ctx.setExtra({ pta: p })} color={ptaOf(p).color}>{ptaOf(p).label}</Chip>)}
          </div>
          <p className="mt-1 text-[0.75rem] text-slate-500">{PTA_HINT[x.pta]}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setScan(true)} className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 text-[0.8125rem] font-semibold text-white"><ScanLine className="h-4 w-4" />Dabba scan karein</button>
          <button type="button" onClick={() => ctx.setExtra({ imeis: [...x.imeis, blank()] })} className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-slate-100 px-3.5 text-[0.8125rem] font-semibold text-slate-700"><Plus className="h-4 w-4" />Haath se</button>
        </div>
        <details className="rounded-xl bg-slate-50 p-3">
          <summary className="flex cursor-pointer items-center gap-1.5 text-[0.8125rem] font-semibold text-slate-700"><ClipboardPaste className="h-4 w-4" />Excel ya WhatsApp se paste (har line: IMEI 1, IMEI 2)</summary>
          <textarea value={paste} onChange={(e) => setPaste(e.target.value)} rows={4} placeholder={'356789012345678, 356789012345686\n356789012345694'} className={cn(inputClass, 'mt-2 h-auto py-2 font-mono text-[0.8125rem]')} />
          {parsed.length > 0 && (
            <button type="button" onClick={() => { ctx.setExtra({ imeis: [...x.imeis, ...fresh.map((p) => blank(p[0], p[1] ?? ''))] }); setPaste(''); }}
              className="mt-2 h-9 rounded-xl bg-brand-600 px-3 text-[0.8125rem] font-semibold text-white">
              {fresh.length} naye jorein{parsed.length > fresh.length ? ` · ${parsed.length - fresh.length} pehle se hain` : ''}
            </button>
          )}
        </details>
        {x.imeis.length > 0 && (
          <div className="overflow-x-auto rounded-xl ring-1 ring-slate-200">
            <table className="w-full min-w-[40rem] text-[0.8125rem]">
              <thead>
                <tr className="bg-slate-50 text-left text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2">IMEI 1</th><th className="px-2 py-2">IMEI 2</th>{variants.length > 0 && <th className="px-2 py-2">Variant</th>}<th className="px-2 py-2">PTA</th><th />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {x.imeis.map((l, i) => {
                  const bad = l.imei1.length === 15 && !isLuhnValid(l.imei1);
                  return (
                    <tr key={i}>
                      <td className="px-3 py-1.5">
                        <input inputMode="numeric" maxLength={15} value={l.imei1} onChange={(e) => update(i, { imei1: e.target.value.replace(/\D/g, '') })} className={cn(inputClass, 'h-9 font-mono text-[0.8125rem]', bad && 'border-amber-400')} />
                        {bad && <span className="text-[0.6875rem] text-amber-700">Check digit nahi milta — dobara dekhein</span>}
                      </td>
                      <td className="px-2 py-1.5"><input inputMode="numeric" maxLength={15} value={l.imei2} onChange={(e) => update(i, { imei2: e.target.value.replace(/\D/g, '') })} placeholder="Dual SIM" className={cn(inputClass, 'h-9 font-mono text-[0.8125rem]')} /></td>
                      {variants.length > 0 && (
                        <td className="px-2 py-1.5">
                          <select value={l.variant} onChange={(e) => update(i, { variant: e.target.value })} className={cn(inputClass, 'h-9 text-[0.8125rem]')}>
                            <option value="">Chunein…</option>
                            {variants.map((v) => <option key={v} value={v}>{v}</option>)}
                          </select>
                        </td>
                      )}
                      <td className="px-2 py-1.5">
                        <select value={l.pta} onChange={(e) => update(i, { pta: e.target.value as PtaStatus })} className={cn(inputClass, 'h-9 text-[0.8125rem]')}>
                          {PTA_LIST.map((p) => <option key={p} value={p}>{ptaOf(p).label}</option>)}
                        </select>
                      </td>
                      <td className="px-2 py-1.5"><button type="button" onClick={() => ctx.setExtra({ imeis: x.imeis.filter((_, j) => j !== i) })} aria-label="Hatayein" className="flex h-9 w-9 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {ctx.errors.imeis && <p className="text-[0.8125rem] font-medium text-rose-600">{ctx.errors.imeis}</p>}
      </div>
    </Section>
  );
}

function imeiErrors(d: EditorDraft<MobileExtra>): string | null {
  const x = d.extra;
  if (!x.phone) return null;
  if (d.core.stock > 0 || d.core.variants.some((v) => !v.id && v.stock > 0)) return 'Phone ka stock IMEI se banta hai — stock 0 rakhein aur IMEI daalein';
  const all: string[] = [];
  const variants = d.core.variants.filter((v) => v.isActive).map((v) => v.name.trim()).filter(Boolean);
  for (const [i, l] of x.imeis.entries()) {
    if (!/^\d{15}$/.test(l.imei1)) return `Line ${i + 1}: IMEI 1 me 15 number hon`;
    if (l.imei2 && !/^\d{15}$/.test(l.imei2)) return `Line ${i + 1}: IMEI 2 me 15 number hon`;
    if (l.imei2 && l.imei2 === l.imei1) return `Line ${i + 1}: IMEI 1 aur 2 ek jaise nahi ho sakte`;
    if (variants.length && !variants.includes(l.variant)) return `Line ${i + 1}: variant chunein`;
    all.push(l.imei1, ...(l.imei2 ? [l.imei2] : []));
  }
  const dup = all.find((n, i) => all.indexOf(n) !== i);
  return dup ? `IMEI ${dup} do dafa likha hai` : null;
}

const core: CoreOptions = {
  units: [{ value: 'pcs', label: 'Adad (pcs)' }, { value: 'set', label: 'Set' }, { value: 'pair', label: 'Joda' }, { value: 'box', label: 'Dabba' }],
  skuPrefix: 'MOB',
  variants: {
    presets: [
      { group: 'Storage', values: ['64GB', '128GB', '256GB', '512GB', '1TB'] },
      { group: 'RAM', values: ['4GB', '6GB', '8GB', '12GB'] },
      { group: 'Rang', values: ['Black', 'White', 'Blue', 'Green', 'Gold', 'Titanium'] },
    ],
  },
  markups: [3, 5, 8, 10, 15, 20],
};

const stock = stockStep<MobileExtra>(core, { extra: (ctx) => <Imeis ctx={ctx} />, quick: [1, 5, 10, 25, 50] });
const stockWithImeis: StepDef<MobileExtra> = {
  ...stock,
  hint: 'Stock, variants aur IMEI',
  validate: (d, isEdit) => {
    const e = stock.validate?.(d, isEdit) ?? {};
    const err = imeiErrors(d);
    if (err) e.imeis = err;
    return e;
  },
};

const config: EditorConfig<MobileExtra> = {
  label: 'Mobile',
  draftKey: 'nafaa.product-editor.mobile',
  paths: { list: '/products', detail: (id) => `/mobile-products/${id}`, create: '/mobile-products/new' },
  core,
  extra: {
    initial,
    load: async (productId) => {
      const [product, page] = await Promise.all([
        productsApi.getOne(productId).catch(() => null),
        imeiApi.listAll({ productId, limit: 1 }).catch(() => null),
      ]);
      const total = page ? Object.values(page.counts).reduce((s, n) => s + (n ?? 0), 0) : 0;
      return {
        phone: (product as { productType?: string | null } | null)?.productType === 'PHONE' || total > 0,
        model: product?.shortDescription?.replace(MODEL_PREFIX, '') ?? '',
        onShelf: page?.counts.IN_STOCK ?? 0,
        imeis: [],
      };
    },
    // A phone's own stock starts at 0; its IMEIs bring it in.
    product: (d, payload) => ({
      ...payload,
      productType: d.extra.phone ? 'PHONE' : (payload.productType === 'PHONE' ? null : payload.productType),
      shortDescription: d.extra.model.trim() ? `Model: ${d.extra.model.trim()}` : undefined,
      ...(d.extra.phone && 'stock' in payload ? { stock: 0 } : {}),
    }),
    save: async (productId, d, { shopId }) => {
      const x = d.extra;
      if (!x.phone || !x.imeis.length) return;
      const variants = d.core.variants.length ? await productVariantsApi.list(productId) : [];
      const idOf = new Map(variants.map((v) => [v.name.trim(), v.id]));
      const groups = new Map<string, ImeiLine[]>();
      for (const l of x.imeis) groups.set(l.variant, [...(groups.get(l.variant) ?? []), l]);
      for (const [name, lines] of groups) {
        const variant = name ? d.core.variants.find((v) => v.name.trim() === name) : undefined;
        await imeiApi.bulkCreate({
          productId,
          variantId: name ? idOf.get(name) : undefined,
          shopId,
          costPrice: Number(variant?.costPrice ?? d.core.costPrice) || 0,
          warrantyMonths: x.warrantyMonths,
          imeis: lines.map((l) => ({ imei1: l.imei1, imei2: l.imei2 || undefined, ptaStatus: l.pta })),
        });
      }
    },
  },
  steps: [
    basicStep<MobileExtra>(core, { extra: (ctx) => <Identity ctx={ctx} />, namePlaceholder: 'Jaise: Samsung Galaxy A15', categorySuggestions: ['Mobile phones', 'Tablets', 'Chargers', 'Covers', 'Handsfree', 'Power banks', 'Smart watches'] }),
    priceStep<MobileExtra>(core),
    stockWithImeis,
  ],
  summary: (d) => (
    <div className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-[0.8125rem]">
      <p className="text-slate-600">{d.extra.phone ? '📱 Phone / tablet' : '🔌 Accessory'}{d.extra.model ? ` · ${d.extra.model}` : ''}</p>
      {d.extra.phone && d.extra.warrantyMonths > 0 && <p className="inline-flex items-center gap-1 text-emerald-700"><ShieldCheck className="h-3.5 w-3.5" />Warranty {d.extra.warrantyMonths} mahine</p>}
      {d.extra.phone && <p className="text-violet-700">{d.extra.imeis.length} naye IMEI{d.extra.imeis.length ? '' : ' — baad me bhi daal sakte hain'}</p>}
    </div>
  ),
  refresh: ['mobile-product-imeis', 'mobile-imei-shelf', 'mobile-imeis', 'mobile-pos-catalog'],
  guide: [
    { icon: Smartphone, color: '#2563eb', title: 'Phone ya accessory', text: 'Phone ka har piece IMEI se pehchana jata hai aur stock IMEI se banta hai. Accessory ka stock aam ginti hai.' },
    { icon: ScanLine, color: '#7c3aed', title: 'IMEI daalna', text: 'Dabbe ka barcode scan karein, Excel se paste karein ya haath se likhein. Har IMEI 15 number ka hota hai.' },
    { icon: ShieldCheck, color: '#16a34a', title: 'PTA', text: 'Har phone ki PTA halat likhein — Non-PTA phone ki SIM kuch din baad band ho jati hai, customer ko batana zaroori hai.' },
  ],
};

export default function MobileProductWizardPage() {
  return <ProductEditorPage config={config} />;
}
