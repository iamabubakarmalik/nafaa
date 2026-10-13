/** Labels, colours and small helpers shared by the Tax screens. */

import { CheckCircle2, Clock, MinusCircle, XCircle, type LucideIcon } from 'lucide-react';
import type { Authority, TaxStatus } from './api';

export const AUTHORITY_ORDER: Authority[] = ['PRA', 'SRB', 'KPRA', 'FBR'];

export const AUTH: Record<Authority, { short: string; label: string; province: string; color: string; who: string }> = {
  PRA: { short: 'PRA', label: 'PRA (Punjab)', province: 'Punjab', color: '#16a34a', who: 'Punjab me restaurant, cafe, salon, gym aur doosri services' },
  SRB: { short: 'SRB', label: 'SRB (Sindh)', province: 'Sindh', color: '#2563eb', who: 'Sindh (Karachi, Hyderabad…) me restaurant aur services' },
  KPRA: { short: 'KPRA', label: 'KPRA (KP)', province: 'Khyber Pakhtunkhwa', color: '#d97706', who: 'KP (Peshawar…) me restaurant aur services' },
  FBR: { short: 'FBR', label: 'FBR POS', province: 'Poora Pakistan', color: '#7c3aed', who: 'Bara retail store ya chain (Tier-1) jo maal bechta hai' },
};

export const authLabel = (a: string | null | undefined) => (a && a in AUTH ? AUTH[a as Authority].label : a ?? '—');

export const STATUS: Record<TaxStatus, { label: string; icon: LucideIcon; tone: string; color: string }> = {
  SUCCESS: { label: 'Authority ne le liya', icon: CheckCircle2, tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200', color: '#16a34a' },
  FAILED: { label: 'Fail', icon: XCircle, tone: 'bg-rose-50 text-rose-700 ring-rose-200', color: '#e11d48' },
  PENDING: { label: 'Qatar me', icon: Clock, tone: 'bg-amber-50 text-amber-800 ring-amber-200', color: '#d97706' },
  SKIPPED: { label: 'Nahi bheja', icon: MinusCircle, tone: 'bg-slate-100 text-slate-600 ring-slate-200', color: '#64748b' },
};

export const dayTime = (iso: string) => new Date(iso).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
export const fullTime = (iso: string) => new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
export const monthName = (key: string) => new Date(`${key}-15T12:00:00`).toLocaleDateString('en-PK', { month: 'long', year: 'numeric' });
export const dayShort = (key: string) => new Date(`${key}T12:00:00`).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });

/** Percent change; null when there was nothing to compare with. */
export function change(now: number, before: number) {
  if (!before) return null;
  return Math.round(((now - before) / Math.abs(before)) * 100);
}

export function apiError(e: unknown, fallback = 'Kuch ghalat ho gaya') {
  const err = e as { response?: { data?: { message?: string | string[] } }; message?: string };
  const m = err?.response?.data?.message;
  return (Array.isArray(m) ? m[0] : m) || err?.message || fallback;
}
