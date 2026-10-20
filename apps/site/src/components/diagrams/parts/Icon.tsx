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
 * Code-drawn Nafaa mark, the same geometry as public/logo.svg (rounded
 * square, the N with an up-right arrow, the amber dot), coloured from tokens.
 */
export function NafaaMark({ x, y, size }: { x: number; y: number; size: number }) {
  return (
    <svg x={x} y={y} width={size} height={size} viewBox="0 0 80 80" aria-hidden="true" focusable="false">
      <rect x="4" y="4" width="72" height="72" rx="18" className={styles.markBox} />
      <path d="M24 26V58L56 26M47 26H56V35M56 26V58" className={styles.markStroke} strokeWidth="6.5" />
      <circle cx="62" cy="18" r="6" className={styles.markDot} />
    </svg>
  );
}
