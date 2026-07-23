import { InputHTMLAttributes, forwardRef } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@core/lib/cn';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  description?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, description, className, id, ...props }, ref) => {
    const inputId = id || `cb-${Math.random().toString(36).slice(2, 8)}`;
    return (
      <label htmlFor={inputId} className={cn('group flex items-start gap-3 cursor-pointer select-none', className)}>
        <div className="relative shrink-0 mt-0.5">
          <input
            ref={ref}
            id={inputId}
            type="checkbox"
            className="peer appearance-none h-5 w-5 rounded-md border-2 border-slate-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 checked:bg-brand-600 checked:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/40 disabled:opacity-50 cursor-pointer transition"
            {...props}
          />
          <Check className="absolute inset-0 m-auto h-3.5 w-3.5 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition" strokeWidth={3} />
        </div>
        {(label || description) && (
          <div className="flex-1 min-w-0">
            {label && <div className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-tight">{label}</div>}
            {description && <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</div>}
          </div>
        )}
      </label>
    );
  },
);
Checkbox.displayName = 'Checkbox';
