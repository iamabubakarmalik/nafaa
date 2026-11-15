/**
 * Icons from the shared SVG sprite (public/menu/icons.svg, built by
 * components/layout/header/build-sprite.mjs from the same lucide shapes).
 *
 * Each icon is an <svg> with one <use> pointing into the sprite, so a page
 * carries only the icon name instead of its path data, in the HTML and in
 * the RSC payload alike. The browser fetches and caches the sprite once.
 * Stroke and colour come from the `ic` class (globals.css: no fill, a
 * currentColor stroke of 1.75, round caps and joins) and reach the symbol
 * through inheritance, so each icon carries only its size, class and name.
 * A custom stroke width goes in the inline style, which beats the class.
 *
 * `SpriteIcon` does no name checking and has no dependencies, so client
 * components can use it; `CmsIcon` (lib/icons) validates CMS names first.
 */
import { createElement, type ReactElement, type SVGProps } from 'react';
import { ICON_SPRITE } from '@/components/layout/header/assets';

export interface SpriteIconProps extends Omit<SVGProps<SVGSVGElement>, 'name' | 'children'> {
  /** A name from ALLOWED_ICONS (the sprite has one symbol per name). */
  name: string;
  size?: number;
  /** Accessible name; without it the icon is decorative (aria-hidden). */
  label?: string;
}

export function SpriteIcon({ name, size = 20, strokeWidth, label, className, style, ...rest }: SpriteIconProps): ReactElement {
  return createElement(
    'svg',
    {
      width: size,
      height: size,
      viewBox: '0 0 24 24',
      className: className ? `ic ${className}` : 'ic',
      ...(strokeWidth !== undefined ? { style: { ...style, strokeWidth } } : style ? { style } : {}),
      ...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true }),
      ...rest,
    },
    createElement('use', { href: `${ICON_SPRITE}#${name}` }),
  );
}
