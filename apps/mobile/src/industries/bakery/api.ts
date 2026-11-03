/**
 * Bakery endpoints (same paths and shapes as apps/web/src/industries/bakery/api):
 * cake and bulk orders, baking plans, raw materials, shelf batches and the
 * bakery product profile. All need the server; screens show the last saved
 * data offline.
 */

import { apiClient } from '@/core/api/client';
import type { BakeryCategory, BakeryOrderStatus, BakerySize, RecipeLine } from '@nafaa/core/bakery';

export type { BakeryOrderStatus, BakerySize, BakeryCategory };

export type DeliveryType = 'SELF_PICKUP' | 'HOME_DELIVERY' | 'VENUE_DELIVERY' | 'COURIER' | 'DELIVERY' | 'PICKUP' | 'DINE_IN';
export type OrderPayMethod = 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'JAZZCASH' | 'EASYPAISA';

export interface CakeOrder {
  id: string; orderNumber: string; customerId?: string | null; customerName: string; customerPhone: string; customerEmail?: string | null;
  productId?: string | null; productName?: string | null; category: string; size: BakerySize; customWeightKg?: number | null;
  shape: string; customShapeDesc?: string | null; flavor: string; customFlavorDesc?: string | null; creamType?: string | null;
  numberOrLetter?: string | null; numberOfTiers: number; messageOnCake?: string | null; messageColor?: string | null;
  hasPhotoOnCake: boolean; photoUrl?: string | null; hasEdibleImage: boolean; designReferenceUrls: string[]; designInstructions?: string | null;
  colorTheme?: string | null; primaryColor?: string | null; secondaryColor?: string | null; decorativeItems: string[];
  candlesRequired?: number | null; candleType?: string | null; cakeStand: boolean; cakeKnife: boolean;
  occasion: string; celebrantName?: string | null; celebrantAge?: number | null; eventDate?: string | null; eventTime?: string | null; eventVenue?: string | null;
  isEggless: boolean; isSugarFree: boolean; isVegan: boolean; allergies: string[]; dietaryNotes?: string | null;
  deliveryType: DeliveryType; neededBy: string; deliveryDate?: string | null; deliveryTime?: string | null; deliveryAddress?: string | null; deliveryLandmark?: string | null;
  deliveryCharges: number; status: BakeryOrderStatus; assignedBakerId?: string | null; assignedDecoratorId?: string | null;
  basePrice: number; customizationCharges: number; photoCakeCharges: number; taxAmount: number; discount: number;
  advanceRequired: number; advancePaid: number; khataPaid?: number; total: number; paidAmount: number; paymentStatus: string;
  confirmedAt?: string | null; startedAt?: string | null; completedAt?: string | null; deliveredAt?: string | null; cancelledAt?: string | null; cancellationReason?: string | null;
  customerRating?: number | null; customerFeedback?: string | null; finalPhotoUrls: string[]; specialInstructions?: string | null; internalNotes?: string | null;
  createdAt: string; updatedAt: string;
}

export type CakeOrderView = 'active' | 'today' | 'tomorrow' | 'late' | 'ready' | 'unpaid' | 'done' | 'all';
export interface CakeOrderQuery { view?: CakeOrderView; search?: string; from?: string; to?: string; deliveryType?: string; occasion?: string; sort?: 'due' | 'recent' | 'amount'; page?: number; limit?: number }
export interface CakeOrderPage { items: CakeOrder[]; total: number; page: number; pages: number; counts: Record<CakeOrderView, number>; totals: { value: number; due: number } | null }
export interface CountBucket { key: string; count: number; value: number }
export interface CakeOrderSummary {
  period: { from: string; to: string; grouping: 'day' | 'month' };
  open: { count: number; value: number; due: number; today: number; tomorrow: number; late: number; ready: number; unpaid: number; advanceShort: number };
  totals: { orders: number; value: number; collected: number; delivered: number; deliveredValue: number; cancelled: number; avgOrder: number; avgRating: number | null; rated: number };
  byDay: CountBucket[]; byHour: Array<{ hour: number; count: number }>; byStatus: CountBucket[]; byOccasion: CountBucket[]; byFlavor: CountBucket[]; bySize: CountBucket[]; byDelivery: CountBucket[];
}
export interface OrderBill { id: string; saleNumber: string; total: number; paidAmount: number; soldAt: string; status: string }
export interface OrderPayOptions { method?: OrderPayMethod; withBill?: boolean }

export interface BulkOrder {
  id: string; orderNumber: string; customerId?: string | null; organizationName: string; contactPerson?: string | null; contactPhone: string; contactEmail?: string | null;
  orderType: string; eventDate: string; eventTime?: string | null; venue?: string | null; totalGuests?: number | null; totalItems: number; items: unknown;
  quotedPrice: number; finalPrice?: number | null; advancePaid: number; khataPaid?: number; paidAmount: number; paymentStatus: string; status: BakeryOrderStatus;
  requiresDelivery: boolean; deliveryAddress?: string | null; requiresSetup: boolean; setupTime?: string | null; specialInstructions?: string | null;
  createdAt: string; updatedAt: string;
}
export type BulkView = 'active' | 'week' | 'late' | 'unpaid' | 'noAdvance' | 'done' | 'all';
export interface BulkQuery { view?: BulkView; search?: string; from?: string; to?: string; orderType?: string; sort?: 'due' | 'recent' | 'amount'; page?: number; limit?: number }
export interface BulkPage { items: BulkOrder[]; total: number; page: number; pages: number; counts: Record<BulkView, number>; totals: { value: number; due: number } | null }
export interface BulkSummary {
  period: { from: string; to: string };
  open: { count: number; value: number; due: number; week: number; late: number; noAdvance: number };
  totals: { orders: number; value: number; collected: number; delivered: number; avgOrder: number; guests: number; cancelled: number };
  byMonth: Array<{ key: string; count: number; value: number; guests: number }>;
  byType: Array<{ key: string; count: number; value: number; guests: number }>;
  byStatus: Array<{ key: string; count: number; value: number; guests: number }>;
  topItems: Array<{ key: string; qty: number; value: number }>;
}

export interface ProductionItem {
  id: string; productId?: string | null; productName: string; cakeOrderId?: string | null; plannedQty: number; producedQty: number; failedQty: number;
  unit?: string | null; bakerName?: string | null; status: string; batchNumber?: string | null; ovenNumber?: string | null; bakingTempC?: number | null;
  bakingDurationMin?: number | null; qualityNotes?: string | null; totalCost: number; notes?: string | null;
}
export interface ProductionPlan {
  id: string; planNumber: string; planDate: string; shift?: string | null; status: string; startedAt?: string | null; completedAt?: string | null;
  totalItems: number; completedItems: number; failedItems: number; totalCost: number; notes?: string | null; items: ProductionItem[];
}
export interface PlanItemInput { productId?: string; productName: string; cakeOrderId?: string; plannedQty: number; notes?: string }
export interface CompleteItemInput { producedQty: number; failedQty?: number; qualityNotes?: string; useIngredients?: boolean; addToStock?: boolean; freshHours?: number }
export interface SuggestRow { productId: string; name: string; unit: string; price: number; stock: number; avgDaily: number; weekdayAvg: number; expected: number; wasteRate: number; orders: number; orderRefs: string[]; freshLeft: number; planned: number; suggested: number }
export interface BakeSuggestion {
  date: string; days: number; basis: 'made' | 'guess'; rows: SuggestRow[];
  customCakes: Array<{ id: string; orderNumber: string; customerName: string; size: string; flavor: string; shape: string; neededBy: string; messageOnCake?: string | null; status: string }>;
  bulkOrders: Array<{ id: string; orderNumber: string; organizationName: string; eventDate: string }>;
  totals: { suggested: number; orders: number; planned: number };
}
interface Agg { planned: number; produced: number; failed: number }
export interface ProductionInsights {
  period: { from: string; to: string };
  totals: Agg & { plans: number; items: number; pending: number; failRate: number; doneRate: number; cost?: number };
  byProduct: Array<Agg & { name: string; productId: string | null; failRate: number; cost?: number }>;
  byDay: Array<Agg & { key: string }>;
  byShift: Array<Agg & { key: string; failRate: number }>;
  byBaker: Array<Agg & { key: string; failRate: number }>;
}

export interface Ingredient {
  id: string; name: string; category: string; code?: string | null; brand?: string | null; unit: string; currentStock: number; minStock: number; maxStock?: number | null;
  reorderLevel?: number | null; costPerUnit: number; lastPurchasePrice?: number | null; lastVendorName?: string | null; shelfLifeDays?: number | null;
  requiresRefrigeration: boolean; isCritical: boolean; supplierName?: string | null; supplierPhone?: string | null;
  totalPurchased: number; totalConsumed: number; totalWasted: number; isActive: boolean; notes?: string | null;
}
export interface RecipeCostLine { ingredientId: string; name: string; qty: number; unit: string; stock: number | null; missing: boolean; batches: number | null; cost?: { rate: number; savedRate: number; line: number; changed: boolean } }
export interface RecipeCost {
  productId: string; name: string; unit: string; price: number; isActive: boolean; image: string | null; yieldQty: number; lines: RecipeCostLine[];
  canMake: number | null; limiting: string | null; ratesChanged: number; missing: number;
  cost?: { batch: number; perUnit: number; current: number; diff: number }; margin?: { amount: number; pct: number | null };
}
export interface RecipeCosting { rows: RecipeCost[]; usedIn: Record<string, number>; totals: { recipes: number; lowMargin: number; costOff: number; missing: number } }
export type MovementKind = 'PURCHASE' | 'CONSUMPTION' | 'WASTE' | 'ADJUSTMENT';
export interface IngredientMovements {
  period: { from: string; to: string };
  rows: Array<{ id: string; transactionType: MovementKind; quantity: number; unit: string; cost?: number; reason?: string | null; notes?: string | null; createdAt: string; ingredient: { id: string; name: string; category: string } }>;
  totals: Record<MovementKind, { count: number; cost?: number }>;
  byIngredient: Array<{ id: string; name: string; used: number; wasted: number; bought: number; unit: string; cost?: number }>;
}
export interface IngredientTxn { id: string; transactionType: string; quantity: number; unit: string; totalCost?: number | null; reason?: string | null; notes?: string | null; createdAt: string }

export type FreshnessStatus = 'FRESH' | 'DAY_OLD' | 'NEAR_EXPIRY' | 'EXPIRED' | 'DISCARDED';
export interface FreshnessLog {
  id: string; productId: string; productName: string; batchNumber?: string | null; productionDate: string; bestBefore: string; expiryDate?: string | null;
  initialQty: number; currentQty: number; soldQty: number; wastedQty: number; discountedQty: number; unit?: string | null; status: FreshnessStatus;
}
export type WasteSource = 'BATCH' | 'BAKING' | 'RAW' | 'DAMAGE';
export interface WasteRow { id: string; source: WasteSource; at: string; name: string; productId: string | null; qty: number; unit: string; reason: string; cost?: number; ref: string | null }
export interface WasteBucket { key: string; count: number; qty: number; cost?: number }
export interface Wastage {
  period: { from: string; to: string }; rows: WasteRow[];
  totals: { count: number; cost?: number; pieces: number; made: number; wastePct: number | null };
  bySource: WasteBucket[]; byReason: WasteBucket[]; byItem: WasteBucket[]; byDay: WasteBucket[];
}

/** Bakery product profile (rates, recipe, shelf life, cake options). */
export type BakeryProfile = Record<string, unknown> & {
  id: string; productId: string; category?: BakeryCategory; requiresRefrigeration?: boolean; shelfLifeDays?: number | null; shelfLifeHours?: number | null;
  isCustomizable?: boolean; isCakeCustomizable?: boolean; numberOfSlices?: number | null; weightGrams?: number | null; pricePerSlice?: number | null;
  ingredients?: { yield?: number; lines?: RecipeLine[]; decorations?: string[]; custom?: { flavor?: string; shape?: string; cream?: string } } | null;
};

const get = <T>(path: string, params?: object) => apiClient.get<T>(path, { params }).then((r) => r.data);
const post = <T>(path: string, body?: object) => apiClient.post<T>(path, body ?? {}).then((r) => r.data);
const patch = <T>(path: string, body?: object) => apiClient.patch<T>(path, body ?? {}).then((r) => r.data);
const del = <T>(path: string) => apiClient.delete<T>(path).then((r) => r.data);

export const cakeOrdersApi = {
  create: (data: Record<string, unknown>) => post<CakeOrder>('/bakery/cake-orders', data),
  update: (id: string, data: Record<string, unknown>) => patch<CakeOrder>(`/bakery/cake-orders/${id}`, data),
  list: (params?: Record<string, string>) => get<CakeOrder[]>('/bakery/cake-orders', params),
  page: (q: CakeOrderQuery) => get<CakeOrderPage>('/bakery/cake-orders/page', q),
  summary: (range?: { from?: string; to?: string }) => get<CakeOrderSummary>('/bakery/cake-orders/summary', range),
  bill: (id: string) => get<OrderBill | null>(`/bakery/cake-orders/${id}/bill`),
  calendar: (from: string, to: string) => get<CakeOrder[]>('/bakery/cake-orders/calendar', { from, to }),
  getOne: (id: string) => get<CakeOrder>(`/bakery/cake-orders/${id}`),
  updateStatus: (id: string, status: string, cancellationReason?: string) => patch<CakeOrder>(`/bakery/cake-orders/${id}/status`, { status, cancellationReason }),
  refund: (id: string, managerPin?: string) => post<CakeOrder>(`/bakery/cake-orders/${id}/refund`, { managerPin }),
  /** `expectedPaid` is the paid amount the screen showed; the server refuses a repeat. */
  addPayment: (id: string, amount: number, expectedPaid?: number, opts?: OrderPayOptions) => post<CakeOrder>(`/bakery/cake-orders/${id}/payment`, { amount, expectedPaid, ...opts }),
  assign: (id: string, bakerId: string, decoratorId?: string) => post<CakeOrder>(`/bakery/cake-orders/${id}/assign`, { bakerId, decoratorId }),
  rate: (id: string, rating: number, feedback?: string) => post<CakeOrder>(`/bakery/cake-orders/${id}/rating`, { rating, feedback, photoUrls: [] }),
};

export const bulkOrdersApi = {
  create: (data: Record<string, unknown>) => post<BulkOrder>('/bakery/bulk-orders', data),
  list: (params?: Record<string, string>) => get<BulkOrder[]>('/bakery/bulk-orders', params),
  page: (q: BulkQuery) => get<BulkPage>('/bakery/bulk-orders/page', q),
  summary: (range?: { from?: string; to?: string }) => get<BulkSummary>('/bakery/bulk-orders/summary', range),
  bill: (id: string) => get<OrderBill | null>(`/bakery/bulk-orders/${id}/bill`),
  getOne: (id: string) => get<BulkOrder>(`/bakery/bulk-orders/${id}`),
  update: (id: string, data: Record<string, unknown>) => patch<BulkOrder>(`/bakery/bulk-orders/${id}`, data),
  updateStatus: (id: string, status: string) => patch<BulkOrder>(`/bakery/bulk-orders/${id}/status`, { status }),
  refund: (id: string, managerPin?: string) => post<BulkOrder>(`/bakery/bulk-orders/${id}/refund`, { managerPin }),
  payment: (id: string, amount: number, expectedPaid?: number, opts?: OrderPayOptions) => post<BulkOrder>(`/bakery/bulk-orders/${id}/payment`, { amount, expectedPaid, ...opts }),
};

export const productionApi = {
  createPlan: (data: { planDate: string; shift?: string; notes?: string; items: PlanItemInput[] }) => post<ProductionPlan>('/bakery/production/plans', data),
  listPlans: (params?: { from?: string; to?: string; status?: string }) => get<ProductionPlan[]>('/bakery/production/plans', params),
  today: () => get<ProductionPlan[]>('/bakery/production/today'),
  startPlan: (id: string) => post<ProductionPlan>(`/bakery/production/plans/${id}/start`),
  completePlan: (id: string) => post<ProductionPlan>(`/bakery/production/plans/${id}/complete`),
  suggest: (date?: string) => get<BakeSuggestion>('/bakery/production/suggest', { date }),
  insights: (range?: { from?: string; to?: string }) => get<ProductionInsights>('/bakery/production/insights', range),
  addItems: (planId: string, items: PlanItemInput[]) => post<ProductionPlan>(`/bakery/production/plans/${planId}/items`, { items }),
  removeItem: (itemId: string) => del<ProductionPlan>(`/bakery/production/items/${itemId}`),
  startBaking: (itemId: string, data: { bakingTempC?: number; ovenNumber?: string }) => post<ProductionItem>(`/bakery/production/items/${itemId}/start-baking`, data),
  completeItem: (itemId: string, data: CompleteItemInput) => post<ProductionItem & { warnings?: string[]; stockAdded?: number }>(`/bakery/production/items/${itemId}/complete`, data),
};

export const ingredientsApi = {
  create: (data: Partial<Ingredient>) => post<Ingredient>('/bakery/ingredients', data),
  list: (params?: { active?: string }) => get<Ingredient[]>('/bakery/ingredients', params),
  recipes: () => get<RecipeCosting>('/bakery/ingredients/recipes'),
  movements: (q?: { from?: string; to?: string; type?: MovementKind }) => get<IngredientMovements>('/bakery/ingredients/movements', q),
  transactions: (id: string) => get<IngredientTxn[]>(`/bakery/ingredients/${id}/transactions`),
  update: (id: string, data: Partial<Ingredient>) => patch<Ingredient>(`/bakery/ingredients/${id}`, data),
  /** Hides the material; history and recipes stay. */
  remove: (id: string) => del<Ingredient>(`/bakery/ingredients/${id}`),
  /** Goods received: stock and a supplier bill; the unpaid part goes on the supplier's khata. */
  purchase: (id: string, data: { quantity: number; costPerUnit: number; vendorName?: string; supplierId?: string; paymentMethod?: string; paidAmount?: number; shopId?: string }) =>
    post<Ingredient>(`/bakery/ingredients/${id}/purchase`, data),
  waste: (id: string, data: { quantity: number; reason: string }) => post<Ingredient>(`/bakery/ingredients/${id}/waste`, data),
  adjust: (id: string, data: { newStock: number; reason: string }) => post<Ingredient>(`/bakery/ingredients/${id}/adjust`, data),
};

export const freshnessApi = {
  create: (data: Partial<FreshnessLog>) => post<FreshnessLog>('/bakery/freshness', data),
  list: (params?: { active?: string; productId?: string }) => get<FreshnessLog[]>('/bakery/freshness', params),
  wastage: (range?: { from?: string; to?: string }) => get<Wastage>('/bakery/freshness/wastage', range),
  runCheck: () => post<{ checked?: number; expired?: number }>('/bakery/freshness/run-expiry-check'),
  sale: (id: string, qty: number) => post<FreshnessLog>(`/bakery/freshness/${id}/sale`, { qty }),
  discard: (id: string, qty: number, reason: string) => post<FreshnessLog>(`/bakery/freshness/${id}/discard`, { qty, reason }),
  discount: (id: string, qty: number) => post<FreshnessLog>(`/bakery/freshness/${id}/discount`, { qty }),
};

export const bakeryProductsApi = {
  upsert: (data: Record<string, unknown>) => post<BakeryProfile>('/bakery/products', data),
  list: () => get<BakeryProfile[]>('/bakery/products'),
  byProduct: (productId: string) => get<BakeryProfile | null>(`/bakery/products/by-product/${productId}`),
};
