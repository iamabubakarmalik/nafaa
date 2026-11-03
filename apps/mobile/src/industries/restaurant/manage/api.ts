/**
 * Restaurant management endpoints (same paths and shapes as the web
 * industries/restaurant/api): the menu board and analytics, add-on groups,
 * happy hours, recipes, kitchen stations, riders and the delivery board.
 */

import { apiClient } from '@/core/api/client';
import type { DishClass, ModifierType } from '@nafaa/core/restaurant';
import { menuItemsApi, type OrderMode, type RestaurantMenuItem, type Rider, type RiderStatus, type SpiceLevel, type DietaryTag } from '../api';

export type { DishClass, ModifierType, Rider, RiderStatus };

const get = <T>(path: string, params?: object) => apiClient.get<T>(path, { params }).then((r) => r.data);
const post = <T>(path: string, body?: object) => apiClient.post<T>(path, body ?? {}).then((r) => r.data);
const patch = <T>(path: string, body?: object) => apiClient.patch<T>(path, body ?? {}).then((r) => r.data);
const del = <T>(path: string) => apiClient.delete<T>(path).then((r) => r.data);

// ── Menu board ─────────────────────────────────────────────────

export type BoardState = 'all' | 'live' | 'off' | 'cantmake' | 'norecipe' | 'notonpos' | 'raw' | 'inactive';
export type BoardSort = 'name' | 'new' | 'priceHigh' | 'priceLow' | 'sold' | 'foodCost' | 'profit' | 'canMake';
export type BoardKind = 'dish' | 'bought' | 'raw';
export interface Shortage { name: string; have: number; need: number; unit: string }

export interface BoardItem {
  productId: string; menuItemId: string | null; name: string; sku: string | null; barcode: string | null; unit: string;
  price: number; cost: number; image: string | null; category: { id: string; name: string; color: string } | null; isActive: boolean;
  kind: BoardKind; onPos: boolean; available: boolean; offHere: boolean; offUntil: string | null; servingNow: boolean;
  hours: { from: string | null; to: string | null; days: number[] };
  chefSpecial: boolean; bestSeller: boolean; spiceLevel: SpiceLevel | null; diet: DietaryTag[]; prepTime: number | null; addOnGroups: number;
  recipe: { id: string; lines: number; unitProblems: string[] } | null;
  canMake: number | null; blocker: Shortage | null; foodCostPct: number | null; profit: number; stock: number | null; lowStockAlert: number; sold: number; createdAt: string;
}

export interface BoardPage {
  items: BoardItem[]; count: number; page: number; limit: number; windowDays: number;
  tabs: Record<Exclude<BoardState, 'inactive'>, number> | null;
  stats: {
    dishes: number; live: number; liveButCantMake: Array<{ productId: string; menuItemId: string | null; name: string; blocker: string | null }>;
    running: number; avgFoodCost: number | null; highFoodCost: number; sold: number; rawLow: number; rawValue: number; unitProblems: number;
  };
  categories: Array<{ id: string; name: string; color: string; count: number }>;
}

export interface BoardQuery { search?: string; categoryId?: string; state?: BoardState; sort?: BoardSort; page?: number; limit?: number }

export interface MenuAnalytics {
  days: number; from: string;
  rows: Array<{
    productId: string; name: string; category: { id: string; name: string; color: string } | null; menuItemId: string | null; available: boolean | null;
    qty: number; revenue: number; cost: number; profit: number; bills: number; perPlate: number; foodCostPct: number | null; share: number; class: DishClass;
  }>;
  thresholds: { popularAt: number; marginAt: number };
  totals: { plates: number; dishRevenue: number; dishCost: number; dishProfit: number; foodCostPct: number | null; netSales: number; serviceCharges: number; bills: number; grossProfit: number };
  counts: Record<DishClass, number>;
}

export type MenuItemFull = RestaurantMenuItem & { recipe?: Recipe | null; product?: RestaurantMenuItem['product'] & { isActive?: boolean; isRawMaterial?: boolean; productType?: string | null } };

export const boardApi = {
  board: (q: BoardQuery) => get<BoardPage>('/restaurant/menu-items/board', q),
  analytics: (days: number) => get<MenuAnalytics>('/restaurant/menu-items/analytics', { days }),
  getOne: (id: string) => get<MenuItemFull>(`/restaurant/menu-items/${id}`),
  list: () => get<MenuItemFull[]>('/restaurant/menu-items', {}),
  byProduct: (productId: string) => get<MenuItemFull | null>(`/restaurant/menu-items/by-product/${productId}`),
};

/**
 * Switches dishes for the counter. Off is "86" at this branch until the
 * business day ends (or `until`); on brings a branch "86" back, and a dish
 * switched off for every branch back on for every branch.
 */
export async function switchDishes(items: Array<{ menuItemId: string; offHere?: boolean }>, on: boolean, until?: string | null) {
  const ids = items.map((i) => i.menuItemId);
  if (!on) return (await menuItemsApi.setBranch(ids, false, until)).updated;
  const here = items.filter((i) => i.offHere).map((i) => i.menuItemId);
  const everywhere = items.filter((i) => !i.offHere).map((i) => i.menuItemId);
  const [a, b] = await Promise.all([
    here.length ? menuItemsApi.setBranch(here, true) : null,
    everywhere.length ? menuItemsApi.setAvailableMany(everywhere, true) : null,
  ]);
  return (a?.updated ?? 0) + (b?.updated ?? 0);
}

// ── Add-on groups ──────────────────────────────────────────────

export interface ModifierOption {
  id?: string; name: string; priceAdjustment?: number; isDefault?: boolean; displayOrder?: number; isActive?: boolean; emoji?: string;
  ingredientProductId?: string | null; ingredientQty?: number | null; ingredientUnit?: string | null;
  ingredient?: { id: string; name: string; unit: string } | null;
}

export interface ModifierGroup {
  id: string; name: string; description?: string | null; type: ModifierType; isRequired: boolean; minSelections: number; maxSelections: number;
  displayOrder: number; isActive: boolean; options: ModifierOption[]; _count?: { menuItems: number }; menuItems?: Array<{ menuItemId: string }>;
}

export interface ModifierGroupInput {
  name: string; description?: string; type?: ModifierType; isRequired?: boolean; minSelections?: number; maxSelections?: number;
  displayOrder?: number; isActive?: boolean; options: ModifierOption[];
}

export const modifiersApi = {
  list: () => get<ModifierGroup[]>('/restaurant/modifiers'),
  create: (data: ModifierGroupInput) => post<ModifierGroup>('/restaurant/modifiers', data),
  update: (id: string, data: ModifierGroupInput) => patch<ModifierGroup>(`/restaurant/modifiers/${id}`, data),
  assignDishes: (id: string, menuItemIds: string[]) => post<{ added: number; removed: number }>(`/restaurant/modifiers/${id}/dishes`, { menuItemIds }),
  toggle: (id: string) => post<ModifierGroup>(`/restaurant/modifiers/${id}/toggle`),
  remove: (id: string) => del<{ isActive?: boolean } | null>(`/restaurant/modifiers/${id}`),
};

// ── Happy hours ────────────────────────────────────────────────

export type HappyDiscountType = 'PERCENTAGE' | 'FIXED' | 'BUY_ONE_GET_ONE';

export interface HappyHourRule {
  id: string; name: string; description?: string | null; discountType: HappyDiscountType; discountValue: number; startTime: string; endTime: string;
  daysOfWeek: number[]; validFrom?: string | null; validTo?: string | null; categoryIds: string[]; productIds: string[];
  minOrderAmount?: number | null; maxDiscount?: number | null; orderModes: OrderMode[]; isActive: boolean; displayOrder: number;
  totalUsage: number; totalSaved: number; liveNow?: boolean;
}

export interface HappyHourInput {
  name: string; description?: string; discountType: HappyDiscountType; discountValue: number; startTime: string; endTime: string; daysOfWeek: number[];
  validFrom?: string; validTo?: string; categoryIds: string[]; productIds: string[]; minOrderAmount?: number; maxDiscount?: number; orderModes: OrderMode[]; isActive?: boolean;
}

export const happyHoursApi = {
  list: () => get<HappyHourRule[]>('/restaurant/happy-hours', { active: false }),
  create: (data: HappyHourInput) => post<HappyHourRule>('/restaurant/happy-hours', data),
  update: (id: string, data: HappyHourInput) => patch<HappyHourRule>(`/restaurant/happy-hours/${id}`, data),
  toggle: (id: string) => post<HappyHourRule>(`/restaurant/happy-hours/${id}/toggle`),
  remove: (id: string) => del<{ isActive?: boolean } | null>(`/restaurant/happy-hours/${id}`),
};

// ── Recipes ────────────────────────────────────────────────────

export interface RecipeIngredient {
  id?: string; ingredientProductId: string; quantity: number; unit: string; wastagePercent?: number; costPerUnit?: number; totalCost?: number;
  isOptional?: boolean; notes?: string | null; displayOrder?: number;
  ingredient?: { id: string; name: string; unit: string; costPrice: number; stock?: number } | null;
}

export interface Recipe {
  id: string; menuItemId: string; yieldQuantity: number; yieldUnit: string; totalCost: number; preparationSteps?: string | null; cookingTime?: number | null;
  ingredients: RecipeIngredient[]; sizeFactors?: Array<{ variantId: string; factor: number; variant?: { name: string } }>;
}

export interface RecipeRow extends Recipe {
  menuItem: {
    id: string; isAvailable: boolean; productId: string;
    product: { id: string; name: string; price: number; isActive: boolean; category: { id: string; name: string; color: string } | null; images: Array<{ url: string }> };
  };
}

export interface Cookability {
  recipeId: string; menuItemId: string; productId: string | null; name: string; isAvailable: boolean; offHere?: boolean; offUntil?: string | null;
  prepTimeMinutes: number | null; totalOrdered: number; price: number; cost: number; foodCostPct: number; profit: number;
  canMake: number | null; blocker: Shortage | null; missing: Shortage[]; ingredientCount: number; unitProblems?: string[];
}

export interface CookabilityReport { rows: Cookability[]; outOfStock: number; running: number; withoutRecipe?: number }

export interface UsageReport {
  days: number; since: string;
  rows: Array<{ productId: string; name: string; unit: string; used: number; usedValue: number; bought: number; stock: number; lowStockAlert: number; perDay: number; daysLeft: number | null; moves: number }>;
  totals: { usedValue: number; items: number; runningOut: number };
}

export interface RecipeInput {
  menuItemId: string; yieldQuantity?: number; yieldUnit?: string; preparationSteps?: string; cookingTime?: number;
  ingredients: Array<{ ingredientProductId: string; quantity: number; unit: string; wastagePercent?: number; costPerUnit?: number; isOptional?: boolean; notes?: string; displayOrder?: number }>;
  sizeFactors?: Array<{ variantId: string; factor: number }>;
}

export const recipesApi = {
  list: () => get<RecipeRow[]>('/restaurant/recipes'),
  upsert: (data: RecipeInput) => post<Recipe>('/restaurant/recipes', data),
  cookability: () => get<CookabilityReport>('/restaurant/recipes/cookability'),
  usage: (days: number) => get<UsageReport>('/restaurant/recipes/usage', { days }),
  refreshCosts: () => post<{ updated: number }>('/restaurant/recipes/refresh-costs'),
  getByMenuItem: (menuItemId: string) => get<Recipe | null>(`/restaurant/recipes/by-menu-item/${menuItemId}`),
  remove: (id: string) => del<unknown>(`/restaurant/recipes/${id}`),
};

// ── Kitchen stations ───────────────────────────────────────────

export interface KitchenStation { id: string; name: string; code?: string | null; printerName?: string | null; categoryIds: string[]; displayOrder: number; isActive: boolean }
export interface StationInput { name?: string; code?: string; printerName?: string; categoryIds?: string[] }
export interface StationRouting {
  stations: Array<KitchenStation & { dishes: number }>;
  categories: Array<{ id: string; name: string; color: string; stationId: string | null; dishes: number }>;
  uncategorisedDishes: number;
  fallback: { id: string; name: string } | null;
}

export const stationsApi = {
  routing: () => get<StationRouting>('/restaurant/stations/routing'),
  create: (data: StationInput & { name: string }) => post<KitchenStation>('/restaurant/stations', data),
  update: (id: string, data: StationInput) => patch<KitchenStation>(`/restaurant/stations/${id}`, data),
  remove: (id: string) => del<unknown>(`/restaurant/stations/${id}`),
};

// ── Riders and delivery ────────────────────────────────────────

export type RiderInput = Partial<Pick<Rider, 'name' | 'phone' | 'cnic' | 'vehicleType' | 'vehicleNumber' | 'isEmployee' | 'commissionType' | 'commissionValue' | 'notes' | 'status'>>;

export const ridersManageApi = {
  list: () => get<Rider[]>('/restaurant/riders', { active: true }),
  create: (data: RiderInput) => post<Rider>('/restaurant/riders', data),
  update: (id: string, data: RiderInput) => patch<Rider>(`/restaurant/riders/${id}`, data),
  remove: (id: string) => del<unknown>(`/restaurant/riders/${id}`),
};

export type DeliveryStage = 'needsRider' | 'assigned' | 'onTheWay' | 'cash' | 'done';

export interface BoardOrder {
  id: string; orderNumber: string; status: string; total: number; paidAmount: number; due: number; saleId?: string | null;
  createdAt: string; readyAt?: string | null; token?: number | null; stage: DeliveryStage;
  customerName?: string | null; customerPhone?: string | null; deliveryAddress?: string | null; deliveryNotes?: string | null; deliveryFee: number;
  delivery?: { riderId?: string | null; status: string; rider?: { id: string; name: string; phone: string; vehicleNumber?: string | null } | null } | null;
  items: Array<{ quantity: number; status: string; product?: { name: string } | null }>;
}

export interface RiderCash {
  rider: { id: string; name: string; phone: string };
  orders: Array<{ id: string; orderNumber: string; total: number; paidAmount: number; due: number; status: string; deliveredAt?: string | null; customerName?: string | null; riderFee?: number }>;
  delivered: number; amount: number; riderFee?: number;
}

export interface SettleResult {
  settled: Array<{ orderId: string; orderNumber: string; amount: number; saleId: string | null }>;
  failed: Array<{ orderNumber: string; error: string }>;
  amount: number;
  riderFee?: { amount: number; expenseNumbers: string[]; error?: string };
}

export const deliveryBoardApi = {
  board: () => get<BoardOrder[]>('/restaurant/delivery/board'),
  riderCash: () => get<RiderCash[]>('/restaurant/delivery/rider-cash'),
  assign: (orderId: string, data: { riderId: string; riderCommission?: number }) => post<unknown>(`/restaurant/delivery/assign/${orderId}`, data),
  updateStatus: (orderId: string, data: { status: string; failureReason?: string }) => post<unknown>(`/restaurant/delivery/${orderId}/status`, data),
  settle: (riderId: string, orderIds: string[], payRiderFee?: boolean) =>
    post<SettleResult>('/restaurant/delivery/settle', { riderId, orderIds, ...(payRiderFee && { payRiderFee: true }) }),
};
