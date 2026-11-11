/** Building blocks shared by the Online store pages. */

import type { ReactNode } from 'react';
import { Badge, Drawer as DsDrawer, type BadgeVariant } from '@/design-system/components';
import { cn } from '@/lib/cn';
import { formatRelative } from '@/lib/format';
import { statusLabel } from '@/ui';

export { Panel as Card, Pill, Toggle, Empty, inputCls, labelCls, SERIES } from '@/features/shared/kit';

export const KIND_LABEL: Record<string, string> = {
  SHOPIFY: 'Shopify', DARAZ: 'Daraz', WOOCOMMERCE: 'WooCommerce', CUSTOM_WEBSITE: 'Custom website', FOODPANDA: 'Foodpanda',
  INDOLJ: 'Indolj', MANUAL: 'Manual orders', META_CAPI: 'Meta Conversions API', META: 'Meta (Facebook & Instagram)',
};
export const KINDS = ['SHOPIFY', 'DARAZ', 'WOOCOMMERCE', 'CUSTOM_WEBSITE', 'INDOLJ', 'FOODPANDA', 'MANUAL'];
export const kindLabel = (k: string | null | undefined) => (k ? KIND_LABEL[k] ?? k : '—');

/** PENDING → Pending, OUT_FOR_DELIVERY → Out for delivery. */
export const enumLabel = (s: string | null | undefined) => (!s ? '—' : statusLabel(s));

export const when = (d: string | null | undefined) => (d ? formatRelative(d) : '—');
export const dateTime = (d: string | null | undefined) =>
  d ? new Intl.DateTimeFormat('en-PK', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(d)) : '—';

/** Channel health in one badge: paused, connected, error … */
export function ChannelStatus({ status, isActive }: { status: string; isActive: boolean }) {
  const [label, variant]: [string, BadgeVariant] = !isActive ? ['Paused', 'default']
    : status === 'CONNECTED' ? ['Connected', 'success']
      : status === 'ERROR' || status === 'SUSPENDED' ? [enumLabel(status), 'danger']
        : [enumLabel(status), 'warning'];
  return <Badge variant={variant}>{label}</Badge>;
}

export function OrderStatus({ status }: { status: string }) {
  const variant: BadgeVariant = status === 'DELIVERED' ? 'success'
    : ['CANCELLED', 'REJECTED', 'RETURNED'].includes(status) ? 'danger'
      : ['PENDING', 'ACCEPTING'].includes(status) ? 'warning' : 'info';
  return <Badge variant={variant}>{enumLabel(status)}</Badge>;
}

export function JobStatus({ status, stalled }: { status: string; stalled?: boolean }) {
  const variant: BadgeVariant = stalled ? 'danger'
    : status === 'RUNNING' || status === 'QUEUED' ? 'info'
      : status === 'DONE' ? 'success' : status === 'FAILED' ? 'danger' : 'default';
  return <Badge variant={variant}>{stalled ? 'Stalled' : enumLabel(status)}</Badge>;
}

export function Progress({ percent, failed }: { percent: number; failed?: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
      <div className={cn('h-full rounded-full', failed ? 'bg-amber-500' : 'bg-brand-600')} style={{ width: `${Math.max(2, Math.min(100, percent))}%` }} />
    </div>
  );
}

/** Right-side panel for drill-downs. */
export function Drawer({ open, onClose, title, subtitle, children }: { open: boolean; onClose: () => void; title: string; subtitle?: string; children: ReactNode }) {
  return (
    <DsDrawer open={open} onClose={onClose} title={title} description={subtitle} size="xl">
      <div className="space-y-4 bg-slate-50 p-4 sm:p-5">{children}</div>
    </DsDrawer>
  );
}

/** Label / value pair used in detail grids. */
export function Info({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[0.75rem] font-medium text-slate-500">{label}</dt>
      <dd className="mt-0.5 truncate text-[0.875rem] font-medium text-slate-900">{value}</dd>
    </div>
  );
}
