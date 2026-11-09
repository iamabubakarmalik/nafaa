/**
 * Dense parcel list for the scan desks (packing, returns): order, customer,
 * courier with CN, amount and a status badge, in the orders board's row
 * style. Rows can be ticked for bulk printing and opened with a click.
 */

import type { ReactNode } from 'react';
import { Truck } from 'lucide-react';
import { Badge, Card, Checkbox, EmptyState, Skeleton, type BadgeVariant } from '@/design-system/components';
import { BrandLogo } from '@/assets/brands/BrandLogo';
import { cn } from '@core/lib/cn';
import { courierBrand, rs, timeAgo } from '../../lib/labels';
import { t } from '@core/i18n';

export interface ParcelRow {
  id: string;
  number: string;
  customerName: string;
  city: string | null;
  total: number;
  courierCode: string | null;
  courierLabel: string | null;
  trackingNumber: string | null;
  at?: string | null;
  status: { label: string; variant: BadgeVariant };
  note?: ReactNode;
}

const GRID = 'sm:grid sm:grid-cols-[auto_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1.4fr)_6rem_8rem] sm:items-center sm:gap-3';
const HEAD = 'text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500';

export function ParcelList({ title, description, actions, rows, loading, empty, picked, onToggle, onToggleAll, onOpen }: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  rows: ParcelRow[];
  loading?: boolean;
  empty: { icon: ReactNode; title: string; text?: string; action?: ReactNode };
  picked?: Set<string>;
  onToggle?: (id: string) => void;
  onToggleAll?: (on: boolean) => void;
  onOpen?: (row: ParcelRow) => void;
}) {
  const pickable = !!picked && !!onToggle;
  const allPicked = pickable && rows.length > 0 && rows.every((r) => picked!.has(r.id));
  return (
    <Card flush title={title} description={description} actions={actions}>
      <div>
        {loading ? <div className="p-4"><Skeleton className="h-24 rounded-xl" /></div> : !rows.length ? (
          <EmptyState icon={empty.icon} title={empty.title} description={empty.text} action={empty.action} className="py-8" />
        ) : (
          <>
            <div className={cn('hidden border-y border-slate-100 px-4 py-2 sm:px-5', GRID)}>
              {pickable
                ? <Checkbox aria-label={t('Sab chunein')} checked={allPicked} onChange={(e) => onToggleAll?.(e.target.checked)} />
                : <span />}
              <span className={HEAD}>{t('Order')}</span>
              <span className={HEAD}>{t('Customer')}</span>
              <span className={HEAD}>{t('Courier')}</span>
              <span className={cn(HEAD, 'text-end')}>{t('Amount')}</span>
              <span className={cn(HEAD, 'text-end')}>{t('Status')}</span>
            </div>
            <ul className="divide-y divide-slate-100">
              {rows.map((r) => (
                <li key={r.id} className={cn('flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 sm:px-5', GRID, onOpen && 'cursor-pointer hover:bg-slate-50')}
                  onClick={onOpen ? () => onOpen(r) : undefined}>
                  {pickable
                    ? <span onClick={(e) => e.stopPropagation()}><Checkbox aria-label={`#${r.number}`} checked={picked!.has(r.id)} onChange={() => onToggle!(r.id)} /></span>
                    : <span className="hidden sm:block" />}
                  <div className="min-w-0">
                    <div className="truncate text-[0.875rem] font-semibold text-slate-900">#{r.number}</div>
                    {r.at && <div className="text-[0.6875rem] text-slate-500">{timeAgo(r.at)}</div>}
                  </div>
                  <div className="min-w-0 flex-1 sm:flex-none">
                    <div className="truncate text-[0.8125rem] text-slate-800">{r.customerName}</div>
                    {r.city && <div className="truncate text-[0.6875rem] text-slate-500">{r.city}</div>}
                  </div>
                  <div className="flex min-w-0 basis-full items-center gap-1.5 text-[0.75rem] text-slate-600 sm:basis-auto">
                    {r.courierCode ? <BrandLogo name={courierBrand(r.courierCode)} size={16} /> : <Truck className="h-3.5 w-3.5 shrink-0 text-slate-400" />}
                    <span className="truncate">{r.courierCode ? `${r.courierLabel ?? r.courierCode}${r.trackingNumber ? ` · ${r.trackingNumber}` : ''}` : t('Courier abhi nahi')}</span>
                    {r.note}
                  </div>
                  <div className="text-[0.8125rem] font-semibold tabular-nums text-slate-900 sm:text-end">{rs(r.total)}</div>
                  <div className="sm:text-end"><Badge variant={r.status.variant} size="sm">{r.status.label}</Badge></div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </Card>
  );
}
