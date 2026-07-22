import { Layers, Scissors } from 'lucide-react';
import { parseCarpetNote } from '../utils/parseCarpetNote';

/**
 * Carpet totals summary — extra row shown above GRAND TOTAL:
 *   • Total sqft sold in this sale
 *   • Number of rolls / cut pieces
 * Great for the customer to verify their purchase at a glance.
 */
export function CarpetTotalsExtension({ sale }: { sale: any }) {
  const items = Array.isArray(sale?.items) ? sale.items : [];

  let totalSqft = 0;
  let rollCount = 0;
  let cutCount = 0;

  for (const it of items) {
    const info = parseCarpetNote(it?.note);
    if (!info) continue;
    if (info.type === 'roll') rollCount++;
    else cutCount++;
    // Try to derive sqft from item quantity (carpet items have unit=sqft)
    if (it?.product?.unit === 'sqft') {
      totalSqft += Number(it.quantity ?? 0);
    }
  }

  if (rollCount === 0 && cutCount === 0) return null;

  return (
    <div className="rounded-xl bg-emerald-50 border-2 border-emerald-200 p-2.5 print:bg-white">
      <div className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-700 mb-1">
        Carpet Summary
      </div>
      <div className="flex items-center gap-3 flex-wrap text-xs font-bold">
        {totalSqft > 0 && (
          <span className="text-emerald-900 tabular-nums">
            📐 {totalSqft.toFixed(2)} sqft total
          </span>
        )}
        {rollCount > 0 && (
          <span className="inline-flex items-center gap-1 text-emerald-800">
            <Layers className="h-3 w-3" /> {rollCount} roll cut{rollCount !== 1 ? 's' : ''}
          </span>
        )}
        {cutCount > 0 && (
          <span className="inline-flex items-center gap-1 text-violet-800">
            <Scissors className="h-3 w-3" /> {cutCount} piece{cutCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  );
}
