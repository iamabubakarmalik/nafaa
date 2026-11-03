/** Payment methods, statuses, starter categories and income categories for the finance screens. */

import { Banknote, BookOpen, Building2, CheckCircle2, Clock, CreditCard, Gift, HandCoins, Home, Landmark, Percent, Receipt, Smartphone, XCircle, Zap, type LucideIcon } from 'lucide-react-native';
import { msg } from '@/core/i18n';
import type { ExpenseStatus, IncomeCategoryCode, IncomeReceivedVia } from '../api/expenses';

export const METHODS: Array<{ id: string; label: string; icon: LucideIcon; color: string }> = [
  { id: 'CASH', label: msg('Cash'), icon: Banknote, color: '#16a34a' },
  { id: 'JAZZCASH', label: msg('JazzCash'), icon: Smartphone, color: '#ea580c' },
  { id: 'EASYPAISA', label: msg('Easypaisa'), icon: Zap, color: '#22c55e' },
  { id: 'BANK_TRANSFER', label: msg('Bank'), icon: Building2, color: '#7c3aed' },
  { id: 'CARD', label: msg('Card'), icon: CreditCard, color: '#2563eb' },
];
export const methodOf = (id: string) => METHODS.find((m) => m.id === id) ?? { id, label: id, icon: Banknote, color: '#64748b' };

export const STATUS: Record<ExpenseStatus, { label: string; icon: LucideIcon; tone: 'success' | 'warning' | 'neutral' }> = {
  PAID: { label: msg('Ada ho gaya'), icon: CheckCircle2, tone: 'success' },
  PENDING: { label: msg('Baqi bill'), icon: Clock, tone: 'warning' },
  CANCELLED: { label: msg('Cancel'), icon: XCircle, tone: 'neutral' },
};

export const COLORS = ['#f59e0b', '#3b82f6', '#8b5cf6', '#10b981', '#ef4444', '#ec4899', '#06b6d4', '#f97316', '#6366f1', '#14b8a6', '#84cc16', '#64748b'];
export const ICONS = ['💸', '🏠', '⚡', '👷', '📦', '🚗', '🔧', '📢', '🌐', '☕', '🏥', '📚', '🧾', '🛡️', '⛽', '🎯'];

/** Categories offered on a fresh shop, with a sample title for the quick buttons. */
export const STARTER_CATEGORIES: Array<{ name: string; icon: string; color: string; sample: string }> = [
  { name: 'Kiraya (Rent)', icon: '🏠', color: '#f59e0b', sample: msg('Dukaan ka kiraya') },
  { name: 'Bijli / Bills', icon: '⚡', color: '#3b82f6', sample: msg('Bijli ka bill') },
  { name: 'Salary / Wages', icon: '👷', color: '#8b5cf6', sample: msg('Staff salary') },
  { name: 'Transport', icon: '🚗', color: '#06b6d4', sample: msg('Petrol / rickshaw') },
  { name: 'Chai-Pani / Khana', icon: '☕', color: '#f97316', sample: msg('Chai-pani') },
  { name: 'Maintenance', icon: '🔧', color: '#64748b', sample: msg('Repair ka kaam') },
  { name: 'Marketing / Ads', icon: '📢', color: '#ec4899', sample: msg('Ishtehar') },
  { name: 'Packing', icon: '📦', color: '#10b981', sample: msg('Shopper / tape') },
];

export const FIXED_INCOME: Array<{ id: Exclude<IncomeCategoryCode, 'CUSTOM'>; label: string; hint: string; icon: LucideIcon; color: string }> = [
  { id: 'COMPANY_INCENTIVE', label: msg('Company incentive'), hint: msg('Target poora karne par company ka inaam'), icon: Gift, color: '#16a34a' },
  { id: 'SCHEME_CLAIM', label: msg('Scheme claim'), hint: msg('Scheme / free maal ka claim'), icon: Receipt, color: '#0891b2' },
  { id: 'COMMISSION', label: msg('Commission'), hint: msg('Easypaisa, bill jama, agency commission'), icon: Percent, color: '#7c3aed' },
  { id: 'RENT', label: msg('Kiraya mila'), hint: msg('Dukaan ka hissa ya godaam kiraye par'), icon: Home, color: '#f59e0b' },
  { id: 'INTEREST', label: msg('Bank profit / interest'), hint: msg('Bank account par mila'), icon: Landmark, color: '#2563eb' },
  { id: 'OTHER', label: msg('Doosri'), hint: msg('Koi aur aamdani'), icon: HandCoins, color: '#64748b' },
];

export const VIA: Record<IncomeReceivedVia, { label: string; hint: string; icon: LucideIcon; color: string }> = {
  CASH_DRAWER: { label: msg('Galle mein cash'), hint: msg('Cash galle mein aaya — shift ke cash hisaab mein judega.'), icon: Banknote, color: '#16a34a' },
  ACCOUNT: { label: msg('Account mein'), hint: msg('Bank, JazzCash ya tijori — us account ka balance barhega.'), icon: Building2, color: '#7c3aed' },
  SUPPLIER_KHATA: { label: msg('Supplier khate mein adjust'), hint: msg('Paisa nahi aaya — company ko jo dena hai woh kam ho jayega.'), icon: BookOpen, color: '#ea580c' },
};

export const incomeCat = (i: { category: IncomeCategoryCode; customCategory?: { name: string; color: string } | null }) => {
  if (i.category === 'CUSTOM' && i.customCategory) return { label: i.customCategory.name, color: i.customCategory.color, icon: HandCoins };
  const f = FIXED_INCOME.find((c) => c.id === i.category) ?? FIXED_INCOME[FIXED_INCOME.length - 1];
  return { label: f.label, color: f.color, icon: f.icon };
};

/** Keys every expense or income change refreshes. */
export const FIN = 'fin';

/** A category icon is shown only when it is an emoji; web category icons are plain names like "truck". */
export function categoryEmoji(icon?: string | null): string {
  return icon && !/^[a-z0-9_-]+$/i.test(icon) ? icon : '';
}
