/** Small pieces every clinic list uses: the white list card, pager, empty and error states. */

import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { Button, EmptyState, Skeleton } from '@/design-system/components';

export function ListCard({ children }: { children: ReactNode }) {
  return <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">{children}</section>;
}

export function ListLoading({ rows = 6 }: { rows?: number }) {
  return <div className="space-y-2 p-4">{Array.from({ length: rows }, (_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>;
}

export function ListFailed({ onRetry }: { onRetry: () => void }) {
  return (
    <EmptyState title="List nahi khuli" description="Internet ya server ka masla — dobara koshish karein."
      action={<Button variant="secondary" leftIcon={<RefreshCw className="h-4 w-4" />} onClick={onRetry}>Dobara</Button>} />
  );
}

export function Pager({ page, total, limit, onPage }: { page: number; total: number; limit: number; onPage: (p: number) => void }) {
  const pages = Math.max(Math.ceil(total / limit), 1);
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-[0.8125rem] text-slate-600">
      <span>{(page - 1) * limit + 1}–{Math.min(page * limit, total)} / {total}</span>
      <div className="flex gap-1.5">
        <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => onPage(page - 1)} leftIcon={<ChevronLeft className="h-4 w-4" />}>Pichhla</Button>
        <Button size="sm" variant="secondary" disabled={page >= pages} onClick={() => onPage(page + 1)} rightIcon={<ChevronRight className="h-4 w-4" />}>Agla</Button>
      </div>
    </div>
  );
}
