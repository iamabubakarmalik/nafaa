/**
 * Sale returns API: create a return, the filtered record with totals,
 * analytics, one return, and the bill finder for a new return.
 */

import { apiClient } from '@core/api/client';
import { withManagerPin } from '@core/security/ManagerPin';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';

export interface ReturnItemRow {
  id: string;
  saleItemId: string;
  productId: string;
  name: string;
  unit: string;
  sku?: string | null;
  variant: string | null;
  quantity: number;
  soldQty: number | null;
  refundPrice: number;
  total: number;
  /** Put back on the shelf. */
  restockedQty: number;
  /** Came back not fit to sell; booked as damaged. */
  writtenOffQty: number;
  /** IMEIs or serial numbers on the line. */
  units: string[];
}

export interface ReturnRow {
  id: string;
  returnNumber: string;
  returnedAt: string;
  reason: string | null;
  notes: string | null;
  refundAmount: number;
  refundMethod: PaymentMethod;
  /** Part of the refund that cleared the customer's khata on this bill. */
  khataAmount: number;
  /** Money actually handed back. */
  payout: number;
  approvedBy: string | null;
  sale: {
    id: string; saleNumber: string; soldAt: string; total: number; paymentMethod: PaymentMethod; status: string;
    customer: { id: string; name: string; phone: string | null } | null;
  };
  shop: { id: string; name: string } | null;
  createdBy: { id: string; fullName: string } | null;
  qty: number;
  restockedQty: number;
  writtenOffQty: number;
  items: ReturnItemRow[];
}

export interface ReturnTotals {
  count: number;
  refunded: number;
  khata: number;
  payout: number;
  qty: number;
  restockedQty: number;
  writtenOffQty: number;
  bills: number;
  salesTotal: number;
  salesBills: number;
  /** Refunded money as % of sales in the same period and branch. */
  rate: number;
  /** Bills with a return as % of all bills. */
  billRate: number;
}

export interface ReturnQuery {
  from?: string;
  to?: string;
  method?: PaymentMethod;
  /** Exact reason, or 'none'. */
  reason?: string;
  staffId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ReturnList { items: ReturnRow[]; total: number; page: number; pages: number; totals: ReturnTotals }

export interface ReturnBucket { key: string; label: string; count: number; value: number; qty: number }

export interface ReturnAnalytics {
  totals: ReturnTotals;
  trend: Array<{ key: string; refunded: number; count: number }>;
  byReason: ReturnBucket[];
  byMethod: Array<ReturnBucket & { key: PaymentMethod }>;
  byStaff: ReturnBucket[];
  byProduct: Array<ReturnBucket & { unit: string; soldQty: number; rate: number | null }>;
}

export interface BillHit {
  id: string;
  saleNumber: string;
  soldAt: string;
  total: number;
  status: string;
  customer: { name: string; phone: string | null } | null;
  shop: { name: string } | null;
  lines: number;
  returnableQty: number;
  exact: boolean;
}

export interface CreateReturnItemPayload {
  saleItemId: string;
  quantity: number;
  /** False when the goods are not fit to sell again (booked as damaged). */
  restock?: boolean;
  // Carpet only
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

export interface CreatedReturn {
  id: string;
  returnNumber: string;
  refundAmount: number;
  khataAmount: number;
  payout: number;
  createdCutPieces: string[];
  /** The same return was already saved a moment ago (double click). */
  repeated: boolean;
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const returnsApi = {
  records: (q: ReturnQuery) =>
    apiClient.get<{ data: ReturnList }>('/returns/records', { params: q }).then(unwrap),
  analytics: (q: Omit<ReturnQuery, 'page' | 'limit'>) =>
    apiClient.get<{ data: ReturnAnalytics }>('/returns/analytics', { params: q }).then(unwrap),
  findBill: (q: string) =>
    apiClient.get<{ data: BillHit[] }>('/returns/find-bill', { params: { q } }).then(unwrap),
  create: (payload: CreateReturnPayload) => withManagerPin('Return', (managerPin) =>
    apiClient.post<{ data: CreatedReturn }>('/returns', { ...payload, managerPin }).then(unwrap), 'refund'),
};
