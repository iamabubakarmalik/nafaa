/**
 * Pure rules of the carpet pack (shared by web and mobile): feet and inch
 * sizes, area units, the bill line notes the server reads back, and the
 * length / area math of a roll cut. Notes are always English: the server
 * parses them, so they never depend on the display language.
 */

export type CarpetRollStatus = 'ACTIVE' | 'FINISHED' | 'DAMAGED' | 'RESERVED' | 'TRANSFERRED';
export type CarpetCutPieceStatus = 'AVAILABLE' | 'SOLD' | 'DAMAGED' | 'RESERVED';

export const r2 = (v: number) => Math.round((Number(v) || 0) * 100) / 100;

/** Units a carpet product can be sold in. */
export const AREA_UNITS = new Set(['sqft', 'sqm', 'sqyd']);
export const LENGTH_UNITS = new Set(['ft', 'm']);
export const isCarpetUnit = (unit?: string | null) => AREA_UNITS.has((unit ?? '').toLowerCase()) || LENGTH_UNITS.has((unit ?? '').toLowerCase());
/** Products bought as rolls: area units only. */
export const isRollUnit = (unit?: string | null) => AREA_UNITS.has((unit ?? '').toLowerCase());

/** Feet plus inches as decimal feet. */
export const realFt = (ft: number, inch = 0) => (Number(ft) || 0) + (Number(inch) || 0) / 12;

/** Decimal feet split into whole feet and inches (inches below 12). */
export function splitFt(value: number): { ft: number; inch: number } {
  let ft = Math.floor(value + 1e-9);
  let inch = r2((value - ft) * 12);
  if (inch >= 12) { ft += 1; inch = 0; }
  return { ft, inch };
}

/** 10.5 -> "10ft 6in"; 12 -> "12ft". */
export function ftIn(ft: number, inch = 0): string {
  const { ft: f, inch: i } = splitFt(realFt(ft, inch));
  return i ? `${f}ft ${Number(i.toFixed(2))}in` : `${f}ft`;
}

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

/** Marker the server reads: the strip left beside the cut is waste, not a piece. */
export const NO_LEFTOVER = 'bacha tukra waste';

/** Bill line note for a roll cut: "Cut from CR-2026-0003: 9ft x 12ft 6in = 112.50 sqft". */
export function rollCutNote(rollNumber: string, widthFt: number, widthInch: number, lengthFt: number, lengthInch: number, keepLeftover: boolean): string {
  const area = realFt(widthFt, widthInch) * realFt(lengthFt, lengthInch);
  return `Cut from ${rollNumber}: ${ftIn(widthFt, widthInch)} × ${ftIn(lengthFt, lengthInch)} = ${area.toFixed(2)} sqft${keepLeftover ? '' : ` · ${NO_LEFTOVER}`}`;
}

/** Bill line note for a piece sale: "Cut piece CP-2026-0011 • 4ft x 6ft". */
export const pieceNote = (code: string, wFt: number, wIn: number, lFt: number, lIn: number) => `Cut piece ${code} • ${ftIn(wFt, wIn)} × ${ftIn(lFt, lIn)}`;

export const isCarpetNote = (note?: string | null) => !!note && (note.startsWith('Cut from ') || note.startsWith('Cut piece '));

export type CarpetLineInfo = { kind: 'roll' | 'piece'; ref: string; size?: string; sqft?: number; waste?: boolean };

/** Reads a bill line note written by rollCutNote / pieceNote (and older notes). */
export function readCarpetNote(note?: string | null): CarpetLineInfo | null {
  const n = (note ?? '').trim();
  const roll = /^Cut from (.+?):\s*(.+?)\s*=\s*([\d.]+)\s*sqft/.exec(n);
  if (roll) return { kind: 'roll', ref: roll[1], size: roll[2], sqft: Number(roll[3]), waste: n.includes(NO_LEFTOVER) };
  const piece = /^Cut piece (\S+)(?:\s*[•·]\s*(.+))?/.exec(n);
  return piece ? { kind: 'piece', ref: piece[1], size: piece[2]?.split(' • ')[0] } : null;
}

/** Width and length (decimal feet) written in a carpet line note. */
export function noteDims(note?: string | null): { w: number; l: number } | null {
  const size = readCarpetNote(note)?.size;
  const m = size && /^(\d+(?:\.\d+)?)ft(?:\s+(\d+(?:\.\d+)?)in)?\s*[×xX]\s*(\d+(?:\.\d+)?)ft(?:\s+(\d+(?:\.\d+)?)in)?/.exec(size);
  return m ? { w: realFt(Number(m[1]), Number(m[2] ?? 0)), l: realFt(Number(m[3]), Number(m[4] ?? 0)) } : null;
}

export interface RollCutInput {
  /** Roll width and remaining length in decimal feet. */
  rollWidth: number; rollLeft: number;
  /** What the customer takes, decimal feet. */
  width: number; length: number;
  /** Roll sale rate per sqft; 0 when the roll has none. */
  perSqft: number;
  unit: string;
  /** Typed rate in the product's unit; null uses the roll rate. */
  rateText: number | null;
  /** Product price used when the roll has no rate. */
  productPrice?: number;
}
export interface RollCutResult {
  area: number; qty: number; rate: number; total: number; strip: number; leftoverSqft: number;
  error: 'width' | 'widthTooBig' | 'length' | 'lengthTooBig' | 'rate' | null;
}

/** Area, quantity, rate and total of a roll cut, with the first problem found (if any). */
export function rollCut(i: RollCutInput): RollCutResult {
  const defaultRate = i.perSqft > 0 ? rateInUnit(i.unit, i.perSqft, i.width || i.rollWidth) : Number(i.productPrice ?? 0);
  const rate = i.rateText == null ? defaultRate : i.rateText;
  const area = r2(i.width * i.length);
  const qty = qtyInUnit(i.unit, i.width, i.length);
  const strip = r2(i.rollWidth - i.width);
  const error = i.width <= 0 ? 'width' : i.width > i.rollWidth + 0.001 ? 'widthTooBig' : i.length <= 0 ? 'length'
    : i.length > i.rollLeft + 0.001 ? 'lengthTooBig' : !(rate > 0) ? 'rate' : null;
  return { area, qty, rate, total: r2(qty * rate), strip, leftoverSqft: r2(strip * i.length), error };
}

/** The roll's sqft from its width and length (feet + inches). */
export const rollSqft = (wFt: number, wIn: number, lFt: number, lIn: number) => r2(realFt(wFt, wIn) * realFt(lFt, lIn));

/** Feet already used from one roll by the lines on a bill. */
export function usedFromRoll(lines: Array<{ note?: string | null }>, rollNumber: string): number {
  return lines.reduce((s, l) => {
    const info = readCarpetNote(l.note);
    const d = noteDims(l.note);
    return info?.kind === 'roll' && info.ref === rollNumber && d ? s + d.l : s;
  }, 0);
}

/** Message when a cut line's quantity no longer matches the size written in its note; null when fine. */
export function cutMismatch(line: { note?: string | null; baseUnit: string; baseQuantity: number }): { ref: string; want: number; have: number } | null {
  if (!isCarpetNote(line.note)) return null;
  const d = noteDims(line.note);
  if (!d) return null;
  const want = qtyInUnit(line.baseUnit, d.w, d.l);
  if (Math.abs(want - line.baseQuantity) <= 0.02) return null;
  return { ref: readCarpetNote(line.note)?.ref ?? '', want, have: r2(line.baseQuantity) };
}
