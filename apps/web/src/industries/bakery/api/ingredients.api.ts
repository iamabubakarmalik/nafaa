import { apiClient } from '@core/api/client';

export interface Ingredient {
  id: string;
  name: string;
  category: string;
  code?: string;
  brand?: string;
  unit: string;
  currentStock: number;
  minStock: number;
  maxStock?: number;
  reorderLevel?: number;
  costPerUnit: number;
  lastPurchaseDate?: string;
  lastPurchasePrice?: number;
  lastVendorName?: string;
  shelfLifeDays?: number;
  storageMethod?: string;
  requiresRefrigeration: boolean;
  isCritical: boolean;
  isOrganic: boolean;
  isImported: boolean;
  countryOfOrigin?: string;
  supplierName?: string;
  supplierPhone?: string;
  totalPurchased: number;
  totalConsumed: number;
  totalWasted: number;
  isActive: boolean;
  imageUrl?: string;
  notes?: string;
  transactions?: any[];
  createdAt: string;
  updatedAt: string;
}

export interface RecipeCostLine {
  ingredientId: string;
  name: string;
  qty: number;
  unit: string;
  stock: number | null;
  missing: boolean;
  batches: number | null;
  /** Left out for staff who may not see costs. */
  cost?: { rate: number; savedRate: number; line: number; changed: boolean };
}

export interface RecipeCost {
  productId: string;
  name: string;
  unit: string;
  price: number;
  isActive: boolean;
  image: string | null;
  yieldQty: number;
  lines: RecipeCostLine[];
  updatedAt: string;
  canMake: number | null;
  limiting: string | null;
  ratesChanged: number;
  missing: number;
  cost?: { batch: number; perUnit: number; current: number; diff: number };
  margin?: { amount: number; pct: number | null };
}

export interface RecipeCosting {
  rows: RecipeCost[];
  usedIn: Record<string, number>;
  totals: { recipes: number; lowMargin: number; costOff: number; missing: number };
}

export type MovementKind = 'PURCHASE' | 'CONSUMPTION' | 'WASTE' | 'ADJUSTMENT';

export interface IngredientMovements {
  period: { from: string; to: string };
  rows: Array<{
    id: string; transactionType: MovementKind; quantity: number; unit: string; costPerUnit?: number | null; cost?: number;
    reason?: string | null; notes?: string | null; batchNumber?: string | null; createdAt: string;
    ingredient: { id: string; name: string; category: string };
  }>;
  totals: Record<MovementKind, { count: number; cost?: number }>;
  byDay: Array<{ key: string; cost?: Record<MovementKind, number> }>;
  byIngredient: Array<{ id: string; name: string; used: number; wasted: number; bought: number; unit: string; cost?: number }>;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const ingredientsApi = {
  create: (data: Partial<Ingredient>) => apiClient.post('/bakery/ingredients', data).then(unwrap<Ingredient>),
  list: (params?: any) => apiClient.get('/bakery/ingredients', { params }).then(unwrap<Ingredient[]>),
  lowStock: () => apiClient.get('/bakery/ingredients/low-stock').then(unwrap<Ingredient[]>),
  recipes: () => apiClient.get('/bakery/ingredients/recipes').then(unwrap<RecipeCosting>),
  movements: (q?: { from?: string; to?: string; type?: MovementKind }) => apiClient.get('/bakery/ingredients/movements', { params: q }).then(unwrap<IngredientMovements>),
  getOne: (id: string) => apiClient.get('/bakery/ingredients/' + id).then(unwrap<Ingredient>),
  transactions: (id: string) => apiClient.get('/bakery/ingredients/' + id + '/transactions').then(unwrap<any[]>),
  update: (id: string, data: Partial<Ingredient>) => apiClient.patch('/bakery/ingredients/' + id, data).then(unwrap<Ingredient>),
  /** Hides the material; history and recipes stay. */
  remove: (id: string) => apiClient.delete('/bakery/ingredients/' + id).then(unwrap<Ingredient>),
  /**
   * Saamaan aaya. Sirf stock nahi — paisa bhi darj hota hai.
   * `paidAmount` na bhejein to poora diya hua mana jayega; jo baqi
   * rahe wo supplier ke khate me chala jata hai (is liye udhaar par
   * `supplierId` zaroori hai).
   */
  purchase: (id: string, data: {
    quantity: number; costPerUnit: number;
    vendorName?: string; notes?: string;
    supplierId?: string; paymentMethod?: string;
    paidAmount?: number; shopId?: string;
  }) =>
    apiClient.post('/bakery/ingredients/' + id + '/purchase', data).then(unwrap<Ingredient>),
  consume: (id: string, data: { quantity: number; productionItemId?: string; cakeOrderId?: string; batchNumber?: string; notes?: string }) =>
    apiClient.post('/bakery/ingredients/' + id + '/consume', data).then(unwrap<Ingredient>),
  waste: (id: string, data: { quantity: number; reason: string }) =>
    apiClient.post('/bakery/ingredients/' + id + '/waste', data).then(unwrap<Ingredient>),
  adjust: (id: string, data: { newStock: number; reason: string }) =>
    apiClient.post('/bakery/ingredients/' + id + '/adjust', data).then(unwrap<Ingredient>),
};
