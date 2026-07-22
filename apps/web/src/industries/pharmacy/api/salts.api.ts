import { apiClient } from '@core/api/client';

export type DrugScheduleClass = 'OTC' | 'SCHEDULE_G' | 'SCHEDULE_H' | 'SCHEDULE_X' | 'CONTROLLED' | 'NARCOTIC' | 'PSYCHOTROPIC';

export interface Salt {
  id: string;
  name: string;
  genericName?: string;
  code?: string;
  category?: string;
  description?: string;
  standardDose?: string;
  maxDailyDose?: string;
  routeOfAdmin?: string;
  isPregnancySafe: boolean;
  isLactationSafe: boolean;
  isPediatricSafe: boolean;
  minAgeYears?: number;
  contraindications?: string;
  sideEffects?: string;
  warnings?: string;
  scheduleClass: DrugScheduleClass;
  requiresPrescription: boolean;
  isNarcotic: boolean;
  isBanned: boolean;
  isActive: boolean;
  _count?: { productSalts: number; drugInteractionsA: number; drugInteractionsB: number };
  createdAt: string;
  updatedAt: string;
}

export interface ProductSalt {
  id: string;
  productId: string;
  saltId: string;
  strength: string;
  strengthValue?: number;
  strengthUnit?: string;
  isMainSalt: boolean;
  salt?: Salt;
  product?: any;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const saltsApi = {
  create: (data: Partial<Salt>) => apiClient.post('/pharmacy/salts', data).then(unwrap<Salt>),
  list: (params?: { search?: string; scheduleClass?: string; requiresPrescription?: boolean }) =>
    apiClient.get('/pharmacy/salts', { params }).then(unwrap<Salt[]>),
  getOne: (id: string) => apiClient.get('/pharmacy/salts/' + id).then(unwrap<Salt>),
  update: (id: string, data: Partial<Salt>) => apiClient.patch('/pharmacy/salts/' + id, data).then(unwrap<Salt>),
  remove: (id: string) => apiClient.delete('/pharmacy/salts/' + id).then(unwrap),
  assign: (productId: string, salts: any[]) =>
    apiClient.post('/pharmacy/salts/assign/' + productId, { salts }).then(unwrap<ProductSalt[]>),
  byProduct: (productId: string) =>
    apiClient.get('/pharmacy/salts/by-product/' + productId).then(unwrap<ProductSalt[]>),
  productsBySalt: (id: string) =>
    apiClient.get('/pharmacy/salts/' + id + '/products').then(unwrap<any[]>),
};
