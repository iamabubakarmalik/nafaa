import { apiClient } from '@core/api/client';

export interface RecipeIngredient {
  id?: string;
  ingredientProductId: string;
  quantity: number;
  unit: string;
  costPerUnit?: number;
  totalCost?: number;
  isOptional?: boolean;
  notes?: string;
  displayOrder?: number;
  ingredient?: any;
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
  menuItem?: any;
  createdAt: string;
  updatedAt: string;
}

/** Ek dish ab kitni ban sakti hai, aur kaunsa saamaan rok raha hai */
export interface Cookability {
  recipeId: string;
  menuItemId: string;
  productId: string | null;
  name: string;
  isAvailable: boolean;
  prepTimeMinutes: number | null;
  totalOrdered: number;
  price: number;
  cost: number;
  /** Food cost % — 30–35% aam, 45% se upar fikr ki baat */
  foodCostPct: number;
  profit: number;
  /** Kitni plate aur ban sakti hain — null matlab recipe khali */
  canMake: number | null;
  blocker: { name: string; have: number; need: number; unit: string } | null;
  missing: Array<{ name: string; have: number; need: number; unit: string }>;
  ingredientCount: number;
}

export interface CookabilityReport {
  rows: Cookability[];
  outOfStock: number;
  running: number;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const recipesApi = {
  upsert: (data: {
    menuItemId: string;
    yieldQuantity?: number;
    yieldUnit?: string;
    preparationSteps?: string;
    cookingTime?: number;
    ingredients: RecipeIngredient[];
  }) => apiClient.post('/restaurant/recipes', data).then(unwrap<Recipe>),

  /** Kaunsi dish ab kitni ban sakti hai — kitchen ki sab se ahem report */
  cookability: () =>
    apiClient.get('/restaurant/recipes/cookability').then(unwrap<CookabilityReport>),

  getByMenuItem: (menuItemId: string) =>
    apiClient.get('/restaurant/recipes/by-menu-item/' + menuItemId).then(unwrap<Recipe | null>),

  remove: (id: string) => apiClient.delete('/restaurant/recipes/' + id).then(unwrap),
};
