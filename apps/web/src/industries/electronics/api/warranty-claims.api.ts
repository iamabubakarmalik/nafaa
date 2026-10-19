import { apiClient } from '@core/api/client';
import type { WarrantyStatus } from './serial-tracking.api';

export interface WarrantyClaim {
  id: string;
  claimNumber: string;
  serialTrackingId?: string;
  productId?: string;
  productName: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  purchaseDate: string;
  invoiceNumber?: string;
  serialNumber?: string;
  imei?: string;
  claimDate: string;
  issueDescription: string;
  issueCategory?: string;
  imageUrls: string[];
  documentUrls: string[];
  status: WarrantyStatus;
  receivedAt?: string;
  diagnosedAt?: string;
  resolvedAt?: string;
  diagnosis?: string;
  resolution?: string;
  resolutionType?: string;
  replacementSerialNumber?: string;
  refundAmount: number;
  repairCost: number;
  paidByCustomer: number;
  paidByBrand: number;
  isChargeable: boolean;
  sentToBrand: boolean;
  brandRef?: string;
  brandContactedAt?: string;
  brandResponse?: string;
  internalNotes?: string;
  handledById?: string;
  createdAt: string;
  updatedAt: string;
}

/** Backend ka summary — pehle frontend ghalat naam parh raha tha
 *  (pendingCount/resolvedCount) is liye saare cards 0 dikhate the. */
/** Bill posted for a claim's charge (bill number = claim number). */
export interface ClaimBill { id: string; saleNumber: string; total: number; creditAmount: number; status: string }

export type ClaimRow = WarrantyClaim & { bill: ClaimBill | null };

export type ClaimView = 'open' | 'repair' | 'brand' | 'stale' | 'done' | 'closed' | 'all';

export interface ClaimPage {
  items: ClaimRow[];
  total: number;
  page: number;
  pages: number;
  counts: Record<ClaimView, number>;
}

export type ResolutionType = 'REPAIRED' | 'REPLACED' | 'REFUNDED' | 'REJECTED';

export interface ResolvePayload {
  resolutionType: ResolutionType;
  replacementSerialId?: string;
  /** Charge to the customer, billed as a sale. */
  paidByCustomer?: number;
  /** Of the charge, paid now; the rest goes on khata. */
  paidNow?: number;
  paymentMethod?: string;
  /** What the repair cost the shop. */
  repairCost?: number;
  paidByBrand?: number;
  /** The shop's repair cost was paid in cash from the drawer. */
  costFromDrawer?: boolean;
  resolution?: string;
}

export interface WarrantyClaimsSummary {
  total: number;
  active: number;
  claimed: number;
  inRepair: number;
  resolved: number;
  expired: number;
  sentToBrand: number;
  thisMonth: number;
  /** Open for more than a week. */
  stale: number;
  /** active + claimed + inRepair — jin par abhi kaam karna hai */
  pending: number;
  cost: {
    repairCost: number;
    refundAmount: number;
    paidByCustomer: number;
    paidByBrand: number;
    /** Dukan ki apni jeb se kitna gaya */
    shopBore: number;
  };
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const warrantyClaimsApi = {
  create: (data: Partial<WarrantyClaim>) =>
    apiClient.post('/electronics/warranty-claims', data).then(unwrap<WarrantyClaim>),

  page: (params: { view?: ClaimView; search?: string; from?: string; to?: string; sort?: 'new' | 'old'; page?: number; limit?: number }) =>
    apiClient.get('/electronics/warranty-claims/page', { params }).then(unwrap<ClaimPage>),

  list: (params?: { status?: string; customerId?: string; sentToBrand?: boolean; from?: string; to?: string; search?: string }) =>
    apiClient.get('/electronics/warranty-claims', { params }).then(unwrap<WarrantyClaim[]>),

  summary: () =>
    apiClient.get('/electronics/warranty-claims/summary').then(unwrap<WarrantyClaimsSummary>),

  getOne: (id: string) =>
    apiClient.get('/electronics/warranty-claims/' + id).then(unwrap<ClaimRow & {
      serial: { id: string; serialNumber: string; status: string; warrantyEndDate?: string | null } | null;
      originalSale: { id: string; saleNumber: string; status: string; soldAt: string; total: number } | null;
    }>),

  updateStatus: (id: string, data: { status: WarrantyStatus; diagnosis?: string; resolution?: string; notes?: string }) =>
    apiClient.patch('/electronics/warranty-claims/' + id + '/status', data).then(unwrap<WarrantyClaim>),

  contactBrand: (id: string, data: { brandRef: string; brandResponse?: string }) =>
    apiClient.post('/electronics/warranty-claims/' + id + '/contact-brand', data).then(unwrap<WarrantyClaim>),

  resolve: (id: string, data: ResolvePayload) =>
    apiClient.post('/electronics/warranty-claims/' + id + '/resolve', data).then(unwrap<WarrantyClaim>),

  remove: (id: string) =>
    apiClient.delete('/electronics/warranty-claims/' + id).then(unwrap),
};
