/**
 * Theme document checks. A saved theme is cleaned against the section schema:
 * unknown sections are refused, unknown settings dropped, every value forced
 * into its field type, rich text sanitised, and each template keeps its main
 * section. The result is what both apps can rely on.
 */
import { sanitizeHtml } from '../lib/sanitize-html';
import {
  FIXED_SECTION, FONTS, SECTION_BY_TYPE, SectionSchema, SettingField, TEMPLATE_KEYS, TEMPLATE_LABELS, TemplateKey, allowedIn, defaultsOf,
} from './section-schema';

export type ThemeId = 'fashion' | 'electronics' | 'grocery' | 'beauty';
export const THEME_IDS: ThemeId[] = ['fashion', 'electronics', 'grocery', 'beauty'];

export interface ThemeTokens {
  colors: { primary: string; secondary: string; background: string; surface: string; text: string; muted: string; accent: string; sale: string; border: string };
  fonts: { heading: string; body: string };
  radius: 'none' | 'sm' | 'md' | 'lg' | 'full';
  spacing: 'compact' | 'normal' | 'roomy';
  buttonStyle: 'solid' | 'outline' | 'pill';
  cardStyle: 'plain' | 'bordered' | 'shadow';
}
export interface Block { id: string; type: string; hidden?: boolean; settings: Record<string, unknown> }
export interface Section { id: string; type: string; hidden?: boolean; settings: Record<string, unknown>; blocks?: Block[] }
export interface ThemeDoc {
  themeId: ThemeId;
  tokens: ThemeTokens;
  global: { announcement: Section; header: Section; footer: Section };
  templates: Record<TemplateKey, { sections: Section[] }>;
}

export class ThemeDocError extends Error {}

const MAX_SECTIONS = 40;
const MAX_BYTES = 600_000;
const HEX = /^#[0-9a-f]{6}$/i;
const ID = /^[\w-]{1,40}$/;
const VIDEO = /^https:\/\/(www\.)?(youtube\.com\/(watch\?v=|embed\/|shorts\/)|youtu\.be\/|vimeo\.com\/|player\.vimeo\.com\/video\/)[\w?=&%/-]+$/i;

const obj = (v: unknown): Record<string, any> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, any>) : {});
const pick = <T extends string>(v: unknown, list: readonly T[], fallback: T): T => (list.includes(v as T) ? (v as T) : fallback);

let seq = 0;
const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}${(seq++ % 1296).toString(36)}`;

export function cleanTokens(raw: unknown, fallback: ThemeTokens): ThemeTokens {
  const r = obj(raw);
  const c = obj(r.colors);
  const f = obj(r.fonts);
  const colors = { ...fallback.colors };
  for (const k of Object.keys(colors) as Array<keyof ThemeTokens['colors']>) if (typeof c[k] === 'string' && HEX.test(c[k])) colors[k] = c[k].toLowerCase();
  return {
    colors,
    fonts: { heading: FONTS.includes(f.heading) ? f.heading : fallback.fonts.heading, body: FONTS.includes(f.body) ? f.body : fallback.fonts.body },
    radius: pick(r.radius, ['none', 'sm', 'md', 'lg', 'full'] as const, fallback.radius),
    spacing: pick(r.spacing, ['compact', 'normal', 'roomy'] as const, fallback.spacing),
    buttonStyle: pick(r.buttonStyle, ['solid', 'outline', 'pill'] as const, fallback.buttonStyle),
    cardStyle: pick(r.cardStyle, ['plain', 'bordered', 'shadow'] as const, fallback.cardStyle),
  };
}

/** A text value: a string, or { en, ur } for translatable fields. */
function textValue(v: unknown, max: number, translatable: boolean, clean: (s: string) => string = (s) => s): unknown {
  if (translatable && v && typeof v === 'object' && !Array.isArray(v)) {
    const o = v as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const l of ['en', 'ur']) if (typeof o[l] === 'string') out[l] = clean(String(o[l]).slice(0, max));
    return out.en !== undefined || out.ur !== undefined ? out : '';
  }
  return typeof v === 'string' || typeof v === 'number' ? clean(String(v).slice(0, max)) : '';
}

function cleanValue(f: SettingField, v: unknown): unknown {
  if (v === undefined) return f.default;
  switch (f.type) {
    case 'text': return textValue(v, 500, !!f.translatable);
    case 'textarea': return textValue(v, 2000, !!f.translatable);
    case 'richtext': return textValue(v, 20_000, !!f.translatable, (s) => sanitizeHtml(s, 20_000));
    case 'image': {
      const s = typeof v === 'string' ? v.trim() : '';
      return /^https:\/\/\S{4,1000}$/i.test(s) || /^\/[^/]\S{0,500}$/.test(s) ? s : null;
    }
    case 'url': {
      const s = typeof v === 'string' ? v.trim().slice(0, 1000) : '';
      return s === '' || /^https?:\/\/\S+$/i.test(s) || /^\/\S*$/.test(s) || /^(mailto|tel):\S+$/i.test(s) || /^#\S*$/.test(s) ? s : '';
    }
    case 'video': {
      const s = typeof v === 'string' ? v.trim() : '';
      return VIDEO.test(s) ? s : '';
    }
    case 'color': return typeof v === 'string' && HEX.test(v) ? v.toLowerCase() : null;
    case 'select': return f.options?.some((o) => o.value === v) ? v : f.key === 'menu' && typeof v === 'string' && /^[a-z0-9-]{1,60}$/.test(v) ? v : f.default;
    case 'range':
    case 'number': {
      const n = Number(v);
      if (!Number.isFinite(n)) return f.default;
      const lo = f.min ?? -1e9;
      const hi = f.max ?? 1e9;
      return Math.max(lo, Math.min(hi, n));
    }
    case 'checkbox': return typeof v === 'boolean' ? v : !!f.default;
    case 'collection':
    case 'product': return typeof v === 'string' && /^[\w-]{1,64}$/.test(v) ? v : null;
    case 'products': return Array.isArray(v) ? v.filter((x) => typeof x === 'string' && /^[\w-]{1,64}$/.test(x)).slice(0, 24) : [];
    case 'date': {
      const t = typeof v === 'string' ? Date.parse(v) : NaN;
      return Number.isFinite(t) ? new Date(t).toISOString() : null;
    }
  }
}

function cleanSettings(fields: SettingField[], raw: unknown): Record<string, unknown> {
  const r = obj(raw);
  const out: Record<string, unknown> = {};
  for (const f of fields) out[f.key] = cleanValue(f, r[f.key]);
  return out;
}

function cleanSection(raw: unknown, where: string, expectType?: string): Section {
  const r = obj(raw);
  const type = String(r.type ?? expectType ?? '');
  const schema = SECTION_BY_TYPE.get(type);
  if (!schema || (expectType && type !== expectType)) throw new ThemeDocError(`${where}: section "${type || '?'}" nahi chalta`);
  const blocks: Block[] = [];
  const perType = new Map<string, number>();
  const seen = new Set<string>();
  for (const b of Array.isArray(r.blocks) ? r.blocks : []) {
    const bo = obj(b);
    const bs = schema.blocks.find((x) => x.type === bo.type);
    if (!bs) continue;
    const n = (perType.get(bs.type) ?? 0) + 1;
    if (bs.limit && n > bs.limit) continue;
    if (blocks.length >= schema.maxBlocks) throw new ThemeDocError(`${where} (${schema.label}): zyada se zyada ${schema.maxBlocks} blocks`);
    perType.set(bs.type, n);
    const id = typeof bo.id === 'string' && ID.test(bo.id) && !seen.has(bo.id) ? bo.id : newId('b');
    seen.add(id);
    blocks.push({ id, type: bs.type, ...(bo.hidden === true && { hidden: true }), settings: cleanSettings(bs.settings, bo.settings) });
  }
  return {
    id: typeof r.id === 'string' && ID.test(r.id) ? r.id : newId(type.replace(/_/g, '-').slice(0, 20)),
    type,
    ...(r.hidden === true && { hidden: true }),
    settings: cleanSettings(schema.settings, r.settings),
    ...(schema.maxBlocks > 0 && { blocks }),
  };
}

export function newSection(type: string, settings: Record<string, unknown> = {}, blocks: Array<{ type: string; settings?: Record<string, unknown> }> = []): Section {
  const schema = SECTION_BY_TYPE.get(type) as SectionSchema;
  return {
    id: newId(type.replace(/_/g, '-').slice(0, 20)),
    type,
    settings: { ...defaultsOf(schema.settings), ...settings },
    ...(schema.maxBlocks > 0 && {
      blocks: blocks.map((b) => ({ id: newId('b'), type: b.type, settings: { ...defaultsOf(schema.blocks.find((x) => x.type === b.type)?.settings ?? []), ...(b.settings ?? {}) } })),
    }),
  };
}

/** Cleans a whole theme document; throws ThemeDocError with a merchant-readable message. */
export function cleanThemeDoc(raw: unknown, fallback: ThemeDoc): ThemeDoc {
  const size = Buffer.byteLength(JSON.stringify(raw ?? null));
  if (size > MAX_BYTES) throw new ThemeDocError('Theme bohat bara ho gaya — kuch sections kam karein');
  const r = obj(raw);
  const g = obj(r.global);
  const themeId = pick(r.themeId, THEME_IDS, fallback.themeId);
  const templates = {} as ThemeDoc['templates'];
  const rt = obj(r.templates);
  for (const key of TEMPLATE_KEYS) {
    const label = TEMPLATE_LABELS[key];
    const list = Array.isArray(obj(rt[key]).sections) ? obj(rt[key]).sections : fallback.templates[key]?.sections ?? [];
    if (list.length > MAX_SECTIONS) throw new ThemeDocError(`${label}: zyada se zyada ${MAX_SECTIONS} sections`);
    const sections: Section[] = [];
    const ids = new Set<string>();
    const singles = new Set<string>();
    for (const s of list) {
      const sec = cleanSection(s, label);
      const schema = SECTION_BY_TYPE.get(sec.type)!;
      if (!allowedIn(schema, key)) throw new ThemeDocError(`${label}: "${schema.label}" yahan nahi lag sakta`);
      if (schema.singleton) {
        if (singles.has(sec.type)) throw new ThemeDocError(`${label}: "${schema.label}" sirf ek dafa`);
        singles.add(sec.type);
      }
      if (ids.has(sec.id)) sec.id = newId(sec.type.replace(/_/g, '-').slice(0, 20));
      ids.add(sec.id);
      sections.push(sec);
    }
    const fixed = FIXED_SECTION[key];
    if (fixed && !sections.some((s) => s.type === fixed)) {
      const keep = fallback.templates[key]?.sections.find((s) => s.type === fixed);
      sections.unshift(keep ?? newSection(fixed));
    }
    if (fixed) {
      const main = sections.find((s) => s.type === fixed)!;
      delete main.hidden;
    }
    templates[key] = { sections };
  }
  return {
    themeId,
    tokens: cleanTokens(r.tokens, fallback.tokens),
    global: {
      announcement: g.announcement ? cleanSection(g.announcement, 'Announcement', 'announcement_bar') : fallback.global.announcement,
      header: g.header ? cleanSection(g.header, 'Header', 'header') : fallback.global.header,
      footer: g.footer ? cleanSection(g.footer, 'Footer', 'footer') : fallback.global.footer,
    },
    templates,
  };
}

/** Product, collection and page references used anywhere in a theme (to check they exist). */
export function themeRefs(doc: ThemeDoc): { collections: string[]; products: string[] } {
  const collections = new Set<string>();
  const products = new Set<string>();
  const scan = (fields: SettingField[], settings: Record<string, unknown>) => {
    for (const f of fields) {
      const v = settings[f.key];
      if (f.type === 'collection' && typeof v === 'string') collections.add(v);
      if (f.type === 'product' && typeof v === 'string') products.add(v);
      if (f.type === 'products' && Array.isArray(v)) v.forEach((x) => products.add(String(x)));
    }
  };
  const all = [doc.global.announcement, doc.global.header, doc.global.footer, ...TEMPLATE_KEYS.flatMap((k) => doc.templates[k].sections)];
  for (const s of all) {
    const schema = SECTION_BY_TYPE.get(s.type);
    if (!schema) continue;
    scan(schema.settings, s.settings);
    for (const b of s.blocks ?? []) scan(schema.blocks.find((x) => x.type === b.type)?.settings ?? [], b.settings);
  }
  return { collections: [...collections], products: [...products] };
}

/**
 * Switching theme: start from the new preset and carry over text and image
 * settings of sections the merchant also has, matched by type and order.
 */
export function carryContent(from: ThemeDoc, preset: ThemeDoc): ThemeDoc {
  const out: ThemeDoc = JSON.parse(JSON.stringify(preset));
  const contentTypes = new Set(['text', 'textarea', 'richtext', 'image', 'url', 'collection', 'product', 'products', 'video', 'date']);
  const copy = (src: Section, dst: Section) => {
    const schema = SECTION_BY_TYPE.get(dst.type);
    if (!schema) return;
    for (const f of schema.settings) if (contentTypes.has(f.type) && src.settings[f.key] !== undefined) dst.settings[f.key] = src.settings[f.key];
    if (src.blocks?.length && schema.maxBlocks > 0) dst.blocks = JSON.parse(JSON.stringify(src.blocks));
    if (src.hidden) dst.hidden = true;
  };
  copy(from.global.announcement, out.global.announcement);
  copy(from.global.header, out.global.header);
  copy(from.global.footer, out.global.footer);
  for (const key of TEMPLATE_KEYS) {
    const used = new Set<number>();
    for (const dst of out.templates[key].sections) {
      const i = from.templates[key].sections.findIndex((s, n) => !used.has(n) && s.type === dst.type);
      if (i >= 0) {
        used.add(i);
        copy(from.templates[key].sections[i], dst);
      }
    }
  }
  return out;
}
