/** One person's bills for the day, from Sales history, opened from the staff lists. */

import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Receipt } from 'lucide-react';
import { Modal, Skeleton } from '@/design-system/components';
import { salesHistoryApi } from '@modules/sales/history/api';
import { clock, method, type Money } from '../print';
import { Empty, Tag } from './parts';

export function StaffBills({ date, staffId, name, m, onClose }: { date: string; staffId: string; name: string; m: Money; onClose: () => void }) {
  const q = useQuery({
    queryKey: ['sales-history', 'day-book-staff', date, staffId],
    queryFn: () => salesHistoryApi.list({ from: date, to: date, status: 'all', staffId, sort: 'new' }, 1, 100),
  });
  const st = q.data?.stats;
  return (
    <Modal open onClose={onClose} size="lg" title={`${name} ke bill`}
      description={st ? `${st.bills} bill · ${m.sales(st.total)}${st.voided ? ` · ${st.voided} void` : ''}` : 'Load ho rahe hain…'}>
      {q.isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
      ) : q.isError ? (
        <Empty icon={Receipt} text="Bill load nahi hue" hint="Sale ka record dekhne ki permission chahiye" />
      ) : !q.data?.items.length ? (
        <Empty icon={Receipt} text="Koi bill nahi" />
      ) : (
        <ul className="max-h-[60vh] divide-y divide-slate-100 overflow-y-auto">
          {q.data.items.map((s) => (
            <li key={s.id}>
              <Link to={`/sales/${s.id}/receipt`} className="flex items-center justify-between gap-3 py-2.5 hover:opacity-80">
                <span className="min-w-0">
                  <span className="flex items-center gap-2 text-[0.8125rem] font-medium text-slate-900">
                    {s.saleNumber}
                    {s.status === 'VOIDED' && <Tag tone="rose">Void</Tag>}
                    {s.creditAmount > 0 && s.status !== 'VOIDED' && <Tag tone="amber">Udhaar</Tag>}
                    {s.refundedAmount > 0 && <Tag tone="slate">Return</Tag>}
                  </span>
                  <span className="block truncate text-[0.6875rem] text-slate-500">
                    {clock(s.soldAt)} · {s.customer?.name ?? 'Walk-in'} · {s.items.length} cheezein · {method(s.paymentMethod)}
                  </span>
                </span>
                <span className={`shrink-0 tabular-nums text-[0.8125rem] font-semibold ${s.status === 'VOIDED' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{m.sales(s.total)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {q.data?.hasMore && <p className="mt-2 text-[0.75rem] text-slate-500">Pehle 100 bill dikh rahe hain.</p>}
    </Modal>
  );
}
