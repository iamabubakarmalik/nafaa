/**
 * Reasons, statuses and small helpers shared by the damage page, the report
 * form, analytics and the print-out.
 */

import {
  Bug, CalendarX, CheckCircle2, Clock, Droplets, Factory, HelpCircle, PackageX, ShieldAlert, Undo2, XCircle, Hammer, Trash2,
  type LucideIcon,
} from 'lucide-react';
import type { DamageLog, DamageReasonCode, DamageStatus } from '../api/damage.api';

export interface ReasonChip { id: string; code: DamageReasonCode; label: string; icon: LucideIcon; color: string }

/** Reason chips in the report form. "Wapas aaya kharab" is saved as OTHER with its own text. */
export const REASONS: ReasonChip[] = [
  { id: 'EXPIRY', code: 'EXPIRY', label: 'Expiry ho gaya', icon: CalendarX, color: '#d97706' },
  { id: 'BREAKAGE', code: 'BREAKAGE', label: 'Toot gaya', icon: Hammer, color: '#ea580c' },
  { id: 'SPOILAGE', code: 'SPOILAGE', label: 'Kharab ho gaya', icon: Trash2, color: '#65a30d' },
  { id: 'PEST_DAMAGE', code: 'PEST_DAMAGE', label: 'Chuha / keera', icon: Bug, color: '#e11d48' },
  { id: 'RETURNED', code: 'OTHER', label: 'Wapas aaya kharab', icon: Undo2, color: '#7c3aed' },
  { id: 'WATER_DAMAGE', code: 'WATER_DAMAGE', label: 'Paani laga', icon: Droplets, color: '#2563eb' },
  { id: 'THEFT', code: 'THEFT', label: 'Chori / gum', icon: ShieldAlert, color: '#b91c1c' },
  { id: 'MANUFACTURING_DEFECT', code: 'MANUFACTURING_DEFECT', label: 'Company ka nuqs', icon: Factory, color: '#0891b2' },
  { id: 'OTHER', code: 'OTHER', label: 'Kuch aur', icon: HelpCircle, color: '#64748b' },
];

const BY_CODE = new Map(REASONS.filter((r) => r.id === r.code).map((r) => [r.code, r]));

/** Chip for a saved report: OTHER rows show their own text. */
export function reasonOf(code: DamageReasonCode, text?: string): { label: string; icon: LucideIcon; color: string } {
  if (code !== 'OTHER') return BY_CODE.get(code) ?? REASONS[REASONS.length - 1];
  const returned = REASONS.find((r) => r.id === 'RETURNED')!;
  if (text && text.trim().toLowerCase() === returned.label.toLowerCase()) return returned;
  return { ...REASONS[REASONS.length - 1], label: text?.trim() || 'Kuch aur' };
}

/** Codes offered by the reason filter. */
export const FILTER_REASONS = REASONS.filter((r) => r.id === r.code);

export const STATUS: Record<DamageStatus, { label: string; icon: LucideIcon; tone: string; color: string }> = {
  REPORTED: { label: 'Manzoori baqi', icon: Clock, tone: 'bg-amber-50 text-amber-800 ring-amber-200', color: '#d97706' },
  APPROVED: { label: 'Manzoor', icon: CheckCircle2, tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200', color: '#16a34a' },
  REJECTED: { label: 'Rad', icon: XCircle, tone: 'bg-rose-50 text-rose-700 ring-rose-200', color: '#e11d48' },
  WRITTEN_OFF: { label: 'Khaate se nikala', icon: PackageX, tone: 'bg-slate-100 text-slate-700 ring-slate-200', color: '#475569' },
};

/** Every query of this page lives under this key. */
export const DAMAGE_KEY = 'damage';

export const qtyText = (n: number) => Number(n.toFixed(3)).toLocaleString('en-PK');

export const when = (iso: string) =>
  new Date(iso).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

/** "3 carton (72 pcs)" when reported in a pack unit, else "72 pcs". */
export function qtyLabel(d: DamageLog) {
  const base = `${qtyText(d.quantity)} ${d.product.unit}`;
  const rate = Number(d.unit?.conversionRate) || 1;
  return d.unit && rate !== 1 ? `${qtyText(d.quantity / rate)} ${d.unit.unitName} (${base})` : base;
}

export function itemLabel(d: DamageLog) {
  return d.variant ? `${d.product.name} (${d.variant.name})` : d.product.name;
}

/** Hours since a report was made. */
export const ageHours = (iso: string) => (Date.now() - new Date(iso).getTime()) / 3_600_000;

export function apiError(e: unknown, fallback: string) {
  const err = e as { response?: { data?: { message?: string | string[] } }; message?: string };
  const m = err?.response?.data?.message;
  return (Array.isArray(m) ? m[0] : m) || err?.message || fallback;
}
