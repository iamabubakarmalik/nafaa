/**
 * Section: a full-width band with the section rhythm (--section-y) and a theme.
 * The theme class switches the semantic colours (--c-*), so everything inside
 * (headings, text, cards, buttons) adapts without extra props.
 */
import type { ElementType, ReactNode } from 'react';
import { cx } from './cx';

export type SectionTheme = 'default' | 'muted' | 'ink';

const THEMES: Record<SectionTheme, string> = {
  default: 'theme-default bg-canvas text-fg',
  muted: 'theme-muted bg-canvas text-fg border-y border-line/70',
  ink: 'theme-ink bg-canvas text-fg',
};

const SPACING = {
  default: 'py-section',
  compact: 'py-12 md:py-16',
  none: '',
} as const;

export interface SectionProps {
  as?: ElementType;
  theme?: SectionTheme;
  spacing?: keyof typeof SPACING;
  id?: string;
  /** Id of the heading that names this section (landmark label). */
  labelledBy?: string;
  className?: string;
  children: ReactNode;
}

export function Section({
  as: Tag = 'section',
  theme = 'default',
  spacing = 'default',
  id,
  labelledBy,
  className,
  children,
}: SectionProps) {
  return (
    <Tag
      id={id}
      aria-labelledby={labelledBy}
      className={cx('relative isolate', THEMES[theme], SPACING[spacing], className)}
    >
      {children}
    </Tag>
  );
}
