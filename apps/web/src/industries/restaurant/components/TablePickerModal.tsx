/**
 * Choose a table for a dine-in order, section by section. A free or
 * reserved table can be taken; a busy one offers to add to its running
 * order instead of opening a second bill on it.
 */

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Clock, Users } from 'lucide-react';
import { Modal, Skeleton } from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import { cn } from '@core/lib/cn';
import { tablesApi, type FloorTable } from '../api/tables.api';
import { TABLE_META, duration, minutesSince } from '../lib/orderMeta';

export function TablePickerModal({ value, onPick, onOpenOrder, onClose }: {
  value?: string;
  onPick: (t: FloorTable) => void;
  /** A busy table was chosen: add to the order already on it. */
  onOpenOrder?: (orderId: string) => void;
  onClose: () => void;
}) {
  const { data, isLoading } = useQuery({ queryKey: ['restaurant-floor'], queryFn: () => tablesApi.floor(), refetchInterval: 20_000 });
  const [section, setSection] = useState<string>('all');
  const tables = useMemo(() => (data?.tables ?? []).filter((t) => section === 'all' || (t.section || 'Main') === section), [data, section]);

  return (
    <Modal open onClose={onClose} size="xl" title="Table chunein" description="Hari table khaali hai · laal par order chal raha hai">
      {data && data.sections.length > 1 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {['all', ...data.sections].map((s) => (
            <button key={s} type="button" onClick={() => setSection(s)}
              className={cn('h-8 rounded-full px-3 text-[0.8125rem] font-semibold', section === s ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')}>
              {s === 'all' ? 'Sab' : s}
            </button>
          ))}
        </div>
      )}
      {isLoading ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">{Array.from({ length: 10 }, (_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
      ) : !tables.length ? (
        <p className="rounded-2xl bg-slate-50 px-4 py-10 text-center text-[0.875rem] text-slate-600">Abhi koi table nahi. Tables ke safhe par "Floor setup" se banayein.</p>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {tables.map((t) => {
            const meta = TABLE_META[t.liveStatus];
            const busy = t.liveStatus === 'OCCUPIED' && !!t.currentOrder;
            const blocked = t.liveStatus === 'OUT_OF_SERVICE';
            return (
              <button key={t.id} type="button" disabled={blocked}
                onClick={() => (busy && t.currentOrder && onOpenOrder ? onOpenOrder(t.currentOrder.id) : onPick(t))}
                className={cn('relative flex flex-col items-center rounded-2xl px-2 py-3 text-center ring-1 transition disabled:cursor-not-allowed disabled:opacity-50',
                  meta.bg, value === t.id ? 'ring-2 ring-brand-600' : meta.ring, !blocked && 'hover:-translate-y-0.5 hover:shadow-md')}>
                <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full" style={{ backgroundColor: meta.color }} />
                <span className="text-xl font-bold tabular-nums text-slate-900">{t.tableNumber}</span>
                <span className="mt-0.5 inline-flex items-center gap-1 text-[0.6875rem] text-slate-600"><Users className="h-3 w-3" />{t.capacity}</span>
                <span className="mt-1 text-[0.6875rem] font-semibold" style={{ color: meta.color }}>
                  {busy ? `${formatPKR(t.runningBill)} · item daalein` : meta.label}
                </span>
                {busy && t.currentOrder && (
                  <span className="mt-0.5 inline-flex items-center gap-1 text-[0.625rem] text-slate-500"><Clock className="h-3 w-3" />{duration(minutesSince(t.occupiedAt ?? t.currentOrder.createdAt))}</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
