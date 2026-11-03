/** Icons, tones and group labels for notifications (same grouping as the web). */

import {
  AlertCircle, AlertTriangle, ArrowLeftRight, Bell, CalendarCheck, CheckCheck, Crown, DollarSign, Globe, Info, Inbox, Package, Receipt,
  ShoppingCart, UserPlus, Wallet, type LucideIcon,
} from 'lucide-react-native';
import { msg } from '@/core/i18n';
import type { StatusTone } from '@/design';
import type { AppNotification, NotificationGroup, NotificationType } from '../api/notifications';

const TYPE_META: Record<NotificationType, { icon: LucideIcon; tone: StatusTone }> = {
  INFO: { icon: Info, tone: 'info' },
  SUCCESS: { icon: CheckCheck, tone: 'success' },
  WARNING: { icon: AlertTriangle, tone: 'warning' },
  ERROR: { icon: AlertCircle, tone: 'danger' },
  LOW_STOCK: { icon: AlertTriangle, tone: 'warning' },
  OUT_OF_STOCK: { icon: AlertCircle, tone: 'danger' },
  NEW_SALE: { icon: ShoppingCart, tone: 'success' },
  PAYMENT_RECEIVED: { icon: DollarSign, tone: 'success' },
  PAYMENT_APPROVED: { icon: CheckCheck, tone: 'success' },
  PAYMENT_REJECTED: { icon: AlertCircle, tone: 'danger' },
  RETURN_PROCESSED: { icon: Package, tone: 'accent' },
  NEW_CUSTOMER: { icon: UserPlus, tone: 'info' },
  STOCK_TRANSFER: { icon: ArrowLeftRight, tone: 'info' },
  EXPENSE_ADDED: { icon: Receipt, tone: 'warning' },
  INVOICE_DUE: { icon: AlertTriangle, tone: 'warning' },
  SUBSCRIPTION_EXPIRING: { icon: Crown, tone: 'warning' },
  REGISTER_OPENED: { icon: Wallet, tone: 'info' },
  REGISTER_CLOSED: { icon: Wallet, tone: 'neutral' },
  CREDIT_ALERT: { icon: AlertTriangle, tone: 'danger' },
  SYSTEM: { icon: Info, tone: 'neutral' },
};

export const isSummary = (n: AppNotification) => (n.metadata as { kind?: string } | null)?.kind === 'daily-summary';
const isOnline = (n: AppNotification) => (n.metadata as { kind?: string } | null)?.kind === 'ONLINE_ORDER' || !!n.link?.startsWith('/online-orders');

export function metaOf(n: AppNotification): { icon: LucideIcon; tone: StatusTone } {
  if (isSummary(n)) return { icon: CalendarCheck, tone: 'info' };
  if (isOnline(n)) return { icon: Globe, tone: 'accent' };
  if (n.link?.startsWith('/transfers')) return TYPE_META.STOCK_TRANSFER;
  return TYPE_META[n.type] ?? { icon: Bell, tone: 'neutral' };
}

/** WhatsApp click-to-send link stored by the daily summary, if it is a real wa.me link. */
export function waUrlOf(n: AppNotification): string | null {
  const url = (n.metadata as { whatsappUrl?: unknown } | null)?.whatsappUrl;
  return typeof url === 'string' && url.startsWith('https://wa.me/') ? url : null;
}

export const GROUPS: Array<{ id: 'all' | NotificationGroup; label: string; icon: LucideIcon }> = [
  { id: 'all', label: msg('Sab'), icon: Inbox },
  { id: 'summary', label: msg('Din ka hisaab'), icon: CalendarCheck },
  { id: 'sales', label: msg('Sale'), icon: ShoppingCart },
  { id: 'online', label: msg('Online'), icon: Globe },
  { id: 'stock', label: msg('Stock'), icon: Package },
  { id: 'alerts', label: msg('Alerts'), icon: AlertTriangle },
];
