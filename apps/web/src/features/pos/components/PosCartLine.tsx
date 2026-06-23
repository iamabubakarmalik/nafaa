import {
  Package, Trash2, Edit3, Plus, Minus, Ruler, Tag, Smartphone, Layers,
  Scissors, Lock, Sparkles,
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
    item.priceOverride ??
    (item.useWholesale ? (item.wholesalePrice ?? item.basePrice) : item.basePrice);
  const lineTotal = unitPrice * item.quantity - (item.lineDiscount || 0);
  const canUseLW = LW_UNITS.has(item.unit) && !item.rollId && !item.cutPieceId;
  const isLocked = !!(item.imeiId || item.rollId || item.cutPieceId);
  const hasCustomPrice = item.priceOverride !== undefined && !item.rollId && !item.cutPieceId;
  const hasDiscount = (item.lineDiscount || 0) > 0;

  return (
    <div
      className={`rounded-2xl border-2 transition-all ${
        isEditing
          ? 'border-brand-500 bg-gradient-to-br from-brand-50/40 to-white shadow-lg shadow-brand-500/20'
          : item.rollId
          ? 'border-emerald-200 bg-emerald-50/30 hover:border-emerald-400'
          : item.cutPieceId
          ? 'border-violet-200 bg-violet-50/30 hover:border-violet-400'
          : item.imeiId
          ? 'border-blue-200 bg-blue-50/30 hover:border-blue-400'
          : 'border-slate-200 bg-white hover:border-brand-300 hover:shadow-sm'
      }`}
    >
      {/* Main row */}
      <div className="p-2.5 flex items-start gap-2">
        {/* Thumbnail */}
        <div className="h-11 w-11 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center shrink-0 relative ring-2 ring-white shadow-sm">
          {item.variantImage ? (
            <img src={item.variantImage} alt={item.name} className="h-full w-full object-cover" />
          ) : item.variantColorHex ? (
            <div className="h-full w-full" style={{ backgroundColor: item.variantColorHex }} />
          ) : (
            <Package className="h-5 w-5 text-slate-400" />
          )}
          {isLocked && (
            <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-slate-900 text-white flex items-center justify-center shadow ring-1 ring-white">
              <Lock className="h-2 w-2" />
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="font-extrabold text-slate-900 text-xs line-clamp-1 leading-tight">
            {item.name}
          </div>

          {item.variantName && (
            <div className="flex items-center gap-1 mt-0.5">
              {item.variantColorHex && (
                <span
                  className="h-2 w-2 rounded-full border border-white shadow-sm shrink-0"
                  style={{ backgroundColor: item.variantColorHex }}
                />
              )}
              <span className="text-[10px] font-extrabold text-violet-700 truncate">
                {item.variantName}
              </span>
            </div>
          )}

          {/* Carpet ROLL badge */}
          {item.rollId && item.rollNumber && (
            <div className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[9px] font-extrabold">
              <Layers className="h-2 w-2" />
              {item.rollNumber}
              {item.cutWidthFt && item.cutLengthFt && (
                <span className="font-bold opacity-80">
                  • {item.cutWidthFt}×{item.cutLengthFt}ft
                </span>
              )}
            </div>
          )}

          {/* Cut piece badge */}
          {item.cutPieceId && item.cutPieceCode && (
            <div className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-violet-100 text-violet-800 text-[9px] font-extrabold">
              <Scissors className="h-2 w-2" />
              Piece {item.cutPieceCode}
            </div>
          )}

          {/* IMEI badge */}
          {item.imeiNumber && (
            <div className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[9px] font-extrabold font-mono">
              <Smartphone className="h-2 w-2" />
              {item.imeiNumber}
            </div>
          )}

          {/* Price summary */}
          <div className="text-[10px] text-slate-500 mt-1 font-semibold tabular-nums">
            {hidePrices ? '••••' : formatPKR(unitPrice)} ×{' '}
            <span className="font-extrabold text-slate-700">
              {item.quantity.toFixed(item.quantity % 1 === 0 ? 0 : 2)}
            </span>{' '}
            <span className="text-slate-400">{item.unit}</span>
            {item.useWholesale && <span className="ml-1 text-amber-700 font-extrabold">W/S</span>}
            {hasCustomPrice && <span className="ml-1 text-blue-700 font-extrabold">CUSTOM</span>}
          </div>

          {/* Note */}
          {item.note && !item.imeiNumber && !item.rollId && !item.cutPieceId && (
            <div className="mt-1 inline-flex items-center gap-1 text-[9px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
              <Ruler className="h-2 w-2" />
              {item.note}
            </div>
          )}

          {/* Discount */}
          {hasDiscount && (
            <div className="mt-1 inline-flex items-center gap-1 text-[9px] text-rose-700 font-extrabold bg-rose-50 px-1.5 py-0.5 rounded">
              <Tag className="h-2 w-2" />
              -{formatPKR(item.lineDiscount)} discount
            </div>
          )}
        </div>

        {/* Total + actions */}
        <div className="text-right shrink-0">
          <div className="font-extrabold text-slate-900 text-sm tabular-nums">
            {hidePrices ? '••••' : formatPKR(lineTotal)}
          </div>
          <div className="flex gap-0.5 mt-1 justify-end">
            {!isLocked && (
              <button
                onClick={onToggleEdit}
                className={`h-6 w-6 rounded-md flex items-center justify-center transition ${
                  isEditing
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-slate-100 hover:bg-brand-100 text-slate-600 hover:text-brand-700'
                }`}
                title={isEditing ? 'Done editing' : 'Edit'}
              >
                <Edit3 className="h-3 w-3" />
              </button>
            )}
            <button
              onClick={onRemove}
              className="h-6 w-6 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition"
              title="Remove"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Quantity controls (only for unlocked items) */}
      {!isLocked && (
        <div className="px-2.5 pb-2 flex items-center justify-between gap-2">
          <div className="inline-flex items-center gap-1 bg-slate-100 rounded-lg p-0.5 shadow-inner">
            <button
              onClick={() => onSetQuantity(item.quantity - 1)}
              className="h-7 w-7 rounded-md bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 flex items-center justify-center transition shadow-sm"
            >
              <Minus className="h-3 w-3" />
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
              className="w-16 text-center font-extrabold text-xs bg-transparent border-0 focus:outline-none"
            />
            <button
              onClick={() => onSetQuantity(item.quantity + 1)}
              disabled={item.quantity >= item.stock}
              className="h-7 w-7 rounded-md bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white flex items-center justify-center transition shadow-sm"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>

          {canUseLW && (
            <button
              onClick={onOpenLW}
              className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-brand-600 to-emerald-600 hover:from-brand-700 hover:to-emerald-700 text-white text-[10px] font-extrabold inline-flex items-center gap-1 shadow-md shadow-brand-500/30 transition"
            >
              <Ruler className="h-3 w-3" />
              L×W Calc
            </button>
          )}
        </div>
      )}

      {/* Edit panel */}
      {isEditing && !isLocked && (
        <div className="border-t-2 border-brand-200 bg-brand-50/40 p-2.5 space-y-2 animate-in slide-in-from-top-2 duration-150">
          {item.wholesalePrice && (
            <label className="flex items-center justify-between gap-2 text-[10px] cursor-pointer bg-white rounded-lg px-2 py-1.5 border border-amber-200">
              <span className="font-extrabold text-amber-800 inline-flex items-center gap-1">
                <Tag className="h-3 w-3" />
                Use wholesale price ({formatPKR(item.wholesalePrice)})
              </span>
              <input
                type="checkbox"
                checked={item.useWholesale}
                onChange={(e) =>
                  onUpdate({ useWholesale: e.target.checked, priceOverride: undefined })
                }
                className="h-3.5 w-3.5 rounded text-amber-600"
              />
            </label>
          )}

          <div className="grid grid-cols-2 gap-1.5">
            <div>
              <label className="block text-[9px] font-extrabold text-slate-600 mb-0.5 uppercase tracking-wider">
                Custom price
              </label>
              <input
                type="number"
                step="0.01"
                placeholder={String(item.basePrice)}
                value={item.priceOverride ?? ''}
                onChange={(e) => {
                  const val = e.target.value === '' ? undefined : parseFloat(e.target.value);
                  onUpdate({ priceOverride: val });
                }}
                className="h-8 w-full rounded-md border-2 border-slate-200 px-2 text-xs font-extrabold focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-[9px] font-extrabold text-slate-600 mb-0.5 uppercase tracking-wider">
                Line discount
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={item.lineDiscount || ''}
                onChange={(e) => onUpdate({ lineDiscount: parseFloat(e.target.value) || 0 })}
                className="h-8 w-full rounded-md border-2 border-slate-200 px-2 text-xs font-extrabold focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <input
            type="text"
            value={item.note ?? ''}
            onChange={(e) => onUpdate({ note: e.target.value })}
            placeholder="Note (optional)"
            className="h-8 w-full rounded-md border-2 border-slate-200 px-2 text-xs focus:outline-none focus:border-brand-500"
          />

          <button
            onClick={onToggleEdit}
            className="w-full h-8 rounded-md bg-brand-600 hover:bg-brand-700 text-white text-[10px] font-extrabold inline-flex items-center justify-center gap-1 shadow-sm transition"
          >
            <Sparkles className="h-3 w-3" />
            Done Editing
          </button>
        </div>
      )}
    </div>
  );
}
