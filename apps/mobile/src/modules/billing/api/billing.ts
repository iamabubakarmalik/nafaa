/**
 * Billing API (same endpoints and shapes as the web): subscription, plans,
 * usage, Nafaa invoices and payments, card checkout and referrals.
 * Everything here needs the server.
 */

import { apiClient } from '@/core/api/client';

export type PaymentProvider = 'MANUAL_BANK' | 'JAZZCASH' | 'EASYPAISA' | 'NAYAPAY' | 'STRIPE' | 'CASH';
export type PaymentStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'REFUNDED';
export type InvoiceStatus = 'DRAFT' | 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'REFUNDED';
export type BillingInterval = 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
export type SubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'EXPIRED' | 'PENDING_PAYMENT';

export interface BankInfo {
  holderName: string;
  bank: { name: string; accountTitle: string; accountNumber: string; iban: string };
  jazzcash: { number: string; title: string };
  easypaisa: { number: string; title: string };
  nayapay: { number: string; handle: string; title: string };
}

export interface UploadFile { id: string; url: string; filename: string; originalName: string; mimeType: string }

export interface Payment {
  id: string; amount: number; provider: PaymentProvider; status: PaymentStatus;
  bankName?: string | null; transactionId?: string | null; payerName?: string | null; notes?: string | null;
  rejectionReason?: string | null; createdAt: string; approvedAt?: string | null;
  upload?: UploadFile | null; invoice?: { invoiceNumber: string } | null;
}

export interface Invoice {
  id: string; invoiceNumber: string; status: InvoiceStatus;
  subtotal: number; tax?: number; total: number; amountPaid: number; amountDue: number;
  description?: string | null; dueDate: string; paidAt?: string | null; periodStart?: string | null; periodEnd?: string | null; createdAt: string;
  subscription?: { interval?: BillingInterval; plan: { name: string; slug: string } } | null;
  payments?: Payment[];
}

export interface SubmitPaymentPayload {
  invoiceId: string; amount: number; provider: PaymentProvider;
  bankName?: string; accountNumber?: string; transactionId?: string; payerName?: string; payerPhone?: string;
  uploadId?: string; notes?: string;
}

export interface Plan {
  id: string; name: string; slug: string; description?: string | null;
  priceMonthly: number; priceQuarterly: number; priceYearly: number; trialDays: number;
  maxProducts: number; maxUsers: number; maxShops: number; maxSalesPerMonth: number;
  featurePos: boolean; featureBarcodeScanner: boolean; featureMultiShop: boolean; featureReports: boolean;
  featureProfitReport: boolean; featureLoyalty: boolean; featureDiscounts: boolean; featureKhata: boolean;
  featureExports: boolean; featureBackup: boolean; featureNotifications: boolean; featureCashRegister: boolean;
  featureStockTransfer: boolean; featureReturns: boolean; featureSupport24x7: boolean; featureWhatsappReceipt: boolean;
  featureCustomBranding: boolean;
}

export interface Subscription {
  id: string; status: SubscriptionStatus; interval: BillingInterval; amount: number; currency: string;
  trialEndsAt?: string | null; currentPeriodStart: string; currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean; autoRenew: boolean; plan: Plan;
}

export interface StartSubscriptionResult {
  subscription: Subscription;
  invoice: { id: string; invoiceNumber: string; total: number; amountDue: number; status: string };
  reused: boolean; repriced: boolean; locked: boolean; cancelledCount: number;
}

export interface PendingUpgrade {
  subscription: { id: string; plan: Plan; interval: BillingInterval; amount: number; createdAt: string };
  invoice: { id: string; invoiceNumber: string; status: string; total: number; amountDue: number; dueDate: string };
}

export interface PlanUsage {
  plan: { id: string; name: string; slug: string };
  usage: Record<'products' | 'users' | 'shops' | 'salesThisMonth', { current: number; limit: number }>;
  features: Record<string, boolean>;
}

export type ReferralStatus = 'PENDING' | 'CONVERTED' | 'PAID' | 'EXPIRED';
export type CreditType = 'REFERRAL_BONUS' | 'PROMOTIONAL' | 'REFUND' | 'ADJUSTMENT';

export interface ReferralDashboard {
  tenant: { id: string; name: string; referralCode: string; accountCredit: number };
  stats: {
    totalReferrals: number; pendingCount: number; convertedCount: number; totalEarned: number;
    currentCredit: number; rewardAmount: number; rewardPercentage: number;
  };
  referrals: Array<{
    id: string; status: ReferralStatus; rewardAmount: number; rewardPaid: boolean; convertedAt?: string | null; createdAt: string;
    referee: { id: string; name: string; createdAt: string; status: string };
  }>;
  credits: Array<{ id: string; type: CreditType; amount: number; balanceAfter: number; reference?: string | null; note?: string | null; createdAt: string }>;
}

const data = <T,>(r: { data: T }) => r.data;

export const billingApi = {
  bankInfo: () => apiClient.get<BankInfo>('/billing/bank-info').then(data),
  invoices: () => apiClient.get<Invoice[]>('/billing/invoices').then(data),
  invoice: (id: string) => apiClient.get<Invoice>(`/billing/invoices/${id}`).then(data),
  payments: () => apiClient.get<Payment[]>('/billing/payments').then(data),
  submitPayment: (payload: SubmitPaymentPayload) => apiClient.post<Payment>('/billing/payments', payload).then(data),
};

export const plansApi = { list: () => apiClient.get<Plan[]>('/plans').then(data) };
export const planUsageApi = { me: () => apiClient.get<PlanUsage>('/plan-usage').then(data) };

export const subscriptionsApi = {
  current: () => apiClient.get<Subscription | null>('/subscriptions/current').then(data),
  pendingUpgrade: async (): Promise<PendingUpgrade | null> => {
    try { return (await apiClient.get<PendingUpgrade | null>('/subscriptions/pending-upgrade')).data ?? null; } catch { return null; }
  },
  start: (planId: string, interval: BillingInterval) => apiClient.post<StartSubscriptionResult>('/subscriptions/start', { planId, interval }).then(data),
  cancel: () => apiClient.post<Subscription>('/subscriptions/cancel').then(data),
  reactivate: () => apiClient.post<Subscription>('/subscriptions/reactivate').then(data),
  cleanupPending: () => apiClient.post<{ kept: number; cancelled: number; message: string }>('/subscriptions/cleanup-pending').then(data),
};

export const stripeApi = {
  config: () => apiClient.get<{ publishableKey: string | null; enabled: boolean }>('/stripe/config').then(data),
  checkout: (invoiceId: string) => apiClient.post<{ url: string; sessionId: string }>('/stripe/checkout', { invoiceId }).then(data),
};

export const referralsApi = {
  me: () => apiClient.get<ReferralDashboard>('/referrals/me').then(data),
  leaderboard: () => apiClient.get<Array<{ name: string; successfulReferrals: number }>>('/referrals/leaderboard').then(data),
};

export const SUPPORT = { phone: '0324-1772933', whatsapp: '923241772933', email: 'support@nafaa.pk' };
export const supportWhatsapp = (message: string) => `https://wa.me/${SUPPORT.whatsapp}?text=${encodeURIComponent(message)}`;
