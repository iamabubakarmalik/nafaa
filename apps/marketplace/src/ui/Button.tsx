import { forwardRef, ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { Loader2 } from 'lucide-react';

const variantStyles = {
  primary: 'bg-brand-600 hover:bg-brand-700 text-white shadow-brand',
  gradient: 'bg-gradient-brand hover:opacity-90 text-white shadow-brand',
  accent: 'bg-accent-500 hover:bg-accent-600 text-white shadow-accent',
  secondary: 'bg-surface hover:bg-surface-muted text-content border border-border',
  ghost: 'bg-transparent hover:bg-surface-muted text-content',
  outline: 'bg-transparent hover:bg-brand-50 dark:hover:bg-brand-950/30 text-brand-700 dark:text-brand-400 border-2 border-brand-600',
  danger: 'bg-danger hover:bg-red-700 text-white',
  glass: 'glass text-content hover:bg-surface/80',
};

const sizeStyles = {
  xs: 'h-8 px-3 text-xs',
  sm: 'h-9 px-4 text-sm',
  md: 'h-11 px-5 text-sm',
  lg: 'h-12 px-6 text-base',
  xl: 'h-14 px-8 text-lg',
  icon: 'h-11 w-11',
  'icon-sm': 'h-9 w-9',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variantStyles;
  size?: keyof typeof sizeStyles;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  className, variant = 'primary', size = 'md',
  loading, disabled, fullWidth, leftIcon, rightIcon,
  children, ...props
}, ref) => (
  <button
    ref={ref}
    disabled={disabled || loading}
    className={cn(
      'inline-flex items-center justify-center gap-2 rounded-2xl font-bold',
      'transition-all duration-150 active:scale-[0.97]',
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-2',
      'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
      variantStyles[variant],
      sizeStyles[size],
      fullWidth && 'w-full',
      className,
    )}
    {...props}
  >
    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : leftIcon}
    {children}
    {!loading && rightIcon}
  </button>
));
Button.displayName = 'Button';
