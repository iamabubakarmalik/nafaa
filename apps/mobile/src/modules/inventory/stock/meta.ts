/**
 * Labels, tones and icons for the stock screens, the same names as the web
 * (adjustment types, damage reasons and statuses, transfer statuses, low
 * stock statuses, movement types, stock report statuses). Labels are raw
 * source text; translate at render with t().
 */

import {
  AlertTriangle, ArrowDownCircle, ArrowDownToLine, ArrowUpCircle, ArrowUpFromLine, Ban, Bug, CalendarClock, CalendarX, CheckCircle2, CircleMinus,
  CirclePlus, Clock, CornerUpRight, Droplets, EyeOff, Factory, Flag, FlaskConical, Hammer, HelpCircle, Hourglass, Leaf, ListChecks, Minus,
  PackagePlus, PackageX, RotateCcw, SearchX, ShieldAlert, ShoppingBag, Snail, Trash2, TriangleAlert, Truck, Undo2, XCircle, Zap, type LucideIcon,
} from 'lucide-react-native';
import type { AdjustmentType } from '@nafaa/core/inventory';
import { businessDayKey } from '@/core/format';
import { msg, t } from '@/core/i18n';
import type { StatusTone } from '@/design';
import type { DamageReasonCode, DamageStatus, LowStatus, StockMovementType, StockStatusFilter, TransferStatus } from './api';

export const ADJ_TYPES: Record<AdjustmentType, { label: string; short: string; sign: 1 | -1; icon: LucideIcon; tone: StatusTone }> = {
  ADJUSTMENT_IN: { label: msg('Stock barhaya'), short: msg('Barhayein'), sign: 1, icon: ArrowUpCircle, tone: 'success' },
  ADJUSTMENT_OUT: { label: msg('Stock kam kiya'), short: msg('Kam karein'), sign: -1, icon: ArrowDownCircle, tone: 'info' },
  DAMAGE: { label: msg('Kharab maal'), short: msg('Kharab'), sign: -1, icon: ShieldAlert, tone: 'danger' },
  LOSS: { label: msg('Gum gaya'), short: msg('Gum'), sign: -1, icon: HelpCircle, tone: 'warning' },
  OPENING_BALANCE: { label: msg('Opening stock'), short: msg('Opening'), sign: 1, icon: PackagePlus, tone: 'accent' },
};
export const ADJ_TYPE_ORDER: AdjustmentType[] = ['OPENING_BALANCE', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'DAMAGE', 'LOSS'];

export const DAMAGE_REASONS: Array<{ id: string; code: DamageReasonCode; label: string; icon: LucideIcon }> = [
  { id: 'EXPIRY', code: 'EXPIRY', label: msg('Expiry ho gaya'), icon: CalendarX },
  { id: 'BREAKAGE', code: 'BREAKAGE', label: msg('Toot gaya'), icon: Hammer },
  { id: 'SPOILAGE', code: 'SPOILAGE', label: msg('Kharab ho gaya'), icon: Trash2 },
  { id: 'PEST_DAMAGE', code: 'PEST_DAMAGE', label: msg('Chuha / keera'), icon: Bug },
  { id: 'RETURNED', code: 'OTHER', label: msg('Wapas aaya kharab'), icon: Undo2 },
  { id: 'WATER_DAMAGE', code: 'WATER_DAMAGE', label: msg('Paani laga'), icon: Droplets },
  { id: 'THEFT', code: 'THEFT', label: msg('Chori / gum'), icon: ShieldAlert },
  { id: 'MANUFACTURING_DEFECT', code: 'MANUFACTURING_DEFECT', label: msg('Company ka nuqs'), icon: Factory },
  { id: 'OTHER', code: 'OTHER', label: msg('Kuch aur'), icon: HelpCircle },
];

/** Reason of a saved report, translated; OTHER rows show their own text. */
export function damageReasonOf(code: DamageReasonCode, text?: string): { label: string; icon: LucideIcon } {
  const own = DAMAGE_REASONS.find((r) => r.id === code);
  if (code !== 'OTHER' && own) return { label: t(own.label), icon: own.icon };
  const returned = DAMAGE_REASONS[4];
  if (text && text.trim().toLowerCase() === returned.label.toLowerCase()) return { label: t(returned.label), icon: returned.icon };
  return { label: text?.trim() ? t(text.trim()) : t('Kuch aur'), icon: HelpCircle };
}

export const DAMAGE_STATUS: Record<DamageStatus, { label: string; icon: LucideIcon; tone: StatusTone }> = {
  REPORTED: { label: msg('Approval baqi'), icon: Clock, tone: 'warning' },
  APPROVED: { label: msg('Approved'), icon: CheckCircle2, tone: 'success' },
  REJECTED: { label: msg('Rad'), icon: XCircle, tone: 'danger' },
  WRITTEN_OFF: { label: msg('Khaate se nikala'), icon: PackageX, tone: 'neutral' },
};

export const TRANSFER_STATUS: Record<TransferStatus, { label: string; tone: StatusTone }> = {
  PENDING: { label: msg('Bhejna baqi'), tone: 'neutral' },
  IN_TRANSIT: { label: msg('Raste me'), tone: 'info' },
  RECEIVED: { label: msg('Receive'), tone: 'success' },
  CANCELLED: { label: msg('Cancel'), tone: 'neutral' },
};

export const LOW_STATUS: Record<LowStatus, { label: string; icon: LucideIcon; tone: StatusTone }> = {
  out: { label: msg('Khatam'), icon: PackageX, tone: 'danger' },
  low: { label: msg('Kam'), icon: AlertTriangle, tone: 'warning' },
  soon: { label: msg('Jaldi khatam hoga'), icon: Clock, tone: 'warning' },
  expiry: { label: msg('Expiry qareeb'), icon: CalendarClock, tone: 'accent' },
  registration: { label: msg('Registration'), icon: ShieldAlert, tone: 'danger' },
  season: { label: msg('Mausam ka maal'), icon: Leaf, tone: 'success' },
};

export const MOVEMENT: Record<StockMovementType, { label: string; hint: string; icon: LucideIcon; tone: StatusTone; dir: 'in' | 'out' }> = {
  SALE_OUT: { label: msg('Sale'), hint: msg('Bill par bika'), icon: ShoppingBag, tone: 'info', dir: 'out' },
  RETURN_IN: { label: msg('Customer return'), hint: msg('Customer ne maal wapas kiya'), icon: RotateCcw, tone: 'info', dir: 'in' },
  PURCHASE_IN: { label: msg('Purchase'), hint: msg('Supplier se maal aaya'), icon: Truck, tone: 'success', dir: 'in' },
  PURCHASE_RETURN: { label: msg('Supplier ko wapas'), hint: msg('Supplier ko maal lautaya'), icon: CornerUpRight, tone: 'warning', dir: 'out' },
  ADJUSTMENT_IN: { label: msg('Adjustment +'), hint: msg('Ginti ke baad stock barhaya'), icon: CirclePlus, tone: 'accent', dir: 'in' },
  ADJUSTMENT_OUT: { label: msg('Adjustment −'), hint: msg('Ginti ke baad stock ghataya'), icon: CircleMinus, tone: 'accent', dir: 'out' },
  DAMAGE: { label: msg('Kharab'), hint: msg('Toot gaya, expire ya kharab hua'), icon: TriangleAlert, tone: 'danger', dir: 'out' },
  LOSS: { label: msg('Gum'), hint: msg('Gum ho gaya ya chori'), icon: SearchX, tone: 'danger', dir: 'out' },
  TRANSFER_IN: { label: msg('Transfer aaya'), hint: msg('Doosri branch se aaya'), icon: ArrowDownToLine, tone: 'success', dir: 'in' },
  TRANSFER_OUT: { label: msg('Transfer gaya'), hint: msg('Doosri branch ko bheja'), icon: ArrowUpFromLine, tone: 'warning', dir: 'out' },
  OPENING_BALANCE: { label: msg('Opening'), hint: msg('Shuru ka stock'), icon: Flag, tone: 'neutral', dir: 'in' },
  PRODUCTION_IN: { label: msg('Banaya'), hint: msg('Production se bana hua maal aaya (minus = production wapas)'), icon: Factory, tone: 'success', dir: 'in' },
  PRODUCTION_OUT: { label: msg('Production me laga'), hint: msg('Raw maal banane me laga (plus = production wapas)'), icon: FlaskConical, tone: 'warning', dir: 'out' },
};
export const movementOf = (type: string) => MOVEMENT[type as StockMovementType] ?? MOVEMENT.OPENING_BALANCE;

export const MOVEMENT_GROUPS: Array<{ id: string; label: string; types: StockMovementType[] }> = [
  { id: 'sale', label: msg('Sale'), types: ['SALE_OUT'] },
  { id: 'purchase', label: msg('Purchase'), types: ['PURCHASE_IN'] },
  { id: 'return', label: msg('Wapas'), types: ['RETURN_IN', 'PURCHASE_RETURN'] },
  { id: 'adjust', label: msg('Adjustment'), types: ['ADJUSTMENT_IN', 'ADJUSTMENT_OUT'] },
  { id: 'damage', label: msg('Kharab / Gum'), types: ['DAMAGE', 'LOSS'] },
  { id: 'transfer', label: msg('Transfer'), types: ['TRANSFER_IN', 'TRANSFER_OUT'] },
  { id: 'production', label: msg('Production'), types: ['PRODUCTION_IN', 'PRODUCTION_OUT'] },
  { id: 'opening', label: msg('Opening'), types: ['OPENING_BALANCE'] },
];

export const STOCK_STATUS: Record<StockStatusFilter, { label: string; icon: LucideIcon; tone: StatusTone }> = {
  all: { label: msg('Sab'), icon: ListChecks, tone: 'neutral' },
  in: { label: msg('Stock me'), icon: CheckCircle2, tone: 'success' },
  low: { label: msg('Kam'), icon: AlertTriangle, tone: 'warning' },
  out: { label: msg('Khatam'), icon: PackageX, tone: 'danger' },
  dead: { label: msg('Dead stock'), icon: Hourglass, tone: 'accent' },
  slow: { label: msg('Dheere bikne wala'), icon: Snail, tone: 'info' },
  fast: { label: msg('Tez bikne wala'), icon: Zap, tone: 'warning' },
  expiry: { label: msg('Expiry'), icon: CalendarClock, tone: 'accent' },
  blocked: { label: msg('Registration'), icon: ShieldAlert, tone: 'danger' },
  raw: { label: msg('Kacha maal'), icon: Leaf, tone: 'warning' },
  made: { label: msg('Khud banaya'), icon: Factory, tone: 'warning' },
  noCost: { label: msg('Cost nahi likhi'), icon: Ban, tone: 'neutral' },
  negative: { label: msg('Minus stock'), icon: Minus, tone: 'danger' },
  inactive: { label: msg('Band products'), icon: EyeOff, tone: 'neutral' },
};
/** Statuses every shop gets; industries add theirs through STOCK_REPORT_EXTRA (see README). */
export const BASE_STATUSES: StockStatusFilter[] = ['in', 'low', 'out', 'dead', 'slow', 'fast', 'expiry', 'noCost', 'negative', 'inactive'];

/** Industry hook for the stock report: extra statuses (raw, made, blocked…) per industry id. */
export const STOCK_REPORT_EXTRA: Record<string, { statuses?: StockStatusFilter[] }> = {
  bakery: { statuses: ['raw', 'made'] },
  restaurant: { statuses: ['raw', 'made'] },
  agri: { statuses: ['blocked'] },
};

export const LEDGER_KINDS: Array<{ key: string; label: string; dir: 'in' | 'out' }> = [
  { key: 'buy', label: msg('Purchase'), dir: 'in' },
  { key: 'returnIn', label: msg('Customer return'), dir: 'in' },
  { key: 'transferIn', label: msg('Branch se aaya'), dir: 'in' },
  { key: 'adjustIn', label: msg('Ginti / opening (+)'), dir: 'in' },
  { key: 'made', label: msg('Banaya (Production)'), dir: 'in' },
  { key: 'sale', label: msg('Sale'), dir: 'out' },
  { key: 'transferOut', label: msg('Branch ko gaya'), dir: 'out' },
  { key: 'damage', label: msg('Kharab / gum'), dir: 'out' },
  { key: 'adjustOut', label: msg('Ginti (−)'), dir: 'out' },
  { key: 'supplier', label: msg('Supplier ko wapas'), dir: 'out' },
  { key: 'used', label: msg('Raw maal production me laga'), dir: 'out' },
];

/* ───────────── periods ───────────── */

export type PeriodPreset = 'today' | 'week' | 'month' | 'last30' | 'all';
export const PERIODS: Array<{ value: PeriodPreset; label: string }> = [
  { value: 'today', label: msg('Aaj') }, { value: 'week', label: msg('7 din') }, { value: 'month', label: msg('Is mahine') },
  { value: 'last30', label: msg('30 din') }, { value: 'all', label: msg('Sab') },
];

/** Business-day keys (YYYY-MM-DD, Pakistan time) for a preset; undefined = no limit. */
export function periodRange(p: PeriodPreset): { from: string; to: string } | undefined {
  const today = businessDayKey();
  const back = (days: number) => businessDayKey(Date.now() - days * 86_400_000);
  if (p === 'today') return { from: today, to: today };
  if (p === 'week') return { from: back(6), to: today };
  if (p === 'last30') return { from: back(29), to: today };
  if (p === 'month') return { from: `${today.slice(0, 8)}01`, to: today };
  return undefined;
}

/** "25 min", "3 ghante", "2 din 4 ghante". */
export function duration(fromIso?: string | null, toIso?: string | null) {
  if (!fromIso) return '';
  const ms = Math.max(0, (toIso ? new Date(toIso) : new Date()).getTime() - new Date(fromIso).getTime());
  const mins = Math.round(ms / 60_000);
  if (mins < 60) return `${Math.max(mins, 1)} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t('{{count}} ghante', { count: hours });
  const days = Math.floor(hours / 24);
  const rest = hours % 24;
  return rest ? t('{{days}} din {{rest}} ghante', { days, rest }) : t('{{days}} din', { days });
}

/** "aaj", "12 din", "3 mahine", "kabhi nahi". */
export function ageText(days: number | null) {
  if (days === null) return t('kabhi nahi');
  if (days < 1) return t('aaj');
  if (days < 60) return t('{{days}} din', { days });
  if (days < 730) return t('{{value}} mahine', { value: Math.round(days / 30) });
  return t('{{value}} saal', { value: Math.round(days / 365) });
}
