/**
 * Fixed reasons for a stock adjustment and how each counts in profit.
 *
 *   Loss (Stock nuksan)   DAMAGE, EXPIRY, THEFT (chori / shortage), SHOP_USE
 *   Gain (Stock faida)    AUDIT_FOUND (counted extra), FREE_BONUS (free / bonus goods)
 *   No profit effect      CORRECTION (fixing a data mistake). Needs
 *                         `stock_adjustments.correct`; stock moves, profit does not.
 *
 * The stock movement type of each reason is fixed, except CORRECTION, which
 * goes in or out as asked. A line without a reason code is classified by its
 * type (ADJUSTMENT_IN gain, OPENING_BALANCE none, the rest loss), the same
 * rule reports use for older rows.
 */

import type { StockProfitEffect } from '@prisma/client';

export const REASON_CODES = ['DAMAGE', 'EXPIRY', 'THEFT', 'SHOP_USE', 'AUDIT_FOUND', 'FREE_BONUS', 'CORRECTION'] as const;
export type ReasonCode = (typeof REASON_CODES)[number];

type StockType = 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT' | 'DAMAGE' | 'LOSS' | 'OPENING_BALANCE';

export const REASONS: Record<ReasonCode, { label: string; effect: StockProfitEffect; type: StockType | null }> = {
  DAMAGE: { label: 'Damage (toot-phoot)', effect: 'LOSS', type: 'DAMAGE' },
  EXPIRY: { label: 'Expiry', effect: 'LOSS', type: 'DAMAGE' },
  THEFT: { label: 'Chori / shortage', effect: 'LOSS', type: 'LOSS' },
  SHOP_USE: { label: 'Dukaan mein istemal', effect: 'LOSS', type: 'ADJUSTMENT_OUT' },
  AUDIT_FOUND: { label: 'Audit mein zyada nikla', effect: 'GAIN', type: 'ADJUSTMENT_IN' },
  FREE_BONUS: { label: 'Free / bonus maal mila', effect: 'GAIN', type: 'ADJUSTMENT_IN' },
  CORRECTION: { label: 'Galti theek karna (data correction)', effect: 'NONE', type: null },
};

/** Profit effect of a line with no reason code, by its type. */
export const effectOfType = (type: string): StockProfitEffect =>
  type === 'ADJUSTMENT_IN' ? 'GAIN' : type === 'OPENING_BALANCE' ? 'NONE' : 'LOSS';

/** Type and profit effect of a line: from its reason code when given, else from its type. */
export function classify(type: StockType, code?: ReasonCode | null): { type: StockType; effect: StockProfitEffect; label: string | null } {
  if (!code) return { type, effect: effectOfType(type), label: null };
  const r = REASONS[code];
  if (r.type) return { type: r.type, effect: r.effect, label: r.label };
  // A correction keeps the asked direction; any stock-out type becomes a plain out.
  const dir: StockType = type === 'ADJUSTMENT_IN' || type === 'OPENING_BALANCE' ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT';
  return { type: dir, effect: 'NONE', label: r.label };
}
