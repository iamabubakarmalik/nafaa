/**
 * Labels, icons and colors for notification categories and severities,
 * shared by the bell, the toasts and the notification center.
 */

import { AlertOctagon, AlertTriangle, Bell, Building2, CreditCard, Headphones, Info, Megaphone, Server, Share2, ShoppingBag, type LucideIcon } from 'lucide-react';
import type { NotifyCategory, NotifySeverity } from '@/api/admin-notifications.api';

export const CATEGORY_META: Record<NotifyCategory, { label: string; hint: string; icon: LucideIcon; tone: string }> = {
  shops: { label: 'Shops', hint: 'New sign-ups, finished setup, deletion requests', icon: Building2, tone: 'bg-emerald-100 text-emerald-700' },
  billing: { label: 'Billing', hint: 'Payments, subscriptions, overdue invoices, trials ending', icon: CreditCard, tone: 'bg-sky-100 text-sky-700' },
  commerce: { label: 'Online store', hint: 'Stores going live, domains, disconnected channels', icon: ShoppingBag, tone: 'bg-violet-100 text-violet-700' },
  social: { label: 'Nafaa Social', hint: 'Failed posts, posts to do by hand, logins, day summary', icon: Share2, tone: 'bg-pink-100 text-pink-700' },
  system: { label: 'System', hint: 'Failed background jobs and new server errors', icon: Server, tone: 'bg-slate-200 text-slate-700' },
  marketing: { label: 'Marketing', hint: 'Contact messages, demo bookings, new leads', icon: Megaphone, tone: 'bg-amber-100 text-amber-700' },
  support: { label: 'Live support', hint: 'Shops asking for the team, new chat messages, low ratings', icon: Headphones, tone: 'bg-teal-100 text-teal-700' },
  general: { label: 'General', hint: 'Anything else for the team', icon: Bell, tone: 'bg-slate-100 text-slate-600' },
};

export const SEVERITY_META: Record<NotifySeverity, { label: string; icon: LucideIcon; badge: 'default' | 'warning' | 'danger'; edge: string; iconTone: string }> = {
  info: { label: 'Info', icon: Info, badge: 'default', edge: '', iconTone: '' },
  warning: { label: 'Warning', icon: AlertTriangle, badge: 'warning', edge: 'border-s-4 border-amber-500', iconTone: 'bg-amber-100 text-amber-700' },
  critical: { label: 'Critical', icon: AlertOctagon, badge: 'danger', edge: 'border-s-4 border-rose-500', iconTone: 'bg-rose-100 text-rose-700' },
};

export const categoryMeta = (c: string | null | undefined) => CATEGORY_META[(c as NotifyCategory) in CATEGORY_META ? (c as NotifyCategory) : 'general'];
