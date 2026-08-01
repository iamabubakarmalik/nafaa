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

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const warrantyClaimsApi = {
  create: (data: Partial<WarrantyClaim>) =>
    apiClient.post('/electronics/warranty-claims', data).then(unwrap<WarrantyClaim>),

  list: (params?: { status?: string; customerId?: string; sentToBrand?: boolean; from?: string; to?: string; search?: string }) =>
    apiClient.get('/electronics/warranty-claims', { params }).then(unwrap<WarrantyClaim[]>),

  summary: () =>
    apiClient.get('/electronics/warranty-claims/summary').then(unwrap<any>),

  getOne: (id: string) =>
    apiClient.get('/electronics/warranty-claims/' + id).then(unwrap<WarrantyClaim>),

  updateStatus: (id: string, data: { status: WarrantyStatus; diagnosis?: string; resolution?: string; notes?: string }) =>
    apiClient.patch('/electronics/warranty-claims/' + id + '/status', data).then(unwrap<WarrantyClaim>),

  contactBrand: (id: string, data: { brandRef: string; brandResponse?: string }) =>
    apiClient.post('/electronics/warranty-claims/' + id + '/contact-brand', data).then(unwrap<WarrantyClaim>),

  resolve: (id: string, data: any) =>
    apiClient.post('/electronics/warranty-claims/' + id + '/resolve', data).then(unwrap<WarrantyClaim>),

  remove: (id: string) =>
    apiClient.delete('/electronics/warranty-claims/' + id).then(unwrap),
};
