/**
 * Carpet endpoints (same paths and shapes as apps/web/src/industries/carpet/api):
 * rolls, cut pieces and the bill settling that cuts stock after a sale.
 */

import { apiClient } from '@/core/api/client';
import type { CarpetCutPieceStatus, CarpetRollStatus } from '@nafaa/core/industries/carpet';

export type { CarpetCutPieceStatus, CarpetRollStatus };

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

const unwrap = <T>(res: { data: T }): T => res.data;


export const carpetRollsApi = {
  list: (params?: CarpetRollsListParams) =>
    apiClient
      .get<CarpetRollsResponse>('/carpet-rolls', {
        params: {
          ...params,
          inStockOnly:
            params?.inStockOnly !== undefined ? String(params.inStockOnly) : undefined,
        },
      })
      .then(unwrap),


  productSummary: (productIds?: string[]) =>
    apiClient
      .post<CarpetProductSummary[]>('/carpet-rolls/product-summary', {
        productIds,
      })
      .then(unwrap),

  stats: (shopId?: string, lowFt = 10) =>
    apiClient.get<CarpetRollStats>('/carpet-rolls/stats', { params: { shopId, lowFt } }).then(unwrap),

  /** Cuts rolls and sells pieces named on a bill's carpet lines; safe to repeat. */
  settleBill: (saleId: string) =>
    apiClient.post<SettleResult>(`/carpet-bills/${saleId}/settle`).then(unwrap),

  /** Carpet lines of these bills and whether each is cut / sold from stock yet. */
  billLines: (saleIds: string[]) =>
    apiClient
      .get<Record<string, Array<{ saleItemId: string; note: string; quantity: number; settled: boolean }>>>('/carpet-bills/lines', { params: { saleIds: saleIds.join(',') } })
      .then(unwrap),

  unsettledBills: (shopId?: string) =>
    apiClient.get<UnsettledBill[]>('/carpet-bills/unsettled', { params: { shopId } }).then(unwrap),

  getOne: (id: string) =>
    apiClient.get<CarpetRoll>(`/carpet-rolls/${id}`).then(unwrap),

  create: (payload: CreateCarpetRollPayload) =>
    apiClient.post<CarpetRoll>('/carpet-rolls', payload).then(unwrap),


  bulkImportPreview: (rows: any[], shopId?: string) =>
    apiClient
      .post<BulkImportPreviewResponse>('/carpet-rolls/bulk-import-preview', {
        rows,
        shopId,
      })
      .then(unwrap),

  bulkImportApply: (rows: any[], shopId?: string) =>
    apiClient
      .post<BulkImportApplyResponse>('/carpet-rolls/bulk-import-apply', {
        rows,
        shopId,
      })
      .then(unwrap),

  bulkOpening: (rolls: CreateCarpetRollPayload[]) =>
    apiClient
      .post<any>('/carpet-rolls/bulk-opening', { rolls })
      .then(unwrap),

  update: (id: string, payload: UpdateCarpetRollPayload) =>
    apiClient.patch<CarpetRoll>(`/carpet-rolls/${id}`, payload).then(unwrap),

  adjust: (id: string, payload: AdjustRollPayload) =>
    apiClient
      .post<CarpetRoll>(`/carpet-rolls/${id}/adjust`, payload)
      .then(unwrap),

  markDamaged: (id: string, reason?: string) =>
    apiClient
      .patch<CarpetRoll>(`/carpet-rolls/${id}/mark-damaged`, { reason })
      .then(unwrap),

  markFinished: (id: string, reason?: string) =>
    apiClient
      .patch<CarpetRoll>(`/carpet-rolls/${id}/mark-finished`, { reason })
      .then(unwrap),

  remove: (id: string) =>
    apiClient
      .delete<{ message: string; softDeleted: boolean }>(
        `/carpet-rolls/${id}`,
      )
      .then(unwrap),
};



export type CarpetCutPieceSource =
  | 'LEFTOVER'
  | 'CUSTOMER_RETURN'
  | 'DAMAGED_ROLL'
  | 'OPENING_STOCK'
  | 'MANUAL';

export interface CarpetCutPiece {
  id: string;
  tenantId: string;
  shopId?: string | null;
  productId: string;
  variantId?: string | null;
  sourceRollId?: string | null;
  sourceType: CarpetCutPieceSource;
  pieceCode: string;
  widthFt: number;
  widthInch: number;
  lengthFt: number;
  lengthInch: number;
  totalSqft: number;
  costAmount: number;
  salePrice: number;
  pricePerSqft?: number | null;
  status: CarpetCutPieceStatus;
  condition?: string | null;
  rackNumber?: string | null;
  notes?: string | null;
  saleItemId?: string | null;
  soldAt?: string | null;
  createdAt: string;
  updatedAt: string;
  product?: { id: string; name: string };
  variant?: { id: string; name: string; color?: string | null; colorHex?: string | null } | null;
  sourceRoll?: { id: string; rollNumber: string } | null;
  shop?: { id: string; name: string } | null;
}

export interface CarpetCutPiecesResponse {
  items: CarpetCutPiece[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface CreateCutPiecePayload {
  productId: string;
  variantId?: string;
  shopId?: string;
  sourceRollId?: string;
  sourceType?: CarpetCutPieceSource;
  pieceCode?: string;
  widthFt: number;
  widthInch?: number;
  lengthFt: number;
  lengthInch?: number;
  costAmount?: number;
  salePrice?: number;
  pricePerSqft?: number;
  status?: CarpetCutPieceStatus;
  condition?: string;
  rackNumber?: string;
  notes?: string;
}

export type UpdateCutPiecePayload = Partial<CreateCutPiecePayload>;

export interface CutPiecesListParams {
  search?: string;
  productId?: string;
  variantId?: string;
  shopId?: string;
  sourceRollId?: string;
  status?: CarpetCutPieceStatus;
  sourceType?: CarpetCutPieceSource;
  page?: number;
  limit?: number;
}

interface PieceBucket { count: number; sqft: number; cost: number; value: number }
export interface CutPieceStats { all: number; available: PieceBucket; reserved: PieceBucket; sold: PieceBucket; damaged: PieceBucket }


export const carpetCutPiecesApi = {
  list: (params?: CutPiecesListParams) =>
    apiClient
      .get<CarpetCutPiecesResponse>('/carpet-cut-pieces', { params })
      .then(unwrap),

  stats: (shopId?: string) =>
    apiClient.get<CutPieceStats>('/carpet-cut-pieces/stats', { params: { shopId } }).then(unwrap),

  create: (payload: CreateCutPiecePayload) =>
    apiClient
      .post<CarpetCutPiece>('/carpet-cut-pieces', payload)
      .then(unwrap),

  update: (id: string, payload: UpdateCutPiecePayload) =>
    apiClient
      .patch<CarpetCutPiece>(`/carpet-cut-pieces/${id}`, payload)
      .then(unwrap),

  remove: (id: string) =>
    apiClient
      .delete<{ message: string }>(`/carpet-cut-pieces/${id}`)
      .then(unwrap),
};

export interface CarpetPurchaseItem {
  productId: string; quantity: number; costPrice: number;
  rolls?: Array<{ variantId?: string; rollNumber?: string; widthFt: number; widthInch: number; lengthFt: number; costPerSqft: number; salePricePerSqft?: number; rackNumber?: string }>;
}
export interface CarpetPurchasePayload {
  supplierId: string; paymentMethod: string; shopId?: string; discount?: number; paidAmount?: number; supplierInvoiceNo?: string; notes?: string; items: CarpetPurchaseItem[];
}

/** A carpet purchase: roll goods carry their rolls, the server makes them with the purchase as their source. */
export const carpetPurchaseApi = {
  create: (payload: CarpetPurchasePayload) =>
    apiClient.post<{ id: string; purchaseNumber: string }>('/purchases', payload).then(unwrap),
};
