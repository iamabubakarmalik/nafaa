import { apiClient } from './client';

export type TransferStatus = 'PENDING' | 'IN_TRANSIT' | 'RECEIVED' | 'CANCELLED';

export interface StockTransferItem {
  id: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    unit: string;
  };
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

export interface CreateTransferPayload {
  fromShopId: string;
  toShopId: string;
  notes?: string;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const transfersApi = {
  list: () => apiClient.get<{ data: StockTransfer[] }>('/transfers').then(unwrap),
  create: (payload: CreateTransferPayload) =>
    apiClient.post<{ data: StockTransfer }>('/transfers', payload).then(unwrap),
  receive: (id: string) =>
    apiClient.patch<{ data: StockTransfer }>(`/transfers/${id}/receive`).then(unwrap),
  cancel: (id: string) =>
    apiClient.patch<{ data: StockTransfer }>(`/transfers/${id}/cancel`).then(unwrap),
};
