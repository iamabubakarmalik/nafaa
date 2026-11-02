/**
 * Labels, colours and small helpers shared by the electronics pages:
 * serial status, warranty status, claim status and outcome.
 */

import {
  CheckCircle2, CircleSlash, Clock, Package, RotateCcw, Truck, Wrench, XCircle, AlertTriangle, ShieldCheck, ShieldOff,
  ShieldAlert, Building2, type LucideIcon,
} from 'lucide-react';
import type { SerialStatus, WarrantyStatus } from '../api/serial-tracking.api';
import type { ClaimRow, ResolutionType } from '../api/warranty-claims.api';
import { t } from '@core/i18n';

export interface Tone { label: string; icon: LucideIcon; color: string; tone: string }

export const SERIAL_STATUS: Record<SerialStatus, Tone> = {
  IN_STOCK: { label: t('Stock mein'), icon: Package, color: '#059669', tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  RESERVED: { label: t('Rakha hua'), icon: Clock, color: '#7c3aed', tone: 'bg-violet-50 text-violet-700 ring-violet-200' },
  IN_TRANSIT: { label: t('Raste mein'), icon: Truck, color: '#d97706', tone: 'bg-amber-50 text-amber-700 ring-amber-200' },
  SOLD: { label: t('Bik gaya'), icon: CheckCircle2, color: '#2563eb', tone: 'bg-blue-50 text-blue-700 ring-blue-200' },
  RETURNED: { label: t('Stock se nikla'), icon: RotateCcw, color: '#0891b2', tone: 'bg-cyan-50 text-cyan-700 ring-cyan-200' },
  IN_REPAIR: { label: t('Repair mein'), icon: Wrench, color: '#ea580c', tone: 'bg-orange-50 text-orange-700 ring-orange-200' },
  DEFECTIVE: { label: t('Kharab'), icon: XCircle, color: '#e11d48', tone: 'bg-rose-50 text-rose-700 ring-rose-200' },
  LOST: { label: t('Gum'), icon: AlertTriangle, color: '#475569', tone: 'bg-slate-100 text-slate-700 ring-slate-200' },
};

export const WARRANTY_STATUS: Record<WarrantyStatus, Tone> = {
  ACTIVE: { label: t('Warranty chal rahi'), icon: ShieldCheck, color: '#059669', tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  CLAIMED: { label: t('Claim ho chuka'), icon: ShieldAlert, color: '#d97706', tone: 'bg-amber-50 text-amber-700 ring-amber-200' },
  IN_REPAIR: { label: t('Repair mein'), icon: Wrench, color: '#ea580c', tone: 'bg-orange-50 text-orange-700 ring-orange-200' },
  EXPIRED: { label: t('Khatam'), icon: ShieldOff, color: '#64748b', tone: 'bg-slate-100 text-slate-600 ring-slate-200' },
  VOID: { label: t('Warranty khatam (rad)'), icon: ShieldOff, color: '#e11d48', tone: 'bg-rose-50 text-rose-700 ring-rose-200' },
  NO_WARRANTY: { label: t('Warranty nahi'), icon: ShieldOff, color: '#64748b', tone: 'bg-slate-100 text-slate-600 ring-slate-200' },
};

/** Where a claim stands, read from status, resolvedAt and the brand flag. */
export function claimStage(c: Pick<ClaimRow, 'status' | 'resolvedAt' | 'sentToBrand' | 'resolutionType'>): Tone {
  if (c.resolvedAt) return OUTCOME[(c.resolutionType as ResolutionType) ?? 'REPAIRED'] ?? OUTCOME.REPAIRED;
  if (c.status === 'VOID' || c.status === 'EXPIRED' || c.status === 'NO_WARRANTY') {
    return { label: t('Cancel'), icon: CircleSlash, color: '#64748b', tone: 'bg-slate-100 text-slate-600 ring-slate-200' };
  }
  if (c.sentToBrand) return { label: t('Company ke paas'), icon: Building2, color: '#7c3aed', tone: 'bg-violet-50 text-violet-700 ring-violet-200' };
  if (c.status === 'IN_REPAIR') return { label: t('Repair mein'), icon: Wrench, color: '#ea580c', tone: 'bg-orange-50 text-orange-700 ring-orange-200' };
  return { label: t('Naya'), icon: Clock, color: '#2563eb', tone: 'bg-blue-50 text-blue-700 ring-blue-200' };
}

export const OUTCOME: Record<ResolutionType, Tone & { hint: string }> = {
  REPAIRED: { label: t('Theek kar diya'), icon: Wrench, color: '#059669', tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200', hint: t('Unit theek ho kar customer ko wapas') },
  REPLACED: { label: t('Naya unit diya'), icon: RotateCcw, color: '#2563eb', tone: 'bg-blue-50 text-blue-700 ring-blue-200', hint: t('Stock se naya unit — purana kharab mein') },
  REFUNDED: { label: t('Paisa wapas'), icon: RotateCcw, color: '#d97706', tone: 'bg-amber-50 text-amber-700 ring-amber-200', hint: t('Asal bill par Return pehle karein') },
  REJECTED: { label: t('Warranty mein nahi'), icon: XCircle, color: '#e11d48', tone: 'bg-rose-50 text-rose-700 ring-rose-200', hint: t('Toota / paani — claim rad') },
};

export const ISSUE_CHIPS = ['Chalta nahi', 'Screen / display', 'Awaaz nahi', 'Charging', 'Battery', 'Remote / button', 'Garam hota hai', 'Network / WiFi'];

const DAY = 86_400_000;
export const daysLeft = (iso?: string | null) => (iso ? Math.ceil((new Date(iso).getTime() - Date.now()) / DAY) : null);
export const daysSince = (iso?: string | null) => (iso ? Math.floor((Date.now() - new Date(iso).getTime()) / DAY) : 0);
export const shortDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

/** The server's message, else the fallback. */
export function apiError(e: unknown, fallback: string) {
  const m = (e as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
  return Array.isArray(m) ? String(m[0]) : typeof m === 'string' ? m : fallback;
}
