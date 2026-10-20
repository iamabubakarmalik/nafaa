/**
 * Entry links (API-CONTRACT 3.2) and the content walker that resolves links,
 * tokens and CTA keywords in blocks, `data`, summaries and FAQ answers.
 *
 * Links are stored as `entry:<id>` or `entry:<id>#<anchor>`:
 * - as a whole string in href fields (CTA, menu, card links);
 * - inside Markdown as `[text](entry:<id>)`.
 *
 * Everything here is pure. `CmsContentService` loads link targets and the
 * token context, then calls `resolveContent` / `inspectContent`.
 */
import {
  ENTRY_LINK_PATTERN,
  formatIssuePath,
  isCtaKeyword,
  type CmsEntryType,
  type CtaHrefKeyword,
} from '../contract/cms-contract';
import { resolveTokensInText, tokenProblems, type TokenContext, type TokenProblem } from './tokens';

/** Markdown link to an entry: [text](entry:id#anchor "title"). Group 1 text, 2 id, 3 anchor, 4 title part. */
const MD_ENTRY_LINK = /(!?)\[([^\]\n]*)\]\(\s*entry:([A-Za-z0-9_-]{1,64})(?:#([a-z0-9][a-z0-9-]{0,63}))?(\s+"[^"]*")?\s*\)/g;

/** Keys whose string value is a link field (CTA keywords are resolved only here). */
export const HREF_KEYS: ReadonlySet<string> = new Set(['href', 'ctaHref', 'url']);

/**
 * Keys never scanned for tokens or Markdown links: ids, enums and code.
 * Code samples may legitimately contain `{{ }}` (templating examples).
 */
export const SKIP_TEXT_KEYS: ReadonlySet<string> = new Set([
  'id', 'type', 'anchor', 'theme', 'code', 'language', 'toolKey', 'kind', 'layout', 'frame', 'variant', 'trackAs',
]);

export interface FoundEntryLink {
  id: string;
  anchor: string | null;
  /** Issue-style field path, e.g. `blocks[2].items[0].href`. */
  field: string;
  /** True for `[text](entry:...)` inside text, false for a whole-string href. */
  inMarkdown: boolean;
}

/** Where a resolved entry link points. `path` already carries any locale prefix. */
export interface LinkTarget {
  path: string;
}

export interface CtaTargets {
  signupUrl?: string | null;
  demoPath?: string | null;
  whatsapp?: { number: string; message: string } | null;
}

export interface ResolveContentOptions {
  /** Field path prefix for problems, e.g. "blocks" or "data". */
  fieldPrefix?: string;
  /** Token context; when absent, tokens are left untouched. */
  tokens?: TokenContext;
  /** `remove` for public output, `keep` for admin previews. Default `remove`. */
  onUnresolvedToken?: 'keep' | 'remove';
  /** Target for an entry id, or null when it cannot be linked (not live). */
  linkTarget?: (id: string) => LinkTarget | null;
  /**
   * Fallback href for a whole-string link whose target is not live. Default
   * keeps nothing better than "/" (the site's redirect table may still catch
   * the old path when the caller passes it here). Markdown links to such
   * entries are unwrapped to plain text.
   */
  brokenHref?: (id: string) => string;
  /** Resolve `signup` / `demo` / `whatsapp` in href fields. */
  cta?: CtaTargets;
}

export interface FieldTokenProblem extends TokenProblem {
  field: string;
}

export interface ResolveContentResult<T> {
  value: T;
  tokenProblems: FieldTokenProblem[];
  brokenLinks: FoundEntryLink[];
}

function childPath(parent: string, key: string | number): string {
  return formatIssuePath([key], parent);
}

/** WhatsApp deep link for the CTA keyword. */
export function whatsappUrl(number: string, message: string): string {
  const text = message.trim() ? `?text=${encodeURIComponent(message.trim())}` : '';
  return `https://wa.me/${number}${text}`;
}

/** The real href for a CTA keyword, or null when settings do not provide it. */
export function resolveCtaKeyword(keyword: CtaHrefKeyword, cta: CtaTargets): string | null {
  if (keyword === 'signup') return cta.signupUrl || null;
  if (keyword === 'demo') return cta.demoPath || null;
  return cta.whatsapp ? whatsappUrl(cta.whatsapp.number, cta.whatsapp.message) : null;
}

/** Every entry link in a value (blocks, data, a Markdown string, ...), in document order. */
export function collectEntryLinks(value: unknown, fieldPrefix = ''): FoundEntryLink[] {
  const out: FoundEntryLink[] = [];
  walkStrings(value, fieldPrefix, null, (text, field, key) => {
    const whole = ENTRY_LINK_PATTERN.exec(text.trim());
    if (whole && whole[1]) {
      out.push({ id: whole[1], anchor: whole[2] ?? null, field, inMarkdown: false });
      return;
    }
    if (key !== null && SKIP_TEXT_KEYS.has(key)) return;
    for (const m of text.matchAll(MD_ENTRY_LINK)) {
      if (m[1] === '!' || !m[3]) continue;
      out.push({ id: m[3], anchor: m[4] ?? null, field, inMarkdown: true });
    }
  });
  return out;
}

/** Unique entry ids linked from a value; the publish step stores them as MENTIONS. */
export function collectMentionIds(value: unknown): string[] {
  return [...new Set(collectEntryLinks(value).map((l) => l.id))];
}

/**
 * Entry ids referenced by id (not by link) in blocks and `data`, per the
 * contract: entryGrid filters, testimonial/logoCloud filters, CITY nearby
 * cities and CITY_INDUSTRY industry, plus any `entry:` links. The admin's
 * `refs` map and the revalidation fan-out need these.
 */
export function collectReferencedEntryIds(type: CmsEntryType, blocks: unknown, data: unknown): string[] {
  const ids = new Set<string>(collectMentionIds([blocks, data]));
  const add = (v: unknown) => {
    if (typeof v === 'string' && v.length > 0) ids.add(v);
  };
  if (Array.isArray(blocks)) {
    for (const block of blocks) {
      if (!block || typeof block !== 'object') continue;
      const b = block as { type?: unknown; filter?: Record<string, unknown> };
      if (b.type === 'entryGrid' && b.filter) {
        add(b.filter.tagId);
        add(b.filter.parentId);
      }
      if ((b.type === 'testimonial' || b.type === 'logoCloud') && b.filter) {
        add(b.filter.industryId);
        add(b.filter.cityId);
      }
    }
  }
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>;
    if (type === 'CITY' && Array.isArray(d.nearbyCityIds)) d.nearbyCityIds.forEach(add);
    if (type === 'CITY_INDUSTRY') add(d.industryId);
  }
  return [...ids];
}

/**
 * Checks a value for token problems and links without changing it. The
 * caller decides which link ids are broken (it knows what is live).
 */
export function inspectContent(
  value: unknown,
  options: { fieldPrefix?: string; tokens?: TokenContext },
): { tokenProblems: FieldTokenProblem[]; links: FoundEntryLink[] } {
  const prefix = options.fieldPrefix ?? '';
  const problems: FieldTokenProblem[] = [];
  if (options.tokens) {
    const ctx = options.tokens;
    walkStrings(value, prefix, null, (text, field, key) => {
      if (key !== null && SKIP_TEXT_KEYS.has(key)) return;
      for (const p of tokenProblems(text, ctx)) problems.push({ ...p, field });
    });
  }
  return { tokenProblems: problems, links: collectEntryLinks(value, prefix) };
}

/**
 * Returns a copy of `value` with entry links rewritten to paths, tokens
 * replaced and (optionally) CTA keywords turned into real links.
 */
export function resolveContent<T>(value: T, options: ResolveContentOptions): ResolveContentResult<T> {
  const tokenIssues: FieldTokenProblem[] = [];
  const broken: FoundEntryLink[] = [];
  const onUnresolved = options.onUnresolvedToken ?? 'remove';
  const brokenHref = options.brokenHref ?? (() => '/');

  const rewriteString = (text: string, field: string, key: string | null): string => {
    // Whole-string entry link (href fields and similar).
    const whole = ENTRY_LINK_PATTERN.exec(text.trim());
    if (whole && whole[1]) {
      const id = whole[1];
      const anchor = whole[2] ?? null;
      if (!options.linkTarget) return text;
      const target = options.linkTarget(id);
      if (!target) {
        broken.push({ id, anchor, field, inMarkdown: false });
        return brokenHref(id);
      }
      return anchor ? `${target.path}#${anchor}` : target.path;
    }

    if (key !== null && HREF_KEYS.has(key) && options.cta && isCtaKeyword(text.trim())) {
      return resolveCtaKeyword(text.trim() as CtaHrefKeyword, options.cta) ?? text;
    }

    if (key !== null && SKIP_TEXT_KEYS.has(key)) return text;

    let out = text;
    if (options.linkTarget && out.includes('entry:')) {
      const linkTarget = options.linkTarget;
      out = out.replace(MD_ENTRY_LINK, (match, bang: string, label: string, id: string, anchor?: string, title?: string) => {
        if (bang === '!') return match;
        const target = linkTarget(id);
        if (!target) {
          broken.push({ id, anchor: anchor ?? null, field, inMarkdown: true });
          return label;
        }
        const href = anchor ? `${target.path}#${anchor}` : target.path;
        return `[${label}](${href}${title ?? ''})`;
      });
    }
    if (options.tokens && out.includes('{{')) {
      const resolved = resolveTokensInText(out, options.tokens, onUnresolved);
      for (const p of resolved.problems) tokenIssues.push({ ...p, field });
      out = resolved.text;
    }
    return out;
  };

  const next = mapStrings(value, options.fieldPrefix ?? '', null, rewriteString) as T;
  return { value: next, tokenProblems: tokenIssues, brokenLinks: broken };
}

// ─── Walkers ───

type StringVisitor = (text: string, field: string, key: string | null) => void;
type StringMapper = (text: string, field: string, key: string | null) => string;

function walkStrings(value: unknown, field: string, key: string | null, visit: StringVisitor): void {
  if (typeof value === 'string') {
    visit(value, field, key);
  } else if (Array.isArray(value)) {
    value.forEach((item, i) => walkStrings(item, childPath(field, i), key, visit));
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      walkStrings(v, childPath(field, k), k, visit);
    }
  }
}

function mapStrings(value: unknown, field: string, key: string | null, map: StringMapper): unknown {
  if (typeof value === 'string') return map(value, field, key);
  if (Array.isArray(value)) return value.map((item, i) => mapStrings(item, childPath(field, i), key, map));
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = mapStrings(v, childPath(field, k), k, map);
    }
    return out;
  }
  return value;
}
