/** Site paths of seed entries, computed offline the same way the API builds them. */

import { ENTRY_TYPE_META } from '../../../src/admin-marketing/cms/contract/cms-contract';
import type { SeedEntry } from './types';
import { entryKey } from './validate';

/** `origin` of entries written by export-entries.ts. */
export const EXPORTED_ORIGIN = 'exported:admin';

/** Path of a seed entry. DOC entries follow their parent chain under /developers. */
export function seedPath(e: SeedEntry, all: SeedEntry[]): string {
  if (e.type === 'DOC') {
    const chain: string[] = [];
    let cur: SeedEntry | undefined = e;
    for (let guard = 0; cur && guard < 10; guard++) {
      if (cur.slug) chain.unshift(cur.slug);
      const parentRef: string | undefined = cur.parent;
      cur = parentRef ? all.find((x) => entryKey(x) === parentRef) : undefined;
      if (parentRef && !cur) throw new Error(`${entryKey(e)}: parent ${parentRef} is not in the seed`);
    }
    return `/developers${chain.map((s) => `/${s}`).join('')}`;
  }
  // CITY_INDUSTRY pages live under their CITY: /pos-software/{city}/{industry}.
  if (e.type === 'CITY_INDUSTRY') {
    const city = e.parent ? all.find((x) => entryKey(x) === e.parent) : undefined;
    if (!city || city.type !== 'CITY') throw new Error(`${entryKey(e)}: needs a CITY parent in the seed`);
    return `${seedPath(city, all)}/${e.slug}`;
  }
  // PAGE entries live at /<slug>, or under their parent PAGE (/help/{topic}/{article}).
  if (e.type === 'PAGE') {
    const parent = e.parent ? all.find((x) => entryKey(x) === e.parent) : undefined;
    if (e.parent && (!parent || parent.type !== 'PAGE')) throw new Error(`${entryKey(e)}: parent ${e.parent} must be a PAGE in the seed`);
    return parent ? `${seedPath(parent, all)}/${e.slug}` : `/${e.slug}`;
  }
  const prefix = ENTRY_TYPE_META[e.type].prefix;
  if (!prefix) throw new Error(`${entryKey(e)}: the seed only handles types with a fixed prefix (and DOC)`);
  return `/${prefix}/${e.slug}`;
}
