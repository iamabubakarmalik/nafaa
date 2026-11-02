/**
 * Shared labels, colours and small helpers for the billing pages: invoice,
 * payment and subscription states, payment methods, plan features and dates.
 */

import {
  AlertCircle, ArrowLeftRight, Ban, Banknote, BarChart3, Bell, BookOpen, Building, CheckCircle2, Clock, CreditCard,
  Download, Gift, Headphones, MessageCircle, Package, Palette, Receipt, RotateCcw, ScanLine, ShoppingCart, Smartphone,
  Sparkles, Store, Tag, TrendingUp, Users, Wallet, XCircle, Zap, type LucideIcon,
} from 'lucide-react';
import type { InvoiceStatus, PaymentProvider, PaymentStatus } from '../api/billing.api';
import type { BillingInterval, SubscriptionStatus } from '@modules/billing/subscriptions/api/subscriptions.api';
import type { Plan } from '@modules/billing/plans/api/plans.api';
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

export const SUBSCRIPTION_STATUS: Record<SubscriptionStatus, StateMeta> = {
  ACTIVE: { label: t('Chalu'), hint: t('Plan chal raha hai, sab kuch khula hai'), icon: CheckCircle2, color: '#16a34a', badge: 'success' },
  TRIAL: { label: t('Free trial'), hint: t('Trial chal raha hai, abhi payment nahi chahiye'), icon: Sparkles, color: '#2563eb', badge: 'info' },
  PAST_DUE: { label: t('Payment baqi'), hint: t('3 din ki mohlat — jaldi renew karein'), icon: Clock, color: '#d97706', badge: 'warning' },
  EXPIRED: { label: t('Khatam'), hint: t('Plan khatam ho gaya — renew karein'), icon: XCircle, color: '#e11d48', badge: 'danger' },
  PENDING_PAYMENT: { label: t('Payment check ho rahi'), hint: t('Payment approve hote hi plan chalu hoga'), icon: Clock, color: '#d97706', badge: 'warning' },
  CANCELLED: { label: t('Band'), hint: t('Plan band kar diya gaya'), icon: Ban, color: '#64748b', badge: 'default' },
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

export const priceFor = (plan: Plan, interval: BillingInterval) =>
  interval === 'MONTHLY' ? plan.priceMonthly : interval === 'QUARTERLY' ? plan.priceQuarterly : plan.priceYearly;

/** Saving against paying month by month, or null. */
export function savingFor(plan: Plan, interval: BillingInterval) {
  if (!plan.priceMonthly || interval === 'MONTHLY') return null;
  const full = plan.priceMonthly * INTERVAL[interval].months;
  const amount = full - priceFor(plan, interval);
  return amount > 0 ? { amount, percent: Math.round((amount / full) * 100) } : null;
}

/** A limit at or above `unlimitedAt` means "no limit" (999 for people and branches, 999999 for counts). */
export const limitText = (limit: number, unlimitedAt: number) => (limit >= unlimitedAt ? t('Be-hisaab') : limit.toLocaleString('en-PK'));

type FeatureKey = { [K in keyof Plan]-?: Plan[K] extends boolean ? K : never }[keyof Plan];
export interface PlanFeature { key: string; planKey: FeatureKey; label: string; icon: LucideIcon }

/** Feature switches of a plan; `key` matches /plan-usage `features`. */
export const PLAN_FEATURES: PlanFeature[] = [
  { key: 'pos', planKey: 'featurePos', label: t('POS counter'), icon: ShoppingCart },
  { key: 'barcodeScanner', planKey: 'featureBarcodeScanner', label: t('Barcode scanner'), icon: ScanLine },
  { key: 'khata', planKey: 'featureKhata', label: t('Khata (udhaar)'), icon: BookOpen },
  { key: 'cashRegister', planKey: 'featureCashRegister', label: t('Cash drawer'), icon: Wallet },
  { key: 'returns', planKey: 'featureReturns', label: t('Maal return'), icon: RotateCcw },
  { key: 'reports', planKey: 'featureReports', label: t('Reports'), icon: BarChart3 },
  { key: 'profitReport', planKey: 'featureProfitReport', label: t('Profit report'), icon: TrendingUp },
  { key: 'discounts', planKey: 'featureDiscounts', label: t('Discount codes'), icon: Tag },
  { key: 'loyalty', planKey: 'featureLoyalty', label: t('Loyalty points'), icon: Gift },
  { key: 'multiShop', planKey: 'featureMultiShop', label: t('Kai branches'), icon: Store },
  { key: 'stockTransfer', planKey: 'featureStockTransfer', label: t('Stock transfer'), icon: ArrowLeftRight },
  { key: 'exports', planKey: 'featureExports', label: t('Excel / PDF files'), icon: Download },
  { key: 'backup', planKey: 'featureBackup', label: t('Backup'), icon: Package },
  { key: 'notifications', planKey: 'featureNotifications', label: t('Notifications'), icon: Bell },
  { key: 'whatsappReceipt', planKey: 'featureWhatsappReceipt', label: t('WhatsApp bill'), icon: MessageCircle },
  { key: 'customBranding', planKey: 'featureCustomBranding', label: t('Apna logo / rang'), icon: Palette },
  { key: 'support24x7', planKey: 'featureSupport24x7', label: t('24/7 support'), icon: Headphones },
];

/** Limits of a plan, in the order the usage page shows them. */
export const PLAN_LIMITS: Array<{ key: 'products' | 'users' | 'shops' | 'salesThisMonth'; planKey: 'maxProducts' | 'maxUsers' | 'maxShops' | 'maxSalesPerMonth'; label: string; icon: LucideIcon; color: string; unlimitedAt: number }> = [
  { key: 'products', planKey: 'maxProducts', label: t('Products'), icon: Package, color: '#7c3aed', unlimitedAt: 999_999 },
  { key: 'users', planKey: 'maxUsers', label: t('Team ke log'), icon: Users, color: '#2563eb', unlimitedAt: 999 },
  { key: 'shops', planKey: 'maxShops', label: t('Branches'), icon: Store, color: '#0891b2', unlimitedAt: 999 },
  { key: 'salesThisMonth', planKey: 'maxSalesPerMonth', label: t('Is mahine ke bill'), icon: Receipt, color: '#16a34a', unlimitedAt: 999_999 },
];

export const formatDate = (value: string | null | undefined) =>
  value ? new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium' }).format(new Date(value)) : '—';

export const formatDateTime = (value: string | null | undefined) =>
  value ? new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';

/** Whole days until a date; negative once it has passed. */
export const daysUntil = (value: string | null | undefined) =>
  value ? Math.ceil((new Date(value).getTime() - Date.now()) / 86_400_000) : 0;

export const daysText = (days: number) => (days > 1 ? t('{{days}} din baqi', { days }) : days === 1 ? t('Kal') : days === 0 ? t('Aaj') : t('{{days}} din pehle', { days: Math.abs(days) }));
