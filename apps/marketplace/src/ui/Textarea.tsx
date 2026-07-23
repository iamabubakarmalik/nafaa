import { TextareaHTMLAttributes, forwardRef } from 'react';
import { cn } from '@lib/cn';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className, ...props }, ref) => (
    <div>
      {label && (
        <label className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">{label}</label>
      )}
      <textarea
        ref={ref}
        className={cn(
          'w-full px-3 py-2.5 rounded-xl border bg-white dark:bg-neutral-900 text-sm text-slate-900 dark:text-white resize-y min-h-[80px]',
          'focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20',
          'disabled:bg-slate-50 dark:disabled:bg-neutral-800 disabled:text-slate-500',
          'placeholder:text-slate-400 dark:placeholder:text-slate-500',
          error ? 'border-rose-300 dark:border-rose-700' : 'border-slate-200 dark:border-neutral-700',
          className,
        )}
        {...props}
      />
      {error && <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{error}</p>}
      {hint && !error && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{hint}</p>}
    </div>
  ),
);
Textarea.displayName = 'Textarea';
