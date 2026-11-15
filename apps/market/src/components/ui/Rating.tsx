'use client';
/** Star rating: compact display (value + count) and a 1–5 input. */
import { Star } from 'lucide-react';
import { cn } from './cn';

export function RatingPill({ value, count, className }: { value: number; count?: number; className?: string }) {
  if (!value) return null;
  return (
    <span className={cn('num inline-flex items-center gap-1 text-xs font-semibold text-gray-800', className)}>
      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden />
      {value.toFixed(1)}
      {count ? <span className="font-normal text-gray-500">({count > 999 ? `${Math.floor(count / 1000)}k+` : count})</span> : null}
    </span>
  );
}

export function RatingInput({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-1.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={String(n)} onClick={() => onChange(n)} className="rounded-lg p-1 transition hover:scale-110">
          <Star className={cn('h-8 w-8', n <= value ? 'fill-amber-400 text-amber-400' : 'text-gray-300')} />
        </button>
      ))}
    </div>
  );
}
