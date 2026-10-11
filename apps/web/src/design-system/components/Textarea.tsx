/** Multi-line text input with optional label, hint and error. */

import { forwardRef, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { cn } from '@core/lib/cn';
import { controlClass, Field } from './Field';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: ReactNode;
  error?: string;
  hint?: ReactNode;
  wrapperClassName?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, hint, required, className, wrapperClassName, id, rows = 3, ...props },
  ref,
) {
  return (
    <Field label={label} hint={hint} error={error} required={required} id={id} className={wrapperClassName}>
      {(controlId, describedBy) => (
        <textarea
          ref={ref}
          id={controlId}
          rows={rows}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(controlClass(!!error), 'px-3 py-2 text-sm', className)}
          {...props}
        />
      )}
    </Field>
  );
});
