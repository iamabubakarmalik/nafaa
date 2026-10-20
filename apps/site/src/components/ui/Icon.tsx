/**
 * Icon: renders a lucide component at a fixed size. Decorative unless `label`
 * is given. CMS icon names are resolved to components by src/lib/icons.ts.
 * IconTile: an icon on a soft tinted square (feature grids, cards). It uses the
 * block accent (--accent) when the block sets one, else the brand.
 */
import type { LucideIcon } from 'lucide-react';
import { cx } from './cx';

const PX = { sm: 16, md: 20, lg: 24 } as const;

export interface IconProps {
  icon: LucideIcon;
  size?: keyof typeof PX;
  label?: string;
  className?: string;
}

export function Icon({ icon: Glyph, size = 'md', label, className }: IconProps) {
  return (
    <Glyph
      size={PX[size]}
      strokeWidth={1.75}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? 'img' : undefined}
      focusable="false"
      className={cx('shrink-0', className)}
    />
  );
}

export interface IconTileProps {
  icon: LucideIcon;
  size?: 'md' | 'lg';
  className?: string;
}

export function IconTile({ icon, size = 'md', className }: IconTileProps) {
  return (
    <span
      aria-hidden
      className={cx(
        'inline-flex shrink-0 items-center justify-center rounded-md bg-accent/10 text-accent ring-1 ring-inset ring-accent/15',
        'ink:bg-brand-400/10 ink:text-brand-300 ink:ring-brand-400/20',
        size === 'lg' ? 'size-12' : 'size-10',
        className,
      )}
    >
      <Icon icon={icon} size={size === 'lg' ? 'lg' : 'md'} />
    </span>
  );
}
