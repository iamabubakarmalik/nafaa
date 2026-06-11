import { useState } from 'react';
import { Plus, Trash2, Wand2, Palette } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
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
];

const SIZE_PRESETS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];

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
      prev.find((x) => x.name === c.name) ? prev.filter((x) => x.name !== c.name) : [...prev, c],
    );
  };

  const toggleSize = (s: string) => {
    setSizes((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  };

  const addCustomColor = () => {
    if (!customColorName.trim()) return;
    setColors((prev) => [...prev, { name: customColorName.trim(), hex: customColorHex }]);
    setCustomColorName('');
  };

  const addCustomSize = () => {
    if (!customSize.trim()) return;
    setSizes((prev) => [...prev, customSize.trim()]);
    setCustomSize('');
  };

  const totalVariants = Math.max(colors.length, 1) * Math.max(sizes.length, 1);

  const generate = () => {
    const result: UpsertVariantPayload[] = [];
    let order = 0;

    if (colors.length === 0 && sizes.length === 0) return;

    if (colors.length === 0) {
      sizes.forEach((s) => {
        result.push({
          name: s,
          size: s,
          price: basePrice,
          costPrice: baseCostPrice,
          stock: 0,
          sortOrder: order++,
        });
      });
    } else if (sizes.length === 0) {
      colors.forEach((c) => {
        result.push({
          name: c.name,
          color: c.name,
          colorHex: c.hex,
          price: basePrice,
          costPrice: baseCostPrice,
          stock: 0,
          sortOrder: order++,
        });
      });
    } else {
      colors.forEach((c) => {
        sizes.forEach((s) => {
          result.push({
            name: `${c.name} - ${s}`,
            color: c.name,
            colorHex: c.hex,
            size: s,
            price: basePrice,
            costPrice: baseCostPrice,
            stock: 0,
            sortOrder: order++,
          });
        });
      });
    }

    onGenerate(result);
  };

  return (
    <div className="rounded-2xl bg-gradient-to-br from-violet-50 to-pink-50 border border-violet-200 p-5 space-y-5">
      <div className="flex items-center gap-2">
        <div className="h-10 w-10 rounded-xl bg-violet-600 text-white flex items-center justify-center">
          <Wand2 className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-bold text-slate-900">Variant Builder</h3>
          <p className="text-xs text-slate-600">
            Pick colors and sizes — we'll generate all combinations
          </p>
        </div>
      </div>

      {/* Colors */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Palette className="h-4 w-4 text-violet-700" />
          <label className="text-sm font-bold text-slate-700">Colors</label>
        </div>

        <div className="flex flex-wrap gap-2">
          {COLOR_PRESETS.map((c) => {
            const active = colors.find((x) => x.name === c.name);
            return (
              <button
                key={c.name}
                type="button"
                onClick={() => toggleColor(c)}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border-2 text-sm font-semibold transition ${
                  active
                    ? 'border-violet-600 bg-white shadow'
                    : 'border-slate-200 bg-white hover:border-violet-300'
                }`}
              >
                <span
                  className="h-4 w-4 rounded-full border border-slate-300"
                  style={{ backgroundColor: c.hex }}
                />
                {c.name}
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex gap-2">
          <input
            type="color"
            value={customColorHex}
            onChange={(e) => setCustomColorHex(e.target.value)}
            className="h-10 w-12 rounded-lg border border-slate-200 cursor-pointer"
          />
          <input
            type="text"
            value={customColorName}
            onChange={(e) => setCustomColorName(e.target.value)}
            placeholder="Custom color name"
            className="flex-1 h-10 rounded-lg border border-slate-200 px-3 text-sm"
          />
          <Button size="sm" variant="secondary" onClick={addCustomColor}>
            <Plus className="h-3.5 w-3.5" /> Add
          </Button>
        </div>
      </div>

      {/* Sizes */}
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-2">Sizes</label>
        <div className="flex flex-wrap gap-2">
          {SIZE_PRESETS.map((s) => {
            const active = sizes.includes(s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => toggleSize(s)}
                className={`px-3 py-1.5 rounded-full border-2 text-sm font-bold transition ${
                  active
                    ? 'border-pink-600 bg-pink-600 text-white'
                    : 'border-slate-200 bg-white hover:border-pink-300'
                }`}
              >
                {s}
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={customSize}
            onChange={(e) => setCustomSize(e.target.value)}
            placeholder="Custom size (e.g. 250g, 1L, 32GB)"
            className="flex-1 h-10 rounded-lg border border-slate-200 px-3 text-sm"
          />
          <Button size="sm" variant="secondary" onClick={addCustomSize}>
            <Plus className="h-3.5 w-3.5" /> Add
          </Button>
        </div>
      </div>

      {/* Summary + generate */}
      <div className="rounded-xl bg-white border border-violet-200 p-4 flex items-center justify-between">
        <div>
          <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">
            Will generate
          </div>
          <div className="text-2xl font-bold text-violet-700">{totalVariants} variants</div>
          <div className="text-xs text-slate-500 mt-0.5">
            {colors.length} colors × {sizes.length} sizes
          </div>
        </div>
        <Button
          onClick={generate}
          disabled={colors.length === 0 && sizes.length === 0}
          className="bg-violet-600 hover:bg-violet-700"
        >
          <Wand2 className="h-4 w-4" /> Generate
        </Button>
      </div>
    </div>
  );
}
