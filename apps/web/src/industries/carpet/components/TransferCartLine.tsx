import { useState } from 'react';
import {
  Package, Trash2, Layers, Ruler, MapPin, Plus, ChevronDown, ChevronUp, AlertTriangle,
} from 'lucide-react';
import type { CarpetRoll } from '@industries/carpet/api/carpet-rolls.api';

export interface TransferLineItem {
  productId: string;
  productName: string;
  unit: string;
  quantity: number;
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

  const carpetTotalSqft = line.isCarpet
    ? line.rolls.reduce((s, r) => s + Number(r.remainingSqft), 0)
    : 0;

  return (
    <div className="rounded-xl border-2 border-slate-200 bg-white overflow-hidden hover:shadow-sm transition">
      <div className="p-3 flex items-center gap-3">
        <div className={`h-11 w-11 rounded-lg flex items-center justify-center shrink-0 ${
          line.isCarpet ? 'bg-gradient-to-br from-emerald-100 to-emerald-200 text-emerald-700' : 'bg-gradient-to-br from-cyan-100 to-cyan-200 text-cyan-700'
        }`}>
          {line.isCarpet ? <Layers className="h-5 w-5" /> : <Package className="h-5 w-5" />}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="font-extrabold text-slate-900 text-base truncate">{line.productName}</div>
            {line.isCarpet && (
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-700">
                <Layers className="h-2.5 w-2.5" /> CARPET
              </span>
            )}
          </div>
          <div className="text-sm text-slate-500 font-semibold">
            {line.isCarpet
              ? `${line.rolls.length} roll${line.rolls.length !== 1 ? 's' : ''} • ${carpetTotalSqft.toFixed(2)} sqft total`
              : `${line.quantity} ${line.unit}`}
          </div>
        </div>

        {!line.isCarpet && onQuantityChange && (
          <input type="number" step="0.01" min="0.01" value={line.quantity}
            onChange={(e) => onQuantityChange(parseFloat(e.target.value) || 0)}
            className="w-24 h-10 rounded-lg border-2 border-slate-200 px-2 text-base font-extrabold text-center focus:outline-none focus:border-cyan-500" />
        )}

        {line.isCarpet && (
          <button onClick={() => setExpanded((v) => !v)}
            className="h-10 px-3 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-xs font-extrabold inline-flex items-center gap-1">
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {line.rolls.length} rolls
          </button>
        )}

        <button onClick={onRemove}
          className="h-10 w-10 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {line.isCarpet && expanded && (
        <div className="border-t-2 border-slate-200 bg-emerald-50/30 p-3 space-y-2">
          {line.rolls.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-emerald-200 p-4 text-center">
              <AlertTriangle className="h-7 w-7 text-amber-500 mx-auto mb-1" />
              <div className="text-sm font-extrabold text-slate-700">No rolls selected</div>
              <div className="text-xs text-slate-500 mt-1 font-semibold">Carpet transfer ke liye rolls select karna zaroori hai</div>
            </div>
          ) : (
            line.rolls.map((roll) => {
              const fullWidth = Number(roll.widthFt) + Number(roll.widthInch || 0) / 12;
              return (
                <div key={roll.id} className="rounded-lg bg-white border-2 border-emerald-200 p-3 flex items-center gap-2 hover:border-emerald-300 transition">
                  <div className="h-9 w-9 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <Layers className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-extrabold text-sm text-slate-900">{roll.rollNumber}</span>
                      {roll.variant && (
                        <span className="text-xs font-extrabold text-violet-700 flex items-center gap-0.5">
                          {roll.variant.colorHex && (
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: roll.variant.colorHex }} />
                          )}
                          {roll.variant.name}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-600 font-bold flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="inline-flex items-center gap-0.5">
                        <Ruler className="h-3 w-3" />
                        {fullWidth.toFixed(2)}ft × {Number(roll.remainingLengthFt).toFixed(1)}ft
                      </span>
                      {roll.rackNumber && (
                        <span className="inline-flex items-center gap-0.5 text-slate-500">
                          <MapPin className="h-3 w-3" />
                          {roll.rackNumber}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-extrabold text-emerald-700 text-base tabular-nums">
                      {Number(roll.remainingSqft).toFixed(0)}
                    </div>
                    <div className="text-[10px] font-extrabold text-emerald-700">sqft</div>
                  </div>
                  {onRemoveRoll && (
                    <button onClick={() => onRemoveRoll(roll.id)}
                      className="h-7 w-7 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center shrink-0"
                      title="Remove roll">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              );
            })
          )}

          {onAddMoreRolls && (
            <button onClick={onAddMoreRolls}
              className="w-full h-10 rounded-lg border-2 border-dashed border-emerald-300 hover:border-emerald-500 hover:bg-emerald-50 text-emerald-700 text-sm font-extrabold inline-flex items-center justify-center gap-1.5 transition">
              <Plus className="h-4 w-4" />
              Add more rolls
            </button>
          )}

          {line.rolls.length > 0 && (
            <div className="pt-2 border-t-2 border-emerald-200 flex items-center justify-between text-sm">
              <span className="font-extrabold text-emerald-900">
                Total: {line.rolls.length} roll{line.rolls.length !== 1 ? 's' : ''}
              </span>
              <span className="font-extrabold text-emerald-700 text-base tabular-nums">
                {carpetTotalSqft.toFixed(2)} sqft
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
