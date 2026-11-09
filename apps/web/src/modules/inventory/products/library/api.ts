/**
 * Product library API: ready-made products for the shop's industry, searched
 * and paged on the server, imported as normal products in a background job.
 */

import { apiClient } from '@core/api/client';

export interface LibraryCount { name: string; count: number }

export interface LibraryMeta {
  library: string;
  label: string;
  businessType: string | null;
  available: boolean;
  kind?: 'pharmacy' | 'generic';
  total?: number;
  categories?: LibraryCount[];
  companies?: LibraryCount[];
  forms?: LibraryCount[];
  needsPrice?: number;
  withBarcode?: number;
  estimates?: boolean;
  source?: string;
  updated?: string | null;
  openFoodFacts?: boolean;
  defaultMargin?: number | null;
  libraries: Array<{ key: string; label: string; count: number; kind: 'pharmacy' | 'generic' }>;
}

export interface LibraryItem {
  id: string;
  name: string;
  company: string | null;
  category: string | null;
  unit: string;
  price: number;
  costPrice: number | null;
  needsPrice?: boolean;
  barcode?: string | null;
  imageUrl?: string | null;
  tags?: string[];
  formula?: string | null;
  salts?: Array<{ name: string; strength: string | null }>;
  formulaKey?: string | null;
  form?: string | null;
  pack?: string | null;
  packQty?: number | null;
  regNo?: string | null;
  drapCategory?: string | null;
  alreadyAdded: boolean;
  /** Medicines in the library with the same salts and strength (this one included). */
  sameFormula?: number;
}

export interface LibraryFilters {
  library?: string;
  q?: string;
  category?: string;
  manufacturer?: string;
  formula?: string;
  form?: string;
}

export interface LibraryPage {
  library: string;
  items: LibraryItem[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
}

export interface LibraryImportBody {
  library?: string;
  ids?: string[];
  all?: LibraryFilters;
  marginPercent?: number;
  roundTo?: number;
  shopId?: string;
  openingStock?: number;
  prices?: Record<string, { price?: number; costPrice?: number }>;
  /** Barcode to put on a picked item (a scan that matched nothing). */
  barcodes?: Record<string, string>;
  generateBarcodes?: boolean;
}

export interface LibraryJob {
  id: string;
  library: string;
  status: 'running' | 'done' | 'failed';
  total: number;
  done: number;
  created: number;
  skipped: number;
  needsPrice: number;
  barcodeDuplicates: number;
  barcodesGenerated: number;
  brandsCreated: number;
  categoriesCreated: number;
  saltsCreated: number;
  errors: Array<{ name: string; error: string }>;
  error?: string;
}

/** Drops empty filters so the query string stays short. */
const clean = (f: object) => Object.fromEntries(Object.entries(f).filter(([, v]) => v !== undefined && v !== ''));

export const libraryApi = {
  meta: (library?: string) =>
    apiClient.get<LibraryMeta>('/products/library/meta', { params: clean({ library }) }).then((r) => r.data),
  items: (f: LibraryFilters, page: number, pageSize = 50) =>
    apiClient.get<LibraryPage>('/products/library/items', { params: clean({ ...f, page, pageSize }) }).then((r) => r.data),
  byBarcode: (code: string) =>
    apiClient.get<{ items: Array<LibraryItem & { library: string }> }>(`/products/library/barcode/${encodeURIComponent(code)}`).then((r) => r.data.items),
  startImport: (body: LibraryImportBody) =>
    apiClient.post<LibraryJob>('/products/library/import', body).then((r) => r.data),
  job: (id: string) =>
    apiClient.get<LibraryJob>(`/products/library/import/${id}`).then((r) => r.data),
};
