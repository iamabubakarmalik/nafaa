import {
  CheckCircle2, Clock, XCircle, AlertCircle, Sparkles,
  Banknote, CreditCard, Smartphone, Zap, Building, Wallet,
} from 'lucide-react';
import type { InvoiceStatus, PaymentStatus, PaymentProvider } from '@/api/billing.api';

export const invoiceStatusConfig: Record<InvoiceStatus, {
  tone: string;
  borderTone: string;
  label: string;
  icon: any;
  hex: string;
}> = {
  DRAFT: { tone: 'bg-slate-100 text-slate-700', borderTone: 'border-slate-300', label: 'Draft', icon: Clock, hex: '#64748b' },
  PENDING: { tone: 'bg-amber-100 text-amber-700', borderTone: 'border-amber-300', label: 'Pending', icon: Clock, hex: '#f59e0b' },
  PAID: { tone: 'bg-emerald-100 text-emerald-700', borderTone: 'border-emerald-300', label: 'Paid', icon: CheckCircle2, hex: '#10b981' },
  OVERDUE: { tone: 'bg-rose-100 text-rose-700', borderTone: 'border-rose-300', label: 'Overdue', icon: AlertCircle, hex: '#ef4444' },
  CANCELLED: { tone: 'bg-slate-100 text-slate-500', borderTone: 'border-slate-200', label: 'Cancelled', icon: XCircle, hex: '#94a3b8' },
  REFUNDED: { tone: 'bg-blue-100 text-blue-700', borderTone: 'border-blue-300', label: 'Refunded', icon: AlertCircle, hex: '#3b82f6' },
};

export const paymentStatusConfig: Record<PaymentStatus, {
  tone: string;
  icon: any;
  label: string;
  hex: string;
}> = {
  PENDING: { tone: 'bg-amber-100 text-amber-700 border-amber-300', icon: Clock, label: 'Pending Approval', hex: '#f59e0b' },
  APPROVED: { tone: 'bg-emerald-100 text-emerald-700 border-emerald-300', icon: CheckCircle2, label: 'Approved', hex: '#10b981' },
  REJECTED: { tone: 'bg-rose-100 text-rose-700 border-rose-300', icon: XCircle, label: 'Rejected', hex: '#ef4444' },
  REFUNDED: { tone: 'bg-blue-100 text-blue-700 border-blue-300', icon: AlertCircle, label: 'Refunded', hex: '#3b82f6' },
};

export const subscriptionStatusConfig: Record<string, {
  tone: string;
  borderTone: string;
  label: string;
  icon: any;
  hex: string;
  description: string;
}> = {
  ACTIVE: {
    tone: 'bg-emerald-100 text-emerald-700',
    borderTone: 'border-emerald-300',
    label: 'Active',
    icon: CheckCircle2,
    hex: '#10b981',
    description: 'Aap ka plan active hai — full access',
  },
  TRIAL: {
    tone: 'bg-blue-100 text-blue-700',
    borderTone: 'border-blue-300',
    label: 'Free Trial',
    icon: Sparkles,
    hex: '#3b82f6',
    description: 'Trial mein hain — koi payment nahi chahiye',
  },
  PAST_DUE: {
    tone: 'bg-amber-100 text-amber-700',
    borderTone: 'border-amber-300',
    label: 'Past Due',
    icon: Clock,
    hex: '#f59e0b',
    description: 'Payment due — 3 days grace period',
  },
  EXPIRED: {
    tone: 'bg-rose-100 text-rose-700',
    borderTone: 'border-rose-300',
    label: 'Expired',
    icon: XCircle,
    hex: '#ef4444',
    description: 'Subscription expire ho gayi — renew karein',
  },
  PENDING_PAYMENT: {
    tone: 'bg-amber-100 text-amber-700',
    borderTone: 'border-amber-300',
    label: 'Pending Payment',
    icon: Clock,
    hex: '#f59e0b',
    description: 'Payment verify ho rahi hai',
  },
  CANCELLED: {
    tone: 'bg-slate-100 text-slate-700',
    borderTone: 'border-slate-300',
    label: 'Cancelled',
    icon: XCircle,
    hex: '#64748b',
    description: 'Subscription cancel ki gayi hai',
  },
};

export const paymentProviderConfig: Record<PaymentProvider, {
  label: string;
  icon: any;
  color: string;
  hex: string;
  bgClass: string;
  description: string;
}> = {
  MANUAL_BANK: {
    label: 'Bank Transfer',
    icon: Building,
    color: 'emerald',
    hex: '#10b981',
    bgClass: 'bg-gradient-to-br from-emerald-500 to-green-600',
    description: 'Meezan Bank account / IBAN',
  },
  JAZZCASH: {
    label: 'JazzCash',
    icon: Smartphone,
    color: 'orange',
    hex: '#f97316',
    bgClass: 'bg-gradient-to-br from-orange-500 to-red-500',
    description: 'Mobile wallet (Jazz)',
  },
  EASYPAISA: {
    label: 'EasyPaisa',
    icon: Zap,
    color: 'green',
    hex: '#22c55e',
    bgClass: 'bg-gradient-to-br from-green-500 to-emerald-600',
    description: 'Mobile wallet (Telenor)',
  },
  NAYAPAY: {
    label: 'NayaPay',
    icon: Wallet,
    color: 'violet',
    hex: '#8b5cf6',
    bgClass: 'bg-gradient-to-br from-violet-500 to-purple-600',
    description: 'NayaPay handle',
  },
  STRIPE: {
    label: 'Card (Stripe)',
    icon: CreditCard,
    color: 'blue',
    hex: '#3b82f6',
    bgClass: 'bg-gradient-to-br from-blue-500 to-indigo-600',
    description: 'International cards',
  },
  CASH: {
    label: 'Cash',
    icon: Banknote,
    color: 'emerald',
    hex: '#16a34a',
    bgClass: 'bg-gradient-to-br from-emerald-600 to-green-700',
    description: 'Cash payment',
  },
};

export const formatDate = (value: string | null | undefined) => {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-PK', {
    dateStyle: 'medium',
  }).format(new Date(value));
};

export const formatDateTime = (value: string | null | undefined) => {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-PK', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
};

export const formatRelative = (value: string | null | undefined) => {
  if (!value) return '—';
  const d = new Date(value);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return 'Abhi';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString('en-PK');
};

export const getDaysUntilDue = (dueDate: string | null | undefined): number => {
  if (!dueDate) return 0;
  const diff = new Date(dueDate).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};
