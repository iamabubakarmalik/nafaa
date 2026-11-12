/**
 * Urdu for a theme: finds the translatable text and textarea settings that
 * have English but no Urdu yet, and turns a translator's answer into a list
 * of proposed changes. Settings that already hold Urdu are never touched;
 * the merchant's own words always win. Rich text is left out because the
 * editor has no Urdu box for it.
 */
import { SECTION_BY_TYPE, SettingField, TEMPLATE_KEYS, TemplateKey } from './section-schema';
import { Section, ThemeDoc } from './theme-doc';

export type UrduWhere = 'global' | TemplateKey;

export interface UrduTarget {
  where: UrduWhere;
  sectionId: string;
  blockId: string | null;
  key: string;
  en: string;
  max: number;
}

export interface UrduChange { where: UrduWhere; sectionId: string; blockId: string | null; key: string; en: string; ur: string }

const URDU = /[؀-ۿ]/;
const LETTER = /\p{L}/u;
const FIELD_MAX: Partial<Record<SettingField['type'], number>> = { text: 500, textarea: 2000 };

/** English and Urdu of a setting value (a plain string counts as English). */
export function textParts(v: unknown): { en: string; ur: string } {
  if (typeof v === 'string') return { en: v, ur: '' };
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    const o = v as Record<string, unknown>;
    return { en: typeof o.en === 'string' ? o.en : '', ur: typeof o.ur === 'string' ? o.ur : '' };
  }
  return { en: '', ur: '' };
}

/** Settings with English text and an empty Urdu value, in page order. */
export function urduTargets(doc: ThemeDoc): UrduTarget[] {
  const out: UrduTarget[] = [];
  const scan = (where: UrduWhere, sectionId: string, blockId: string | null, fields: SettingField[], settings: Record<string, unknown>) => {
    for (const f of fields) {
      const max = FIELD_MAX[f.type];
      if (!f.translatable || !max) continue;
      const { en, ur } = textParts(settings?.[f.key]);
      const text = en.trim();
      if (!text || ur.trim() || !LETTER.test(text) || URDU.test(text)) continue;
      out.push({ where, sectionId, blockId, key: f.key, en: text, max });
    }
  };
  const section = (where: UrduWhere, s: Section) => {
    const schema = SECTION_BY_TYPE.get(s.type);
    if (!schema) return;
    scan(where, s.id, null, schema.settings, s.settings);
    for (const b of s.blocks ?? []) {
      const bs = schema.blocks.find((x) => x.type === b.type);
      if (bs) scan(where, s.id, b.id, bs.settings, b.settings);
    }
  };
  section('global', doc.global.announcement);
  section('global', doc.global.header);
  for (const k of TEMPLATE_KEYS) for (const s of doc.templates[k]?.sections ?? []) section(k, s);
  section('global', doc.global.footer);
  return out;
}

/** Picks the first targets that fit one request (count and characters). */
export function batchOf(targets: UrduTarget[], maxItems = 80, maxChars = 6000): UrduTarget[] {
  const out: UrduTarget[] = [];
  let chars = 0;
  for (const t of targets) {
    if (out.length >= maxItems) break;
    if (out.length && chars + t.en.length > maxChars) break;
    out.push(t);
    chars += t.en.length;
  }
  return out;
}

/** Reads `{"items":[{"i":0,"ur":"..."}]}` (or a bare array) from a model answer; only Urdu-script answers count. */
export function parseUrdu(text: string): Map<number, string> {
  const out = new Map<number, string>();
  const start = text.search(/[[{]/);
  const end = Math.max(text.lastIndexOf('}'), text.lastIndexOf(']'));
  if (start < 0 || end <= start) return out;
  let j: unknown;
  try {
    j = JSON.parse(text.slice(start, end + 1));
  } catch {
    return out;
  }
  const list = Array.isArray(j) ? j : Array.isArray((j as { items?: unknown })?.items) ? (j as { items: unknown[] }).items : [];
  for (const x of list) {
    const r = (x && typeof x === 'object' ? x : {}) as Record<string, unknown>;
    const i = Number(r.i);
    const ur = typeof r.ur === 'string' ? r.ur.trim() : '';
    if (Number.isInteger(i) && i >= 0 && ur && URDU.test(ur)) out.set(i, ur);
  }
  return out;
}

/**
 * Proposed Urdu for one batch: asks `translate` for the batch's English and
 * keeps each answer that came back in Urdu script, clipped to the field size.
 */
export async function proposeUrdu(
  targets: UrduTarget[],
  translate: (items: Array<{ i: number; text: string }>) => Promise<Map<number, string>>,
): Promise<{ changes: UrduChange[]; remaining: number; total: number }> {
  const batch = batchOf(targets);
  if (!batch.length) return { changes: [], remaining: 0, total: targets.length };
  const answers = await translate(batch.map((t, i) => ({ i, text: t.en })));
  const changes: UrduChange[] = [];
  batch.forEach((t, i) => {
    const ur = answers.get(i)?.trim();
    if (ur && URDU.test(ur)) changes.push({ where: t.where, sectionId: t.sectionId, blockId: t.blockId, key: t.key, en: t.en, ur: ur.slice(0, t.max) });
  });
  return { changes, remaining: targets.length - changes.length, total: targets.length };
}

/**
 * Puts proposed Urdu into a theme, only where Urdu is still empty and the
 * English is unchanged. The editor does the same on its side.
 */
export function applyUrdu(doc: ThemeDoc, changes: UrduChange[]): ThemeDoc {
  const out: ThemeDoc = JSON.parse(JSON.stringify(doc));
  for (const c of changes) {
    const pool = c.where === 'global' ? [out.global.announcement, out.global.header, out.global.footer] : out.templates[c.where]?.sections ?? [];
    const sec = pool.find((s) => s.id === c.sectionId);
    const holder = c.blockId ? sec?.blocks?.find((b) => b.id === c.blockId) : sec;
    if (!holder) continue;
    const { en, ur } = textParts(holder.settings[c.key]);
    if (ur.trim() || en.trim() !== c.en) continue;
    holder.settings[c.key] = { en, ur: c.ur };
  }
  return out;
}
