/**
 * Fixed income categories, where money was received, and small helpers
 * shared by the income page, its form and the category manager.
 */

import { Banknote, BookOpen, Building2, Gift, HandCoins, Home, Landmark, Percent, Receipt, Tag, type LucideIcon } from 'lucide-react';
import type { Income, IncomeCategoryCode, IncomeReceivedVia } from '../api/income.api';

/** Every query of this page lives under this key. */
export const INCOME_KEY = 'income';
export const INCOME_CATEGORIES_KEY = 'income-categories';
/** Keys an income change refreshes: this page, the drawer, money, suppliers and every profit view. */
export const INCOME_AFFECTED_KEYS = [INCOME_KEY, 'cash-register', 'money', 'suppliers', 'dashboard-overview', 'pnl', 'reports-center', 'day-report'];

export const FIXED_CATEGORIES: Array<{ id: Exclude<IncomeCategoryCode, 'CUSTOM'>; label: string; hint: string; icon: LucideIcon; color: string }> = [
  { id: 'COMPANY_INCENTIVE', label: 'Company incentive', hint: 'Target poora karne par company ka inaam', icon: Gift, color: '#16a34a' },
  { id: 'SCHEME_CLAIM', label: 'Scheme claim', hint: 'Scheme / free maal ka claim', icon: Receipt, color: '#0891b2' },
  { id: 'COMMISSION', label: 'Commission', hint: 'Easypaisa, bill jama, agency commission', icon: Percent, color: '#7c3aed' },
  { id: 'RENT', label: 'Kiraya mila', hint: 'Dukaan ka hissa ya godaam kiraye par', icon: Home, color: '#f59e0b' },
  { id: 'INTEREST', label: 'Bank profit / interest', hint: 'Bank account par mila', icon: Landmark, color: '#2563eb' },
  { id: 'OTHER', label: 'Doosri', hint: 'Koi aur aamdani', icon: HandCoins, color: '#64748b' },
];

export const VIA: Record<IncomeReceivedVia, { label: string; short: string; hint: string; icon: LucideIcon; color: string }> = {
  CASH_DRAWER: { label: 'Galle mein cash', short: 'Galla', hint: 'Cash galle mein aaya — shift ke cash hisaab mein judega.', icon: Banknote, color: '#16a34a' },
  ACCOUNT: { label: 'Account mein', short: 'Account', hint: 'Bank, JazzCash ya tijori — us account ka balance barhega.', icon: Building2, color: '#7c3aed' },
  SUPPLIER_KHATA: { label: 'Supplier khate mein adjust', short: 'Supplier khata', hint: 'Paisa nahi aaya — company ko jo dena hai woh kam ho jayega.', icon: BookOpen, color: '#ea580c' },
};

export const COLORS = ['#10b981', '#0891b2', '#7c3aed', '#f59e0b', '#2563eb', '#ec4899', '#ef4444', '#84cc16', '#64748b'];

/** Label, colour and icon of a record's category. */
export function catOf(i: Pick<Income, 'category' | 'customCategory'>) {
  if (i.category === 'CUSTOM' && i.customCategory) return { label: i.customCategory.name, color: i.customCategory.color, icon: Tag };
  const f = FIXED_CATEGORIES.find((c) => c.id === i.category) ?? FIXED_CATEGORIES[FIXED_CATEGORIES.length - 1];
  return { label: f.label, color: f.color, icon: f.icon };
}

export const day = (iso: string) => new Date(iso).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
export const monthLabel = (key: string) => new Date(`${key}-15T12:00:00`).toLocaleDateString('en-PK', { month: 'short', year: '2-digit' });

export function apiError(e: unknown, fallback: string) {
  const err = e as { response?: { data?: { message?: string | string[] } }; message?: string };
  const m = err?.response?.data?.message;
  return (Array.isArray(m) ? m[0] : m) || err?.message || fallback;
}
