/**
 * Reading section settings. Text settings may be a plain string or
 * { en, ur } (contract: translatable fields); tx() picks the language and
 * falls back to English. Image settings are URLs.
 */
import type { Block, Lang, Section } from './api';

export function tx(v: unknown, lang: Lang, fallback = ''): string {
  if (typeof v === 'string') return v;
  if (v && typeof v === 'object') {
    const o = v as Partial<Record<Lang, unknown>>;
    const pick = o[lang] ?? o.en;
    if (typeof pick === 'string' && pick) return pick;
  }
  return fallback;
}

export interface Reader {
  text: (key: string, fallback?: string) => string;
  num: (key: string, fallback: number) => number;
  bool: (key: string, fallback: boolean) => boolean;
  pick: <T extends string>(key: string, allowed: readonly T[], fallback: T) => T;
  image: (key: string) => string | null;
  raw: (key: string) => unknown;
}

export function reader(src: Section | Block | { settings: Record<string, unknown> }, lang: Lang): Reader {
  const st = src.settings ?? {};
  return {
    text: (k, f = '') => tx(st[k], lang, f),
    num: (k, f) => {
      const n = Number(st[k]);
      return st[k] === undefined || st[k] === null || st[k] === '' || !Number.isFinite(n) ? f : n;
    },
    bool: (k, f) => (typeof st[k] === 'boolean' ? (st[k] as boolean) : f),
    pick: (k, allowed, f) => (allowed.includes(st[k] as never) ? (st[k] as never) : f),
    image: (k) => {
      const v = st[k];
      if (typeof v === 'string' && v) return v;
      if (v && typeof v === 'object' && typeof (v as { url?: unknown }).url === 'string') return (v as { url: string }).url;
      return null;
    },
    raw: (k) => st[k],
  };
}

export type Scheme = 'default' | 'inverse' | 'accent' | 'muted';

/**
 * Class for a section's colorScheme setting. "default" means the theme's own
 * choice for that section (dark for announcement bar and footer), otherwise
 * the page colours.
 */
export function schemeClass(r: Reader, themeDefault: Scheme = 'default'): string {
  const v = r.pick('colorScheme', ['default', 'inverse', 'accent', 'muted'] as const, 'default');
  const eff = v === 'default' ? themeDefault : v;
  return eff === 'default' ? '' : `scheme-${eff}`;
}

export function padClass(r: Reader): string {
  const v = r.pick('padding', ['normal', 'small', 'large', 'none'] as const, 'normal');
  return v === 'normal' ? '' : `pad-${v}`;
}

/** Collection setting may hold a handle or an id (editor picker); the API lists by handle. */
export function collectionRef(v: string, all: Array<{ id: string; handle: string }>): string | null {
  if (!v || v === 'all') return null;
  return all.find((c) => c.id === v || c.handle === v)?.handle ?? v;
}

export const visibleBlocks = (s: Section) => (s.blocks ?? []).filter((b) => !b.hidden);
