/**
 * Labels, colours and quick reasons for the adjustment types, shared by the
 * record, the forms, the analytics and the print-out. Opening stock adds
 * stock but is not a gain, so it is kept out of the "Kul farq" totals.
 */

import { ArrowDownCircle, ArrowUpCircle, HelpCircle, PackagePlus, ShieldAlert, type LucideIcon } from 'lucide-react';
import type { AdjustmentType, ProfitEffect, ReasonCode } from '../api/stock-adjustments.api';
import { msg, t as tr } from '@core/i18n';

/** Raw type names; a line saved without a reason code stores this text as its reason. */
export const TYPE_TEXT: Record<AdjustmentType, string> = {
  ADJUSTMENT_IN: msg('Stock barhaya'), ADJUSTMENT_OUT: msg('Stock kam kiya'), DAMAGE: msg('Kharab maal'), LOSS: msg('Gum gaya'), OPENING_BALANCE: msg('Opening stock'),
};

export const TYPES: Record<AdjustmentType, { label: string; short: string; sign: 1 | -1; icon: LucideIcon; tone: string; color: string }> = {
  ADJUSTMENT_IN: { label: tr(TYPE_TEXT.ADJUSTMENT_IN), short: tr('Barhayein'), sign: 1, icon: ArrowUpCircle, tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200', color: '#16a34a' },
  ADJUSTMENT_OUT: { label: tr(TYPE_TEXT.ADJUSTMENT_OUT), short: tr('Kam karein'), sign: -1, icon: ArrowDownCircle, tone: 'bg-blue-50 text-blue-700 ring-blue-200', color: '#2563eb' },
  DAMAGE: { label: tr(TYPE_TEXT.DAMAGE), short: tr('Kharab'), sign: -1, icon: ShieldAlert, tone: 'bg-rose-50 text-rose-700 ring-rose-200', color: '#e11d48' },
  LOSS: { label: tr(TYPE_TEXT.LOSS), short: tr('Gum'), sign: -1, icon: HelpCircle, tone: 'bg-amber-50 text-amber-800 ring-amber-200', color: '#d97706' },
  OPENING_BALANCE: { label: tr(TYPE_TEXT.OPENING_BALANCE), short: tr('Opening'), sign: 1, icon: PackagePlus, tone: 'bg-violet-50 text-violet-700 ring-violet-200', color: '#7c3aed' },
};

export const TYPE_ORDER: AdjustmentType[] = ['OPENING_BALANCE', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'DAMAGE', 'LOSS'];

/** Opening stock is a starting count, not a gain or loss. */
export const isOpeningType = (t: AdjustmentType) => t === 'OPENING_BALANCE';

/** Common reasons per type; the shop's own most-used reasons are added on top. */
export const QUICK_REASONS: Record<AdjustmentType, string[]> = {
  OPENING_BALANCE: [tr('Pehla stock'), tr('Dukaan me banaya'), tr('Purana maal darj kiya')],
  ADJUSTMENT_IN: [tr('Ginti me zyada nikla'), tr('Supplier ne zyada bheja'), tr('Customer ne wapas kiya'), tr('Purani entry theek ki')],
  ADJUSTMENT_OUT: [tr('Ginti me kam nikla'), tr('Apne istemal ke liye'), tr('Sample / free diya'), tr('Supplier ko wapas'), tr('Purani entry theek ki')],
  DAMAGE: [tr('Toot gaya'), tr('Expiry ho gaya'), tr('Kharab ho gaya'), tr('Paani laga'), tr('Chooha / keera laga')],
  LOSS: [tr('Chori ho gaya'), tr('Gum gaya'), tr('Ginti me nahi mila'), tr('Staff se gum hua')],
};

/** Up to three decimals, grouped. */
export const qtyText = (n: number) => Number(n.toFixed(3)).toLocaleString('en-PK');

export const when = (iso: string) =>
  new Date(iso).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

/** Every query of this page lives under this key, so one invalidate refreshes all. */
export const ADJ_KEY = 'stock-adjustments';

/** Queries elsewhere in the app that show stock and must refresh after a save. */
export const STOCK_KEYS = [
  ADJ_KEY, 'products', 'product-catalog', 'purchase-sources', 'products-for-adjustments', 'carpet-rolls', 'product-imeis',
  'imei-list', 'imei-stats', 'imei-global-list', 'imei-global-stats', 'electronics-serials-adjust', 'stock-movements',
  'low-stock', 'dashboard-overview', 'inventory',
];

/* ───────────────────────── reasons and profit effect ───────────────────────── */

/**
 * Fixed reasons, mirroring the API (stock-adjustments/reason-codes.ts). The
 * reason fixes the stock direction and how the line counts in profit; a data
 * correction keeps the chosen direction and does not touch profit. `label`
 * is the raw text saved as the reason: show it with tr().
 */
export const REASONS: Record<ReasonCode, { label: string; effect: ProfitEffect; type: AdjustmentType | null; hint: string }> = {
  DAMAGE: { label: msg('Damage'), effect: 'LOSS', type: 'DAMAGE', hint: tr('Toota ya kharab maal') },
  EXPIRY: { label: msg('Expiry'), effect: 'LOSS', type: 'DAMAGE', hint: tr('Expire ho gaya, bik nahi sakta') },
  THEFT: { label: msg('Chori / shortage'), effect: 'LOSS', type: 'LOSS', hint: tr('Chori, gum ya ginti me kam') },
  SHOP_USE: { label: msg('Dukaan mein istemal'), effect: 'LOSS', type: 'ADJUSTMENT_OUT', hint: tr('Apne kaam me liya, sample ya free diya') },
  AUDIT_FOUND: { label: msg('Audit mein zyada nikla'), effect: 'GAIN', type: 'ADJUSTMENT_IN', hint: tr('Ginti me system se zyada maal') },
  FREE_BONUS: { label: msg('Free / bonus maal mila'), effect: 'GAIN', type: 'ADJUSTMENT_IN', hint: tr('Company ya supplier se muft maal') },
  CORRECTION: { label: msg('Galti theek karna (data correction)'), effect: 'NONE', type: null, hint: tr('Sirf ghalat entry theek karni hai') },
};

export const LOSS_REASONS: ReasonCode[] = ['DAMAGE', 'EXPIRY', 'THEFT', 'SHOP_USE'];
export const GAIN_REASONS: ReasonCode[] = ['AUDIT_FOUND', 'FREE_BONUS'];

/** How each effect reads in the app. */
export const EFFECTS: Record<ProfitEffect, { label: string; note: string; tone: string; text: string }> = {
  LOSS: { label: tr('Stock nuksan'), note: tr('Profit se minus'), tone: 'bg-rose-50 text-rose-700 ring-rose-200', text: 'text-rose-700' },
  GAIN: { label: tr('Stock faida'), note: tr('Profit mein plus'), tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200', text: 'text-emerald-700' },
  NONE: { label: tr('Profit par asar nahi'), note: tr('Sirf stock badla'), tone: 'bg-slate-100 text-slate-600 ring-slate-200', text: 'text-slate-600' },
};

/** Warning shown with the data-correction choice. */
export const CORRECTION_WARNING = tr('Sirf data ki galti theek karne ke liye — is se profit nahi badlega. Asal nuksan/faida ke liye upar wali reason chunein.');

/** A row's profit effect: saved on the row, else by its type (same rule as the reports). */
export const effectOf = (row: { type: AdjustmentType; profitEffect?: ProfitEffect | null }): ProfitEffect =>
  row.profitEffect ?? (row.type === 'ADJUSTMENT_IN' ? 'GAIN' : row.type === 'OPENING_BALANCE' ? 'NONE' : 'LOSS');
