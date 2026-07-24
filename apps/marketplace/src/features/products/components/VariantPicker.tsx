import { cn } from '@/lib/cn';

interface Variant {
  id: string;
  name: string;
  price?: number;
  stockQuantity?: number;
}

interface VariantPickerProps {
  variants: Variant[];
  selectedId?: string;
  onChange: (id: string) => void;
}

export function VariantPicker({ variants, selectedId, onChange }: VariantPickerProps) {
  if (!variants.length) return null;
  return (
    <div>
      <div className="text-xs font-black text-content-muted uppercase tracking-wider mb-2">
        Choose variant
      </div>
      <div className="flex flex-wrap gap-2">
        {variants.map((v) => {
          const outOfStock = v.stockQuantity !== undefined && v.stockQuantity <= 0;
          return (
            <button
              key={v.id}
              disabled={outOfStock}
              onClick={() => onChange(v.id)}
              className={cn(
                'min-w-[80px] px-4 h-11 rounded-xl border-2 text-sm font-bold transition text-center',
                selectedId === v.id
                  ? 'border-brand-600 bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-400'
                  : 'border-border bg-surface hover:border-brand-400',
                outOfStock && 'opacity-50 line-through cursor-not-allowed',
              )}
            >
              {v.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
