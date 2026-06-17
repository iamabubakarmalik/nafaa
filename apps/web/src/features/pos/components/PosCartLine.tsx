import {
  Package, Trash2, Edit3, Plus, Minus, Ruler, Tag, Smartphone, Layers, Scissors,
} from 'lucide-react';
import { formatPKR } from '@/lib/format';
import type { CartItem } from './pos-types';
import { LW_UNITS } from './pos-types';

interface Props {
  item: CartItem;
  isEditing: boolean;
  hidePrices: boolean;
  onToggleEdit: () => void;
  onRemove: () => void;
  onUpdate: (patch: Partial<CartItem>) => void;
  onSetQuantity: (qty: number) => void;
  onOpenLW: () => void;
}

export function PosCartLine({
  item, isEditing, hidePrices, onToggleEdit, onRemove, onUpdate, onSetQuantity, onOpenLW,
}: Props) {
  const unitPrice =
    item.priceOverride ?? (item.useWholesale ? (item.wholesalePrice ?? item.basePrice) : item.basePrice);
  const lineTotal = unitPrice * item.quantity - (item.lineDiscount || 0);
  const canUseLW = LW_UNITS.has(item.unit) && !item.rollId && !item.cutPieceId;
  const isLocked = !!(item.imeiId || item.rollId || item.cutPieceId);

  return (
    <div
      className={`rounded-xl border transition ${
        isEditing
          ? 'border-brand-400 bg-brand-50/40 shadow'
          : 'border-slate-200 bg-white hover:border-brand-300'
      }`}
    >
      <div className="p-2 flex items-start gap-2">
        <div className="h-10 w-10 rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
          {item.variantImage ? (
            <img src={item.variantImage} alt={item.name} className="h-full w-full object-cover" />
          ) : item.variantColorHex ? (
            <div className="h-full w-full" style={{ backgroundColor: item.variantColorHex }} />
          ) : (
            <Package className="h-4 w-4 text-slate-400" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-bold text-slate-900 text-xs line-clamp-1">{item.name}</div>

          {item.variantName && (
            <div className="flex items-center gap-1 mt-0.5">
              {item.variantColorHex && (
                <span
                  className="h-2 w-2 rounded-full border border-slate-300"
                  style={{ backgroundColor: item.variantColorHex }}
                />
              )}
              <span className="text-[10px] font-semibold text-violet-700">{item.variantName}</span>
            </div>
          )}

          {/* Carpet ROLL badge */}
          {item.rollId && item.rollNumber && (
            <div className="text-[10px] text-emerald-700 mt-0.5 font-mono font-bold inline-flex items-center gap-1">
              <Layers className="h-2.5 w-2.5" />
              Cut from {item.rollNumber}
              {item.cutWidthFt && item.cutLengthFt && (
                <span className="text-emerald-600 font-bold">
                  • {item.cutWidthFt}ft × {item.cutLengthFt}ft
                </span>
              )}
            </div>
          )}

          {/* Carpet CUT PIECE badge */}
          {item.cutPieceId && item.cutPieceCode && (
            <div className="text-[10px] text-violet-700 mt-0.5 font-mono font-bold inline-flex items-center gap-1">
              <Scissors className="h-2.5 w-2.5" />
              Piece {item.cutPieceCode}
            </div>
          )}

          {/* IMEI badge */}
          {item.imeiNumber && (
            <div className="text-[10px] text-blue-700 mt-0.5 font-mono font-bold inline-flex items-center gap-1">
              <Smartphone className="h-2.5 w-2.5" />
              {item.imeiNumber}
            </div>
          )}

          <div className="text-[10px] text-slate-500 mt-0.5">
            {hidePrices ? '••••' : formatPKR(unitPrice)} ×{' '}
            {item.quantity.toFixed(item.quantity % 1 === 0 ? 0 : 2)} {item.unit}
            {item.useWholesale && <span className="ml-1 text-amber-700 font-bold">(W)</span>}
            {item.priceOverride !== undefined && !item.rollId && !item.cutPieceId && (
              <span className="ml-1 text-blue-700 font-bold">(Custom)</span>
            )}
          </div>

          {item.note && !item.imeiNumber && !item.rollId && !item.cutPieceId && (
            <div className="text-[9px] text-emerald-700 mt-0.5 font-semibold flex items-center gap-1">
              <Ruler className="h-2 w-2" />
              {item.note}
            </div>
          )}

          {item.lineDiscount > 0 && (
            <div className="text-[9px] text-rose-600 mt-0.5 font-semibold inline-flex items-center gap-1">
              <Tag className="h-2 w-2" />-{formatPKR(item.lineDiscount)}
            </div>
          )}
        </div>

        <div className="text-right shrink-0">
          <div className="font-extrabold text-slate-900 text-xs">
            {hidePrices ? '••••' : formatPKR(lineTotal)}
          </div>
          <div className="flex gap-0.5 mt-1 justify-end">
            {!isLocked && (
              <button
                onClick={onToggleEdit}
                className={`h-5 w-5 rounded-md flex items-center justify-center transition ${
                  isEditing
                    ? 'bg-brand-600 text-white'
                    : 'bg-slate-100 hover:bg-brand-100 text-slate-600 hover:text-brand-700'
                }`}
              >
                <Edit3 className="h-2.5 w-2.5" />
              </button>
            )}
            <button
              onClick={onRemove}
              className="h-5 w-5 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center"
            >
              <Trash2 className="h-2.5 w-2.5" />
            </button>
          </div>
        </div>
      </div>

      {!isLocked && (
        <div className="px-2 pb-2 flex items-center justify-between gap-2">
          <div className="inline-flex items-center gap-1 bg-slate-50 rounded-lg p-0.5">
            <button
              onClick={() => onSetQuantity(item.quantity - 1)}
              className="h-6 w-6 rounded-md bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center"
            >
              <Minus className="h-2.5 w-2.5" />
            </button>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={item.quantity}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val) && val > 0 && val <= item.stock) onUpdate({ quantity: val });
              }}
              className="w-14 text-center font-bold text-xs bg-transparent border-0 focus:outline-none"
            />
            <button
              onClick={() => onSetQuantity(item.quantity + 1)}
              disabled={item.quantity >= item.stock}
              className="h-6 w-6 rounded-md bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white flex items-center justify-center"
            >
              <Plus className="h-2.5 w-2.5" />
            </button>
          </div>

          {canUseLW && (
            <button
              onClick={onOpenLW}
              className="px-2 py-0.5 rounded-md bg-gradient-to-r from-brand-600 to-emerald-600 text-white text-[9px] font-bold inline-flex items-center gap-1 shadow-sm"
            >
              <Ruler className="h-2.5 w-2.5" />
              L×W
            </button>
          )}
        </div>
      )}

      {isEditing && !isLocked && (
        <div className="border-t border-brand-200 bg-brand-50/30 p-2 space-y-1.5">
          {item.wholesalePrice && (
            <label className="flex items-center justify-between gap-2 text-[10px] cursor-pointer">
              <span className="font-bold text-slate-700">Use wholesale</span>
              <input
                type="checkbox"
                checked={item.useWholesale}
                onChange={(e) => onUpdate({ useWholesale: e.target.checked, priceOverride: undefined })}
                className="h-3 w-3 rounded"
              />
            </label>
          )}

          <div className="grid grid-cols-2 gap-1.5">
            <div>
              <label className="block text-[9px] font-bold text-slate-600 mb-0.5">Custom price</label>
              <input
                type="number"
                step="0.01"
                placeholder={String(item.basePrice)}
                value={item.priceOverride ?? ''}
                onChange={(e) => {
                  const val = e.target.value === '' ? undefined : parseFloat(e.target.value);
                  onUpdate({ priceOverride: val });
                }}
                className="h-7 w-full rounded-md border border-slate-200 px-1.5 text-xs font-bold"
              />
            </div>
            <div>
              <label className="block text-[9px] font-bold text-slate-600 mb-0.5">Line discount</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={item.lineDiscount || ''}
                onChange={(e) => onUpdate({ lineDiscount: parseFloat(e.target.value) || 0 })}
                className="h-7 w-full rounded-md border border-slate-200 px-1.5 text-xs font-bold"
              />
            </div>
          </div>

          <input
            type="text"
            value={item.note ?? ''}
            onChange={(e) => onUpdate({ note: e.target.value })}
            placeholder="Note (optional)"
            className="h-7 w-full rounded-md border border-slate-200 px-1.5 text-xs"
          />

          <button
            onClick={onToggleEdit}
            className="w-full h-7 rounded-md bg-brand-600 hover:bg-brand-700 text-white text-[10px] font-bold"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}
