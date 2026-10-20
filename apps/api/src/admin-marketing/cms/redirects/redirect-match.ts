/**
 * Redirect matching (API-CONTRACT 8.5), pure functions only.
 *
 * - `:name` matches one path segment; `*` is allowed only at the end and
 *   matches the rest of the path (possibly empty).
 * - `toPath` may use `:name` from the pattern, and `*` for the matched rest.
 * - Exact rules win over patterns; longer patterns win over shorter ones.
 *
 * The site uses the same rules on `GET /public/site/redirects`.
 */

export interface RedirectRule {
  id: string;
  fromPath: string;
  toPath: string | null;
  statusCode: number;
  isPattern: boolean;
}

export interface RedirectMatch<R extends RedirectRule = RedirectRule> {
  rule: R;
  /** Target with `:name` and `*` filled in; null for 410. */
  target: string | null;
}

/** Trims, drops query/hash and the trailing slash (except for "/"). */
export function normalizeRedirectPath(input: string): string {
  let p = input.trim();
  if (/^https?:\/\//i.test(p)) {
    try {
      p = new URL(p).pathname;
    } catch {
      /* keep as is */
    }
  }
  p = p.split(/[?#]/)[0] ?? '';
  if (!p.startsWith('/')) p = `/${p}`;
  p = p.replace(/\/{2,}/g, '/');
  if (p.length > 1) p = p.replace(/\/+$/, '');
  return p || '/';
}

/** True when the from path uses `:name` or a trailing `*`. */
export function looksLikePattern(fromPath: string): boolean {
  return /(^|\/):[A-Za-z]/.test(fromPath) || fromPath.endsWith('*');
}

interface CompiledPattern<R extends RedirectRule> {
  rule: R;
  regex: RegExp;
  names: string[];
  hasRest: boolean;
  /** Literal length, for "longer patterns win". */
  weight: number;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function compile<R extends RedirectRule>(rule: R): CompiledPattern<R> {
  const names: string[] = [];
  let source = rule.fromPath;
  const hasRest = source.endsWith('*');
  if (hasRest) source = source.slice(0, -1);
  const parts = source.split('/').map((seg) => {
    const m = /^:([A-Za-z][A-Za-z0-9_]*)$/.exec(seg);
    if (m?.[1]) {
      names.push(m[1]);
      return '([^/]+)';
    }
    return escapeRegex(seg);
  });
  let body = parts.join('/');
  if (hasRest) body = body.endsWith('/') ? `${body.slice(0, -1)}(?:/(.*))?` : `${body}(.*)`;
  return { rule, regex: new RegExp(`^${body}/?$`), names, hasRest, weight: rule.fromPath.replace(/:[A-Za-z0-9_]+|\*/g, '').length };
}

/** A matcher over a set of active rules. */
export class RedirectMatcher<R extends RedirectRule = RedirectRule> {
  private readonly exact = new Map<string, R>();
  private readonly patterns: CompiledPattern<R>[] = [];

  constructor(rules: readonly R[]) {
    for (const rule of rules) {
      if (rule.isPattern) this.patterns.push(compile(rule));
      else this.exact.set(normalizeRedirectPath(rule.fromPath), rule);
    }
    this.patterns.sort((a, b) => b.weight - a.weight || b.rule.fromPath.length - a.rule.fromPath.length);
  }

  match(path: string): RedirectMatch<R> | null {
    const p = normalizeRedirectPath(path);
    const exact = this.exact.get(p);
    if (exact) return { rule: exact, target: exact.statusCode === 410 ? null : exact.toPath };
    for (const c of this.patterns) {
      const m = c.regex.exec(p);
      if (!m) continue;
      if (c.rule.statusCode === 410 || !c.rule.toPath) return { rule: c.rule, target: null };
      const values = new Map<string, string>();
      c.names.forEach((name, i) => values.set(name, m[i + 1] ?? ''));
      const rest = c.hasRest ? (m[c.names.length + 1] ?? '') : '';
      let target = c.rule.toPath.replace(/:([A-Za-z][A-Za-z0-9_]*)/g, (whole, name: string) => values.get(name) ?? whole);
      if (target.endsWith('*')) target = `${target.slice(0, -1)}${rest}`;
      return { rule: c.rule, target: /^https?:\/\//i.test(target) ? target : normalizeRedirectPath(target) };
    }
    return null;
  }

  /**
   * Follows redirects from `path` until no rule matches. Returns the hops
   * (excluding the start), the final path and whether a loop was found.
   */
  follow(path: string, maxHops = 10): { hops: string[]; finalPath: string | null; loop: boolean; first: RedirectMatch<R> | null } {
    const start = normalizeRedirectPath(path);
    const seen = new Set<string>([start]);
    const hops: string[] = [];
    let current = start;
    let first: RedirectMatch<R> | null = null;
    for (let i = 0; i < maxHops; i++) {
      const m = this.match(current);
      if (!m) return { hops, finalPath: current, loop: false, first };
      if (!first) first = m;
      if (m.target === null) return { hops, finalPath: null, loop: false, first };
      if (/^https?:\/\//i.test(m.target)) {
        hops.push(m.target);
        return { hops, finalPath: m.target, loop: false, first };
      }
      if (seen.has(m.target)) {
        hops.push(m.target);
        return { hops, finalPath: m.target, loop: true, first };
      }
      seen.add(m.target);
      hops.push(m.target);
      current = m.target;
    }
    return { hops, finalPath: current, loop: true, first };
  }
}

/** Parses a redirect CSV (`from,to,status,note`, header optional, quotes allowed). */
export function parseRedirectCsv(text: string): { from: string; to?: string; status?: string; note?: string }[] {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i] as string;
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += ch;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  const nonEmpty = rows.filter((r) => r.some((c) => c.trim() !== ''));
  const first = nonEmpty[0];
  const hasHeader = first !== undefined && (first[0] ?? '').trim().toLowerCase() === 'from';
  return (hasHeader ? nonEmpty.slice(1) : nonEmpty).map((r) => {
    const [from = '', to, status, note] = r.map((c) => c.trim());
    return { from, ...(to ? { to } : {}), ...(status ? { status } : {}), ...(note ? { note } : {}) };
  });
}

/** One CSV cell, quoted when needed. */
export function csvCell(value: string | number | null | undefined): string {
  const s = value === null || value === undefined ? '' : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
