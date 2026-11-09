/**
 * Category tree helpers. Categories point to a parent (any depth); these pure
 * functions answer "everything under X", "the path to X" and "would this move
 * make a loop", so filters and pickers agree everywhere.
 */

export interface TreeNode { id: string; parentId: string | null; name: string; sortOrder?: number }

/** Children by parent id ('' = top level), each list in sibling order. */
export function childrenMap<T extends TreeNode>(rows: readonly T[]): Map<string, T[]> {
  const ids = new Set(rows.map((r) => r.id));
  const map = new Map<string, T[]>();
  for (const r of rows) {
    // A parent outside the list (deleted or another tenant) counts as top level.
    const key = r.parentId && ids.has(r.parentId) ? r.parentId : '';
    const list = map.get(key) ?? [];
    list.push(r);
    map.set(key, list);
  }
  for (const list of map.values()) list.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name));
  return map;
}

/** The category and every category under it. Safe against loops in bad data. */
export function descendantIds(rows: readonly TreeNode[], id: string): Set<string> {
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

/** "Parent › Child" path names by id. */
export function pathNames(rows: readonly TreeNode[], sep = ' › '): Map<string, string> {
  const byId = new Map(rows.map((r) => [r.id, r]));
  const out = new Map<string, string>();
  for (const r of rows) {
    const names: string[] = [];
    const seen = new Set<string>();
    let cur: TreeNode | undefined = r;
    while (cur && !seen.has(cur.id)) {
      seen.add(cur.id);
      names.unshift(cur.name);
      cur = cur.parentId ? byId.get(cur.parentId) : undefined;
    }
    out.set(r.id, names.join(sep));
  }
  return out;
}

/** Depth of each category (top level = 0). */
export function depths(rows: readonly TreeNode[]): Map<string, number> {
  const byId = new Map(rows.map((r) => [r.id, r]));
  const out = new Map<string, number>();
  for (const r of rows) {
    let d = 0;
    const seen = new Set<string>([r.id]);
    let p = r.parentId ? byId.get(r.parentId) : undefined;
    while (p && !seen.has(p.id)) { d++; seen.add(p.id); p = p.parentId ? byId.get(p.parentId) : undefined; }
    out.set(r.id, d);
  }
  return out;
}

/** True when putting `id` under `parentId` would put it inside itself. */
export function wouldLoop(rows: readonly TreeNode[], id: string, parentId: string | null): boolean {
  if (!parentId) return false;
  return descendantIds(rows, id).has(parentId);
}

/** Rows in tree order (parent, then its children), for flat lists and selects. */
export function treeOrder<T extends TreeNode>(rows: readonly T[]): Array<T & { depth: number }> {
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
