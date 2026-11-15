'use client';
/** − qty + control. Shows a single "Add" button at zero when addLabel is given. */
import { Minus, Plus, Trash2 } from 'lucide-react';
import { cn } from './cn';

interface Props {
  value: number;
  onChange: (v: number) => void;
  max?: number;
  min?: number;
  addLabel?: string;
  busy?: boolean;
  size?: 'sm' | 'md';
  trashAtOne?: boolean;
  className?: string;
}

export function Stepper({ value, onChange, max = 99, min = 0, addLabel, busy, size = 'md', trashAtOne, className }: Props) {
  const h = size === 'sm' ? 'h-8' : 'h-10';
  const w = size === 'sm' ? 'w-8' : 'w-10';
  if (value <= 0 && addLabel) {
    return (
      <button type="button" disabled={busy || max <= 0} onClick={() => onChange(1)} className={cn(h, 'inline-flex items-center gap-1 rounded-full bg-white px-3 text-xs font-bold text-brand-700 shadow-card ring-1 ring-brand-200 transition hover:bg-brand-50 disabled:opacity-50', className)}>
        <Plus className="h-4 w-4" aria-hidden />
        {addLabel}
      </button>
    );
  }
  return (
    <div className={cn(h, 'inline-flex items-center rounded-full bg-brand-600 text-brand-fg shadow-brand', busy && 'opacity-80', className)}>
      <button type="button" aria-label="−" disabled={busy || value <= min} onClick={() => onChange(value - 1)} className={cn(w, h, 'grid place-items-center rounded-full disabled:opacity-40')}>
        {trashAtOne && value === 1 ? <Trash2 className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
      </button>
      <span className="num min-w-[1.5rem] text-center text-sm font-bold" aria-live="polite">{value}</span>
      <button type="button" aria-label="+" disabled={busy || value >= max} onClick={() => onChange(value + 1)} className={cn(w, h, 'grid place-items-center rounded-full disabled:opacity-40')}>
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
