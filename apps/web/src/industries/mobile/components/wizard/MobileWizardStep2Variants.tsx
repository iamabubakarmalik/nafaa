import { useMemo, useState } from 'react';
import {
  Palette, Plus, X, AlertCircle, Sparkles, Info, ToggleLeft, ToggleRight,
  HardDrive, Wand2, ArrowRight, Ruler,
} from 'lucide-react';
import { Input } from '@core/ui/Input';
import { QuickColorChip } from './QuickColorChip';
import { StorageChip } from './StorageChip';
import { VariantEditPanel } from './VariantEditPanel';
import type {
  MobileWizardBasic, MobileWizardVariant,
} from '../../hooks/useMobileWizard';

interface Props {
  basic: MobileWizardBasic;
  hasVariants: boolean;
  onToggleVariants: (v: boolean) => void;
  variants: MobileWizardVariant[];
  onAddVariant: (v: Omit<MobileWizardVariant, 'tempId' | 'sortOrder' | 'isActive'>) => void;
  onAddVariantsMatrix: (colors: Array<{ name: string; hex: string }>, storages: string[]) => void;
  onUpdateVariant: (tempId: string, patch: Partial<MobileWizardVariant>) => void;
  onRemoveVariant: (tempId: string) => void;
  errors: string[];
}

const PRESET_COLORS = [
  { name: 'Black', hex: '#111827' },
  { name: 'Titanium Black', hex: '#1F1F1F' },
  { name: 'Space Gray', hex: '#4A4A4A' },
  { name: 'Graphite', hex: '#3A3A3A' },
  { name: 'White', hex: '#F8F8F8' },
  { name: 'Silver', hex: '#D1D5DB' },
  { name: 'Titanium White', hex: '#E5E5E5' },
  { name: 'Gold', hex: '#D4AF37' },
  { name: 'Rose Gold', hex: '#B76E79' },
  { name: 'Titanium Natural', hex: '#B8A99A' },
  { name: 'Blue', hex: '#2563EB' },
  { name: 'Sierra Blue', hex: '#6E9CBB' },
  { name: 'Titanium Blue', hex: '#3E5C76' },
  { name: 'Deep Purple', hex: '#5A4E7C' },
  { name: 'Purple', hex: '#8B5CF6' },
  { name: 'Lavender', hex: '#B7A9D9' },
  { name: 'Pink', hex: '#EC4899' },
  { name: 'Rose', hex: '#F472B6' },
  { name: 'Red', hex: '#DC2626' },
  { name: 'Product Red', hex: '#EF4444' },
  { name: 'Green', hex: '#059669' },
  { name: 'Alpine Green', hex: '#4A7C59' },
  { name: 'Mint', hex: '#86EFAC' },
  { name: 'Yellow', hex: '#EAB308' },
  { name: 'Cream', hex: '#F5F5DC' },
  { name: 'Orange', hex: '#F97316' },
];

const PRESET_STORAGES = ['64GB', '128GB', '256GB', '512GB', '1TB'];
/** Accessories ke liye size presets */
const PRESET_SIZES = ['S', 'M', 'L', 'XL', '1m', '2m'];

export function MobileWizardStep2Variants({
  basic, hasVariants, onToggleVariants, variants,
  onAddVariant, onAddVariantsMatrix, onUpdateVariant, onRemoveVariant, errors,
}: Props) {
  const [customName, setCustomName] = useState('');
  const [customHex, setCustomHex] = useState('#2563eb');
  const [customStorage, setCustomStorage] = useState('');

  const [matrixColors, setMatrixColors] = useState<Array<{ name: string; hex: string }>>([]);
  const [matrixStorages, setMatrixStorages] = useState<string[]>([]);

  const isPhone = basic.productType === 'PHONE' || basic.productType === 'MIXED';
  const isAccessory = basic.productType === 'ACCESSORY';
  /** Phone = storage (GB), Accessory = size (S/M/L, 1m/2m) */
  const secondDimPresets = isPhone ? PRESET_STORAGES : PRESET_SIZES;
  const secondDimLabel = isPhone ? 'Storage' : 'Size';
  const SecondDimIcon = isPhone ? HardDrive : Ruler;

  const toggleMatrixColor = (c: { name: string; hex: string }) => {
    setMatrixColors((prev) =>
      prev.some((x) => x.name === c.name) ? prev.filter((x) => x.name !== c.name) : [...prev, c],
    );
  };
  const toggleMatrixStorage = (s: string) => {
    setMatrixStorages((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  };

  const generateMatrix = () => {
    if (matrixColors.length === 0) return;
    const storages = matrixStorages.length > 0 ? matrixStorages : [''];
    onAddVariantsMatrix(matrixColors, storages);
    setMatrixColors([]);
    setMatrixStorages([]);
  };

  const matrixCount = useMemo(() => {
    if (matrixColors.length === 0) return 0;
    return matrixColors.length * Math.max(matrixStorages.length, 1);
  }, [matrixColors, matrixStorages]);

  const addCustom = () => {
    const name = customName.trim();
    if (!name) return;
    onAddVariant({
      name: customStorage.trim() ? `${name} ${customStorage.trim()}` : name,
      color: name,
      colorHex: customHex,
      storage: customStorage.trim() || undefined,
    });
    setCustomName('');
    setCustomStorage('');
  };

  return (
    <div className="space-y-5">
      {errors.length > 0 && (
        <div className="rounded-2xl bg-rose-50 dark:bg-rose-500/10 border-2 border-rose-200 dark:border-rose-500/40 p-3 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="text-xs text-rose-900 dark:text-rose-200">
            <div className="font-extrabold mb-0.5">Next se pehle fix karein:</div>
            <ul className="list-disc pl-4 space-y-0.5">
              {errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        </div>
      )}

      {/* Has-variants toggle */}
      <section className="rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
        <div className="flex items-start gap-3 flex-wrap">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-700 text-white flex items-center justify-center shadow-md shrink-0">
            <Palette className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-extrabold text-slate-900 dark:text-white text-lg leading-tight">
              {isAccessory ? 'Colors & Sizes' : 'Colors & Storage'}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 font-semibold mt-0.5">
              {isAccessory
                ? 'Multiple colors ya sizes? (jaise Black/White cover)'
                : 'Kya is phone ke multiple colors ya storage options hain?'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onToggleVariants(!hasVariants)}
            className={[
              'inline-flex items-center gap-2 px-4 py-2 rounded-xl font-extrabold text-sm transition shrink-0 active:scale-95',
              hasVariants
                ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-500/30'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700',
            ].join(' ')}
          >
            {hasVariants ? (<><ToggleRight className="h-5 w-5" /> Yes, multiple</>)
                        : (<><ToggleLeft className="h-5 w-5" /> No, single</>)}
          </button>
        </div>

        {!hasVariants && (
          <div className="mt-4 rounded-xl bg-blue-50 dark:bg-blue-500/10 border-2 border-blue-200 dark:border-blue-500/40 p-3 flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-700 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-900 dark:text-blue-200">
              <div className="font-extrabold mb-0.5">Single variant mode</div>
              <div className="font-semibold">
                Seedha Step 3 pe {isAccessory ? 'stock qty' : 'IMEIs'} add karein — koi variants create nahi honge.
                {isAccessory && ' Simple accessory ke liye ye best hai — kam clicks!'}
              </div>
            </div>
          </div>
        )}
      </section>

      {hasVariants && (
        <>
          {/* MATRIX BUILDER */}
          <section className="rounded-2xl border-2 border-indigo-200 dark:border-indigo-500/40 bg-gradient-to-br from-indigo-50 via-white to-blue-50 dark:from-indigo-500/10 dark:via-slate-900 dark:to-slate-900 p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-700 text-white flex items-center justify-center shadow-md">
                <Wand2 className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-slate-900 dark:text-white text-base">Matrix Builder</h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold">
                  Colors × {secondDimLabel} — sab combinations one click mein
                </p>
              </div>
            </div>

            {/* Colors */}
            <div>
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1">
                <Palette className="h-3 w-3" /> Pick Colors ({matrixColors.length})
              </div>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_COLORS.map((c) => {
                  const active = matrixColors.some((x) => x.name === c.name);
                  return (
                    <QuickColorChip
                      key={c.name}
                      name={c.name}
                      hex={c.hex}
                      active={active}
                      onClick={() => toggleMatrixColor(c)}
                      size="sm"
                    />
                  );
                })}
              </div>
            </div>

            {/* Storage (phone) / Size (accessory) */}
            <div>
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1">
                <SecondDimIcon className="h-3 w-3" /> Pick {secondDimLabel} ({matrixStorages.length}) — optional
              </div>
              <div className="flex flex-wrap gap-1.5">
                {secondDimPresets.map((s) => (
                  <StorageChip
                    key={s}
                    label={s}
                    active={matrixStorages.includes(s)}
                    onClick={() => toggleMatrixStorage(s)}
                  />
                ))}
              </div>
            </div>

            {/* Generate */}
            <div className="pt-2 border-t-2 border-indigo-100 dark:border-indigo-500/20 flex items-center justify-between gap-3 flex-wrap">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-200">
                {matrixCount > 0 ? (
                  <span>
                    Will create <strong className="text-indigo-700 dark:text-indigo-300">{matrixCount}</strong> variant{matrixCount !== 1 ? 's' : ''}
                    {matrixColors.length > 1 && matrixStorages.length > 0 && (
                      <span className="text-slate-500 dark:text-slate-400 ml-1">
                        ({matrixColors.length} × {matrixStorages.length})
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="text-slate-500 dark:text-slate-400">Colors pick karo — variants auto-banenge</span>
                )}
              </div>
              <button
                type="button"
                onClick={generateMatrix}
                disabled={matrixColors.length === 0}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800 text-white font-extrabold text-sm disabled:opacity-40 shadow-md transition active:scale-95"
              >
                Generate {matrixCount > 0 ? matrixCount : ''} variants
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </section>

          {/* Custom single variant */}
          <section className="rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 space-y-3">
            <div>
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                <Plus className="h-3 w-3" /> Add One at a Time
              </div>
              <h4 className="font-extrabold text-slate-900 dark:text-white text-sm mt-0.5">
                Custom color + {secondDimLabel.toLowerCase()}, individually
              </h4>
            </div>

            <div className="grid sm:grid-cols-[1fr_150px_auto_auto] gap-2 items-end">
              <Input
                label="Color Name"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCustom()}
                placeholder="e.g. Midnight Blue"
              />
              <Input
                label={`${secondDimLabel} (optional)`}
                value={customStorage}
                onChange={(e) => setCustomStorage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCustom()}
                placeholder={isPhone ? '256GB' : 'XL'}
              />
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Color</label>
                <input
                  type="color"
                  value={customHex}
                  onChange={(e) => setCustomHex(e.target.value)}
                  className="h-11 w-14 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-pointer"
                />
              </div>
              <button
                type="button"
                onClick={addCustom}
                disabled={!customName.trim()}
                className="h-11 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm inline-flex items-center gap-1 disabled:opacity-50 shadow-md transition active:scale-95"
              >
                <Plus className="h-4 w-4" /> Add
              </button>
            </div>
          </section>

          {/* Selected variants */}
          {variants.length > 0 ? (
            <section className="rounded-2xl border-2 border-blue-200 dark:border-blue-500/40 bg-white dark:bg-slate-900 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-wider font-extrabold text-blue-700 dark:text-blue-400">
                    Selected Variants
                  </div>
                  <h4 className="font-extrabold text-slate-900 dark:text-white text-sm mt-0.5">
                    {variants.length} variant{variants.length !== 1 ? 's' : ''} to create
                  </h4>
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold text-right">
                  Click each to<br/>edit price, SKU, image
                </div>
              </div>

              <div className="space-y-2">
                {variants.map((v) => (
                  <div key={v.tempId}>
                    <div className="rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500/60 bg-white dark:bg-slate-800 p-3 flex items-center gap-3 transition">
                      <div
                        className="h-11 w-11 rounded-lg border-2 border-slate-200 dark:border-slate-600 shrink-0 shadow-inner"
                        style={{ backgroundColor: v.colorHex }}
                      />
                      <div className="flex-1 min-w-0">
                        <input
                          value={v.name}
                          onChange={(e) => onUpdateVariant(v.tempId, { name: e.target.value })}
                          className="w-full text-sm font-extrabold text-slate-900 dark:text-white bg-transparent focus:outline-none focus:bg-slate-50 dark:focus:bg-slate-700/60 rounded px-1"
                        />
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold px-1 mt-0.5 flex items-center gap-2 flex-wrap">
                          {v.storage && (
                            <span className="inline-flex items-center gap-0.5 text-indigo-700 dark:text-indigo-300">
                              <SecondDimIcon className="h-2 w-2" /> {v.storage}
                            </span>
                          )}
                          {v.ram && <span>RAM: {v.ram}</span>}
                          {v.sku && <span className="font-mono">SKU: {v.sku}</span>}
                          <span className="text-slate-400 dark:text-slate-500">{v.colorHex}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemoveVariant(v.tempId)}
                        className="h-8 w-8 rounded-lg bg-rose-50 dark:bg-rose-500/15 hover:bg-rose-100 dark:hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 transition"
                        title="Remove"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
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
            <section className="rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 p-8 text-center">
              <Palette className="h-10 w-10 text-slate-400 dark:text-slate-500 mx-auto mb-2" />
              <div className="font-extrabold text-slate-700 dark:text-slate-200 text-sm">Abhi koi variant nahi</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1">
                Matrix builder use karein ya custom color add karein
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
