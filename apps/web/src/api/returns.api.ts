import { apiClient } from './client';
import type { PaymentMethod } from './sales.api';

export interface SaleReturnItem {
  id: string;
  quantity: number;
  refundPrice: number;
  total: number;
  product: {
    id: string;
    name: string;
    unit: string;
  };
}

export interface SaleReturn {
  id: string;
  returnNumber: string;
  reason?: string | null;
  refundAmount: number;
  refundMethod: PaymentMethod;
  notes?: string | null;
  returnedAt: string;
  sale: {
    id: string;
    saleNumber: string;
    customer?: { id: string; name: string } | null;
  };
  createdBy?: { id: string; fullName: string } | null;
  items: SaleReturnItem[];
  createdCutPieces?: string[];
}

export interface CreateReturnItemPayload {
  saleItemId: string;
  quantity: number;
  // Carpet-specific (optional)
  createCutPiece?: boolean;
  cutPieceCondition?: string;
  isDamaged?: boolean;
  cutPieceWidthFt?: number;
  cutPieceLengthFt?: number;
  cutPieceNotes?: string;
}

export interface CreateReturnPayload {
  saleId: string;
  reason?: string;
  refundMethod: PaymentMethod;
  notes?: string;
  items: CreateReturnItemPayload[];
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const returnsApi = {
  list: () => apiClient.get<{ data: SaleReturn[] }>('/returns').then(unwrap),
  getOne: (id: string) =>
    apiClient.get<{ data: SaleReturn }>(`/returns/${id}`).then(unwrap),
  create: (payload: CreateReturnPayload) =>
    apiClient.post<{ data: SaleReturn }>('/returns', payload).then(unwrap),
};
