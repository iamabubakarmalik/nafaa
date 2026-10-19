/**
 * The menu for taking orders: dishes on the menu and served at this hour,
 * with their add-on groups, grouped by category.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { menuItemsApi, type RestaurantMenuItem } from '../api/menu-items.api';

export interface MenuOption { id: string; name: string; priceAdjustment: number; isDefault: boolean }
export interface MenuGroup { id: string; name: string; type: string; isRequired: boolean; minSelections: number; maxSelections: number; options: MenuOption[] }
export interface MenuEntry {
  id: string;
  productId: string;
  name: string;
  sku: string | null;
  price: number;
  unit: string;
  image: string | null;
  category: { id: string; name: string; color: string } | null;
  groups: MenuGroup[];
  chefSpecial: boolean;
  bestSeller: boolean;
  spiceLevel: string | null;
  prepTime: number | null;
}

type RawGroup = { id: string; name: string; type?: string; isRequired?: boolean; isActive?: boolean; minSelections?: number; maxSelections?: number; options?: Array<{ id: string; name: string; priceAdjustment?: number; isDefault?: boolean; isActive?: boolean }> };

function toEntry(m: RestaurantMenuItem): MenuEntry {
  const p = m.product ?? {};
  const groups: MenuGroup[] = (m.modifiers ?? [])
    .map((mm: { modifierGroup?: RawGroup }) => mm.modifierGroup)
    .filter((g: RawGroup | undefined): g is RawGroup => !!g && g.isActive !== false)
    .map((g: RawGroup) => ({
      id: g.id, name: g.name, type: g.type ?? 'ADDON', isRequired: !!g.isRequired,
      minSelections: g.minSelections ?? (g.isRequired ? 1 : 0), maxSelections: g.maxSelections || 1,
      options: (g.options ?? []).filter((o) => o.isActive !== false).map((o) => ({ id: o.id, name: o.name, priceAdjustment: Number(o.priceAdjustment ?? 0), isDefault: !!o.isDefault })),
    }))
    .filter((g: MenuGroup) => g.options.length > 0);
  return {
    id: m.id,
    productId: m.productId,
    name: p.name ?? 'Item',
    sku: p.sku ?? null,
    price: Number(p.price ?? 0),
    unit: p.unit ?? 'plate',
    image: m.imageUrl || p.images?.[0]?.url || null,
    category: p.category ? { id: p.category.id, name: p.category.name, color: p.category.color || '#64748b' } : null,
    groups,
    chefSpecial: m.chefSpecial,
    bestSeller: m.bestSeller,
    spiceLevel: m.isSpicy ? m.spiceLevel ?? null : null,
    prepTime: m.prepTimeMinutes ?? null,
  };
}

export function useMenu() {
  const q = useQuery({
    queryKey: ['restaurant-menu-order'],
    queryFn: () => menuItemsApi.list({ available: true }),
    staleTime: 60_000,
  });
  const entries = useMemo(() => (q.data ?? [])
    // Dishes outside their serving hours stay off the order screen.
    .filter((m) => (m as RestaurantMenuItem & { servingNow?: boolean }).servingNow !== false)
    .map(toEntry), [q.data]);
  const categories = useMemo(() => {
    const seen = new Map<string, { id: string; name: string; color: string; count: number }>();
    for (const e of entries) {
      if (!e.category) continue;
      const c = seen.get(e.category.id) ?? { ...e.category, count: 0 };
      c.count += 1;
      seen.set(e.category.id, c);
    }
    return [...seen.values()];
  }, [entries]);
  return { entries, categories, loading: q.isLoading, error: q.error };
}
