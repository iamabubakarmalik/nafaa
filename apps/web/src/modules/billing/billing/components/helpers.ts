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

interface StateMeta { label: string; hint: string; icon: LucideIcon; color: string; badge: BadgeVariant }

export const INVOICE_STATUS: Record<InvoiceStatus, StateMeta> = {
  DRAFT: { label: 'Draft', hint: 'Abhi tayyar ho rahi hai', icon: Clock, color: '#64748b', badge: 'default' },
  PENDING: { label: 'Baqi', hint: 'Payment karni hai', icon: Clock, color: '#d97706', badge: 'warning' },
  OVERDUE: { label: 'Der ho gayi', hint: 'Due date guzar gayi', icon: AlertCircle, color: '#e11d48', badge: 'danger' },
  PAID: { label: 'Ada', hint: 'Payment mil gayi', icon: CheckCircle2, color: '#16a34a', badge: 'success' },
  CANCELLED: { label: 'Cancel', hint: 'Ye bill band hai', icon: XCircle, color: '#94a3b8', badge: 'default' },
  REFUNDED: { label: 'Wapas', hint: 'Paise wapas kiye gaye', icon: RotateCcw, color: '#2563eb', badge: 'info' },
};

export const PAYMENT_STATUS: Record<PaymentStatus, StateMeta> = {
  PENDING: { label: 'Check ho rahi hai', hint: 'Nafaa team 24 ghante me dekhegi', icon: Clock, color: '#d97706', badge: 'warning' },
  APPROVED: { label: 'Approve', hint: 'Plan chalu ho gaya', icon: CheckCircle2, color: '#16a34a', badge: 'success' },
  REJECTED: { label: 'Wapas ki gayi', hint: 'Wajah parh kar dobara bhejein', icon: XCircle, color: '#e11d48', badge: 'danger' },
  REFUNDED: { label: 'Wapas', hint: 'Paise wapas kiye gaye', icon: RotateCcw, color: '#2563eb', badge: 'info' },
};

export const SUBSCRIPTION_STATUS: Record<SubscriptionStatus, StateMeta> = {
  ACTIVE: { label: 'Chalu', hint: 'Plan chal raha hai, sab kuch khula hai', icon: CheckCircle2, color: '#16a34a', badge: 'success' },
  TRIAL: { label: 'Free trial', hint: 'Trial chal raha hai, abhi payment nahi chahiye', icon: Sparkles, color: '#2563eb', badge: 'info' },
  PAST_DUE: { label: 'Payment baqi', hint: '3 din ki mohlat — jaldi renew karein', icon: Clock, color: '#d97706', badge: 'warning' },
  EXPIRED: { label: 'Khatam', hint: 'Plan khatam ho gaya — renew karein', icon: XCircle, color: '#e11d48', badge: 'danger' },
  PENDING_PAYMENT: { label: 'Payment check ho rahi', hint: 'Payment approve hote hi plan chalu hoga', icon: Clock, color: '#d97706', badge: 'warning' },
  CANCELLED: { label: 'Band', hint: 'Plan band kar diya gaya', icon: Ban, color: '#64748b', badge: 'default' },
};

export const PROVIDER: Record<PaymentProvider, { label: string; hint: string; icon: LucideIcon; color: string }> = {
  MANUAL_BANK: { label: 'Bank transfer', hint: 'Account number / IBAN par', icon: Building, color: '#059669' },
  JAZZCASH: { label: 'JazzCash', hint: 'Mobile wallet', icon: Smartphone, color: '#ea580c' },
  EASYPAISA: { label: 'EasyPaisa', hint: 'Mobile wallet', icon: Zap, color: '#16a34a' },
  NAYAPAY: { label: 'NayaPay', hint: 'NayaPay number ya handle', icon: Wallet, color: '#7c3aed' },
  STRIPE: { label: 'Card', hint: 'Visa / Mastercard', icon: CreditCard, color: '#2563eb' },
  CASH: { label: 'Cash', hint: 'Naqad', icon: Banknote, color: '#15803d' },
};

export const INTERVAL: Record<BillingInterval, { label: string; per: string; months: number }> = {
  MONTHLY: { label: 'Mahana', per: 'mahina', months: 1 },
  QUARTERLY: { label: '3 mahine', per: '3 mahine', months: 3 },
  YEARLY: { label: 'Saalana', per: 'saal', months: 12 },
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
export const limitText = (limit: number, unlimitedAt: number) => (limit >= unlimitedAt ? 'Be-hisaab' : limit.toLocaleString('en-PK'));

type FeatureKey = { [K in keyof Plan]-?: Plan[K] extends boolean ? K : never }[keyof Plan];
export interface PlanFeature { key: string; planKey: FeatureKey; label: string; icon: LucideIcon }

/** Feature switches of a plan; `key` matches /plan-usage `features`. */
export const PLAN_FEATURES: PlanFeature[] = [
  { key: 'pos', planKey: 'featurePos', label: 'POS counter', icon: ShoppingCart },
  { key: 'barcodeScanner', planKey: 'featureBarcodeScanner', label: 'Barcode scanner', icon: ScanLine },
  { key: 'khata', planKey: 'featureKhata', label: 'Khata (udhaar)', icon: BookOpen },
  { key: 'cashRegister', planKey: 'featureCashRegister', label: 'Cash drawer', icon: Wallet },
  { key: 'returns', planKey: 'featureReturns', label: 'Maal return', icon: RotateCcw },
  { key: 'reports', planKey: 'featureReports', label: 'Reports', icon: BarChart3 },
  { key: 'profitReport', planKey: 'featureProfitReport', label: 'Profit report', icon: TrendingUp },
  { key: 'discounts', planKey: 'featureDiscounts', label: 'Discount codes', icon: Tag },
  { key: 'loyalty', planKey: 'featureLoyalty', label: 'Loyalty points', icon: Gift },
  { key: 'multiShop', planKey: 'featureMultiShop', label: 'Kai branches', icon: Store },
  { key: 'stockTransfer', planKey: 'featureStockTransfer', label: 'Stock transfer', icon: ArrowLeftRight },
  { key: 'exports', planKey: 'featureExports', label: 'Excel / PDF files', icon: Download },
  { key: 'backup', planKey: 'featureBackup', label: 'Backup', icon: Package },
  { key: 'notifications', planKey: 'featureNotifications', label: 'Notifications', icon: Bell },
  { key: 'whatsappReceipt', planKey: 'featureWhatsappReceipt', label: 'WhatsApp bill', icon: MessageCircle },
  { key: 'customBranding', planKey: 'featureCustomBranding', label: 'Apna logo / rang', icon: Palette },
  { key: 'support24x7', planKey: 'featureSupport24x7', label: '24/7 support', icon: Headphones },
];

/** Limits of a plan, in the order the usage page shows them. */
export const PLAN_LIMITS: Array<{ key: 'products' | 'users' | 'shops' | 'salesThisMonth'; planKey: 'maxProducts' | 'maxUsers' | 'maxShops' | 'maxSalesPerMonth'; label: string; icon: LucideIcon; color: string; unlimitedAt: number }> = [
  { key: 'products', planKey: 'maxProducts', label: 'Products', icon: Package, color: '#7c3aed', unlimitedAt: 999_999 },
  { key: 'users', planKey: 'maxUsers', label: 'Team ke log', icon: Users, color: '#2563eb', unlimitedAt: 999 },
  { key: 'shops', planKey: 'maxShops', label: 'Branches', icon: Store, color: '#0891b2', unlimitedAt: 999 },
  { key: 'salesThisMonth', planKey: 'maxSalesPerMonth', label: 'Is mahine ke bill', icon: Receipt, color: '#16a34a', unlimitedAt: 999_999 },
];

export const formatDate = (value: string | null | undefined) =>
  value ? new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium' }).format(new Date(value)) : '—';

export const formatDateTime = (value: string | null | undefined) =>
  value ? new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';

/** Whole days until a date; negative once it has passed. */
export const daysUntil = (value: string | null | undefined) =>
  value ? Math.ceil((new Date(value).getTime() - Date.now()) / 86_400_000) : 0;

export const daysText = (days: number) => (days > 1 ? `${days} din baqi` : days === 1 ? 'Kal' : days === 0 ? 'Aaj' : `${Math.abs(days)} din pehle`);
