import { useState } from 'react';
import {
  Package, Trash2, Layers, Ruler, MapPin, Plus, ChevronDown, ChevronUp, AlertTriangle,
} from 'lucide-react';
import type { CarpetRoll } from '@/features/industries/carpet/api/carpet-rolls.api';
import { formatPKR } from '@/lib/format';

export interface TransferLineItem {
  productId: string;
  productName: string;
  unit: string;
  quantity: number;
  /** Carpet products: each line carries a list of selected rolls */
  isCarpet: boolean;
  rolls: CarpetRoll[];
  variantId?: string;
  notes?: string;
}

interface Props {
  line: TransferLineItem;
  onQuantityChange?: (qty: number) => void;
  onRemove: () => void;
  onAddMoreRolls?: () => void;
  onRemoveRoll?: (rollId: string) => void;
}

export function TransferCartLine({
  line, onQuantityChange, onRemove, onAddMoreRolls, onRemoveRoll,
}: Props) {
  const [expanded, setExpanded] = useState(line.isCarpet);

  // For carpet: total sqft from selected rolls
  const carpetTotalSqft = line.isCarpet
    ? line.rolls.reduce((s, r) => s + Number(r.remainingSqft), 0)
    : 0;

  return (
    <div className="rounded-xl border-2 border-slate-200 bg-white overflow-hidden">
      {/* Main row */}
      <div className="p-3 flex items-center gap-3">
        <div
          className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
            line.isCarpet ? 'bg-emerald-100 text-emerald-700' : 'bg-cyan-100 text-cyan-700'
          }`}
        >
          {line.isCarpet ? <Layers className="h-5 w-5" /> : <Package className="h-5 w-5" />}
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
          <div className="text-xs text-slate-500">
            {line.isCarpet
              ? `${line.rolls.length} roll${line.rolls.length !== 1 ? 's' : ''} • ${carpetTotalSqft.toFixed(2)} sqft total`
              : `${line.quantity} ${line.unit}`}
          </div>
        </div>

        {/* Quantity input for non-carpet */}
        {!line.isCarpet && onQuantityChange && (
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={line.quantity}
            onChange={(e) => onQuantityChange(parseFloat(e.target.value) || 0)}
            className="w-24 h-9 rounded-lg border-2 border-slate-200 px-2 text-sm font-bold text-center focus:outline-none focus:border-cyan-500"
          />
        )}

        {/* Carpet expand toggle */}
        {line.isCarpet && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="h-9 px-2.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[11px] font-bold inline-flex items-center gap-1"
          >
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {line.rolls.length} rolls
          </button>
        )}

        <button
          onClick={onRemove}
          className="h-9 w-9 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center shrink-0"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Carpet rolls expanded list */}
      {line.isCarpet && expanded && (
        <div className="border-t border-slate-200 bg-emerald-50/30 p-3 space-y-2">
          {line.rolls.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-emerald-200 p-4 text-center">
              <AlertTriangle className="h-6 w-6 text-amber-500 mx-auto mb-1" />
              <div className="text-xs font-bold text-slate-700">No rolls selected</div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                Carpet transfer ke liye rolls select karna zaroori hai
              </div>
            </div>
          ) : (
            line.rolls.map((roll) => {
              const fullWidth = Number(roll.widthFt) + Number(roll.widthInch || 0) / 12;
              return (
                <div
                  key={roll.id}
                  className="rounded-lg bg-white border border-emerald-200 p-2.5 flex items-center gap-2"
                >
                  <div className="h-8 w-8 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <Layers className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-extrabold text-xs text-slate-900">
                        {roll.rollNumber}
                      </span>
                      {roll.variant && (
                        <span className="text-[10px] font-bold text-violet-700 flex items-center gap-0.5">
                          {roll.variant.colorHex && (
                            <span
                              className="h-1.5 w-1.5 rounded-full"
                              style={{ backgroundColor: roll.variant.colorHex }}
                            />
                          )}
                          {roll.variant.name}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-600 font-bold flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="inline-flex items-center gap-0.5">
                        <Ruler className="h-2.5 w-2.5" />
                        {fullWidth.toFixed(2)}ft × {Number(roll.remainingLengthFt).toFixed(1)}ft
                      </span>
                      {roll.rackNumber && (
                        <span className="inline-flex items-center gap-0.5 text-slate-500">
                          <MapPin className="h-2.5 w-2.5" />
                          {roll.rackNumber}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-extrabold text-emerald-700 text-sm">
                      {Number(roll.remainingSqft).toFixed(0)}
                    </div>
                    <div className="text-[9px] font-bold text-emerald-700">sqft</div>
                  </div>
                  {onRemoveRoll && (
                    <button
                      onClick={() => onRemoveRoll(roll.id)}
                      className="h-6 w-6 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center shrink-0"
                      title="Remove roll"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              );
            })
          )}

          {onAddMoreRolls && (
            <button
              onClick={onAddMoreRolls}
              className="w-full h-9 rounded-lg border-2 border-dashed border-emerald-300 hover:border-emerald-500 hover:bg-emerald-50 text-emerald-700 text-xs font-bold inline-flex items-center justify-center gap-1.5 transition"
            >
              <Plus className="h-3.5 w-3.5" />
              Add more rolls
            </button>
          )}

          {/* Summary footer */}
          {line.rolls.length > 0 && (
            <div className="pt-2 border-t border-emerald-200 flex items-center justify-between text-xs">
              <span className="font-bold text-emerald-900">
                Total: {line.rolls.length} roll{line.rolls.length !== 1 ? 's' : ''}
              </span>
              <span className="font-extrabold text-emerald-700">
                {carpetTotalSqft.toFixed(2)} sqft
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
