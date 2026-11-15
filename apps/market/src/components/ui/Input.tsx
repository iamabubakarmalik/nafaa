/** Text input and textarea with label, hint and error on the shared tokens. */
import { forwardRef, type ComponentProps, type ReactNode } from 'react';
import { cn } from './cn';

const FIELD = 'block w-full rounded-xl bg-white px-3.5 text-sm text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-60';

interface FieldProps {
  label?: ReactNode;
  error?: string | null;
  hint?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, FieldProps & ComponentProps<'input'>>(function Input({ label, error, hint, className, id, ...rest }, ref) {
  const fid = id ?? (typeof label === 'string' ? `f-${label.replace(/\W+/g, '-').toLowerCase()}` : undefined);
  return (
    <div className={className}>
      {label && <label htmlFor={fid} className="mb-1.5 block text-xs font-semibold text-gray-700">{label}</label>}
      <input ref={ref} id={fid} {...rest} aria-invalid={!!error} className={cn(FIELD, 'h-11', error && 'ring-red-400')} />
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : hint ? <p className="mt-1 text-xs text-gray-500">{hint}</p> : null}
    </div>
  );
});

export function Textarea({ label, error, className, id, ...rest }: FieldProps & ComponentProps<'textarea'>) {
  const fid = id ?? (typeof label === 'string' ? `t-${label.replace(/\W+/g, '-').toLowerCase()}` : undefined);
  return (
    <div className={className}>
      {label && <label htmlFor={fid} className="mb-1.5 block text-xs font-semibold text-gray-700">{label}</label>}
      <textarea id={fid} rows={3} {...rest} className={cn(FIELD, 'py-2.5', error && 'ring-red-400')} />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
