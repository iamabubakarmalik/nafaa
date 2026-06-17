import { apiClient } from '@/api/client';

export type CarpetCutPieceStatus =
  | 'AVAILABLE'
  | 'SOLD'
  | 'DAMAGED'
  | 'RESERVED';

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
  page?: number;
  limit?: number;
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const carpetCutPiecesApi = {
  list: (params?: CutPiecesListParams) =>
    apiClient
      .get<{ data: CarpetCutPiecesResponse }>('/carpet-cut-pieces', { params })
      .then(unwrap),

  available: (shopId?: string) =>
    apiClient
      .get<{ data: CarpetCutPiece[] }>('/carpet-cut-pieces/available', {
        params: { shopId },
      })
      .then(unwrap),

  getOne: (id: string) =>
    apiClient
      .get<{ data: CarpetCutPiece }>(`/carpet-cut-pieces/${id}`)
      .then(unwrap),

  create: (payload: CreateCutPiecePayload) =>
    apiClient
      .post<{ data: CarpetCutPiece }>('/carpet-cut-pieces', payload)
      .then(unwrap),

  update: (id: string, payload: UpdateCutPiecePayload) =>
    apiClient
      .patch<{ data: CarpetCutPiece }>(`/carpet-cut-pieces/${id}`, payload)
      .then(unwrap),

  markSold: (id: string, saleItemId?: string) =>
    apiClient
      .patch<{ data: CarpetCutPiece }>(`/carpet-cut-pieces/${id}/mark-sold`, {
        saleItemId,
      })
      .then(unwrap),

  remove: (id: string) =>
    apiClient
      .delete<{ data: { message: string } }>(`/carpet-cut-pieces/${id}`)
      .then(unwrap),
};
