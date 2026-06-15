import { useState } from 'react';
import { Check, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export interface BusinessTypeCard {
  value: string;
  label: string;
  emoji: string;
  description: string;
  category: string;
  highlights?: string[];
  defaultUnit?: string;
  featureCount?: number;
}

// Default business types (in case API hasn't loaded yet)
export const BUSINESS_TYPES: BusinessTypeCard[] = [
  {
    value: 'CARPET',
    label: 'Carpets / Flooring',
    emoji: '🏪',
    description: 'Carpet shops, tiles, rugs, flooring',
    category: 'Retail',
    defaultUnit: 'sqft',
    highlights: ['Length × Width calculator', 'Color variants', 'sqft pricing'],
  },
  {
    value: 'MOBILE',
    label: 'Mobile / Electronics',
    emoji: '📱',
    description: 'Mobile shops, accessories, repairs',
    category: 'Electronics',
    defaultUnit: 'pcs',
    highlights: ['IMEI tracking', 'EMI plans', 'Warranty management'],
  },
  {
    value: 'GROCERY',
    label: 'Grocery / Kiryana',
    emoji: '🛒',
    description: 'General stores, supermarkets',
    category: 'Retail',
    defaultUnit: 'kg',
    highlights: ['Weight-based pricing', 'Expiry tracking', 'Batches'],
  },
  {
    value: 'PHARMACY',
    label: 'Pharmacy / Medical',
    emoji: '💊',
    description: 'Medical stores, drug stores',
    category: 'Healthcare',
    defaultUnit: 'strip',
    highlights: ['Strict expiry tracking', 'Batch numbers', 'Prescriptions'],
  },
  {
    value: 'RESTAURANT',
    label: 'Restaurant / Cafe',
    emoji: '🍽️',
    description: 'Restaurants, cafes, dhabas',
    category: 'Food',
    defaultUnit: 'plate',
    highlights: ['Table management', 'Kitchen tickets', 'Size variants'],
  },
  {
    value: 'SALON',
    label: 'Salon / Beauty',
    emoji: '💇',
    description: 'Salons, parlours, spas',
    category: 'Service',
    defaultUnit: 'service',
    highlights: ['Appointments', 'Staff slots', 'Service items'],
  },
  {
    value: 'CLOTHING',
    label: 'Clothing / Garments',
    emoji: '👕',
    description: 'Clothing stores, fabric shops',
    category: 'Fashion',
    defaultUnit: 'pcs',
    highlights: ['Size × Color matrix', 'Variant images', 'Alterations'],
  },
  {
    value: 'HARDWARE',
    label: 'Hardware / Construction',
    emoji: '🔧',
    description: 'Hardware, tools, building supplies',
    category: 'Industrial',
    defaultUnit: 'pcs',
    highlights: ['Length items', 'Weight items', 'Installation'],
  },
  {
    value: 'STATIONERY',
    label: 'Stationery / Books',
    emoji: '📚',
    description: 'Stationery, books, office supplies',
    category: 'Education',
    defaultUnit: 'pcs',
    highlights: ['Pack & dozen', 'Multi-unit', 'Color variants'],
  },
  {
    value: 'COSMETICS',
    label: 'Cosmetics / Beauty',
    emoji: '💄',
    description: 'Cosmetics, beauty products',
    category: 'Lifestyle',
    defaultUnit: 'pcs',
    highlights: ['Shade variants', 'Expiry tracking', 'Brand catalog'],
  },
  {
    value: 'BAKERY',
    label: 'Bakery / Sweets',
    emoji: '🍰',
    description: 'Bakeries, sweet shops',
    category: 'Food',
    defaultUnit: 'pcs',
    highlights: ['Weight-based', 'Daily expiry', 'Size variants'],
  },
  {
    value: 'GENERAL',
    label: 'General Retail',
    emoji: '🏬',
    description: 'Mixed retail, other businesses',
    category: 'Other',
    defaultUnit: 'pcs',
    highlights: ['All features', 'Customize anytime', 'Most flexible'],
  },
];

interface Props {
  /** Currently selected value */
  value?: string;
  /** Options from API (falls back to defaults) */
  options?: BusinessTypeCard[];
  /** Called when user picks + confirms */
  onSelect: (type: BusinessTypeCard) => void;
  /** Called only on selection (not confirm) */
  onChange?: (type: BusinessTypeCard) => void;
  /** Show confirm button at bottom */
  showConfirmButton?: boolean;
  /** Confirm button text */
  confirmText?: string;
  /** Loading state */
  loading?: boolean;
}

export function BusinessTypeSelector({
  value: initialValue,
  options = BUSINESS_TYPES,
  onSelect,
  onChange,
  showConfirmButton = true,
  confirmText = 'Continue',
  loading = false,
}: Props) {
  const [selected, setSelected] = useState<string | null>(initialValue ?? null);

  const selectedCard = options.find((opt) => opt.value === selected);

  const handlePick = (type: BusinessTypeCard) => {
    setSelected(type.value);
    onChange?.(type);
  };

  const handleConfirm = () => {
    if (!selectedCard) return;
    onSelect(selectedCard);
  };

  return (
    <div className="space-y-6">
      {/* Grid of cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {options.map((opt) => {
          const isSelected = selected === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => handlePick(opt)}
              className={`group relative rounded-2xl border-2 p-4 text-left transition-all ${
                isSelected
                  ? 'border-violet-500 bg-gradient-to-br from-violet-50 to-pink-50 shadow-lg shadow-violet-500/20 scale-[1.02]'
                  : 'border-slate-200 bg-white hover:border-violet-300 hover:shadow-md'
              }`}
            >
              {isSelected && (
                <div className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-violet-600 text-white flex items-center justify-center shadow-lg ring-4 ring-white">
                  <Check className="h-4 w-4" />
                </div>
              )}

              <div className="text-4xl mb-2">{opt.emoji}</div>
              <div className={`font-bold text-sm leading-tight ${isSelected ? 'text-violet-900' : 'text-slate-900'}`}>
                {opt.label}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                {opt.description}
              </div>

              <div className="mt-2 flex items-center gap-1 flex-wrap">
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                  isSelected ? 'bg-violet-200 text-violet-800' : 'bg-slate-100 text-slate-600'
                }`}>
                  {opt.category}
                </span>
                {opt.defaultUnit && (
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                    isSelected ? 'bg-emerald-200 text-emerald-800' : 'bg-emerald-50 text-emerald-700'
                  }`}>
                    {opt.defaultUnit}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Preview of selected business */}
      {selectedCard && (
        <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-violet-900 to-violet-700 text-white p-6 shadow-2xl animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-start gap-4">
            <div className="text-5xl">{selectedCard.emoji}</div>
            <div className="flex-1">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold">
                <Sparkles className="h-3 w-3 text-amber-400" />
                Auto-configured for you
              </div>
              <h3 className="mt-2 text-2xl font-extrabold">{selectedCard.label}</h3>
              <p className="text-sm text-white/80 mt-1">{selectedCard.description}</p>
            </div>
          </div>

          {selectedCard.highlights && selectedCard.highlights.length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <div className="text-[10px] uppercase tracking-wider text-white/60 font-bold mb-2">
                Features enabled automatically:
              </div>
              <div className="grid sm:grid-cols-2 gap-2">
                {selectedCard.highlights.map((h, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <div className="h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="h-3 w-3" />
                    </div>
                    <span className="text-white/90">{h}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedCard.defaultUnit && (
            <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-white/60 font-bold">Default Unit</div>
                <div className="text-lg font-extrabold text-emerald-300 mt-0.5">{selectedCard.defaultUnit}</div>
              </div>
              <div className="text-xs text-white/70">
                Aap baad mein settings se change kar sakte hain
              </div>
            </div>
          )}
        </div>
      )}

      {/* Confirm button */}
      {showConfirmButton && (
        <div className="flex justify-end">
          <Button
            onClick={handleConfirm}
            disabled={!selectedCard || loading}
            loading={loading}
            size="lg"
            className="bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-700 hover:to-pink-700 text-white shadow-lg shadow-violet-500/30"
          >
            {confirmText}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
