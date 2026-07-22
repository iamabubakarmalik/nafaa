import { useMemo, useState } from 'react';
import {
  Plus, Wand2, Palette, Ruler, Sparkles, X, Zap, CheckCircle2,
  ArrowRight, Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { UpsertVariantPayload } from '@/api/product-variants.api';

const COLOR_PRESETS = [
  { name: 'Red', hex: '#ef4444' },
  { name: 'Blue', hex: '#3b82f6' },
  { name: 'Green', hex: '#16a34a' },
  { name: 'Yellow', hex: '#eab308' },
  { name: 'Black', hex: '#0f172a' },
  { name: 'White', hex: '#ffffff' },
  { name: 'Pink', hex: '#ec4899' },
  { name: 'Purple', hex: '#8b5cf6' },
  { name: 'Orange', hex: '#f97316' },
  { name: 'Brown', hex: '#92400e' },
  { name: 'Gray', hex: '#64748b' },
  { name: 'Cyan', hex: '#06b6d4' },
];

const SIZE_PRESETS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];

const QUICK_TEMPLATES = [
  { label: 'Clothing Sizes', sizes: ['S', 'M', 'L', 'XL'] },
  { label: 'Shoe Sizes', sizes: ['38', '39', '40', '41', '42', '43', '44'] },
  { label: 'Mobile Storage', sizes: ['64GB', '128GB', '256GB', '512GB'] },
  { label: 'Bottle Sizes', sizes: ['250ml', '500ml', '1L', '1.5L'] },
];

interface Props {
  basePrice: number;
  baseCostPrice: number;
  onGenerate: (variants: UpsertVariantPayload[]) => void;
}

export function VariantBuilder({ basePrice, baseCostPrice, onGenerate }: Props) {
  const [colors, setColors] = useState<{ name: string; hex: string }[]>([]);
  const [sizes, setSizes] = useState<string[]>([]);
  const [customColorName, setCustomColorName] = useState('');
  const [customColorHex, setCustomColorHex] = useState('#16a34a');
  const [customSize, setCustomSize] = useState('');

  const toggleColor = (c: { name: string; hex: string }) => {
    setColors((prev) =>
      prev.find((x) => x.name === c.name)
        ? prev.filter((x) => x.name !== c.name)
        : [...prev, c],
    );
  };

  const toggleSize = (s: string) => {
    setSizes((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  };

  const addCustomColor = () => {
    const name = customColorName.trim();
    if (!name) return;
    const exists = colors.some((x) => x.name.toLowerCase() === name.toLowerCase());
    if (!exists) {
      setColors((prev) => [...prev, { name, hex: customColorHex }]);
    }
    setCustomColorName('');
  };

  const addCustomSize = () => {
    const value = customSize.trim();
    if (!value) return;
    const exists = sizes.some((x) => x.toLowerCase() === value.toLowerCase());
    if (!exists) {
      setSizes((prev) => [...prev, value]);
    }
    setCustomSize('');
  };

  const applyTemplate = (templateSizes: string[]) => {
    const merged = [...new Set([...sizes, ...templateSizes])];
    setSizes(merged);
  };

  const clearAll = () => {
    setColors([]);
    setSizes([]);
  };

  const canGenerate = colors.length > 0 || sizes.length > 0;

  const totalVariants = useMemo(() => {
    if (!canGenerate) return 0;
    if (colors.length > 0 && sizes.length > 0) return colors.length * sizes.length;
    if (colors.length > 0) return colors.length;
    return sizes.length;
  }, [canGenerate, colors.length, sizes.length]);

  const generate = () => {
    if (!canGenerate) return;
    const result: UpsertVariantPayload[] = [];
    let order = 0;

    if (colors.length === 0) {
      sizes.forEach((s) => {
        result.push({
          name: s, size: s, price: basePrice, costPrice: baseCostPrice,
          stock: 0, sortOrder: order++,
        });
      });
    } else if (sizes.length === 0) {
      colors.forEach((c) => {
        result.push({
          name: c.name, color: c.name, colorHex: c.hex,
          price: basePrice, costPrice: baseCostPrice, stock: 0, sortOrder: order++,
        });
      });
    } else {
      colors.forEach((c) => {
        sizes.forEach((s) => {
          result.push({
            name: `${c.name} - ${s}`, color: c.name, colorHex: c.hex, size: s,
            price: basePrice, costPrice: baseCostPrice, stock: 0, sortOrder: order++,
          });
        });
      });
    }

    onGenerate(result);
    setColors([]);
    setSizes([]);
  };

  return (
    <div className="rounded-3xl bg-gradient-to-br from-violet-50 via-purple-50 to-pink-50 border-2 border-violet-200 p-5 space-y-5 shadow-sm">
      {/* HEADER */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 text-white flex items-center justify-center shadow-lg shadow-violet-500/30">
            <Wand2 className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-lg">Variant Builder</h3>
            <p className="text-xs text-slate-600 font-semibold">
              Colors aur sizes choose karo — combinations auto generate hongi
            </p>
          </div>
        </div>
        {(colors.length > 0 || sizes.length > 0) && (
          <button
            onClick={clearAll}
            className="h-9 px-3 rounded-lg bg-white hover:bg-rose-50 text-rose-700 text-xs font-extrabold border-2 border-rose-200 inline-flex items-center gap-1 transition"
          >
            <Trash2 className="h-3.5 w-3.5" /> Clear All
          </button>
        )}
      </div>

      {/* QUICK TEMPLATES */}
      <div className="rounded-2xl bg-white border-2 border-violet-200 p-3">
        <div className="text-[10px] uppercase tracking-wider font-extrabold text-violet-700 mb-2 flex items-center gap-1">
          <Zap className="h-3 w-3" /> Quick Templates
        </div>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_TEMPLATES.map((tpl) => (
            <button
              key={tpl.label}
              onClick={() => applyTemplate(tpl.sizes)}
              className="px-2.5 py-1 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-700 text-xs font-extrabold border border-violet-200 transition inline-flex items-center gap-1"
            >
              <Sparkles className="h-2.5 w-2.5" /> {tpl.label}
            </button>
          ))}
        </div>
      </div>

      {/* COLORS */}
      <div className="rounded-2xl bg-white border-2 border-violet-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-violet-700 text-white flex items-center justify-center shadow-md">
            <Palette className="h-4 w-4" />
          </div>
          <div>
            <div className="font-extrabold text-slate-900 text-sm">Colors</div>
            <div className="text-[10px] text-slate-500 font-semibold">Click to select multiple</div>
          </div>
          {colors.length > 0 && (
            <span className="ml-auto px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-[10px] font-extrabold">
              {colors.length} selected
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {COLOR_PRESETS.map((c) => {
            const active = colors.find((x) => x.name === c.name);
            return (
              <button
                key={c.name}
                type="button"
                onClick={() => toggleColor(c)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border-2 text-xs font-extrabold transition ${
                  active
                    ? 'border-violet-600 bg-violet-50 shadow-sm ring-2 ring-violet-200'
                    : 'border-slate-200 bg-white hover:border-violet-300 hover:shadow-sm'
                }`}
              >
                <span
                  className="h-3.5 w-3.5 rounded-full border border-slate-300 shadow-sm"
                  style={{ backgroundColor: c.hex }}
                />
                {c.name}
                {active && <CheckCircle2 className="h-3 w-3 text-violet-600" />}
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex gap-2">
          <input
            type="color"
            value={customColorHex}
            onChange={(e) => setCustomColorHex(e.target.value)}
            className="h-10 w-12 rounded-lg border-2 border-slate-200 cursor-pointer"
          />
          <input
            type="text"
            value={customColorName}
            onChange={(e) => setCustomColorName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomColor(); } }}
            placeholder="Custom color name (press Enter)"
            className="flex-1 h-10 rounded-lg border-2 border-slate-200 px-3 text-sm font-semibold focus:outline-none focus:border-violet-500"
          />
          <button
            onClick={addCustomColor}
            disabled={!customColorName.trim()}
            className="h-10 px-3 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-extrabold inline-flex items-center gap-1 disabled:opacity-50 transition"
          >
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        </div>
      </div>

      {/* SIZES */}
      <div className="rounded-2xl bg-white border-2 border-pink-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-pink-500 to-pink-700 text-white flex items-center justify-center shadow-md">
            <Ruler className="h-4 w-4" />
          </div>
          <div>
            <div className="font-extrabold text-slate-900 text-sm">Sizes / Codes / Capacity</div>
            <div className="text-[10px] text-slate-500 font-semibold">XS-XXL, 32GB, 250ml, etc.</div>
          </div>
          {sizes.length > 0 && (
            <span className="ml-auto px-2 py-0.5 rounded-full bg-pink-100 text-pink-700 text-[10px] font-extrabold">
              {sizes.length} selected
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {SIZE_PRESETS.map((s) => {
            const active = sizes.includes(s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => toggleSize(s)}
                className={`px-3 py-1.5 rounded-lg border-2 text-xs font-extrabold transition inline-flex items-center gap-1 ${
                  active
                    ? 'border-pink-600 bg-gradient-to-br from-pink-500 to-pink-600 text-white shadow-sm'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-pink-300 hover:shadow-sm'
                }`}
              >
                {s}
                {active && <CheckCircle2 className="h-3 w-3" />}
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={customSize}
            onChange={(e) => setCustomSize(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomSize(); } }}
            placeholder="Custom size / code (e.g. 250g, 1L, 32GB, 1D, 17R)"
            className="flex-1 h-10 rounded-lg border-2 border-slate-200 px-3 text-sm font-semibold focus:outline-none focus:border-pink-500"
          />
          <button
            onClick={addCustomSize}
            disabled={!customSize.trim()}
            className="h-10 px-3 rounded-lg bg-pink-600 hover:bg-pink-700 text-white text-xs font-extrabold inline-flex items-center gap-1 disabled:opacity-50 transition"
          >
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        </div>
      </div>

      {/* SELECTED PREVIEW */}
      {(colors.length > 0 || sizes.length > 0) && (
        <div className="rounded-2xl bg-white border-2 border-slate-200 p-4 space-y-3">
          <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-700 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            Selected Options
          </div>

          {colors.length > 0 && (
            <div>
              <div className="text-[10px] font-extrabold text-slate-600 mb-1.5">Colors ({colors.length})</div>
              <div className="flex flex-wrap gap-1.5">
                {colors.map((c) => (
                  <span
                    key={c.name}
                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-violet-50 border-2 border-violet-200 text-xs font-extrabold text-slate-700"
                  >
                    <span
                      className="h-3 w-3 rounded-full border border-slate-300 shadow-sm"
                      style={{ backgroundColor: c.hex }}
                    />
                    {c.name}
                    <button
                      onClick={() => toggleColor(c)}
                      className="ml-0.5 h-4 w-4 rounded hover:bg-violet-200 flex items-center justify-center"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {sizes.length > 0 && (
            <div>
              <div className="text-[10px] font-extrabold text-slate-600 mb-1.5">Sizes ({sizes.length})</div>
              <div className="flex flex-wrap gap-1.5">
                {sizes.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-pink-50 border-2 border-pink-200 text-xs font-extrabold text-slate-700"
                  >
                    {s}
                    <button
                      onClick={() => toggleSize(s)}
                      className="ml-0.5 h-4 w-4 rounded hover:bg-pink-200 flex items-center justify-center"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* GENERATE BAR */}
      <div className="rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 border-2 border-violet-300 p-4 flex items-center justify-between gap-3 flex-wrap shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 text-white flex items-center justify-center shadow-lg shadow-violet-500/30">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-violet-700">Will Generate</div>
            <div className="text-3xl font-extrabold text-violet-900 tabular-nums leading-none">{totalVariants}</div>
            <div className="text-[10px] text-violet-700 font-bold mt-0.5">
              {colors.length} colors × {sizes.length} sizes = {totalVariants} variants
            </div>
          </div>
        </div>

        <Button
          onClick={generate}
          disabled={!canGenerate}
          className="bg-gradient-to-r from-violet-700 to-purple-700 hover:from-violet-800 hover:to-purple-800 shadow-lg shadow-violet-500/30 disabled:from-slate-300 disabled:to-slate-400 disabled:shadow-none"
        >
          <Wand2 className="h-4 w-4" /> Generate Variants <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
