/**
 * Pure SEO helpers (ARCH 5.5, 8): title patterns, description fallback,
 * 5-gram similarity, media references, required links and the score.
 */
import {
  MARKDOWN_MEDIA_REGEX,
  MEDIA_LINK_PATTERN,
  TITLE_PATTERN_PLACEHOLDER_REGEX,
  formatIssuePath,
  type CmsEntryType,
  type Issue,
} from '../contract/cms-contract';

type Rec = Record<string, unknown>;

export interface TitleFillContext {
  type: CmsEntryType;
  title: string;
  data: Rec;
  /** The parent entry (CITY for CITY_INDUSTRY), for {city} and {authority}. */
  parent?: { title: string; data: Rec } | null;
}

function scalar(v: unknown): string {
  return typeof v === 'string' || typeof v === 'number' ? String(v) : '';
}

/**
 * Fills a title pattern. `{minPrice}` and `{year}` become tokens
 * (`{{price:min.monthly}}`, `{{year}}`) so the live title follows Plan
 * changes and the calendar without a republish.
 */
export function fillTitlePattern(pattern: string, ctx: TitleFillContext): string {
  const filled = pattern.replace(new RegExp(TITLE_PATTERN_PLACEHOLDER_REGEX.source, 'g'), (_m, key: string) => {
    switch (key) {
      case 'title':
        return ctx.title.trim();
      case 'year':
        return '{{year}}';
      case 'minPrice':
        return '{{price:min.monthly}}';
      case 'city':
        if (ctx.type === 'CITY') return scalar(ctx.data.name) || ctx.title;
        return scalar(ctx.parent?.data.name) || ctx.parent?.title || '';
      case 'authority':
        return scalar(ctx.data.authority) || scalar(ctx.parent?.data.authority);
      default: {
        if (!key.startsWith('data.')) return '';
        const field = key.slice(5);
        if (field === 'count' && ctx.type === 'BEST_OF') return Array.isArray(ctx.data.items) ? String(ctx.data.items.length) : '';
        return scalar(ctx.data[field]);
      }
    }
  });
  return filled
    .replace(/\(\s*\)/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/[\s:|,\-–]+$/u, '')
    .trim();
}

/** Times the brand name appears in a title (case-insensitive). */
export function brandCount(title: string, brand: string): number {
  if (!brand) return 0;
  const re = new RegExp(brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  return (title.match(re) ?? []).length;
}

/**
 * Meta description fallback from the summary: cut to `max` characters at a
 * word boundary, never inside a `{{token}}`.
 */
export function truncateDescription(text: string, max = 155): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  let cut = clean.lastIndexOf(' ', max);
  if (cut < max * 0.6) cut = max;
  const open = clean.lastIndexOf('{{', cut);
  if (open >= 0 && clean.indexOf('}}', open) >= cut) cut = open;
  return clean.slice(0, cut).replace(/[\s,;:–-]+$/u, '').trim();
}

// ─── Similarity (CITY, CITY_INDUSTRY) ───

export function shingles(text: string, n = 5): Set<string> {
  const words = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
  const out = new Set<string>();
  for (let i = 0; i + n <= words.length; i += 1) out.add(words.slice(i, i + n).join(' '));
  return out;
}

export function jaccard(a: ReadonlySet<string>, b: ReadonlySet<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  const [small, big] = a.size <= b.size ? [a, b] : [b, a];
  for (const s of small) if (big.has(s)) inter += 1;
  return inter / (a.size + b.size - inter);
}

/** Highest Jaccard similarity of `text` against `others`, with the closest one. */
export function maxSimilarity(text: string, others: readonly { id: string; title: string; text: string }[]): { value: number; closest: { id: string; title: string } | null } {
  const mine = shingles(text);
  let best = 0;
  let closest: { id: string; title: string } | null = null;
  for (const other of others) {
    const v = jaccard(mine, shingles(other.text));
    if (v > best) {
      best = v;
      closest = { id: other.id, title: other.title };
    }
  }
  return { value: Math.round(best * 1000) / 1000, closest };
}

// ─── Media references ───

/** Keys whose string value is a media id. */
const MEDIA_ID_KEYS = new Set(['mediaId', 'logoMediaId', 'photoMediaId', 'staticMapMediaId', 'fileMediaId']);

/** Every media id in blocks/data: id fields, `media:<id>` values and Markdown images. */
export function collectMediaRefs(value: unknown, prefix: string): { id: string; field: string; key: string }[] {
  const out: { id: string; field: string; key: string }[] = [];
  const visit = (v: unknown, field: string, key: string | null): void => {
    if (typeof v === 'string') {
      if (key !== null && MEDIA_ID_KEYS.has(key) && v) {
        out.push({ id: v, field, key });
        return;
      }
      const whole = MEDIA_LINK_PATTERN.exec(v.trim());
      if (whole?.[1]) {
        out.push({ id: whole[1], field, key: key ?? '' });
        return;
      }
      if (v.includes('media:')) {
        for (const m of v.matchAll(new RegExp(MARKDOWN_MEDIA_REGEX.source, 'g'))) if (m[2]) out.push({ id: m[2], field, key: key ?? '' });
      }
    } else if (Array.isArray(v)) {
      v.forEach((item, i) => visit(item, formatIssuePath([i], field), key));
    } else if (v && typeof v === 'object') {
      for (const [k, child] of Object.entries(v as Rec)) visit(child, formatIssuePath([k], field), k);
    }
  };
  visit(value, prefix, null);
  return out;
}

// ─── Required internal links (ARCH 8, PLAN 4), shown as REQUIRED_LINK warnings ───

export const REQUIRED_LINKS: Partial<Record<CmsEntryType, readonly { type: CmsEntryType; min: number; label: string }[]>> = {
  INDUSTRY: [
    { type: 'PRODUCT', min: 4, label: 'products' },
    { type: 'INDUSTRY', min: 2, label: 'related industries' },
    { type: 'SOLUTION', min: 1, label: 'solution' },
    { type: 'COMPLIANCE', min: 1, label: 'compliance page' },
  ],
  PRODUCT: [
    { type: 'INDUSTRY', min: 6, label: 'industries' },
    { type: 'PRODUCT', min: 2, label: 'related products' },
    { type: 'GLOSSARY_TERM', min: 1, label: 'glossary term' },
  ],
  SOLUTION: [
    { type: 'PRODUCT', min: 2, label: 'products' },
    { type: 'INDUSTRY', min: 2, label: 'industries' },
  ],
  SERVICE: [{ type: 'SOLUTION', min: 1, label: 'solution' }],
  CITY: [
    { type: 'CITY', min: 3, label: 'nearby cities' },
    { type: 'INDUSTRY', min: 4, label: 'national industry pages' },
    { type: 'COMPLIANCE', min: 1, label: 'province compliance page' },
  ],
  COMPLIANCE: [{ type: 'PRODUCT', min: 1, label: 'product page' }],
  BLOG_POST: [
    { type: 'GLOSSARY_TERM', min: 2, label: 'glossary terms' },
    { type: 'BLOG_POST', min: 2, label: 'related posts' },
  ],
  GLOSSARY_TERM: [
    { type: 'GLOSSARY_TERM', min: 2, label: 'related terms' },
    { type: 'PRODUCT', min: 1, label: 'product' },
  ],
  COMPARE: [{ type: 'BEST_OF', min: 1, label: 'best-of page' }],
};

// ─── Score ───

/** 100 minus 20 per error and 5 per warning, floored at 0. */
export function scoreFromIssues(issues: readonly Issue[]): number {
  let score = 100;
  for (const i of issues) {
    if (i.severity === 'error') score -= 20;
    else if (i.severity === 'warning') score -= 5;
  }
  return Math.max(0, Math.min(100, score));
}

/** "Rs 1,500" or "PKR 1500" typed into text: prices must come from tokens. */
export const TYPED_PRICE_REGEX = /\b(?:Rs\.?|PKR)\s?\d/i;

/** True when the URL's host is the domain or a subdomain of it. */
export function hostMatches(url: string, domains: readonly string[]): boolean {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return false;
  }
  return domains.some((d) => host === d || host.endsWith(`.${d}`));
}
