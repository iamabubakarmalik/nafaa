/** Eyebrow: the small uppercase label above a section title. */
import type { ElementType, ReactNode } from 'react';
import { cx } from './cx';

export interface EyebrowProps {
  as?: ElementType;
  tone?: 'brand' | 'muted';
  className?: string;
  children: ReactNode;
}

export function Eyebrow({ as: Tag = 'p', tone = 'brand', className, children }: EyebrowProps) {
  return (
    <Tag
      className={cx(
        'text-eyebrow uppercase',
        tone === 'brand' ? 'text-link' : 'text-fg-subtle',
        className,
      )}
    >
      {children}
    </Tag>
  );
}
