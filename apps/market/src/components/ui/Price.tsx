/** Price with an optional struck-through "was" price. */
import { money } from '@/lib/format';
import { cn } from './cn';

export function Price({ value, compareAt, max, className, size = 'md' }: { value: number; compareAt?: number | null; max?: number; className?: string; size?: 'sm' | 'md' | 'lg' }) {
  const sz = size === 'lg' ? 'text-xl' : size === 'sm' ? 'text-xs' : 'text-sm';
  return (
    <span className={cn('num inline-flex flex-wrap items-baseline gap-x-1.5', className)}>
      <span className={cn('font-bold text-gray-900', sz)}>
        {money(value)}
        {max && max > value ? ` – ${money(max)}` : ''}
      </span>
      {compareAt && compareAt > value ? <span className="text-2xs text-gray-400 line-through">{money(compareAt)}</span> : null}
    </span>
  );
}
