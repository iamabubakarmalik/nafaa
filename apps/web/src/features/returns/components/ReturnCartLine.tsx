import { Package, X, Plus, Minus, Layers, Scissors, AlertTriangle, Settings } from 'lucide-react';
import { formatPKR } from '@/lib/format';
import type { ReturnLine } from './return-types';

interface Props {
  line: ReturnLine;
  onQuantityChange: (qty: number) => void;
  onRemove: () => void;
  onConfigureCarpet?: () => void;
}

export function ReturnCartLine({
  line, onQuantityChange, onRemove, onConfigureCarpet,
}: Props) {
  const carpetMode = line.carpetOptions;
  const isDamaged = carpetMode?.isDamaged;
  const willCreatePiece = carpetMode?.createCutPiece;

  return (
    <div
      className={`rounded-xl border-2 p-3 transition ${
        line.isCarpet
          ? isDamaged
            ? 'border-rose-300 bg-rose-50/50'
            : willCreatePiece
              ? 'border-emerald-300 bg-emerald-50/50'
              : 'border-amber-300 bg-amber-50/50'
          : 'border-orange-200 bg-orange-50/50'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="h-11 w-11 rounded-xl bg-white overflow-hidden flex items-center justify-center shrink-0">
          {line.variantImage ? (
            <img src={line.variantImage} alt="" className="h-full w-full object-cover" />
          ) : line.variantColorHex ? (
            <div className="h-full w-full" style={{ backgroundColor: line.variantColorHex }} />
          ) : line.isCarpet ? (
            <Layers className="h-4 w-4 text-emerald-600" />
          ) : (
            <Package className="h-4 w-4 text-slate-400" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="font-bold text-slate-900 text-sm truncate">{line.productName}</div>
            {line.isCarpet && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-100 text-emerald-700">
                <Layers className="h-2.5 w-2.5" /> CARPET
              </span>
            )}
          </div>

          {line.variantName && (
            <div className="text-[11px] font-bold text-violet-700 flex items-center gap-1 mt-0.5">
              {line.variantColorHex && (
                <span
                  className="h-2 w-2 rounded-full border border-slate-300"
                  style={{ backgroundColor: line.variantColorHex }}
                />
              )}
              {line.variantName}
            </div>
          )}

          <div className="text-[11px] text-slate-600 mt-0.5">
            {formatPKR(line.price)} × {line.quantity.toFixed(line.quantity % 1 === 0 ? 0 : 2)} ={' '}
            <span className="font-extrabold text-rose-700">
              {formatPKR(line.price * line.quantity)}
            </span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Max returnable: {line.maxQty.toFixed(2)} {line.unit}
          </div>

          {/* Carpet action summary */}
          {line.isCarpet && carpetMode && (
            <div
              className={`mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                isDamaged
                  ? 'bg-rose-100 text-rose-700'
                  : willCreatePiece
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-amber-100 text-amber-700'
              }`}
            >
              {isDamaged ? (
                <>
                  <AlertTriangle className="h-2.5 w-2.5" /> Will create DAMAGED piece
                </>
              ) : willCreatePiece ? (
                <>
                  <Scissors className="h-2.5 w-2.5" /> Will create cut piece (
                  {carpetMode.cutPieceCondition})
                </>
              ) : (
                <>
                  <Layers className="h-2.5 w-2.5" /> No piece — manual adjustment
                </>
              )}
            </div>
          )}

          {/* Warning if carpet but no options set */}
          {line.isCarpet && !carpetMode && (
            <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-extrabold">
              <AlertTriangle className="h-2.5 w-2.5" /> Configure cut piece options first
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          {line.isCarpet && onConfigureCarpet && (
            <button
              onClick={onConfigureCarpet}
              className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold inline-flex items-center gap-1"
              title="Configure carpet return options"
            >
              <Settings className="h-3 w-3" />
              {carpetMode ? 'Edit' : 'Configure'}
            </button>
          )}
          <button
            onClick={onRemove}
            className="text-rose-600 hover:bg-rose-100 rounded-lg p-1.5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Quantity controls */}
      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={() => onQuantityChange(line.quantity - 1)}
          className="h-8 w-8 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 flex items-center justify-center"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <input
          type="number"
          step="0.01"
          min="0.01"
          max={line.maxQty}
          value={line.quantity}
          onChange={(e) => onQuantityChange(parseFloat(e.target.value) || 0.01)}
          className="flex-1 h-8 rounded-lg border border-slate-200 bg-white px-3 text-center text-sm font-bold focus:outline-none focus:border-orange-500"
        />
        <button
          onClick={() => onQuantityChange(line.quantity + 1)}
          disabled={line.quantity >= line.maxQty}
          className="h-8 w-8 rounded-lg bg-orange-600 hover:bg-orange-700 disabled:bg-slate-300 text-white flex items-center justify-center"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => onQuantityChange(line.maxQty)}
          className="px-2.5 h-8 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800 text-[10px] font-bold"
        >
          Max
        </button>
      </div>
    </div>
  );
}
