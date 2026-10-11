/** Toolbar row under a widget's title: controls on the left, print on the right. */

import type { ReactNode } from 'react';
import { PrintButton, type PrintDoc } from '@core/print';
import { useCategoryOptions } from '../data/queries';
import { MiniSelect } from '../engine/controls';

export function WidgetToolbar({ children, print, inset = true }: { children?: ReactNode; print?: () => PrintDoc; inset?: boolean }) {
  return (
    <div className={inset ? 'flex flex-wrap items-center gap-1.5 px-4 pb-3 sm:px-5' : 'mb-3 flex flex-wrap items-center gap-1.5'}>
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
