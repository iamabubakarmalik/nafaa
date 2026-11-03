/** Labels, tones and helpers shared by the billing screens (same wording as the web). */

import {
  AlertCircle, ArrowLeftRight, Ban, Banknote, BarChart3, Bell, BookOpen, Building, CheckCircle2, Clock, CreditCard,
  Download, Gift, Headphones, MessageCircle, Package, Palette, Receipt, RotateCcw, ScanLine, ShoppingCart, Smartphone,
  Sparkles, Store, Tag, TrendingUp, Users, Wallet, XCircle, Zap, type LucideIcon,
} from 'lucide-react-native';
import { msg, t } from '@/core/i18n';
import { canPurchaseInApp } from '@/core/platform/purchases';
import type { StatusTone } from '@/design';
import type { BillingInterval, InvoiceStatus, PaymentProvider, PaymentStatus, Plan, SubscriptionStatus } from '../api/billing';

export interface StateMeta { label: string; hint: string; icon: LucideIcon; tone: StatusTone }

export const INVOICE_STATUS: Record<InvoiceStatus, StateMeta> = {
  DRAFT: { label: msg('Draft'), hint: msg('Abhi tayyar ho rahi hai'), icon: Clock, tone: 'neutral' },
  PENDING: { label: msg('Baqi'), hint: msg('Payment karni hai'), icon: Clock, tone: 'warning' },
  OVERDUE: { label: msg('Der ho gayi'), hint: msg('Due date guzar gayi'), icon: AlertCircle, tone: 'danger' },
  PAID: { label: msg('Ada'), hint: msg('Payment mil gayi'), icon: CheckCircle2, tone: 'success' },
  CANCELLED: { label: msg('Cancel'), hint: msg('Ye bill band hai'), icon: XCircle, tone: 'neutral' },
  REFUNDED: { label: msg('Wapas'), hint: msg('Paise wapas kiye gaye'), icon: RotateCcw, tone: 'info' },
};

export const PAYMENT_STATUS: Record<PaymentStatus, StateMeta> = {
  PENDING: { label: msg('Check ho rahi hai'), hint: msg('Nafaa team 24 ghante me dekhegi'), icon: Clock, tone: 'warning' },
  APPROVED: { label: msg('Approve'), hint: msg('Plan chalu ho gaya'), icon: CheckCircle2, tone: 'success' },
  REJECTED: { label: msg('Wapas ki gayi'), hint: msg('Wajah parh kar dobara bhejein'), icon: XCircle, tone: 'danger' },
  REFUNDED: { label: msg('Wapas'), hint: msg('Paise wapas kiye gaye'), icon: RotateCcw, tone: 'info' },
};

export const SUBSCRIPTION_STATUS: Record<SubscriptionStatus, StateMeta> = {
  ACTIVE: { label: msg('Chalu'), hint: msg('Plan chal raha hai, sab kuch khula hai'), icon: CheckCircle2, tone: 'success' },
  TRIAL: { label: msg('Free trial'), hint: msg('Trial chal raha hai, abhi payment nahi chahiye'), icon: Sparkles, tone: 'info' },
  PAST_DUE: { label: msg('Payment baqi'), hint: msg('3 din ki mohlat — jaldi renew karein'), icon: Clock, tone: 'warning' },
  EXPIRED: { label: msg('Khatam'), hint: msg('Plan khatam ho gaya — renew karein'), icon: XCircle, tone: 'danger' },
  PENDING_PAYMENT: { label: msg('Payment check ho rahi'), hint: msg('Payment approve hote hi plan chalu hoga'), icon: Clock, tone: 'warning' },
  CANCELLED: { label: msg('Band'), hint: msg('Plan band kar diya gaya'), icon: Ban, tone: 'neutral' },
};

/** Status hint; on iOS the "renew" nudges become plain facts (App Store rule). */
export function subscriptionHint(status: SubscriptionStatus): string {
  if (!canPurchaseInApp() && (status === 'PAST_DUE' || status === 'EXPIRED')) return t('Plan active nahi hai');
  if (!canPurchaseInApp() && status === 'TRIAL') return t('Free trial chal raha hai');
  return t(SUBSCRIPTION_STATUS[status].hint);
}

export const PROVIDER: Record<PaymentProvider, { label: string; hint: string; icon: LucideIcon }> = {
  MANUAL_BANK: { label: msg('Bank transfer'), hint: msg('Account number / IBAN par'), icon: Building },
  JAZZCASH: { label: msg('JazzCash'), hint: msg('Mobile wallet'), icon: Smartphone },
  EASYPAISA: { label: msg('EasyPaisa'), hint: msg('Mobile wallet'), icon: Zap },
  NAYAPAY: { label: msg('NayaPay'), hint: msg('NayaPay number ya handle'), icon: Wallet },
  STRIPE: { label: msg('Card'), hint: msg('Visa / Mastercard'), icon: CreditCard },
  CASH: { label: msg('Cash'), hint: msg('Naqad'), icon: Banknote },
};

export const INTERVAL: Record<BillingInterval, { label: string; per: string; months: number }> = {
  MONTHLY: { label: msg('Mahana'), per: msg('mahina'), months: 1 },
  QUARTERLY: { label: msg('3 mahine'), per: msg('3 mahine'), months: 3 },
  YEARLY: { label: msg('Saalana'), per: msg('saal'), months: 12 },
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

/** A limit at or above `unlimitedAt` means "no limit". */
export const limitText = (limit: number, unlimitedAt: number) => (limit >= unlimitedAt ? t('Be-hisaab') : limit.toLocaleString('en-US'));

export function usedPercent(current: number, limit: number, unlimitedAt: number) {
  if (limit >= unlimitedAt || limit <= 0) return null;
  return Math.min(100, Math.round((current / limit) * 100));
}

type FeatureKey = { [K in keyof Plan]-?: Plan[K] extends boolean ? K : never }[keyof Plan];
export interface PlanFeature { key: string; planKey: FeatureKey; label: string; icon: LucideIcon }

export const PLAN_FEATURES: PlanFeature[] = [
  { key: 'pos', planKey: 'featurePos', label: msg('POS counter'), icon: ShoppingCart },
  { key: 'barcodeScanner', planKey: 'featureBarcodeScanner', label: msg('Barcode scanner'), icon: ScanLine },
  { key: 'khata', planKey: 'featureKhata', label: msg('Khata (udhaar)'), icon: BookOpen },
  { key: 'cashRegister', planKey: 'featureCashRegister', label: msg('Cash drawer'), icon: Wallet },
  { key: 'returns', planKey: 'featureReturns', label: msg('Maal return'), icon: RotateCcw },
  { key: 'reports', planKey: 'featureReports', label: msg('Reports'), icon: BarChart3 },
  { key: 'profitReport', planKey: 'featureProfitReport', label: msg('Profit report'), icon: TrendingUp },
  { key: 'discounts', planKey: 'featureDiscounts', label: msg('Discount codes'), icon: Tag },
  { key: 'loyalty', planKey: 'featureLoyalty', label: msg('Loyalty points'), icon: Gift },
  { key: 'multiShop', planKey: 'featureMultiShop', label: msg('Kai branches'), icon: Store },
  { key: 'stockTransfer', planKey: 'featureStockTransfer', label: msg('Stock transfer'), icon: ArrowLeftRight },
  { key: 'exports', planKey: 'featureExports', label: msg('Excel / PDF files'), icon: Download },
  { key: 'backup', planKey: 'featureBackup', label: msg('Backup'), icon: Package },
  { key: 'notifications', planKey: 'featureNotifications', label: msg('Notifications'), icon: Bell },
  { key: 'whatsappReceipt', planKey: 'featureWhatsappReceipt', label: msg('WhatsApp bill'), icon: MessageCircle },
  { key: 'customBranding', planKey: 'featureCustomBranding', label: msg('Apna logo / rang'), icon: Palette },
  { key: 'support24x7', planKey: 'featureSupport24x7', label: msg('24/7 support'), icon: Headphones },
];

export const PLAN_LIMITS: Array<{
  key: 'products' | 'users' | 'shops' | 'salesThisMonth';
  planKey: 'maxProducts' | 'maxUsers' | 'maxShops' | 'maxSalesPerMonth';
  label: string; icon: LucideIcon; unlimitedAt: number;
}> = [
  { key: 'products', planKey: 'maxProducts', label: msg('Products'), icon: Package, unlimitedAt: 999_999 },
  { key: 'users', planKey: 'maxUsers', label: msg('Team ke log'), icon: Users, unlimitedAt: 999 },
  { key: 'shops', planKey: 'maxShops', label: msg('Branches'), icon: Store, unlimitedAt: 999 },
  { key: 'salesThisMonth', planKey: 'maxSalesPerMonth', label: msg('Is mahine ke bill'), icon: Receipt, unlimitedAt: 999_999 },
];

/** Whole days until a date; negative once it has passed. */
export const daysUntil = (value: string | null | undefined) =>
  value ? Math.ceil((new Date(value).getTime() - Date.now()) / 86_400_000) : 0;

export const daysText = (days: number) =>
  days > 1 ? t('{{days}} din baqi', { days }) : days === 1 ? t('Kal') : days === 0 ? t('Aaj') : t('{{days}} din pehle', { days: Math.abs(days) });

export const isOpenInvoice = (s: InvoiceStatus) => s === 'PENDING' || s === 'OVERDUE';
