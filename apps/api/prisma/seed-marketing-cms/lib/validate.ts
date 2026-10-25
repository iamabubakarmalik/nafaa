/**
 * Offline checks run before anything reaches the API.
 *
 * Errors stop `--apply`; warnings are printed. The checks mirror the publish
 * rules that can be checked without the database (contract shapes, allowed
 * blocks, tokens, colours) and add a guard against the invented numbers and
 * superlatives that were removed from the old site.
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  blockSchema,
  contrastRatioWithWhite,
  countWords,
  createFaqBodySchema,
  DRAFT_ENTRY_DATA_SCHEMAS,
  ENTRY_DATA_SCHEMAS,
  findTokens,
  isBlockAllowed,
  isMoneyType,
  MIN_CONTRAST_WITH_WHITE,
  putMenuBodySchema,
  REDIRECT_FROM_PATTERN,
  redirectImportRowSchema,
  SETTINGS_SCHEMAS,
  SLUG_PATTERN,
  type BlockType,
} from '../../../src/admin-marketing/cms/contract/cms-contract';
import type { SeedEntry, SeedFaq, SeedMenu, SeedRedirect, SeedSetting } from './types';

export interface ValidationResult {
  errors: string[];
  warnings: string[];
  /** Publish-time gaps per entry key (missing required data etc.); informational. */
  publishGaps: Map<string, string[]>;
  /** Settings the contract rejects; they are skipped (not sent) and reported. */
  blockedSettings: Set<string>;
}

export interface SeedContent {
  entries: SeedEntry[];
  faqs: SeedFaq[];
  settings: SeedSetting[];
  menus: SeedMenu[];
  redirects: SeedRedirect[];
}

/** Text that must never be seeded: invented counts, partner claims, superlatives, typed prices. */
const FORBIDDEN: { re: RegExp; why: string }[] = [
  { re: /\b\d{1,3}(?:,\d{3})+\+?\s*(?:shops|stores|businesses|users|customers|partners|retailers|outlets)\b/i, why: 'count of customers or shops' },
  { re: /\b\d+\+\s*(?:shops|stores|businesses|users|customers|partners|reports)\b/i, why: 'invented "N+" count' },
  { re: /certified\s+(?:fbr\s+)?(?:partner|integration)/i, why: '"certified partner" claim (use {{fact:compliance.fbrPra}})' },
  { re: /#1\b|\bnumber one\b|\bonly (?:pos|software|pakistani pos|bakery|pharmacy)\b|\bmost (?:trusted|complete)\b/i, why: 'unprovable superlative' },
  { re: /\b(?:Rs\.?|PKR)\s?\d/i, why: 'typed price (use {{price:...}})' },
  { re: /DRAP[- ]complian/i, why: 'DRAP compliance claim without a source' },
];

/** Repo root, from apps/api/prisma/seed-marketing-cms/lib. */
export const REPO_ROOT = join(__dirname, '..', '..', '..', '..', '..');

/** Strings inside a value, skipping keys that hold notes about the source rather than site copy. */
function collectStrings(value: unknown, out: string[], skipHidden = true): void {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => collectStrings(v, out, skipHidden));
  else if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (skipHidden && obj.hidden === true) return;
    for (const v of Object.values(obj)) collectStrings(v, out, skipHidden);
  }
}

function siteText(entry: SeedEntry): string[] {
  const out: string[] = [];
  collectStrings([entry.title, entry.summary, entry.data, entry.blocks, entry.seoTitle, entry.seoDescription], out);
  return out;
}

function checkText(where: string, texts: string[], factPaths: Set<string>, errors: string[], warnings: string[]): void {
  for (const text of texts) {
    for (const { re, why } of FORBIDDEN) {
      const m = text.match(re);
      if (m) errors.push(`${where}: ${why}: "${m[0]}"`);
    }
    for (const t of findTokens(text)) {
      if (!t.token) errors.push(`${where}: unknown token ${t.raw}`);
      else if (t.token.kind === 'fact' && !factPaths.has(t.token.path)) errors.push(`${where}: ${t.raw} has no value in seeded entity settings`);
    }
    const pct = text.match(/\b\d+(?:\.\d+)?%/g);
    if (pct) warnings.push(`${where}: percentage in copy (${pct.join(', ')}); make sure it is a plain fact, not a result claim`);
  }
}

/** Dotted paths available to {{fact:...}} from the seeded entity setting. */
function entityFactPaths(settings: SeedSetting[]): Set<string> {
  const paths = new Set<string>();
  const entity = settings.find((s) => s.key === 'entity')?.value as Record<string, unknown> | undefined;
  const walk = (obj: unknown, prefix: string): void => {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return;
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      const p = prefix ? `${prefix}.${k}` : k;
      if (typeof v === 'string') paths.add(p);
      walk(v, p);
    }
  };
  walk(entity, '');
  // compliance.<key> resolves to its `text`.
  for (const p of [...paths]) if (/^compliance\.[^.]+\.text$/.test(p)) paths.add(p.replace(/\.text$/, ''));
  return paths;
}

export function entryKey(e: { type: string; slug: string; locale?: string | undefined }): string {
  return `${e.type}:${e.slug}${e.locale && e.locale !== 'en' ? `@${e.locale}` : ''}`;
}

export function validateContent(content: SeedContent): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const publishGaps = new Map<string, string[]>();
  const blockedSettings = new Set<string>();
  const factPaths = entityFactPaths(content.settings);

  // Settings first: entries depend on industry groups and entity facts.
  for (const s of content.settings) {
    const r = SETTINGS_SCHEMAS[s.key].safeParse(s.value);
    if (!r.success) {
      // A setting the contract rejects is skipped instead of stopping the whole seed.
      blockedSettings.add(s.key);
      warnings.push(`setting ${s.key}: SKIPPED, contract rejects it: ${r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
    }
  }
  const groups = new Set(((content.settings.find((s) => s.key === 'industry-groups')?.value as { key: string }[]) ?? []).map((g) => g.key));

  const keys = new Set<string>();
  const titles = new Map<string, string>();
  const faqKeys = new Set(content.faqs.map((f) => f.key));
  const industryColors = new Map<string, string>();

  for (const e of content.entries) {
    const key = entryKey(e);
    if (keys.has(key)) errors.push(`${key}: duplicate entry`);
    keys.add(key);
  }

  for (const e of content.entries) {
    const key = entryKey(e);
    // The home page is the one PAGE with an empty slug (the API maps it to '/').
    const isHome = e.type === 'PAGE' && e.slug === '';
    // The /developers root is the one DOC with an empty slug and no parent.
    const isDocRoot = e.type === 'DOC' && e.slug === '' && !e.parent;
    if (!isHome && !isDocRoot && !SLUG_PATTERN.test(e.slug)) errors.push(`${key}: bad slug`);
    if (e.parent && !keys.has(e.parent)) errors.push(`${key}: parent ${e.parent} is not in the seed`);

    const titleKey = `${e.locale ?? 'en'}:${e.type}:${e.title.toLowerCase()}`;
    if (titles.has(titleKey)) warnings.push(`${key}: same title as ${titles.get(titleKey)}`);
    titles.set(titleKey, key);

    const data = { type: e.type, ...e.data };
    const draft = DRAFT_ENTRY_DATA_SCHEMAS[e.type].safeParse(data);
    if (!draft.success) errors.push(`${key}: data: ${draft.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
    const live = ENTRY_DATA_SCHEMAS[e.type].safeParse(data);
    if (!live.success) publishGaps.set(key, live.error.issues.map((i) => `data.${i.path.join('.')}: ${i.message}`));

    if (e.type === 'INDUSTRY') {
      const color = String(e.data.color ?? '');
      const ratio = contrastRatioWithWhite(color);
      if (ratio < MIN_CONTRAST_WITH_WHITE) errors.push(`${key}: colour ${color} is ${ratio.toFixed(2)}:1 with white (needs ${MIN_CONTRAST_WITH_WHITE})`);
      // Colours are unique per locale: a translation keeps the colour of its English page.
      const colorKey = `${e.locale ?? 'en'}:${color.toLowerCase()}`;
      const other = industryColors.get(colorKey);
      if (other) errors.push(`${key}: colour ${color} already used by ${other}`);
      industryColors.set(colorKey, key);
      if (!groups.has(String(e.data.group))) errors.push(`${key}: group "${String(e.data.group)}" is not in industry-groups`);
    }

    const ids = new Set<string>();
    for (const [i, b] of (e.blocks ?? []).entries()) {
      const where = `${key} blocks[${i}] ${b.type}`;
      if (ids.has(b.id)) errors.push(`${where}: duplicate block id`);
      ids.add(b.id);
      if (!isBlockAllowed(e.type, b.type as BlockType)) errors.push(`${where}: block not allowed on ${e.type}`);
      const r = blockSchema.safeParse(b);
      if (!r.success) errors.push(`${where}: ${r.error.issues.map((x) => `${x.path.join('.')}: ${x.message}`).join('; ')}`);
    }
    const visible = (e.blocks ?? []).filter((b) => !b.hidden);
    if (visible.length && visible[0]?.type !== 'hero' && visible.some((b) => b.type === 'hero')) errors.push(`${key}: hero must be the first block`);

    for (const k of e.faqKeys ?? []) if (!faqKeys.has(k)) errors.push(`${key}: unknown FAQ "${k}"`);
    for (const r of e.relations ?? []) if (!keys.has(r.ref)) errors.push(`${key}: relation to unknown entry ${r.ref}`);
    for (const file of e.evidence) if (!existsSync(join(REPO_ROOT, file))) errors.push(`${key}: evidence file not found: ${file}`);

    if (e.summary && isMoneyType(e.type)) {
      const words = countWords(e.summary);
      if (words < 40 || words > 60) warnings.push(`${key}: summary is ${words} words (40-60 recommended)`);
    }
    checkText(key, siteText(e), factPaths, errors, warnings);
  }

  const faqSeen = new Set<string>();
  for (const f of content.faqs) {
    const where = `faq ${f.key}`;
    if (faqSeen.has(f.key)) errors.push(`${where}: duplicate key`);
    faqSeen.add(f.key);
    const r = createFaqBodySchema.safeParse({ locale: f.locale, topic: f.topic, question: f.question, answer: f.answer, sourceNote: f.sourceNote });
    if (!r.success) errors.push(`${where}: ${r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
    const words = countWords(f.answer);
    if (words < 40 || words > 80) warnings.push(`${where}: answer is ${words} words (40-80 recommended)`);
    for (const file of f.evidence) if (!existsSync(join(REPO_ROOT, file))) errors.push(`${where}: evidence file not found: ${file}`);
    checkText(where, [f.question, f.answer], factPaths, errors, warnings);
  }
  const used = new Set(content.entries.flatMap((e) => e.faqKeys ?? []));
  for (const f of content.faqs) if (!used.has(f.key)) warnings.push(`faq ${f.key}: not attached to any entry`);

  for (const m of content.menus) {
    const r = putMenuBodySchema.safeParse({ title: m.title, items: m.items });
    if (!r.success) errors.push(`menu ${m.key}: ${r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
  }

  const froms = new Set<string>();
  for (const rd of content.redirects) {
    const where = `redirect ${rd.from}`;
    if (froms.has(rd.from)) errors.push(`${where}: duplicate`);
    froms.add(rd.from);
    if (!REDIRECT_FROM_PATTERN.test(rd.from)) errors.push(`${where}: bad from path`);
    const r = redirectImportRowSchema.safeParse({ from: rd.from, to: rd.to, status: rd.status, note: rd.note });
    if (!r.success) errors.push(`${where}: ${r.error.issues.map((i) => i.message).join('; ')}`);
  }

  return { errors, warnings, publishGaps, blockedSettings };
}
