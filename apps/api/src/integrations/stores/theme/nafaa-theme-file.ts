/**
 * Nafaa theme file (`<store>.nafaa-theme.json`): a store's theme document
 * plus the look-related store settings, for backup or to move a design to
 * another store. Reading a file checks it against the section schema; a
 * file never carries products, orders or contact details.
 */
import { cleanThemeDoc, ThemeDoc, ThemeDocError, ThemeId, THEME_IDS } from './theme-doc';
import { presetDoc } from './presets';

export const NAFAA_THEME_FORMAT = 'nafaa-theme';
export const NAFAA_THEME_MAX_BYTES = 2 * 1024 * 1024;

export interface NafaaThemeFile {
  format: typeof NAFAA_THEME_FORMAT;
  version: 1;
  exportedAt: string;
  storeName: string;
  themeId: ThemeId;
  doc: ThemeDoc;
  settings: { logoUrl: string | null; faviconUrl: string | null; logoWidth: number; social: Record<string, string> };
}

export class NafaaThemeFileError extends Error {}

export function buildNafaaThemeFile(input: { storeName: string; doc: ThemeDoc; settings: { logoUrl: string | null; faviconUrl: string | null; logoWidth: number; social: Record<string, string | undefined> } }): NafaaThemeFile {
  const social: Record<string, string> = {};
  for (const [k, v] of Object.entries(input.settings.social ?? {})) if (typeof v === 'string' && v) social[k] = v;
  return {
    format: NAFAA_THEME_FORMAT,
    version: 1,
    exportedAt: new Date().toISOString(),
    storeName: input.storeName,
    themeId: input.doc.themeId,
    doc: input.doc,
    settings: { logoUrl: input.settings.logoUrl, faviconUrl: input.settings.faviconUrl, logoWidth: input.settings.logoWidth, social },
  };
}

const obj = (v: unknown): Record<string, any> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, any>) : {});
const https = (v: unknown): string | null => (typeof v === 'string' && /^https:\/\/\S{4,1000}$/i.test(v.trim()) ? v.trim() : null);

/** Parses and validates an uploaded Nafaa theme file. Throws NafaaThemeFileError with a merchant-readable message. */
export function readNafaaThemeFile(buf: Uint8Array | string): { doc: ThemeDoc; storeName: string; exportedAt: string | null; settings: { logoUrl: string | null; faviconUrl: string | null; logoWidth: number | null; social: Record<string, string> } } {
  const size = typeof buf === 'string' ? Buffer.byteLength(buf) : buf.length;
  if (!size) throw new NafaaThemeFileError('File khaali hai');
  if (size > NAFAA_THEME_MAX_BYTES) throw new NafaaThemeFileError('Theme file 2 MB se bari hai');
  let raw: unknown;
  try {
    raw = JSON.parse(typeof buf === 'string' ? buf : new TextDecoder().decode(buf));
  } catch {
    throw new NafaaThemeFileError('Ye Nafaa theme file nahi lagti');
  }
  const r = obj(raw);
  if (r.format !== NAFAA_THEME_FORMAT || !r.doc) throw new NafaaThemeFileError('Ye Nafaa theme file nahi lagti');
  if (Number(r.version) > 1) throw new NafaaThemeFileError('Ye theme file Nafaa ke naye version ki hai');
  const themeId = (THEME_IDS.includes(obj(r.doc).themeId) ? obj(r.doc).themeId : 'fashion') as ThemeId;
  let doc: ThemeDoc;
  try {
    doc = cleanThemeDoc(r.doc, presetDoc(themeId));
  } catch (e) {
    if (e instanceof ThemeDocError) throw new NafaaThemeFileError(e.message);
    throw e;
  }
  const s = obj(r.settings);
  const social: Record<string, string> = {};
  for (const k of ['facebook', 'instagram', 'tiktok', 'youtube', 'x']) { const v = https(obj(s.social)[k]); if (v) social[k] = v; }
  const lw = Number(s.logoWidth);
  return {
    doc,
    storeName: typeof r.storeName === 'string' ? r.storeName.slice(0, 80) : '',
    exportedAt: typeof r.exportedAt === 'string' && Number.isFinite(Date.parse(r.exportedAt)) ? r.exportedAt : null,
    settings: { logoUrl: https(s.logoUrl), faviconUrl: https(s.faviconUrl), logoWidth: Number.isFinite(lw) ? Math.max(60, Math.min(300, Math.round(lw))) : null, social },
  };
}
