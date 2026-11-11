/**
 * One badge style per status word used across the admin panel, so "ACTIVE",
 * "PENDING", "FAILED"… look the same on every page. Unknown values fall back
 * to a neutral badge with the value in sentence case.
 */

import { Badge, type BadgeVariant } from '@/design-system/components';

const TONE: Record<string, BadgeVariant> = {
  ACTIVE: 'success', APPROVED: 'success', PAID: 'success', COMPLETED: 'success', DELIVERED: 'success', SENT: 'success', SUCCESS: 'success', LIVE: 'success', PUBLISHED: 'success', CONNECTED: 'success', HEALTHY: 'success', OK: 'success', RESOLVED: 'success', CONVERTED: 'success', ENABLED: 'success',
  TRIAL: 'info', TRIALING: 'info', SCHEDULED: 'info', PROCESSING: 'info', RUNNING: 'info', QUEUED: 'info', NEW: 'info', DRAFT: 'default', OPEN: 'info',
  PENDING: 'warning', PENDING_PAYMENT: 'warning', PAST_DUE: 'warning', DUE: 'warning', WARNING: 'warning', PAUSED: 'warning', RETRYING: 'warning', PARTIAL: 'warning', DEGRADED: 'warning',
  SUSPENDED: 'danger', REJECTED: 'danger', FAILED: 'danger', ERROR: 'danger', CANCELLED: 'danger', EXPIRED: 'danger', BOUNCED: 'danger', OVERDUE: 'danger', DOWN: 'danger', DISCONNECTED: 'danger', BLOCKED: 'danger', DELETED: 'danger', DISABLED: 'default',
  ARCHIVED: 'default', INACTIVE: 'default', CLOSED: 'default', SKIPPED: 'default',
};

export const statusLabel = (value: string) => value.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

export function StatusBadge({ value, label, variant }: { value: string | null | undefined; label?: string; variant?: BadgeVariant }) {
  if (!value) return <span className="text-slate-400">—</span>;
  return <Badge variant={variant ?? TONE[value.toUpperCase()] ?? 'default'}>{label ?? statusLabel(value)}</Badge>;
}
