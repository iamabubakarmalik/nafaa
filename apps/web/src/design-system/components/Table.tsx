/**
 * Data table primitives. The wrapper scrolls horizontally on small screens so
 * wide tables never push the page wider than the viewport.
 *
 *   <Table>
 *     <THead><Tr><Th>Name</Th><Th align="right">Total</Th></Tr></THead>
 *     <TBody><Tr><Td>…</Td><Td align="right">…</Td></Tr></TBody>
 *   </Table>
 *
 * `<Tr interactive onClick>` rows join keyboard list navigation: ↑ ↓ move,
 * Enter opens (clicks the row), Space selects when the row has a checkbox.
 */

import type { HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from 'react';
import { cn } from '@core/lib/cn';

export function Table({ children, className, minWidth }: { children: ReactNode; className?: string; minWidth?: string }) {
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full border-collapse text-left text-sm" style={minWidth ? { minWidth } : undefined}>{children}</table>
    </div>
  );
}

export const THead = (props: HTMLAttributes<HTMLTableSectionElement>) => (
  <thead {...props} className={cn('border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500', props.className)} />
);

export const TBody = (props: HTMLAttributes<HTMLTableSectionElement>) => (
  <tbody {...props} className={cn('divide-y divide-slate-100', props.className)} />
);

export const Tr = ({ interactive, ...props }: HTMLAttributes<HTMLTableRowElement> & { interactive?: boolean }) => (
  <tr data-nav-row={interactive ? '' : undefined} {...props} className={cn(interactive && 'cursor-pointer transition-colors hover:bg-slate-50', props.className)} />
);

type Align = { align?: 'left' | 'center' | 'right' };
const alignClass = (a?: string) => (a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left');

export const Th = ({ align, ...props }: ThHTMLAttributes<HTMLTableCellElement> & Align) => (
  <th scope="col" {...props} className={cn('whitespace-nowrap px-4 py-2.5', alignClass(align), props.className)} />
);

export const Td = ({ align, ...props }: TdHTMLAttributes<HTMLTableCellElement> & Align) => (
  <td {...props} className={cn('px-4 py-3 text-slate-700', align === 'right' && 'tabular-nums', alignClass(align), props.className)} />
);
