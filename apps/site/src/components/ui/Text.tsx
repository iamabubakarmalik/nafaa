/** Text: body copy in one of three sizes and three tones. */
import type { ElementType, ReactNode } from 'react';
import { cx } from './cx';

const SIZES = {
  lg: 'text-body-lg',
  md: 'text-body',
  sm: 'text-small',
} as const;

const TONES = {
  default: 'text-fg',
  muted: 'text-fg-muted',
  subtle: 'text-fg-subtle',
} as const;

export interface TextProps {
  as?: ElementType;
  size?: keyof typeof SIZES;
  tone?: keyof typeof TONES;
  className?: string;
  children: ReactNode;
}

export function Text({ as: Tag = 'p', size = 'md', tone = 'muted', className, children }: TextProps) {
  return <Tag className={cx(SIZES[size], TONES[tone], className)}>{children}</Tag>;
}
