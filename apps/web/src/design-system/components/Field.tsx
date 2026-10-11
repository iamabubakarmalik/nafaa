/**
 * Form field wrapper: label, required mark, hint and error message, wired to
 * the control with matching ids for screen readers.
 *
 * Usage: <Field label="Phone" hint="03xx…">{(id, describedBy) => <input id={id} aria-describedby={describedBy} />}</Field>
 * Input, Textarea and Select already use it through their `label`/`hint`/`error` props.
 */

import { useId, type ReactNode } from 'react';
import { cn } from '@core/lib/cn';

interface FieldProps {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  id?: string;
  className?: string;
  children: (id: string, describedBy: string | undefined) => ReactNode;
}

export function Field({ label, hint, error, required, id, className, children }: FieldProps) {
  const autoId = useId();
  const controlId = id ?? autoId;
  const messageId = `${controlId}-msg`;
  const message = error || hint;
  return (
    <div className={className}>
      {label && (
        <label htmlFor={controlId} className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">
          {label}
          {required && <span className="ml-0.5 text-rose-500" aria-hidden>*</span>}
        </label>
      )}
      {children(controlId, message ? messageId : undefined)}
      {message && (
        <p id={messageId} className={cn('mt-1.5 text-xs', error ? 'font-medium text-rose-600' : 'text-slate-500')}>
          {message}
        </p>
      )}
    </div>
  );
}

/** Shared control styling so inputs, selects and textareas match. */
export const controlClass = (invalid?: boolean) => cn(
  'w-full rounded-lg border bg-white text-slate-900 shadow-sm transition placeholder:text-slate-400',
  'focus:outline-none focus:ring-2',
  'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500',
  invalid ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20' : 'border-slate-300 focus:border-brand-500 focus:ring-brand-500/20',
);
