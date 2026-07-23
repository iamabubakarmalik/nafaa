import { SelectHTMLAttributes, forwardRef, ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@core/lib/cn';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, className, children, ...props }, ref) => (
    <div>
      {label && (
        <label className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">{label}</label>
      )}
      <div className="relative">
        <select
          ref={ref}
          className={cn(
            'w-full h-11 pl-3 pr-10 rounded-xl border bg-white dark:bg-neutral-900 text-sm text-slate-900 dark:text-white',
            'focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20',
            'disabled:bg-slate-50 dark:disabled:bg-neutral-800 disabled:text-slate-500 appearance-none',
            error ? 'border-rose-300 dark:border-rose-700' : 'border-slate-200 dark:border-neutral-700',
            className,
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
      </div>
      {error && <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{error}</p>}
      {hint && !error && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{hint}</p>}
    </div>
  ),
);
Select.displayName = 'Select';
