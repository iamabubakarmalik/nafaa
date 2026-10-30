/**
 * Key number with label, optional icon, change indicator and hint.
 * `trend` colors the change: up = success, down = danger.
 */

import type { ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { cn } from '@core/lib/cn';

interface StatCardProps {
  label: ReactNode;
  value: ReactNode;
  icon?: ReactNode;
  change?: ReactNode;
  trend?: 'up' | 'down' | 'flat';
  hint?: ReactNode;
  onClick?: () => void;
  className?: string;
}

export function StatCard({ label, value, icon, change, trend = 'flat', hint, onClick, className }: StatCardProps) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'flex flex-col rounded-xl border border-slate-200 bg-white p-4 text-start shadow-sm',
        onClick && 'transition hover:border-slate-300 hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[0.8125rem] font-medium text-slate-500">{label}</span>
        {icon && <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-700">{icon}</span>}
      </div>
      <div className="mt-1.5 text-2xl font-bold tabular-nums tracking-tight text-slate-900">{value}</div>
      {(change || hint) && (
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
          {change && (
            <span className={cn(
              'inline-flex items-center gap-0.5 font-semibold',
              trend === 'up' ? 'text-success-700' : trend === 'down' ? 'text-rose-700' : 'text-slate-500',
            )}>
              {trend === 'up' && <ArrowUpRight className="h-3.5 w-3.5" />}
              {trend === 'down' && <ArrowDownRight className="h-3.5 w-3.5" />}
              {change}
            </span>
          )}
          {hint && <span className="text-slate-500">{hint}</span>}
        </div>
      )}
    </Tag>
  );
}
