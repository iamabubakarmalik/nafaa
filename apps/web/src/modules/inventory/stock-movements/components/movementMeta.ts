/**
 * Label, colour, icon and direction for every stock movement type, plus the
 * groups used by the filter chips. One map, so the ledger, charts, print and
 * CSV all name a type the same way.
 */

import {
  ArrowDownToLine, ArrowRightLeft, ArrowUpFromLine, CircleMinus, CirclePlus, CornerUpRight, Factory, Flag, FlaskConical, RotateCcw,
  SearchX, ShoppingBag, TriangleAlert, Truck, type LucideIcon,
} from 'lucide-react';
import type { StockMovementType } from '../api/stock-movements.api';

export interface MovementMeta {
  label: string;
  /** One line on what the entry means, for tooltips and the guide. */
  hint: string;
  color: string;
  /** Badge classes. */
  tone: string;
  icon: LucideIcon;
  dir: 'in' | 'out';
}

export const MOVEMENT_META: Record<StockMovementType, MovementMeta> = {
  SALE_OUT: { label: 'Sale', hint: 'Bill par bika', color: '#2563eb', tone: 'bg-blue-50 text-blue-700 ring-blue-200', icon: ShoppingBag, dir: 'out' },
  RETURN_IN: { label: 'Customer return', hint: 'Customer ne maal wapas kiya', color: '#0891b2', tone: 'bg-cyan-50 text-cyan-700 ring-cyan-200', icon: RotateCcw, dir: 'in' },
  PURCHASE_IN: { label: 'Purchase', hint: 'Supplier se maal aaya', color: '#16a34a', tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200', icon: Truck, dir: 'in' },
  PURCHASE_RETURN: { label: 'Supplier ko wapas', hint: 'Supplier ko maal lautaya', color: '#ea580c', tone: 'bg-orange-50 text-orange-700 ring-orange-200', icon: CornerUpRight, dir: 'out' },
  ADJUSTMENT_IN: { label: 'Adjustment +', hint: 'Ginti ke baad stock barhaya', color: '#7c3aed', tone: 'bg-violet-50 text-violet-700 ring-violet-200', icon: CirclePlus, dir: 'in' },
  ADJUSTMENT_OUT: { label: 'Adjustment −', hint: 'Ginti ke baad stock ghataya', color: '#9333ea', tone: 'bg-purple-50 text-purple-700 ring-purple-200', icon: CircleMinus, dir: 'out' },
  DAMAGE: { label: 'Kharab', hint: 'Toot gaya, expire ya kharab hua', color: '#e11d48', tone: 'bg-rose-50 text-rose-700 ring-rose-200', icon: TriangleAlert, dir: 'out' },
  LOSS: { label: 'Gum', hint: 'Gum ho gaya ya chori', color: '#be123c', tone: 'bg-rose-50 text-rose-800 ring-rose-200', icon: SearchX, dir: 'out' },
  TRANSFER_IN: { label: 'Transfer aaya', hint: 'Doosri branch se aaya', color: '#0d9488', tone: 'bg-teal-50 text-teal-700 ring-teal-200', icon: ArrowDownToLine, dir: 'in' },
  TRANSFER_OUT: { label: 'Transfer gaya', hint: 'Doosri branch ko bheja', color: '#ca8a04', tone: 'bg-amber-50 text-amber-800 ring-amber-200', icon: ArrowUpFromLine, dir: 'out' },
  OPENING_BALANCE: { label: 'Opening', hint: 'Shuru ka stock', color: '#64748b', tone: 'bg-slate-100 text-slate-700 ring-slate-200', icon: Flag, dir: 'in' },
  PRODUCTION_IN: { label: 'Banaya', hint: 'Production se bana hua maal aaya (minus = production wapas)', color: '#059669', tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200', icon: Factory, dir: 'in' },
  PRODUCTION_OUT: { label: 'Production me laga', hint: 'Raw maal banane me laga (plus = production wapas)', color: '#c2410c', tone: 'bg-orange-50 text-orange-700 ring-orange-200', icon: FlaskConical, dir: 'out' },
};

export const movementMeta = (t: string): MovementMeta => MOVEMENT_META[t as StockMovementType] ?? MOVEMENT_META.OPENING_BALANCE;

export type MovementGroup = 'sale' | 'purchase' | 'return' | 'adjust' | 'damage' | 'transfer' | 'production' | 'opening';

export const MOVEMENT_GROUPS: Array<{ id: MovementGroup; label: string; icon: LucideIcon; color: string; types: StockMovementType[] }> = [
  { id: 'sale', label: 'Sale', icon: ShoppingBag, color: '#2563eb', types: ['SALE_OUT'] },
  { id: 'purchase', label: 'Purchase', icon: Truck, color: '#16a34a', types: ['PURCHASE_IN'] },
  { id: 'return', label: 'Wapas', icon: RotateCcw, color: '#0891b2', types: ['RETURN_IN', 'PURCHASE_RETURN'] },
  { id: 'adjust', label: 'Adjustment', icon: CirclePlus, color: '#7c3aed', types: ['ADJUSTMENT_IN', 'ADJUSTMENT_OUT'] },
  { id: 'damage', label: 'Kharab / Gum', icon: TriangleAlert, color: '#e11d48', types: ['DAMAGE', 'LOSS'] },
  { id: 'transfer', label: 'Transfer', icon: ArrowRightLeft, color: '#0d9488', types: ['TRANSFER_IN', 'TRANSFER_OUT'] },
  { id: 'production', label: 'Production', icon: Factory, color: '#059669', types: ['PRODUCTION_IN', 'PRODUCTION_OUT'] },
  { id: 'opening', label: 'Opening', icon: Flag, color: '#64748b', types: ['OPENING_BALANCE'] },
];

/** "12", "2.5" — no trailing zeros. */
export const fmtQty = (n: number) => Number(n.toFixed(3)).toLocaleString('en-PK', { maximumFractionDigits: 3 });
