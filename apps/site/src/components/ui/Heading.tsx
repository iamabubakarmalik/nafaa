/**
 * Heading: the semantic level (`as`) and the visual size are separate, so the
 * H-structure stays correct whatever the design needs. The default size
 * follows the level.
 */
import type { ReactNode } from 'react';
import { cx } from './cx';

export type HeadingLevel = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
export type HeadingSize = 'display' | 'h1' | 'h2' | 'h3' | 'h4';

const SIZES: Record<HeadingSize, string> = {
  display: 'text-display',
  h1: 'text-h1',
  h2: 'text-h2',
  h3: 'text-h3',
  h4: 'text-h4',
};

const DEFAULT_SIZE: Record<HeadingLevel, HeadingSize> = {
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  h5: 'h4',
  h6: 'h4',
};

export interface HeadingProps {
  as: HeadingLevel;
  size?: HeadingSize;
  id?: string;
  className?: string;
  children: ReactNode;
}

export function Heading({ as: Tag, size, id, className, children }: HeadingProps) {
  return (
    <Tag id={id} className={cx('text-fg-strong', SIZES[size ?? DEFAULT_SIZE[Tag]], className)}>
      {children}
    </Tag>
  );
}
