import { apiClient } from './client';

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
  variant?: {
    id: string;
    name: string;
    color?: string | null;
    colorHex?: string | null;
  } | null;
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

const unwrap = <T = any>(res: any): T =>
  (res?.data?.data !== undefined ? res.data.data : res?.data) as T;

export const carpetCutPiecesApi = {
  list: (params?: {
    search?: string;
    productId?: string;
    variantId?: string;
    shopId?: string;
    sourceRollId?: string;
    status?: CarpetCutPieceStatus;
    page?: number;
    limit?: number;
  }): Promise<CarpetCutPiecesResponse> =>
    apiClient.get('/carpet-cut-pieces', { params }).then(unwrap) as any,

  available: (shopId?: string): Promise<CarpetCutPiece[]> =>
    apiClient
      .get('/carpet-cut-pieces/available', { params: { shopId } })
      .then(unwrap) as any,

  getOne: (id: string): Promise<CarpetCutPiece> =>
    apiClient.get(`/carpet-cut-pieces/${id}`).then(unwrap) as any,

  create: (payload: CreateCutPiecePayload): Promise<CarpetCutPiece> =>
    apiClient.post('/carpet-cut-pieces', payload).then(unwrap) as any,

  update: (
    id: string,
    payload: Partial<CreateCutPiecePayload>,
  ): Promise<CarpetCutPiece> =>
    apiClient.patch(`/carpet-cut-pieces/${id}`, payload).then(unwrap) as any,

  markSold: (id: string, saleItemId?: string): Promise<CarpetCutPiece> =>
    apiClient
      .patch(`/carpet-cut-pieces/${id}/mark-sold`, { saleItemId })
      .then(unwrap) as any,

  remove: (id: string): Promise<any> =>
    apiClient.delete(`/carpet-cut-pieces/${id}`).then(unwrap) as any,
};
