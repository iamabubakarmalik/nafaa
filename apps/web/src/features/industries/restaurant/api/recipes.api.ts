import { apiClient } from '@/api/client';

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

  getByMenuItem: (menuItemId: string) =>
    apiClient.get('/restaurant/recipes/by-menu-item/' + menuItemId).then(unwrap<Recipe | null>),

  remove: (id: string) => apiClient.delete('/restaurant/recipes/' + id).then(unwrap),
};
