/**
 * Payment methods, statuses, starter categories and small helpers shared by
 * the expenses page, its form, analytics and print-outs.
 */

import { Banknote, Building2, CheckCircle2, Clock, CreditCard, Smartphone, XCircle, Zap, type LucideIcon } from 'lucide-react';
import type { Expense, ExpenseCategory, ExpenseMethod, ExpenseStatus } from '../api/expenses.api';
import { t } from '@core/i18n';

/** Every query of this page lives under this key. */
export const EXPENSES_KEY = 'expenses';
export const CATEGORIES_KEY = 'expense-categories';

export const METHODS: Array<{ id: ExpenseMethod; label: string; icon: LucideIcon; color: string }> = [
  { id: 'CASH', label: t('Cash'), icon: Banknote, color: '#16a34a' },
  { id: 'JAZZCASH', label: t('JazzCash'), icon: Smartphone, color: '#ea580c' },
  { id: 'EASYPAISA', label: t('Easypaisa'), icon: Zap, color: '#22c55e' },
  { id: 'BANK_TRANSFER', label: t('Bank'), icon: Building2, color: '#7c3aed' },
  { id: 'CARD', label: t('Card'), icon: CreditCard, color: '#2563eb' },
];

export const methodOf = (id: string) => METHODS.find((m) => m.id === id) ?? { id, label: id, icon: Banknote, color: '#64748b' };

export const STATUS: Record<ExpenseStatus, { label: string; icon: LucideIcon; tone: string }> = {
  PAID: { label: t('Ada ho gaya'), icon: CheckCircle2, tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  PENDING: { label: t('Baqi bill'), icon: Clock, tone: 'bg-amber-50 text-amber-800 ring-amber-200' },
  CANCELLED: { label: t('Cancel'), icon: XCircle, tone: 'bg-slate-100 text-slate-500 ring-slate-200' },
};

export const COLORS = ['#f59e0b', '#3b82f6', '#8b5cf6', '#10b981', '#ef4444', '#ec4899', '#06b6d4', '#f97316', '#6366f1', '#14b8a6', '#84cc16', '#64748b'];

/** Categories offered on a fresh shop, with a sample title for the quick buttons. */
export const STARTER_CATEGORIES: Array<{ name: string; icon: string; color: string; sample: string }> = [
  { name: 'Kiraya (Rent)', icon: '🏠', color: '#f59e0b', sample: t('Dukaan ka kiraya') },
  { name: 'Bijli / Bills', icon: '⚡', color: '#3b82f6', sample: t('Bijli ka bill') },
  { name: 'Salary / Wages', icon: '👷', color: '#8b5cf6', sample: t('Staff salary') },
  { name: 'Transport', icon: '🚗', color: '#06b6d4', sample: t('Petrol / rickshaw') },
  { name: 'Chai-Pani / Khana', icon: '☕', color: '#f97316', sample: t('Chai-pani') },
  { name: 'Maintenance', icon: '🔧', color: '#64748b', sample: t('Repair ka kaam') },
  { name: 'Marketing / Ads', icon: '📢', color: '#ec4899', sample: t('Ishtehar') },
  { name: 'Packing', icon: '📦', color: '#10b981', sample: t('Shopper / tape') },
];

/** Icons a category can carry; existing categories already use these. */
export const ICONS = ['💸', '🏠', '⚡', '👷', '📦', '🚗', '🔧', '📢', '🌐', '☕', '🏥', '📚', '🧾', '🛡️', '⛽', '🎯'];

export const NO_CATEGORY: Pick<ExpenseCategory, 'name' | 'color' | 'icon'> = { name: 'Bina category', color: '#64748b', icon: null };

export const catOf = (e: Expense) => e.category ?? NO_CATEGORY;

export const day = (iso: string) => new Date(iso).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
export const dayTime = (iso: string) => new Date(iso).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
export const monthLabel = (key: string) => new Date(`${key}-15T12:00:00`).toLocaleDateString('en-PK', { month: 'short', year: '2-digit' });

export function apiError(e: unknown, fallback: string) {
  const err = e as { response?: { data?: { message?: string | string[] } }; message?: string };
  const m = err?.response?.data?.message;
  return (Array.isArray(m) ? m[0] : m) || err?.message || fallback;
}
