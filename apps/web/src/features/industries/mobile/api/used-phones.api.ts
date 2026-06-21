import { apiClient } from '@/api/client';
import type { PtaStatus } from './imei.api';

export type UsedPhoneCondition = 'EXCELLENT' | 'VERY_GOOD' | 'GOOD' | 'FAIR' | 'POOR';
export type UsedPhoneStatus = 'PENDING_INSPECTION' | 'IN_STOCK' | 'REPAIRING' | 'SOLD' | 'RETURNED' | 'DISCARDED';
export type TradeInSource = 'CASH_BUYBACK' | 'EXCHANGE' | 'CONSIGNMENT';

export const CONDITION_LABELS: Record<UsedPhoneCondition, string> = {
  EXCELLENT: 'Excellent (10/10)',
  VERY_GOOD: 'Very Good (9/10)',
  GOOD: 'Good (8/10)',
  FAIR: 'Fair (6-7/10)',
  POOR: 'Poor (<6/10)',
};

export const CONDITION_COLORS: Record<UsedPhoneCondition, { bg: string; text: string; border: string }> = {
  EXCELLENT: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300' },
  VERY_GOOD: { bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-300' },
  GOOD: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
  FAIR: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300' },
  POOR: { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-300' },
};

export const STATUS_LABELS: Record<UsedPhoneStatus, string> = {
  PENDING_INSPECTION: 'Pending Inspection',
  IN_STOCK: 'In Stock',
  REPAIRING: 'Under Repair',
  SOLD: 'Sold',
  RETURNED: 'Returned',
  DISCARDED: 'Discarded',
};

export const STATUS_COLORS: Record<UsedPhoneStatus, { bg: string; text: string }> = {
  PENDING_INSPECTION: { bg: 'bg-amber-100', text: 'text-amber-700' },
  IN_STOCK: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  REPAIRING: { bg: 'bg-orange-100', text: 'text-orange-700' },
  SOLD: { bg: 'bg-violet-100', text: 'text-violet-700' },
  RETURNED: { bg: 'bg-blue-100', text: 'text-blue-700' },
  DISCARDED: { bg: 'bg-slate-100', text: 'text-slate-700' },
};

export interface UsedPhone {
  id: string;
  tenantId: string;
  shopId?: string | null;
  usedPhoneCode: string;
  imei1: string;
  imei2?: string | null;
  serialNumber?: string | null;
  brand: string;
  model: string;
  storage?: string | null;
  ram?: string | null;
  color?: string | null;
  modelYear?: number | null;
  ptaStatus: PtaStatus;
  ptaTaxPaid: number;
  condition: UsedPhoneCondition;
  conditionNotes?: string | null;
  hasOriginalBox: boolean;
  hasOriginalCharger: boolean;
  hasOriginalCable: boolean;
  hasOriginalEarphones: boolean;
  hasOriginalReceipt: boolean;
  hasWarrantyLeft: boolean;
  warrantyExpiryDate?: string | null;
  source: TradeInSource;
  buybackPrice: number;
  estimatedValue: number;
  refurbishCost: number;
  totalCost: number;
  resalePrice: number;
  finalSoldPrice?: number | null;
  fromCustomerId?: string | null;
  fromCustomerName?: string | null;
  fromCustomerPhone?: string | null;
  fromCustomerCnic?: string | null;
  cnicPhotoUrl?: string | null;
  imeiPhotoUrl?: string | null;
  devicePhotos: string[];
  status: UsedPhoneStatus;
  receivedAt: string;
  inspectedAt?: string | null;
  soldAt?: string | null;
  notes?: string | null;
  shop?: { id: string; name: string } | null;
  fromCustomer?: { id: string; name: string; phone?: string | null } | null;
  inspections?: UsedPhoneInspection[];
  _count?: { inspections: number };
}

export interface UsedPhoneInspection {
  id: string;
  usedPhoneId: string;
  screenCondition?: string | null;
  bodyCondition?: string | null;
  cameraWorks?: boolean | null;
  speakerWorks?: boolean | null;
  microphoneWorks?: boolean | null;
  chargingPortWorks?: boolean | null;
  buttonsWork?: boolean | null;
  faceIdFingerprintWorks?: boolean | null;
  batteryHealth?: number | null;
  imeiUnlocked?: boolean | null;
  icloudUnlocked?: boolean | null;
  softwareIssues?: string | null;
  needsRepair: boolean;
  estimatedRepairCost: number;
  recommendedActions?: string | null;
  inspectedAt: string;
}

export interface CreateUsedPhonePayload {
  shopId?: string;
  imei1: string;
  imei2?: string;
  serialNumber?: string;
  brand: string;
  model: string;
  storage?: string;
  ram?: string;
  color?: string;
  modelYear?: number;
  ptaStatus?: PtaStatus;
  ptaTaxPaid?: number;
  condition?: UsedPhoneCondition;
  conditionNotes?: string;
  hasOriginalBox?: boolean;
  hasOriginalCharger?: boolean;
  hasOriginalCable?: boolean;
  hasOriginalEarphones?: boolean;
  hasOriginalReceipt?: boolean;
  hasWarrantyLeft?: boolean;
  warrantyExpiryDate?: string;
  source?: TradeInSource;
  buybackPrice: number;
  estimatedValue?: number;
  refurbishCost?: number;
  resalePrice?: number;
  fromCustomerId?: string;
  fromCustomerName?: string;
  fromCustomerPhone?: string;
  fromCustomerCnic?: string;
  cnicPhotoUrl?: string;
  imeiPhotoUrl?: string;
  devicePhotos?: string[];
  status?: UsedPhoneStatus;
  notes?: string;
}

export interface UsedPhoneStats {
  byStatus: { status: UsedPhoneStatus; count: number }[];
  byCondition: { condition: UsedPhoneCondition; count: number }[];
  inStockCost: number;
  inStockResaleValue: number;
  potentialProfit: number;
  totalSold: number;
  totalRevenue: number;
  totalProfit: number;
}

export interface ValuationResponse {
  suggestedBuyback: number;
  multiplier: number;
  reasoning: string[];
}

export interface ValuationPayload {
  referencePrice: number;
  condition: UsedPhoneCondition;
  modelYear?: number;
  hasOriginalBox?: boolean;
  hasOriginalCharger?: boolean;
  hasOriginalReceipt?: boolean;
  hasWarrantyLeft?: boolean;
  batteryHealth?: number;
}

export interface CreateInspectionPayload {
  screenCondition?: string;
  bodyCondition?: string;
  cameraWorks?: boolean;
  speakerWorks?: boolean;
  microphoneWorks?: boolean;
  chargingPortWorks?: boolean;
  buttonsWork?: boolean;
  faceIdFingerprintWorks?: boolean;
  batteryHealth?: number;
  imeiUnlocked?: boolean;
  icloudUnlocked?: boolean;
  softwareIssues?: string;
  needsRepair?: boolean;
  estimatedRepairCost?: number;
  recommendedActions?: string;
}

const unwrap = <T>(res: any): T => (res?.data?.data !== undefined ? res.data.data : res?.data);

export const usedPhonesApi = {
  list: (params?: {
    search?: string;
    status?: UsedPhoneStatus;
    condition?: UsedPhoneCondition;
    brand?: string;
    shopId?: string;
    page?: number;
    limit?: number;
  }) =>
    apiClient.get('/used-phones', { params }).then(unwrap) as Promise<{
      items: UsedPhone[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>,

  stats: () =>
    apiClient.get('/used-phones/stats').then(unwrap) as Promise<UsedPhoneStats>,

  estimate: (payload: ValuationPayload) =>
    apiClient.post('/used-phones/estimate', payload).then(unwrap) as Promise<ValuationResponse>,

  getOne: (id: string) =>
    apiClient.get(`/used-phones/${id}`).then(unwrap) as Promise<UsedPhone>,

  create: (payload: CreateUsedPhonePayload) =>
    apiClient.post('/used-phones', payload).then(unwrap) as Promise<UsedPhone>,

  update: (id: string, payload: Partial<CreateUsedPhonePayload>) =>
    apiClient.patch(`/used-phones/${id}`, payload).then(unwrap) as Promise<UsedPhone>,

  addInspection: (id: string, payload: CreateInspectionPayload) =>
    apiClient.post(`/used-phones/${id}/inspection`, payload).then(unwrap) as Promise<UsedPhoneInspection>,

  markInStock: (id: string) =>
    apiClient.patch(`/used-phones/${id}/mark-in-stock`).then(unwrap) as Promise<UsedPhone>,

  markSold: (id: string, finalPrice: number, saleId?: string) =>
    apiClient.patch(`/used-phones/${id}/mark-sold`, { finalPrice, saleId }).then(unwrap) as Promise<UsedPhone>,

  discard: (id: string, reason?: string) =>
    apiClient.patch(`/used-phones/${id}/discard`, { reason }).then(unwrap) as Promise<UsedPhone>,

  remove: (id: string) =>
    apiClient.delete(`/used-phones/${id}`).then(unwrap),
};
