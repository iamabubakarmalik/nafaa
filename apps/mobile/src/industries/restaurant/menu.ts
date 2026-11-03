/**
 * The menu for taking orders (web hooks/useMenu.ts): dishes on the menu, not
 * "86" at this branch and served at this hour, with their sizes and add-on
 * groups, grouped by category. Warmed after sign-in and kept with the saved
 * screen data, so the counter opens with the menu offline.
 */

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import type { DishSize, ModGroup } from '@nafaa/core/restaurant';
import { registerPrewarm } from '@/core/offline';
import { PERMISSIONS as P } from '@/core/permissions';
import { menuItemsApi, type RawModifierGroup, type RestaurantMenuItem } from './api';
import { MENU_KEY } from './meta';

export interface MenuEntry {
  id: string;
  productId: string;
  name: string;
  sku: string | null;
  price: number;
  unit: string;
  image: string | null;
  category: { id: string; name: string; color: string } | null;
  /** Sizes with their own rate (Half / Full); one must be picked when there are any. */
  sizes: DishSize[];
  groups: Array<ModGroup & { type: string }>;
  chefSpecial: boolean;
  bestSeller: boolean;
  spiceLevel: string | null;
  prepTime: number | null;
}

function toEntry(m: RestaurantMenuItem): MenuEntry {
  const p = m.product;
  const groups = (m.modifiers ?? [])
    .map((mm) => mm.modifierGroup)
    .filter((g): g is RawModifierGroup => !!g && g.isActive !== false)
    .map((g) => ({
      id: g.id, name: g.name, type: g.type ?? 'ADDON', isRequired: !!g.isRequired,
      minSelections: g.minSelections ?? (g.isRequired ? 1 : 0), maxSelections: g.maxSelections || 1,
      options: (g.options ?? []).filter((o) => o.isActive !== false).map((o) => ({ id: o.id, name: o.name, priceAdjustment: Number(o.priceAdjustment ?? 0), isDefault: !!o.isDefault })),
    }))
    .filter((g) => g.options.length > 0);
  const price = Number(p?.price ?? 0);
  return {
    id: m.id,
    productId: m.productId,
    name: p?.name ?? 'Item',
    sku: p?.sku ?? null,
    price,
    unit: p?.unit ?? 'plate',
    image: m.imageUrl || p?.images?.[0]?.url || null,
    category: p?.category ? { id: p.category.id, name: p.category.name, color: p.category.color || '#64748b' } : null,
    sizes: (p?.variants ?? []).map((v) => ({ id: v.id, name: v.name, price: Number(v.price ?? 0) || price })),
    groups,
    chefSpecial: m.chefSpecial,
    bestSeller: m.bestSeller,
    spiceLevel: m.isSpicy ? m.spiceLevel ?? null : null,
    prepTime: m.prepTimeMinutes ?? null,
  };
}

const menuQuery = { queryKey: [MENU_KEY], queryFn: () => menuItemsApi.list({ available: true }) };
registerPrewarm({ ...menuQuery, permission: P.RESTAURANT_MENU_VIEW });

export function useMenu() {
  const q = useQuery({ ...menuQuery, staleTime: 60_000 });
  // Dishes outside their serving hours stay off the order screen.
  const entries = useMemo(() => (q.data ?? []).filter((m) => m.servingNow !== false).map(toEntry), [q.data]);
  const categories = useMemo(() => {
    const seen = new Map<string, { id: string; name: string; color: string; count: number }>();
    for (const e of entries) {
      if (!e.category) continue;
      const c = seen.get(e.category.id) ?? { ...e.category, count: 0 };
      c.count += 1;
      seen.set(e.category.id, c);
    }
    return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [entries]);
  return { query: q, entries, categories, loading: q.isLoading };
}
