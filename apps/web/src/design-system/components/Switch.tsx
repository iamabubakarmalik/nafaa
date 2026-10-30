/** On/off switch (a checkbox with role="switch") with optional label and description. */

import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@core/lib/cn';

export interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: ReactNode;
  description?: ReactNode;
  size?: 'sm' | 'md';
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(function Switch(
  { label, description, size = 'md', className, id, ...props },
  ref,
) {
  const autoId = useId();
  const controlId = id ?? autoId;
  const sm = size === 'sm';
  return (
    <label htmlFor={controlId} className={cn('flex cursor-pointer items-center justify-between gap-4', props.disabled && 'cursor-not-allowed opacity-60', className)}>
      {(label || description) && (
        <span className="min-w-0">
          {label && <span className="block text-sm font-medium text-slate-800">{label}</span>}
          {description && <span className="block text-xs text-slate-500">{description}</span>}
        </span>
      )}
      <span className="relative inline-flex shrink-0">
        <input ref={ref} id={controlId} type="checkbox" role="switch" className="peer sr-only" {...props} />
        <span className={cn(
          'rounded-full bg-slate-300 transition-colors peer-checked:bg-brand-600 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500 peer-focus-visible:ring-offset-2',
          sm ? 'h-5 w-9' : 'h-6 w-11',
        )} />
        <span className={cn(
          'pointer-events-none absolute start-0.5 top-0.5 rounded-full bg-white shadow transition-transform',
          sm ? 'h-4 w-4 peer-checked:translate-x-4 rtl:peer-checked:-translate-x-4' : 'h-5 w-5 peer-checked:translate-x-5 rtl:peer-checked:-translate-x-5',
        )} />
      </span>
    </label>
  );
});
