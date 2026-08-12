import { cn } from '../../../../lib/cn';
import type { LucideIcon } from 'lucide-react';

interface Props {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  delta?: string;
  deltaColor?: 'up' | 'down' | 'neutral';
  className?: string;
  hint?: string;
}

export function StatCard({
  label, value, icon: Icon, delta, deltaColor = 'neutral', className, hint,
}: Props) {
  return (
    <div className={cn(
      'rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:shadow-md',
      className,
    )}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">{label}</p>
          <p className="mt-2 text-3xl font-bold text-neutral-900">{value}</p>
          {hint && <p className="mt-1 text-xs text-neutral-400">{hint}</p>}
        </div>
        {Icon && (
          <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600">
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
      {delta && (
        <p className={cn(
          'mt-3 text-xs font-medium',
          deltaColor === 'up' && 'text-emerald-600',
          deltaColor === 'down' && 'text-rose-600',
          deltaColor === 'neutral' && 'text-neutral-500',
        )}>
          {deltaColor === 'up' && '↑ '}
          {deltaColor === 'down' && '↓ '}
          {delta}
        </p>
      )}
    </div>
  );
}
