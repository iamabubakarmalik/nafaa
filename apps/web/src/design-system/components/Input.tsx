/** Text input with optional label, hint, error and leading/trailing icons. */

import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@core/lib/cn';
import { controlClass, Field } from './Field';

type Size = 'sm' | 'md' | 'lg';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: ReactNode;
  error?: string;
  hint?: ReactNode;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  size?: Size;
  /** Class for the outer wrapper (layout); `className` styles the input itself. */
  wrapperClassName?: string;
}

const SIZES: Record<Size, { box: string; pl: string; plIcon: string; prIcon: string }> = {
  sm: { box: 'h-9 text-[0.8125rem]', pl: 'ps-3', plIcon: 'ps-9', prIcon: 'pe-9' },
  md: { box: 'h-10 text-sm', pl: 'ps-3', plIcon: 'ps-10', prIcon: 'pe-10' },
  lg: { box: 'h-11 text-base', pl: 'ps-3.5', plIcon: 'ps-11', prIcon: 'pe-11' },
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, leftIcon, rightIcon, size = 'md', required, className, wrapperClassName, id, ...props },
  ref,
) {
  const s = SIZES[size];
  return (
    <Field label={label} hint={hint} error={error} required={required} id={id} className={wrapperClassName}>
      {(controlId, describedBy) => (
        <div className="relative">
          {leftIcon && <span className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-slate-400">{leftIcon}</span>}
          <input
            ref={ref}
            id={controlId}
            required={required}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={cn(controlClass(!!error), s.box, leftIcon ? s.plIcon : s.pl, rightIcon ? s.prIcon : 'pe-3', className)}
            {...props}
          />
          {rightIcon && <span className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400">{rightIcon}</span>}
        </div>
      )}
    </Field>
  );
});
