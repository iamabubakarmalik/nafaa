/**
 * Square icon-only button. `label` is required: it becomes the accessible
 * name and the hover tooltip, so icon buttons are never unlabeled.
 */

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@core/lib/cn';

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { label: string };

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition',
        'hover:bg-slate-900/5 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 active:scale-95',
        'dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
});
