import { useState } from 'react';
import {
  Palette, Plus, X, AlertCircle, Sparkles, Info, ToggleLeft, ToggleRight,
  Layers, Package, Ruler,
} from 'lucide-react';
import { Input } from '@core/ui/Input';
import { QuickColorChip } from './QuickColorChip';
import { VariantEditPanel } from './VariantEditPanel';
import type { CarpetWizardBasic, CarpetWizardVariant } from '../../hooks/useCarpetWizard';

interface Props {
  basic: CarpetWizardBasic;
  hasVariants: boolean;
  onToggleVariants: (v: boolean) => void;
  variants: CarpetWizardVariant[];
  onAddVariant: (v: Omit<CarpetWizardVariant, 'tempId' | 'sortOrder' | 'isActive'>) => void;
  onUpdateVariant: (tempId: string, patch: Partial<CarpetWizardVariant>) => void;
  onRemoveVariant: (tempId: string) => void;
  errors: string[];
}

const PRESET_COLORS = [
  { name: 'Cream', hex: '#F5F5DC' },
  { name: 'Beige', hex: '#D4B896' },
  { name: 'Ivory', hex: '#FFFFF0' },
  { name: 'Camel', hex: '#C19A6B' },
  { name: 'Caramel', hex: '#AF6E4D' },
  { name: 'Brown', hex: '#8B4513' },
  { name: 'Chocolate', hex: '#5C3317' },
  { name: 'Red', hex: '#DC2626' },
  { name: 'Maroon', hex: '#800000' },
  { name: 'Rust', hex: '#B7410E' },
  { name: 'Orange', hex: '#F97316' },
  { name: 'Golden', hex: '#DAA520' },
  { name: 'Yellow', hex: '#EAB308' },
  { name: 'Blue', hex: '#2563EB' },
  { name: 'Navy', hex: '#1E3A8A' },
  { name: 'Sky', hex: '#38BDF8' },
  { name: 'Teal', hex: '#0D9488' },
  { name: 'Green', hex: '#16A34A' },
  { name: 'Olive', hex: '#708238' },
  { name: 'Emerald', hex: '#059669' },
  { name: 'Grey', hex: '#6B7280' },
  { name: 'Charcoal', hex: '#374151' },
  { name: 'Black', hex: '#111827' },
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Pink', hex: '#EC4899' },
  { name: 'Purple', hex: '#8B5CF6' },
];

const DESIGN_TEMPLATES = [
  { pattern: 'Persian Design', codes: ['17R', '18R', '19R', 'PER-01'] },
  { pattern: 'Modern', codes: ['MOD-01', 'MOD-02', 'MOD-03'] },
  { pattern: 'Floral', codes: ['SF-01', 'FLR-17', 'FLR-25'] },
  { pattern: 'Geometric', codes: ['GEO-01', 'GEO-02'] },
];

export function CarpetWizardStep2Variants({
  basic, hasVariants, onToggleVariants, variants,
  onAddVariant, onUpdateVariant, onRemoveVariant, errors,
}: Props) {
  const [customName, setCustomName] = useState('');
  const [customHex, setCustomHex] = useState('#059669');
  const [customDesignCode, setCustomDesignCode] = useState('');

  const addCustom = () => {
    const name = customName.trim();
    if (!name) return;
    onAddVariant({
      name,
      color: name,
      colorHex: customHex,
      designCode: customDesignCode.trim() || undefined,
    });
    setCustomName('');
    setCustomDesignCode('');
  };

  return (
    <div className="space-y-5">
      {errors.length > 0 && (
        <div className="rounded-2xl bg-rose-50 border-2 border-rose-300 p-4 flex items-start gap-2.5">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-sm text-rose-900">
            <div className="font-extrabold mb-1">Fix before Next:</div>
            <ul className="list-disc pl-4 space-y-0.5 font-semibold">
              {errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        </div>
      )}

      {/* ═══ Has variants toggle ═══ */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5">
        <div className="flex items-start gap-3 flex-wrap">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 text-white flex items-center justify-center shadow-md shrink-0">
            <Palette className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-extrabold text-slate-900 text-lg leading-tight">Colors / Designs</h3>
            <p className="text-sm text-slate-600 font-semibold mt-0.5">
              Kya is carpet ke different colors ya designs hain?
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-2 mt-4">
          <button
            type="button"
            onClick={() => onToggleVariants(false)}
            className={[
              'p-4 rounded-2xl border-2 text-left transition',
              !hasVariants ? 'border-slate-900 bg-slate-900 text-white shadow-lg' : 'border-slate-200 bg-white hover:border-slate-400',
            ].join(' ')}
          >
            <div className="flex items-center gap-2">
              <ToggleLeft className="h-5 w-5" />
              <span className="font-extrabold text-sm">Nahi — single color</span>
            </div>
            <div className={['text-[11px] font-bold mt-1', !hasVariants ? 'text-white/70' : 'text-slate-500'].join(' ')}>
              Ek hi color/design. Seedha Step 3 pe stock add karo.
            </div>
          </button>
          <button
            type="button"
            onClick={() => onToggleVariants(true)}
            className={[
              'p-4 rounded-2xl border-2 text-left transition',
              hasVariants ? 'border-emerald-600 bg-emerald-600 text-white shadow-lg' : 'border-slate-200 bg-white hover:border-emerald-400',
            ].join(' ')}
          >
            <div className="flex items-center gap-2">
              <ToggleRight className="h-5 w-5" />
              <span className="font-extrabold text-sm">Haan — multiple colors</span>
            </div>
            <div className={['text-[11px] font-bold mt-1', hasVariants ? 'text-white/70' : 'text-slate-500'].join(' ')}>
              Har color/design ka apna stock, price, image.
            </div>
          </button>
        </div>

        {!hasVariants && (
          <div className="mt-3 rounded-xl bg-blue-50 border-2 border-blue-200 p-3 flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-700 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-900 font-semibold">
              Ye product ek hi variant me bikega. Baad me variants add ho sakte hain.
            </div>
          </div>
        )}
      </section>

      {hasVariants && (
        <>
          {/* ═══ Preset chips ═══ */}
          <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-amber-500" /> Ek Click Se Add
                </div>
                <h4 className="font-extrabold text-slate-900 text-sm mt-0.5">Common carpet colors</h4>
              </div>
              <div className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">
                {variants.length} added
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {PRESET_COLORS.map((c) => {
                const active = variants.some((v) => v.name.toLowerCase() === c.name.toLowerCase());
                return (
                  <QuickColorChip
                    key={c.name}
                    name={c.name}
                    hex={c.hex}
                    active={active}
                    onClick={() => {
                      if (active) {
                        const existing = variants.find((v) => v.name.toLowerCase() === c.name.toLowerCase());
                        if (existing) onRemoveVariant(existing.tempId);
                      } else {
                        onAddVariant({ name: c.name, color: c.name, colorHex: c.hex });
                      }
                    }}
                  />
                );
              })}
            </div>
          </section>

          {/* ═══ Custom color ═══ */}
          <section className="rounded-2xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 to-white p-5 space-y-3">
            <div>
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-violet-700 flex items-center gap-1">
                <Plus className="h-3 w-3" /> Custom Color / Design
              </div>
              <h4 className="font-extrabold text-slate-900 text-sm mt-0.5">Apni marzi ka color, design code ke saath</h4>
            </div>

            <div className="grid sm:grid-cols-[1fr_1fr_auto_auto] gap-2 items-end">
              <Input
                label="Color / Design Name"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCustom()}
                placeholder="e.g. Two-Tone Beige"
              />
              <Input
                label="Design Code (optional)"
                value={customDesignCode}
                onChange={(e) => setCustomDesignCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCustom()}
                placeholder="SF-C1, 17R-CR"
              />
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Color</label>
                <input
                  type="color"
                  value={customHex}
                  onChange={(e) => setCustomHex(e.target.value)}
                  className="h-11 w-14 rounded-xl border-2 border-slate-200 cursor-pointer"
                />
              </div>
              <button
                type="button"
                onClick={addCustom}
                disabled={!customName.trim()}
                className="h-11 px-5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-700 text-white font-extrabold text-sm inline-flex items-center gap-1 disabled:opacity-50 shadow-md active:scale-95 transition"
              >
                <Plus className="h-4 w-4" /> Add
              </button>
            </div>

            {/* Design templates */}
            <div className="border-t border-violet-200 pt-3">
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-violet-700 mb-1.5 flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Design Code Templates
              </div>
              <div className="flex flex-wrap gap-1.5">
                {DESIGN_TEMPLATES.map((tpl) => (
                  <div key={tpl.pattern} className="inline-flex items-center gap-1">
                    <span className="text-[10px] font-extrabold text-slate-600">{tpl.pattern}:</span>
                    {tpl.codes.map((code) => (
                      <button
                        key={code}
                        type="button"
                        onClick={() => setCustomDesignCode(code)}
                        className="px-2 py-0.5 rounded-md bg-white border border-violet-200 hover:bg-violet-50 text-[10px] font-mono font-extrabold text-violet-800"
                      >
                        {code}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ═══ Selected variants ═══ */}
          {variants.length > 0 ? (
            <section className="rounded-2xl border-2 border-emerald-200 bg-white p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-700">
                    Selected Colors
                  </div>
                  <h4 className="font-extrabold text-slate-900 text-sm mt-0.5">
                    {variants.length} variant{variants.length !== 1 ? 's' : ''} to create
                  </h4>
                </div>
                <div className="text-[10px] text-slate-500 font-bold text-right">
                  Click each variant to<br />edit price, code, image
                </div>
              </div>

              <div className="space-y-2">
                {variants.map((v) => (
                  <div key={v.tempId} className="space-y-0">
                    {/* Row header */}
                    <div className="rounded-xl border-2 border-slate-200 hover:border-emerald-400 bg-white p-3 flex items-center gap-3 transition">
                      <div
                        className="h-11 w-11 rounded-lg border-2 border-slate-200 shrink-0 shadow-inner"
                        style={{ backgroundColor: v.colorHex }}
                      />
                      <div className="flex-1 min-w-0">
                        <input
                          value={v.name}
                          onChange={(e) => onUpdateVariant(v.tempId, { name: e.target.value })}
                          className="w-full text-sm font-extrabold text-slate-900 bg-transparent focus:outline-none focus:bg-slate-50 rounded px-1"
                        />
                        <div className="text-[10px] text-slate-500 font-bold px-1 mt-0.5 flex items-center gap-2 flex-wrap">
                          {v.designCode && (<span className="font-mono">{v.designCode}</span>)}
                          {v.sku && (<span className="font-mono">SKU: {v.sku}</span>)}
                          <span className="text-slate-400">{v.colorHex}</span>
                          {basic.stockType === 'MIXED' && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 text-[9px]">
                              {v.stockTypeOverride === 'PIECES' ? <Package className="h-2.5 w-2.5" />
                                : v.stockTypeOverride === 'FT' ? <Ruler className="h-2.5 w-2.5" />
                                : <Layers className="h-2.5 w-2.5" />}
                              {v.stockTypeOverride || 'ROLLS'}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemoveVariant(v.tempId)}
                        className="h-8 w-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 active:scale-95 transition"
                        title="Remove variant"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    {/* Edit panel */}
                    <VariantEditPanel
                      variant={v}
                      basic={basic}
                      onChange={(patch) => onUpdateVariant(v.tempId, patch)}
                    />
                  </div>
                ))}
              </div>
            </section>
          ) : (
            <section className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <Palette className="h-10 w-10 text-slate-400 mx-auto mb-2" />
              <div className="font-extrabold text-slate-700 text-sm">No colors added yet</div>
              <div className="text-xs text-slate-500 font-semibold mt-1">
                Preset chip click karein ya custom color add karein
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
