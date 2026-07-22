import { apiClient } from './client';

export type TransferStatus = 'PENDING' | 'IN_TRANSIT' | 'RECEIVED' | 'CANCELLED';

export interface StockTransferItem {
  id: string;
  quantity: number;
  notes?: string | null;
  variantId?: string | null;
  carpetRollId?: string | null;
  product: {
    id: string;
    name: string;
    unit: string;
  };
  carpetRoll?: {
    id: string;
    rollNumber: string;
    remainingSqft?: number;
    widthFt?: number;
    widthInch?: number;
    remainingLengthFt?: number;
    variant?: { id: string; name: string; color?: string | null } | null;
  } | null;
}

export interface StockTransfer {
  id: string;
  transferNumber: string;
  status: TransferStatus;
  notes?: string | null;
  transferredAt?: string | null;
  receivedAt?: string | null;
  createdAt: string;
  fromShop: { id: string; name: string };
  toShop: { id: string; name: string };
  createdBy?: { id: string; fullName: string } | null;
  items: StockTransferItem[];
}

export interface CreateTransferItemPayload {
  productId: string;
  variantId?: string;
  carpetRollId?: string;
  quantity: number;
  notes?: string;
}

export interface CreateTransferPayload {
  fromShopId: string;
  toShopId: string;
  notes?: string;
  items: CreateTransferItemPayload[];
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const transfersApi = {
  list: () => apiClient.get<{ data: StockTransfer[] }>('/transfers').then(unwrap),

  getOne: (id: string) =>
    apiClient.get<{ data: StockTransfer }>(`/transfers/${id}`).then(unwrap),

  create: (payload: CreateTransferPayload) =>
    apiClient.post<{ data: StockTransfer }>('/transfers', payload).then(unwrap),

  receive: (id: string) =>
    apiClient.patch<{ data: StockTransfer }>(`/transfers/${id}/receive`).then(unwrap),

  cancel: (id: string) =>
    apiClient.patch<{ data: StockTransfer }>(`/transfers/${id}/cancel`).then(unwrap),
};
