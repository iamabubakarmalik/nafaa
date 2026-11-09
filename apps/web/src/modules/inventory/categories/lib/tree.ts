/**
 * Category tree helpers for pickers, filters and the categories page.
 * Same rules as the API: any depth through parentId, siblings by sortOrder,
 * a parent that is missing counts as top level, loops in bad data are cut.
 */

export interface TreeCat { id: string; name: string; parentId?: string | null; sortOrder?: number }

export function childrenMap<T extends TreeCat>(rows: readonly T[]): Map<string, T[]> {
  const ids = new Set(rows.map((r) => r.id));
  const map = new Map<string, T[]>();
  for (const r of rows) {
    const key = r.parentId && ids.has(r.parentId) ? r.parentId : '';
    map.set(key, [...(map.get(key) ?? []), r]);
  }
  for (const list of map.values()) list.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name));
  return map;
}

/** Ids from the top down to `id` (inclusive). */
export function chainOf(rows: readonly TreeCat[], id: string | null | undefined): string[] {
  const byId = new Map(rows.map((r) => [r.id, r]));
  const out: string[] = [];
  const seen = new Set<string>();
  let cur = id ? byId.get(id) : undefined;
  while (cur && !seen.has(cur.id)) { seen.add(cur.id); out.unshift(cur.id); cur = cur.parentId ? byId.get(cur.parentId) : undefined; }
  return out;
}

export function pathOf(rows: readonly TreeCat[], id: string, sep = ' › '): string {
  const byId = new Map(rows.map((r) => [r.id, r]));
  return chainOf(rows, id).map((x) => byId.get(x)!.name).join(sep);
}

export function descendants(rows: readonly TreeCat[], id: string): Set<string> {
  const kids = childrenMap(rows);
  const out = new Set<string>();
  const stack = [id];
  while (stack.length) {
    const cur = stack.pop()!;
    if (out.has(cur)) continue;
    out.add(cur);
    for (const c of kids.get(cur) ?? []) stack.push(c.id);
  }
  return out;
}

/** Rows parent-first with their depth, for indented lists and selects. */
export function treeOrder<T extends TreeCat>(rows: readonly T[]): Array<T & { depth: number }> {
  const kids = childrenMap(rows);
  const out: Array<T & { depth: number }> = [];
  const seen = new Set<string>();
  const walk = (key: string, depth: number) => {
    for (const r of kids.get(key) ?? []) {
      if (seen.has(r.id)) continue;
      seen.add(r.id);
      out.push({ ...r, depth });
      walk(r.id, depth + 1);
    }
  };
  walk('', 0);
  return out;
}
