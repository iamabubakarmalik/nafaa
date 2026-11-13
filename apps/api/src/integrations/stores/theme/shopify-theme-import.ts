/**
 * Shopify theme file import ("Shopify theme laayein").
 *
 * The merchant downloads their theme from Shopify (Online Store → Themes →
 * … → Download theme file) and uploads the zip here. Liquid code is never
 * run or copied: only the theme's settings and JSON templates are read, and
 * their design and content (colours, fonts, logo, banners, text, section
 * order) are mapped onto the closest Nafaa preset.
 *
 * Everything in this file is pure: unzip with limits, parse, map. The
 * service resolves images and writes the result as a draft.
 */
import { unzipSync } from 'fflate';
import { FONTS, SECTION_BY_TYPE, TemplateKey } from './section-schema';
import { Block, Section, ThemeDoc, ThemeId, ThemeTokens, THEME_IDS } from './theme-doc';
import { PRESETS, presetDoc } from './presets';

export class ThemeImportError extends Error {}

export const ZIP_LIMITS = {
  /** Upload size (the controller enforces the same number). */
  maxZipBytes: 50 * 1024 * 1024,
  /** Entries in the archive (Shopify themes have a few hundred). */
  maxEntries: 5000,
  /** One settings/template file once unzipped (big premium themes keep many presets in settings_data). */
  maxJsonBytes: 40 * 1024 * 1024,
  /** All text files read, once unzipped. */
  maxTotalBytes: 120 * 1024 * 1024,
  /** One image from assets/. */
  maxImageBytes: 10 * 1024 * 1024,
  /** Images read from assets/. */
  maxImages: 60,
};
export type ZipLimits = typeof ZIP_LIMITS;

/** The files of a theme that the import reads, keyed by path inside the theme root. */
export interface ThemeFiles {
  root: string;
  json: Map<string, unknown>;
  text: Map<string, string>;
  /** Files that were present but could not be read (bad JSON). */
  broken: string[];
}

const WANTED = /^(config\/settings_data\.json|config\/settings_schema\.json|templates\/[\w.-]{1,80}\.json|sections\/(header|footer)-group\.json|locales\/en\.default\.json|layout\/theme\.liquid)$/;
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg)$/i;

const isZip = (b: Uint8Array) => b.length >= 4 && b[0] === 0x50 && b[1] === 0x4b && (b[2] === 3 || b[2] === 5) && (b[3] === 4 || b[3] === 6);

/** Theme root inside the archive: '' or one wrapping folder (GitHub-style zips). */
function rootOf(name: string): { root: string; rel: string } | null {
  if (name.includes('..') || name.startsWith('/') || name.includes('\\')) return null;
  if (WANTED.test(name) || name.startsWith('assets/')) return { root: '', rel: name };
  const i = name.indexOf('/');
  if (i <= 0) return null;
  return { root: name.slice(0, i + 1), rel: name.slice(i + 1) };
}

/**
 * Unzips only the theme's settings, templates, header/footer groups, the
 * English locale and the layout file, in memory. The archive's entry count
 * and the declared sizes of the files read are capped; fflate writes each
 * file into a buffer of its declared size, so a file cannot grow past it.
 */
export function readThemeZip(buf: Uint8Array, limits: ZipLimits = ZIP_LIMITS): ThemeFiles {
  if (!buf?.length) throw new ThemeImportError('File khaali hai');
  if (buf.length > limits.maxZipBytes) throw new ThemeImportError(`File ${Math.round(limits.maxZipBytes / 1048576)} MB se bari hai`);
  if (!isZip(buf)) throw new ThemeImportError('Ye zip file nahi lagti. Shopify se aayi hui theme file (.zip) chunein.');

  let entries = 0;
  let total = 0;
  const skippedBig: string[] = [];
  let root: string | null = null;
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(buf, {
      filter: (f) => {
        entries += 1;
        if (entries > limits.maxEntries) throw new ThemeImportError('Is file me bohat zyada cheezein hain — ye Shopify theme nahi lagti');
        const r = rootOf(f.name);
        if (!r || !WANTED.test(r.rel)) return false;
        if (root === null && r.rel === 'config/settings_data.json') root = r.root;
        const cap = r.rel === 'layout/theme.liquid' ? 4 * 1024 * 1024 : limits.maxJsonBytes;
        // A file that is too big is skipped (listed in the report), not a reason to stop the import.
        if (f.originalSize > cap) { skippedBig.push(`${r.rel} (${Math.round(f.originalSize / 1048576)} MB)`); return false; }
        total += f.originalSize;
        if (total > limits.maxTotalBytes) throw new ThemeImportError('Theme file khulne par bohat bari ho jati hai');
        return f.compression === 0 || f.compression === 8;
      },
    });
  } catch (e) {
    if (e instanceof ThemeImportError) throw e;
    throw new ThemeImportError('Ye zip file khul nahi saki. Shopify se dobara download karein.');
  }

  const names = Object.keys(files);
  if (root === null) {
    const index = names.map(rootOf).find((r) => r?.rel === 'templates/index.json');
    if (!index) throw new ThemeImportError('Is file me Shopify theme nahi mila (config/settings_data.json nahi hai)');
    root = index.root;
  }
  const out: ThemeFiles = { root, json: new Map(), text: new Map(), broken: [...skippedBig] };
  const decoder = new TextDecoder('utf-8', { fatal: false });
  for (const name of names) {
    if (!name.startsWith(root)) continue;
    const rel = name.slice(root.length);
    if (!WANTED.test(rel)) continue;
    const text = decoder.decode(files[name]);
    if (rel.endsWith('.liquid')) {
      out.text.set(rel, text);
      continue;
    }
    try {
      out.json.set(rel, parseLooseJson(text));
    } catch {
      out.broken.push(rel);
    }
  }
  return out;
}

/** Reads the named images from the theme's assets/ folder (same limits as above). */
export function readZipAssets(buf: Uint8Array, root: string, names: Iterable<string>, limits: ZipLimits = ZIP_LIMITS): Map<string, Uint8Array> {
  const want = new Map<string, string>();
  for (const n of names) if (IMAGE_EXT.test(n) && !n.includes('/')) want.set(`${root}assets/${n}`.toLowerCase(), n);
  if (!want.size || !isZip(buf)) return new Map();
  let taken = 0;
  let files: Record<string, Uint8Array> = {};
  try {
    files = unzipSync(buf, {
      filter: (f) => {
        if (!want.has(f.name.toLowerCase())) return false;
        if (f.originalSize > limits.maxImageBytes || taken >= limits.maxImages) return false;
        taken += 1;
        return f.compression === 0 || f.compression === 8;
      },
    });
  } catch {
    return new Map();
  }
  const out = new Map<string, Uint8Array>();
  for (const [name, data] of Object.entries(files)) out.set(want.get(name.toLowerCase())!, data);
  return out;
}

/** JSON with the block/line comments Shopify puts on top of generated files. */
export function parseLooseJson(text: string): unknown {
  let s = text.replace(/^﻿/, '');
  let out = '';
  let inStr = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      out += c;
      if (c === '\\') { out += s[i + 1] ?? ''; i++; } else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') { inStr = true; out += c; continue; }
    if (c === '/' && s[i + 1] === '*') { const end = s.indexOf('*/', i + 2); i = end < 0 ? s.length : end + 1; continue; }
    if (c === '/' && s[i + 1] === '/') { const end = s.indexOf('\n', i + 2); i = end < 0 ? s.length : end - 1; continue; }
    out += c;
  }
  s = out;
  return JSON.parse(s);
}

// ─── helpers ─────────────────────────────────────────────────

const obj = (v: unknown): Record<string, any> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, any>) : {});
const str = (v: unknown): string => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '');
const num = (v: unknown, fallback: number): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** Plain text from Shopify rich text (for our single-line fields). */
export function plainText(html: unknown, max = 500): string {
  return str(html)
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|div|li|h\d)>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

/** shopify://collections/x and friends → storefront paths; other links as they are. */
export function shopifyLink(v: unknown): string {
  const s = str(v).trim();
  if (!s) return '';
  const m = /^shopify:\/\/(collections|products|pages|blogs|policies|search)(?:\/(.*))?$/i.exec(s);
  if (m) {
    const kind = m[1].toLowerCase();
    if (kind === 'search') return '/search';
    return m[2] ? `/${kind}/${m[2].replace(/[^\w\-/]/g, '')}` : kind === 'collections' ? '/collections' : `/${kind}`;
  }
  if (/^https?:\/\//i.test(s) || /^\/\S*$/.test(s) || /^(mailto|tel):/i.test(s)) return s;
  return '';
}

/** File name of a shopify://shop_images/<file> reference, else null. */
export function shopImageName(v: unknown): string | null {
  const m = /^shopify:\/\/shop_images\/([^/?#]{1,200})$/i.exec(str(v).trim());
  if (!m) return null;
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return m[1];
  }
}

// ─── colours ─────────────────────────────────────────────────

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
export function hex(v: unknown): string | null {
  const s = str(v).trim();
  if (!HEX.test(s)) {
    const rgb = /^rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})/i.exec(s);
    if (!rgb) return null;
    return `#${[rgb[1], rgb[2], rgb[3]].map((x) => clamp(Number(x), 0, 255).toString(16).padStart(2, '0')).join('')}`;
  }
  const h = s.slice(1).toLowerCase();
  return h.length === 3 ? `#${h.split('').map((c) => c + c).join('')}` : `#${h}`;
}
const rgbOf = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const toHex = (rgb: number[]) => `#${rgb.map((x) => clamp(Math.round(x), 0, 255).toString(16).padStart(2, '0')).join('')}`;
/** `a` mixed into `b` by weight w (0..1 of a). */
export const mix = (a: string, b: string, w: number) => {
  const x = rgbOf(a);
  const y = rgbOf(b);
  return toHex(x.map((v, i) => v * w + y[i] * (1 - w)));
};
export function luminance(h: string): number {
  const [r, g, b] = rgbOf(h).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function hsl(h: string): { h: number; s: number; l: number } {
  const [r, g, b] = rgbOf(h).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let hue = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  hue *= 60;
  return { h: hue, s, l };
}
/** Colourfulness 0..1 (HSL saturation overstates very light and very dark colours). */
const chroma = (c: string) => {
  const x = rgbOf(c);
  return (Math.max(...x) - Math.min(...x)) / 255;
};
const distance = (a: string, b: string) => {
  const x = rgbOf(a);
  const y = rgbOf(b);
  return Math.sqrt(x.reduce((n, v, i) => n + (v - y[i]) ** 2, 0));
};

interface Scheme { id: string; background: string; text: string; button: string | null }

/** Colour schemes of the theme (Dawn 10+), or one scheme built from older/other colour settings. */
function readSchemes(s: Record<string, any>): Scheme[] {
  const out: Scheme[] = [];
  const cs = obj(s.color_schemes);
  for (const [id, v] of Object.entries(cs)) {
    const st = obj(obj(v).settings);
    const background = hex(st.background);
    const text = hex(st.text) ?? hex(st.foreground);
    if (background && text) out.push({ id, background, text, button: hex(st.button) });
  }
  if (out.length) return out;
  // Dawn before color schemes.
  const bg1 = hex(s.colors_background_1);
  const text1 = hex(s.colors_text);
  if (bg1 && text1) {
    out.push({ id: 'background-1', background: bg1, text: text1, button: hex(s.colors_accent_1) ?? hex(s.colors_solid_button_labels) });
    const bg2 = hex(s.colors_background_2);
    if (bg2) out.push({ id: 'background-2', background: bg2, text: text1, button: hex(s.colors_accent_1) });
    const a1 = hex(s.colors_accent_1);
    if (a1) out.push({ id: 'accent-1', background: a1, text: hex(s.colors_solid_button_labels) ?? '#ffffff', button: null });
    const a2 = hex(s.colors_accent_2);
    if (a2) out.push({ id: 'accent-2', background: a2, text: hex(s.colors_solid_button_labels) ?? '#ffffff', button: null });
    return out;
  }
  // Other theme families: guess from setting names.
  const find = (re: RegExp, not?: RegExp) => {
    for (const [k, v] of Object.entries(s)) if (re.test(k) && !(not && not.test(k)) && hex(v)) return hex(v);
    return null;
  };
  const background = find(/(^|_)(body_)?(background|bg)(_color)?$|color_body_bg|background_color/i, /button|header|footer|drawer|badge/i);
  const text = find(/(^|_)(body_)?text(_color)?$|color_body_text|text_color/i, /button|header|footer|badge|sale/i);
  if (background && text) out.push({ id: 'main', background, text, button: find(/button(_bg|_background|_color)?$|color_primary|accent/i, /text|label|border/i) });
  return out;
}

export interface ColourResult { tokens: ThemeTokens['colors']; imported: Array<{ token: string; value: string }>; schemeMap: Map<string, string> }

/** Maps the theme's colours onto our tokens; section colour schemes onto default/inverse/accent/muted. */
export function mapColours(s: Record<string, any>, base: ThemeTokens['colors']): ColourResult {
  const schemes = readSchemes(s);
  const tokens = { ...base };
  const imported: ColourResult['imported'] = [];
  const schemeMap = new Map<string, string>();
  if (!schemes.length) return { tokens, imported, schemeMap };
  const main = schemes[0];
  const set = (k: keyof ThemeTokens['colors'], v: string | null) => {
    if (!v) return;
    tokens[k] = v;
    imported.push({ token: k, value: v });
  };
  set('background', main.background);
  set('text', main.text);
  const primary = main.button && distance(main.button, main.background) > 40 ? main.button : main.text;
  set('primary', primary);
  const light = schemes.filter((x) => x !== main && luminance(x.background) > 0.6 && distance(x.background, main.background) > 6);
  const surface = light[0]?.background ?? mix(main.text, main.background, 0.04);
  set('surface', surface);
  set('secondary', light[0]?.background ?? mix(primary, main.background, 0.15));
  // Accent: the most colourful scheme colour, else the primary.
  const candidates = schemes.flatMap((x) => [x.background, x.button].filter(Boolean) as string[]);
  const vivid = candidates.map((c) => ({ c, s: chroma(c) })).sort((a, b) => b.s - a.s)[0];
  set('accent', vivid && vivid.s > 0.2 ? vivid.c : primary);
  set('muted', mix(main.text, main.background, 0.6));
  set('border', mix(main.text, main.background, 0.12));
  const sale = hex(s.color_sale) ?? hex(s.colors_sale) ?? hex(s.sale_color);
  if (sale) set('sale', sale);

  for (const x of schemes) {
    let mapped = 'default';
    if (x === main || distance(x.background, main.background) < 8) mapped = 'default';
    else if (luminance(x.background) < 0.25 && distance(x.background, tokens.accent) > 60) mapped = 'inverse';
    else if (distance(x.background, tokens.accent) < 60 || chroma(x.background) > 0.3) mapped = 'accent';
    else mapped = luminance(x.background) < 0.25 ? 'inverse' : 'muted';
    schemeMap.set(x.id, mapped);
  }
  return { tokens, imported, schemeMap };
}

// ─── fonts ───────────────────────────────────────────────────

const NEAR_FONT: Array<[RegExp, string]> = [
  [/sans[-_]?serif|^system|helvetica|arial/, 'Inter'],
  [/playfair|bodoni|didot|prata|abril|dm_serif|fraunces|gloock|ogg|tenor/, 'Playfair Display'],
  [/cormorant|garamond|cardo|crimson|old_standard|caslon|cormorant|bellefair/, 'Cormorant Garamond'],
  [/baskerville/, 'Libre Baskerville'],
  [/marcellus|cinzel|trajan/, 'Marcellus'],
  [/lora|georgia|times|merriweather|pt_serif|source_serif|noto_serif|tinos|domine|vollkorn|alegreya|libre_caslon|newsreader|literata|spectral|serif/, 'Lora'],
  [/bebas|anton|league_gothic|fjalla|archivo_black|alfa/, 'Bebas Neue'],
  [/oswald|barlow_condensed|roboto_condensed|saira_condensed|teko/, 'Oswald'],
  [/futura|century_gothic|avenir|josefin|questrial|kumbh|spartan|league_spartan|tenor_sans/, 'Jost'],
  [/proxima|mulish|muli|nunito|quicksand|varela|comfortaa/, 'Nunito'],
  [/poppins|gilroy|lexend/, 'Poppins'],
  [/montserrat|gotham|raleway/, 'Montserrat'],
  [/assistant|source_sans|pt_sans|open_sans|noto_sans|hind|fira_sans|ubuntu|arimo|cabin/, 'Open Sans'],
  [/space_grotesk|chivo|sora|syne|red_hat|plus_jakarta/, 'Manrope'],
  [/dm_sans|instrument_sans|figtree|outfit|urbanist/, 'DM Sans'],
  [/work_sans|barlow|archivo|karla|rubik|libre_franklin|public_sans/, 'Work Sans'],
  [/lato|roboto|helvetica|arial|neue_haas|harmonia|inter|system|sans|mono|courier/, 'Inter'],
];

/** "assistant_n4" → readable family name. */
export function shopifyFontFamily(handle: unknown): string {
  const h = str(handle).trim().toLowerCase().replace(/_[ni]\d$/, '');
  return h.split(/[_-]+/).filter(Boolean).map((w) => (w.length <= 2 ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1))).join(' ');
}

/** Nearest font from our list for a Shopify font handle (exact name first). */
export function mapFont(handle: unknown, fallback: string): { from: string; to: string; exact: boolean } | null {
  const h = str(handle).trim().toLowerCase();
  if (!h) return null;
  const family = shopifyFontFamily(h);
  const key = h.replace(/_[ni]\d$/, '');
  const exact = FONTS.find((f) => f.toLowerCase() === family.toLowerCase());
  if (exact) return { from: family, to: exact, exact: true };
  for (const [re, font] of NEAR_FONT) if (re.test(key) && FONTS.includes(font)) return { from: family, to: font, exact: false };
  return { from: family, to: fallback, exact: false };
}

// ─── section mapping ─────────────────────────────────────────

export type SkipCode =
  | 'unknown_section' | 'app_section' | 'custom_code' | 'image_missing' | 'collection_missing' | 'product_ref'
  | 'cart_type' | 'menu_links' | 'file_broken' | 'too_many' | 'block_unknown' | 'template_other' | 'video_host';

export interface Skip { code: SkipCode; what: string; why: string }

const WHY: Record<SkipCode, string> = {
  unknown_section: 'Nafaa me is tarah ka hissa nahi hai',
  app_section: 'Ye Shopify app ka hissa hai, app Nafaa par nahi chalti',
  custom_code: 'Is me apna code likha tha, code Nafaa par nahi chalta',
  image_missing: 'Tasveer nahi mili — wahan khaali jagah hai, khud laga dein',
  collection_missing: 'Ye collection Nafaa par nahi mili — khaali chhor di (sab products dikhenge)',
  product_ref: 'Ek product chuna hua tha — Nafaa me khud chun lein',
  cart_type: 'Nafaa me cart hamesha side drawer + cart page dono hai',
  menu_links: 'Menu ke links theme file me nahi hote — "Shopify se aayein" se menu laayein',
  file_broken: 'Ye file parhi nahi ja saki',
  too_many: 'Had se zyada — baqi chhor diye',
  block_unknown: 'Is hisse ka ye andar wala hissa Nafaa me nahi hai',
  template_other: 'Ye page Nafaa me apne design se banta hai',
  video_host: 'Sirf YouTube ya Vimeo video chalti hai',
};
const skip = (code: SkipCode, what: string): Skip => ({ code, what, why: WHY[code] });

interface ShopifySection { type: string; settings: Record<string, any>; blocks: Array<{ type: string; settings: Record<string, any>; disabled: boolean }>; disabled: boolean }

/** Ordered sections of a Shopify JSON template or section group. */
export function orderedSections(tpl: unknown): ShopifySection[] {
  const t = obj(tpl);
  const sections = obj(t.sections);
  const order: string[] = Array.isArray(t.order) ? t.order.filter((x: unknown) => typeof x === 'string') : Object.keys(sections);
  const out: ShopifySection[] = [];
  for (const id of order) {
    const s = obj(sections[id]);
    if (!s.type) continue;
    const blocks = obj(s.blocks);
    const bOrder: string[] = Array.isArray(s.block_order) ? s.block_order.filter((x: unknown) => typeof x === 'string') : Object.keys(blocks);
    out.push({
      type: String(s.type),
      settings: obj(s.settings),
      disabled: s.disabled === true,
      blocks: bOrder.map((b) => obj(blocks[b])).filter((b) => b.type).map((b) => ({ type: String(b.type), settings: obj(b.settings), disabled: b.disabled === true })),
    });
  }
  return out;
}

interface MapCtx {
  schemeMap: Map<string, string>;
  skipped: Skip[];
  images: Set<string>;
  collections: Set<string>;
  where: string;
}

const IMG = (v: unknown, ctx: MapCtx): string | null => {
  const n = shopImageName(v);
  if (n) {
    ctx.images.add(n);
    return `shopify://shop_images/${n}`;
  }
  const s = str(v);
  return /^https:\/\//i.test(s) ? s : null;
};
const scheme = (v: unknown, ctx: MapCtx) => ctx.schemeMap.get(str(v)) ?? 'default';
const padding = (s: Record<string, any>) => {
  const p = num(s.padding_top, 36) + num(s.padding_bottom, 36);
  return p <= 16 ? 'none' : p <= 48 ? 'small' : p >= 120 ? 'large' : 'normal';
};
const alignOf = (v: unknown) => {
  const s = str(v).toLowerCase();
  return s.includes('left') ? 'left' : s.includes('right') ? 'right' : 'center';
};
const collectionRef = (v: unknown, ctx: MapCtx): string | null => {
  const h = str(v).trim().toLowerCase();
  if (!h || h === 'all') return null;
  ctx.collections.add(h);
  return h;
};
const firstBlock = (s: ShopifySection, ...types: string[]) => s.blocks.find((b) => !b.disabled && types.includes(b.type));

function buttonsOf(s: ShopifySection): { buttonLabel: string; buttonLink: string } | null {
  const b = firstBlock(s, 'buttons', 'button');
  const src = b?.settings ?? s.settings;
  const label = str(src.button_label_1 ?? src.button_label ?? src.button_text);
  const link = shopifyLink(src.button_link_1 ?? src.button_link ?? src.link);
  return label ? { buttonLabel: plainText(label, 80), buttonLink: link } : null;
}

/** Converts one Shopify section to ours, or records why not. */
function mapSection(s: ShopifySection, ctx: MapCtx): Section | null {
  const st = s.settings;
  const type = s.type;
  const raw = (t: string, settings: Record<string, unknown>, blocks: Array<{ type: string; settings: Record<string, unknown> }> = []): Section => {
    const schema = SECTION_BY_TYPE.get(t)!;
    if (blocks.length > schema.maxBlocks) {
      ctx.skipped.push(skip('too_many', `${ctx.where}: ${schema.label} (${blocks.length} → ${schema.maxBlocks})`));
      blocks = blocks.slice(0, schema.maxBlocks);
    }
    return {
      id: `imp-${t.replace(/_/g, '-').slice(0, 20)}-${Math.random().toString(36).slice(2, 8)}`,
      type: t,
      ...(s.disabled && { hidden: true }),
      settings,
      ...(schema.maxBlocks > 0 && { blocks: blocks.map((b, i) => ({ id: `imp-b${i}-${Math.random().toString(36).slice(2, 7)}`, type: b.type, settings: b.settings }) as Block) }),
    };
  };
  const colours = { colorScheme: scheme(st.color_scheme, ctx), padding: padding(st) };

  if (type.startsWith('@app') || type === 'apps') { ctx.skipped.push(skip('app_section', `${ctx.where}: ${type}`)); return null; }
  if (type === 'custom-liquid' || type.includes('liquid')) { ctx.skipped.push(skip('custom_code', `${ctx.where}: ${type}`)); return null; }

  switch (type) {
    case 'image-banner':
    case 'banner':
    case 'hero': {
      const heading = firstBlock(s, 'heading');
      const text = firstBlock(s, 'text');
      const image = IMG(st.image, ctx) ?? IMG(st.image_2, ctx);
      return raw('hero', {
        image,
        heading: plainText(heading?.settings.heading ?? st.heading, 200),
        subheading: plainText(text?.settings.text ?? st.text ?? st.subheading, 400),
        ...(buttonsOf(s) ?? { buttonLabel: '', buttonLink: '' }),
        align: alignOf(st.desktop_content_alignment ?? st.text_alignment),
        height: ({ small: 'small', medium: 'medium', large: 'large', adapt: 'medium', adapt_image: 'medium', full: 'full', full_screen: 'full' } as Record<string, string>)[str(st.image_height ?? st.height)] ?? 'medium',
        overlay: clamp(Math.round(num(st.image_overlay_opacity ?? st.overlay_opacity, 20) / 5) * 5, 0, 80),
        colorScheme: scheme(st.color_scheme, ctx),
      });
    }
    case 'slideshow': {
      const slides = s.blocks.filter((b) => b.type === 'slide' || b.type === 'image_slide').map((b) => ({
        type: 'slide',
        settings: {
          image: IMG(b.settings.image, ctx),
          heading: plainText(b.settings.heading, 200),
          subheading: plainText(b.settings.subheading ?? b.settings.text, 400),
          buttonLabel: plainText(b.settings.button_label ?? b.settings.button_label_1, 80),
          buttonLink: shopifyLink(b.settings.link ?? b.settings.button_link ?? b.settings.button_link_1),
          align: alignOf(b.settings.text_alignment ?? b.settings.box_align),
          overlay: clamp(Math.round(num(b.settings.image_overlay_opacity, 20) / 5) * 5, 0, 80),
        },
      }));
      return raw('slideshow', {
        autoplay: st.auto_rotate !== false,
        speed: clamp(Math.round(num(st.change_slides_speed, 5)), 3, 10),
        height: ({ small: 'small', medium: 'medium', large: 'large', adapt_image: 'medium' } as Record<string, string>)[str(st.slide_height)] ?? 'medium',
        width: str(st.layout) === 'grid' ? 'page' : 'full',
      }, slides);
    }
    case 'featured-collection':
    case 'featured-collections':
    case 'product-grid':
      return raw('featured_collection', {
        heading: plainText(st.title ?? st.heading, 200),
        subheading: st.show_description === false ? '' : plainText(st.description, 400),
        collection: collectionRef(st.collection, ctx),
        limit: clamp(Math.round(num(st.products_to_show, 8)), 2, 24),
        columns: clamp(Math.round(num(st.columns_desktop, 4)), 2, 6),
        mobileColumns: clamp(Math.round(num(st.columns_mobile, 2)), 1, 2),
        showViewAll: st.show_view_all !== false,
        quickAdd: !!st.quick_add && st.quick_add !== 'none' ? true : st.enable_quick_add === true,
        ...colours,
      });
    case 'collection-list':
    case 'featured-collections-list': {
      const blocks = s.blocks.filter((b) => b.type === 'featured_collection' || b.type === 'collection').map((b) => ({
        type: 'collection',
        settings: { collection: collectionRef(b.settings.collection, ctx), image: IMG(b.settings.image, ctx), title: plainText(b.settings.title, 120) },
      }));
      return raw('collection_list', {
        heading: plainText(st.title ?? st.heading, 200),
        columns: clamp(Math.round(num(st.columns_desktop, 4)), 2, 6),
        shape: ({ portrait: 'portrait', square: 'square', circle: 'circle' } as Record<string, string>)[str(st.image_ratio ?? st.image_shape)] ?? 'square',
        ...colours,
      }, blocks);
    }
    case 'rich-text':
    case 'text': {
      const heading = firstBlock(s, 'heading');
      const text = firstBlock(s, 'text', 'caption');
      return raw('rich_text', {
        heading: plainText(heading?.settings.heading ?? st.heading, 200),
        text: str(text?.settings.text ?? st.text) || '<p></p>',
        ...(buttonsOf(s) ?? { buttonLabel: '', buttonLink: '' }),
        align: alignOf(st.content_alignment ?? st.desktop_content_position),
        ...colours,
      });
    }
    case 'image-with-text': {
      const heading = firstBlock(s, 'heading');
      const text = firstBlock(s, 'text');
      const btn = firstBlock(s, 'button');
      return raw('image_with_text', {
        image: IMG(st.image, ctx),
        imagePosition: str(st.layout) === 'text_first' ? 'right' : 'left',
        heading: plainText(heading?.settings.heading ?? st.heading, 200),
        text: str(text?.settings.text ?? st.text) || '',
        buttonLabel: plainText(btn?.settings.button_label ?? '', 80),
        buttonLink: shopifyLink(btn?.settings.button_link),
        ...colours,
      });
    }
    case 'multicolumn':
    case 'icons-with-text':
    case 'text-columns-with-images': {
      const blocks = s.blocks.filter((b) => !b.disabled).map((b) => {
        const title = plainText(b.settings.title ?? b.settings.heading, 120);
        const image = IMG(b.settings.image, ctx);
        const words = `${title} ${plainText(b.settings.text, 200)}`.toLowerCase();
        const icon = image ? 'custom'
          : /cash|cod|pay/.test(words) ? 'cod' : /ship|deliver|truck/.test(words) ? 'truck' : /return|exchange|refund/.test(words) ? 'return'
            : /secure|safe|protect|warrant/.test(words) ? 'shield' : /support|help|contact|chat/.test(words) ? 'support' : 'star';
        return { type: 'badge', settings: { icon, image, title, text: plainText(b.settings.text, 200) } };
      });
      return raw('trust_badges', { ...colours }, blocks);
    }
    case 'newsletter':
    case 'email-signup-banner': {
      const heading = firstBlock(s, 'heading');
      const para = firstBlock(s, 'paragraph', 'text');
      return raw('newsletter', {
        heading: plainText(heading?.settings.heading ?? st.heading, 200),
        subheading: plainText(para?.settings.text ?? st.text, 400),
        collect: 'email',
        ...colours,
      });
    }
    case 'video': {
      const url = str(obj(st.video_url).url ?? st.video_url ?? st.video).trim();
      if (url && !/youtu\.?be|vimeo\.com/i.test(url)) ctx.skipped.push(skip('video_host', `${ctx.where}: ${url.slice(0, 80)}`));
      return raw('video', {
        heading: plainText(st.heading, 200),
        videoUrl: /youtu\.?be|vimeo\.com/i.test(url) ? url : '',
        cover: IMG(st.cover_image, ctx),
        width: st.full_width ? 'full' : 'page',
        ...colours,
      });
    }
    case 'collapsible-content':
    case 'faq': {
      const blocks = s.blocks.filter((b) => !b.disabled && (b.type === 'collapsible_row' || b.type === 'question')).map((b) => ({
        type: 'question',
        settings: { question: plainText(b.settings.heading ?? b.settings.title ?? b.settings.question, 300), answer: str(b.settings.row_content ?? b.settings.text ?? b.settings.answer) },
      }));
      return raw('faq', { heading: plainText(st.heading ?? st.title, 200) || 'Questions', ...colours }, blocks);
    }
    case 'testimonials':
    case 'quotes': {
      const blocks = s.blocks.filter((b) => !b.disabled).map((b) => ({
        type: 'testimonial',
        settings: { quote: plainText(b.settings.quote ?? b.settings.text ?? b.settings.testimonial, 600), author: plainText(b.settings.author ?? b.settings.name, 120), rating: 5, image: IMG(b.settings.image, ctx) },
      }));
      return raw('testimonials', { heading: plainText(st.title ?? st.heading, 200), fromNafaa: true, ...colours }, blocks);
    }
    case 'logo-list':
    case 'logos': {
      const blocks = s.blocks.filter((b) => !b.disabled).map((b) => ({ type: 'logo', settings: { image: IMG(b.settings.image, ctx), name: plainText(b.settings.title ?? b.settings.name, 80), link: shopifyLink(b.settings.link) } }));
      return raw('brand_logos', { heading: plainText(st.title ?? st.heading, 200), ...colours }, blocks);
    }
    case 'collage':
    case 'gallery': {
      const blocks = s.blocks.filter((b) => !b.disabled).map((b) => ({ type: 'image', settings: { image: IMG(b.settings.image ?? b.settings.image_picker, ctx), link: '' } }))
        .filter((b) => b.settings.image);
      if (!blocks.length) { ctx.skipped.push(skip('unknown_section', `${ctx.where}: ${type}`)); return null; }
      return raw('gallery', { heading: plainText(st.heading, 200), ...colours }, blocks);
    }
    case 'related-products':
    case 'product-recommendations':
      return raw('product_recommendations', { heading: plainText(st.heading, 200) || 'You may also like', limit: clamp(Math.round(num(st.products_to_show, 4)), 2, 12), ...colours });
    case 'featured-product':
      ctx.skipped.push(skip('product_ref', `${ctx.where}: ${type}`));
      return raw('product_carousel', { heading: plainText(st.heading ?? st.title, 200), source: 'newest', limit: 4, ...colours });
    default:
      ctx.skipped.push(skip('unknown_section', `${ctx.where}: ${type}`));
      return null;
  }
}

/** Shopify product page blocks → our main_product blocks (order kept). */
const PRODUCT_BLOCKS: Record<string, string> = {
  title: 'title', price: 'price', variant_picker: 'variant_picker', quantity_selector: 'quantity', buy_buttons: 'buy_buttons',
  description: 'description', share: 'share', inventory: 'stock_message', collapsible_tab: 'tabs', popup: 'size_chart', text: 'custom_text',
};
const NAFAA_EXTRAS = ['whatsapp_order', 'delivery_eta', 'trust_icons'];

function mapMainProduct(s: ShopifySection, base: Section, ctx: MapCtx): Section {
  const seen = new Set<string>();
  const blocks: Block[] = [];
  for (const b of s.blocks) {
    if (b.type.startsWith('@app')) { ctx.skipped.push(skip('app_section', `${ctx.where}: ${b.type}`)); continue; }
    const to = PRODUCT_BLOCKS[b.type];
    if (!to) { ctx.skipped.push(skip('block_unknown', `${ctx.where}: ${b.type}`)); continue; }
    if (to !== 'custom_text' && seen.has(to)) continue;
    seen.add(to);
    const settings: Record<string, unknown> = to === 'custom_text' ? { text: `<p>${plainText(b.settings.text, 2000)}</p>` } : {};
    blocks.push({ id: `imp-b${blocks.length}`, type: to, ...(b.disabled && { hidden: true }), settings });
    if (to === 'buy_buttons') for (const extra of NAFAA_EXTRAS) { seen.add(extra); blocks.push({ id: `imp-b${blocks.length}`, type: extra, settings: {} }); }
  }
  if (!seen.has('badges')) blocks.unshift({ id: 'imp-badges', type: 'badges', settings: {} });
  for (const need of ['title', 'price', 'buy_buttons', ...NAFAA_EXTRAS]) {
    if (!seen.has(need)) { const keep = base.blocks?.find((b) => b.type === need); if (keep) blocks.push(keep); }
  }
  const st = s.settings;
  return {
    ...base,
    settings: {
      ...base.settings,
      galleryLayout: ({ stacked: 'grid', columns: 'grid', thumbnail: 'thumbnails', thumbnail_slider: 'slider' } as Record<string, string>)[str(st.gallery_layout)] ?? base.settings.galleryLayout,
      zoom: str(st.image_zoom) !== 'none',
      variantStyle: str(obj(s.blocks.find((b) => b.type === 'variant_picker')?.settings).picker_type) === 'dropdown' ? 'dropdown' : 'buttons',
    },
    blocks: blocks.slice(0, 20),
  };
}

// ─── whole theme ─────────────────────────────────────────────

export interface ImportedSection { template: string; from: string; to: string }

export interface MappedTheme {
  /** Raw doc: image settings still hold shopify://shop_images/... until the service resolves them. */
  doc: ThemeDoc;
  themeName: string;
  themeVersion: string | null;
  basePreset: ThemeId;
  sections: ImportedSection[];
  colours: Array<{ token: string; value: string }>;
  fonts: Array<{ from: string; to: string; exact: boolean; role: 'heading' | 'body' }>;
  /** Image file names referenced (shopify://shop_images/<name>). */
  images: string[];
  /** Collection handles referenced. */
  collections: string[];
  skipped: Skip[];
  /** Store settings the theme carried (applied only when the merchant publishes). */
  settings: { logo: string | null; favicon: string | null; logoWidth: number | null; social: Record<string, string> };
}

/** Theme name and version from settings_schema.json theme_info, else the layout file. */
export function themeInfo(files: ThemeFiles): { name: string; version: string | null } {
  const schema = files.json.get('config/settings_schema.json');
  if (Array.isArray(schema)) {
    const info = obj(schema.find((x) => obj(x).name === 'theme_info'));
    if (info.theme_name) return { name: plainText(info.theme_name, 60), version: str(info.theme_version).slice(0, 20) || null };
  }
  const layout = files.text.get('layout/theme.liquid') ?? '';
  const m = /theme[_ -]?name["':\s=]+["']?([A-Za-z][\w .-]{1,40})/i.exec(layout) ?? /<!--\s*([A-Z][\w-]{1,30})\s+(?:theme\s+)?v?(\d[\d.]*)/.exec(layout);
  return { name: m ? m[1].trim() : 'Shopify theme', version: m?.[2] ?? null };
}

/** The current settings block of settings_data.json (an object, or a preset name). */
export function currentSettings(files: ThemeFiles): Record<string, any> {
  const data = obj(files.json.get('config/settings_data.json'));
  const cur = data.current;
  if (typeof cur === 'string') return obj(obj(data.presets)[cur]);
  if (cur && typeof cur === 'object') return obj(cur);
  const presets = obj(data.presets);
  return obj(presets[Object.keys(presets)[0]]);
}

const THEME_HINTS: Array<[RegExp, ThemeId]> = [
  [/sense|glow|beauty|cosmetic|skin|blush|bloom/i, 'beauty'],
  [/crave|taste|fresh|grocer|food|bakery|organic|market/i, 'grocery'],
  [/ride|trade|tech|volt|gadget|electro|mobile|warehouse|expanse/i, 'electronics'],
  [/dawn|craft|studio|refresh|origin|colorblock|spotlight|publisher|prestige|impulse|motion|fashion|wear/i, 'fashion'],
];

/** Picks the closest of our presets from the theme name, fonts, colours and button shape. */
export function closestPreset(input: { name: string; headingFont: string; primary: string | null; buttonRadius: number; current?: string | null }): ThemeId {
  const score: Record<ThemeId, number> = { fashion: 0, electronics: 0, grocery: 0, beauty: 0 };
  for (const [re, id] of THEME_HINTS) if (re.test(input.name)) score[id] += id === 'fashion' ? 1 : 3;
  if (/Playfair|Cormorant|Lora|Baskerville|Marcellus/.test(input.headingFont)) { score.fashion += 2; score.beauty += 2; }
  if (input.primary) {
    const { h, s } = hsl(input.primary);
    if (s < 0.15) score.fashion += 2;
    else if (h >= 290 || h < 12) score.beauty += 3;
    else if (h >= 80 && h < 170) score.grocery += 3;
    else if (h >= 185 && h < 260) score.electronics += 3;
    else if (h >= 20 && h < 60) score.grocery += 1;
  }
  if (input.buttonRadius >= 30) { score.beauty += 1; score.grocery += 1; }
  if (input.current && THEME_IDS.includes(input.current as ThemeId)) score[input.current as ThemeId] += 0.5;
  return (Object.keys(score) as ThemeId[]).sort((a, b) => score[b] - score[a])[0];
}

const SOCIAL: Array<[string, string]> = [
  ['social_facebook_link', 'facebook'], ['social_instagram_link', 'instagram'], ['social_tiktok_link', 'tiktok'],
  ['social_youtube_link', 'youtube'], ['social_twitter_link', 'x'],
];

/** Maps a whole Shopify theme onto a Nafaa theme document (raw; the service cleans it). */
export function mapShopifyTheme(files: ThemeFiles, opts: { currentThemeId?: string | null } = {}): MappedTheme {
  const info = themeInfo(files);
  const s = currentSettings(files);
  const skipped: Skip[] = files.broken.map((f) => skip('file_broken', f));

  const headingFontRaw = s.type_header_font ?? s.type_heading_font ?? s.heading_font ?? s.font_heading;
  const bodyFontRaw = s.type_body_font ?? s.body_font ?? s.font_body;
  const radius = num(s.buttons_radius ?? s.button_radius ?? s.button_border_radius, 0);
  const schemesPreview = readSchemes(s);
  const primaryGuess = schemesPreview[0]?.button ?? schemesPreview[0]?.text ?? null;
  const headingGuess = mapFont(headingFontRaw, 'Inter')?.to ?? '';
  const basePreset = closestPreset({ name: info.name, headingFont: headingGuess, primary: primaryGuess, buttonRadius: radius, current: opts.currentThemeId });
  const base = presetDoc(basePreset);
  const baseTokens = PRESETS.find((p) => p.id === basePreset)!.tokens;

  // Tokens
  const colour = mapColours(s, baseTokens.colors);
  const fonts: MappedTheme['fonts'] = [];
  const hf = mapFont(headingFontRaw, baseTokens.fonts.heading);
  const bf = mapFont(bodyFontRaw, baseTokens.fonts.body);
  if (hf) fonts.push({ ...hf, role: 'heading' });
  if (bf) fonts.push({ ...bf, role: 'body' });
  const cardShadow = num(s.card_shadow_opacity, 0) > 0;
  const cardBorder = num(s.card_border_thickness, 0) > 0 && num(s.card_border_opacity, 0) > 0;
  const spacing = num(s.spacing_sections, 0);
  base.tokens = {
    colors: colour.tokens,
    fonts: { heading: hf?.to ?? baseTokens.fonts.heading, body: bf?.to ?? baseTokens.fonts.body },
    radius: radius <= 0 ? 'none' : radius <= 4 ? 'sm' : radius <= 10 ? 'md' : radius < 30 ? 'lg' : 'full',
    spacing: spacing <= 0 ? baseTokens.spacing : spacing < 24 ? 'compact' : spacing < 52 ? 'normal' : 'roomy',
    buttonStyle: radius >= 30 ? 'pill' : 'solid',
    cardStyle: cardShadow ? 'shadow' : cardBorder || str(s.card_style) === 'card' ? 'bordered' : 'plain',
  };

  const ctx: MapCtx = { schemeMap: colour.schemeMap, skipped, images: new Set(), collections: new Set(), where: '' };
  const sections: ImportedSection[] = [];
  const mapList = (template: TemplateKey, label: string, list: ShopifySection[], allowMain: (s: ShopifySection) => Section | null | undefined) => {
    const out: Section[] = [];
    ctx.where = label;
    for (const sec of list) {
      const main = allowMain(sec);
      if (main !== undefined) { if (main) out.push(main); continue; }
      const mapped = mapSection(sec, ctx);
      if (!mapped) continue;
      const schema = SECTION_BY_TYPE.get(mapped.type)!;
      const allowed = schema.templates === 'all' || schema.templates.includes(template);
      if (!allowed) { ctx.skipped.push(skip('unknown_section', `${label}: ${sec.type}`)); continue; }
      if (out.length >= 38) { ctx.skipped.push(skip('too_many', `${label}: ${sec.type}`)); continue; }
      out.push(mapped);
      sections.push({ template, from: sec.type, to: mapped.type });
    }
    return out;
  };

  // Home page
  const index = files.json.get('templates/index.json');
  if (index) {
    const home = mapList('home', 'Home', orderedSections(index), () => undefined);
    if (home.length) base.templates.home.sections = home;
  }

  // Product page: main section + whatever follows it.
  const product = files.json.get('templates/product.json');
  if (product) {
    const mainBase = base.templates.product.sections.find((x) => x.type === 'main_product')!;
    const extras = base.templates.product.sections.filter((x) => x.type === 'bought_together' || x.type === 'product_reviews');
    const list = mapList('product', 'Product', orderedSections(product), (sec) => {
      if (sec.type === 'main-product' || sec.type === 'product-template' || sec.type === 'main-product-template') {
        sections.push({ template: 'product', from: sec.type, to: 'main_product' });
        return mapMainProduct(sec, mainBase, ctx);
      }
      return undefined;
    });
    if (!list.some((x) => x.type === 'main_product')) list.unshift(mainBase);
    const at = list.findIndex((x) => x.type === 'main_product');
    list.splice(at + 1, 0, ...extras);
    base.templates.product.sections = list;
  }

  // Collection page: banner + grid → our product list section.
  const collection = files.json.get('templates/collection.json');
  if (collection) {
    const mainBase = base.templates.collection.sections.find((x) => x.type === 'main_collection')!;
    let banner = false;
    let grid: ShopifySection | null = null;
    const list = mapList('collection', 'Collection', orderedSections(collection), (sec) => {
      if (sec.type === 'main-collection-banner') { banner = true; return null; }
      if (sec.type === 'main-collection-product-grid' || sec.type === 'main-collection') { grid = sec; return null; }
      return undefined;
    });
    const g = (grid as ShopifySection | null)?.settings ?? {};
    const main: Section = {
      ...mainBase,
      settings: {
        ...mainBase.settings,
        ...((grid as ShopifySection | null) ? {
          perPage: clamp(Math.round(num(g.products_per_page, 24) / 4) * 4, 8, 48),
          columns: clamp(Math.round(num(g.columns_desktop, 4)), 2, 5),
          mobileColumns: clamp(Math.round(num(g.columns_mobile, 2)), 1, 2),
          filters: g.enable_filtering !== false,
          sort: g.enable_sorting !== false,
          quickAdd: !!g.quick_add && g.quick_add !== 'none',
        } : {}),
        showBanner: banner,
      },
    };
    if (grid || banner) sections.push({ template: 'collection', from: 'main-collection', to: 'main_collection' });
    base.templates.collection.sections = [main, ...list];
  }

  for (const name of files.json.keys()) {
    const m = /^templates\/([\w.-]+)\.json$/.exec(name);
    if (m && !['index', 'product', 'collection'].includes(m[1])) skipped.push(skip('template_other', `${m[1]}`));
  }

  // Header group: announcement bar + header.
  const headerGroup = files.json.get('sections/header-group.json');
  const headerSections = headerGroup ? orderedSections(headerGroup) : [];
  // Older themes keep the announcement/header in settings_data sections.
  const legacy = obj(s.sections);
  const legacyOf = (t: string): ShopifySection | null => {
    const v = obj(Object.values(legacy).find((x) => obj(x).type === t));
    return v.type ? orderedSections({ sections: { a: v }, order: ['a'] })[0] : null;
  };
  const ann = headerSections.find((x) => x.type === 'announcement-bar') ?? legacyOf('announcement-bar');
  if (ann) {
    const msgs = ann.blocks.filter((b) => b.type === 'announcement' && !b.disabled).map((b) => ({ type: 'message', settings: { text: plainText(b.settings.text, 300), link: shopifyLink(b.settings.link) } }))
      .filter((b) => b.settings.text);
    if (msgs.length) {
      base.global.announcement = {
        ...base.global.announcement,
        hidden: ann.disabled || undefined,
        settings: { ...base.global.announcement.settings, colorScheme: scheme(ann.settings.color_scheme, ctx), autoplay: ann.settings.auto_rotate !== false, speed: clamp(Math.round(num(ann.settings.change_slides_speed, 5)), 3, 10) },
        blocks: msgs.slice(0, 5).map((b, i) => ({ id: `imp-msg${i}`, type: b.type, settings: b.settings })),
      };
      sections.push({ template: 'global', from: 'announcement-bar', to: 'announcement_bar' });
    }
  } else if (headerGroup) {
    base.global.announcement = { ...base.global.announcement, hidden: true };
  }
  const header = headerSections.find((x) => x.type === 'header') ?? legacyOf('header');
  if (header) {
    const hs = header.settings;
    const pos = str(hs.logo_position);
    base.global.header = {
      ...base.global.header,
      settings: {
        ...base.global.header.settings,
        layout: /center/.test(pos) ? 'logo_center' : pos === 'top-left' ? 'logo_left_menu_left' : 'logo_left',
        ...(/^[a-z0-9-]{1,60}$/.test(str(hs.menu)) && { menu: str(hs.menu) }),
        sticky: !['none', ''].includes(str(hs.sticky_header_type ?? (hs.enable_sticky_header === false ? 'none' : 'on-scroll-up'))),
        colorScheme: scheme(hs.color_scheme, ctx),
      },
    };
    sections.push({ template: 'global', from: 'header', to: 'header' });
    skipped.push(skip('menu_links', `Header: ${str(hs.menu) || 'main-menu'}`));
  }
  for (const other of headerSections) if (!['announcement-bar', 'header'].includes(other.type)) skipped.push(skip(other.type.startsWith('@app') ? 'app_section' : 'unknown_section', `Header: ${other.type}`));

  // Footer group.
  const footerGroup = files.json.get('sections/footer-group.json');
  const footer = (footerGroup ? orderedSections(footerGroup).find((x) => x.type === 'footer') : null) ?? legacyOf('footer');
  if (footer) {
    const fs = footer.settings;
    const blocks: Block[] = [];
    for (const b of footer.blocks) {
      if (b.disabled) continue;
      if (b.type === 'link_list' || b.type === 'menu') blocks.push({ id: `imp-f${blocks.length}`, type: 'menu', settings: { heading: plainText(b.settings.heading, 80), menu: /^[a-z0-9-]{1,60}$/.test(str(b.settings.menu)) ? str(b.settings.menu) : 'footer' } });
      else if (b.type === 'text' || b.type === 'brand_information') blocks.push({ id: `imp-f${blocks.length}`, type: 'text', settings: { heading: plainText(b.settings.heading ?? s.brand_headline, 80), text: str(b.settings.subtext ?? b.settings.text ?? s.brand_description) || '<p></p>' } });
      else skipped.push(skip('block_unknown', `Footer: ${b.type}`));
    }
    if (fs.newsletter_enable) blocks.push({ id: `imp-f${blocks.length}`, type: 'newsletter', settings: { heading: plainText(fs.newsletter_heading, 80) || 'Get offers first' } });
    if (!blocks.some((b) => b.type === 'contact')) blocks.push({ id: `imp-f${blocks.length}`, type: 'contact', settings: { heading: 'Contact' } });
    base.global.footer = {
      ...base.global.footer,
      settings: {
        ...base.global.footer.settings,
        showPayments: fs.payment_enable !== false,
        showSocial: fs.show_social !== false,
        showPolicies: fs.show_policy !== false,
        colorScheme: scheme(fs.color_scheme, ctx),
      },
      blocks: blocks.slice(0, 6),
    };
    sections.push({ template: 'global', from: 'footer', to: 'footer' });
  }

  if (s.cart_type && str(s.cart_type) !== 'drawer') skipped.push(skip('cart_type', `Cart: ${str(s.cart_type)}`));

  // Store settings carried by the theme.
  const social: Record<string, string> = {};
  for (const [k, to] of SOCIAL) {
    const v = str(s[k]).trim();
    if (/^https:\/\/\S+$/i.test(v)) social[to] = v.slice(0, 300);
  }
  const logo = IMG(s.logo ?? obj(header?.settings).logo, ctx);
  const favicon = IMG(s.favicon, ctx);
  const lw = num(s.logo_width ?? obj(header?.settings).logo_width, NaN);

  return {
    doc: base,
    themeName: info.name,
    themeVersion: info.version,
    basePreset,
    sections,
    colours: colour.imported,
    fonts,
    images: [...ctx.images],
    collections: [...ctx.collections],
    skipped,
    settings: { logo, favicon, logoWidth: Number.isFinite(lw) ? clamp(Math.round(lw), 60, 300) : null, social },
  };
}

/**
 * Replaces image references in the raw doc with the uploaded URLs (or null
 * when the image was not found) and empties collection handles the store
 * does not have.
 */
export function resolveRefs(doc: ThemeDoc, images: Map<string, string>, knownCollections: Set<string>): ThemeDoc {
  const walk = (v: unknown): unknown => {
    if (typeof v === 'string') {
      const n = shopImageName(v);
      return n ? images.get(n) ?? null : v;
    }
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, k === 'collection' && typeof x === 'string' && !knownCollections.has(x) ? null : walk(x)]));
    return v;
  };
  return walk(doc) as ThemeDoc;
}
