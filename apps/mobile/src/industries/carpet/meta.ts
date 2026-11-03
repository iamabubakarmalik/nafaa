/**
 * Carpet labels, tones and helpers (mirror of the web carpet lib/meta.ts). The
 * size and note rules live in @nafaa/core/industries/carpet. Labels are source
 * keys marked with msg() and translated where shown.
 */

import { msg, t } from '@/core/i18n';
import { queryClient } from '@/core/query/client';
import type { StatusTone } from '@/design';
import type { CarpetCutPieceSource, CarpetCutPieceStatus, CarpetRollStatus } from './api';

export { AREA_UNITS, LENGTH_UNITS, cutMismatch, ftIn, isCarpetNote, isCarpetUnit, isRollUnit, noteDims, pieceNote, qtyInUnit, r2, rateInUnit, readCarpetNote, realFt, rollCutNote, rollSqft, splitFt, usedFromRoll } from '@nafaa/core/industries/carpet';

export const ROLLS_KEY = 'carpet-rolls';
export const PIECES_KEY = 'carpet-cut-pieces';
export const SUMMARY_KEY = 'carpet-product-summary';
export const UNSETTLED_KEY = 'carpet-unsettled';
export const BILL_LINES_KEY = 'carpet-bill-lines';
export const DASH_KEY = 'carpet-dashboard';

/** Lists a roll or piece change touches; refreshed after it. */
export function refreshCarpet(extra: string[] = []) {
  [ROLLS_KEY, PIECES_KEY, SUMMARY_KEY, UNSETTLED_KEY, BILL_LINES_KEY, DASH_KEY, 'carpet-product-summary-pos', 'inv', 'offline', ...extra].forEach((k) => void queryClient.invalidateQueries({ queryKey: [k] }));
}

interface StatusMeta { label: string; tone: StatusTone }

export const ROLL_STATUS: Record<CarpetRollStatus, StatusMeta> = {
  ACTIVE: { label: msg('Chalu'), tone: 'success' }, RESERVED: { label: msg('Reserved'), tone: 'accent' }, FINISHED: { label: msg('Khatam'), tone: 'neutral' },
  DAMAGED: { label: msg('Damage'), tone: 'danger' }, TRANSFERRED: { label: msg('Transfer'), tone: 'info' },
};
export const rollStatus = (s?: string | null): StatusMeta => ROLL_STATUS[s as CarpetRollStatus] ?? { label: String(s ?? '—'), tone: 'neutral' };

export const PIECE_STATUS: Record<CarpetCutPieceStatus, StatusMeta> = {
  AVAILABLE: { label: msg('Bikne ko tayyar'), tone: 'success' }, RESERVED: { label: msg('Reserved'), tone: 'accent' }, SOLD: { label: msg('Bik gaya'), tone: 'neutral' },
  DAMAGED: { label: msg('Damage / hataya'), tone: 'danger' },
};
export const pieceStatus = (s?: string | null): StatusMeta => PIECE_STATUS[s as CarpetCutPieceStatus] ?? { label: String(s ?? '—'), tone: 'neutral' };

export const PIECE_SOURCE: Record<CarpetCutPieceSource, string> = {
  LEFTOVER: msg('Roll ka bacha tukra'), CUSTOMER_RETURN: msg('Customer wapsi'), DAMAGED_ROLL: msg('Damage roll se'), OPENING_STOCK: msg('Opening stock'), MANUAL: msg('Haath se dala'),
};

export const MOVE_LABEL: Record<string, string> = {
  OPENING: msg('Opening'), CUT_FOR_SALE: msg('Bill par kata'), ADJUSTMENT: msg('Adjust'), TRANSFER: msg('Transfer'), RETURN: msg('Wapsi'),
  DAMAGE: msg('Damage'), WASTE: msg('Waste'), REMOVED: msg('Stock se hataya'), VOID_RETURN: msg('Bill void — wapas'),
};

export const UNIT_NAME: Record<string, string> = { sqft: msg('sq ft'), sqm: msg('sq meter'), sqyd: msg('sq gaz'), ft: msg('running ft'), m: msg('running meter') };
export const unitLabel = (unit: string) => (UNIT_NAME[unit.toLowerCase()] ? t(UNIT_NAME[unit.toLowerCase()]) : unit);

export const sqftText = (n: number) => `${Math.round(n * 100) / 100} sqft`;

/** Empty text becomes undefined so the API keeps optional fields out. */
export const opt = (v?: string | null) => (v && v.trim() ? v.trim() : undefined);
/** Decimal text: keeps digits and one dot. */
export const digits = (v: string) => v.replace(/[^\d.]/g, '');
export const num = (v: string) => (v.trim() === '' ? 0 : Number(v));
