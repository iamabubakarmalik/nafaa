import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@core/lib/cn';

type Variant =
  | 'default' | 'brand' | 'accent' | 'success' | 'warning' | 'danger' | 'info'
  | 'outline' | 'ghost';
type Size = 'xs' | 'sm' | 'md' | 'lg';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
  size?: Size;
  dot?: boolean;
  pulse?: boolean;
}

const variantClasses: Record<Variant, string> = {
  default: 'bg-slate-100 text-slate-700 dark:bg-neutral-800 dark:text-slate-300',
  brand:   'bg-brand-100 text-brand-800 dark:bg-brand-900/40 dark:text-brand-300',
  accent:  'bg-accent-100 text-accent-800 dark:bg-accent-900/40 dark:text-accent-300',
  success: 'bg-success-50 text-success-700 dark:bg-success-900/30 dark:text-success-400',
  warning: 'bg-accent-100 text-accent-800 dark:bg-accent-900/40 dark:text-accent-300',
  danger:  'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  info:    'bg-info-50 text-info-700 dark:bg-info-900/30 dark:text-info-400',
  outline: 'bg-transparent border border-slate-300 text-slate-700 dark:border-neutral-600 dark:text-slate-300',
  ghost:   'bg-transparent text-slate-600 dark:text-slate-400',
};

const sizeClasses: Record<Size, string> = {
  xs: 'text-[10px] px-1.5 py-0.5 h-5',
  sm: 'text-xs px-2 py-0.5 h-6',
  md: 'text-xs px-2.5 py-1 h-7',
  lg: 'text-sm px-3 py-1.5 h-8',
};

const dotColor: Record<Variant, string> = {
  default: 'bg-slate-400',
  brand: 'bg-brand-500',
  accent: 'bg-accent-500',
  success: 'bg-success-500',
  warning: 'bg-accent-500',
  danger: 'bg-rose-500',
  info: 'bg-info-500',
  outline: 'bg-slate-400',
  ghost: 'bg-slate-400',
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', size = 'sm', dot, pulse, children, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-bold whitespace-nowrap',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {dot && (
        <span className={cn('h-1.5 w-1.5 rounded-full', dotColor[variant], pulse && 'animate-pulse-soft')} />
      )}
      {children}
    </span>
  ),
);
Badge.displayName = 'Badge';
