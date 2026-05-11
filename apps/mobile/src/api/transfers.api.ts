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

function unwrapOne<T>(res: any): T {
  const body = res?.data;
  if (body?.data !== undefined) return body.data as T;
  return body as T;
}

function unwrapArr<T>(res: any): T[] {
  const body = res?.data;
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.data)) return body.data;
  return [];
}

export const transfersApi = {
  list: (): Promise<StockTransfer[]> =>
    apiClient.get('/transfers').then((r) => unwrapArr<StockTransfer>(r)),
  create: (payload: CreateTransferPayload): Promise<StockTransfer> =>
    apiClient.post('/transfers', payload).then((r) => unwrapOne<StockTransfer>(r)),
  receive: (id: string): Promise<StockTransfer> =>
    apiClient.patch(`/transfers/${id}/receive`).then((r) => unwrapOne<StockTransfer>(r)),
  cancel: (id: string): Promise<StockTransfer> =>
    apiClient.patch(`/transfers/${id}/cancel`).then((r) => unwrapOne<StockTransfer>(r)),
};
