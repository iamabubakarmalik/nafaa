import { apiClient } from '@core/api/client';

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


// ─── Shared stock report (every industry) ──────────────────
// Cost and profit fields are left out by the server for users without
// cost.view, so every one of them is optional at runtime; the page shows
// them through the masked formatter.

export type StockFlag =
  | 'dead' | 'slow' | 'fast' | 'expiry' | 'expired' | 'blocked' | 'regSoon'
  | 'raw' | 'made' | 'fridge' | 'noCost' | 'negative' | 'inactive';
export type StockStatusFilter = 'all' | 'in' | 'low' | 'out' | 'dead' | 'slow' | 'fast' | 'expiry' | 'blocked' | 'raw' | 'made' | 'noCost' | 'negative' | 'inactive';
export type StockSort = 'value' | 'retail' | 'profit' | 'margin' | 'stock' | 'age' | 'sold' | 'revenue' | 'cover' | 'name';
export type LedgerSort = 'closing' | 'change' | 'in' | 'out' | 'name';

export interface SoldFigures { qty: number; revenue: number; cost: number; profit: number }
export interface ShopStockPart { shopId: string; stock: number; cost: number; retail: number; alert: number; sold: number; revenue: number; name?: string }

export interface StockLine {
  productId: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  unit: string;
  image: string | null;
  category: { id: string; name: string; color: string | null } | null;
  brand: { id: string; name: string } | null;
  supplier: { id: string; name: string } | null;
  price: number;
  cost: number;
  stock: number;
  alert: number;
  valueAtCost: number;
  retail: number;
  profit: number;
  margin: number;
  status: 'out' | 'low' | 'ok';
  flags: StockFlag[];
  sold: SoldFigures;
  prevSold: SoldFigures;
  perDay: number;
  cover: number | null;
  lastSoldAt: string | null;
  lastInAt: string | null;
  saleAge: number | null;
  stockAge: number | null;
  devices: { label: 'IMEI' | 'Serial'; count: number } | null;
  rolls: { rolls: number; pieces: number } | null;
  group: string | null;
  detail: string | null;
  agri: { season: string | null; reg: { state: 'expired' | 'soon' | 'none'; days: number | null } | null } | null;
  expiry: { date: string; qty: number; expiredQty: number; batches: number; cost: number } | null;
  active: boolean;
  /** Per branch, only in the all-branches view of a business with several. */
  shops?: ShopStockPart[];
}

export interface StockPeriod { from: string; to: string; days: number; deadDays: number; expiryDays: number; fastCover: number; slowCover: number }
interface ValueSlice { count: number; cost: number; retail: number }

export interface StockTotals {
  lines: number;
  stocked: number;
  units: number;
  cost: number;
  retail: number;
  profit: number;
  margin: number;
  sold: SoldFigures;
  prevSold: SoldFigures;
  coverDays: number | null;
  dead: ValueSlice;
  slow: ValueSlice;
  expiry: ValueSlice & { qty: number; batch: { cost: number } };
  blocked: ValueSlice;
  noCost: number;
}

export interface StockFacet { id: string; name?: string; color?: string | null; count: number; retail: number; cost: number }

export interface StockList {
  items: StockLine[];
  total: number;
  page: number;
  pages: number;
  counts: Record<StockStatusFilter, number>;
  totals: StockTotals;
  facets: { categories: StockFacet[]; brands: StockFacet[]; suppliers: StockFacet[]; groups: StockFacet[] };
  period: StockPeriod;
  shops: Array<{ id: string; name: string; isMain: boolean }>;
}

export interface StockQuery {
  from?: string;
  to?: string;
  categoryId?: string;
  brandId?: string;
  supplierId?: string;
  group?: string;
  search?: string;
  deadDays?: number;
}

export interface StockBrief {
  productId: string; name: string; unit: string; stock: number; valueAtCost: number; retail: number;
  sold: number; revenue: number; cover: number | null; saleAge: number | null; stockAge: number | null;
}
export interface StockBreakdown { id: string; name: string; color: string | null; lines: number; units: number; cost: number; retail: number; revenue: number }
export interface AgeBucket { key: string; label: string; lines: number; cost: number; retail: number }

export interface StockAnalytics {
  period: StockPeriod;
  totals: StockTotals;
  status: Array<{ key: 'ok' | 'low' | 'out'; lines: number; cost: number; retail: number }>;
  byCategory: StockBreakdown[];
  byBrand: StockBreakdown[];
  bySupplier: StockBreakdown[];
  byGroup: StockBreakdown[];
  bySeason: StockBreakdown[];
  saleAge: AgeBucket[];
  stockAge: AgeBucket[];
  topValue: StockBrief[];
  fast: StockBrief[];
  slow: StockBrief[];
  dead: StockBrief[];
  expiry: {
    buckets: Array<{ key: string; label: string; batches: number; qty: number; cost: number }>;
    soonest: Array<{ productId: string; name: string; batchNumber: string; expiryDate: string; days: number; qty: number; cost: number }>;
  };
  quality: { noCost: number; negative: number; inactive: number; devices: number; carpet: number };
}

export interface StockBranches {
  period: StockPeriod;
  shops: Array<{
    shopId: string; name: string; isMain: boolean; lines: number; units: number; cost: number; retail: number;
    out: number; low: number; dead: { count: number; cost: number }; sold: { qty: number; revenue: number };
  }>;
  matrix: Array<{ productId: string; name: string; unit: string; stock: number; retail: number; shops: Array<{ shopId: string; stock: number; sold: number }> }>;
  moves: Array<{ productId: string; name: string; unit: string; from: string; to: string; qty: number; revenue: number }>;
}

export interface LedgerLine {
  productId: string;
  name: string;
  sku: string | null;
  unit: string;
  category: { id: string; name: string; color: string | null } | null;
  opening: number;
  closing: number;
  change: number;
  inQty: number;
  outQty: number;
  kinds: Record<string, number>;
  openingValue: { cost: number; retail: number };
  closingValue: { cost: number; retail: number };
  unitCost: { cost: number };
  moved: boolean;
}

export interface StockLedger {
  period: StockPeriod;
  items: LedgerLine[];
  total: number;
  page: number;
  pages: number;
  totals: {
    lines: number;
    moved: number;
    opening: { units: number; cost: number; retail: number };
    closing: { units: number; cost: number; retail: number };
    kinds: Array<{ key: string; qty: number; cost: number; retail: number }>;
  };
  trend: Array<{ key: string; units: number; cost: number; retail: number }>;
  skipped: { carpet: number };
}

export interface StockItem {
  period: StockPeriod;
  line: (StockLine & { shops: ShopStockPart[] }) | null;
  product: { id: string; name: string; unit: string } | null;
  variants: Array<{ id: string; name: string; stock: number; cost: number; retail: number }>;
  batches: Array<{ id: string; batchNumber: string; expiryDate: string | null; qty: number; cost: number; days: number | null }>;
  units: Array<{ id: string; label: 'IMEI' | 'Serial'; ref: string; note: string; cost: number; ageDays: number | null; warrantyEnd: string | null; shop: string }>;
  rolls: Array<{ id: string; kind: 'roll' | 'piece'; ref: string; sqft: number; cost: number; retail: number; ageDays: number | null; shop: string }>;
  moves: Array<{ id: string; type: string; quantity: number; balanceAfter: number; reference: string | null; note: string | null; createdAt: string; shop: string }>;
  monthly: Array<{ key: string; qty: number; revenue: number }>;
}

export const stockAnalysisApi = {
  list: (q: StockQuery & { status?: StockStatusFilter; sort?: StockSort; page?: number; limit?: number }) =>
    apiClient.get<{ data: StockList }>('/reports/stock/list', { params: q }).then(unwrap),
  analytics: (q: StockQuery) =>
    apiClient.get<{ data: StockAnalytics }>('/reports/stock/analytics', { params: q }).then(unwrap),
  branches: (q: StockQuery) =>
    apiClient.get<{ data: StockBranches }>('/reports/stock/branches', { params: q }).then(unwrap),
  ledger: (q: StockQuery & { show?: 'all' | 'moved'; sort?: LedgerSort; page?: number; limit?: number }) =>
    apiClient.get<{ data: StockLedger }>('/reports/stock/ledger', { params: q }).then(unwrap),
  item: (productId: string, q: Pick<StockQuery, 'from' | 'to' | 'deadDays'>) =>
    apiClient.get<{ data: StockItem }>(`/reports/stock/item/${productId}`, { params: q }).then(unwrap),
};

/** Query key root for the shared stock report. */
export const STOCK_KEY = 'stock-report-v2';
