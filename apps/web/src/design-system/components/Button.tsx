/**
 * Button.
 *
 * Variants: primary (brand), secondary (white, bordered — the default
 * companion to primary), outline (brand-bordered), ghost, danger (solid red),
 * critical (quiet red), success, inverse (solid dark) and link. Heights follow a 32/36/40/44/48px scale and
 * shrink with the Density setting.
 */

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@core/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'critical' | 'success' | 'inverse' | 'link' | 'gradient';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'icon';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-brand-600 text-brand-fg shadow-sm hover:bg-brand-700 active:bg-brand-800',
  secondary: 'border border-slate-300 bg-white text-slate-800 shadow-sm hover:border-slate-400 hover:bg-slate-50 active:bg-slate-100',
  outline: 'border border-brand-300 bg-white text-brand-700 hover:border-brand-400 hover:bg-brand-50 active:bg-brand-100',
  ghost: 'text-slate-700 hover:bg-slate-100 active:bg-slate-200',
  danger: 'bg-rose-600 text-white shadow-sm hover:bg-rose-700 active:bg-rose-800',
  // Quiet destructive action (e.g. "Remove" next to other secondary buttons).
  critical: 'border border-rose-200 bg-white text-rose-700 shadow-sm hover:bg-rose-50 active:bg-rose-100',
  success: 'bg-success-600 text-white shadow-sm hover:bg-success-700 active:bg-success-800',
  inverse: 'bg-slate-900 text-white shadow-sm hover:bg-slate-800 active:bg-slate-950',
  link: 'h-auto px-0 text-brand-700 underline-offset-4 hover:underline',
  // Kept for older screens; renders as primary.
  gradient: 'bg-brand-600 text-brand-fg shadow-sm hover:bg-brand-700 active:bg-brand-800',
};

const SIZES: Record<ButtonSize, string> = {
  xs: 'h-8 gap-1.5 rounded-md px-2.5 text-xs',
  sm: 'h-9 gap-1.5 rounded-lg px-3 text-[0.8125rem]',
  md: 'h-10 gap-2 rounded-lg px-4 text-sm',
  lg: 'h-11 gap-2 rounded-lg px-5 text-sm',
  xl: 'h-12 gap-2.5 rounded-xl px-6 text-base',
  icon: 'h-10 w-10 rounded-lg',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', loading, fullWidth, leftIcon, rightIcon, children, disabled, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex select-none items-center justify-center whitespace-nowrap font-semibold transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
        'disabled:cursor-not-allowed disabled:opacity-50',
        SIZES[size],
        VARIANTS[variant],
        variant === 'link' && 'px-0',
        fullWidth && 'w-full',
        loading && 'pointer-events-none',
        className,
      )}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden /> : leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
      {children}
      {!loading && rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
    </button>
  );
});
