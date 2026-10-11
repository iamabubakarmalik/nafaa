/** Checkbox with label and optional description. */

import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@core/lib/cn';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: ReactNode;
  description?: ReactNode;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, description, className, id, ...props },
  ref,
) {
  const autoId = useId();
  const controlId = id ?? autoId;
  return (
    <label htmlFor={controlId} className={cn('flex cursor-pointer items-start gap-2.5', props.disabled && 'cursor-not-allowed opacity-60', className)}>
      <input
        ref={ref}
        id={controlId}
        type="checkbox"
        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 text-brand-600 accent-brand-600 focus:ring-2 focus:ring-brand-500/30"
        {...props}
      />
      {(label || description) && (
        <span className="min-w-0">
          {label && <span className="block text-sm font-medium text-slate-800">{label}</span>}
          {description && <span className="block text-xs text-slate-500">{description}</span>}
        </span>
      )}
    </label>
  );
});
