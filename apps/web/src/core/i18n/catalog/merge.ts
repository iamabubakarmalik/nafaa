/**
 * Builds the lookup tables for one locale from its per-area catalog files.
 *
 * Every area keeps its own table, so the same source text can mean different
 * things in different modules ("Shuru" is Start in distribution and Opening in
 * finance). `t()` looks in the caller's area first (see runtime.ts).
 *
 * The global table answers lookups that have no area (server messages use the
 * `api` area explicitly) and keys an area does not hold itself, such as a
 * label marked with msg() in one module and shown by a component of another.
 * When areas disagree, it keeps the translation most areas use; a tie goes to
 * the area that comes first by name.
 */

/** A translation: plain text, or plural forms chosen by the `count` param. */
export type Entry = string | { one?: string; other: string };
export type CatalogFile = Record<string, Entry>;

export interface Catalog {
  areas: Map<string, Map<string, Entry>>;
  global: Map<string, Entry>;
}

const filled = (value: Entry | null | undefined): value is Entry =>
  typeof value === 'string' ? value !== '' : !!value && typeof value.other === 'string' && value.other !== '';

/** `files` maps glob paths ('./pos.json') to parsed catalog files. */
export function buildCatalog(files: Record<string, CatalogFile>): Catalog {
  const areas = new Map<string, Map<string, Entry>>();
  const votes = new Map<string, Map<string, { entry: Entry; count: number }>>();

  for (const file of Object.keys(files).sort()) {
    const area = file.replace(/^.*\//, '').replace(/\.json$/, '');
    const table = new Map<string, Entry>();
    for (const [key, value] of Object.entries(files[file])) {
      if (!filled(value)) continue;
      table.set(key, value);
      const id = typeof value === 'string' ? value : JSON.stringify(value);
      let options = votes.get(key);
      if (!options) votes.set(key, (options = new Map()));
      const option = options.get(id);
      if (option) option.count++;
      else options.set(id, { entry: value, count: 1 });
    }
    areas.set(area, table);
  }

  const global = new Map<string, Entry>();
  for (const [key, options] of votes) {
    let best: { entry: Entry; count: number } | undefined;
    for (const option of options.values()) if (!best || option.count > best.count) best = option;
    global.set(key, best!.entry);
  }
  return { areas, global };
}
