/**
 * Navigation menus: a nested list (3 levels, 100 items). Items point at a
 * collection, product, page or blog by id/handle, or at an external URL; the
 * storefront gets ready URLs.
 */

export type MenuItemType = 'home' | 'collection' | 'collections' | 'product' | 'page' | 'blog' | 'search' | 'url' | 'policy';
const TYPES: MenuItemType[] = ['home', 'collection', 'collections', 'product', 'page', 'blog', 'search', 'url', 'policy'];

export interface MenuItem { id: string; title: string; type: MenuItemType; ref: string | null; url: string | null; children: MenuItem[] }
export interface ResolvedMenuItem { id: string; title: string; type: MenuItemType; ref: string | null; url: string; children: ResolvedMenuItem[] }

const MAX_ITEMS = 100;
const MAX_DEPTH = 3;

export function readMenuItems(raw: unknown): MenuItem[] {
  let count = 0;
  const walk = (list: unknown, depth: number): MenuItem[] => {
    if (!Array.isArray(list) || depth > MAX_DEPTH) return [];
    const out: MenuItem[] = [];
    for (const r of list) {
      if (count >= MAX_ITEMS) break;
      const x = (r && typeof r === 'object' ? r : {}) as Record<string, any>;
      const type = TYPES.includes(x.type) ? (x.type as MenuItemType) : 'url';
      const title = String(x.title ?? '').trim().slice(0, 80);
      if (!title) continue;
      const url = typeof x.url === 'string' ? x.url.trim().slice(0, 1000) : null;
      if (type === 'url' && !(url && (/^https?:\/\/\S+$/i.test(url) || /^\/\S*$/.test(url) || /^(mailto|tel):\S+$/i.test(url)))) continue;
      count++;
      out.push({
        id: typeof x.id === 'string' && /^[\w-]{1,40}$/.test(x.id) ? x.id : `m${count}`,
        title,
        type,
        ref: typeof x.ref === 'string' ? x.ref.slice(0, 120) : null,
        url: type === 'url' ? url : null,
        children: walk(x.children, depth + 1),
      });
    }
    return out;
  };
  return walk(raw, 1);
}

export interface MenuLookups {
  collections: Map<string, string>; // id or handle → handle
  products: Map<string, string>;
  pages: Map<string, string>;
}

/** Items whose target no longer exists are dropped. */
export function resolveMenu(items: MenuItem[], look: MenuLookups): ResolvedMenuItem[] {
  const out: ResolvedMenuItem[] = [];
  for (const i of items) {
    let url: string | null = null;
    switch (i.type) {
      case 'home': url = '/'; break;
      case 'collections': url = '/collections'; break;
      case 'search': url = '/search'; break;
      case 'blog': url = `/blogs/${i.ref || 'news'}`; break;
      case 'policy': url = i.ref ? `/policies/${i.ref}` : null; break;
      case 'url': url = i.url; break;
      case 'collection': { const h = i.ref === 'all' ? 'all' : i.ref ? look.collections.get(i.ref) : null; url = h ? `/collections/${h}` : null; break; }
      case 'product': { const h = i.ref ? look.products.get(i.ref) : null; url = h ? `/products/${h}` : null; break; }
      case 'page': { const h = i.ref ? look.pages.get(i.ref) : null; url = h ? `/pages/${h}` : null; break; }
    }
    if (!url) continue;
    out.push({ id: i.id, title: i.title, type: i.type, ref: i.ref, url, children: resolveMenu(i.children, look) });
  }
  return out;
}

/** Ids referenced by a set of menus, so one query per kind can resolve them. */
export function menuRefs(menus: MenuItem[][]): { collections: string[]; products: string[]; pages: string[] } {
  const acc = { collections: new Set<string>(), products: new Set<string>(), pages: new Set<string>() };
  const walk = (list: MenuItem[]) => list.forEach((i) => {
    if (i.ref && i.type === 'collection') acc.collections.add(i.ref);
    if (i.ref && i.type === 'product') acc.products.add(i.ref);
    if (i.ref && i.type === 'page') acc.pages.add(i.ref);
    walk(i.children);
  });
  menus.forEach(walk);
  return { collections: [...acc.collections], products: [...acc.products], pages: [...acc.pages] };
}
