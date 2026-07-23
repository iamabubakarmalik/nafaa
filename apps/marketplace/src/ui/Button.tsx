import { ButtonHTMLAttributes, forwardRef, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@lib/cn';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'gradient' | 'link';
type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'icon';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const variants: Record<Variant, string> = {
  primary:   'bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white shadow-brand hover:shadow-brand-lg',
  secondary: 'bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900',
  outline:   'bg-transparent border-2 border-slate-200 hover:border-slate-300 dark:border-neutral-700 dark:hover:border-neutral-600 text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-neutral-800',
  ghost:     'bg-transparent hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-700 dark:text-slate-300',
  danger:    'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-md',
  success:   'bg-success-600 hover:bg-success-700 active:bg-success-800 text-white shadow-md',
  gradient:  'bg-gradient-to-r from-brand-600 via-brand-700 to-emerald-700 hover:from-brand-700 hover:via-brand-800 hover:to-emerald-800 text-white shadow-brand hover:shadow-brand-lg',
  link:      'bg-transparent text-brand-700 hover:text-brand-800 dark:text-brand-400 dark:hover:text-brand-300 hover:underline underline-offset-4 p-0 shadow-none h-auto',
};

const sizes: Record<Size, string> = {
  xs: 'h-7 px-2.5 text-xs rounded-lg gap-1',
  sm: 'h-9 px-3 text-sm rounded-lg gap-1.5',
  md: 'h-11 px-4 text-sm rounded-xl gap-2',
  lg: 'h-12 px-6 text-base rounded-xl gap-2',
  xl: 'h-14 px-8 text-base rounded-2xl gap-2.5',
  icon: 'h-10 w-10 rounded-xl',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className, variant = 'primary', size = 'md', loading, fullWidth,
      leftIcon, rightIcon, children, disabled, type = 'button', ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading}
      className={cn(
        'inline-flex items-center justify-center font-extrabold transition-all duration-200 select-none whitespace-nowrap',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-900',
        'active:scale-[0.98]',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        loading && 'pointer-events-none',
        className,
      )}
      {...props}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}
      {children}
      {!loading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  ),
);

Button.displayName = 'Button';
