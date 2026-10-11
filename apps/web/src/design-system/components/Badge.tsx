/** Small status label. Tones map to meaning, not to raw colors. */

import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@core/lib/cn';

export type BadgeVariant = 'default' | 'brand' | 'accent' | 'success' | 'warning' | 'danger' | 'info' | 'outline' | 'ghost';
type Size = 'xs' | 'sm' | 'md' | 'lg';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: Size;
  dot?: boolean;
  pulse?: boolean;
}

const VARIANTS: Record<BadgeVariant, string> = {
  default: 'bg-slate-100 text-slate-700 ring-slate-200',
  brand: 'bg-brand-50 text-brand-700 ring-brand-200',
  accent: 'bg-amber-50 text-amber-800 ring-amber-200',
  success: 'bg-success-50 text-success-700 ring-success-200',
  warning: 'bg-amber-50 text-amber-800 ring-amber-200',
  danger: 'bg-rose-50 text-rose-700 ring-rose-200',
  info: 'bg-blue-50 text-blue-700 ring-blue-200',
  outline: 'bg-transparent text-slate-700 ring-slate-300',
  ghost: 'bg-transparent text-slate-600 ring-transparent',
};

const DOT: Record<BadgeVariant, string> = {
  default: 'bg-slate-400', brand: 'bg-brand-500', accent: 'bg-amber-500', success: 'bg-success-500', warning: 'bg-amber-500',
  danger: 'bg-rose-500', info: 'bg-blue-500', outline: 'bg-slate-400', ghost: 'bg-slate-400',
};

const SIZES: Record<Size, string> = {
  xs: 'h-5 px-1.5 text-[0.6875rem]',
  sm: 'h-6 px-2 text-xs',
  md: 'h-7 px-2.5 text-[0.8125rem]',
  lg: 'h-8 px-3 text-sm',
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  { className, variant = 'default', size = 'sm', dot, pulse, children, ...props },
  ref,
) {
  return (
    <span
      ref={ref}
      className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-md font-semibold ring-1 ring-inset', VARIANTS[variant], SIZES[size], className)}
      {...props}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', DOT[variant], pulse && 'animate-pulse')} aria-hidden />}
      {children}
    </span>
  );
});
