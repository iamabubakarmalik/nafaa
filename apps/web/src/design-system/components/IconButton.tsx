/**
 * Square icon-only button. `label` is required: it becomes the accessible
 * name and the tooltip, so icon buttons are never unlabeled.
 */

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@core/lib/cn';

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'ghost' | 'secondary';
};

const SIZES = { sm: 'h-8 w-8', md: 'h-9 w-9', lg: 'h-10 w-10' };

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, className, size = 'md', variant = 'ghost', children, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-lg transition active:scale-95',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
        'disabled:cursor-not-allowed disabled:opacity-50',
        variant === 'ghost'
          ? 'text-slate-500 hover:bg-slate-900/5 hover:text-slate-900'
          : 'border border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50',
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
});
