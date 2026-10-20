/** Card: a bordered surface. LinkCard makes the whole card one link. */
import { ArrowRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import type { ElementType, ReactNode } from 'react';
import { cx } from './cx';
import { IconTile } from './Icon';

const PADDING = {
  none: '',
  sm: 'p-5',
  md: 'p-6 md:p-7',
  lg: 'p-8 md:p-10',
} as const;

const SURFACE = 'rounded-lg border border-line bg-surface shadow-e1 ink:shadow-none';

export interface CardProps {
  as?: ElementType;
  padding?: keyof typeof PADDING;
  className?: string;
  children: ReactNode;
}

export function Card({ as: Tag = 'div', padding = 'md', className, children }: CardProps) {
  return <Tag className={cx(SURFACE, PADDING[padding], className)}>{children}</Tag>;
}

export interface LinkCardProps {
  href: string;
  title: ReactNode;
  description?: ReactNode;
  icon?: LucideIcon;
  /** Small label above the title, for example the entry type. */
  meta?: ReactNode;
  /** Footer link text; defaults to an arrow only. */
  cta?: ReactNode;
  headingAs?: 'h2' | 'h3' | 'h4';
  className?: string;
}

export function LinkCard({ href, title, description, icon, meta, cta, headingAs: H = 'h3', className }: LinkCardProps) {
  return (
    <Link
      href={href}
      className={cx(
        SURFACE,
        'group/card flex h-full flex-col p-6',
        'transition-[transform,box-shadow,border-color,background-color] duration-base ease-out',
        'hover:-translate-y-0.5 hover:border-line-strong hover:shadow-e2 ink:hover:bg-surface-2 ink:hover:shadow-none',
        className,
      )}
    >
      {icon ? <IconTile icon={icon} className="mb-5" /> : null}
      {meta ? <span className="mb-2 text-eyebrow uppercase text-fg-subtle">{meta}</span> : null}
      <H className="text-h4 text-fg-strong">{title}</H>
      {description ? <p className="mt-2 text-small text-fg-muted">{description}</p> : null}
      <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-small font-medium text-link">
        {cta}
        <ArrowRight
          aria-hidden
          size={16}
          strokeWidth={2}
          className="transition-transform duration-fast ease-out group-hover/card:translate-x-0.5"
        />
      </span>
    </Link>
  );
}
