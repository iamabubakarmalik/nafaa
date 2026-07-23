import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@lib/cn';

interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: string;
  description?: string;
  size?: 'sm' | 'md';
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ label, description, size = 'md', className, id, ...props }, ref) => {
    const inputId = id || `sw-${Math.random().toString(36).slice(2, 8)}`;
    const sm = size === 'sm';
    return (
      <label htmlFor={inputId} className={cn('flex items-center justify-between gap-4 cursor-pointer select-none', className)}>
        {(label || description) && (
          <div className="flex-1 min-w-0">
            {label && <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{label}</div>}
            {description && <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</div>}
          </div>
        )}
        <div className="relative shrink-0">
          <input ref={ref} id={inputId} type="checkbox" className="peer sr-only" {...props} />
          <div className={cn(
            'rounded-full bg-slate-300 dark:bg-neutral-700 peer-checked:bg-brand-600 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500/40',
            sm ? 'h-5 w-9' : 'h-6 w-11',
          )} />
          <div className={cn(
            'absolute top-0.5 left-0.5 bg-white rounded-full shadow-md transition-transform',
            sm ? 'h-4 w-4 peer-checked:translate-x-4' : 'h-5 w-5 peer-checked:translate-x-5',
          )} style={{ transform: props.checked ? (sm ? 'translateX(1rem)' : 'translateX(1.25rem)') : undefined }} />
        </div>
      </label>
    );
  },
);
Switch.displayName = 'Switch';
