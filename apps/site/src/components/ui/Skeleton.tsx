/** Skeleton: a placeholder shape for islands while they load. Decorative. */
import { cx } from './cx';

export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden className={cx('m-shimmer block rounded-md bg-surface-3', className)} />;
}
