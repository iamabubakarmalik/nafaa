import { Input } from '@/components/ui/Input';
import type { IndustrySectionProps } from '@/features/industries/_shared/types/section.types';

export function StandardInventorySection({ form, setForm }: IndustrySectionProps) {
  return (
    <div className="space-y-5 max-w-4xl">
      <div className="grid sm:grid-cols-2 gap-4">
        <Input
          label="Current Stock"
          type="number"
          value={form.stock ?? 0}
          onChange={(e) => setForm((f) => ({ ...f, stock: Number(e.target.value) }))}
        />
        <Input
          label="Low Stock Alert"
          type="number"
          value={form.lowStockAlert ?? 5}
          onChange={(e) => setForm((f) => ({ ...f, lowStockAlert: Number(e.target.value) }))}
          hint="Alert when stock falls below this"
        />
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Input
          label="Weight"
          type="number"
          value={form.weight ?? ''}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              weight: e.target.value ? Number(e.target.value) : undefined,
            }))
          }
        />
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Weight Unit</label>
          <select
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
            value={form.weightUnit ?? 'g'}
            onChange={(e) => setForm((f) => ({ ...f, weightUnit: e.target.value }))}
          >
            <optgroup label="⚖️ Weight">
              <option value="g">Grams (g)</option>
              <option value="kg">Kilograms (kg)</option>
              <option value="mg">Milligrams (mg)</option>
              <option value="ton">Tons (ton)</option>
              <option value="lb">Pounds (lb)</option>
              <option value="oz">Ounces (oz)</option>
              <option value="pao">Pao (pao)</option>
              <option value="seer">Seer (seer)</option>
              <option value="maund">Maund (maund)</option>
            </optgroup>
            <optgroup label="💧 Volume">
              <option value="ml">Milliliters (ml)</option>
              <option value="l">Liters (l)</option>
              <option value="gallon">Gallons (gallon)</option>
            </optgroup>
          </select>
        </div>
        <Input
          label="Dimensions (L×W×H)"
          value={form.dimensions ?? ''}
          onChange={(e) => setForm((f) => ({ ...f, dimensions: e.target.value }))}
          placeholder="20×10×5 cm"
        />
      </div>
    </div>
  );
}
