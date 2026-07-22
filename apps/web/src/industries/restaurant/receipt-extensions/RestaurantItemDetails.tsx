import { StickyNote } from 'lucide-react';
import { formatPKR } from '@core/lib/format';
import { useRestaurantOrderForSale } from '../hooks/useRestaurantOrderForSale';

/**
 * Extra content shown under each receipt item for restaurant sales:
 *   • Modifier selections (Extra Cheese, No Onion, ...)
 *   • Special instructions
 *   • Spice level & cooking style
 *
 * If the sale isn\'t a restaurant order, renders nothing.
 */
export function RestaurantItemDetails({ sale, item }: { sale: any; item: any }) {
  const { data: order } = useRestaurantOrderForSale(sale?.id, sale?.saleNumber);
  if (!order) return null;

  const roItem = order.items?.find((ri: any) => ri.productId === item?.product?.id);
  if (!roItem) return null;

  const mods = roItem.modifiers ?? [];
  const hasSpice = roItem.spiceLevel && roItem.spiceLevel !== 'NONE';

  if (mods.length === 0 && !roItem.specialInstructions && !roItem.cookingNote && !hasSpice) {
    return null;
  }

  return (
    <div className="mt-1.5 space-y-1">
      {mods.length > 0 && (
        <div className="rounded-lg bg-pink-50 border border-pink-200 p-2 print:bg-white print:border-slate-400">
          <div className="text-[9px] uppercase tracking-wider font-extrabold text-pink-700 mb-1">
            Modifiers
          </div>
          <div className="flex flex-wrap gap-1">
            {mods.map((m: any, mi: number) => (
              <span
                key={mi}
                className="px-1.5 py-0.5 rounded bg-white border border-pink-200 text-[10px] font-bold text-pink-800 print:border-slate-400"
              >
                {m.modifierOption?.name || m.optionName}
                {m.priceAdjustment !== 0 && (
                  <span className={m.priceAdjustment > 0 ? ' text-emerald-700' : ' text-rose-700'}>
                    {' '}({m.priceAdjustment > 0 ? '+' : ''}{formatPKR(m.priceAdjustment)})
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}
      {roItem.specialInstructions && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-2 print:bg-white print:border-slate-400">
          <div className="flex items-start gap-1.5 text-[10px] italic text-amber-900">
            <StickyNote className="h-2.5 w-2.5 mt-0.5 shrink-0" />
            <span><strong>Instructions:</strong> {roItem.specialInstructions}</span>
          </div>
        </div>
      )}
      {roItem.cookingNote && (
        <div className="text-[10px] italic text-blue-700">
          🍳 Cooking: {roItem.cookingNote}
        </div>
      )}
      {hasSpice && (
        <div className="text-[10px] font-extrabold text-red-600">
          🌶️ Spice: {roItem.spiceLevel}
        </div>
      )}
    </div>
  );
}
