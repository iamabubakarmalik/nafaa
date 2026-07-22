import { Layers, Scissors } from 'lucide-react';
import { parseCarpetNote } from '../utils/parseCarpetNote';

/**
 * Extra content shown under each receipt item for carpet sales:
 *   • Roll number the piece was cut from
 *   • Cut dimensions (width × length)
 *   • Sqft total
 *   • Custom per-sqft rate (if different from base)
 *
 * If the sale item isn\'t a carpet roll/piece, renders nothing.
 */
export function CarpetReceiptItemDetails({ item }: { item: any }) {
  const info = parseCarpetNote(item?.note);
  if (!info) return null;

  if (info.type === 'roll') {
    return (
      <div className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-[10px] font-bold text-emerald-800 print:bg-white print:border-slate-400">
        <Layers className="h-2.5 w-2.5" />
        Cut from <span className="font-mono">{info.reference}</span>
        {info.dimensions && <span>• {info.dimensions}</span>}
        {info.area && <span>= {info.area}</span>}
        {info.customRate && <span className="text-blue-700">• {info.customRate}</span>}
      </div>
    );
  }

  return (
    <div className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-violet-50 border border-violet-200 text-[10px] font-bold text-violet-800 print:bg-white print:border-slate-400">
      <Scissors className="h-2.5 w-2.5" />
      Piece <span className="font-mono">{info.reference}</span>
      {info.dimensions && <span>• {info.dimensions}</span>}
    </div>
  );
}
