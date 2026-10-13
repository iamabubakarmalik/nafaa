/** Icons, colours and group labels for notifications on the Notifications page. */

import {
  AlertCircle, AlertTriangle, ArrowLeftRight, Bell, CalendarCheck, CheckCheck, Crown, DollarSign, Globe, Info, Package, Receipt,
  ShoppingCart, UserPlus, Wallet, type LucideIcon,
} from 'lucide-react';
import type { Notification, NotificationGroup, NotificationType } from './api/notifications.api';

const TYPE_META: Record<NotificationType, { icon: LucideIcon; color: string }> = {
  INFO: { icon: Info, color: '#2563eb' },
  SUCCESS: { icon: CheckCheck, color: '#16a34a' },
  WARNING: { icon: AlertTriangle, color: '#d97706' },
  ERROR: { icon: AlertCircle, color: '#e11d48' },
  LOW_STOCK: { icon: AlertTriangle, color: '#d97706' },
  OUT_OF_STOCK: { icon: AlertCircle, color: '#e11d48' },
  NEW_SALE: { icon: ShoppingCart, color: '#16a34a' },
  PAYMENT_RECEIVED: { icon: DollarSign, color: '#16a34a' },
  PAYMENT_APPROVED: { icon: CheckCheck, color: '#16a34a' },
  PAYMENT_REJECTED: { icon: AlertCircle, color: '#e11d48' },
  RETURN_PROCESSED: { icon: Package, color: '#7c3aed' },
  NEW_CUSTOMER: { icon: UserPlus, color: '#2563eb' },
  STOCK_TRANSFER: { icon: ArrowLeftRight, color: '#0891b2' },
  EXPENSE_ADDED: { icon: Receipt, color: '#ea580c' },
  INVOICE_DUE: { icon: AlertTriangle, color: '#d97706' },
  SUBSCRIPTION_EXPIRING: { icon: Crown, color: '#d97706' },
  REGISTER_OPENED: { icon: Wallet, color: '#2563eb' },
  REGISTER_CLOSED: { icon: Wallet, color: '#64748b' },
  CREDIT_ALERT: { icon: AlertTriangle, color: '#e11d48' },
  SYSTEM: { icon: Info, color: '#64748b' },
};

export const isSummary = (n: Notification) => (n.metadata as { kind?: string } | null)?.kind === 'daily-summary';
const isOnline = (n: Notification) => (n.metadata as { kind?: string } | null)?.kind === 'ONLINE_ORDER' || !!n.link?.startsWith('/online-orders');

export function metaOf(n: Notification): { icon: LucideIcon; color: string } {
  if (isSummary(n)) return { icon: CalendarCheck, color: '#0891b2' };
  if (isOnline(n)) return { icon: Globe, color: '#7c3aed' };
  if (n.link?.startsWith('/transfers')) return TYPE_META.STOCK_TRANSFER;
  return TYPE_META[n.type] ?? { icon: Bell, color: '#64748b' };
}

/** WhatsApp click-to-send link stored by the daily summary, if it is a real wa.me link. */
export function waUrlOf(n: Notification): string | null {
  const url = (n.metadata as { whatsappUrl?: unknown } | null)?.whatsappUrl;
  return typeof url === 'string' && url.startsWith('https://wa.me/') ? url : null;
}

export const GROUPS: Array<{ id: 'all' | NotificationGroup; label: string; hint: string }> = [
  { id: 'all', label: 'Sab', hint: 'Har notification' },
  { id: 'summary', label: 'Din ka hisaab', hint: 'Roz ki summary — WhatsApp par bhi bhej sakte hain' },
  { id: 'sales', label: 'Bikri', hint: 'Bill, payment, wapsi, drawer' },
  { id: 'online', label: 'Online', hint: 'Online store ke orders' },
  { id: 'stock', label: 'Stock', hint: 'Kam stock aur transfers' },
  { id: 'alerts', label: 'Alerts', hint: 'Warning, udhaar, plan aur ghalti' },
];
