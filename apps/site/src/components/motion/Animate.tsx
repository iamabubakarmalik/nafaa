/**
 * Animate: the root of an animated diagram or illustration (motion.css, part 2).
 * MotionObserver sets data-seen / data-inview on it. Use `loops={false}` when
 * the content only draws once, so it does not count towards the limit of three
 * running loops.
 */
import type { ElementType, ReactNode } from 'react';

interface AnimateProps {
  as?: ElementType;
  loops?: boolean;
  className?: string;
  children: ReactNode;
}

export function Animate({ as: Tag = 'div', loops = true, className, children }: AnimateProps) {
  return (
    <Tag data-animate={loops ? '' : 'once'} className={className}>
      {children}
    </Tag>
  );
}
