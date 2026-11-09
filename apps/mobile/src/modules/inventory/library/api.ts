/** Product library API (same endpoints as the web): ready-made products for the shop's industry. */

import { apiClient } from '@/core/api/client';

export interface LibraryCount { name: string; count: number }

export interface LibraryMeta {
  library: string;
  label: string;
  available: boolean;
  kind?: 'pharmacy' | 'generic';
  total?: number;
  categories?: LibraryCount[];
  companies?: LibraryCount[];
  estimates?: boolean;
  source?: string;
  updated?: string | null;
  openFoodFacts?: boolean;
  defaultMargin?: number | null;
  libraries: Array<{ key: string; label: string; count: number }>;
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
  salts?: Array<{ name: string; strength: string | null }>;
  formulaKey?: string | null;
  form?: string | null;
  pack?: string | null;
  alreadyAdded: boolean;
  sameFormula?: number;
}

export interface LibraryFilters { library?: string; q?: string; category?: string; manufacturer?: string; formula?: string }

export interface LibraryPage { items: LibraryItem[]; total: number; page: number; pages: number }

export interface LibraryJob {
  id: string;
  status: 'running' | 'done' | 'failed';
  total: number;
  done: number;
  created: number;
  skipped: number;
  needsPrice: number;
  barcodeDuplicates: number;
  barcodesGenerated: number;
  saltsCreated: number;
  error?: string;
}

const clean = (f: object) => Object.fromEntries(Object.entries(f).filter(([, v]) => v !== undefined && v !== ''));

export const libraryApi = {
  meta: (library?: string) => apiClient.get<LibraryMeta>('/products/library/meta', { params: clean({ library }) }).then((r) => r.data),
  items: (f: LibraryFilters, page: number) =>
    apiClient.get<LibraryPage>('/products/library/items', { params: clean({ ...f, page, pageSize: 40 }) }).then((r) => r.data),
  startImport: (body: {
    library?: string; ids?: string[]; all?: LibraryFilters; marginPercent?: number; shopId?: string; openingStock?: number;
    prices?: Record<string, { price?: number }>; generateBarcodes?: boolean;
  }) => apiClient.post<LibraryJob>('/products/library/import', body).then((r) => r.data),
  job: (id: string) => apiClient.get<LibraryJob>(`/products/library/import/${id}`).then((r) => r.data),
};
