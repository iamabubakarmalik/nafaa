/** Labels, badges and small pieces shared by the Nafaa Market admin pages. */

import type { ComponentProps, ReactNode } from 'react';
import { Lightbulb } from 'lucide-react';
import { Badge, heroButton, type BadgeVariant } from '@/design-system/components';
import { PageGuide } from '@core/components/PageGuide';
import { StatusBadge } from '@/ui';
import type { ApprovalState, MarketGate, MarketOrderStatus, TicketStatus, VerificationLevel } from '@/api/admin-market.api';

export const GATE_LABEL: Record<MarketGate, string> = {
  FOOD: 'Food', GROCERY: 'Grocery', PHARMACY: 'Pharmacy', SHOPPING: 'Shopping', BOOKING: 'Booking', WHOLESALE: 'Wholesale',
};
/** Data colours for the six Market sections (charts and dots). */
export const GATE_COLOR: Record<MarketGate, string> = {
  FOOD: '#ea580c', GROCERY: '#16a34a', PHARMACY: '#0284c7', SHOPPING: '#7c3aed', BOOKING: '#db2777', WHOLESALE: '#475569',
};
export const gateLabel = (g: string | null | undefined) => (g ? GATE_LABEL[g as MarketGate] ?? g : '—');

export function GateTag({ gate }: { gate: MarketGate }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[0.8125rem] text-slate-700">
      <span className="h-2 w-2 rounded-full" style={{ background: GATE_COLOR[gate] }} aria-hidden />
      {GATE_LABEL[gate] ?? gate}
    </span>
  );
}

const ORDER_LABEL: Record<MarketOrderStatus, string> = {
  DRAFT: 'Draft', PENDING: 'Pending', CONFIRMED: 'Confirmed', PREPARING: 'Preparing', READY_FOR_PICKUP: 'Ready',
  OUT_FOR_DELIVERY: 'Out for delivery', DELIVERED: 'Delivered', CANCELLED: 'Cancelled', REFUNDED: 'Refunded', DISPUTED: 'Disputed', RETURNED: 'Returned',
};
const ORDER_TONE: Partial<Record<MarketOrderStatus, BadgeVariant>> = {
  PENDING: 'warning', CONFIRMED: 'info', PREPARING: 'info', READY_FOR_PICKUP: 'info', OUT_FOR_DELIVERY: 'info',
  DELIVERED: 'success', CANCELLED: 'danger', REFUNDED: 'danger', DISPUTED: 'danger', RETURNED: 'default',
};
export const orderStatusLabel = (s: string) => ORDER_LABEL[s as MarketOrderStatus] ?? s;
export const ORDER_STATUS_OPTIONS: Array<[string, string]> = [
  ['ALL', 'Any status'], ['OPEN', 'Open (not finished)'], ['PENDING', 'Pending'], ['CONFIRMED', 'Confirmed'], ['PREPARING', 'Preparing'],
  ['READY_FOR_PICKUP', 'Ready'], ['OUT_FOR_DELIVERY', 'Out for delivery'], ['DELIVERED', 'Delivered'], ['CANCELLED', 'Cancelled'], ['RETURNED', 'Returned'],
];

export function OrderStatusBadge({ status }: { status: MarketOrderStatus }) {
  return <StatusBadge value={status} label={orderStatusLabel(status)} variant={ORDER_TONE[status]} />;
}

const APPROVAL: Record<ApprovalState, [string, BadgeVariant]> = {
  APPROVED: ['Approved', 'success'], PENDING: ['Awaiting approval', 'warning'], REJECTED: ['Rejected', 'danger'], NOT_LISTED: ['Not published', 'default'],
};
export function ApprovalBadge({ state }: { state: ApprovalState }) {
  const [label, variant] = APPROVAL[state] ?? [state, 'default'];
  return <Badge variant={variant}>{label}</Badge>;
}

export const LEVEL_LABEL: Record<VerificationLevel, string> = { UNVERIFIED: 'Unverified', BRONZE: 'Bronze', SILVER: 'Silver', GOLD: 'Gold', PLATINUM: 'Platinum' };

/** Listing state of a shop in one badge: paused wins, then published or not. */
export function ShopStateBadge({ listed, isPaused }: { listed: boolean; isPaused: boolean }) {
  if (isPaused) return <Badge variant="warning">Paused</Badge>;
  return listed ? <Badge variant="success">Live</Badge> : <Badge variant="default">Not published</Badge>;
}

const TICKET_LABEL: Record<TicketStatus, string> = { OPEN: 'Open', IN_PROGRESS: 'In progress', WAITING_CUSTOMER: 'Waiting for customer', RESOLVED: 'Resolved', CLOSED: 'Closed' };
const TICKET_TONE: Record<TicketStatus, BadgeVariant> = { OPEN: 'warning', IN_PROGRESS: 'info', WAITING_CUSTOMER: 'default', RESOLVED: 'success', CLOSED: 'default' };
export const ticketStatusLabel = (s: string) => TICKET_LABEL[s as TicketStatus] ?? s;
export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  return <StatusBadge value={status} label={ticketStatusLabel(status)} variant={TICKET_TONE[status]} />;
}

export const PAYMENT_LABEL: Record<string, string> = {
  COD: 'Cash on delivery', CARD: 'Card', JAZZCASH: 'JazzCash', EASYPAISA: 'Easypaisa', NAYAPAY: 'NayaPay', SADAPAY: 'SadaPay', RAAST: 'Raast', BANK_TRANSFER: 'Bank transfer', WALLET: 'Wallet', SPLIT: 'Split',
};

export const dateTime = (d: string | null | undefined) =>
  d ? new Intl.DateTimeFormat('en-PK', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(d)) : '—';

/** Today's calendar day key in local time (the admin works in Pakistan time). */
export const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

/** Short day label for chart axes: "12 Nov". */
export const shortDay = (d: string) => new Intl.DateTimeFormat('en-PK', { day: 'numeric', month: 'short' }).format(new Date(`${d}T00:00:00`));

/** Short axis label: 1.2Cr, 90L, 30K. */
export const axisValue = (v: number) => (v >= 1e7 ? `${+(v / 1e7).toFixed(1)}Cr` : v >= 1e5 ? `${+(v / 1e5).toFixed(1)}L` : v >= 1e3 ? `${+(v / 1e3).toFixed(1)}K` : String(v));

/** The lightbulb hero button that opens a page guide. */
export function GuideButton({ onClick }: { onClick: () => void }) {
  return <button type="button" className={heroButton} onClick={onClick} aria-label="How this page works (G)"><Lightbulb className="h-4 w-4" /></button>;
}

/** PageGuide with the shortcuts every Market list shares. */
export function MarketGuide(props: Omit<ComponentProps<typeof PageGuide>, 'shortcuts'> & { search?: boolean }) {
  const { search = true, ...rest } = props;
  return <PageGuide {...rest} shortcuts={search ? [['/', 'Search'], ['G', 'This guide']] : [['G', 'This guide']]} />;
}

/** One labelled switch row inside a settings card. */
export function SettingRow({ title, hint, children }: { title: ReactNode; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <div className="text-[0.875rem] font-medium text-slate-900">{title}</div>
        {hint && <div className="mt-0.5 text-[0.75rem] text-slate-500">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
