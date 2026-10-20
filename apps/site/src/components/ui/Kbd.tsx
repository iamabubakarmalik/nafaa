/** Kbd: a keyboard key. */
import type { ReactNode } from 'react';
import { cx } from './cx';

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cx(
        'inline-flex h-6 min-w-6 items-center justify-center rounded-sm border border-line-strong bg-surface px-1.5',
        'font-mono text-xs font-medium text-fg-muted shadow-[inset_0_-1px_0_rgb(var(--c-line-strong))]',
        className,
      )}
    >
      {children}
    </kbd>
  );
}
