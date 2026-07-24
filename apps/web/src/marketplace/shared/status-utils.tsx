import {
  Clock, CheckCircle2, ChefHat, Package, Bike, PackageCheck,
  XCircle, RotateCcw, AlertTriangle, ArrowLeftRight,
} from 'lucide-react';
import type { MarketplaceOrderStatus, MarketplacePaymentStatus } from './types';

export interface StatusMeta {
  label: string;
  urduLabel: string;
  color: string;
  bg: string;
  border: string;
  icon: any;
  next?: MarketplaceOrderStatus[];
}

export const ORDER_STATUS_META: Record<MarketplaceOrderStatus, StatusMeta> = {
  DRAFT: {
    label: 'Draft',
    urduLabel: 'Draft',
    color: 'text-slate-700',
    bg: 'bg-slate-100',
    border: 'border-slate-300',
    icon: Clock,
  },
  PENDING: {
    label: 'New — Waiting Confirmation',
    urduLabel: 'Nayi Order — Confirm Karein',
    color: 'text-amber-800',
    bg: 'bg-amber-100',
    border: 'border-amber-400',
    icon: Clock,
    next: ['CONFIRMED', 'CANCELLED'],
  },
  CONFIRMED: {
    label: 'Confirmed',
    urduLabel: 'Confirm Ho Gayi',
    color: 'text-blue-800',
    bg: 'bg-blue-100',
    border: 'border-blue-400',
    icon: CheckCircle2,
    next: ['PREPARING', 'CANCELLED'],
  },
  PREPARING: {
    label: 'Preparing',
    urduLabel: 'Taiyaar Ho Rahi Hai',
    color: 'text-violet-800',
    bg: 'bg-violet-100',
    border: 'border-violet-400',
    icon: ChefHat,
    next: ['READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'CANCELLED'],
  },
  READY_FOR_PICKUP: {
    label: 'Ready for Pickup',
    urduLabel: 'Pickup Ke Liye Tayyar',
    color: 'text-indigo-800',
    bg: 'bg-indigo-100',
    border: 'border-indigo-400',
    icon: Package,
    next: ['DELIVERED', 'CANCELLED'],
  },
  OUT_FOR_DELIVERY: {
    label: 'Out for Delivery',
    urduLabel: 'Delivery Ke Liye Nikli',
    color: 'text-orange-800',
    bg: 'bg-orange-100',
    border: 'border-orange-400',
    icon: Bike,
    next: ['DELIVERED', 'CANCELLED'],
  },
  DELIVERED: {
    label: 'Delivered',
    urduLabel: 'Deliver Ho Gayi',
    color: 'text-emerald-800',
    bg: 'bg-emerald-100',
    border: 'border-emerald-400',
    icon: PackageCheck,
    next: ['RETURNED'],
  },
  CANCELLED: {
    label: 'Cancelled',
    urduLabel: 'Cancel Ho Gayi',
    color: 'text-rose-800',
    bg: 'bg-rose-100',
    border: 'border-rose-400',
    icon: XCircle,
  },
  REFUNDED: {
    label: 'Refunded',
    urduLabel: 'Wapas Ho Gayi',
    color: 'text-fuchsia-800',
    bg: 'bg-fuchsia-100',
    border: 'border-fuchsia-400',
    icon: RotateCcw,
  },
  DISPUTED: {
    label: 'Disputed',
    urduLabel: 'Dispute',
    color: 'text-yellow-800',
    bg: 'bg-yellow-100',
    border: 'border-yellow-400',
    icon: AlertTriangle,
  },
  RETURNED: {
    label: 'Returned',
    urduLabel: 'Return',
    color: 'text-orange-800',
    bg: 'bg-orange-100',
    border: 'border-orange-400',
    icon: ArrowLeftRight,
  },
};

export const PAYMENT_STATUS_META: Record<MarketplacePaymentStatus, { label: string; color: string; bg: string }> = {
  PENDING:  { label: 'Payment Pending', color: 'text-amber-700',   bg: 'bg-amber-100' },
  PAID:     { label: 'Paid',            color: 'text-emerald-700', bg: 'bg-emerald-100' },
  PARTIAL:  { label: 'Partial Paid',    color: 'text-blue-700',    bg: 'bg-blue-100' },
  FAILED:   { label: 'Failed',          color: 'text-rose-700',    bg: 'bg-rose-100' },
  REFUNDED: {  label: 'Refunded',        color: 'text-fuchsia-700', bg: 'bg-fuchsia-100' },
};

export const VERIFICATION_META = {
  UNVERIFIED: { emoji: '⚪', label: 'Unverified', color: 'text-slate-700',  bg: 'bg-slate-100',  border: 'border-slate-300'  },
  BRONZE:     { emoji: '🥉', label: 'Bronze',     color: 'text-amber-800',  bg: 'bg-amber-100',  border: 'border-amber-400'  },
  SILVER:     { emoji: '🥈', label: 'Silver',     color: 'text-slate-800',  bg: 'bg-slate-200',  border: 'border-slate-400'  },
  GOLD:       { emoji: '🥇', label: 'Gold',       color: 'text-yellow-800', bg: 'bg-yellow-100', border: 'border-yellow-400' },
  PLATINUM:   { emoji: '💎', label: 'Platinum',   color: 'text-cyan-800',   bg: 'bg-cyan-100',   border: 'border-cyan-400'   },
};

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'abhi';
  if (mins < 60) return `${mins} min pehle`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ghante pehle`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} din pehle`;
  return new Date(iso).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });
}
