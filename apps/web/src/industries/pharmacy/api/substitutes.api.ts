import { apiClient } from '@core/api/client';

export interface MedicineSubstitute {
  id: string;
  mainMedicineId: string;
  substituteMedicineId: string;
  similarity: number;
  priceDifference?: number;
  notes?: string;
  main?: any;
  substitute?: any;
  createdAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const substitutesApi = {
  add: (mainMedicineId: string, substituteMedicineId: string, notes?: string) =>
    apiClient.post('/pharmacy/substitutes', { mainMedicineId, substituteMedicineId, notes }).then(unwrap<MedicineSubstitute>),
  list: (mainMedicineId: string) =>
    apiClient.get('/pharmacy/substitutes/by-main/' + mainMedicineId).then(unwrap<MedicineSubstitute[]>),
  byProduct: (productId: string) =>
    apiClient.get('/pharmacy/substitutes/by-product/' + productId).then(unwrap<MedicineSubstitute[]>),
  autoSuggest: (productId: string) =>
    apiClient.get('/pharmacy/substitutes/auto-suggest/' + productId).then(unwrap<any[]>),
  remove: (id: string) => apiClient.delete('/pharmacy/substitutes/' + id).then(unwrap),
};
