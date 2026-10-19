/**
 * Restaurant menu profiles (/restaurant/menu-items): what makes a product a
 * dish on the menu (prep time, spice, serving hours, add-ons, recipe link),
 * the menu board with recipe and stock facts, and dish analytics.
 */

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
  /** Inside its serving hours right now (shop time); set by the list endpoint. */
  servingNow?: boolean;
  product?: any;
  modifiers?: Array<{ modifierGroupId: string; displayOrder: number; modifierGroup?: any }>;
  recipe?: any;
  createdAt: string;
  updatedAt: string;
}

/** Fields the menu profile form sends; empty strings clear a value. */
export interface MenuProfileInput {
  productId: string;
  prepTimeMinutes?: number;
  cookingInstructions?: string;
  chefSpecial?: boolean;
  bestSeller?: boolean;
  isSpicy?: boolean;
  spiceLevel?: SpiceLevel;
  calories?: number;
  servingSize?: string;
  servesPeople?: number;
  dietaryTags?: DietaryTag[];
  allergenInfo?: string;
  displayOrder?: number;
  isAvailable?: boolean;
  availableFrom?: string;
  availableTo?: string;
  availableDays?: number[];
  imageUrl?: string;
  tagLine?: string;
}

export type BoardState = 'all' | 'live' | 'off' | 'cantmake' | 'norecipe' | 'notonpos' | 'raw' | 'inactive';
export type BoardSort = 'name' | 'new' | 'priceHigh' | 'priceLow' | 'sold' | 'foodCost' | 'profit' | 'canMake';
export type BoardKind = 'dish' | 'bought' | 'raw';

export interface Shortage { name: string; have: number; need: number; unit: string }

export interface BoardItem {
  productId: string;
  menuItemId: string | null;
  name: string;
  sku: string | null;
  barcode: string | null;
  unit: string;
  price: number;
  /** Plate cost from the recipe at today's rates, or the product cost. */
  cost: number;
  image: string | null;
  category: { id: string; name: string; color: string } | null;
  isActive: boolean;
  kind: BoardKind;
  /** Has a menu profile, so the restaurant counter lists it. */
  onPos: boolean;
  /** Switched on for the menu (not "86"). */
  available: boolean;
  servingNow: boolean;
  hours: { from: string | null; to: string | null; days: number[] };
  chefSpecial: boolean;
  bestSeller: boolean;
  spiceLevel: SpiceLevel | null;
  diet: DietaryTag[];
  prepTime: number | null;
  addOnGroups: number;
  recipe: { id: string; lines: number; unitProblems: string[] } | null;
  /** Plates the store still covers; null without a recipe. */
  canMake: number | null;
  blocker: Shortage | null;
  foodCostPct: number | null;
  profit: number;
  /** Counted stock for bought items and raw material; null for recipe dishes. */
  stock: number | null;
  lowStockAlert: number;
  /** Plates or units sold in the last `windowDays` days. */
  sold: number;
  createdAt: string;
}

export interface BoardPage {
  items: BoardItem[];
  count: number;
  page: number;
  limit: number;
  windowDays: number;
  tabs: Record<Exclude<BoardState, 'inactive'>, number> | null;
  stats: {
    dishes: number;
    live: number;
    liveButCantMake: Array<{ productId: string; menuItemId: string | null; name: string; blocker: string | null }>;
    running: number;
    avgFoodCost: number | null;
    highFoodCost: number;
    sold: number;
    rawLow: number;
    rawValue: number;
    unitProblems: number;
  };
  categories: Array<{ id: string; name: string; color: string; count: number }>;
}

export interface BoardQuery {
  search?: string;
  categoryId?: string;
  state?: BoardState;
  sort?: BoardSort;
  page?: number;
  limit?: number;
}

export type DishClass = 'star' | 'workhorse' | 'puzzle' | 'dog';

export interface MenuAnalytics {
  days: number;
  from: string;
  rows: Array<{
    productId: string; name: string; category: { id: string; name: string; color: string } | null;
    menuItemId: string | null; available: boolean | null;
    qty: number; revenue: number; cost: number; profit: number; bills: number; perPlate: number;
    foodCostPct: number | null; share: number; class: DishClass;
  }>;
  thresholds: { popularAt: number; marginAt: number };
  totals: {
    plates: number; dishRevenue: number; dishCost: number; dishProfit: number; foodCostPct: number | null;
    netSales: number; serviceCharges: number; bills: number; grossProfit: number;
  };
  counts: Record<DishClass, number>;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const menuItemsApi = {
  upsert: (data: MenuProfileInput) =>
    apiClient.post('/restaurant/menu-items', data).then(unwrap<RestaurantMenuItem>),

  list: (params?: { available?: boolean; bestSeller?: boolean; chefSpecial?: boolean; search?: string; serving?: boolean }) =>
    apiClient.get('/restaurant/menu-items', { params }).then(unwrap<RestaurantMenuItem[]>),

  getOne: (id: string) =>
    apiClient.get('/restaurant/menu-items/' + id).then(unwrap<RestaurantMenuItem>),

  /** The menu profile of a product, or null when it has none. */
  byProduct: (productId: string) =>
    apiClient.get('/restaurant/menu-items/by-product/' + productId).then(unwrap<RestaurantMenuItem | null>),

  board: (q: BoardQuery) =>
    apiClient.get('/restaurant/menu-items/board', { params: q }).then(unwrap<BoardPage>),

  analytics: (days: number) =>
    apiClient.get('/restaurant/menu-items/analytics', { params: { days } }).then(unwrap<MenuAnalytics>),

  attachModifiers: (id: string, modifierGroupIds: string[]) =>
    apiClient.post('/restaurant/menu-items/' + id + '/modifiers', { modifierGroupIds }).then(unwrap),

  toggleAvailable: (id: string) =>
    apiClient.post('/restaurant/menu-items/' + id + '/toggle-available').then(unwrap<RestaurantMenuItem>),

  /** Sets on/off to a given value, so two people pressing at once agree. */
  setAvailable: (id: string, available: boolean) =>
    apiClient.post('/restaurant/menu-items/' + id + '/availability', { available }).then(unwrap<RestaurantMenuItem>),

  setAvailableMany: (menuItemIds: string[], available: boolean) =>
    apiClient.post('/restaurant/menu-items/availability', { menuItemIds, available }).then(unwrap<{ updated: number }>),

  /** Gives products a menu profile so the restaurant counter lists them. */
  addToMenu: (productIds: string[]) =>
    apiClient.post('/restaurant/menu-items/add-to-menu', { productIds }).then(unwrap<{ added: number }>),

  remove: (id: string) =>
    apiClient.delete('/restaurant/menu-items/' + id).then(unwrap),
};
