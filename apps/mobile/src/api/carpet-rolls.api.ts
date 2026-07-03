import { apiClient } from './client';

export type CarpetRollStatus =
  | 'ACTIVE'
  | 'FINISHED'
  | 'DAMAGED'
  | 'RESERVED'
  | 'TRANSFERRED';

export type CarpetRollSource =
  | 'OPENING_STOCK'
  | 'PURCHASE'
  | 'TRANSFER_IN'
  | 'RETURN'
  | 'ADJUSTMENT';

export interface CarpetRoll {
  id: string;
  tenantId: string;
  shopId?: string | null;
  productId: string;
  variantId?: string | null;
  rollNumber: string;
  designCode?: string | null;
  widthFt: number;
  widthInch: number;
  originalLengthFt: number;
  originalLengthInch: number;
  remainingLengthFt: number;
  remainingLengthInch: number;
  originalSqft: number;
  remainingSqft: number;
  costPerSqft: number;
  salePricePerSqft: number;
  wholesalePricePerSqft?: number | null;
  status: CarpetRollStatus;
  sourceType: CarpetRollSource;
  purchaseId?: string | null;
  supplierId?: string | null;
  rackNumber?: string | null;
  notes?: string | null;
  quality?: string | null;
  pile?: string | null;
  receivedAt: string;
  finishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  product?: { id: string; name: string; unit: string };
  variant?: {
    id: string;
    name: string;
    color?: string | null;
    colorHex?: string | null;
  } | null;
  shop?: { id: string; name: string } | null;
  _count?: { cutPieces: number; movements: number };
  movements?: CarpetRollMovement[];
}

export interface CarpetRollMovement {
  id: string;
  rollId: string;
  type:
    | 'OPENING'
    | 'CUT_FOR_SALE'
    | 'ADJUSTMENT'
    | 'TRANSFER'
    | 'RETURN'
    | 'DAMAGE';
  lengthFt: number;
  sqft: number;
  balanceLengthAfter: number;
  balanceSqftAfter: number;
  reference?: string | null;
  saleId?: string | null;
  note?: string | null;
  createdAt: string;
}

export interface CarpetRollsResponse {
  items: CarpetRoll[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface CarpetRollSummary {
  productId: string;
  variantId: string | null;
  productName: string;
  variantName: string | null;
  variantColor: string | null;
  totalSqft: number;
  totalLengthFt: number;
  rollCount: number;
}

export interface CarpetProductSummary {
  productId: string;
  totalSqft: number;
  totalLengthFt: number;
  rollCount: number;
  avgSalePrice: number;
  minSalePrice: number;
  maxSalePrice: number;
  cutPiecesCount: number;
  cutPiecesSqft: number;
}

export interface CreateCarpetRollPayload {
  productId: string;
  variantId?: string;
  shopId?: string;
  rollNumber?: string;
  designCode?: string;
  widthFt: number;
  widthInch?: number;
  originalLengthFt: number;
  originalLengthInch?: number;
  remainingLengthFt?: number;
  remainingLengthInch?: number;
  costPerSqft?: number;
  salePricePerSqft?: number;
  wholesalePricePerSqft?: number;
  status?: CarpetRollStatus;
  sourceType?: CarpetRollSource;
  rackNumber?: string;
  notes?: string;
  quality?: string;
  pile?: string;
}

export interface CutRollPayload {
  lengthFt: number;
  lengthInch?: number;
  customerWidthFt?: number;
  createLeftoverPiece?: boolean;
  saleId?: string;
  saleItemId?: string;
  note?: string;
}

export interface CutRollResponse {
  success: boolean;
  cutLengthFt: number;
  cutLengthInch?: number;
  cutLengthReal?: number;
  cutSqft: number;
  remainingLengthFt: number;
  remainingLengthInch?: number;
  remainingSqft: number;
  rollStatus: CarpetRollStatus;
  leftoverPiece: any | null;
}

export interface AdjustRollPayload {
  lengthDeltaFt: number;
  lengthDeltaInch?: number;
  reason: string;
  note?: string;
}



// ═══ Bulk Import Types ═══
export interface BulkImportPreviewRow {
  index: number;
  productName: string;
  variantName?: string;
  productId?: string;
  variantId?: string;
  rollNumber: string;
  designCode?: string;
  widthFt: number;
  widthInch: number;
  lengthFt: number;
  lengthInch?: number;
  totalSqft: number;
  costPerSqft: number;
  salePricePerSqft: number;
  totalCost: number;
  totalSaleValue: number;
  rackNumber?: string;
  notes?: string;
  quality?: string;
  pile?: string;
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface BulkImportPreviewResponse {
  shopId?: string;
  totalRows: number;
  validCount: number;
  invalidCount: number;
  totalSqftToImport: number;
  totalCostToImport: number;
  totalSaleValueToImport: number;
  rows: BulkImportPreviewRow[];
}

export interface BulkImportApplyResponse {
  totalSubmitted: number;
  successCount: number;
  failureCount: number;
  results: Array<{
    index: number;
    success: boolean;
    rollNumber?: string;
    error?: string;
  }>;
}


const unwrap = <T = any>(res: any): T =>
  (res?.data?.data !== undefined ? res.data.data : res?.data) as T;

export const carpetRollsApi = {
  list: (params?: {
    search?: string;
    productId?: string;
    variantId?: string;
    shopId?: string;
    status?: CarpetRollStatus;
    inStockOnly?: boolean;
    page?: number;
    limit?: number;
  }): Promise<CarpetRollsResponse> =>
    apiClient
      .get('/carpet-rolls', {
        params: {
          ...params,
          inStockOnly:
            params?.inStockOnly !== undefined
              ? String(params.inStockOnly)
              : undefined,
        },
      })
      .then(unwrap) as any,

  productSummary: (productIds?: string[]): Promise<CarpetProductSummary[]> =>
    apiClient
      .post('/carpet-rolls/product-summary', { productIds })
      .then(unwrap) as any,

  summary: (shopId?: string): Promise<CarpetRollSummary[]> =>
    apiClient
      .get('/carpet-rolls/summary', { params: { shopId } })
      .then(unwrap) as any,

  lowRemaining: (threshold = 10): Promise<CarpetRoll[]> =>
    apiClient
      .get('/carpet-rolls/low-remaining', { params: { threshold } })
      .then(unwrap) as any,

  getOne: (id: string): Promise<CarpetRoll> =>
    apiClient.get(`/carpet-rolls/${id}`).then(unwrap) as any,

  create: (payload: CreateCarpetRollPayload): Promise<CarpetRoll> =>
    apiClient.post('/carpet-rolls', payload).then(unwrap) as any,

  update: (
    id: string,
    payload: Partial<CreateCarpetRollPayload>,
  ): Promise<CarpetRoll> =>
    apiClient.patch(`/carpet-rolls/${id}`, payload).then(unwrap) as any,

  cut: (id: string, payload: CutRollPayload): Promise<CutRollResponse> =>
    apiClient.post(`/carpet-rolls/${id}/cut`, payload).then(unwrap) as any,

  adjust: (id: string, payload: AdjustRollPayload): Promise<CarpetRoll> =>
    apiClient.post(`/carpet-rolls/${id}/adjust`, payload).then(unwrap) as any,

  markDamaged: (id: string, reason?: string): Promise<CarpetRoll> =>
    apiClient
      .patch(`/carpet-rolls/${id}/mark-damaged`, { reason })
      .then(unwrap) as any,

  markFinished: (id: string): Promise<CarpetRoll> =>
    apiClient.patch(`/carpet-rolls/${id}/mark-finished`).then(unwrap) as any,

  bulkImportPreview: (rows: any[], shopId?: string): Promise<BulkImportPreviewResponse> =>
    apiClient
      .post('/carpet-rolls/bulk-import-preview', { rows, shopId })
      .then(unwrap),

  bulkImportApply: (rows: any[], shopId?: string): Promise<BulkImportApplyResponse> =>
    apiClient
      .post('/carpet-rolls/bulk-import-apply', { rows, shopId })
      .then(unwrap),

  remove: (id: string): Promise<any> =>
    apiClient.delete(`/carpet-rolls/${id}`).then(unwrap) as any,
};
