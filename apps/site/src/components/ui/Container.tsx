/**
 * Container: centres content with the site gutter. `default` is 72rem of
 * content, `wide` 80rem, `prose` 68ch and `measure` 42rem.
 */
import type { ElementType, ReactNode } from 'react';
import { cx } from './cx';

const SIZES = {
  default: 'max-w-container',
  wide: 'max-w-wide',
  prose: 'max-w-prose',
  measure: 'max-w-measure',
} as const;

export interface ContainerProps {
  as?: ElementType;
  size?: keyof typeof SIZES;
  className?: string;
  children: ReactNode;
}

export function Container({ as: Tag = 'div', size = 'default', className, children }: ContainerProps) {
  return <Tag className={cx('mx-auto box-content px-gutter', SIZES[size], className)}>{children}</Tag>;
}
