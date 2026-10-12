/**
 * Labels, colours and quick reasons for the four adjustment types, shared by
 * the record, the forms, the analytics and the print-out.
 */

import { ArrowDownCircle, ArrowUpCircle, HelpCircle, ShieldAlert, type LucideIcon } from 'lucide-react';
import type { AdjustmentType } from '../api/stock-adjustments.api';

export const TYPES: Record<AdjustmentType, { label: string; short: string; sign: 1 | -1; icon: LucideIcon; tone: string; color: string }> = {
  ADJUSTMENT_IN: { label: 'Stock barhaya', short: 'Barhayein', sign: 1, icon: ArrowUpCircle, tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200', color: '#16a34a' },
  ADJUSTMENT_OUT: { label: 'Stock kam kiya', short: 'Kam karein', sign: -1, icon: ArrowDownCircle, tone: 'bg-blue-50 text-blue-700 ring-blue-200', color: '#2563eb' },
  DAMAGE: { label: 'Kharab maal', short: 'Kharab', sign: -1, icon: ShieldAlert, tone: 'bg-rose-50 text-rose-700 ring-rose-200', color: '#e11d48' },
  LOSS: { label: 'Gum gaya', short: 'Gum', sign: -1, icon: HelpCircle, tone: 'bg-amber-50 text-amber-800 ring-amber-200', color: '#d97706' },
};

export const TYPE_ORDER: AdjustmentType[] = ['ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'DAMAGE', 'LOSS'];

/** Common reasons per type; the shop's own most-used reasons are added on top. */
export const QUICK_REASONS: Record<AdjustmentType, string[]> = {
  ADJUSTMENT_IN: ['Ginti me zyada nikla', 'Supplier ne zyada bheja', 'Customer ne wapas kiya', 'Purani entry theek ki', 'Opening stock'],
  ADJUSTMENT_OUT: ['Ginti me kam nikla', 'Apne istemal ke liye', 'Sample / free diya', 'Supplier ko wapas', 'Purani entry theek ki'],
  DAMAGE: ['Toot gaya', 'Expiry ho gaya', 'Kharab ho gaya', 'Paani laga', 'Chooha / keera laga'],
  LOSS: ['Chori ho gaya', 'Gum gaya', 'Ginti me nahi mila', 'Staff se gum hua'],
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
