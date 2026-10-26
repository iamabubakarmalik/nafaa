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
 *
 * Each icon is drawn as one <path>: the lucide shapes (path, circle, rect,
 * line, polyline, polygon, ellipse) are joined into a single path string
 * (dots stay circles, see JoinedIcon).
 * The icons are stroke-only with no per-shape attributes, so they look the
 * same, and a page with a few hundred icons (the mega menu alone has over a
 * hundred) has far fewer DOM nodes to parse and hydrate.
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

const NUM = String.raw`[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?`;
const LEADING_RELATIVE_MOVE = new RegExp(String.raw`^\s*m\s*(${NUM})\s*,?\s*(${NUM})\s*,?\s*`);

/**
 * A path's data made safe to follow another subpath. A leading relative
 * moveto is absolute only at the very start of a path, so it is rewritten as
 * an absolute one; coordinate pairs that follow it stay relative linetos.
 */
function absoluteStart(d: string): string {
  const m = LEADING_RELATIVE_MOVE.exec(d);
  if (!m) return d;
  const rest = d.slice(m[0].length);
  return `M${m[1]} ${m[2]}${/^[-+.\d]/.test(rest) ? `l${rest}` : rest}`;
}

const num = (attrs: Readonly<Record<string, string>>, key: string): number => Number(attrs[key] ?? 0);

/** Path data for one lucide shape. */
function shapeToPath(tag: string, a: Readonly<Record<string, string>>): string {
  switch (tag) {
    case 'path':
      return absoluteStart(a.d ?? '');
    case 'circle':
    case 'ellipse': {
      const cx = num(a, 'cx');
      const cy = num(a, 'cy');
      const rx = tag === 'circle' ? num(a, 'r') : num(a, 'rx');
      const ry = tag === 'circle' ? rx : num(a, 'ry');
      return `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0z`;
    }
    case 'line':
      return `M${num(a, 'x1')} ${num(a, 'y1')}L${num(a, 'x2')} ${num(a, 'y2')}`;
    case 'polyline':
      return `M${a.points ?? ''}`;
    case 'polygon':
      return `M${a.points ?? ''}z`;
    case 'rect': {
      const x = num(a, 'x');
      const y = num(a, 'y');
      const w = num(a, 'width');
      const h = num(a, 'height');
      const rx = Math.min(w / 2, a.rx !== undefined ? num(a, 'rx') : num(a, 'ry'));
      const ry = Math.min(h / 2, a.ry !== undefined ? num(a, 'ry') : rx);
      if (!rx || !ry) return `M${x} ${y}h${w}v${h}h${-w}z`;
      const iw = w - 2 * rx;
      const ih = h - 2 * ry;
      return `M${x + rx} ${y}h${iw}a${rx} ${ry} 0 0 1 ${rx} ${ry}v${ih}a${rx} ${ry} 0 0 1 ${-rx} ${ry}h${-iw}a${rx} ${ry} 0 0 1 ${-rx} ${-ry}v${-ih}a${rx} ${ry} 0 0 1 ${rx} ${-ry}z`;
    }
    default:
      return '';
  }
}

interface JoinedIcon {
  d: string;
  /** Dots (circles smaller than the stroke): kept as circles, because a stroked tiny arc renders as a ring. */
  dots: Readonly<Record<string, string>>[];
}

const joined = new Map<IconName, JoinedIcon>();

/** An icon's shapes as one path string plus its dots (computed once per icon). */
function iconPath(name: IconName): JoinedIcon {
  let icon = joined.get(name);
  if (!icon) {
    const parts: string[] = [];
    const dots: Readonly<Record<string, string>>[] = [];
    for (const [tag, attrs] of ICON_NODES[name]) {
      if (tag === 'circle' && num(attrs, 'r') < 1) dots.push(attrs);
      else parts.push(shapeToPath(tag, attrs));
    }
    icon = { d: parts.join(''), dots };
    joined.set(name, icon);
  }
  return icon;
}

/** A CMS icon as inline SVG (zero JS). Server- and client-safe. */
export function CmsIcon({ name, size = 20, strokeWidth = 1.75, label, optional, ...rest }: CmsIconProps): ReactElement | null {
  const known = name && isAllowedIcon(name) ? name : null;
  if (!known && optional) return null;
  const { d, dots } = iconPath(known ?? FALLBACK_ICON);
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
    createElement('path', { d }),
    ...dots.map((attrs, i) => createElement('circle', { key: i, ...attrs })),
  );
}
