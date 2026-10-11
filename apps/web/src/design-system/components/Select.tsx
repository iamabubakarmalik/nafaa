/**
 * Native select, styled to match Input. Native keeps it fast, accessible and
 * familiar on phones (the OS picker opens).
 */

import { forwardRef, type ReactNode, type SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@core/lib/cn';
import { controlClass, Field } from './Field';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: ReactNode;
  error?: string;
  hint?: ReactNode;
  options?: SelectOption[];
  placeholder?: string;
  size?: 'sm' | 'md' | 'lg';
  wrapperClassName?: string;
}

const SIZES = { sm: 'h-9 text-[0.8125rem]', md: 'h-10 text-sm', lg: 'h-11 text-base' };

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, hint, options, placeholder, size = 'md', required, className, wrapperClassName, id, children, ...props },
  ref,
) {
  return (
    <Field label={label} hint={hint} error={error} required={required} id={id} className={wrapperClassName}>
      {(controlId, describedBy) => (
        <div className="relative">
          <select
            ref={ref}
            id={controlId}
            required={required}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={cn(controlClass(!!error), 'cursor-pointer appearance-none pl-3 pr-9', SIZES[size], className)}
            {...props}
          >
            {placeholder && <option value="">{placeholder}</option>}
            {options?.map((o) => <option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>)}
            {children}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
        </div>
      )}
    </Field>
  );
});
