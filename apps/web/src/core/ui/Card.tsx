import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@core/lib/cn';

type Variant = 'default' | 'elevated' | 'outlined' | 'ghost' | 'gradient';
type Padding = 'none' | 'sm' | 'md' | 'lg';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: Variant;
  padding?: Padding;
  hoverable?: boolean;
}

const variantClasses: Record<Variant, string> = {
  default:  'bg-white dark:bg-ink-900 border border-slate-200 dark:border-ink-800',
  elevated: 'bg-white dark:bg-ink-900 shadow-soft-lg border border-slate-100 dark:border-ink-800',
  outlined: 'bg-transparent border-2 border-slate-200 dark:border-ink-700',
  ghost:    'bg-slate-50 dark:bg-ink-900/50 border border-transparent',
  gradient: 'bg-gradient-to-br from-white via-white to-brand-50 dark:from-ink-900 dark:via-ink-900 dark:to-brand-950/20 border border-slate-200 dark:border-ink-800 shadow-soft',
};

const paddingClasses: Record<Padding, string> = {
  none: 'p-0',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-7',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', padding = 'md', hoverable, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-2xl transition-all duration-200',
        variantClasses[variant],
        paddingClasses[padding],
        hoverable && 'hover:shadow-soft-lg hover:-translate-y-0.5 cursor-pointer',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  ),
);
Card.displayName = 'Card';

export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('mb-4 flex items-start justify-between gap-4', className)} {...props} />
  ),
);
CardHeader.displayName = 'CardHeader';

export const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn('text-lg font-extrabold text-slate-900 dark:text-ink-white leading-tight', className)} {...props} />
  ),
);
CardTitle.displayName = 'CardTitle';

export const CardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn('text-sm text-slate-500 dark:text-ink-400 mt-1', className)} {...props} />
  ),
);
CardDescription.displayName = 'CardDescription';

export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn('', className)} {...props} />,
);
CardContent.displayName = 'CardContent';

export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('mt-5 pt-4 border-t border-slate-100 dark:border-ink-800 flex items-center justify-between gap-3', className)} {...props} />
  ),
);
CardFooter.displayName = 'CardFooter';
