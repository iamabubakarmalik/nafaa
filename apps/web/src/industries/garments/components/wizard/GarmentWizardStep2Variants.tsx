import { useState } from 'react';
import {
  Palette, Plus, Trash2, AlertCircle, Sparkles, X, Grid3x3,
  Ruler, Package, Star, Barcode as BarcodeIcon, Hash, Zap,
  ToggleLeft, ToggleRight, Info,
} from 'lucide-react';
import { Input } from '@core/ui/Input';
import { formatPKR } from '@core/lib/format';
import type { GarmentWizardBasic, GarmentWizardVariant } from '../../hooks/useGarmentWizard';

interface Props {
  basic: GarmentWizardBasic;
  hasVariants: boolean;
  onToggleVariants: (v: boolean) => void;
  variants: GarmentWizardVariant[];
  onAddVariant: (v: Omit<GarmentWizardVariant, 'tempId'>) => void;
  onAddVariantsMatrix: (sizes: string[], colors: Array<{ name: string; hex: string; family?: string }>) => void;
  onUpdateVariant: (tempId: string, patch: Partial<GarmentWizardVariant>) => void;
  onRemoveVariant: (tempId: string) => void;
  errors: string[];
}

const SIZE_PRESETS = {
  clothing: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'],
  numeric: ['28', '30', '32', '34', '36', '38', '40', '42', '44', '46'],
  desiSuit: ['Small', 'Medium', 'Large', 'XL'],
  kids: ['0-3M', '3-6M', '6-12M', '1-2Y', '2-3Y', '3-4Y', '4-5Y', '5-6Y', '7-8Y', '9-10Y'],
  shoes: ['5', '6', '7', '8', '9', '10', '11', '12'],
  freeSize: ['Free Size'],
};

const COLOR_PRESETS: Array<{ name: string; hex: string; family: string }> = [
  { name: 'Black', hex: '#000000', family: 'Black' },
  { name: 'White', hex: '#FFFFFF', family: 'White' },
  { name: 'Off White', hex: '#F8F0E3', family: 'White' },
  { name: 'Ivory', hex: '#FFFFF0', family: 'White' },
  { name: 'Beige', hex: '#F5F5DC', family: 'Neutral' },
  { name: 'Grey', hex: '#808080', family: 'Grey' },
  { name: 'Charcoal', hex: '#36454F', family: 'Grey' },
  { name: 'Navy', hex: '#000080', family: 'Blue' },
  { name: 'Royal Blue', hex: '#4169E1', family: 'Blue' },
  { name: 'Sky Blue', hex: '#87CEEB', family: 'Blue' },
  { name: 'Teal', hex: '#008080', family: 'Blue' },
  { name: 'Red', hex: '#DC2626', family: 'Red' },
  { name: 'Maroon', hex: '#800000', family: 'Red' },
  { name: 'Pink', hex: '#FFC0CB', family: 'Pink' },
  { name: 'Hot Pink', hex: '#FF69B4', family: 'Pink' },
  { name: 'Fuchsia', hex: '#FF00FF', family: 'Pink' },
  { name: 'Purple', hex: '#800080', family: 'Purple' },
  { name: 'Lavender', hex: '#E6E6FA', family: 'Purple' },
  { name: 'Green', hex: '#22C55E', family: 'Green' },
  { name: 'Olive', hex: '#808000', family: 'Green' },
  { name: 'Mint', hex: '#98FF98', family: 'Green' },
  { name: 'Yellow', hex: '#FFEB3B', family: 'Yellow' },
  { name: 'Mustard', hex: '#FFDB58', family: 'Yellow' },
  { name: 'Orange', hex: '#FF9800', family: 'Orange' },
  { name: 'Peach', hex: '#FFDAB9', family: 'Orange' },
  { name: 'Brown', hex: '#795548', family: 'Brown' },
  { name: 'Coffee', hex: '#6F4E37', family: 'Brown' },
  { name: 'Gold', hex: '#FFD700', family: 'Metallic' },
  { name: 'Silver', hex: '#C0C0C0', family: 'Metallic' },
];

export function GarmentWizardStep2Variants({
  basic, hasVariants, onToggleVariants, variants,
  onAddVariant, onAddVariantsMatrix, onUpdateVariant, onRemoveVariant, errors,
}: Props) {
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<Array<{ name: string; hex: string; family: string }>>([]);
  const [customSize, setCustomSize] = useState('');
  const [customColorName, setCustomColorName] = useState('');
  const [customColorHex, setCustomColorHex] = useState('#000000');

  const toggleSize = (size: string) => {
    setSelectedSizes((prev) => prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]);
  };

  const toggleColor = (color: { name: string; hex: string; family: string }) => {
    setSelectedColors((prev) => {
      const exists = prev.find((c) => c.name === color.name);
      return exists ? prev.filter((c) => c.name !== color.name) : [...prev, color];
    });
  };

  const addCustomSize = () => {
    const s = customSize.trim();
    if (!s) return;
    if (!selectedSizes.includes(s)) setSelectedSizes([...selectedSizes, s]);
    setCustomSize('');
  };

  const addCustomColor = () => {
    const name = customColorName.trim();
    if (!name) return;
    if (!selectedColors.find((c) => c.name === name)) {
      setSelectedColors([...selectedColors, { name, hex: customColorHex, family: 'Custom' }]);
    }
    setCustomColorName('');
    setCustomColorHex('#000000');
  };

  const generateMatrix = () => {
    if (selectedSizes.length === 0 && selectedColors.length === 0) return;
    // If only sizes: create size-only variants
    if (selectedColors.length === 0) {
      selectedSizes.forEach((size) => {
        onAddVariant({
          size, colorName: '', colorHex: '', colorFamily: '',
          skuSuffix: size, barcode: '',
          stock: 0, lowStockAlert: 3, isFeaturedColor: false,
        });
      });
    } else if (selectedSizes.length === 0) {
      selectedColors.forEach((color) => {
        onAddVariant({
          size: '', colorName: color.name, colorHex: color.hex, colorFamily: color.family,
          skuSuffix: color.name.slice(0, 3).toUpperCase(), barcode: '',
          stock: 0, lowStockAlert: 3, isFeaturedColor: false,
        });
      });
    } else {
      onAddVariantsMatrix(selectedSizes, selectedColors);
    }
    setSelectedSizes([]);
    setSelectedColors([]);
  };

  const matrixSize = selectedSizes.length * Math.max(selectedColors.length, 1)
    + (selectedSizes.length === 0 ? selectedColors.length : 0);

  return (
    <div className="space-y-5">
      {errors.length > 0 && (
        <div className="rounded-2xl bg-rose-50 border-2 border-rose-200 p-3 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs text-rose-900">
            <div className="font-extrabold mb-0.5">Fix before Next:</div>
            <ul className="list-disc pl-4 space-y-0.5">
              {errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        </div>
      )}

      {/* Toggle */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5">
        <div className="flex items-start gap-3 flex-wrap">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-pink-500 to-fuchsia-700 text-white flex items-center justify-center shadow-md shrink-0">
            <Palette className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-extrabold text-slate-900 text-lg leading-tight">Variants (Size × Color)</h3>
            <p className="text-sm text-slate-600 font-semibold mt-0.5">
              Boutique products ka signature — same design, different sizes & colors
            </p>
          </div>
          <button type="button" onClick={() => onToggleVariants(!hasVariants)}
            className={[
              'inline-flex items-center gap-2 px-4 py-2 rounded-xl font-extrabold text-sm transition shrink-0',
              hasVariants ? 'bg-pink-100 text-pink-800 hover:bg-pink-200'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
            ].join(' ')}>
            {hasVariants ? (<><ToggleRight className="h-5 w-5" /> Yes, variants</>)
              : (<><ToggleLeft className="h-5 w-5" /> No, single product</>)}
          </button>
        </div>

        {!hasVariants && (
          <div className="mt-4 rounded-xl bg-blue-50 border-2 border-blue-200 p-3 flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-700 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-900">
              <div className="font-extrabold mb-0.5">Single product mode</div>
              <div className="font-semibold">
                Product ek stock ke saath store hoga. Step 3 mein simple stock enter karo.
              </div>
            </div>
          </div>
        )}
      </section>

      {hasVariants && (
        <>
          {/* Matrix builder */}
          <section className="rounded-2xl border-2 border-fuchsia-200 bg-gradient-to-br from-fuchsia-50 to-white p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-fuchsia-500 to-pink-700 text-white flex items-center justify-center shadow-md">
                  <Grid3x3 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-fuchsia-900 text-base">Variant Matrix Generator</h3>
                  <p className="text-xs text-fuchsia-700 font-semibold">Select sizes & colors → auto-generate all combinations</p>
                </div>
              </div>
              {matrixSize > 0 && (
                <div className="px-3 py-1.5 rounded-lg bg-fuchsia-600 text-white text-xs font-extrabold">
                  Will create: {matrixSize} variant{matrixSize > 1 ? 's' : ''}
                </div>
              )}
            </div>

            {/* Sizes */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                <Ruler className="h-4 w-4 text-fuchsia-600" />
                Sizes ({selectedSizes.length} selected)
              </label>

              {Object.entries(SIZE_PRESETS).map(([groupKey, sizes]) => (
                <div key={groupKey} className="mb-2">
                  <div className="text-[10px] uppercase font-extrabold text-slate-500 mb-1 capitalize">{groupKey.replace(/([A-Z])/g, ' $1')}</div>
                  <div className="flex flex-wrap gap-1">
                    {sizes.map((s) => {
                      const active = selectedSizes.includes(s);
                      return (
                        <button
                          key={s} type="button"
                          onClick={() => toggleSize(s)}
                          className={[
                            'px-2.5 py-1 rounded-lg text-xs font-extrabold border-2 transition',
                            active
                              ? 'border-fuchsia-600 bg-fuchsia-600 text-white shadow'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-fuchsia-400',
                          ].join(' ')}
                        >{s}</button>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div className="mt-2 flex gap-2">
                <input
                  value={customSize}
                  onChange={(e) => setCustomSize(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomSize())}
                  placeholder="Custom size (e.g. 46, 4XL)"
                  className="flex-1 h-9 rounded-lg border-2 border-slate-200 bg-white px-3 text-xs font-bold focus:outline-none focus:border-fuchsia-500"
                />
                <button type="button" onClick={addCustomSize}
                  disabled={!customSize.trim()}
                  className="h-9 px-3 rounded-lg bg-fuchsia-600 hover:bg-fuchsia-700 text-white text-xs font-extrabold inline-flex items-center gap-1 disabled:opacity-50">
                  <Plus className="h-3 w-3" /> Add
                </button>
              </div>
            </div>

            {/* Colors */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                <Palette className="h-4 w-4 text-pink-600" />
                Colors ({selectedColors.length} selected)
              </label>

              <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2">
                {COLOR_PRESETS.map((c) => {
                  const active = selectedColors.find((sc) => sc.name === c.name);
                  return (
                    <button
                      key={c.name} type="button"
                      onClick={() => toggleColor(c)}
                      className={[
                        'p-2 rounded-lg border-2 flex items-center gap-1.5 transition',
                        active
                          ? 'border-pink-600 bg-pink-50 shadow ring-2 ring-pink-200'
                          : 'border-slate-200 bg-white hover:border-pink-400',
                      ].join(' ')}
                    >
                      <span
                        className="h-5 w-5 rounded-full border-2 border-white shadow shrink-0"
                        style={{ backgroundColor: c.hex }}
                      />
                      <span className="text-[10px] font-extrabold text-slate-700 truncate">{c.name}</span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-2 flex gap-2 items-end">
                <div className="flex-1">
                  <label className="block text-[10px] uppercase font-extrabold text-slate-500 mb-0.5">Custom Color Name</label>
                  <input
                    value={customColorName}
                    onChange={(e) => setCustomColorName(e.target.value)}
                    placeholder="e.g. Rose Gold"
                    className="h-9 w-full rounded-lg border-2 border-slate-200 bg-white px-3 text-xs font-bold focus:outline-none focus:border-pink-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-extrabold text-slate-500 mb-0.5">Hex</label>
                  <input
                    type="color"
                    value={customColorHex}
                    onChange={(e) => setCustomColorHex(e.target.value)}
                    className="h-9 w-12 rounded-lg border-2 border-slate-200 cursor-pointer"
                  />
                </div>
                <button type="button" onClick={addCustomColor}
                  disabled={!customColorName.trim()}
                  className="h-9 px-3 rounded-lg bg-pink-600 hover:bg-pink-700 text-white text-xs font-extrabold inline-flex items-center gap-1 disabled:opacity-50">
                  <Plus className="h-3 w-3" /> Add
                </button>
              </div>
            </div>

            {/* Generate button */}
            <button
              type="button"
              onClick={generateMatrix}
              disabled={selectedSizes.length === 0 && selectedColors.length === 0}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-fuchsia-600 to-pink-700 hover:from-fuchsia-700 hover:to-pink-800 text-white text-sm font-extrabold shadow-md disabled:opacity-40 inline-flex items-center justify-center gap-2 transition"
            >
              <Sparkles className="h-4 w-4" />
              Generate {matrixSize} Variant{matrixSize !== 1 ? 's' : ''}
            </button>
          </section>

          {/* Variants list */}
          {variants.length > 0 ? (
            <section className="rounded-2xl border-2 border-pink-200 bg-white p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-wider font-extrabold text-pink-700">
                    Configured Variants
                  </div>
                  <h4 className="font-extrabold text-slate-900 text-sm mt-0.5">
                    {variants.length} variant{variants.length !== 1 ? 's' : ''} — edit prices, SKU, barcode, stock
                  </h4>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-2 py-2 text-left font-extrabold uppercase tracking-wider text-slate-700 text-[9px]">Size</th>
                      <th className="px-2 py-2 text-left font-extrabold uppercase tracking-wider text-slate-700 text-[9px]">Color</th>
                      <th className="px-2 py-2 text-left font-extrabold uppercase tracking-wider text-slate-700 text-[9px]">SKU</th>
                      <th className="px-2 py-2 text-left font-extrabold uppercase tracking-wider text-slate-700 text-[9px]">Barcode</th>
                      <th className="px-2 py-2 text-right font-extrabold uppercase tracking-wider text-slate-700 text-[9px]">Price</th>
                      <th className="px-2 py-2 text-right font-extrabold uppercase tracking-wider text-slate-700 text-[9px]">Stock</th>
                      <th className="px-2 py-2 text-center font-extrabold uppercase tracking-wider text-slate-700 text-[9px]">⭐</th>
                      <th className="px-2 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {variants.map((v) => (
                      <tr key={v.tempId} className="hover:bg-pink-50/50">
                        <td className="px-2 py-1.5">
                          <input value={v.size}
                            onChange={(e) => onUpdateVariant(v.tempId, { size: e.target.value })}
                            className="w-16 h-8 rounded-lg border-2 border-slate-200 px-2 text-xs font-extrabold text-center focus:outline-none focus:border-pink-500"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <div className="flex items-center gap-1.5">
                            {v.colorHex && (
                              <span
                                className="h-5 w-5 rounded-full border-2 border-white shadow shrink-0"
                                style={{ backgroundColor: v.colorHex }}
                              />
                            )}
                            <input value={v.colorName}
                              onChange={(e) => onUpdateVariant(v.tempId, { colorName: e.target.value })}
                              placeholder="Color"
                              className="w-24 h-8 rounded-lg border-2 border-slate-200 px-2 text-xs font-bold focus:outline-none focus:border-pink-500"
                            />
                          </div>
                        </td>
                        <td className="px-2 py-1.5">
                          <input value={v.skuSuffix}
                            onChange={(e) => onUpdateVariant(v.tempId, { skuSuffix: e.target.value })}
                            placeholder="Suffix"
                            className="w-20 h-8 rounded-lg border-2 border-slate-200 px-2 text-xs font-mono font-bold focus:outline-none focus:border-pink-500"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input value={v.barcode}
                            onChange={(e) => onUpdateVariant(v.tempId, { barcode: e.target.value })}
                            placeholder="Barcode"
                            className="w-28 h-8 rounded-lg border-2 border-slate-200 px-2 text-xs font-mono font-bold focus:outline-none focus:border-pink-500"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input type="number" step="0.01" value={v.priceOverride ?? ''}
                            onChange={(e) => onUpdateVariant(v.tempId, { priceOverride: e.target.value === '' ? undefined : Number(e.target.value) })}
                            placeholder={String(basic.salePrice || 0)}
                            className="w-24 h-8 rounded-lg border-2 border-emerald-200 px-2 text-xs font-extrabold tabular-nums text-right focus:outline-none focus:border-emerald-500"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input type="number" step="0.01" value={v.stock}
                            onChange={(e) => onUpdateVariant(v.tempId, { stock: Number(e.target.value || 0) })}
                            className="w-16 h-8 rounded-lg border-2 border-slate-200 px-2 text-xs font-bold tabular-nums text-right focus:outline-none focus:border-pink-500"
                          />
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          <input type="checkbox" checked={v.isFeaturedColor}
                            onChange={(e) => onUpdateVariant(v.tempId, { isFeaturedColor: e.target.checked })}
                            className="h-4 w-4 rounded"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <button type="button" onClick={() => onRemoveVariant(v.tempId)}
                            className="h-7 w-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : (
            <section className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <Palette className="h-10 w-10 text-slate-400 mx-auto mb-2" />
              <div className="font-extrabold text-slate-700 text-sm">No variants added yet</div>
              <div className="text-xs text-slate-500 font-semibold mt-1">
                Select sizes and colors above, then click "Generate Variants"
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
