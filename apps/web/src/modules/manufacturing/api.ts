/**
 * Manufacturing API: recipes (bill of materials) per product, production
 * runs with preview and reversal, the dashboard summary and the report.
 * Cost figures are left out by the server for staff without cost.view.
 */

import { apiClient } from '@core/api/client';

const unwrap = <T>(res: any): T => (res?.data?.data !== undefined ? res.data.data : res?.data);

export interface RecipeLine {
  id: string;
  productId: string;
  name: string;
  stockUnit: string;
  isActive: boolean;
  quantity: number;
  unitName: string;
  unitId: string | null;
  packRate: number | null;
  notes: string | null;
  /** Base units per batch, wastage included. */
  baseQty: number;
  unitCost?: number;
  lineCost?: number;
  stock: number;
  unitOk: boolean;
}

export interface Recipe {
  id: string;
  productId: string;
  product: {
    id: string; name: string; unit: string; sku: string | null; isActive: boolean; image: string | null; category: string | null;
    price: number; wholesalePrice: number | null; creditPrice: number | null; costPrice?: number; stock: number; lowStockAlert: number;
  };
  yieldQty: number;
  wastagePercent: number;
  packingCost?: number;
  labourCost?: number;
  overheadCost?: number;
  makeOnSale: boolean;
  isActive: boolean;
  notes: string | null;
  updatedAt: string;
  lines: RecipeLine[];
  batchCost?: number;
  materialCost?: number;
  extraCost?: number;
  unitCost?: number;
  margins?: { retail: number | null; wholesale: number | null; credit: number | null };
  canMake: { batches: number; units: number; limitedBy: string | null };
  badUnits: string[];
}

export interface RecipeInput {
  yieldQty: number;
  wastagePercent: number;
  packingCost: number;
  labourCost: number;
  overheadCost: number;
  makeOnSale: boolean;
  isActive: boolean;
  notes?: string;
  lines: Array<{ productId: string; quantity: number; unitName: string; unitId: string | null }>;
}

export interface ProduceItem { productId: string; quantity?: number; batches?: number; batchNumber?: string; expiryDate?: string }

export interface Preview {
  shopId: string;
  items: Array<{
    productId: string; name: string; unit: string; quantity: number; batches: number; yieldQty: number;
    materialCost?: number; extraCost?: number; totalCost?: number; unitCost?: number; price: number; margin?: number | null; badUnits: string[];
  }>;
  materials: Array<{ productId: string; name: string; unit: string; need: number; cost?: number; have: number; short: number }>;
  totalCost?: number;
  shortCount: number;
  allowNegative: boolean;
  canProduce: boolean;
}

export interface RunRow {
  id: string; runNumber: string; productId: string; name: string; unit: string;
  quantity: number; batches: number; unitCost?: number; totalCost?: number; materialCost?: number; extraCost?: number;
  status: 'DONE' | 'REVERSED'; source: 'MANUAL' | 'SALE' | 'AI'; reference: string | null;
  batchNumber: string | null; expiryDate: string | null; lines: number; createdAt: string; createdBy: string | null; shop: string | null; reversedAt: string | null;
}

export interface RunDetail extends Omit<RunRow, 'lines'> {
  price: number; wastagePercent: number; margin?: number | null; notes: string | null;
  reversedBy: string | null; reverseReason: string | null;
  lines: Array<{ productId: string; name: string; unit: string; quantity: number; unitCost?: number; totalCost?: number }>;
}

export interface RunsQuery { from?: string; to?: string; productId?: string; status?: string; source?: string; search?: string; page?: number; limit?: number }

export interface Summary {
  today: { runs: number; quantity: number; totalCost?: number; items: Array<{ productId: string; name: string; unit: string; quantity: number; totalCost?: number; runs: number }> };
  recipes: { total: number; active: number; makeOnSale: number };
  lowRaw: Array<{ productId: string; name: string; unit: string; stock: number; perBatch: number; usedIn: string[] }>;
  top: Recipe[];
}

export interface Report {
  from: string | null; to: string;
  totals: { runs: number; quantity: number; totalCost?: number; materialCost?: number; extraCost?: number; wastageCost?: number };
  products: Array<{ productId: string; name: string; unit: string; quantity: number; totalCost?: number; runs: number; wastageCost?: number; madeOnSale: number; avgUnitCost?: number }>;
  materials: Array<{ productId: string; name: string; unit: string; quantity: number; totalCost?: number }>;
  days: Array<{ day: string; quantity: number; totalCost?: number }>;
  costTrend?: Array<{ productId: string; name: string; points: Array<{ day: string; unitCost?: number }> }>;
  sales: Array<{ productId: string; name: string; quantity: number; revenue: number; cost?: number; profit?: number; margin?: number | null }>;
}

export const MFG_KEY = 'manufacturing';

export const manufacturingApi = {
  summary: () => apiClient.get('/manufacturing/summary').then((r) => unwrap<Summary>(r)),
  report: (q: { from?: string; to?: string }) => apiClient.get('/manufacturing/report', { params: q }).then((r) => unwrap<Report>(r)),
  recipes: (search?: string) => apiClient.get('/manufacturing/recipes', { params: { search: search || undefined } }).then((r) => unwrap<Recipe[]>(r)),
  recipe: (productId: string) => apiClient.get(`/manufacturing/recipes/${productId}`).then((r) => unwrap<{ product: { id: string; name: string; unit: string; price: number; wholesalePrice: number | null; creditPrice: number | null; hasVariants: boolean }; recipe: Recipe | null }>(r)),
  saveRecipe: (productId: string, body: RecipeInput) => apiClient.put(`/manufacturing/recipes/${productId}`, body).then((r) => unwrap<{ recipe: Recipe | null }>(r)),
  deleteRecipe: (productId: string) => apiClient.delete(`/manufacturing/recipes/${productId}`).then((r) => unwrap<{ ok: boolean }>(r)),
  preview: (body: { items: ProduceItem[]; shopId?: string }) => apiClient.post('/manufacturing/preview', body).then((r) => unwrap<Preview>(r)),
  produce: (body: { items: ProduceItem[]; shopId?: string; notes?: string }) =>
    apiClient.post('/manufacturing/runs', body).then((r) => unwrap<{ shopId: string; runs: Array<{ id: string; runNumber: string; name: string; quantity: number; unitCost?: number; totalCost?: number }> }>(r)),
  runs: (q: RunsQuery) => apiClient.get('/manufacturing/runs', { params: q }).then((r) => unwrap<{ items: RunRow[]; total: number; page: number; limit: number; totals: { runs: number; totalCost?: number } }>(r)),
  run: (id: string) => apiClient.get(`/manufacturing/runs/${id}`).then((r) => unwrap<RunDetail>(r)),
  reverse: (id: string, reason?: string) => apiClient.post(`/manufacturing/runs/${id}/reverse`, { reason }).then((r) => unwrap<RunDetail>(r)),
  makeOnSale: () => apiClient.get('/manufacturing/make-on-sale').then((r) => unwrap<string[]>(r)),
};

/** "12", "2.5" — no trailing zeros. */
export const qty = (n: number | null | undefined) => String(Number(Number(n ?? 0).toFixed(3)));

/** Error text from an API failure. */
export const errText = (e: unknown, fallback = 'Nahi hua') =>
  (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message?.toString() || (e as Error)?.message || fallback;
