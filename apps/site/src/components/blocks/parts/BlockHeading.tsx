/**
 * The H2 (and optional intro) at the top of a block. Blocks always use H2
 * for their own title: the page H1 belongs to the hero or the template.
 */
import type { ReactNode } from 'react';
import { cx } from '@/components/ui/cx';
import { InlineMarkdown } from '../rich-text/Markdown';
import { reveal } from '../lib/reveal';

export function BlockHeading({
  id,
  title,
  intro,
  eyebrow,
  align = 'start',
  className,
  children,
  index = 2,
}: {
  /** Block position; the first two blocks do not reveal. */
  index?: number;
  id: string;
  title: ReactNode;
  intro?: string | null;
  eyebrow?: ReactNode;
  align?: 'start' | 'center';
  className?: string;
  children?: ReactNode;
}) {
  const centered = align === 'center';
  return (
    <div className={cx('max-w-measure', centered && 'mx-auto text-center', className)} {...reveal(index)}>
      {eyebrow ? <p className="mb-3 text-eyebrow uppercase text-link">{eyebrow}</p> : null}
      <h2 id={id} className="text-h2 text-fg-strong">
        {title}
      </h2>
      {intro ? (
        <p className="mt-4 text-body-lg text-fg-muted">
          <InlineMarkdown text={intro} />
        </p>
      ) : null}
      {children}
    </div>
  );
}
