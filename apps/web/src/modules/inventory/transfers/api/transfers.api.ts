/**
 * Stock transfers between branches: a page of transfers with totals,
 * analytics for a period, one transfer, send, receive (full or short) and
 * cancel. Quantities are always in the product's base unit.
 */

import { apiClient } from '@core/api/client';

export type TransferStatus = 'PENDING' | 'IN_TRANSIT' | 'RECEIVED' | 'CANCELLED';

export interface TransferShop {
  id: string;
  name: string;
  isMain?: boolean;
  address?: string | null;
  phone?: string | null;
}

export interface TransferPerson {
  id: string;
  fullName: string;
}

export interface StockTransferItem {
  id: string;
  /** Sent, in base units. */
  quantity: number;
  /** Arrived, in base units; set when the transfer is received. */
  receivedQty: number;
  /** Cost of one base unit when sent. */
  unitCost: number;
  notes?: string | null;
  productId?: string | null;
  variantId?: string | null;
  carpetRollId?: string | null;
  imeiId?: string | null;
  usedPhoneId?: string | null;
  serialId?: string | null;
  /** Empty for used phones. */
  product?: { id: string; name: string; unit: string; sku?: string | null; barcode?: string | null } | null;
  carpetRoll?: {
    id: string;
    rollNumber: string;
    remainingSqft: number;
    remainingLengthFt: number;
    remainingLengthInch?: number;
    widthFt: number;
    widthInch?: number;
    variantId?: string | null;
  } | null;
  imei?: { id: string; imei1: string; imei2?: string | null; status: string; color?: string | null } | null;
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
  serial?: {
    id: string;
    serialNumber: string;
    imei?: string | null;
    status: string;
    warrantyEndDate?: string | null;
    physicalCondition?: string | null;
  } | null;
}

export interface StockTransfer {
  id: string;
  transferNumber: string;
  status: TransferStatus;
  notes?: string | null;
  /** Cost value of everything sent. */
  value: number;
  fromShopId: string;
  toShopId: string;
  transferredAt?: string | null;
  receivedAt?: string | null;
  cancelledAt?: string | null;
  cancelReason?: string | null;
  createdAt: string;
  fromShop: TransferShop;
  toShop: TransferShop;
  createdBy?: TransferPerson | null;
  receivedBy?: TransferPerson | null;
  cancelledBy?: TransferPerson | null;
  items: StockTransferItem[];
}

export type TransferStatusFilter = 'all' | 'IN_TRANSIT' | 'RECEIVED' | 'CANCELLED';
export type TransferDirection = 'all' | 'in' | 'out';

export interface TransferQuery {
  /** Business-day keys, YYYY-MM-DD. */
  from?: string;
  to?: string;
  status?: TransferStatusFilter;
  /** Relative to the branch in view. */
  direction?: TransferDirection;
  shopId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface TransferList {
  items: StockTransfer[];
  total: number;
  page: number;
  pages: number;
  totals: { count: number; inTransit: number; inTransitValue: number; received: number; cancelled: number; value: number };
}

export interface TransferAnalytics {
  totals: { count: number; value: number; inTransit: number; received: number; cancelled: number; shortValue: number; avgHours: number | null };
  byStatus: Array<{ key: TransferStatus; count: number }>;
  routes: Array<{ from: string; to: string; count: number; value: number }>;
  trend: Array<{ key: string; value: number; count: number }>;
  topProducts: Array<{ name: string; unit: string; qty: number; value: number }>;
}

export interface CreateTransferItemPayload {
  /** Not set for a used phone. */
  productId?: string;
  variantId?: string;
  carpetRollId?: string;
  /** Quantity is always 1. */
  imeiId?: string;
  usedPhoneId?: string;
  /** Quantity is always 1. */
  serialId?: string;
  /** Base units. */
  quantity: number;
  notes?: string;
}

export interface CreateTransferPayload {
  fromShopId: string;
  toShopId: string;
  notes?: string;
  items: CreateTransferItemPayload[];
}

export interface ReceiveTransferPayload {
  notes?: string;
  /** Lines left out arrived in full. */
  items?: Array<{ itemId: string; receivedQty: number }>;
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;
const clean = (q: TransferQuery) => Object.fromEntries(Object.entries(q).filter(([, v]) => v !== undefined && v !== '' && v !== 'all'));

export const transfersApi = {
  list: (q: TransferQuery = {}) =>
    apiClient.get<{ data: TransferList }>('/transfers', { params: clean(q) }).then(unwrap),

  analytics: (q: TransferQuery = {}) =>
    apiClient.get<{ data: TransferAnalytics }>('/transfers/analytics', { params: clean(q) }).then(unwrap),

  getOne: (id: string) =>
    apiClient.get<{ data: StockTransfer }>(`/transfers/${id}`).then(unwrap),

  create: (payload: CreateTransferPayload) =>
    apiClient.post<{ data: StockTransfer }>('/transfers', payload).then(unwrap),

  receive: (id: string, payload: ReceiveTransferPayload = {}) =>
    apiClient.patch<{ data: StockTransfer }>(`/transfers/${id}/receive`, payload).then(unwrap),

  cancel: (id: string, reason?: string) =>
    apiClient.patch<{ data: StockTransfer }>(`/transfers/${id}/cancel`, { reason: reason?.trim() || undefined }).then(unwrap),
};
