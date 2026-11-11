/** Label / value rows for detail pages and side panels. */

import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function DetailList({ items, cols = 1, className }: { items: Array<{ label: ReactNode; value: ReactNode; hidden?: boolean }>; cols?: 1 | 2 | 3; className?: string }) {
  return (
    <dl className={cn('grid gap-x-6 gap-y-3', cols === 2 && 'sm:grid-cols-2', cols === 3 && 'sm:grid-cols-2 lg:grid-cols-3', className)}>
      {items.filter((i) => !i.hidden).map((i, n) => (
        <div key={n} className="min-w-0">
          <dt className="text-[0.75rem] font-medium text-slate-500">{i.label}</dt>
          <dd className="mt-0.5 break-words text-[0.875rem] text-slate-900">{i.value ?? <span className="text-slate-400">—</span>}</dd>
        </div>
      ))}
    </dl>
  );
}
