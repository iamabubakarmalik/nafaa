/** Product import API: dry-run check, chunked run, price update, job history and the bulk editor. */

import { apiClient } from '@core/api/client';

/** A sheet row after column mapping; every cell is sent as text. */
export type ImportRow = { row: number } & Partial<Record<ImportField, string>>;

export type ImportField =
  | 'name' | 'sku' | 'barcode' | 'category' | 'brand' | 'unit' | 'description'
  | 'price' | 'costPrice' | 'wholesalePrice' | 'creditPrice' | 'taxRate' | 'stock' | 'lowStockAlert'
  | 'variant' | 'size' | 'color'
  | 'packName' | 'packQty' | 'packPrice' | 'packBarcode'
  | 'batchNumber' | 'expiryDate' | 'imei';

export type CreateStatus = 'new' | 'update' | 'skip' | 'error';

/** What happens to rows whose product is already in the shop. */
export type ExistingStockMode = 'add' | 'set' | 'skip';
export interface ExistingOptions { stock: ExistingStockMode; prices: boolean }
export type PriceStatus = 'change' | 'same' | 'error';

export interface RowCheck<S extends string = CreateStatus> {
  row: number;
  name: string;
  status: S;
  errors: string[];
  warnings: string[];
  /** First problem per field, shown in that cell. */
  fieldErrors?: Partial<Record<ImportField, string>>;
  /** Stock units the row adds in the branch (negative: removes). */
  stockQty?: number;
  /** Existing product (and variant) the row updates. */
  match?: string;
}

export interface PriceRowCheck extends RowCheck<PriceStatus> {
  target?: { kind: 'product' | 'variant' | 'pack'; id: string; label: string };
  price?: { from: number; to: number };
  /** Missing for users who may not see cost. */
  costPrice?: { from: number; to: number };
}

export interface CreateCheck {
  rows: RowCheck[];
  shop: { id: string; name: string } | null;
  summary: {
    total: number; ready: number; update: number; skip: number; error: number;
    products: number; variants: number; packs: number;
    newCategories: string[]; newBrands: string[];
    openingQty: number; saleValue: number;
    /** Stock units added / removed over all rows (new and existing). */
    stockUp: number; stockDown: number;
    /** Missing for users who may not see cost. */
    stockCost?: number;
  };
}

export interface PriceCheck {
  rows: PriceRowCheck[];
  summary: { total: number; change: number; same: number; error: number };
}

export type JobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'PARTIAL';

export interface ImportJob {
  id: string;
  jobType: 'PRODUCTS' | 'PRICE_UPDATE';
  fileName: string;
  totalRows: number;
  processedRows: number;
  successCount: number;
  errorCount: number;
  skipCount: number;
  status: JobStatus;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  userName?: string | null;
  created?: number;
  updated?: number;
  stockUnits?: number;
  productCount?: number;
  /** Failed rows kept with the job, ready to fix and import again. */
  failedSaved?: number;
}

export interface ImportJobDetail extends ImportJob {
  errors: Array<{ row: number; name: string; error: string }>;
  changes: Array<{ row: number; kind: string; name: string; price?: { from: number; to: number }; costPrice?: { from: number; to: number } }>;
  failedRows: Array<ImportRow & { error: string }>;
}

export interface RunChunk {
  rows: ImportRow[];
  fileName: string;
  totalRows: number;
  done: boolean;
  jobId?: string;
  shopId?: string;
  existing?: ExistingOptions;
}

export interface CreateRun { jobId: string; job: ImportJob; results: Array<RowCheck & { productId?: string }> }
export interface PriceRun { jobId: string; job: ImportJob; results: PriceRowCheck[] }

export interface PriceSheetRow {
  name: string; variant: string; packName: string; category: string; sku: string; barcode: string; price: number; costPrice?: number;
}

const unwrap = <T,>(res: { data: unknown }): T => {
  const d = res.data as { data?: T } | T;
  return (d && typeof d === 'object' && 'data' in d ? (d as { data: T }).data : d) as T;
};

export const importApi = {
  check: (rows: ImportRow[], shopId: string | undefined, existing: ExistingOptions, signal?: AbortSignal) =>
    apiClient.post('/products/bulk-import/check', { rows, shopId, existing }, { signal }).then(unwrap<CreateCheck>),
  run: (chunk: RunChunk) =>
    apiClient.post('/products/bulk-import/run', chunk).then(unwrap<CreateRun>),
  checkPrices: (rows: ImportRow[], signal?: AbortSignal) =>
    apiClient.post('/products/bulk-import/prices/check', { rows }, { signal }).then(unwrap<PriceCheck>),
  runPrices: (chunk: RunChunk) =>
    apiClient.post('/products/bulk-import/prices/run', chunk).then(unwrap<PriceRun>),
  priceSheet: () =>
    apiClient.get('/products/bulk-import/prices/sheet').then(unwrap<{ rows: PriceSheetRow[] }>),
  jobs: () => apiClient.get('/products/bulk-import/jobs').then(unwrap<ImportJob[]>),
  job: (id: string) => apiClient.get(`/products/bulk-import/jobs/${id}`).then(unwrap<ImportJobDetail>),
  categories: () =>
    apiClient.get('/products/bulk-import/reference-data').then(unwrap<{ categories: Array<{ id: string; name: string }>; brands: Array<{ id: string; name: string }> }>),
};

/* ─── Bulk editor ─── */

export interface BulkEditRow {
  productId: string;
  variantId: string | null;
  name: string;
  variant: string;
  category: string;
  brand: string;
  price: number;
  /** Missing for users who may not see cost. */
  costPrice?: number;
  /** Empty (null) means the retail price applies. */
  wholesalePrice?: number | null;
  creditPrice?: number | null;
  unit: string;
  sku: string;
  barcode: string;
  lowStockAlert: number;
  isActive: boolean;
  stock: number;
  stockLock: 'variants' | 'imei' | 'service' | null;
}

export interface BulkEditSheet {
  shop: { id: string; name: string } | null;
  job: { id: string; fileName: string } | null;
  truncated: boolean;
  rows: BulkEditRow[];
  categories: Array<{ id: string; name: string }>;
  brands: string[];
}

export interface BulkEditChange {
  productId: string;
  variantId?: string;
  name?: string;
  category?: string;
  brand?: string;
  price?: number;
  costPrice?: number;
  /** null clears the price so the retail price applies. */
  wholesalePrice?: number | null;
  creditPrice?: number | null;
  unit?: string;
  barcode?: string;
  lowStockAlert?: number;
  isActive?: boolean;
}

export interface BulkEditSaveResult {
  saved: number;
  failed: number;
  results: Array<{ productId: string; variantId: string | null; ok: boolean; error?: string }>;
}

export const bulkEditApi = {
  rows: (q: { shopId?: string; categoryId?: string; lowStock?: boolean; noCost?: boolean; jobId?: string; search?: string }) =>
    apiClient.get('/products/bulk-edit/rows', {
      params: { ...q, lowStock: q.lowStock ? '1' : undefined, noCost: q.noCost ? '1' : undefined, categoryId: q.categoryId || undefined, jobId: q.jobId || undefined, search: q.search || undefined },
    }).then(unwrap<BulkEditSheet>),
  save: (changes: BulkEditChange[]) =>
    apiClient.post('/products/bulk-edit/save', { changes }).then(unwrap<BulkEditSaveResult>),
  /** Stock set to a counted number: the server posts the difference as an adjustment. */
  setStock: (shopId: string, items: Array<{ productId: string; variantId?: string; counted: number }>) =>
    apiClient.post('/stock-adjustments/count', { shopId, reason: 'Bulk edit', note: 'Bulk edit (spreadsheet)', items })
      .then(unwrap<{ groupRef: string; checked: number; changed: number; gained: number; lost: number; net: number }>),
};
