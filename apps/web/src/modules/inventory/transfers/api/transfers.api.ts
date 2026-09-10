import { apiClient } from '@core/api/client';

export type TransferStatus = 'PENDING' | 'IN_TRANSIT' | 'RECEIVED' | 'CANCELLED';

export interface StockTransferItem {
  id: string;
  quantity: number;
  notes?: string | null;
  variantId?: string | null;
  carpetRollId?: string | null;
  /** Mobile: kaunsa device bheja gaya */
  imeiId?: string | null;
  imei?: {
    id: string;
    imei1: string;
    imei2?: string | null;
    status: string;
    color?: string | null;
  } | null;
  /** Mobile: used phone bheja gaya — iska product nahi hota */
  usedPhoneId?: string | null;
  usedPhone?: {
    id: string;
    usedPhoneCode: string;
    brand: string;
    model: string;
    storage?: string | null;
    color?: string | null;
    status: string;
    resalePrice?: number;
  } | null;
  /** Electronics: kaun sa serial unit bheja gaya */
  serialId?: string | null;
  serial?: {
    id: string;
    serialNumber: string;
    imei?: string | null;
    status: string;
    warrantyEndDate?: string | null;
    physicalCondition?: string | null;
  } | null;
  /** Used phone items me product nahi hota */
  product?: {
    id: string;
    name: string;
    unit: string;
  } | null;
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
  /** Used phone bhejte waqt product nahi hota */
  productId?: string;
  variantId?: string;
  carpetRollId?: string;
  /** Mobile: device bhejne ke liye — quantity hamesha 1 */
  imeiId?: string;
  /** Mobile: used phone bhejne ke liye */
  usedPhoneId?: string;
  /** Electronics: serial unit bhejne ke liye — quantity hamesha 1 */
  serialId?: string;
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
