import { useState, useEffect } from 'react';
import {
  Package, Trash2, Edit3, Plus, Minus, Ruler, Tag, Smartphone, Layers,
  Scissors, Lock, Sparkles, StickyNote, EyeOff, MessageSquare, X,
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

// ─── Split note into system-generated part vs user-added part ───
const SYSTEM_NOTE_PATTERNS = [
  /^Cut from [\w-]+:.*$/,
  /^Cut piece [\w-]+.*$/,
  /^IMEI: .*$/,
];

function splitNote(note?: string): { systemNote: string; userNote: string } {
  if (!note) return { systemNote: '', userNote: '' };
  const parts = note.split(' | ');
  if (parts.length >= 2) {
    return { systemNote: parts[0].trim(), userNote: parts.slice(1).join(' | ').trim() };
  }
  const trimmed = note.trim();
  const isSystem = SYSTEM_NOTE_PATTERNS.some((rx) => rx.test(trimmed));
  return isSystem
    ? { systemNote: trimmed, userNote: '' }
    : { systemNote: '', userNote: trimmed };
}

function joinNote(systemNote: string, userNote: string): string | undefined {
  const s = systemNote.trim();
  const u = userNote.trim();
  if (s && u) return `${s} | ${u}`;
  if (s) return s;
  if (u) return u;
  return undefined;
}

export function PosCartLine({
  item, isEditing, hidePrices, onToggleEdit, onRemove, onUpdate, onSetQuantity, onOpenLW,
}: Props) {
  const [notesOpen, setNotesOpen] = useState(false);

  const unitPrice =
    item.priceOverride ??
    (item.useWholesale ? (item.wholesalePrice ?? item.basePrice) : item.basePrice);
  const lineTotal = unitPrice * item.quantity - (item.lineDiscount || 0);
  const canUseLW = LW_UNITS.has(item.unit) && !item.rollId && !item.cutPieceId;
  const isLocked = !!(item.imeiId || item.rollId || item.cutPieceId);
  const hasCustomPrice = item.priceOverride !== undefined;
  const hasDiscount = (item.lineDiscount || 0) > 0;

  // Split customer-facing note
  const { systemNote, userNote } = splitNote(item.note);
  const hasUserNote = !!userNote;
  const hasInternalNote = !!(item.internalNote && item.internalNote.trim());

  const [userNoteDraft, setUserNoteDraft] = useState(userNote);
  const [internalNoteDraft, setInternalNoteDraft] = useState(item.internalNote ?? '');

  useEffect(() => { setUserNoteDraft(userNote); }, [userNote]);
  useEffect(() => { setInternalNoteDraft(item.internalNote ?? ''); }, [item.internalNote]);

  const saveUserNote = (next: string) => {
    setUserNoteDraft(next);
    onUpdate({ note: joinNote(systemNote, next) });
  };

  const saveInternalNote = (next: string) => {
    setInternalNoteDraft(next);
    onUpdate({ internalNote: next.trim() ? next : undefined });
  };

  return (
    <div
      className={`rounded-2xl border-2 transition-all ${
        isEditing
          ? 'border-brand-500 bg-gradient-to-br from-brand-50/40 to-white shadow-lg shadow-brand-500/20'
          : notesOpen
          ? 'border-amber-400 bg-amber-50/40 shadow-md'
          : item.rollId
          ? 'border-emerald-200 bg-emerald-50/30 hover:border-emerald-400'
          : item.cutPieceId
          ? 'border-violet-200 bg-violet-50/30 hover:border-violet-400'
          : item.imeiId
          ? 'border-blue-200 bg-blue-50/30 hover:border-blue-400'
          : hasUserNote || hasInternalNote
          ? 'border-amber-200 bg-amber-50/20 hover:border-amber-400'
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

          {item.rollId && item.rollNumber && (
            <div className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[9px] font-extrabold">
              <Layers className="h-2 w-2" />
              {item.rollNumber}
              {item.cutWidthFt && item.cutLengthFt && (
                <span className="font-bold opacity-80">
                  • {item.cutWidthFt}×{item.cutLengthFt}ft{Number(item.cutLengthInch || 0) > 0 ? ` ${item.cutLengthInch}in` : ''}
                </span>
              )}
            </div>
          )}

          {item.cutPieceId && item.cutPieceCode && (
            <div className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-violet-100 text-violet-800 text-[9px] font-extrabold">
              <Scissors className="h-2 w-2" />
              Piece {item.cutPieceCode}
            </div>
          )}

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

          {/* Customer note preview */}
          {hasUserNote && !notesOpen && (
            <div className="mt-1.5 flex items-start gap-1.5 rounded-md bg-amber-100 border border-amber-300 px-1.5 py-1">
              <MessageSquare className="h-2.5 w-2.5 text-amber-700 shrink-0 mt-0.5" />
              <div className="flex-1 text-[10px] font-bold text-amber-900 leading-snug line-clamp-2">
                {userNote}
              </div>
            </div>
          )}

          {/* Internal note preview */}
          {hasInternalNote && !notesOpen && (
            <div className="mt-1 flex items-start gap-1.5 rounded-md bg-slate-100 border border-slate-300 px-1.5 py-1">
              <EyeOff className="h-2.5 w-2.5 text-slate-600 shrink-0 mt-0.5" />
              <div className="flex-1 text-[10px] font-bold text-slate-700 leading-snug line-clamp-2 italic">
                {item.internalNote}
              </div>
            </div>
          )}

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
          <div className="flex gap-0.5 mt-1 justify-end flex-wrap">
            {/* Notes button — ALWAYS visible */}
            <button
              onClick={() => setNotesOpen((v) => !v)}
              className={`h-6 w-6 rounded-md flex items-center justify-center transition relative ${
                notesOpen || hasUserNote || hasInternalNote
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200'
              }`}
              title="Notes (customer + internal)"
            >
              <StickyNote className="h-3 w-3" />
              {(hasUserNote || hasInternalNote) && !notesOpen && (
                <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-amber-600 border border-white" />
              )}
            </button>
            {/* Edit button — NOW visible for ALL items (rate/discount edit) */}
            <button
              onClick={onToggleEdit}
              className={`h-6 w-6 rounded-md flex items-center justify-center transition ${
                isEditing
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-brand-100 text-slate-600 hover:text-brand-700'
              }`}
              title={isEditing ? 'Done editing' : 'Edit price / discount'}
            >
              <Edit3 className="h-3 w-3" />
            </button>
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

      {/* ─── NOTES PANEL (2 notes side-by-side) ─── */}
      {notesOpen && (
        <div className="px-2.5 pb-2 -mt-1 space-y-2">
          {/* Customer Note */}
          <div className="rounded-lg bg-amber-50 border-2 border-amber-300 p-2 space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[9px] font-extrabold uppercase tracking-wider text-amber-800 flex items-center gap-1">
                <MessageSquare className="h-2.5 w-2.5" />
                Customer Note (prints on receipt)
              </label>
              {userNoteDraft.trim() && (
                <button
                  onClick={() => saveUserNote('')}
                  className="text-[9px] font-extrabold text-rose-600 hover:text-rose-800 inline-flex items-center gap-0.5"
                >
                  <X className="h-2.5 w-2.5" /> Clear
                </button>
              )}
            </div>
            <textarea
              value={userNoteDraft}
              onChange={(e) => saveUserNote(e.target.value)}
              rows={2}
              placeholder='e.g. "1 piece damage tha, discount de dia", "customer VIP"'
              className="w-full rounded-md border-2 border-amber-200 px-2 py-1.5 text-xs font-bold bg-white focus:outline-none focus:border-amber-500 resize-none"
            />
          </div>

          {/* Internal / Team Note */}
          <div className="rounded-lg bg-slate-100 border-2 border-slate-300 p-2 space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[9px] font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1">
                <EyeOff className="h-2.5 w-2.5" />
                Internal Note (team-only, NOT on receipt)
              </label>
              {internalNoteDraft.trim() && (
                <button
                  onClick={() => saveInternalNote('')}
                  className="text-[9px] font-extrabold text-rose-600 hover:text-rose-800 inline-flex items-center gap-0.5"
                >
                  <X className="h-2.5 w-2.5" /> Clear
                </button>
              )}
            </div>
            <textarea
              value={internalNoteDraft}
              onChange={(e) => saveInternalNote(e.target.value)}
              rows={2}
              placeholder='Team ke liye: "regular customer, next time bhi same rate", "supplier ne special discount diya"'
              className="w-full rounded-md border-2 border-slate-200 px-2 py-1.5 text-xs font-bold bg-white focus:outline-none focus:border-slate-500 resize-none"
            />
          </div>

          <button
            onClick={() => setNotesOpen(false)}
            className="w-full h-7 rounded-md bg-slate-800 hover:bg-slate-900 text-white text-[10px] font-extrabold transition"
          >
            Done
          </button>
        </div>
      )}

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

      {/* ─── EDIT PANEL — Now works for LOCKED items too (rate/discount) ─── */}
      {isEditing && (
        <div className="border-t-2 border-brand-200 bg-brand-50/40 p-2.5 space-y-2 animate-in slide-in-from-top-2 duration-150">
          {isLocked && (
            <div className="rounded-md bg-blue-50 border border-blue-200 px-2 py-1 flex items-start gap-1.5">
              <Lock className="h-3 w-3 text-blue-700 shrink-0 mt-0.5" />
              <div className="text-[9px] text-blue-900 font-bold leading-tight">
                {item.rollId && 'Fixed item (roll cut). Quantity locked but rate & discount editable.'}
                {item.cutPieceId && 'Fixed cut piece. Rate & discount editable.'}
                {item.imeiId && 'Fixed IMEI (qty = 1). Rate & discount editable.'}
              </div>
            </div>
          )}

          {item.wholesalePrice && !isLocked && (
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
                {item.rollId || item.cutPieceId ? 'Rate / sqft' : 'Custom price'}
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
