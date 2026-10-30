/**
 * Merges per-area catalog files into one lookup table. Files are applied in
 * name order; when two areas translate the same source text differently, the
 * later file wins and `i18n:check` reports the conflict.
 */

/** A translation: plain text, or plural forms chosen by the `count` param. */
export type Entry = string | { one?: string; other: string };
export type CatalogFile = Record<string, Entry>;

export function mergeCatalogs(files: Record<string, CatalogFile>): Map<string, Entry> {
  const out = new Map<string, Entry>();
  for (const name of Object.keys(files).sort()) {
    for (const [key, value] of Object.entries(files[name])) {
      if (value === '' || value == null) continue;
      out.set(key, value);
    }
  }
  return out;
}
