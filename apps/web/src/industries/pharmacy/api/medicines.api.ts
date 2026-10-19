import { apiClient } from '@core/api/client';

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

/** Lean medicine facts per product, for the counter and product lists. */
export interface MedicineFacts {
  id: string;
  medicineId: string;
  productId: string;
  scheduleClass: string;
  requiresPrescription: boolean;
  isNarcotic: boolean;
  requiresColdChain: boolean;
  isRefrigerated: boolean;
  dosageForm: string | null;
  packSize: string | null;
  packUnit: string | null;
  manufacturer: string | null;
  registrationNumber: string | null;
  isGeneric: boolean;
  storageInstructions: string | null;
  /** "Paracetamol 500mg + Caffeine 65mg" */
  generic: string;
  saltIds: string[];
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const medicinesApi = {
  upsert: (data: Partial<PharmacyMedicine>) =>
    apiClient.post('/pharmacy/medicines', data).then(unwrap<PharmacyMedicine>),
  list: (params?: { scheduleClass?: string; requiresColdChain?: boolean; requiresPrescription?: boolean; search?: string }) =>
    apiClient.get('/pharmacy/medicines', { params }).then(unwrap<PharmacyMedicine[]>),
  lookup: () => apiClient.get('/pharmacy/medicines/lookup').then(unwrap<MedicineFacts[]>),
  getOne: (id: string) => apiClient.get('/pharmacy/medicines/' + id).then(unwrap<PharmacyMedicine>),
  byProduct: (productId: string) =>
    apiClient.get('/pharmacy/medicines/by-product/' + productId).then(unwrap<PharmacyMedicine | null>),
  remove: (id: string) => apiClient.delete('/pharmacy/medicines/' + id).then(unwrap),
};
