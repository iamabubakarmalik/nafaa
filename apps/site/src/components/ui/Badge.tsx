/** Badge: a small status or category label, with an optional dot. */
import type { ReactNode } from 'react';
import { cx } from './cx';

export type BadgeTone = 'neutral' | 'brand' | 'info' | 'warning' | 'outline';

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-surface-3 text-fg-muted ring-line-strong/60',
  brand:
    'bg-brand-50 text-brand-800 ring-brand-600/20 ink:bg-brand-400/10 ink:text-brand-300 ink:ring-brand-400/25',
  info: 'bg-sky-50 text-sky-800 ring-sky-600/20 ink:bg-sky-400/10 ink:text-sky-300 ink:ring-sky-400/25',
  warning:
    'bg-amber-50 text-amber-800 ring-amber-600/25 ink:bg-amber-400/10 ink:text-amber-300 ink:ring-amber-400/25',
  outline: 'bg-transparent text-fg-muted ring-line-strong',
};

export interface BadgeProps {
  tone?: BadgeTone;
  dot?: boolean;
  className?: string;
  children: ReactNode;
}

export function Badge({ tone = 'neutral', dot, className, children }: BadgeProps) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium leading-5 ring-1 ring-inset',
        TONES[tone],
        className,
      )}
    >
      {dot ? <span aria-hidden className="size-1.5 rounded-full bg-current" /> : null}
      {children}
    </span>
  );
}
