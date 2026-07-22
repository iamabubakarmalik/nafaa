import { Layers, Scissors } from 'lucide-react';
import { parseCarpetNote } from '../utils/parseCarpetNote';

/**
 * Badge shown next to each SaleItem chip in the Sales list.
 * Reveals the roll # or cut piece code so the shop owner can
 * see at a glance which physical piece was sold.
 */
export function CarpetSaleItemBadge({ item }: { item: any }) {
  const info = parseCarpetNote(item?.note);
  if (!info) return null;

  const Icon = info.type === 'roll' ? Layers : Scissors;
  const tone = info.type === 'roll'
    ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
    : 'bg-violet-100 text-violet-700 border-violet-200';

  return (
    <span className={`ml-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-extrabold ${tone}`}>
      <Icon className="h-2 w-2" />
      {info.reference}
    </span>
  );
}
