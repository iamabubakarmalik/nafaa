import { apiClient } from '@core/api/client';

export type AdjustmentType = 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT' | 'DAMAGE' | 'LOSS';
export type RollAction = 'ADJUST_LENGTH' | 'MARK_DAMAGED' | 'MARK_LOST' | 'RESTORE';

export interface StockAdjustment {
  id: string;
  type: AdjustmentType;
  quantity: number;
  reason: string;
  note?: string | null;
  createdAt: string;
  product: { id: string; name: string; sku?: string | null; unit: string };
  variant?: {
    id: string; name: string;
    color?: string | null; colorHex?: string | null; size?: string | null;
  } | null;
  carpetRoll?: {
    id: string; rollNumber: string; status: string;
    remainingSqft: number; widthFt: number; widthInch: number;
    remainingLengthFt?: number; remainingLengthInch?: number;
  } | null;
  imei?: {
    id: string; imei1: string; status: string; color?: string | null;
  } | null;
  createdBy?: { id: string; fullName: string } | null;
}

export interface CreateAdjustmentPayload {
  productId: string;
  variantId?: string;
  carpetRollId?: string;
  imeiId?: string;
  type: AdjustmentType;
  quantity: number;
  reason: string;
  note?: string;
  lengthFt?: number;
  lengthInch?: number;
  rollAction?: RollAction;
}

export interface AdjustmentOptions {
  product: {
    id: string; name: string; unit: string; stock: number;
    sku?: string | null; hasVariants: boolean; lowStockAlert: number;
  };
  variants: Array<{
    id: string; name: string; sku?: string | null;
    color?: string | null; colorHex?: string | null; size?: string | null;
    stock: number; unit?: string | null; imageUrl?: string | null;
  }>;
  carpetRolls: Array<{
    id: string; rollNumber: string; designCode?: string | null; status: string;
    widthFt: number; widthInch: number;
    remainingLengthFt: number; remainingLengthInch: number;
    remainingSqft: number; originalSqft: number;
    salePricePerSqft: number; rackNumber?: string | null;
  }>;
  imeis: Array<{
    id: string; imei1: string; imei2?: string | null;
    status: string; color?: string | null; costPrice: number;
    warrantyMonths?: number | null;
    variant?: { id: string; name: string } | null;
  }>;
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const stockAdjustmentsApi = {
  list: () =>
    apiClient.get<{ data: StockAdjustment[] }>('/stock-adjustments').then(unwrap),

  create: (payload: CreateAdjustmentPayload) =>
    apiClient.post<{ data: StockAdjustment }>('/stock-adjustments', payload).then(unwrap),

  getOptions: (productId: string) =>
    apiClient.get<{ data: AdjustmentOptions }>(`/stock-adjustments/options/${productId}`).then(unwrap),
};
