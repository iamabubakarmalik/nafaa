/**
 * Catalog data sources for food businesses: the restaurant menu (veg, spice,
 * chef special) and bakery items (per-kg/piece rates, made today, eggless).
 */

import { menuItemsApi, type DietaryTag, type RestaurantMenuItem, type SpiceLevel } from '@industries/restaurant/api/menu-items.api';
import { bakeryProductsApi, type BakeryProduct } from '@industries/bakery/api/products.api';
import { productionApi, type ProductionPlan } from '@industries/bakery/api/production.api';
import { CATEGORIES as BAKERY_CATEGORIES } from '@industries/bakery/api/constants';
import { deriveBakeryCategory } from '@industries/bakery/lib/bakeryCategory';
import type { CatalogEntry, CatalogSource } from '../types';
import { activeProducts, fromProduct, optional, specs } from './products';

export const DIET_LABELS: Record<DietaryTag, string> = {
  VEGETARIAN: 'Veg', VEGAN: 'Vegan', HALAL: 'Halal', GLUTEN_FREE: 'Gluten free', DAIRY_FREE: 'Doodh ke baghair',
  NUT_FREE: 'Nuts ke baghair', SPICY: 'Teekha', CONTAINS_EGG: 'Anda hai', CONTAINS_SEAFOOD: 'Seafood',
  BEEF: 'Beef', CHICKEN: 'Chicken', MUTTON: 'Mutton',
};

export const SPICE_LABELS: Record<SpiceLevel, string> = { NONE: 'Teekha nahi', MILD: 'Halka teekha', MEDIUM: 'Teekha', HOT: 'Bohat teekha', EXTRA_HOT: 'Sakht teekha' };

const isVeg = (m: RestaurantMenuItem) => m.dietaryTags?.some((t) => t === 'VEGETARIAN' || t === 'VEGAN');

export const restaurantSource: CatalogSource = {
  key: 'restaurant',
  load: async () => {
    const items = await menuItemsApi.list({ available: true }) as RestaurantMenuItem[];
    // A restaurant that never set up menu details still shows its products.
    if (!items?.length) return (await activeProducts()).map((p) => ({ ...fromProduct(p), inStock: null }));
    return items.filter((m) => m.product && m.product.isActive !== false).map((m): CatalogEntry => {
      const e = fromProduct(m.product);
      const spicy = m.isSpicy && m.spiceLevel !== 'NONE';
      return {
        ...e,
        id: m.id,
        per: m.servingSize || (e.per && e.per !== 'pcs' ? e.per : undefined),
        image: m.imageUrl || e.image,
        images: [m.imageUrl, ...(e.images ?? [])].filter(Boolean) as string[],
        emoji: '🍽️',
        description: m.tagLine || e.description,
        featured: e.featured || m.chefSpecial || m.bestSeller,
        inStock: null,
        badges: [
          ...(m.chefSpecial ? [{ label: 'Chef special', tone: 'violet' as const }] : []),
          ...(m.bestSeller ? [{ label: 'Best seller', tone: 'pink' as const }] : []),
        ],
        chips: [
          ...(isVeg(m) ? [{ label: 'Veg', tone: 'green' as const }] : []),
          ...(spicy ? [{ label: `🌶 ${SPICE_LABELS[m.spiceLevel ?? 'MEDIUM']}`, tone: 'red' as const }] : []),
          ...(m.prepTimeMinutes ? [{ label: `${m.prepTimeMinutes} min`, tone: 'slate' as const }] : []),
          ...(m.servesPeople ? [{ label: `${m.servesPeople} log`, tone: 'blue' as const }] : []),
        ],
        specs: specs([
          ['Banne ka waqt', m.prepTimeMinutes ? `${m.prepTimeMinutes} minute` : null],
          ['Kitne log', m.servesPeople],
          ['Quantity', m.servingSize],
          ['Calories', m.calories],
          ['Teekha', m.spiceLevel && m.spiceLevel !== 'NONE' ? SPICE_LABELS[m.spiceLevel] : null],
          ['Allergy', m.allergenInfo],
        ]),
        includes: (m.dietaryTags ?? []).map((t) => DIET_LABELS[t] ?? t),
        facets: { ...e.facets, diet: m.dietaryTags ?? [], ...(spicy ? { spice: m.spiceLevel ?? 'MEDIUM' } : {}) },
      };
    });
  },
};

const RATES: Array<[keyof BakeryProduct, string]> = [
  ['pricePerPiece', 'piece'], ['pricePerSlice', 'slice'], ['pricePerPound', 'pound'], ['pricePerKg', 'kg'],
  ['pricePerDozen', 'darjan'], ['pricePerBox', 'dabba'], ['pricePerTray', 'tray'],
];

/** Product ids baked in today's production plans. */
async function bakedToday(): Promise<Set<string>> {
  const plans = await optional(productionApi.today(), [] as ProductionPlan[]);
  const ids = new Set<string>();
  for (const plan of Array.isArray(plans) ? plans : []) for (const it of plan.items ?? []) if (it.productId && it.producedQty > 0) ids.add(it.productId);
  return ids;
}

export const bakerySource: CatalogSource = {
  key: 'bakery',
  load: async () => {
    const [products, profiles, today] = await Promise.all([
      activeProducts(), optional(bakeryProductsApi.list({}), [] as BakeryProduct[]), bakedToday(),
    ]);
    const byProduct = new Map((Array.isArray(profiles) ? profiles : []).map((b) => [b.productId, b]));
    return products.filter((p) => !(p as { isRawMaterial?: boolean }).isRawMaterial).map((p): CatalogEntry => {
      const e = fromProduct(p);
      const b = byProduct.get(p.id);
      const cat = b?.category ?? deriveBakeryCategory(p.category?.name, p.name);
      const meta = BAKERY_CATEGORIES.find((c) => c.value === cat);
      const tiers = b ? RATES.map(([k, label]) => ({ label, price: Number(b[k] ?? 0) })).filter((t) => t.price > 0) : [];
      const cheapest = tiers.length ? tiers.reduce((a, t) => (t.price < a.price ? t : a)) : null;
      const fresh = today.has(p.id);
      const shelf = b?.shelfLifeDays ? `${b.shelfLifeDays} din` : b?.shelfLifeHours ? `${b.shelfLifeHours} ghante` : null;
      return {
        ...e,
        price: cheapest?.price ?? e.price,
        per: cheapest?.label ?? e.per,
        priceTiers: tiers.length > 1 ? tiers : undefined,
        image: e.image ?? b?.imageUrls?.[0] ?? null,
        emoji: meta?.emoji ?? '🎂',
        description: b?.descriptionLong || e.description,
        featured: e.featured || !!b?.isFeatured,
        stockNote: fresh ? 'Aaj bani' : e.stockNote,
        badges: [
          ...(fresh ? [{ label: 'Aaj bani', tone: 'green' as const }] : []),
          ...(b?.isBestSeller ? [{ label: 'Best', tone: 'pink' as const }] : []),
          ...(b?.isNewArrival ? [{ label: 'Naya', tone: 'blue' as const }] : []),
          ...(b?.isSeasonalItem ? [{ label: b.seasonName || 'Season', tone: 'amber' as const }] : []),
        ],
        chips: [
          ...(b?.isEggless ? [{ label: 'Eggless', tone: 'amber' as const }] : []),
          ...(b?.isVegan ? [{ label: 'Vegan', tone: 'green' as const }] : []),
          ...(b?.isSugarFree ? [{ label: 'Sugar free', tone: 'blue' as const }] : []),
          ...(b?.weightGrams ? [{ label: `${b.weightGrams} g`, tone: 'slate' as const }] : []),
          ...(b?.isCakeCustomizable ? [{ label: 'Order par banta hai', tone: 'violet' as const }] : []),
        ],
        specs: specs([
          ['Qisam', meta ? `${meta.emoji} ${meta.label}` : null],
          ['Wazan', b?.weightGrams ? `${b.weightGrams} gram` : null],
          ['Taaza rehta hai', shelf],
          ['Fridge', b?.requiresRefrigeration ? 'Fridge me rakhein' : null],
          ['Pehle order', b?.advanceOrderHours ? `${b.advanceOrderHours} ghante pehle` : null],
          ['Halal', b?.isHalal ? 'Haan' : null],
          ['Is me hai', b?.ingredientList],
          ['Allergy', b?.allergens?.length ? b.allergens.join(', ') : null],
          ['Kaise khayein', b?.servingSuggestions],
        ]),
        facets: {
          ...e.facets, bcat: cat,
          diet: [b?.isEggless && 'eggless', b?.isVegan && 'vegan', b?.isSugarFree && 'sugarfree'].filter(Boolean) as string[],
          ...(fresh ? { fresh: 'today' } : {}),
          ...(b?.isCakeCustomizable ? { custom: 'yes' } : {}),
        },
      };
    });
  },
};
