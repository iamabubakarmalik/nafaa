/**
 * Catalog loading and lookup (same rules as the web catalog/merge.ts).
 *
 * Catalogs live in catalog/<locale>/<area>.json, flat `{ key: text }`.
 * Lookup is per area first; a key missing from its area falls back to the
 * translation most areas use for that key ("global").
 *
 * Everything is lazy so startup stays fast: an area file is read the first
 * time a text from that area is shown, and the global answer for a key is
 * worked out (and remembered) the first time it is asked for. Building every
 * table up front cost ~150 ms per locale on start.
 */

import type { Locale } from '../locales';

export type Entry = string | { one?: string; other: string };
export type CatalogFile = Record<string, Entry>;

interface RequireContext {
  keys(): string[];
  (id: string): unknown;
}
declare const require: NodeRequire & {
  context(path: string, recursive: boolean, pattern: RegExp): RequireContext;
};

// Metro needs literal arguments for require.context. Calling the context
// with a key loads only that file.
const contexts: Record<Locale, () => RequireContext> = {
  en: () => require.context('./en', false, /\.json$/),
  ur: () => require.context('./ur', false, /\.json$/),
  roman: () => require.context('./roman', false, /\.json$/),
};

const filled = (value: Entry | null | undefined): value is Entry =>
  typeof value === 'string' ? value !== '' : !!value && typeof value.other === 'string' && value.other !== '';

const areaOf = (file: string) => file.replace(/^.*\//, '').replace(/\.json$/, '');
const has = Object.prototype.hasOwnProperty;

export interface Catalog {
  /** The entry for a key in one area, if that area has it. */
  inArea(area: string, key: string): Entry | undefined;
  /** The entry most areas use for a key. */
  global(key: string): Entry | undefined;
}

export function createCatalog(locale: Locale): Catalog {
  const ctx = contexts[locale]();
  // Sorted like the web merge, so ties in the global vote resolve the same way.
  const fileByArea = new Map(ctx.keys().sort().map((file) => [areaOf(file), file] as const));
  const tables = new Map<string, CatalogFile | null>();
  const globals = new Map<string, Entry | undefined>();

  const table = (area: string): CatalogFile | null => {
    let found = tables.get(area);
    if (found !== undefined) return found;
    const file = fileByArea.get(area);
    if (file) {
      const mod = ctx(file) as CatalogFile | { default: CatalogFile };
      found = ('default' in mod && typeof mod.default === 'object' ? mod.default : mod) as CatalogFile;
    } else {
      found = null;
    }
    tables.set(area, found);
    return found;
  };

  const inArea = (area: string, key: string): Entry | undefined => {
    const t = table(area);
    if (!t || !has.call(t, key)) return undefined;
    const value = t[key];
    return filled(value) ? value : undefined;
  };

  const global = (key: string): Entry | undefined => {
    if (globals.has(key)) return globals.get(key);
    let best: { entry: Entry; count: number } | undefined;
    const options = new Map<string, { entry: Entry; count: number }>();
    for (const area of fileByArea.keys()) {
      const value = inArea(area, key);
      if (value === undefined) continue;
      const id = typeof value === 'string' ? value : JSON.stringify(value);
      const option = options.get(id);
      if (option) option.count++;
      else options.set(id, { entry: value, count: 1 });
    }
    for (const option of options.values()) if (!best || option.count > best.count) best = option;
    globals.set(key, best?.entry);
    return best?.entry;
  };

  return { inArea, global };
}
