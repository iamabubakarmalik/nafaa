/**
 * Backdrop: a decorative layer behind section content (the parent Section is
 * `relative isolate`). `grid` and `dots` are the brand patterns; `glow` is a
 * soft brand wash for ink bands.
 */
import { cx } from './cx';

const VARIANTS = { grid: 'bg-grid', dots: 'bg-dots', glow: 'bg-glow' } as const;

export function Backdrop({ variant = 'grid', className }: { variant?: keyof typeof VARIANTS; className?: string }) {
  return <div aria-hidden className={cx('pointer-events-none absolute inset-0 -z-10', VARIANTS[variant], className)} />;
}
