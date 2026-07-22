import { Package, Layers, Plus, CheckCircle2, Scissors } from 'lucide-react';
import { formatPKR } from '@/lib/format';
import { CARPET_UNITS, formatQty } from './return-types';

interface Props {
  item: any;
  alreadyAdded: boolean;
  onAdd: () => void;
}

export function SaleItemRow({ item, alreadyAdded, onAdd }: Props) {
  const remaining = item.quantity - (item.returnedQty || 0);
  const variant = item.variantLink?.variant;
  const isCarpet = CARPET_UNITS.has(item.product.unit);

  // Detect carpet sub-type from note
  const isRollCut = item.note?.startsWith('Cut from ');
  const isCutPiece = item.note?.startsWith('Cut piece ');

  return (
    <div
      className={`rounded-xl border-2 p-3 transition ${
        remaining <= 0
          ? 'border-slate-200 bg-slate-50 opacity-60'
          : alreadyAdded
            ? 'border-emerald-300 bg-emerald-50'
            : isCarpet
              ? 'border-emerald-200 bg-emerald-50/30 hover:border-emerald-400'
              : 'border-slate-200 bg-white hover:border-blue-300'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
          {variant?.imageUrl ? (
            <img src={variant.imageUrl} alt="" className="h-full w-full object-cover" />
          ) : variant?.colorHex ? (
            <div className="h-full w-full" style={{ backgroundColor: variant.colorHex }} />
          ) : isCarpet ? (
            <Layers className="h-4 w-4 text-emerald-600" />
          ) : (
            <Package className="h-4 w-4 text-slate-400" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="font-bold text-slate-900 text-sm truncate">
              {item.product.name}
            </div>
            {isCarpet && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-100 text-emerald-700">
                <Layers className="h-2.5 w-2.5" /> CARPET
              </span>
            )}
            {isRollCut && (
              <span className="text-[9px] font-bold text-emerald-700 font-mono">
                {item.note?.match(/Cut from ([\w-]+):/)?.[1]}
              </span>
            )}
            {isCutPiece && (
              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-violet-700">
                <Scissors className="h-2.5 w-2.5" />
                {item.note?.match(/Cut piece ([\w-]+)/)?.[1]}
              </span>
            )}
          </div>

          {variant && (
            <div className="text-[11px] font-bold text-violet-700 flex items-center gap-1 mt-0.5">
              {variant.colorHex && (
                <span
                  className="h-2 w-2 rounded-full border border-slate-300"
                  style={{ backgroundColor: variant.colorHex }}
                />
              )}
              {variant.name}
            </div>
          )}

          {/* Show carpet dimensions if available */}
          {isCarpet && item.note && (
            <div className="text-[10px] text-emerald-700 mt-0.5 font-bold italic line-clamp-1">
              {item.note}
            </div>
          )}

          <div className="text-[11px] text-slate-500 mt-0.5">
            Sold: {formatQty(item.quantity)} • Returned: {formatQty(item.returnedQty || 0)} •
            Available:{' '}
            <span className="font-bold text-emerald-700">{formatQty(remaining)}</span>{' '}
            {item.product.unit}
          </div>
          <div className="text-[11px] font-bold text-emerald-700 mt-0.5">
            {formatPKR(item.price)} / {item.product.unit}
            {isCarpet && ' (will resell at 80% as cut piece)'}
          </div>
        </div>

        <button
          disabled={remaining <= 0 || alreadyAdded}
          onClick={onAdd}
          className={`text-xs px-3 py-1.5 rounded-lg font-bold shrink-0 transition ${
            alreadyAdded
              ? 'bg-emerald-100 text-emerald-700 cursor-default inline-flex items-center gap-1'
              : remaining <= 0
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : isCarpet
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white inline-flex items-center gap-1'
                  : 'bg-blue-600 hover:bg-blue-700 text-white inline-flex items-center gap-1'
          }`}
        >
          {alreadyAdded ? (
            <>
              <CheckCircle2 className="h-3 w-3" /> Added
            </>
          ) : remaining <= 0 ? (
            'Fully Returned'
          ) : (
            <>
              <Plus className="h-3 w-3" />
              {isCarpet ? 'Configure' : 'Add'}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
