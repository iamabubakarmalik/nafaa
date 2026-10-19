/**
 * Dish recipes (/restaurant/recipes): ingredients per dish with units and
 * yield, what the kitchen can still make from the branch stock, and how
 * much raw material recipes used next to purchases.
 */

import { apiClient } from '@core/api/client';

export interface RecipeIngredient {
  id?: string;
  ingredientProductId: string;
  quantity: number;
  unit: string;
  /** Percent lost in cleaning or cooking, taken from stock on top of the quantity. */
  wastagePercent?: number;
  costPerUnit?: number;
  totalCost?: number;
  isOptional?: boolean;
  notes?: string;
  displayOrder?: number;
  ingredient?: { id: string; name: string; unit: string; costPrice: number; stock?: number } | any;
}

export interface SizeFactor {
  variantId: string;
  factor: number;
  /** Set when read from the API. */
  variant?: { name: string };
}

export interface Recipe {
  id: string;
  menuItemId: string;
  yieldQuantity: number;
  yieldUnit: string;
  totalCost: number;
  preparationSteps?: string;
  cookingTime?: number;
  ingredients: RecipeIngredient[];
  /** Share of the recipe each size uses (half = 0.5); a size not listed uses the full recipe. */
  sizeFactors?: SizeFactor[];
  menuItem?: any;
  createdAt: string;
  updatedAt: string;
}

/** A recipe with its dish, as the recipes page lists it. */
export interface RecipeRow extends Recipe {
  menuItem: {
    id: string;
    isAvailable: boolean;
    productId: string;
    product: {
      id: string; name: string; price: number; isActive: boolean;
      category: { id: string; name: string; color: string } | null;
      images: Array<{ url: string }>;
    };
  };
}

export interface Shortage { name: string; have: number; need: number; unit: string }

/** How many plates of a dish the store can still make, and what stops it. */
export interface Cookability {
  recipeId: string;
  menuItemId: string;
  productId: string | null;
  name: string;
  /** On the menu and not "86" at this branch. */
  isAvailable: boolean;
  /** Off at this branch only, back on at `offUntil` (null = until switched on). */
  offHere?: boolean;
  offUntil?: string | null;
  prepTimeMinutes: number | null;
  totalOrdered: number;
  price: number;
  cost: number;
  /** Food cost %: 30–35% is usual; above 45% needs a look. */
  foodCostPct: number;
  profit: number;
  /** Plates still possible; null when every line is optional. */
  canMake: number | null;
  blocker: Shortage | null;
  missing: Shortage[];
  ingredientCount: number;
  /** Ingredients whose recipe unit does not fit their stock unit. */
  unitProblems?: string[];
}

export interface CookabilityReport {
  rows: Cookability[];
  outOfStock: number;
  running: number;
  withoutRecipe?: number;
}

export interface UsageReport {
  days: number;
  since: string;
  rows: Array<{
    productId: string; name: string; unit: string; used: number; usedValue: number; bought: number; stock: number;
    lowStockAlert: number; perDay: number; daysLeft: number | null; moves: number;
  }>;
  totals: { usedValue: number; items: number; runningOut: number };
}

export interface RecipeInput {
  menuItemId: string;
  yieldQuantity?: number;
  yieldUnit?: string;
  preparationSteps?: string;
  cookingTime?: number;
  ingredients: Array<Pick<RecipeIngredient, 'ingredientProductId' | 'quantity' | 'unit' | 'wastagePercent' | 'costPerUnit' | 'isOptional' | 'notes' | 'displayOrder'>>;
  /** When sent, replaces the saved list. */
  sizeFactors?: SizeFactor[];
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const recipesApi = {
  upsert: (data: RecipeInput) => apiClient.post('/restaurant/recipes', data).then(unwrap<Recipe>),

  list: () => apiClient.get('/restaurant/recipes').then(unwrap<RecipeRow[]>),

  /** Which dish can still be made, and how many plates, from the branch stock. */
  cookability: () =>
    apiClient.get('/restaurant/recipes/cookability').then(unwrap<CookabilityReport>),

  usage: (days: number) =>
    apiClient.get('/restaurant/recipes/usage', { params: { days } }).then(unwrap<UsageReport>),

  /** Re-costs every recipe at today's ingredient rates. */
  refreshCosts: () =>
    apiClient.post('/restaurant/recipes/refresh-costs').then(unwrap<{ updated: number }>),

  getByMenuItem: (menuItemId: string) =>
    apiClient.get('/restaurant/recipes/by-menu-item/' + menuItemId).then(unwrap<Recipe | null>),

  remove: (id: string) => apiClient.delete('/restaurant/recipes/' + id).then(unwrap),
};
