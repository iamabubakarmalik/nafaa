/** VisuallyHidden: text for screen readers only. */
import type { ElementType, ReactNode } from 'react';

export function VisuallyHidden({ as: Tag = 'span', children }: { as?: ElementType; children: ReactNode }) {
  return <Tag className="sr-only">{children}</Tag>;
}
