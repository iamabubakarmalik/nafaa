/** Product import API: dry-run check, chunked run, price update and job history. */

import { apiClient } from '@core/api/client';

/** A sheet row after column mapping; every cell is sent as text. */
export type ImportRow = { row: number } & Partial<Record<ImportField, string>>;

export type ImportField =
  | 'name' | 'sku' | 'barcode' | 'category' | 'brand' | 'unit' | 'description'
  | 'price' | 'costPrice' | 'wholesalePrice' | 'taxRate' | 'stock' | 'lowStockAlert'
  | 'variant' | 'size' | 'color'
  | 'packName' | 'packQty' | 'packPrice' | 'packBarcode'
  | 'batchNumber' | 'expiryDate';

export type CreateStatus = 'new' | 'skip' | 'error';
export type PriceStatus = 'change' | 'same' | 'error';

export interface RowCheck<S extends string = CreateStatus> {
  row: number;
  name: string;
  status: S;
  errors: string[];
  warnings: string[];
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
    total: number; ready: number; skip: number; error: number;
    products: number; variants: number; packs: number;
    newCategories: string[]; newBrands: string[];
    openingQty: number; saleValue: number;
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
}

export interface ImportJobDetail extends ImportJob {
  errors: Array<{ row: number; name: string; error: string }>;
  changes: Array<{ row: number; kind: string; name: string; price?: { from: number; to: number }; costPrice?: { from: number; to: number } }>;
}

export interface RunChunk {
  rows: ImportRow[];
  fileName: string;
  totalRows: number;
  done: boolean;
  jobId?: string;
  shopId?: string;
}

export interface CreateRun { jobId: string; job: ImportJob; results: RowCheck[] }
export interface PriceRun { jobId: string; job: ImportJob; results: PriceRowCheck[] }

export interface PriceSheetRow {
  name: string; variant: string; packName: string; category: string; sku: string; barcode: string; price: number; costPrice?: number;
}

const unwrap = <T,>(res: { data: unknown }): T => {
  const d = res.data as { data?: T } | T;
  return (d && typeof d === 'object' && 'data' in d ? (d as { data: T }).data : d) as T;
};

export const importApi = {
  check: (rows: ImportRow[], shopId?: string) =>
    apiClient.post('/products/bulk-import/check', { rows, shopId }).then(unwrap<CreateCheck>),
  run: (chunk: RunChunk) =>
    apiClient.post('/products/bulk-import/run', chunk).then(unwrap<CreateRun>),
  checkPrices: (rows: ImportRow[]) =>
    apiClient.post('/products/bulk-import/prices/check', { rows }).then(unwrap<PriceCheck>),
  runPrices: (chunk: RunChunk) =>
    apiClient.post('/products/bulk-import/prices/run', chunk).then(unwrap<PriceRun>),
  priceSheet: () =>
    apiClient.get('/products/bulk-import/prices/sheet').then(unwrap<{ rows: PriceSheetRow[] }>),
  jobs: () => apiClient.get('/products/bulk-import/jobs').then(unwrap<ImportJob[]>),
  job: (id: string) => apiClient.get(`/products/bulk-import/jobs/${id}`).then(unwrap<ImportJobDetail>),
  categories: () =>
    apiClient.get('/products/bulk-import/reference-data').then(unwrap<{ categories: Array<{ id: string; name: string }> }>),
};
