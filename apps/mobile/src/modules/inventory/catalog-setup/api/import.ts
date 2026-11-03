/** Product import and bulk edit (same endpoints as the web): dry-run check, chunked run, price update, job history, bulk editor rows and save. */

import { apiClient } from '@/core/api/client';
import { msg } from '@/core/i18n';

export type ImportRow = { row: number } & Partial<Record<ImportField, string>>;
export type ImportField =
  | 'name' | 'sku' | 'barcode' | 'category' | 'brand' | 'unit' | 'description'
  | 'price' | 'costPrice' | 'wholesalePrice' | 'creditPrice' | 'taxRate' | 'stock' | 'lowStockAlert'
  | 'variant' | 'size' | 'color'
  | 'packName' | 'packQty' | 'packPrice' | 'packBarcode'
  | 'batchNumber' | 'expiryDate' | 'imei';
export type CreateStatus = 'new' | 'update' | 'skip' | 'error';
export type ExistingStockMode = 'add' | 'set' | 'skip';
export interface ExistingOptions { stock: ExistingStockMode; prices: boolean }
export type PriceStatus = 'change' | 'same' | 'error';

export interface RowCheck<S extends string = CreateStatus> {
  row: number; name: string; status: S; errors: string[]; warnings: string[];
  fieldErrors?: Partial<Record<ImportField, string>>; stockQty?: number; match?: string;
}
export interface PriceRowCheck extends RowCheck<PriceStatus> {
  target?: { kind: 'product' | 'variant' | 'pack'; id: string; label: string };
  price?: { from: number; to: number };
  costPrice?: { from: number; to: number };
}
export interface CreateCheck {
  rows: RowCheck[];
  shop: { id: string; name: string } | null;
  summary: {
    total: number; ready: number; update: number; skip: number; error: number; products: number; variants: number; packs: number;
    newCategories: string[]; newBrands: string[]; openingQty: number; saleValue: number; stockUp: number; stockDown: number; stockCost?: number;
  };
}
export interface PriceCheck { rows: PriceRowCheck[]; summary: { total: number; change: number; same: number; error: number } }
export type JobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'PARTIAL';
export interface ImportJob {
  id: string; jobType: 'PRODUCTS' | 'PRICE_UPDATE'; fileName: string; totalRows: number; processedRows: number; successCount: number; errorCount: number;
  skipCount: number; status: JobStatus; startedAt: string | null; completedAt: string | null; createdAt: string; updatedAt: string; userName?: string | null;
  created?: number; updated?: number; stockUnits?: number; productCount?: number; failedSaved?: number;
}
export interface ImportJobDetail extends ImportJob {
  errors: Array<{ row: number; name: string; error: string }>;
  changes: Array<{ row: number; kind: string; name: string; price?: { from: number; to: number }; costPrice?: { from: number; to: number } }>;
  failedRows: Array<ImportRow & { error: string }>;
}
export interface RunChunk { rows: ImportRow[]; fileName: string; totalRows: number; done: boolean; jobId?: string; shopId?: string; existing?: ExistingOptions }
export interface CreateRun { jobId: string; job: ImportJob; results: Array<RowCheck & { productId?: string }> }
export interface PriceRun { jobId: string; job: ImportJob; results: PriceRowCheck[] }
export interface PriceSheetRow { name: string; variant: string; packName: string; category: string; sku: string; barcode: string; price: number; costPrice?: number }

export const importApi = {
  check: (rows: ImportRow[], shopId: string | undefined, existing: ExistingOptions) =>
    apiClient.post<CreateCheck>('/products/bulk-import/check', { rows, shopId, existing }, { timeout: 120_000 }).then((r) => r.data),
  run: (chunk: RunChunk) => apiClient.post<CreateRun>('/products/bulk-import/run', chunk, { timeout: 120_000 }).then((r) => r.data),
  checkPrices: (rows: ImportRow[]) => apiClient.post<PriceCheck>('/products/bulk-import/prices/check', { rows }, { timeout: 120_000 }).then((r) => r.data),
  runPrices: (chunk: RunChunk) => apiClient.post<PriceRun>('/products/bulk-import/prices/run', chunk, { timeout: 120_000 }).then((r) => r.data),
  priceSheet: () => apiClient.get<{ rows: PriceSheetRow[] }>('/products/bulk-import/prices/sheet').then((r) => r.data),
  jobs: () => apiClient.get<ImportJob[]>('/products/bulk-import/jobs').then((r) => r.data),
  job: (id: string) => apiClient.get<ImportJobDetail>(`/products/bulk-import/jobs/${id}`).then((r) => r.data),
  businessFeatures: () => apiClient.get<{ features?: Record<string, boolean>; businessFeatures?: Record<string, boolean> }>('/onboarding/business-config')
    .then((r) => ({ ...(r.data?.businessFeatures ?? {}), ...(r.data?.features ?? {}) })),
};

export interface BulkEditRow {
  productId: string; variantId: string | null; name: string; variant: string; category: string; brand: string; price: number; costPrice?: number;
  wholesalePrice?: number | null; creditPrice?: number | null; unit: string; sku: string; barcode: string; lowStockAlert: number; isActive: boolean; stock: number;
  stockLock: 'variants' | 'imei' | 'service' | null;
}
export interface BulkEditSheet {
  shop: { id: string; name: string } | null; job: { id: string; fileName: string } | null; truncated: boolean; rows: BulkEditRow[];
  categories: Array<{ id: string; name: string }>; brands: string[];
}
export interface BulkEditChange {
  productId: string; variantId?: string; name?: string; category?: string; brand?: string; price?: number; costPrice?: number;
  wholesalePrice?: number | null; creditPrice?: number | null; unit?: string; barcode?: string; lowStockAlert?: number; isActive?: boolean;
}
export interface BulkEditSaveResult { saved: number; failed: number; results: Array<{ productId: string; variantId: string | null; ok: boolean; error?: string }> }

export const bulkEditApi = {
  rows: (q: { shopId?: string; categoryId?: string; lowStock?: boolean; noCost?: boolean; jobId?: string; search?: string }) =>
    apiClient.get<BulkEditSheet>('/products/bulk-edit/rows', {
      params: { ...q, lowStock: q.lowStock ? '1' : undefined, noCost: q.noCost ? '1' : undefined, categoryId: q.categoryId || undefined, jobId: q.jobId || undefined, search: q.search || undefined },
    }).then((r) => r.data),
  save: (changes: BulkEditChange[]) => apiClient.post<BulkEditSaveResult>('/products/bulk-edit/save', { changes }).then((r) => r.data),
  /** Stock set to a counted number: the server posts the difference as an adjustment. */
  setStock: (shopId: string, items: Array<{ productId: string; variantId?: string; counted: number }>) =>
    apiClient.post<{ changed: number }>('/stock-adjustments/count', { shopId, reason: msg('Bulk edit'), note: msg('Bulk edit (spreadsheet)'), items }).then((r) => r.data),
};
