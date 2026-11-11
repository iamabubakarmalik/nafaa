/**
 * Shared labels, colours and small helpers for the billing pages: invoice,
 * payment states, payment methods, billing periods and dates.
 */

import {
  AlertCircle, ArrowLeftRight, Ban, Banknote, BarChart3, Bell, BookOpen, Building, CheckCircle2, Clock, CreditCard,
  Download, Gift, Headphones, MessageCircle, Package, Palette, Receipt, RotateCcw, ScanLine, ShoppingCart, Smartphone,
  Sparkles, Store, Tag, TrendingUp, Users, Wallet, XCircle, Zap, type LucideIcon,
} from 'lucide-react';
import type { InvoiceStatus, PaymentProvider, PaymentStatus } from '../api/billing.api';
import type { BillingInterval } from '@modules/billing/subscriptions/api/subscriptions.api';
import type { BadgeVariant } from '@/design-system/components';
import { t } from '@core/i18n';

interface StateMeta { label: string; hint: string; icon: LucideIcon; color: string; badge: BadgeVariant }

export const INVOICE_STATUS: Record<InvoiceStatus, StateMeta> = {
  DRAFT: { label: t('Draft'), hint: t('Abhi tayyar ho rahi hai'), icon: Clock, color: '#64748b', badge: 'default' },
  PENDING: { label: t('Baqi'), hint: t('Payment karni hai'), icon: Clock, color: '#d97706', badge: 'warning' },
  OVERDUE: { label: t('Der ho gayi'), hint: t('Due date guzar gayi'), icon: AlertCircle, color: '#e11d48', badge: 'danger' },
  PAID: { label: t('Ada'), hint: t('Payment mil gayi'), icon: CheckCircle2, color: '#16a34a', badge: 'success' },
  CANCELLED: { label: t('Cancel'), hint: t('Ye bill band hai'), icon: XCircle, color: '#94a3b8', badge: 'default' },
  REFUNDED: { label: t('Wapas'), hint: t('Paise wapas kiye gaye'), icon: RotateCcw, color: '#2563eb', badge: 'info' },
};

export const PAYMENT_STATUS: Record<PaymentStatus, StateMeta> = {
  PENDING: { label: t('Check ho rahi hai'), hint: t('Nafaa team 24 ghante me dekhegi'), icon: Clock, color: '#d97706', badge: 'warning' },
  APPROVED: { label: t('Approve'), hint: t('Plan chalu ho gaya'), icon: CheckCircle2, color: '#16a34a', badge: 'success' },
  REJECTED: { label: t('Wapas ki gayi'), hint: t('Wajah parh kar dobara bhejein'), icon: XCircle, color: '#e11d48', badge: 'danger' },
  REFUNDED: { label: t('Wapas'), hint: t('Paise wapas kiye gaye'), icon: RotateCcw, color: '#2563eb', badge: 'info' },
};

export const PROVIDER: Record<PaymentProvider, { label: string; hint: string; icon: LucideIcon; color: string }> = {
  MANUAL_BANK: { label: t('Bank transfer'), hint: t('Account number / IBAN par'), icon: Building, color: '#059669' },
  JAZZCASH: { label: t('JazzCash'), hint: t('Mobile wallet'), icon: Smartphone, color: '#ea580c' },
  EASYPAISA: { label: t('EasyPaisa'), hint: t('Mobile wallet'), icon: Zap, color: '#16a34a' },
  NAYAPAY: { label: t('NayaPay'), hint: t('NayaPay number ya handle'), icon: Wallet, color: '#7c3aed' },
  STRIPE: { label: t('Card'), hint: t('Visa / Mastercard'), icon: CreditCard, color: '#2563eb' },
  CASH: { label: t('Cash'), hint: t('Naqad'), icon: Banknote, color: '#15803d' },
};

export const INTERVAL: Record<BillingInterval, { label: string; per: string; months: number }> = {
  MONTHLY: { label: t('Mahana'), per: 'mahina', months: 1 },
  QUARTERLY: { label: t('3 mahine'), per: '3 mahine', months: 3 },
  YEARLY: { label: t('Saalana'), per: 'saal', months: 12 },
};

export const formatDate = (value: string | null | undefined) =>
  value ? new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium' }).format(new Date(value)) : '—';

export const formatDateTime = (value: string | null | undefined) =>
  value ? new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';

/** Whole days until a date; negative once it has passed. */
export const daysUntil = (value: string | null | undefined) =>
  value ? Math.ceil((new Date(value).getTime() - Date.now()) / 86_400_000) : 0;

export const daysText = (days: number) => (days > 1 ? t('{{days}} din baqi', { days }) : days === 1 ? t('Kal') : days === 0 ? t('Aaj') : t('{{days}} din pehle', { days: Math.abs(days) }));
