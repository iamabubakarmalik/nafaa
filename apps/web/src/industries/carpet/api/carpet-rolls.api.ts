import { apiClient } from '@core/api/client';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

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
  variant?: { id: string; name: string; color?: string | null; colorHex?: string | null } | null;
  shop?: { id: string; name: string } | null;
  _count?: { cutPieces: number; movements: number };
  cutPieces?: any[];
  movements?: CarpetRollMovement[];
}

export interface CarpetRollMovement {
  id: string;
  rollId: string;
  type: 'OPENING' | 'CUT_FOR_SALE' | 'ADJUSTMENT' | 'TRANSFER' | 'RETURN' | 'DAMAGE' | 'WASTE' | 'REMOVED' | 'VOID_RETURN';
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
  purchaseId?: string;
  supplierId?: string;
  rackNumber?: string;
  notes?: string;
  quality?: string;
  pile?: string;
}

export type UpdateCarpetRollPayload = Partial<CreateCarpetRollPayload>;

export interface CarpetRollsListParams {
  search?: string;
  productId?: string;
  variantId?: string;
  shopId?: string;
  status?: CarpetRollStatus;
  inStockOnly?: boolean;
  /** Active rolls with this many feet or less left. */
  lowFt?: number;
  page?: number;
  limit?: number;
}

export interface CarpetRollStats {
  counts: { all: number; active: number; reserved: number; finished: number; damaged: number; transferred: number; low: number };
  inStockRolls: number;
  sqft: number;
  lengthFt: number;
  costValue: number;
  saleValue: number;
  pieces: { count: number; sqft: number; cost: number };
}

export interface UnsettledBill {
  saleId: string;
  saleNumber: string;
  createdAt: string;
  customerName: string | null;
  lines: Array<{ saleItemId: string; note: string; quantity: number; total: number }>;
}

export interface SettleResult {
  saleId: string;
  saleNumber: string;
  settled: number;
  skipped: number;
  lines: Array<{ saleItemId: string; note: string; ok: boolean; message: string }>;
}

export interface AdjustRollPayload {
  lengthDeltaFt: number;
  lengthDeltaInch?: number;
  reason: string;
  note?: string;
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

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

// ═══════════════════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════════════════

export const carpetRollsApi = {
  list: (params?: CarpetRollsListParams) =>
    apiClient
      .get<{ data: CarpetRollsResponse }>('/carpet-rolls', {
        params: {
          ...params,
          inStockOnly:
            params?.inStockOnly !== undefined ? String(params.inStockOnly) : undefined,
        },
      })
      .then(unwrap),


  productSummary: (productIds?: string[]) =>
    apiClient
      .post<{ data: CarpetProductSummary[] }>('/carpet-rolls/product-summary', {
        productIds,
      })
      .then(unwrap),

  stats: (shopId?: string, lowFt = 10) =>
    apiClient.get<{ data: CarpetRollStats }>('/carpet-rolls/stats', { params: { shopId, lowFt } }).then(unwrap),

  /** Cuts rolls and sells pieces named on a bill's carpet lines; safe to repeat. */
  settleBill: (saleId: string) =>
    apiClient.post<{ data: SettleResult }>(`/carpet-bills/${saleId}/settle`).then(unwrap),

  /** Carpet lines of these bills and whether each is cut / sold from stock yet. */
  billLines: (saleIds: string[]) =>
    apiClient
      .get<{ data: Record<string, Array<{ saleItemId: string; note: string; quantity: number; settled: boolean }>> }>('/carpet-bills/lines', { params: { saleIds: saleIds.join(',') } })
      .then(unwrap),

  unsettledBills: (shopId?: string) =>
    apiClient.get<{ data: UnsettledBill[] }>('/carpet-bills/unsettled', { params: { shopId } }).then(unwrap),

  getOne: (id: string) =>
    apiClient.get<{ data: CarpetRoll }>(`/carpet-rolls/${id}`).then(unwrap),

  create: (payload: CreateCarpetRollPayload) =>
    apiClient.post<{ data: CarpetRoll }>('/carpet-rolls', payload).then(unwrap),


  bulkImportPreview: (rows: any[], shopId?: string) =>
    apiClient
      .post<{ data: BulkImportPreviewResponse }>('/carpet-rolls/bulk-import-preview', {
        rows,
        shopId,
      })
      .then(unwrap),

  bulkImportApply: (rows: any[], shopId?: string) =>
    apiClient
      .post<{ data: BulkImportApplyResponse }>('/carpet-rolls/bulk-import-apply', {
        rows,
        shopId,
      })
      .then(unwrap),

  bulkOpening: (rolls: CreateCarpetRollPayload[]) =>
    apiClient
      .post<{ data: any }>('/carpet-rolls/bulk-opening', { rolls })
      .then(unwrap),

  update: (id: string, payload: UpdateCarpetRollPayload) =>
    apiClient.patch<{ data: CarpetRoll }>(`/carpet-rolls/${id}`, payload).then(unwrap),

  adjust: (id: string, payload: AdjustRollPayload) =>
    apiClient
      .post<{ data: CarpetRoll }>(`/carpet-rolls/${id}/adjust`, payload)
      .then(unwrap),

  markDamaged: (id: string, reason?: string) =>
    apiClient
      .patch<{ data: CarpetRoll }>(`/carpet-rolls/${id}/mark-damaged`, { reason })
      .then(unwrap),

  markFinished: (id: string, reason?: string) =>
    apiClient
      .patch<{ data: CarpetRoll }>(`/carpet-rolls/${id}/mark-finished`, { reason })
      .then(unwrap),

  remove: (id: string) =>
    apiClient
      .delete<{ data: { message: string; softDeleted: boolean } }>(
        `/carpet-rolls/${id}`,
      )
      .then(unwrap),
};
