/**
 * Carpet shop basics shared by the counter, rolls, pieces and products:
 * feet + inch sizes, area units, the bill line notes the server reads back,
 * and status labels.
 */

import type { CarpetRollStatus } from '../api/carpet-rolls.api';
import type { CarpetCutPieceSource, CarpetCutPieceStatus } from '../api/carpet-cut-pieces.api';

export const r2 = (v: number) => Math.round((Number(v) || 0) * 100) / 100;

/** Units a carpet product can be sold in. */
export const AREA_UNITS = new Set(['sqft', 'sqm', 'sqyd']);
export const LENGTH_UNITS = new Set(['ft', 'm']);
export const isCarpetUnit = (unit?: string | null) => AREA_UNITS.has((unit ?? '').toLowerCase()) || LENGTH_UNITS.has((unit ?? '').toLowerCase());

/** Feet plus inches as decimal feet. */
export const realFt = (ft: number, inch = 0) => (Number(ft) || 0) + (Number(inch) || 0) / 12;

/** 10.5 → "10ft 6in"; 12 → "12ft". */
export function ftIn(ft: number, inch = 0): string {
  let f = Math.floor(realFt(ft, inch) + 1e-9);
  let i = Math.round((realFt(ft, inch) - f) * 12 * 100) / 100;
  if (i >= 12) { f += 1; i = 0; }
  return i ? `${f}ft ${Number(i.toFixed(2))}in` : `${f}ft`;
}

export const sqft = (n: number) => `${Number(r2(n)).toLocaleString('en-PK')} sqft`;

/** How many of the product's unit a piece of carpet is (area units by area, ft / m by length). */
export function qtyInUnit(unit: string, widthFt: number, lengthFt: number): number {
  const area = widthFt * lengthFt;
  switch (unit.toLowerCase()) {
    case 'sqm': return r2(area * 0.092903);
    case 'sqyd': return r2(area / 9);
    case 'ft': return r2(lengthFt);
    case 'm': return r2(lengthFt * 0.3048);
    default: return r2(area);
  }
}

/** A roll's per-sqft rate turned into the product's unit rate for this width. */
export function rateInUnit(unit: string, perSqft: number, widthFt: number): number {
  switch (unit.toLowerCase()) {
    case 'sqm': return r2(perSqft / 0.092903);
    case 'sqyd': return r2(perSqft * 9);
    case 'ft': return r2(perSqft * widthFt);
    case 'm': return r2((perSqft * widthFt) / 0.3048);
    default: return r2(perSqft);
  }
}

export const unitLabel = (unit: string) => ({ sqft: 'sq ft', sqm: 'sq meter', sqyd: 'sq gaz', ft: 'running ft', m: 'running meter' } as Record<string, string>)[unit.toLowerCase()] ?? unit;

/** Marker the server reads: the strip left beside the cut is waste, not a piece. */
export const NO_LEFTOVER = 'bacha tukra waste';

/**
 * Bill line note for a roll cut. The server finds the roll and size in it,
 * so keep this exact shape: "Cut from CR-2026-0003: 9ft × 12ft 6in = 112.50 sqft".
 */
export function rollCutNote(rollNumber: string, widthFt: number, widthInch: number, lengthFt: number, lengthInch: number, keepLeftover: boolean): string {
  const area = realFt(widthFt, widthInch) * realFt(lengthFt, lengthInch);
  return `Cut from ${rollNumber}: ${ftIn(widthFt, widthInch)} × ${ftIn(lengthFt, lengthInch)} = ${area.toFixed(2)} sqft${keepLeftover ? '' : ` · ${NO_LEFTOVER}`}`;
}

/** Bill line note for a piece sale: "Cut piece CP-2026-0011 • 4ft × 6ft". */
export const pieceNote = (code: string, wFt: number, wIn: number, lFt: number, lIn: number) => `Cut piece ${code} • ${ftIn(wFt, wIn)} × ${ftIn(lFt, lIn)}`;

export type CarpetLineInfo = { kind: 'roll' | 'piece'; ref: string; size?: string; sqft?: number; waste?: boolean };

/** Reads a bill line note written by rollCutNote / pieceNote (and older notes). */
export function readCarpetNote(note?: string | null): CarpetLineInfo | null {
  const n = (note ?? '').trim();
  const roll = /^Cut from (.+?):\s*(.+?)\s*=\s*([\d.]+)\s*sqft/.exec(n);
  if (roll) return { kind: 'roll', ref: roll[1], size: roll[2], sqft: Number(roll[3]), waste: n.includes(NO_LEFTOVER) };
  const piece = /^Cut piece (\S+)(?:\s*[•·]\s*(.+))?/.exec(n);
  return piece ? { kind: 'piece', ref: piece[1], size: piece[2]?.split(' • ')[0] } : null;
}

export const ROLL_STATUS: Record<CarpetRollStatus, { label: string; tone: string }> = {
  ACTIVE: { label: 'Chalu', tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  RESERVED: { label: 'Reserved', tone: 'bg-violet-50 text-violet-700 ring-violet-200' },
  FINISHED: { label: 'Khatam', tone: 'bg-slate-100 text-slate-600 ring-slate-200' },
  DAMAGED: { label: 'Damage', tone: 'bg-rose-50 text-rose-700 ring-rose-200' },
  TRANSFERRED: { label: 'Transfer', tone: 'bg-sky-50 text-sky-700 ring-sky-200' },
};

export const PIECE_STATUS: Record<CarpetCutPieceStatus, { label: string; tone: string }> = {
  AVAILABLE: { label: 'Bikne ko tayyar', tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  RESERVED: { label: 'Reserved', tone: 'bg-violet-50 text-violet-700 ring-violet-200' },
  SOLD: { label: 'Bik gaya', tone: 'bg-slate-100 text-slate-600 ring-slate-200' },
  DAMAGED: { label: 'Damage / hataya', tone: 'bg-rose-50 text-rose-700 ring-rose-200' },
};

export const PIECE_SOURCE: Record<CarpetCutPieceSource, string> = {
  LEFTOVER: 'Roll ka bacha tukra',
  CUSTOMER_RETURN: 'Customer wapsi',
  DAMAGED_ROLL: 'Damage roll se',
  OPENING_STOCK: 'Opening stock',
  MANUAL: 'Haath se dala',
};

export const MOVE_LABEL: Record<string, string> = {
  OPENING: 'Opening', CUT_FOR_SALE: 'Bill par kata', ADJUSTMENT: 'Adjust', TRANSFER: 'Transfer', RETURN: 'Wapsi',
  DAMAGE: 'Damage', WASTE: 'Waste', REMOVED: 'Stock se hataya', VOID_RETURN: 'Bill void — wapas',
};

export const ROLLS_KEY = 'carpet-rolls';
export const PIECES_KEY = 'carpet-cut-pieces';
export const SUMMARY_KEY = 'carpet-product-summary';

export const shortDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
