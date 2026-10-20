/** Prose: wrapper for rendered Markdown (styles in src/styles/prose.css). */
import type { ElementType, ReactNode } from 'react';
import { cx } from './cx';

export interface ProseProps {
  as?: ElementType;
  className?: string;
  children: ReactNode;
}

export function Prose({ as: Tag = 'div', className, children }: ProseProps) {
  return <Tag className={cx('prose', className)}>{children}</Tag>;
}
