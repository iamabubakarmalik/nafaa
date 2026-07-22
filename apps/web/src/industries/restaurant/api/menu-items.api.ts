import { apiClient } from '@core/api/client';

export type SpiceLevel = 'NONE' | 'MILD' | 'MEDIUM' | 'HOT' | 'EXTRA_HOT';
export type DietaryTag =
  | 'VEGETARIAN' | 'VEGAN' | 'HALAL' | 'GLUTEN_FREE' | 'DAIRY_FREE'
  | 'NUT_FREE' | 'SPICY' | 'CONTAINS_EGG' | 'CONTAINS_SEAFOOD'
  | 'BEEF' | 'CHICKEN' | 'MUTTON';

export interface RestaurantMenuItem {
  id: string;
  productId: string;
  prepTimeMinutes?: number;
  cookingInstructions?: string;
  chefSpecial: boolean;
  bestSeller: boolean;
  isSpicy: boolean;
  spiceLevel?: SpiceLevel;
  calories?: number;
  servingSize?: string;
  servesPeople?: number;
  dietaryTags: DietaryTag[];
  allergenInfo?: string;
  displayOrder: number;
  isAvailable: boolean;
  availableFrom?: string;
  availableTo?: string;
  availableDays: number[];
  imageUrl?: string;
  videoUrl?: string;
  highlightColor?: string;
  tagLine?: string;
  totalOrdered: number;
  avgRating?: number;
  totalReviews: number;
  product?: any;
  modifiers?: any[];
  recipe?: any;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const menuItemsApi = {
  upsert: (data: Partial<RestaurantMenuItem>) =>
    apiClient.post('/restaurant/menu-items', data).then(unwrap<RestaurantMenuItem>),

  list: (params?: { available?: boolean; bestSeller?: boolean; chefSpecial?: boolean; search?: string }) =>
    apiClient.get('/restaurant/menu-items', { params }).then(unwrap<RestaurantMenuItem[]>),

  getOne: (id: string) =>
    apiClient.get('/restaurant/menu-items/' + id).then(unwrap<RestaurantMenuItem>),

  attachModifiers: (id: string, modifierGroupIds: string[]) =>
    apiClient.post('/restaurant/menu-items/' + id + '/modifiers', { modifierGroupIds }).then(unwrap),

  toggleAvailable: (id: string) =>
    apiClient.post('/restaurant/menu-items/' + id + '/toggle-available').then(unwrap<RestaurantMenuItem>),

  remove: (id: string) =>
    apiClient.delete('/restaurant/menu-items/' + id).then(unwrap),
};
