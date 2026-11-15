/**
 * Small pieces shared by the Market pages: accent colours for KPI and guide
 * icons, the guide button, a pager, a "Coming soon" block and the order
 * status badge.
 */

import type { ReactNode } from 'react';
import { Clock, GraduationCap } from 'lucide-react';
import { Badge, Button, EmptyState, heroIconButton, type BadgeVariant } from '@/design-system/components';
import { msg, t } from '@core/i18n';

/**
 * Accent colours for KpiCard and PageGuide icons. Those components take a
 * colour value and add their own tint, so the values live here once instead
 * of in every page.
 */
export const TONE = {
  green: '#16a34a',
  blue: '#2563eb',
  amber: '#d97706',
  rose: '#e11d48',
  violet: '#7c3aed',
  cyan: '#0891b2',
  pink: '#db2777',
  orange: '#ea580c',
  slate: '#64748b',
} as const;

export function GuideButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} title={t('Guide (G)')} aria-label={t('Guide (G)')} className={heroIconButton}>
      <GraduationCap className="h-4 w-4" />
    </button>
  );
}

export function Pager({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2">
      <Button variant="secondary" size="sm" data-pager="prev" disabled={page <= 1} onClick={() => onPage(page - 1)}>{t('Pichla')}</Button>
      <span className="text-sm text-slate-600">{t('Safha {{page}} / {{totalPages}}', { page, totalPages })}</span>
      <Button variant="secondary" size="sm" data-pager="next" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>{t('Agla')}</Button>
    </div>
  );
}

/** A control whose server side is not ready yet. */
export function ComingSoon({ title, text, icon }: { title: string; text?: string; icon?: ReactNode }) {
  return (
    <EmptyState
      icon={icon ?? <Clock className="h-6 w-6" />}
      title={<span className="inline-flex items-center gap-2">{title}<Badge size="xs" variant="info">{t('Jald aa raha hai')}</Badge></span>}
      description={text}
    />
  );
}

const ORDER_STATUS: Record<string, { label: string; variant: BadgeVariant }> = {
  PENDING: { label: msg('Naya'), variant: 'warning' },
  CONFIRMED: { label: msg('Confirm'), variant: 'info' },
  ACCEPTED: { label: msg('Confirm'), variant: 'info' },
  PREPARING: { label: msg('Tayyar ho raha hai'), variant: 'info' },
  READY: { label: msg('Tayyar'), variant: 'brand' },
  OUT_FOR_DELIVERY: { label: msg('Raste me'), variant: 'brand' },
  DELIVERED: { label: msg('Pohanch gaya'), variant: 'success' },
  COMPLETED: { label: msg('Mukammal'), variant: 'success' },
  CANCELLED: { label: msg('Cancel'), variant: 'danger' },
  REJECTED: { label: msg('Wapas kar diya'), variant: 'danger' },
  REFUNDED: { label: msg('Refund'), variant: 'default' },
};

export const orderStatusLabel = (s: string) => (ORDER_STATUS[s] ? t(ORDER_STATUS[s].label) : s.replace(/_/g, ' ').toLowerCase());

export function OrderStatusBadge({ status }: { status: string }) {
  const s = ORDER_STATUS[status];
  return <Badge size="xs" variant={s?.variant ?? 'default'}>{orderStatusLabel(status)}</Badge>;
}

/** Stars as text, e.g. 4 → ★★★★☆ */
export const stars = (n: number) => '★★★★★'.slice(0, Math.round(n)) + '☆☆☆☆☆'.slice(0, 5 - Math.round(n));

/** Period tabs for the analytics-based pages. */
export function rangeTabs() {
  return [
    { id: '7d' as const, label: t('7 din') },
    { id: '30d' as const, label: t('30 din') },
    { id: '90d' as const, label: t('90 din') },
    { id: 'year' as const, label: t('Saal') },
  ];
}
