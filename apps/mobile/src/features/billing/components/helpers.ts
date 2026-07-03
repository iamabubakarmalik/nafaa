import type { InvoiceStatus, PaymentStatus, PaymentProvider } from '@/api/billing.api';
import {
  CheckCircle2, Clock, XCircle, AlertCircle, Sparkles,
  Banknote, CreditCard, Smartphone, Zap, Building2, Wallet,
} from 'lucide-react-native';

export const invoiceStatusConfig: Record<InvoiceStatus, {
  color: string; bg: string; label: string; icon: any;
}> = {
  DRAFT:     { color: '#64748b', bg: '#f1f5f9', label: 'Draft',     icon: Clock },
  PENDING:   { color: '#d97706', bg: '#fef3c7', label: 'Pending',   icon: Clock },
  PAID:      { color: '#15803d', bg: '#dcfce7', label: 'Paid',      icon: CheckCircle2 },
  OVERDUE:   { color: '#b91c1c', bg: '#fee2e2', label: 'Overdue',   icon: AlertCircle },
  CANCELLED: { color: '#94a3b8', bg: '#f1f5f9', label: 'Cancelled', icon: XCircle },
  REFUNDED:  { color: '#1d4ed8', bg: '#dbeafe', label: 'Refunded',  icon: AlertCircle },
};

export const paymentStatusConfig: Record<PaymentStatus, {
  color: string; bg: string; label: string; icon: any;
}> = {
  PENDING:  { color: '#d97706', bg: '#fef3c7', label: 'Pending Approval', icon: Clock },
  APPROVED: { color: '#15803d', bg: '#dcfce7', label: 'Approved',         icon: CheckCircle2 },
  REJECTED: { color: '#b91c1c', bg: '#fee2e2', label: 'Rejected',         icon: XCircle },
  REFUNDED: { color: '#1d4ed8', bg: '#dbeafe', label: 'Refunded',         icon: AlertCircle },
};

export const subscriptionStatusConfig: Record<string, {
  color: string; bg: string; label: string; icon: any; description: string;
}> = {
  ACTIVE:          { color: '#15803d', bg: '#dcfce7', label: 'Active',          icon: CheckCircle2, description: 'Full access' },
  TRIAL:           { color: '#1d4ed8', bg: '#dbeafe', label: 'Free Trial',      icon: Sparkles,      description: 'Trial mein hain' },
  PAST_DUE:        { color: '#d97706', bg: '#fef3c7', label: 'Past Due',        icon: Clock,         description: '3 days grace period' },
  EXPIRED:         { color: '#b91c1c', bg: '#fee2e2', label: 'Expired',         icon: XCircle,       description: 'Renew karein' },
  PENDING_PAYMENT: { color: '#d97706', bg: '#fef3c7', label: 'Pending Payment', icon: Clock,         description: 'Verify ho rahi' },
  CANCELLED:       { color: '#64748b', bg: '#f1f5f9', label: 'Cancelled',       icon: XCircle,       description: 'Cancel ki gayi' },
};

export const paymentProviderConfig: Record<PaymentProvider, {
  label: string; icon: any; color: string; description: string;
}> = {
  MANUAL_BANK: { label: 'Bank Transfer', icon: Building2,  color: '#16a34a', description: 'Bank account / IBAN' },
  JAZZCASH:    { label: 'JazzCash',      icon: Smartphone, color: '#f97316', description: 'Mobile wallet (Jazz)' },
  EASYPAISA:   { label: 'EasyPaisa',     icon: Zap,        color: '#22c55e', description: 'Mobile wallet (Telenor)' },
  NAYAPAY:     { label: 'NayaPay',       icon: Wallet,     color: '#8b5cf6', description: 'NayaPay handle' },
  STRIPE:      { label: 'Card (Stripe)', icon: CreditCard, color: '#2563eb', description: 'International cards' },
  CASH:        { label: 'Cash',          icon: Banknote,   color: '#16a34a', description: 'Cash payment' },
};

export const formatDate = (v?: string | null) =>
  v ? new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium' }).format(new Date(v)) : '—';

export const formatDateTime = (v?: string | null) =>
  v ? new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v)) : '—';

export const getDaysUntilDue = (dueDate?: string | null) => {
  if (!dueDate) return 0;
  const diff = new Date(dueDate).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};
