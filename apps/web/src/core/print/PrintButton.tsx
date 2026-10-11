/**
 * Print button for any page: one click prints in the last-used format, the
 * arrow picks A4, Thermal 80 mm or Thermal 58 mm. Pass a function that
 * builds the document so it is only assembled when printing.
 *
 *   <PrintButton doc={() => buildMyDoc(data)} disabled={!data} />
 */

import { useRef, useState } from 'react';
import { Check, ChevronDown, FileText, Printer, Receipt } from 'lucide-react';
import { cn } from '@core/lib/cn';
import { printDoc, usePrintPrefs } from './printDoc';
import { useBusinessHeader } from './useBusinessHeader';
import type { PrintDoc, PrintFormat } from './types';
import { useDismissible } from './useDismissible';

const FORMATS: Array<{ id: PrintFormat; label: string; hint: string; icon: typeof Printer }> = [
  { id: 'a4', label: 'A4 / PDF', hint: 'Bara safha, ya PDF save', icon: FileText },
  { id: '80', label: 'Thermal 80mm', hint: 'Aam receipt printer', icon: Receipt },
  { id: '58', label: 'Thermal 58mm', hint: 'Chhota printer', icon: Receipt },
];

export function PrintButton({ doc, disabled, label = 'Print', size = 'md', className }: {
  doc: () => PrintDoc;
  disabled?: boolean;
  label?: string;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const biz = useBusinessHeader();
  const format = usePrintPrefs((s) => s.format);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDismissible(ref, open, () => setOpen(false));
  const current = FORMATS.find((f) => f.id === format) ?? FORMATS[0];
  const run = (f: PrintFormat) => { setOpen(false); void printDoc(doc(), f, biz); };
  const h = size === 'sm' ? 'h-8' : 'h-9';

  return (
    <div ref={ref} className={cn('relative inline-flex', className)}>
      <button type="button" disabled={disabled} onClick={() => run(format)} title={`${label} (${current.label})`}
        className={cn(h, 'inline-flex items-center gap-1.5 rounded-l-lg border border-slate-200 bg-white pl-2.5 pr-2 text-[0.8125rem] font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50')}>
        <Printer className="h-4 w-4" />
        <span className="hidden sm:inline">{label}</span>
        <span className="hidden text-[0.6875rem] font-medium text-slate-400 md:inline">{format === 'a4' ? 'A4' : `${format}mm`}</span>
      </button>
      <button type="button" disabled={disabled} onClick={() => setOpen((v) => !v)} aria-haspopup="menu" aria-expanded={open} aria-label="Print format chunein"
        className={cn(h, 'inline-flex w-7 items-center justify-center rounded-r-lg border border-l-0 border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 disabled:opacity-50')}>
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-50 mt-1.5 w-60 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
          {FORMATS.map((f) => (
            <button key={f.id} type="button" role="menuitem" onClick={() => run(f.id)}
              className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition hover:bg-slate-50">
              <f.icon className="h-4 w-4 shrink-0 text-slate-500" />
              <span className="min-w-0 flex-1">
                <span className="block text-[0.8125rem] font-medium text-slate-900">{f.label}</span>
                <span className="block text-[0.6875rem] text-slate-500">{f.hint}</span>
              </span>
              {f.id === format && <Check className="h-4 w-4 text-brand-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
