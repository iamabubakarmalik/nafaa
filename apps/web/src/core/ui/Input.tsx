import { forwardRef, InputHTMLAttributes, ReactNode } from 'react';
import { cn } from '@core/lib/cn';

type Size = 'sm' | 'md' | 'lg';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  size?: Size;
  required?: boolean;
}

const sizes: Record<Size, { h: string; text: string; pl: string; plIcon: string; prIcon: string }> = {
  sm: { h: 'h-9',  text: 'text-xs',  pl: 'pl-3', plIcon: 'pl-9',  prIcon: 'pr-9'  },
  md: { h: 'h-11', text: 'text-sm',  pl: 'pl-3', plIcon: 'pl-10', prIcon: 'pr-10' },
  lg: { h: 'h-12', text: 'text-base', pl: 'pl-4', plIcon: 'pl-11', prIcon: 'pr-11' },
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftIcon, rightIcon, size = 'md', required, className, id, ...props }, ref) => {
    const s = sizes[size];
    const inputId = id || `in-${Math.random().toString(36).slice(2, 8)}`;
    return (
      <div>
        {label && (
          <label htmlFor={inputId} className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">
            {label} {required && <span className="text-rose-500">*</span>}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">{leftIcon}</div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'w-full rounded-xl border bg-white dark:bg-neutral-900 text-slate-900 dark:text-white transition',
              'focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20',
              'disabled:bg-slate-50 dark:disabled:bg-neutral-800/50 disabled:text-slate-500 disabled:cursor-not-allowed',
              'placeholder:text-slate-400 dark:placeholder:text-slate-500',
              error ? 'border-rose-300 dark:border-rose-700 focus:border-rose-500 focus:ring-rose-500/20' : 'border-slate-200 dark:border-neutral-700',
              s.h, s.text,
              leftIcon ? s.plIcon : s.pl,
              rightIcon ? s.prIcon : 'pr-3',
              className,
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">{rightIcon}</div>
          )}
        </div>
        {error && <p className="text-xs text-rose-600 dark:text-rose-400 mt-1 font-semibold">{error}</p>}
        {hint && !error && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{hint}</p>}
      </div>
    );
  },
);

Input.displayName = 'Input';
