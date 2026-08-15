import { Package, Layers, Plus, CheckCircle2, Scissors, Settings } from 'lucide-react';
import { formatPKR } from '@core/lib/format';
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
  const returnPct = item.quantity > 0 ? ((item.returnedQty || 0) / item.quantity) * 100 : 0;

  // Detect carpet sub-type from note
  const isRollCut = item.note?.startsWith('Cut from ');
  const isCutPiece = item.note?.startsWith('Cut piece ');
  const rollNumber = isRollCut ? item.note?.match(/Cut from ([\w-]+):/)?.[1] : null;
  const pieceCode = isCutPiece ? item.note?.match(/Cut piece ([\w-]+)/)?.[1] : null;

  return (
    <div
      className={`rounded-xl border-2 p-3 transition ${
        remaining <= 0
          ? 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 opacity-60'
          : alreadyAdded
            ? 'border-emerald-300 dark:border-emerald-500/50 bg-emerald-50 dark:bg-emerald-500/10 shadow-sm shadow-emerald-500/20'
            : isCarpet
              ? 'border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/30 dark:bg-emerald-500/5 hover:border-emerald-400 dark:hover:border-emerald-500/60 hover:shadow-md'
              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 hover:border-blue-300 dark:hover:border-blue-500/50 hover:shadow-md'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-xl bg-slate-100 dark:bg-slate-700 overflow-hidden flex items-center justify-center shrink-0 shadow-sm">
          {variant?.imageUrl ? (
            <img src={variant.imageUrl} alt="" className="h-full w-full object-cover" />
          ) : variant?.colorHex ? (
            <div className="h-full w-full" style={{ backgroundColor: variant.colorHex }} />
          ) : isCarpet ? (
            <Layers className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <Package className="h-4 w-4 text-slate-400" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="font-extrabold text-slate-900 dark:text-white text-sm truncate">
              {item.product.name}
            </div>
            {isCarpet && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40">
                <Layers className="h-2.5 w-2.5" /> CARPET
              </span>
            )}
            {rollNumber && (
              <span className="text-[9px] font-extrabold text-emerald-700 dark:text-emerald-400 font-mono bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-500/30">
                🧵 {rollNumber}
              </span>
            )}
            {pieceCode && (
              <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-500/10 px-1.5 py-0.5 rounded border border-violet-200 dark:border-violet-500/30">
                <Scissors className="h-2.5 w-2.5" />
                {pieceCode}
              </span>
            )}
          </div>

          {variant && (
            <div className="text-[11px] font-bold text-violet-700 dark:text-violet-300 flex items-center gap-1 mt-0.5">
              {variant.colorHex && (
                <span
                  className="h-2 w-2 rounded-full border border-slate-300 dark:border-slate-600"
                  style={{ backgroundColor: variant.colorHex }}
                />
              )}
              {variant.name}
            </div>
          )}

          {/* Carpet dimensions if in note */}
          {isCarpet && item.note && (
            <div className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-0.5 font-bold italic line-clamp-1">
              {item.note}
            </div>
          )}

          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-semibold">
            Sold: {formatQty(item.quantity)} · Returned: {formatQty(item.returnedQty || 0)} ·
            Available:{' '}
            <span className="font-extrabold text-emerald-700 dark:text-emerald-400">
              {formatQty(remaining)}
            </span>{' '}
            {item.product.unit}
          </div>

          {/* Return progress bar (only if partial returns) */}
          {returnPct > 0 && returnPct < 100 && (
            <div className="mt-1">
              <div className="h-1 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-orange-600 transition-all"
                  style={{ width: `${returnPct}%` }}
                />
              </div>
              <div className="text-[9px] text-amber-700 dark:text-amber-400 font-extrabold mt-0.5">
                {returnPct.toFixed(0)}% already returned
              </div>
            </div>
          )}

          <div className="text-[11px] font-extrabold text-emerald-700 dark:text-emerald-400 mt-0.5">
            {formatPKR(item.price)} / {item.product.unit}
            {isCarpet && (
              <span className="text-slate-500 dark:text-slate-400 font-semibold italic">
                {' '}(resell as 80% cut piece)
              </span>
            )}
          </div>
        </div>

        <button
          disabled={remaining <= 0 || alreadyAdded}
          onClick={onAdd}
          className={`text-xs px-3 py-1.5 rounded-lg font-extrabold shrink-0 transition shadow-sm ${
            alreadyAdded
              ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 cursor-default inline-flex items-center gap-1 border border-emerald-300 dark:border-emerald-500/40'
              : remaining <= 0
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                : isCarpet
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white inline-flex items-center gap-1 shadow-emerald-500/30'
                  : 'bg-blue-600 hover:bg-blue-700 text-white inline-flex items-center gap-1 shadow-blue-500/30'
          }`}
        >
          {alreadyAdded ? (
            <>
              <CheckCircle2 className="h-3 w-3" /> Added
            </>
          ) : remaining <= 0 ? (
            'Fully Returned'
          ) : isCarpet ? (
            <>
              <Settings className="h-3 w-3" /> Configure
            </>
          ) : (
            <>
              <Plus className="h-3 w-3" /> Add
            </>
          )}
        </button>
      </div>
    </div>
  );
}
