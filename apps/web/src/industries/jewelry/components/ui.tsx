/** Small pieces the jewelry pages share: empty and error states, paging, karat chips, status pill. */

import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { orderStatus, purityLabel } from '../lib/meta';

export function LoadFailed({ what, retry }: { what: string; retry: () => void }) {
  return (
    <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
      <p className="font-semibold text-slate-900">{what} load nahi hue</p>
      <p className="mt-1 text-sm text-slate-500">Internet check karein aur dobara koshish karein.</p>
      <Button className="mt-3" variant="secondary" onClick={retry}>Dobara koshish</Button>
    </div>
  );
}

export function EmptyList({ icon: I, title, text, children }: { icon: LucideIcon; title: string; text: string; children?: ReactNode }) {
  return (
    <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
      <I className="mx-auto h-10 w-10 text-slate-300" />
      <p className="mt-3 font-semibold text-slate-900">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{text}</p>
      {children && <div className="mt-4 flex flex-wrap justify-center gap-2">{children}</div>}
    </div>
  );
}

export function Pager({ page, pages, onPage }: { page: number; pages: number; onPage: (p: number) => void }) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2">
      <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>Pichla</Button>
      <span className="text-sm text-slate-600">Safha {page} / {pages}</span>
      <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>Agla</Button>
    </div>
  );
}

/** Karat badge: gold karats in amber, silver in slate. */
export function KaratPill({ purity, className }: { purity?: string | null; className?: string }) {
  const silver = !!purity && (purity.startsWith('SILVER') || purity.startsWith('STERLING'));
  return (
    <span className={cn('inline-flex items-center rounded-md px-1.5 py-0.5 text-[0.6875rem] font-bold ring-1',
      silver ? 'bg-slate-50 text-slate-700 ring-slate-200' : 'bg-amber-50 text-amber-800 ring-amber-200', className)}>
      {purityLabel(purity)}
    </span>
  );
}

export function StatusPill({ status }: { status: string }) {
  const s = orderStatus(status);
  return <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold', s.tone)}>{s.label}</span>;
}

/** Choice chips for karat and similar short lists. */
export function ChipPicker<T extends string>({ value, onChange, options, label }: {
  value: T; onChange: (v: T) => void; options: Array<{ value: T; label: string }>; label?: string;
}) {
  return (
    <div>
      {label && <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">{label}</span>}
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button key={o.value} type="button" role="radio" aria-checked={value === o.value} onClick={() => onChange(o.value)}
            className={cn('h-8 rounded-full px-3 text-[0.8125rem] font-semibold ring-1 transition',
              value === o.value ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
