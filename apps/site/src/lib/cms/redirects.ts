/**
 * Redirect resolver (ARCH 7.5, API-CONTRACT 8.5). Every dynamic route calls
 * `redirectOrNotFound(path)` before giving up on a path:
 *
 *   const entry = await getEntry(path);
 *   if (!entry) await redirectOrNotFound(requestPath);
 *
 * Rules come from GET /public/site/redirects (tag `redirects`). Matching:
 * exact rules first, then patterns, longest pattern first. `:name` matches
 * one segment and `*` (only at the end) matches the rest; both can be reused
 * in `to`. 301 → permanentRedirect (308), 302 → redirect (307), 410 → 404.
 * The hit counter runs after the response (`after()`).
 */
import { notFound, permanentRedirect, redirect } from 'next/navigation';
import { after } from 'next/server';
import type { PublicRedirect } from './contract/cms-contract';
import { getRedirects, recordRedirectHit } from './client';

interface CompiledPattern {
  rule: PublicRedirect;
  regex: RegExp;
  names: string[];
  weight: number;
}

interface CompiledRules {
  exact: Map<string, PublicRedirect>;
  patterns: CompiledPattern[];
}

let compiledFor: string | null = null;
let compiled: CompiledRules = { exact: new Map(), patterns: [] };

function escapeRegex(value: string): string {
  return value.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
}

function compilePattern(rule: PublicRedirect): CompiledPattern {
  const names: string[] = [];
  const segments = rule.from.split('/').map((segment) => {
    if (segment === '*') {
      names.push('*');
      return '(.*)';
    }
    if (segment.startsWith(':')) {
      names.push(segment.slice(1));
      return '([^/]+)';
    }
    if (segment.endsWith('*')) {
      names.push('*');
      return `${escapeRegex(segment.slice(0, -1))}(.*)`;
    }
    return escapeRegex(segment);
  });
  return { rule, regex: new RegExp(`^${segments.join('/')}/?$`, 'i'), names, weight: rule.from.length };
}

function compile(rules: PublicRedirect[], stamp: string): CompiledRules {
  if (compiledFor === stamp) return compiled;
  const exact = new Map<string, PublicRedirect>();
  const patterns: CompiledPattern[] = [];
  for (const rule of rules) {
    if (rule.pattern) patterns.push(compilePattern(rule));
    else exact.set(normalize(rule.from), rule);
  }
  patterns.sort((a, b) => b.weight - a.weight);
  compiled = { exact, patterns };
  compiledFor = stamp;
  return compiled;
}

function normalize(path: string): string {
  const trimmed = path.length > 1 ? path.replace(/\/+$/, '') : path;
  return trimmed.toLowerCase();
}

function fillTarget(to: string, names: string[], values: string[]): string {
  let target = to;
  names.forEach((name, i) => {
    const value = values[i] ?? '';
    target = name === '*' ? target.replace('*', value) : target.replace(`:${name}`, value);
  });
  return target;
}

export interface RedirectMatch {
  rule: PublicRedirect;
  /** Null for 410. */
  target: string | null;
}

/** Finds the rule for a request path (with locale prefix, as the visitor typed it). */
export async function resolveRedirect(requestPath: string): Promise<RedirectMatch | null> {
  const { rules, updatedAt } = await getRedirects();
  if (rules.length === 0) return null;
  const { exact, patterns } = compile(rules, `${updatedAt}:${rules.length}`);
  const path = normalize(requestPath);

  const hit = exact.get(path);
  if (hit) return { rule: hit, target: hit.to };

  for (const pattern of patterns) {
    const match = pattern.regex.exec(path);
    if (!match) continue;
    const target = pattern.rule.to ? fillTarget(pattern.rule.to, pattern.names, match.slice(1)) : null;
    return { rule: pattern.rule, target };
  }
  return null;
}

/** Redirects when a rule matches, otherwise renders the 404 page. Never returns. */
export async function redirectOrNotFound(requestPath: string): Promise<never> {
  const match = await resolveRedirect(requestPath);
  if (match) {
    const id = match.rule.id;
    after(() => recordRedirectHit(id));
    if (match.rule.status !== 410 && match.target && normalize(match.target) !== normalize(requestPath)) {
      if (match.rule.status === 301) permanentRedirect(match.target);
      redirect(match.target);
    }
  }
  notFound();
}
