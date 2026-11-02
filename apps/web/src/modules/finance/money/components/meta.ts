/**
 * Accounts, sources and small helpers shared by the shop accounts page, its
 * analytics and the printed statement.
 */

import {
  ArrowDownToLine, ArrowLeftRight, ArrowUpFromLine, BookOpen, Building2, CalendarCheck, CreditCard, Landmark, PiggyBank, Receipt, Scale,
  ShoppingCart, Smartphone, Truck, Undo2, Vault, Wallet,
  type LucideIcon,
} from 'lucide-react';
import { PAYMENT_COLORS } from '@modules/dashboard/engine/useChartTheme';
import type {
  AutoSource, MoneyAccount, MoneyAccountKind, MoneyDirection, MoneyEntry, MoneyEntryType, MoneySource,
} from '../api/money.api';
import { t } from '@core/i18n';

export const ACCOUNTS: Record<MoneyAccount, { label: string; short: string; icon: LucideIcon; color: string; hint: string }> = {
  CASH: { label: t('Cash'), short: t('Cash'), icon: Wallet, color: PAYMENT_COLORS.CASH, hint: t('Golak / drawer') },
  BANK_TRANSFER: { label: t('Bank transfer'), short: t('Bank'), icon: Building2, color: PAYMENT_COLORS.BANK_TRANSFER, hint: t('Bank account me') },
  CARD: { label: t('Card'), short: t('Card'), icon: CreditCard, color: PAYMENT_COLORS.CARD, hint: t('Card machine se bank me') },
  JAZZCASH: { label: t('JazzCash'), short: t('JazzCash'), icon: Smartphone, color: PAYMENT_COLORS.JAZZCASH, hint: t('Mobile wallet') },
  EASYPAISA: { label: t('Easypaisa'), short: t('Easypaisa'), icon: Smartphone, color: PAYMENT_COLORS.EASYPAISA, hint: t('Mobile wallet') },
};
export const ACCOUNT_IDS = Object.keys(ACCOUNTS) as MoneyAccount[];

export const SOURCES: Record<MoneySource, { label: string; icon: LucideIcon; color: string; direction: MoneyDirection; hint: string }> = {
  SALE: { label: t('Sale'), icon: ShoppingCart, color: '#16a34a', direction: 'in', hint: t('Bill par jo paisa mila (change ke baad)') },
  KHATA: { label: t('Khata wasooli'), icon: BookOpen, color: '#0891b2', direction: 'in', hint: t('Customer ne purana udhaar diya') },
  CASH_IN: { label: t('Cash daala'), icon: ArrowDownToLine, color: '#059669', direction: 'in', hint: t('Golak me haath se daala') },
  REFUND: { label: t('Return'), icon: Undo2, color: '#f97316', direction: 'out', hint: t('Return par customer ko diya') },
  PURCHASE: { label: t('Purchase'), icon: Truck, color: '#6366f1', direction: 'out', hint: t('Purchase ke waqt supplier ko diya') },
  SUPPLIER: { label: t('Supplier payment'), icon: Truck, color: '#7c3aed', direction: 'out', hint: t('Supplier ke khate me baad me diya') },
  EXPENSE: { label: t('Kharch'), icon: Receipt, color: '#d97706', direction: 'out', hint: t('Bijli, kiraya, tankhwah waghera') },
  CASH_OUT: { label: t('Cash nikala'), icon: ArrowUpFromLine, color: '#e11d48', direction: 'out', hint: t('Golak se haath se nikala') },
};
export const SOURCE_IDS = Object.keys(SOURCES) as MoneySource[];

/** Kinds of money account (safe, bank, wallet). */
export const KINDS: Record<MoneyAccountKind, { label: string; icon: LucideIcon; color: string; hint: string }> = {
  CASH: { label: t('Tijori / cash'), icon: Vault, color: '#16a34a', hint: t('Golak se alag rakha cash') },
  BANK: { label: t('Bank account'), icon: Landmark, color: '#2563eb', hint: t('HBL, Meezan, UBL waghera') },
  WALLET: { label: t('Mobile wallet'), icon: Smartphone, color: '#dc2626', hint: t('JazzCash, Easypaisa, NayaPay') },
};
export const KIND_IDS = Object.keys(KINDS) as MoneyAccountKind[];

/** Lines of an account statement: automatic sources and manual entries. */
export const STATEMENT_KINDS: Record<AutoSource | MoneyEntryType, { label: string; icon: LucideIcon; color: string }> = {
  SALE: { label: t('Sale'), icon: ShoppingCart, color: '#16a34a' },
  KHATA: { label: t('Khata wasooli'), icon: BookOpen, color: '#0891b2' },
  BOOKING: { label: t('Booking'), icon: CalendarCheck, color: '#0d9488' },
  BOOKING_REFUND: { label: t('Booking return'), icon: Undo2, color: '#f97316' },
  REFUND: { label: t('Return'), icon: Undo2, color: '#f97316' },
  PURCHASE: { label: t('Purchase'), icon: Truck, color: '#6366f1' },
  SUPPLIER: { label: t('Supplier payment'), icon: Truck, color: '#7c3aed' },
  EXPENSE: { label: t('Kharch'), icon: Receipt, color: '#d97706' },
  DEPOSIT: { label: t('Jama'), icon: PiggyBank, color: '#059669' },
  WITHDRAW: { label: t('Nikala'), icon: ArrowUpFromLine, color: '#e11d48' },
  TRANSFER_IN: { label: t('Aaya (transfer)'), icon: ArrowLeftRight, color: '#0891b2' },
  TRANSFER_OUT: { label: t('Bheja (transfer)'), icon: ArrowLeftRight, color: '#7c3aed' },
  ADJUSTMENT: { label: t('Correction'), icon: Scale, color: '#64748b' },
};

/** Account number with all but the last 4 digits hidden. */
export function maskNumber(v: string | null | undefined): string {
  const s = (v ?? '').replace(/\s+/g, '');
  if (!s) return '';
  return s.length <= 4 ? s : `•••• ${s.slice(-4)}`;
}

/** One key per form; a double click or retry posts once. */
export const newRequestId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

/** Every query of this page lives under this key. */
export const MONEY_KEY = 'money';

export const when = (iso: string) =>
  new Date(iso).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

/** Page that opens the record behind a ledger row. */
export function entryLink(e: MoneyEntry): string | null {
  switch (e.source) {
    case 'SALE':
    case 'REFUND': return e.linkId ? `/sales/${e.linkId}/receipt` : null;
    case 'PURCHASE': return e.linkId ? `/purchases/${e.linkId}` : null;
    case 'SUPPLIER': return e.linkId ? `/suppliers/${e.linkId}` : null;
    case 'KHATA': return e.linkId ? `/customers/${e.linkId}` : null;
    case 'EXPENSE': return '/expenses';
    case 'CASH_IN':
    case 'CASH_OUT': return '/cash-register';
  }
}

/** Main line of a ledger row: who or what the money was for. */
export const entryTitle = (e: MoneyEntry) => e.party || SOURCES[e.source].label;

export function apiError(e: unknown, fallback: string) {
  const err = e as { response?: { data?: { message?: string | string[] } }; message?: string };
  const m = err?.response?.data?.message;
  return (Array.isArray(m) ? m[0] : m) || err?.message || fallback;
}
