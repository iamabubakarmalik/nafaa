/**
 * CMS icon names → icons (ARCH 4.3).
 *
 * Prefer `CmsIcon`: it draws the icon as inline SVG from the path data F4
 * generated for the OG cards (src/lib/og/icon-nodes.ts, every ALLOWED_ICONS
 * name), so it ships no JS:
 *
 *   <CmsIcon name={item.icon} size={20} className="text-accent" />
 *
 * lucide-react 1.59 marks its base `Icon` as a client component, so any
 * lucide component rendered on a page adds lucide's runtime (about 2 KB gz).
 * `iconFor` stays for primitives that take a lucide component (ui/Icon,
 * ui/IconTile). In lucide-react 1.59 `building-2` is only an export alias
 * (canonical `building-complex`), so it is mapped by hand.
 */
import { Building2, icons, type LucideIcon } from 'lucide-react';
import { createElement, type ReactElement, type SVGProps } from 'react';
import { FALLBACK_ICON, iconExportName, isAllowedIcon, type IconName } from '@/lib/cms/contract/cms-contract';
import { ICON_NODES } from '@/lib/og/icon-nodes';

const ALIASES: Partial<Record<IconName, LucideIcon>> = {
  'building-2': Building2,
};

const lookup = icons as Record<string, LucideIcon | undefined>;

/** The lucide component for a CMS icon name, or null when the name is not allowed. */
export function iconOrNull(name: string | null | undefined): LucideIcon | null {
  if (!name || !isAllowedIcon(name)) return null;
  return ALIASES[name] ?? lookup[iconExportName(name)] ?? null;
}

/** The lucide component for a CMS icon name; unknown names render FALLBACK_ICON. */
export function iconFor(name: string | null | undefined): LucideIcon {
  return iconOrNull(name) ?? iconOrNull(FALLBACK_ICON) ?? Building2;
}

export interface CmsIconProps extends Omit<SVGProps<SVGSVGElement>, 'name' | 'children'> {
  name: string | null | undefined;
  size?: number;
  /** Accessible name; without it the icon is decorative (aria-hidden). */
  label?: string;
  /** Render nothing (instead of FALLBACK_ICON) for an unknown name. */
  optional?: boolean;
}

/** A CMS icon as inline SVG (zero JS). Server- and client-safe. */
export function CmsIcon({ name, size = 20, strokeWidth = 1.75, label, optional, ...rest }: CmsIconProps): ReactElement | null {
  const known = name && isAllowedIcon(name) ? name : null;
  if (!known && optional) return null;
  const node = ICON_NODES[known ?? FALLBACK_ICON];
  return createElement(
    'svg',
    {
      xmlns: 'http://www.w3.org/2000/svg',
      width: size,
      height: size,
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      focusable: 'false',
      ...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true }),
      ...rest,
    },
    node.map(([tag, attrs], i) => createElement(tag, { key: i, ...attrs })),
  );
}
