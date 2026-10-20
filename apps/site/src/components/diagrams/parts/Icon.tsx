/**
 * Icons inside diagram SVGs.
 *
 * Lucide icons render as nested <svg> elements positioned with x/y. Lookup is
 * by kebab-case name; an unknown name falls back to `circle` (the API rejects
 * unknown names at publish, so this is only a safety net).
 *
 * This runs only on the server, so the full icon map costs no client JS.
 * TODO(S1): switch to `@/lib/icons` once it lands, so the site has one map.
 */
import { icons, type LucideIcon } from 'lucide-react';
import { LOGO_BOWL, LOGO_DOT } from '@/lib/brand/logo';
import styles from '../diagrams.module.css';

const toPascal = (name: string): string =>
  name
    .split('-')
    .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1) : ''))
    .join('');

const iconMap = icons as unknown as Record<string, LucideIcon | undefined>;

/**
 * Names in the contract's allowed list that lucide 1.x keeps only as export
 * aliases, so they are missing from the `icons` map.
 */
const ALIASES: Readonly<Record<string, string>> = {
  'building-2': 'building-complex',
};

export function resolveIcon(name: string): LucideIcon {
  return iconMap[toPascal(ALIASES[name] ?? name)] ?? icons.Circle;
}

interface SvgIconProps {
  name: string;
  x: number;
  y: number;
  size: number;
  className?: string;
  strokeWidth?: number;
}

/** A lucide icon or the Nafaa mark, drawn at (x, y) with the given size. */
export function SvgIcon({ name, x, y, size, className, strokeWidth = 1.75 }: SvgIconProps) {
  if (name === 'nafaa') return <NafaaMark x={x} y={y} size={size} />;
  const Icon = resolveIcon(name);
  return <Icon x={x} y={y} size={size} strokeWidth={strokeWidth} className={className} aria-hidden="true" focusable="false" />;
}

/**
 * Code-drawn Nafaa app icon (brand/logo/svg/nafaa-icon.svg: the noon bowl and
 * the amber diamond on a rounded tile), coloured from tokens. The viewBox
 * keeps the tile at 90% of `size`, as before.
 */
export function NafaaMark({ x, y, size }: { x: number; y: number; size: number }) {
  return (
    <svg x={x} y={y} width={size} height={size} viewBox="-28.4 -28.4 568.8 568.8" aria-hidden="true" focusable="false">
      <rect width="512" height="512" rx="114" className={styles.markBox} />
      <path d={LOGO_BOWL} className={styles.markGlyph} />
      <path d={LOGO_DOT} className={styles.markDot} />
    </svg>
  );
}
