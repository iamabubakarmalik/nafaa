import { apiClient } from '@core/api/client';

export interface Vaccination {
  id: string;
  patientId: string;
  vaccineName: string;
  vaccineCode?: string;
  scheduleName?: string;
  doseNumber?: number;
  dueDate: string;
  administeredAt?: string;
  administeredBy?: string;
  batchNumber?: string;
  manufacturer?: string;
  expiryDate?: string;
  siteAdministered?: string;
  routeAdministered?: string;
  status: 'DUE' | 'ADMINISTERED' | 'DELAYED' | 'SKIPPED' | 'CONTRAINDICATED';
  adverseReactions?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const vaccinationsApi = {
  schedule: (data: any) => apiClient.post('/clinic/vaccinations', data).then(unwrap<Vaccination>),
  bulkEpi: (patientId: string, birthDate: string) => apiClient.post('/clinic/vaccinations/bulk-epi', { patientId, birthDate }).then(unwrap<Vaccination[]>),
  administer: (id: string, data: any) => apiClient.post('/clinic/vaccinations/' + id + '/administer', data).then(unwrap<Vaccination>),
  list: (params?: any) => apiClient.get('/clinic/vaccinations', { params }).then(unwrap<Vaccination[]>),
  due: (days?: number) => apiClient.get('/clinic/vaccinations/due/list', { params: { days } }).then(unwrap<Vaccination[]>),
};
