import { useState } from 'react';
import {
  Package, Plus, Trash2, AlertCircle, ToggleLeft, ToggleRight,
  Boxes, MapPin, Sparkles, CheckCircle2, Shield, Calendar,
} from 'lucide-react';
import { Input } from '@core/ui/Input';
import { formatPKRFull } from '@core/lib/format';
import type {
  OpticalWizardBasic, OpticalWizardVariant, OpticalWizardStock, OpticalWizardWarranty,
} from '../../hooks/useOpticalWizard';

interface Props {
  basic: OpticalWizardBasic;
  hasVariants: boolean;
  onToggleVariants: (v: boolean) => void;
  variants: OpticalWizardVariant[];
  stock: OpticalWizardStock;
  warranty: OpticalWizardWarranty;
  onAddVariant: (v: Omit<OpticalWizardVariant, 'tempId' | 'sortOrder' | 'isActive'>) => void;
  onUpdateVariant: (tempId: string, patch: Partial<OpticalWizardVariant>) => void;
  onRemoveVariant: (tempId: string) => void;
  onUpdateStock: (patch: Partial<OpticalWizardStock>) => void;
  onUpdateWarranty: (patch: Partial<OpticalWizardWarranty>) => void;
  errors: string[];
}

const QUICK_STOCK = [1, 3, 5, 10, 20, 50];

const VARIANT_PRESETS = [
  { group: 'Color', items: ['Black', 'Tortoise', 'Brown', 'Gold', 'Silver', 'Rose Gold', 'Gunmetal', 'Havana'] },
  { group: 'Size', items: ['Small (48-50mm)', 'Medium (52-54mm)', 'Large (56-58mm)'] },
  { group: 'Lens Color (Sunglasses)', items: ['G-15', 'Grey', 'Brown', 'Blue Mirror', 'Silver Mirror', 'Gradient'] },
  { group: 'Contact Lens Power', items: ['-1.00', '-1.50', '-2.00', '-2.50', '-3.00', '-3.50', '-4.00', '+1.00', '+2.00'] },
];

const WARRANTY_PRESETS = [
  { label: '6 months', months: 6 },
  { label: '1 year', months: 12 },
  { label: '2 years', months: 24 },
];

const WARRANTY_TYPES = ['Manufacturer', 'Shop', 'Limited', 'International', 'None'];

export function OpticalWizardStep4Stock({
  basic, hasVariants, onToggleVariants, variants, stock, warranty,
  onAddVariant, onUpdateVariant, onRemoveVariant,
  onUpdateStock, onUpdateWarranty, errors,
}: Props) {
  const [vName, setVName] = useState('');
  const sale = Number(basic.retailPrice || 0);

  const addVariant = (name: string) => {
    const n = name.trim();
    if (!n) return;
    if (variants.some((v) => v.name.toLowerCase() === n.toLowerCase())) return;
    onAddVariant({ name: n, stock: 0, lowStockAlert: 3 });
    setVName('');
  };

  const totalVariantStock = variants.reduce((a, v) => a + Number(v.stock || 0), 0);
  const displayStock = hasVariants ? totalVariantStock : Number(stock.currentStock || 0);
  const stockValue = displayStock * sale;

  return (
    <div className="space-y-5">
      {errors.length > 0 && (
        <div className="rounded-2xl bg-rose-50 border-2 border-rose-300 p-4 flex items-start gap-2.5">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-sm text-rose-900">
            <div className="font-extrabold mb-1">Fix before saving:</div>
            <ul className="list-disc pl-4 space-y-0.5 font-semibold">
              {errors.slice(0, 6).map((e, i) => <li key={i}>{e}</li>)}
              {errors.length > 6 && <li>...and {errors.length - 6} more</li>}
            </ul>
          </div>
        </div>
      )}

      {/* Warranty */}
      <section className="rounded-2xl border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-white p-5 space-y-4">
        <SectionHead icon={Shield} title="Warranty" desc="How long is this covered?" tone="blue" />

        <div>
          <Lbl>Warranty Period</Lbl>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {WARRANTY_PRESETS.map((p) => {
              const a = warranty.warrantyMonths === p.months;
              return (
                <button key={p.months} type="button" onClick={() => onUpdateWarranty({ warrantyMonths: p.months })}
                  className={['px-3 py-2 rounded-xl border-2 text-xs font-extrabold transition',
                    a ? 'border-blue-600 bg-blue-600 text-white shadow-md' : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300'].join(' ')}>
                  {p.label}
                </button>
              );
            })}
          </div>
          <input type="number" min="0" value={warranty.warrantyMonths}
            onChange={(e) => onUpdateWarranty({ warrantyMonths: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="Custom months"
            className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-blue-500" />
        </div>

        <div>
          <Lbl>Warranty Type</Lbl>
          <select value={warranty.warrantyType} onChange={(e) => onUpdateWarranty({ warrantyType: e.target.value })}
            className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-blue-500">
            {WARRANTY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </section>

      {/* Stock toggle */}
      <div className="rounded-2xl bg-gradient-to-br from-cyan-50 to-white border-2 border-cyan-200 p-4 flex items-start gap-3">
        <div className="h-11 w-11 rounded-xl bg-cyan-600 text-white flex items-center justify-center shadow-md shrink-0">
          <Package className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h3 className="font-extrabold text-cyan-900">Stock entry — two ways</h3>
          <p className="text-xs text-cyan-800 font-semibold mt-0.5 leading-relaxed">
            <strong>Simple:</strong> single quantity (e.g. one specific frame color).
            <strong> Variants:</strong> multiple colors, sizes or CL powers each with its own stock.
          </p>
        </div>
      </div>

      <button type="button" onClick={() => onToggleVariants(!hasVariants)}
        className={['w-full rounded-2xl border-2 p-4 text-left transition',
          hasVariants ? 'border-fuchsia-500 bg-fuchsia-50 shadow-md' : 'border-slate-200 bg-white hover:border-fuchsia-300'].join(' ')}>
        <div className="flex items-center gap-3">
          <div className={['h-12 w-12 rounded-xl flex items-center justify-center shrink-0',
            hasVariants ? 'bg-fuchsia-500 text-white' : 'bg-fuchsia-100 text-fuchsia-700'].join(' ')}>
            <Boxes className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <div className="font-extrabold text-slate-900">Color / Size / Power Variants</div>
            <div className="text-xs text-slate-600 font-semibold">Multiple colors, sizes, or contact lens powers</div>
          </div>
          {hasVariants ? <ToggleRight className="h-7 w-7 text-fuchsia-600" /> : <ToggleLeft className="h-7 w-7 text-slate-400" />}
        </div>
      </button>

      {/* SIMPLE STOCK */}
      {!hasVariants && (
        <section className="rounded-2xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-white p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-emerald-900 text-base">Simple Stock</h3>
              <p className="text-xs text-emerald-700 font-semibold">One quantity is enough</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
              How many units in stock?
            </label>
            <input type="number" step="1" inputMode="decimal" value={stock.currentStock}
              onChange={(e) => onUpdateStock({ currentStock: Number(e.target.value || 0) })}
              className="h-16 w-full rounded-2xl border-2 border-emerald-400 bg-white px-4 text-center text-3xl font-extrabold tabular-nums text-emerald-900 focus:outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-200" />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {QUICK_STOCK.map((q) => (
                <button key={q} type="button" onClick={() => onUpdateStock({ currentStock: Number(stock.currentStock || 0) + q })}
                  className="px-3 py-1.5 rounded-xl bg-white border-2 border-emerald-200 hover:border-emerald-400 text-emerald-800 text-xs font-extrabold">
                  +{q}
                </button>
              ))}
              <button type="button" onClick={() => onUpdateStock({ currentStock: 0 })}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-extrabold">Reset</button>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">Low stock alert</label>
              <input type="number" step="1" value={stock.lowStockAlert}
                onChange={(e) => onUpdateStock({ lowStockAlert: Number(e.target.value || 0) })}
                className="h-12 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-amber-500" />
            </div>
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
                Display / Shelf <span className="text-slate-400 normal-case font-bold">(optional)</span>
              </label>
              <div className="relative">
                <MapPin className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input value={stock.rackNumber} onChange={(e) => onUpdateStock({ rackNumber: e.target.value })}
                  placeholder="Display-A, Rack-3"
                  className="h-12 w-full rounded-xl border-2 border-slate-200 pl-10 pr-3 text-sm font-bold focus:outline-none focus:border-cyan-500" />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* VARIANTS */}
      {hasVariants && (
        <section className="rounded-2xl border-2 border-fuchsia-300 bg-gradient-to-br from-fuchsia-50 to-white p-5 space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="h-11 w-11 rounded-xl bg-fuchsia-600 text-white flex items-center justify-center shadow-md shrink-0">
              <Boxes className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-extrabold text-fuchsia-900 text-base">Variants</h3>
              <p className="text-xs text-fuchsia-700 font-semibold">Each variant keeps its own stock and can override price</p>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-fuchsia-100 text-fuchsia-800 text-[10px] font-extrabold">
              {variants.length} variants • {totalVariantStock} units
            </span>
          </div>

          <div className="rounded-xl bg-white border-2 border-fuchsia-200 p-3 space-y-2">
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-fuchsia-700 flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-amber-500" /> Presets — click to add
            </div>
            {VARIANT_PRESETS.map((grp) => (
              <div key={grp.group} className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-extrabold uppercase text-slate-500 min-w-[80px]">{grp.group}:</span>
                {grp.items.map((it) => {
                  const ex = variants.some((v) => v.name.toLowerCase() === it.toLowerCase());
                  return (
                    <button key={it} type="button" disabled={ex} onClick={() => addVariant(it)}
                      className={['px-2.5 py-1 rounded-lg border-2 text-[11px] font-extrabold transition disabled:cursor-not-allowed',
                        ex ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-700 hover:border-fuchsia-400'].join(' ')}>
                      {ex ? '✓ ' : '+ '}{it}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="grid sm:grid-cols-[1fr_auto] gap-2 items-end">
            <Input label="Custom variant name" value={vName}
              onChange={(e) => setVName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addVariant(vName)}
              placeholder="e.g. Matte Black 52mm" />
            <button type="button" onClick={() => addVariant(vName)} disabled={!vName.trim()}
              className="h-11 px-5 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-extrabold text-sm inline-flex items-center gap-1 disabled:opacity-50 shadow-md">
              <Plus className="h-4 w-4" /> Add
            </button>
          </div>

          {variants.length > 0 ? (
            <div className="space-y-2">
              {variants.map((v) => (
                <div key={v.tempId} className="rounded-xl border-2 border-slate-200 bg-white p-3 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-fuchsia-100 text-fuchsia-700 flex items-center justify-center shrink-0">
                      <Boxes className="h-5 w-5" />
                    </div>
                    <input value={v.name} onChange={(e) => onUpdateVariant(v.tempId, { name: e.target.value })}
                      className="flex-1 min-w-0 text-sm font-extrabold text-slate-900 bg-transparent focus:outline-none focus:bg-slate-50 rounded px-1" />
                    <button type="button" onClick={() => onRemoveVariant(v.tempId)}
                      className="h-9 w-9 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-600 uppercase mb-1">Stock</label>
                      <input type="number" step="1" value={v.stock}
                        onChange={(e) => onUpdateVariant(v.tempId, { stock: Number(e.target.value || 0) })}
                        className="h-10 w-full rounded-lg border-2 border-slate-200 px-2 text-sm font-extrabold tabular-nums focus:outline-none focus:border-cyan-500" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-extrabold text-emerald-700 uppercase mb-1">Price override</label>
                      <input type="number" step="0.01" value={v.priceOverride ?? ''}
                        onChange={(e) => onUpdateVariant(v.tempId, { priceOverride: e.target.value === '' ? undefined : Number(e.target.value) })}
                        placeholder={String(sale)}
                        className="h-10 w-full rounded-lg border-2 border-emerald-200 px-2 text-sm font-bold tabular-nums focus:outline-none focus:border-emerald-500" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-600 uppercase mb-1">SKU</label>
                      <input value={v.sku ?? ''} onChange={(e) => onUpdateVariant(v.tempId, { sku: e.target.value })}
                        placeholder="Optional"
                        className="h-10 w-full rounded-lg border-2 border-slate-200 px-2 text-xs font-mono font-bold focus:outline-none focus:border-cyan-500" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-600 uppercase mb-1">Barcode</label>
                      <input value={v.barcode ?? ''} onChange={(e) => onUpdateVariant(v.tempId, { barcode: e.target.value })}
                        placeholder="Optional"
                        className="h-10 w-full rounded-lg border-2 border-slate-200 px-2 text-xs font-mono font-bold focus:outline-none focus:border-cyan-500" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border-2 border-dashed border-fuchsia-300 bg-white p-6 text-center">
              <Boxes className="h-10 w-10 text-fuchsia-400 mx-auto mb-2" />
              <div className="text-sm font-extrabold text-slate-700">No variants yet</div>
              <div className="text-xs text-slate-500 font-semibold mt-1">Click a preset above to add one</div>
            </div>
          )}
        </section>
      )}

      {displayStock > 0 && sale > 0 && (
        <section className="rounded-2xl bg-gradient-to-br from-slate-950 to-cyan-900 text-white p-5 shadow-xl">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="h-4 w-4 text-emerald-300" />
            <span className="text-[10px] uppercase font-extrabold tracking-wider text-emerald-300">Stock preview</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[10px] uppercase font-extrabold text-white/60">Total stock</div>
              <div className="text-3xl font-extrabold tabular-nums leading-none mt-1">
                {displayStock} <span className="text-sm text-white/60">units</span>
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-extrabold text-white/60">Retail value</div>
              <div className="text-3xl font-extrabold tabular-nums text-emerald-300 leading-none mt-1">
                {formatPKRFull(stockValue)}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function SectionHead({ icon: Icon, title, desc, tone }: any) {
  const tones: Record<string, string> = { blue: 'from-blue-500 to-cyan-700' };
  return (
    <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
      <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-md`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h3 className="font-extrabold text-slate-900">{title}</h3>
        <p className="text-xs text-slate-500 font-semibold">{desc}</p>
      </div>
    </div>
  );
}
function Lbl({ children }: any) {
  return <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">{children}</label>;
}
