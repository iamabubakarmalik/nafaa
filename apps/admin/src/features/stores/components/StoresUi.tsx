/** Labels, badges and the impersonation helper shared by the Nafaa Stores admin pages. */

import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Badge, confirmDialog, type BadgeVariant } from '@/design-system/components';
import { adminImpersonateApi } from '@/api/admin-impersonate.api';
import type { DomainStatus, ReportReason, ReportStatus, StoreStatus, ThemeId } from '@/api/admin-stores.api';
import { apiError } from '@/lib/errors';

export const THEME_LABEL: Record<ThemeId, string> = { fashion: 'Fashion', electronics: 'Electronics', grocery: 'Grocery', beauty: 'Beauty' };
export const themeLabel = (id: string | null | undefined) => (id ? THEME_LABEL[id as ThemeId] ?? id : '—');

export const STATUS_LABEL: Record<StoreStatus | 'SUSPENDED', string> = {
  LIVE: 'Live', PASSWORD: 'Password', DRAFT: 'Draft', CLOSED: 'Closed', SUSPENDED: 'Suspended',
};

export const REASON_LABEL: Record<ReportReason, string> = {
  SCAM: 'Scam', FAKE_PRODUCTS: 'Fake products', NOT_DELIVERED: 'Not delivered', OFFENSIVE: 'Offensive', COPYRIGHT: 'Copyright', OTHER: 'Other',
};
export const reasonLabel = (r: string) => REASON_LABEL[r as ReportReason] ?? r;

export const REPORT_STATUS_LABEL: Record<ReportStatus, string> = { OPEN: 'Open', REVIEWING: 'Reviewing', ACTIONED: 'Actioned', DISMISSED: 'Dismissed' };

/** Store state in one badge; suspension wins over the merchant's own status. */
export function StoreStatusBadge({ status, suspended, forcedPassword }: { status: StoreStatus; suspended?: boolean; forcedPassword?: boolean }) {
  if (suspended) return <Badge variant="danger">Suspended</Badge>;
  const variant: BadgeVariant = status === 'LIVE' ? 'success' : status === 'PASSWORD' ? 'warning' : 'default';
  return (
    <span className="inline-flex flex-wrap gap-1">
      <Badge variant={variant}>{STATUS_LABEL[status] ?? status}</Badge>
      {forcedPassword && <Badge variant="danger">Locked by Nafaa</Badge>}
    </span>
  );
}

export function DomainStatusBadge({ status }: { status: DomainStatus }) {
  const variant: BadgeVariant = status === 'ACTIVE' ? 'success' : status === 'ERROR' ? 'danger' : status === 'VERIFYING' ? 'info' : 'warning';
  const label = status === 'ACTIVE' ? 'Active' : status === 'ERROR' ? 'Error' : status === 'VERIFYING' ? 'Verifying' : 'Pending';
  return <Badge variant={variant}>{label}</Badge>;
}

export function ReportStatusBadge({ status }: { status: ReportStatus }) {
  const variant: BadgeVariant = status === 'OPEN' ? 'warning' : status === 'REVIEWING' ? 'info' : status === 'ACTIONED' ? 'success' : 'default';
  return <Badge variant={variant}>{REPORT_STATUS_LABEL[status] ?? status}</Badge>;
}

export const dateTime = (d: string | null | undefined) =>
  d ? new Intl.DateTimeFormat('en-PK', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(d)) : '—';

/** Short day label for chart axes: "12 Nov". */
export const shortDay = (d: string) => new Intl.DateTimeFormat('en-PK', { day: 'numeric', month: 'short' }).format(new Date(`${d}T00:00:00`));

/**
 * Sign in as the shop that owns a store (tenants.impersonate). Opens the
 * merchant app in a new tab; `next` is the website screen of that store.
 */
export function useImpersonateStore() {
  return useMutation({
    mutationFn: async (v: { tenantId: string; shopName: string; path?: string }) => {
      const ok = await confirmDialog({
        title: `Sign in as ${v.shopName}?`,
        text: 'Opens their merchant app in a new tab with owner access. Anything you do there is real and is logged under your name.',
        yes: 'Sign in as shop',
      });
      if (!ok) return null;
      return { session: await adminImpersonateApi.impersonate(v.tenantId), path: v.path };
    },
    onSuccess: (res) => {
      if (!res) return;
      const tenantUrl = (import.meta.env.VITE_TENANT_URL as string) || 'http://localhost:5173';
      const next = res.path ? `&next=${encodeURIComponent(res.path)}` : '';
      window.open(`${tenantUrl}/login?impersonate=1&access=${encodeURIComponent(res.session.accessToken)}&refresh=${encodeURIComponent(res.session.refreshToken)}${next}`, '_blank');
      toast.success('Opening the shop in a new tab. This is logged.');
    },
    onError: (e) => toast.error(apiError(e)),
  });
}
