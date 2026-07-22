import { apiClient } from './client';

export type PosSearchItemType = 'product' | 'roll' | 'cut_piece' | 'imei';

export interface PosSearchResult {
  type: PosSearchItemType;
  // Common
  id: string;
  name: string;
  productId: string;
  productName: string;
  variantId?: string | null;
  variantName?: string | null;
  variantColorHex?: string | null;
  variantImage?: string | null;
  price: number;
  unit: string;
  categoryName?: string | null;
  categoryColor?: string | null;
  primaryImage?: string | null;
  hasVariants?: boolean;

  // Product-specific
  stock?: number;
  lowStockAlert?: number;
  isFeatured?: boolean;
  wholesalePrice?: number | null;
  sku?: string | null;
  barcode?: string | null;

  // Roll-specific
  rollNumber?: string;
  designCode?: string | null;
  widthFt?: number;
  widthInch?: number;
  remainingLengthFt?: number;
  remainingLengthInch?: number;
  remainingSqft?: number;
  salePricePerSqft?: number;
  wholesalePricePerSqft?: number | null;
  rackNumber?: string | null;

  // Cut piece-specific
  pieceCode?: string;
  cutWidthFt?: number;
  cutLengthFt?: number;
  cutTotalSqft?: number;
  sourceRollNumber?: string | null;
  condition?: string | null;

  // IMEI-specific
  imei1?: string;
  imei2?: string | null;
  ptaStatus?: string;
}

function unwrapArr<T>(res: any): T[] {
  const body = res?.data;
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.data)) return body.data;
  if (Array.isArray(body?.items)) return body.items;
  return [];
}

export const posSearchApi = {
  /**
   * Universal search — returns products, rolls, cut pieces, IMEIs in one call.
   * Backend indexed for < 50ms response.
   */
  search: (query: string, limit = 50): Promise<PosSearchResult[]> =>
    apiClient
      .get('/pos/universal-search', { params: { q: query, limit } })
      .then((r) => unwrapArr<PosSearchResult>(r))
      .catch(() => []),
};
