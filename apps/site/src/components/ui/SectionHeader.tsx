/**
 * SectionHeader: eyebrow, title and intro for the top of a section. Pass `id`
 * and use it as the Section's `labelledBy`.
 */
import type { ReactNode } from 'react';
import { cx } from './cx';
import { Eyebrow } from './Eyebrow';
import { Heading, type HeadingLevel, type HeadingSize } from './Heading';
import { Text } from './Text';

export interface SectionHeaderProps {
  eyebrow?: ReactNode;
  title: ReactNode;
  intro?: ReactNode;
  as?: HeadingLevel;
  size?: HeadingSize;
  align?: 'start' | 'center';
  id?: string;
  className?: string;
  children?: ReactNode;
}

export function SectionHeader({
  eyebrow,
  title,
  intro,
  as = 'h2',
  size,
  align = 'start',
  id,
  className,
  children,
}: SectionHeaderProps) {
  const centered = align === 'center';
  return (
    <div className={cx('max-w-measure', centered && 'mx-auto text-center', className)}>
      {eyebrow ? <Eyebrow className="mb-3">{eyebrow}</Eyebrow> : null}
      <Heading as={as} size={size} id={id}>
        {title}
      </Heading>
      {intro ? (
        <Text size="lg" className="mt-4">
          {intro}
        </Text>
      ) : null}
      {children ? (
        <div className={cx('mt-8 flex flex-wrap gap-3', centered && 'justify-center')}>{children}</div>
      ) : null}
    </div>
  );
}
