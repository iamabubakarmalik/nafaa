import { apiClient } from './client';

export type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
export type IndustryType = 'STANDARD' | 'CARPET' | 'MOBILE' | 'WEIGHT_BASED';

export interface StockReportRow {
  productId: string;
  productName: string;
  sku?: string | null;
  barcode?: string | null;
  unit: string;
  category?: string | null;
  categoryColor?: string | null;
  brand?: string | null;

  costPrice: number;
  salePrice: number;
  wholesalePrice?: number | null;

  stock: number;
  lowStockAlert: number;
  stockValue: number;
  retailValue: number;
  potentialProfit: number;

  industryType: IndustryType;
  carpetRollCount?: number;
  carpetCutPiecesCount?: number;
  imeiCount?: number;
  variantCount?: number;

  stockStatus: StockStatus;
  isActive: boolean;
  isFeatured: boolean;

  primaryImage?: string | null;
  variants?: Array<{
    id: string;
    name: string;
    stock: number;
    imageUrl?: string | null;
    colorHex?: string | null;
  }>;
}

export interface StockReportSummary {
  totalProducts: number;
  totalActiveProducts: number;
  totalStockValue: number;
  totalRetailValue: number;
  totalPotentialProfit: number;

  inStockCount: number;
  lowStockCount: number;
  outOfStockCount: number;

  standardCount: number;
  carpetCount: number;
  mobileCount: number;

  categoryBreakdown: Array<{
    categoryName: string;
    productCount: number;
    stockValue: number;
  }>;
}

export interface StockReportResponse {
  rows: StockReportRow[];
  summary: StockReportSummary;
  generatedAt: string;
  tenantName?: string;
}

export interface StockReportFilters {
  categoryId?: string;
  brandId?: string;
  stockStatus?: 'all' | 'in' | 'low' | 'out';
  isActive?: boolean;
  shopId?: string;
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const stockReportApi = {
  generate: (filters?: StockReportFilters) =>
    apiClient
      .get<{ data: StockReportResponse }>('/reports/stock', {
        params: {
          ...filters,
          isActive: filters?.isActive !== undefined ? String(filters.isActive) : undefined,
        },
      })
      .then(unwrap),

  getProductDetail: (productId: string) =>
    apiClient
      .get<{ data: ProductDetailResponse }>(`/reports/stock/${productId}/detail`)
      .then(unwrap),
};


// ─── Product Detail Types (for expand view) ──────────────

export interface VariantDetail {
  id: string;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  color?: string | null;
  colorHex?: string | null;
  size?: string | null;
  price: number;
  costPrice: number;
  stock: number;
  lowStockAlert: number;
  imageUrl?: string | null;
  isActive: boolean;
}

export interface CarpetRollDetail {
  id: string;
  rollNumber: string;
  designCode?: string | null;
  widthFt: number;
  widthInch: number;
  originalLengthFt: number;
  remainingLengthFt: number;
  remainingSqft: number;
  costPerSqft: number;
  salePricePerSqft: number;
  status: string;
  rackNumber?: string | null;
  quality?: string | null;
  pile?: string | null;
  variantName?: string | null;
  variantColorHex?: string | null;
  shopName?: string | null;
}

export interface CarpetCutPieceDetail {
  id: string;
  pieceCode: string;
  widthFt: number;
  lengthFt: number;
  totalSqft: number;
  salePrice: number;
  status: string;
  condition?: string | null;
  rackNumber?: string | null;
  variantName?: string | null;
  variantColorHex?: string | null;
  sourceRollNumber?: string | null;
}

export interface ImeiDetail {
  id: string;
  imei1: string;
  imei2?: string | null;
  ptaStatus: string;
  color?: string | null;
  costPrice: number;
  warrantyExpiry?: string | null;
  variantName?: string | null;
}

export interface ProductDetailResponse {
  productId: string;
  productName: string;
  unit: string;
  variants: VariantDetail[];
  carpetRolls: CarpetRollDetail[];
  carpetCutPieces: CarpetCutPieceDetail[];
  imeis: ImeiDetail[];
}
