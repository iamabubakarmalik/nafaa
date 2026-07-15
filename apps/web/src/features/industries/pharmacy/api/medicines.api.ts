import { apiClient } from '@/api/client';

export type StorageCondition = 'ROOM_TEMPERATURE' | 'COOL' | 'REFRIGERATED' | 'FROZEN' | 'CONTROLLED_ROOM' | 'PROTECT_FROM_LIGHT' | 'PROTECT_FROM_MOISTURE';

export interface PharmacyMedicine {
  id: string;
  productId: string;
  registrationNumber?: string;
  approvalDate?: string;
  dosageForm?: string;
  packSize?: string;
  packUnit?: string;
  manufacturer?: string;
  countryOfOrigin?: string;
  importedBy?: string;
  indication?: string;
  mechanismOfAction?: string;
  pharmacokinetics?: string;
  storageCondition: StorageCondition;
  storageInstructions?: string;
  requiresColdChain: boolean;
  minTemperature?: number;
  maxTemperature?: number;
  scheduleClass: string;
  requiresPrescription: boolean;
  isNarcotic: boolean;
  isRefrigerated: boolean;
  color?: string;
  shape?: string;
  markings?: string;
  isGeneric: boolean;
  brandTier?: string;
  product?: any;
  substitutes?: any[];
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const medicinesApi = {
  upsert: (data: Partial<PharmacyMedicine>) =>
    apiClient.post('/pharmacy/medicines', data).then(unwrap<PharmacyMedicine>),
  list: (params?: { scheduleClass?: string; requiresColdChain?: boolean; requiresPrescription?: boolean; search?: string }) =>
    apiClient.get('/pharmacy/medicines', { params }).then(unwrap<PharmacyMedicine[]>),
  getOne: (id: string) => apiClient.get('/pharmacy/medicines/' + id).then(unwrap<PharmacyMedicine>),
  byProduct: (productId: string) =>
    apiClient.get('/pharmacy/medicines/by-product/' + productId).then(unwrap<PharmacyMedicine | null>),
  remove: (id: string) => apiClient.delete('/pharmacy/medicines/' + id).then(unwrap),
};
