/** Divider: a hairline rule, optionally with a centred label. */
import type { ReactNode } from 'react';
import { cx } from './cx';

export function Divider({ label, className }: { label?: ReactNode; className?: string }) {
  if (!label) return <hr className={cx('border-0 border-t border-line', className)} />;
  return (
    <div role="separator" className={cx('flex items-center gap-4 text-small text-fg-subtle', className)}>
      <span aria-hidden className="h-px flex-1 bg-line" />
      <span>{label}</span>
      <span aria-hidden className="h-px flex-1 bg-line" />
    </div>
  );
}
