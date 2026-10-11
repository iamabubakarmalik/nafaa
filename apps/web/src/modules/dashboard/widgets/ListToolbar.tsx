/** Toolbar row for list widgets: filters on the left, print on the right. */

import type { ReactNode } from 'react';
import { PrintButton, type PrintDoc } from '@core/print';
import { useCategoryOptions } from '../data/queries';
import { MiniSelect } from '../engine/controls';

export function ListToolbar({ children, print }: { children: ReactNode; print?: () => PrintDoc }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 px-4 pb-3 sm:px-5">
      {children}
      {print && <PrintButton doc={print} size="sm" className="ml-auto" />}
    </div>
  );
}

export function CategorySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { data = [] } = useCategoryOptions();
  if (data.length === 0) return null;
  return (
    <MiniSelect
      label="Category"
      value={value}
      onChange={onChange}
      options={[{ value: '', label: 'Sab categories' }, ...data.map((c) => ({ value: c.id, label: c.name }))]}
    />
  );
}
