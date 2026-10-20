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
  // Top-level PAGE entries (no parent) live at /<slug>.
  if (e.type === 'PAGE') return `/${e.slug}`;
  const prefix = ENTRY_TYPE_META[e.type].prefix;
  if (!prefix) throw new Error(`${entryKey(e)}: the seed only handles types with a fixed prefix (and DOC)`);
  return `/${prefix}/${e.slug}`;
}
